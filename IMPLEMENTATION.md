# Flight Runway Scheduler - Implementation Guide

A TypeScript-based flight runway scheduling system with event-driven architecture, pluggable scheduling strategies, environment-based configuration, and JSON persistence.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Event-Driven Design](#event-driven-design)
5. [Scheduling Strategies](#scheduling-strategies)
6. [Configuration](#configuration)
7. [Persistence](#persistence)
8. [API Endpoints](#api-endpoints)
9. [Getting Started](#getting-started)
10. [Extending the System](#extending-the-system)

---

## Architecture Overview

The system follows a clean, layered architecture with dependency injection:

```
┌─────────────────────────────────────────────────────────────────┐
│                         HTTP Server                              │
│                    (Express-style routing)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Controllers  │    │  Controllers  │    │  Controllers  │
│   (Flight)    │    │   (Runway)    │    │   (Stats)     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ FlightService │    │ RunwayService │    │  StatsService │
│   + Events    │    │   + Events    │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │
        └─────────────────────┼─────────────────────┐
                              │                     │
                              ▼                     │
                    ┌─────────────────┐            │
                    │ SchedulingEngine │◄──────────┘
                    │  + Strategies   │
                    └─────────────────┘
                              │
                    ┌─────────────────┐
                    │ SchedulerService │
                    │  (Event Listener)│
                    └─────────────────┘
                              │
                    ┌─────────────────┐
                    │PersistenceService│
                    │  (JSON Storage) │
                    └─────────────────┘
```

### Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        EVENT FLOW                                │
└──────────────────────────────────────────────────────────────────┘

POST /flights
    │
    ▼
┌─────────────────┐
│ FlightService   │
│ createFlight()  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ appEvents.emit(FLIGHT_QUEUED)   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ SchedulerService (Listener)     │
│ 1. schedulingEngine.enqueue()   │
│ 2. trySchedule()                │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Find idle runway?               │
│   Yes ──► Assign flight         │
│   No  ──► Wait for RUNWAY_      │
│           RELEASED event        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Process flight (LANDING_TIME or │
│ TAKE_OFF_TIME from config)      │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ appEvents.emit(RUNWAY_RELEASED) │
│ Scheduler tries next flight     │
└─────────────────────────────────┘
```

---

## Project Structure

```
src/
├── config/
│   └── index.ts          # Environment variable configuration
├── controllers/
│   ├── index.ts          # Controller exports
│   ├── flightController.ts
│   ├── runwayController.ts
│   └── statsController.ts
├── events/
│   └── index.ts          # AppEvents singleton (EventEmitter)
├── persistence/
│   └── index.ts          # PersistenceService (JSON file storage)
├── routes/
│   ├── index.ts          # Route factory exports
│   ├── flightRoutes.ts
│   ├── runwayRoutes.ts
│   └── statsRoutes.ts
├── scheduler/
│   ├── index.ts          # SchedulingEngine
│   └── strategies.ts     # Strategy implementations
├── services/
│   ├── index.ts          # Service exports
│   ├── flightService.ts
│   ├── runwayService.ts
│   ├── schedulerService.ts
│   └── statsService.ts
├── types/
│   └── index.ts          # TypeScript interfaces & enums
├── utils/
│   ├── index.ts          # Utility exports
│   └── logger.ts         # Structured logging
└── server.ts             # Application entry point

public/
└── index.html            # Web dashboard

data/
└── flights.json          # Persisted flight data (auto-created)

Flight-Runway-Scheduler.postman_collection.json
```

---

## Core Components

### 1. Types (`src/types/index.ts`)

```typescript
// Flight entity
interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  type: 'landing' | 'takeoff';
  emergency: boolean;
  status: FlightStatus;  // WAITING | PROCESSING | COMPLETED
  runwayId: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Scheduling strategy interface
interface SchedulerStrategy {
  readonly name: string;
  selectNextFlight(flights: Flight[]): Flight | null;
}

// Runway entity
interface Runway {
  id: string;
  status: RunwayStatus;  // IDLE | BUSY | DISABLED
  currentFlightId: string | null;
}
```

### 2. Services

#### FlightService
- Manages flight CRUD operations
- Emits events on state changes
- Integrates with PersistenceService
- Validates flight payloads

#### RunwayService
- Manages runway state (idle/busy/disabled)
- Emits events on state changes
- Used by SchedulerService

#### SchedulerService
- Listens to system events
- Manages runway workers
- Orchestrates flight assignment via SchedulingEngine

#### StatsService
- Aggregates system statistics
- Provides data for /stats endpoint

### 3. Controllers

RESTful handlers that:
- Parse request bodies
- Validate input
- Call service methods
- Return JSON responses

---

## Event-Driven Design

### AppEvents (`src/events/index.ts`)

Central event hub using Node's EventEmitter:

```typescript
enum AppEventType {
  FLIGHT_CREATED = 'flight:created',
  FLIGHT_QUEUED = 'flight:queued',
  FLIGHT_UPDATED = 'flight:updated',
  FLIGHT_CANCELLED = 'flight:cancelled',
  RUNWAY_RELEASED = 'runway:released',
  RUNWAY_ENABLED = 'runway:enabled',
  RUNWAY_DISABLED = 'runway:disabled',
  SCHEDULER_TRIGGERED = 'scheduler:triggered',
  FLIGHT_ASSIGNED = 'flight:assigned',
  FLIGHT_COMPLETED = 'flight:completed',
}
```

### Event Flow

| Event | Emitter | Listener Actions |
|-------|---------|------------------|
| `flight:queued` | FlightService | Add to queue, trySchedule() |
| `flight:updated` | FlightService | Re-evaluate queue |
| `flight:cancelled` | FlightService | Remove from queue, trySchedule() |
| `runway:released` | RunwayService | Try to assign next flight |
| `runway:enabled` | RunwayService | Try to assign next flight |

---

## Scheduling Strategies

### Built-in Strategies (`src/scheduler/strategies.ts`)

| Strategy | Priority Order |
|----------|----------------|
| **BalancedStrategy** (default) | Emergency → Landing → Takeoff |
| **FifoStrategy** | By creation time (oldest first) |
| **EmergencyFirstStrategy** | Emergency first → FIFO |
| **LandingPriorityStrategy** | Emergency landing → Landing → Emergency takeoff → Takeoff |

### Implementing Custom Strategy

```typescript
import { SchedulerStrategy, Flight } from '../types';

export class MyStrategy implements SchedulerStrategy {
  readonly name = 'MyStrategy';

  selectNextFlight(flights: Flight[]): Flight | null {
    if (flights.length === 0) return null;
    
    // Custom logic here
    return flights[0];
  }
}
```

### Switching Strategies

Edit `src/server.ts` in `initializeServices()`:

```typescript
const schedulingEngine = new SchedulingEngine(
  new FifoStrategy(),  // Change strategy here
  flightService.getFlightsMap()
);
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `LANDING_TIME` | `4000` | Landing processing time (ms) |
| `TAKE_OFF_TIME` | `5000` | Takeoff processing time (ms) |
| `LOG_LEVEL` | `info` | debug/info/warn/error |

### Usage

```bash
# Custom processing times
LANDING_TIME=3000 TAKE_OFF_TIME=4000 npm start

# Fast mode for testing
LANDING_TIME=500 TAKE_OFF_TIME=500 npm start

# Debug logging
LOG_LEVEL=debug npm start
```

### Config Utility (`src/config/index.ts`)

```typescript
import { config } from './config';

// Get values
const port = config.getPort();
const landingTime = config.getLandingTime();
const takeoffTime = config.getTakeoffTime();
const processingTime = config.getProcessingTime('landing'); // or 'takeoff'
```

---

## Persistence

### PersistenceService (`src/persistence/index.ts`)

- **File**: `data/flights.json`
- **Format**: JSON with flights array, idCounter, timestamp
- **Writes**: Debounced 100ms, atomic (temp file + rename)
- **Loads**: On server startup, restores waiting flights

### Data Structure

```json
{
  "flights": [...],
  "idCounter": 10,
  "savedAt": "2024-01-15T10:35:22.123Z"
}
```

### Persistence Triggers

- Flight created/updated/deleted
- Flight processing started
- Flight completed
- Server shutdown (SIGTERM/SIGINT)

---

## API Endpoints

### Flights

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/flights` | Create flight |
| GET | `/flights` | List all flights |
| GET | `/flights/:id` | Get flight by ID |
| PUT | `/flights/:id` | Update waiting flight |
| DELETE | `/flights/:id` | Delete waiting flight |
| GET | `/queue` | Get waiting queue |

### Runways

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/runways` | List all runways |
| POST | `/runways/:id/enable` | Enable runway |
| POST | `/runways/:id/disable` | Disable runway |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | System statistics |

### Request Examples

**Create Flight**
```bash
curl -X POST http://localhost:3000/flights \
  -H "Content-Type: application/json" \
  -d '{"flightNumber":"AI203","airline":"Air India","type":"landing","emergency":false}'
```

**Create Emergency Flight**
```bash
curl -X POST http://localhost:3000/flights \
  -H "Content-Type: application/json" \
  -d '{"flightNumber":"EMRG01","airline":"Emergency","type":"landing","emergency":true}'
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server
npm start

# Development (build + start)
npm run dev
```

### Environment Setup

```bash
# Optional: Create .env file
echo "PORT=3000
LANDING_TIME=4000
TAKE_OFF_TIME=5000
LOG_LEVEL=info" > .env
```

### Testing

1. Open http://localhost:3000 for web dashboard
2. Import Postman collection: `Flight-Runway-Scheduler.postman_collection.json`
3. Run simulation: `bash simulateFlights.sh`

---

## Extending the System

### Adding a New Strategy

1. Create strategy in `src/scheduler/strategies.ts`
2. Export from `src/scheduler/index.ts`
3. Use in `src/server.ts`

### Adding New Events

1. Add to `AppEventType` enum
2. Add emit method to `AppEvents` class
3. Add listener in `SchedulerService.setupEventListeners()`

### Adding New Endpoints

1. Add method to appropriate Controller
2. Add route in corresponding Routes file
3. Add to route handler

### Custom Persistence

Replace `PersistenceService` with any storage backend:
- Database (PostgreSQL, MongoDB)
- Redis
- Cloud storage (S3, etc.)

Just implement the same interface:
```typescript
interface IPersistence {
  load(): Promise<{ flights: Flight[]; idCounter: number }>;
  save(flights: Map<string, Flight>, idCounter: number): Promise<void>;
  flush(flights: Map<string, Flight>, idCounter: number): Promise<void>;
}
```

---

## Logging

Structured logs with timestamps and component prefixes:

```
[19:51:58] [INFO ] [App:Server] Initializing Flight Runway Scheduler...
[19:51:58] [INFO ] [App:Config] PORT=3000
[19:51:58] [INFO ] [App:Config] LANDING_TIME=4000ms
[19:51:58] [INFO ] [App:Config] TAKE_OFF_TIME=5000ms
[19:51:58] [INFO ] [App:Persistence] No existing data file found, starting fresh
[19:51:58] [INFO ] [App:Flight] Restored 0 flights from persistence
[19:51:58] [INFO ] [App:Scheduler] Event listeners registered
[19:51:58] [OK   ] [App:Scheduler] Started with 2 runway workers
[19:51:58] [INFO ] [App:Server] Ready to accept requests
```

---

## License

MIT
