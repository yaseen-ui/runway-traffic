import {
  Flight,
  FlightStatus,
  FlightType,
  CreateFlightPayload,
  UpdateFlightPayload,
  DeleteResult,
  FlightResult,
} from '../types';
import { appEvents } from '../events';
import { logger } from '../utils';
import { PersistenceService } from '../persistence';

/**
 * FlightService manages flight data and emits events for scheduler coordination
 * Persists changes to JSON file for durability across restarts
 */
export class FlightService {
  private flights: Map<string, Flight> = new Map();
  private idCounter = 1;
  private flightLogger = logger.child('Flight');
  private persistence: PersistenceService | null = null;

  constructor(persistence?: PersistenceService) {
    this.persistence = persistence || null;
  }

  /**
   * Load flights from persistence on startup
   */
  async loadFromPersistence(): Promise<void> {
    if (!this.persistence) {
      this.flightLogger.debug('No persistence configured, starting fresh');
      return;
    }

    const { flights, idCounter } = await this.persistence.load();

    // Restore flights to map
    this.flights.clear();
    for (const flight of flights) {
      this.flights.set(flight.id, flight);
    }

    // Restore id counter (ensure it's higher than any existing flight)
    const maxId = flights.reduce((max, f) => Math.max(max, parseInt(f.id, 10) || 0), 0);
    this.idCounter = Math.max(idCounter, maxId + 1);

    this.flightLogger.info(`Restored ${flights.length} flights from persistence`);
  }

  /**
   * Save current state to persistence
   */
  private async saveToPersistence(): Promise<void> {
    if (!this.persistence) {
      return;
    }
    await this.persistence.save(this.flights, this.idCounter);
  }

  /**
   * Create a new flight and add it to the queue
   */
  createFlight(payload: CreateFlightPayload): Flight {
    const now = new Date().toISOString();
    const flight: Flight = {
      id: String(this.idCounter++),
      flightNumber: payload.flightNumber,
      airline: payload.airline,
      type: payload.type,
      emergency: payload.emergency ?? false,
      status: FlightStatus.WAITING,
      runwayId: null,
      scheduledAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.flights.set(flight.id, flight);

    // Persist changes (fire and forget)
    this.saveToPersistence().catch(err =>
      this.flightLogger.error('Failed to persist flight creation:', err)
    );

    // Emit events - scheduler will react to these
    appEvents.emitFlightCreated(flight);
    appEvents.emitFlightQueued(flight);

    this.flightLogger.info(
      `Flight ${flight.flightNumber} (${flight.type})${flight.emergency ? ' [EMERGENCY]' : ''} queued by ${flight.airline}`
    );

    return flight;
  }

  /**
   * Get all flights
   */
  getAllFlights(): Flight[] {
    return Array.from(this.flights.values());
  }

  /**
   * Get a flight by ID
   */
  getFlightById(id: string): Flight | undefined {
    return this.flights.get(id);
  }

  /**
   * Update a flight (only if it's in waiting status)
   */
  updateFlight(id: string, updates: UpdateFlightPayload): FlightResult {
    const flight = this.flights.get(id);
    if (!flight) {
      return { error: 'not_found' };
    }

    if (flight.status !== FlightStatus.WAITING) {
      return { error: 'not_waiting' };
    }

    // Store previous values for event
    const previousValues: Partial<Flight> = {};

    if (updates.flightNumber !== undefined) {
      previousValues.flightNumber = flight.flightNumber;
      flight.flightNumber = updates.flightNumber;
    }

    if (updates.airline !== undefined) {
      previousValues.airline = flight.airline;
      flight.airline = updates.airline;
    }

    if (updates.type !== undefined) {
      previousValues.type = flight.type;
      flight.type = updates.type;
    }

    if (updates.emergency !== undefined) {
      previousValues.emergency = flight.emergency;
      flight.emergency = updates.emergency;
    }

    flight.updatedAt = new Date().toISOString();

    // Persist changes (fire and forget)
    this.saveToPersistence().catch(err =>
      this.flightLogger.error('Failed to persist flight update:', err)
    );

    // Emit event - scheduler may need to re-evaluate queue
    appEvents.emitFlightUpdated(flight, previousValues);

    this.flightLogger.info(`Flight ${flight.flightNumber} updated`);

    return { data: flight };
  }

  /**
   * Delete a flight (only if it's in waiting status)
   */
  deleteFlight(id: string): DeleteResult {
    const flight = this.flights.get(id);
    if (!flight) {
      return { error: 'not_found' };
    }

    if (flight.status !== FlightStatus.WAITING) {
      return { error: 'not_waiting' };
    }

    // Store flight data before deleting for event
    const deletedFlight = { ...flight };

    this.flights.delete(id);

    // Persist changes (fire and forget)
    this.saveToPersistence().catch(err =>
      this.flightLogger.error('Failed to persist flight deletion:', err)
    );

    // Emit event - scheduler will remove from its internal queue
    appEvents.emitFlightCancelled(id, deletedFlight);

    this.flightLogger.info(`Flight ${deletedFlight.flightNumber} cancelled/deleted from queue`);

    return { deleted: true };
  }

  /**
   * Get the current queue of waiting flights (from flights map)
   * Note: Order is by creation time, not by scheduling strategy
   */
  getQueue(): Flight[] {
    return Array.from(this.flights.values())
      .filter(f => f.status === FlightStatus.WAITING)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  /**
   * Mark a flight as processing
   */
  markProcessing(flight: Flight, runwayId: string): void {
    flight.status = FlightStatus.PROCESSING;
    flight.runwayId = runwayId;
    flight.scheduledAt = new Date().toISOString();
    flight.updatedAt = new Date().toISOString();

    // Persist status change (fire and forget)
    this.saveToPersistence().catch(err =>
      this.flightLogger.error('Failed to persist flight processing:', err)
    );

    this.flightLogger.info(`Flight ${flight.flightNumber} started processing on runway ${runwayId}`);
  }

  /**
   * Mark a flight as completed
   */
  markCompleted(flight: Flight): void {
    flight.status = FlightStatus.COMPLETED;
    flight.completedAt = new Date().toISOString();
    flight.updatedAt = new Date().toISOString();

    // Persist completion (fire and forget)
    this.saveToPersistence().catch(err =>
      this.flightLogger.error('Failed to persist flight completion:', err)
    );

    this.flightLogger.success(`Flight ${flight.flightNumber} completed`);
  }

  /**
   * Clear runway assignment from a flight
   */
  clearRunwayAssignment(flight: Flight): void {
    flight.runwayId = null;
    flight.updatedAt = new Date().toISOString();
  }

  /**
   * Validate a flight creation payload
   */
  validateFlightPayload(payload: unknown): string[] {
    const errors: string[] = [];
    const p = payload as Record<string, unknown>;

    if (!p.flightNumber || typeof p.flightNumber !== 'string') {
      errors.push('flightNumber');
    }

    if (!p.airline || typeof p.airline !== 'string') {
      errors.push('airline');
    }

    if (!p.type || (p.type !== 'landing' && p.type !== 'takeoff')) {
      errors.push('type');
    }

    if (p.emergency !== undefined && typeof p.emergency !== 'boolean') {
      errors.push('emergency');
    }

    return errors;
  }

  /**
   * Get the internal flights map (for scheduling engine to sync on start)
   */
  getFlightsMap(): Map<string, Flight> {
    return this.flights;
  }

  /**
   * Get current ID counter (for persistence)
   */
  getIdCounter(): number {
    return this.idCounter;
  }
}
