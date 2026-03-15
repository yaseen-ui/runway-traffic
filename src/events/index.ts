import { EventEmitter } from 'events';
import { Flight, Runway } from '../types';

/**
 * Application event types
 */
export enum AppEventType {
  FLIGHT_CREATED = 'flight:created',
  FLIGHT_UPDATED = 'flight:updated',
  FLIGHT_CANCELLED = 'flight:cancelled',
  RUNWAY_RELEASED = 'runway:released',
  RUNWAY_ENABLED = 'runway:enabled',
  RUNWAY_DISABLED = 'runway:disabled',
  SCHEDULER_TRIGGERED = 'scheduler:triggered',
  SCHEDULER_STARTED = 'scheduler:started',
  SCHEDULER_STOPPED = 'scheduler:stopped',
  FLIGHT_QUEUED = 'flight:queued',
  FLIGHT_ASSIGNED = 'flight:assigned',
  FLIGHT_COMPLETED = 'flight:completed',
}

/**
 * Event payload interfaces
 */
export interface FlightCreatedEvent {
  flight: Flight;
}

export interface FlightUpdatedEvent {
  flight: Flight;
  previousValues: Partial<Flight>;
}

export interface FlightCancelledEvent {
  flightId: string;
  flight: Flight;
}

export interface RunwayReleasedEvent {
  runway: Runway;
}

export interface RunwayEnabledEvent {
  runway: Runway;
}

export interface RunwayDisabledEvent {
  runway: Runway;
}

export interface FlightQueuedEvent {
  flight: Flight;
}

export interface FlightAssignedEvent {
  flight: Flight;
  runway: Runway;
}

export interface FlightCompletedEvent {
  flight: Flight;
  runway: Runway;
}

/**
 * Application-wide event emitter
 * Central hub for internal events to decouple components
 */
export class AppEvents extends EventEmitter {
  private static instance: AppEvents | null = null;

  private constructor() {
    super();
    // Increase max listeners to avoid warnings in larger apps
    this.setMaxListeners(20);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AppEvents {
    if (!AppEvents.instance) {
      AppEvents.instance = new AppEvents();
    }
    return AppEvents.instance;
  }

  /**
   * Reset instance (useful for testing)
   */
  static resetInstance(): void {
    AppEvents.instance = null;
  }

  /**
   * Emit flight created event
   */
  emitFlightCreated(flight: Flight): void {
    this.emit(AppEventType.FLIGHT_CREATED, { flight } as FlightCreatedEvent);
  }

  /**
   * Emit flight updated event
   */
  emitFlightUpdated(flight: Flight, previousValues: Partial<Flight>): void {
    this.emit(AppEventType.FLIGHT_UPDATED, { flight, previousValues } as FlightUpdatedEvent);
  }

  /**
   * Emit flight cancelled event
   */
  emitFlightCancelled(flightId: string, flight: Flight): void {
    this.emit(AppEventType.FLIGHT_CANCELLED, { flightId, flight } as FlightCancelledEvent);
  }

  /**
   * Emit runway released event
   */
  emitRunwayReleased(runway: Runway): void {
    this.emit(AppEventType.RUNWAY_RELEASED, { runway } as RunwayReleasedEvent);
  }

  /**
   * Emit runway enabled event
   */
  emitRunwayEnabled(runway: Runway): void {
    this.emit(AppEventType.RUNWAY_ENABLED, { runway } as RunwayEnabledEvent);
  }

  /**
   * Emit runway disabled event
   */
  emitRunwayDisabled(runway: Runway): void {
    this.emit(AppEventType.RUNWAY_DISABLED, { runway } as RunwayDisabledEvent);
  }

  /**
   * Emit flight queued event
   */
  emitFlightQueued(flight: Flight): void {
    this.emit(AppEventType.FLIGHT_QUEUED, { flight } as FlightQueuedEvent);
  }

  /**
   * Emit flight assigned event
   */
  emitFlightAssigned(flight: Flight, runway: Runway): void {
    this.emit(AppEventType.FLIGHT_ASSIGNED, { flight, runway } as FlightAssignedEvent);
  }

  /**
   * Emit flight completed event
   */
  emitFlightCompleted(flight: Flight, runway: Runway): void {
    this.emit(AppEventType.FLIGHT_COMPLETED, { flight, runway } as FlightCompletedEvent);
  }

  /**
   * Emit scheduler triggered event
   */
  emitSchedulerTriggered(): void {
    this.emit(AppEventType.SCHEDULER_TRIGGERED);
  }

  /**
   * Emit scheduler started event
   */
  emitSchedulerStarted(): void {
    this.emit(AppEventType.SCHEDULER_STARTED);
  }

  /**
   * Emit scheduler stopped event
   */
  emitSchedulerStopped(): void {
    this.emit(AppEventType.SCHEDULER_STOPPED);
  }
}

// Export singleton instance
export const appEvents = AppEvents.getInstance();
