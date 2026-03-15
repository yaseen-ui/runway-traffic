import { Flight, SchedulerStrategy } from '../types';

/**
 * First In First Out (FIFO) Strategy
 * Selects flights in the order they were added to the queue
 */
export class FifoStrategy implements SchedulerStrategy {
  readonly name = 'FIFO';

  selectNextFlight(flights: Flight[]): Flight | null {
    if (flights.length === 0) {
      return null;
    }
    // Return the first flight in the queue (oldest created)
    return flights.reduce((oldest, flight) =>
      new Date(flight.createdAt) < new Date(oldest.createdAt) ? flight : oldest
    );
  }
}

/**
 * Emergency First Strategy
 * Prioritizes emergency flights, then falls back to FIFO
 */
export class EmergencyFirstStrategy implements SchedulerStrategy {
  readonly name = 'EmergencyFirst';

  selectNextFlight(flights: Flight[]): Flight | null {
    if (flights.length === 0) {
      return null;
    }

    // First, look for emergency flights
    const emergencyFlights = flights.filter(f => f.emergency);
    if (emergencyFlights.length > 0) {
      // Among emergency flights, pick the oldest
      return emergencyFlights.reduce((oldest, flight) =>
        new Date(flight.createdAt) < new Date(oldest.createdAt) ? flight : oldest
      );
    }

    // No emergency flights, fall back to FIFO
    return flights.reduce((oldest, flight) =>
      new Date(flight.createdAt) < new Date(oldest.createdAt) ? flight : oldest
    );
  }
}

/**
 * Landing Priority Strategy
 * Prioritizes landing flights over takeoffs, then emergency, then FIFO
 */
export class LandingPriorityStrategy implements SchedulerStrategy {
  readonly name = 'LandingPriority';

  selectNextFlight(flights: Flight[]): Flight | null {
    if (flights.length === 0) {
      return null;
    }

    // First priority: emergency landings
    const emergencyLandings = flights.filter(f => f.emergency && f.type === 'landing');
    if (emergencyLandings.length > 0) {
      return emergencyLandings.reduce((oldest, flight) =>
        new Date(flight.createdAt) < new Date(oldest.createdAt) ? flight : oldest
      );
    }

    // Second priority: regular landings
    const regularLandings = flights.filter(f => f.type === 'landing');
    if (regularLandings.length > 0) {
      // Among landings, prioritize emergency (shouldn't happen here but for safety)
      const landingEmergencies = regularLandings.filter(f => f.emergency);
      if (landingEmergencies.length > 0) {
        return landingEmergencies.reduce((oldest, flight) =>
          new Date(flight.createdAt) < new Date(oldest.createdAt) ? flight : oldest
        );
      }
      return regularLandings.reduce((oldest, flight) =>
        new Date(flight.createdAt) < new Date(oldest.createdAt) ? flight : oldest
      );
    }

    // Third priority: emergency takeoffs
    const emergencyTakeoffs = flights.filter(f => f.emergency && f.type === 'takeoff');
    if (emergencyTakeoffs.length > 0) {
      return emergencyTakeoffs.reduce((oldest, flight) =>
        new Date(flight.createdAt) < new Date(oldest.createdAt) ? flight : oldest
      );
    }

    // Last priority: regular takeoffs (FIFO)
    return flights.reduce((oldest, flight) =>
      new Date(flight.createdAt) < new Date(oldest.createdAt) ? flight : oldest
    );
  }
}

/**
 * Balanced Strategy (Default)
 * Similar to the original implementation:
 * - Emergency flights first
 * - Then landings (which typically need priority)
 * - Then takeoffs
 */
export class BalancedStrategy implements SchedulerStrategy {
  readonly name = 'Balanced';

  selectNextFlight(flights: Flight[]): Flight | null {
    if (flights.length === 0) {
      return null;
    }

    // First priority: any emergency flight
    const emergencyFlights = flights.filter(f => f.emergency);
    if (emergencyFlights.length > 0) {
      return emergencyFlights.reduce((oldest, flight) =>
        new Date(flight.createdAt) < new Date(oldest.createdAt) ? flight : oldest
      );
    }

    // Second priority: landings
    const landings = flights.filter(f => f.type === 'landing');
    if (landings.length > 0) {
      return landings.reduce((oldest, flight) =>
        new Date(flight.createdAt) < new Date(oldest.createdAt) ? flight : oldest
      );
    }

    // Last priority: takeoffs
    const takeoffs = flights.filter(f => f.type === 'takeoff');
    if (takeoffs.length > 0) {
      return takeoffs.reduce((oldest, flight) =>
        new Date(flight.createdAt) < new Date(oldest.createdAt) ? flight : oldest
      );
    }

    return null;
  }
}
