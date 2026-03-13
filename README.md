# Flight Runway Scheduler

A minimal Node.js HTTP service that simulates flight runway scheduling with a queue and background scheduler. Flights are stored in memory and move through `waiting -> processing -> completed` states. The scheduler runs multiple runway workers in parallel, prioritizes landing requests over takeoff requests, and jumps emergency flights to the front of the queue.

## Getting Started

Start the server:

```bash
node server.js
```

The server listens on `http://localhost:3000`.

## Web UI

Open `http://localhost:3000` in your browser to view the live dashboard. The page auto-refreshes every few seconds, shows flight and runway status, and includes a small form to submit new flight requests.

## Scheduler Behavior

- `POST /flights` adds a flight request to the queue with status `waiting`.
- Two runway workers consume the queue in parallel and always prioritize landing requests.
- Emergency flights jump ahead of all other requests.
- Runways can be disabled or enabled; disabled runways finish their current flight but stop taking new ones.
- Each processing step waits 3–7 seconds to simulate runway usage.
- Logs are printed when a runway is assigned, released, disabled, or enabled.

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
