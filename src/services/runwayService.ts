import { Runway, RunwayStatus, RunwayResult } from '../types';
import { appEvents } from '../events';
import { logger } from '../utils';

const RUNWAY_COUNT = 2;

/**
 * RunwayService manages runway data and emits events for scheduler coordination
 */
export class RunwayService {
  private runways: Runway[];
  private runwayLogger = logger.child('Runway');

  constructor() {
    this.runways = Array.from({ length: RUNWAY_COUNT }, (_, index) => ({
      id: String(index + 1),
      status: RunwayStatus.IDLE,
      currentFlightId: null,
    }));
  }

  /**
   * Get all runways
   */
  getRunways(): Runway[] {
    return this.runways;
  }

  /**
   * Get a runway by ID
   */
  getRunwayById(id: string): Runway | undefined {
    return this.runways.find(runway => runway.id === id);
  }

  /**
   * Disable a runway for maintenance
   */
  disableRunway(id: string): RunwayResult {
    const runway = this.getRunwayById(id);
    if (!runway) {
      return { error: 'not_found' };
    }

    runway.status = RunwayStatus.DISABLED;

    // Emit event
    appEvents.emitRunwayDisabled(runway);

    this.runwayLogger.warn(`Runway ${runway.id} disabled for maintenance`);

    return { data: runway };
  }

  /**
   * Enable a runway after maintenance
   */
  enableRunway(id: string): RunwayResult {
    const runway = this.getRunwayById(id);
    if (!runway) {
      return { error: 'not_found' };
    }

    if (runway.status === RunwayStatus.DISABLED) {
      runway.status = runway.currentFlightId ? RunwayStatus.BUSY : RunwayStatus.IDLE;
    }

    // Emit event - scheduler may want to try assigning
    appEvents.emitRunwayEnabled(runway);

    this.runwayLogger.info(`Runway ${runway.id} enabled`);

    return { data: runway };
  }

  /**
   * Assign a flight to a runway
   */
  assignRunway(runway: Runway, flightId: string): void {
    runway.status = RunwayStatus.BUSY;
    runway.currentFlightId = flightId;

    this.runwayLogger.info(`Runway ${runway.id} assigned to flight ${flightId}`);
  }

  /**
   * Release a runway after flight completion
   */
  releaseRunway(runway: Runway): void {
    const wasFlightId = runway.currentFlightId;
    runway.currentFlightId = null;
    runway.status = runway.status === RunwayStatus.DISABLED ? RunwayStatus.DISABLED : RunwayStatus.IDLE;

    // Emit event - scheduler should try to assign next flight
    appEvents.emitRunwayReleased(runway);

    this.runwayLogger.info(`Runway ${runway.id} released${wasFlightId ? ` (was flight ${wasFlightId})` : ''}`);
  }

  /**
   * Get the total number of runways
   */
  getRunwayCount(): number {
    return RUNWAY_COUNT;
  }
}
