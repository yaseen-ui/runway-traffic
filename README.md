# Flight Runway Scheduler

A TypeScript Node.js HTTP service that simulates flight runway scheduling with a queue and background scheduler. Flights are stored in memory and move through `waiting -> processing -> completed` states. The scheduler runs multiple runway workers in parallel with **pluggable scheduling strategies** to determine which flight gets runway priority.

## Architecture

The project has been refactored with a clean separation of concerns:

```
src/
├── types/           # TypeScript interfaces and enums
├── scheduler/       # Pluggable scheduling engine and strategies
├── services/        # Business logic (Flight, Runway, Scheduler, Stats)
├── controllers/     # HTTP request handlers
├── routes/          # Route definitions
└── server.ts        # Application entry point
```

### Event-Driven Architecture

The scheduler uses an event-driven design where services emit events and the scheduler reacts to them:

```
Flight Created ──► flight:queued event ──► Scheduler adds to queue ──► Try assign to runway
                                                                    │
Runway Released ──► runway:released event ────────────────────────────┘
```

**Events emitted by the system:**
- `flight:created` / `flight:queued` - New flight added to system
- `flight:updated` - Flight details changed (e.g., emergency flag)
- `flight:cancelled` - Flight removed from queue
- `runway:released` - Runway became available
- `runway:enabled` / `runway:disabled` - Runway state changed
- `flight:assigned` - Flight assigned to runway
- `flight:completed` - Flight finished processing
- `scheduler:triggered` - Scheduler evaluated queue

### Pluggable Scheduling Strategies

The scheduler supports multiple strategies that can be swapped at runtime:

| Strategy | Description |
|----------|-------------|
| `FifoStrategy` | First In First Out - processes flights in order of arrival |
| `EmergencyFirstStrategy` | Prioritizes emergency flights, then FIFO |
| `LandingPriorityStrategy` | Emergency landings → Regular landings → Emergency takeoffs → Regular takeoffs |
| `BalancedStrategy` (default) | Emergency flights → Landings → Takeoffs |

To use a different strategy, modify the `initializeServices()` function in `server.ts`:

```typescript
import { FifoStrategy } from './scheduler';

// Change from BalancedStrategy to FifoStrategy
const schedulingEngine = new SchedulingEngine(new FifoStrategy(), flightLookup);
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

```bash
npm install
```

### Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

### Run

Start the server:

```bash
npm start
```

Or build and run in one command:

```bash
npm run dev
```

The server listens on `http://localhost:3000`.

## Web UI

Open `http://localhost:3000` in your browser to view the live dashboard. The page auto-refreshes every few seconds, shows flight and runway status, and includes a small form to submit new flight requests.

## Scheduler Behavior

- `POST /flights` adds a flight request to the queue with status `waiting`.
- Two runway workers consume the queue in parallel using the configured scheduling strategy.
- The default **BalancedStrategy** prioritizes: Emergency flights → Landings → Takeoffs.
- Runways can be disabled or enabled; disabled runways finish their current flight but stop taking new ones.
- Each processing step waits 3–7 seconds to simulate runway usage.
- Logs are printed when a runway is assigned, released, disabled, or enabled.

## API Testing

### Postman Collection

A Postman collection is included for easy API testing:

1. Import `Flight-Runway-Scheduler.postman_collection.json` into Postman
2. The collection includes requests for all endpoints with example payloads
3. Environment variable `base_url` is pre-configured to `http://localhost:3000`

### cURL Examples

## Endpoints

### System Stats

```bash
curl http://localhost:3000/stats
```

### Runway Status

```bash
curl http://localhost:3000/runways
```

### Disable a Runway

```bash
curl -X POST http://localhost:3000/runways/2/disable
```

### Enable a Runway

```bash
curl -X POST http://localhost:3000/runways/2/enable
```

### Create a Flight

```bash
curl -X POST http://localhost:3000/flights \
  -H "Content-Type: application/json" \
  -d '{"flightNumber": "AI203", "airline": "Air India", "type": "landing"}'
```

Emergency example:

```bash
curl -X POST http://localhost:3000/flights \
  -H "Content-Type: application/json" \
  -d '{"flightNumber": "EK202", "airline": "Emirates", "type": "landing", "emergency": true}'
```

### List All Flights

```bash
curl http://localhost:3000/flights
```

### Get a Single Flight

```bash
curl http://localhost:3000/flights/1
```

### Update a Waiting Flight

Only flights still in `waiting` can be updated.

```bash
curl -X PUT http://localhost:3000/flights/1 \
  -H "Content-Type: application/json" \
  -d '{"airline": "Air India Express", "type": "takeoff"}'
```

### Delete a Waiting Flight

Only flights still in `waiting` can be deleted.

```bash
curl -X DELETE http://localhost:3000/flights/1
```

### View the Queue

```bash
curl http://localhost:3000/queue
```

## Simulation Script

Use the helper script to fire multiple flight requests quickly:

```bash
bash simulateFlights.sh
```

Watch the server logs to see runway assignments and releases as the queue is processed.

## Extending the Scheduler

### Creating Custom Strategies

You can implement your own scheduling strategy by implementing the `SchedulerStrategy` interface:

```typescript
import { SchedulerStrategy, Flight } from './types';

export class MyCustomStrategy implements SchedulerStrategy {
  readonly name = 'MyCustom';

  selectNextFlight(flights: Flight[]): Flight | null {
    // Your custom logic here
    // Return the flight that should be processed next
    // Return null if no flight should be selected

    // Example: shortest flight number first
    return flights.reduce((shortest, flight) =>
      flight.flightNumber.length < shortest.flightNumber.length ? flight : shortest
    );
  }
}
```

Then use it in `server.ts`:

```typescript
const schedulingEngine = new SchedulingEngine(new MyCustomStrategy(), flightLookup);
```

### Key Interfaces

**SchedulerStrategy** - All strategies must implement:
- `name: string` - Strategy identifier
- `selectNextFlight(flights: Flight[]): Flight | null` - Selection logic

**SchedulingEngine** - The queue processor:
- `enqueue(flightId: string)` - Add flight to queue
- `getNextFlight(): Flight | null` - Get next flight using strategy
- `setStrategy(strategy: SchedulerStrategy)` - Change strategy at runtime
- `getQueue(): Flight[]` - View current queue
