import { Flight, SchedulerStrategy } from '../types';

/**
 * Scheduling engine that manages the queue and applies strategies
 * to select the next flight for processing.
 */
export class SchedulingEngine {
  private queue: string[] = [];
  private strategy: SchedulerStrategy;
  private flightLookup: Map<string, Flight>;

  constructor(
    strategy: SchedulerStrategy,
    flightLookup: Map<string, Flight>
  ) {
    this.strategy = strategy;
    this.flightLookup = flightLookup;
  }

  /**
   * Add a flight to the scheduling queue
   */
  enqueue(flightId: string): void {
    this.queue.push(flightId);
  }

  /**
   * Remove a flight from the queue by ID (used when deleting flights)
   */
  remove(flightId: string): boolean {
    const index = this.queue.indexOf(flightId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get the current queue as an array of flight IDs
   */
  getQueueIds(): string[] {
    return [...this.queue];
  }

  /**
   * Get the current queue as an array of Flight objects
   */
  getQueue(): Flight[] {
    return this.queue
      .map(id => this.flightLookup.get(id))
      .filter((flight): flight is Flight => flight !== undefined);
  }

  /**
   * Get the next flight from the queue using the current strategy
   * Removes the selected flight from the queue
   */
  getNextFlight(): Flight | null {
    const waitingFlights = this.getQueue();
    if (waitingFlights.length === 0) {
      return null;
    }

    const selectedFlight = this.strategy.selectNextFlight(waitingFlights);
    if (!selectedFlight) {
      return null;
    }

    // Remove the selected flight from the queue
    const index = this.queue.indexOf(selectedFlight.id);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }

    return selectedFlight;
  }

  /**
   * Peek at the next flight without removing it from the queue
   */
  peekNextFlight(): Flight | null {
    const waitingFlights = this.getQueue();
    if (waitingFlights.length === 0) {
      return null;
    }

    return this.strategy.selectNextFlight(waitingFlights);
  }

  /**
   * Change the scheduling strategy at runtime
   */
  setStrategy(strategy: SchedulerStrategy): void {
    console.log(`Scheduling strategy changed to: ${strategy.name}`);
    this.strategy = strategy;
  }

  /**
   * Get the current strategy name
   */
  getCurrentStrategyName(): string {
    return this.strategy.name;
  }

  /**
   * Get the queue length
   */
  get length(): number {
    return this.queue.length;
  }
}

// Re-export strategies
export * from './strategies';

// Re-export SchedulerStrategy interface
export { SchedulerStrategy } from '../types';
