import { SystemStats, FlightStatus, RunwayStatus } from '../types';
import { FlightService } from './flightService';
import { RunwayService } from './runwayService';

/**
 * StatsService aggregates and provides system statistics
 */
export class StatsService {
  private flightService: FlightService;
  private runwayService: RunwayService;

  constructor(flightService: FlightService, runwayService: RunwayService) {
    this.flightService = flightService;
    this.runwayService = runwayService;
  }

  /**
   * Get comprehensive system statistics
   */
  getStats(): SystemStats {
    const flights = this.flightService.getAllFlights();
    const waitingFlights = this.flightService.getQueue().length;
    const processingFlights = flights.filter(
      flight => flight.status === FlightStatus.PROCESSING
    ).length;
    const completedFlights = flights.filter(
      flight => flight.status === FlightStatus.COMPLETED
    ).length;

    const runways = this.runwayService.getRunways();
    const runwaysBusy = runways.filter(
      runway => runway.status === RunwayStatus.BUSY
    ).length;
    const runwaysIdle = runways.filter(
      runway => runway.status === RunwayStatus.IDLE
    ).length;
    const runwaysDisabled = runways.filter(
      runway => runway.status === RunwayStatus.DISABLED
    ).length;

    return {
      totalFlights: flights.length,
      waitingFlights,
      processingFlights,
      completedFlights,
      failedFlights: 0,
      runways: {
        total: runways.length,
        busy: runwaysBusy,
        idle: runwaysIdle,
        disabled: runwaysDisabled,
      },
    };
  }
}
