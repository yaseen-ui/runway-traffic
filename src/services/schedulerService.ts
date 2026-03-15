import { Runway, RunwayStatus, Flight } from '../types';
import { SchedulingEngine, SchedulerStrategy } from '../scheduler';
import { FlightService } from './flightService';
import { RunwayService } from './runwayService';
import { appEvents, AppEventType, FlightQueuedEvent, FlightCancelledEvent } from '../events';
import { logger } from '../utils';
import { config } from '../config';

/**
 * SchedulerService manages the runway workers and flight processing
 * Reacts to system events instead of being directly called
 */
export class SchedulerService {
  private flightService: FlightService;
  private runwayService: RunwayService;
  private schedulingEngine: SchedulingEngine;
  private isRunning = false;
  private abortControllers: Map<string, AbortController> = new Map();
  private schedulerLogger = logger.child('Scheduler');

  constructor(
    flightService: FlightService,
    runwayService: RunwayService,
    schedulingEngine: SchedulingEngine
  ) {
    this.flightService = flightService;
    this.runwayService = runwayService;
    this.schedulingEngine = schedulingEngine;

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for system events
   */
  private setupEventListeners(): void {
    // React to new flights being queued - ADD to scheduling engine queue
    appEvents.on(AppEventType.FLIGHT_QUEUED, (event: FlightQueuedEvent) => {
      this.schedulerLogger.debug(`Flight ${event.flight.flightNumber} queued event received`);
      // Add flight to scheduling engine's internal queue
      this.schedulingEngine.enqueue(event.flight.id);
      this.schedulerLogger.debug(`Flight ${event.flight.flightNumber} added to scheduling queue (length: ${this.schedulingEngine.length})`);
      this.trySchedule();
    });

    // React to flight updates (emergency flag change, etc.)
    appEvents.on(AppEventType.FLIGHT_UPDATED, () => {
      this.schedulerLogger.debug('Flight updated event received');
      this.trySchedule();
    });

    // React to flight cancellation - REMOVE from scheduling engine queue
    appEvents.on(AppEventType.FLIGHT_CANCELLED, (event: FlightCancelledEvent) => {
      this.schedulerLogger.debug(`Flight ${event.flightId} cancelled event received`);
      // Remove flight from scheduling engine's internal queue
      const removed = this.schedulingEngine.remove(event.flightId);
      if (removed) {
        this.schedulerLogger.debug(`Flight ${event.flightId} removed from scheduling queue`);
      }
      this.trySchedule();
    });

    // React to runway becoming free
    appEvents.on(AppEventType.RUNWAY_RELEASED, () => {
      this.schedulerLogger.debug('Runway released event received');
      this.trySchedule();
    });

    // React to runway being enabled
    appEvents.on(AppEventType.RUNWAY_ENABLED, () => {
      this.schedulerLogger.debug('Runway enabled event received');
      this.trySchedule();
    });

    this.schedulerLogger.info('Event listeners registered');
  }

  /**
   * Try to schedule flights to available runways
   */
  private trySchedule(): void {
    if (!this.isRunning) {
      return;
    }

    appEvents.emitSchedulerTriggered();

    // Get available (idle) runways
    const runways = this.runwayService.getRunways();
    const availableRunways = runways.filter(
      r => r.status === RunwayStatus.IDLE
    );

    if (availableRunways.length === 0) {
      return;
    }

    // Try to assign flights to available runways
    for (const runway of availableRunways) {
      const nextFlight = this.getNextFlight();
      if (nextFlight) {
        // Process flight (fire and forget, will complete asynchronously)
        this.processFlightAsync(nextFlight, runway);
      } else {
        break; // No more flights to schedule
      }
    }
  }

  /**
   * Get next flight from scheduling engine
   */
  private getNextFlight(): Flight | null {
    return this.schedulingEngine.getNextFlight();
  }

  /**
   * Start the scheduler workers for all runways
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Initialize scheduling engine with flights map
    const flightsMap = this.flightService.getFlightsMap();
    // Re-sync any existing waiting flights to scheduling engine
    for (const flight of flightsMap.values()) {
      if (flight.status === 'waiting') {
        this.schedulingEngine.enqueue(flight.id);
      }
    }

    const runways = this.runwayService.getRunways();

    runways.forEach(runway => {
      const abortController = new AbortController();
      this.abortControllers.set(runway.id, abortController);
      this.runwayWorker(runway, abortController.signal);
    });

    appEvents.emitSchedulerStarted();
    this.schedulerLogger.success(`Started with ${runways.length} runway workers`);
  }

  /**
   * Stop all scheduler workers
   */
  stop(): void {
    this.isRunning = false;
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();

    appEvents.emitSchedulerStopped();
    this.schedulerLogger.info('Stopped');
  }

  /**
   * Change the scheduling strategy at runtime
   */
  setStrategy(strategy: SchedulerStrategy): void {
    this.schedulingEngine.setStrategy(strategy);
  }

  /**
   * Worker loop for a single runway (handles processing, not initial assignment)
   * Assignment is now event-driven via trySchedule()
   */
  private async runwayWorker(runway: Runway, signal: AbortSignal): Promise<void> {
    while (this.isRunning && !signal.aborted) {
      try {
        // Just wait for events - assignment is event-driven
        // But we keep a small poll for robustness (handles edge cases)
        await this.delay(1000, signal);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          break;
        }
        this.schedulerLogger.error('Worker error:', error);
      }
    }
  }

  /**
   * Process a single flight on a runway (async, non-blocking)
   */
  private async processFlightAsync(flight: Flight, runway: Runway): Promise<void> {
    try {
      await this.processFlight(flight, runway);
    } catch (error) {
      this.schedulerLogger.error(`Error processing flight ${flight.flightNumber}:`, error);
    }
  }

  /**
   * Process a single flight on a runway
   */
  private async processFlight(flight: Flight, runway: Runway): Promise<void> {
    // Mark as processing and assign to runway
    this.flightService.markProcessing(flight, runway.id);
    this.runwayService.assignRunway(runway, flight.id);

    // Emit assignment event
    appEvents.emitFlightAssigned(flight, runway);

    const emergencyTag = flight.emergency ? ' EMERGENCY' : '';
    this.schedulerLogger.info(
      `Assigned${emergencyTag} flight ${flight.flightNumber} (${flight.type}) → Runway ${runway.id}`
    );

    // Simulate processing time based on flight type
    const processingTime = config.getProcessingTime(flight.type);
    this.schedulerLogger.debug(`Flight ${flight.flightNumber} (${flight.type}) processing for ${processingTime}ms`);
    await this.delay(processingTime);

    // Complete flight
    this.flightService.markCompleted(flight);
    this.flightService.clearRunwayAssignment(flight);
    this.runwayService.releaseRunway(runway);

    // Emit completion event
    appEvents.emitFlightCompleted(flight, runway);

    this.schedulerLogger.success(`Flight ${flight.flightNumber} completed on Runway ${runway.id}`);
  }

  /**
   * Promise-based delay with optional abort signal
   */
  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('AbortError'));
        return;
      }

      const timeout = setTimeout(() => {
        resolve();
      }, ms);

      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('AbortError'));
        });
      }
    });
  }
}
