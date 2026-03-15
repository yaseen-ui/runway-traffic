/**
 * Flight status enumeration
 */
export enum FlightStatus {
  WAITING = 'waiting',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
}

/**
 * Flight type - either landing or takeoff
 */
export type FlightType = 'landing' | 'takeoff';

/**
 * Flight entity representing a flight request
 */
export interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  type: FlightType;
  emergency: boolean;
  status: FlightStatus;
  runwayId: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for creating a new flight
 */
export interface CreateFlightPayload {
  flightNumber: string;
  airline: string;
  type: FlightType;
  emergency?: boolean;
}

/**
 * Payload for updating an existing flight
 */
export interface UpdateFlightPayload {
  flightNumber?: string;
  airline?: string;
  type?: FlightType;
  emergency?: boolean;
}

/**
 * Runway status enumeration
 */
export enum RunwayStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  DISABLED = 'disabled',
}

/**
 * Runway entity representing a runway
 */
export interface Runway {
  id: string;
  status: RunwayStatus;
  currentFlightId: string | null;
}

/**
 * Scheduler strategy interface - all scheduling strategies must implement this
 */
export interface SchedulerStrategy {
  /**
   * Name of the strategy for identification
   */
  readonly name: string;

  /**
   * Select the next flight from the queue based on the strategy
   * @param flights - Array of waiting flights
   * @returns The selected flight or null if no flight should be selected
   */
  selectNextFlight(flights: Flight[]): Flight | null;
}

/**
 * Statistics for the system
 */
export interface SystemStats {
  totalFlights: number;
  waitingFlights: number;
  processingFlights: number;
  completedFlights: number;
  failedFlights: number;
  runways: {
    total: number;
    busy: number;
    idle: number;
    disabled: number;
  };
}

/**
 * Service result types for operations that can fail
 */
export interface ServiceResult<T> {
  data?: T;
  error?: string;
}

/**
 * Flight service result types
 */
export type FlightResult = ServiceResult<Flight>;
export type DeleteResult =
  | { deleted: true; error?: undefined }
  | { deleted?: undefined; error: string };
export type RunwayResult = ServiceResult<Runway>;
