import http from 'http';
import fs from 'fs';
import path from 'path';
import {
  FlightService,
  RunwayService,
  SchedulerService,
  StatsService,
} from './services';
import {
  FlightController,
  RunwayController,
  StatsController,
} from './controllers';
import {
  createFlightRoutes,
  createRunwayRoutes,
  createStatsRoutes,
} from './routes';
import { SchedulingEngine, BalancedStrategy } from './scheduler';
import { logger } from './utils';
import { appEvents, AppEventType } from './events';
import { config } from './config';
import { PersistenceService } from './persistence';

const appLogger = logger.child('Server');

/**
 * Serve static HTML file
 */
const serveStatic = (req: http.IncomingMessage, res: http.ServerResponse): boolean => {
  if (req.method !== 'GET' || (req.url !== '/' && req.url !== '/index.html')) {
    return false;
  }

  // Use the existing public/index.html from the root
  const filePath = path.join(__dirname, '..', 'public', 'index.html');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to load UI' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });

  return true;
};

/**
 * Initialize services with dependency injection
 * Flow: Persistence → Load → Events → Services → Scheduler reacts to events
 */
const initializeServices = async (persistence: PersistenceService) => {
  // Create FlightService with persistence
  const flightService = new FlightService(persistence);

  // Load existing flights from persistence
  await flightService.loadFromPersistence();

  // Create scheduling engine with access to FlightService's flights map
  // This allows the engine to look up flight details when applying strategies
  const schedulingEngine = new SchedulingEngine(
    new BalancedStrategy(),
    flightService.getFlightsMap()
  );

  // Create other services
  const runwayService = new RunwayService();
  const statsService = new StatsService(flightService, runwayService);

  // SchedulerService listens to events from FlightService and RunwayService
  const schedulerService = new SchedulerService(flightService, runwayService, schedulingEngine);

  return {
    flightService,
    runwayService,
    statsService,
    schedulerService,
    schedulingEngine,
  };
};

/**
 * Main application entry point
 */
const main = async () => {
  appLogger.info('Initializing Flight Runway Scheduler...');

  // Log configuration from environment
  config.logConfig();

  // Create persistence service
  const persistence = new PersistenceService();
  appLogger.info(`Persistence file: ${persistence.getFilePath()}`);

  // Initialize services (async - loads persisted data)
  const { flightService, runwayService, statsService, schedulerService } = await initializeServices(persistence);

  // Create controllers
  const flightController = new FlightController(flightService);
  const runwayController = new RunwayController(runwayService);
  const statsController = new StatsController(statsService);

  // Create route handlers
  const handleFlightRoutes = createFlightRoutes(flightController);
  const handleRunwayRoutes = createRunwayRoutes(runwayController);
  const handleStatsRoutes = createStatsRoutes(statsController);

  // Create HTTP server
  const server = http.createServer((req, res) => {
    const handled =
      serveStatic(req, res) ||
      handleFlightRoutes(req, res) ||
      handleRunwayRoutes(req, res) ||
      handleStatsRoutes(req, res);

    if (handled === false) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  });

  // Start server
  const port = config.getPort();
  server.listen(port, () => {
    appLogger.success(`Running on port ${port}`);
    appLogger.info(`Web UI: http://localhost:${port}`);
  });

  // Start the scheduler (will begin listening to events)
  schedulerService.start();

  // Set up event logging for debugging
  appEvents.on(AppEventType.SCHEDULER_TRIGGERED, () => {
    appLogger.debug('Scheduler triggered');
  });

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    appLogger.info(`${signal} received, shutting down gracefully...`);
    schedulerService.stop();

    // Flush persistence before exit
    await persistence.flush(flightService.getFlightsMap(), flightService.getIdCounter?.() || 0);
    appLogger.info('Data persisted');

    server.close(() => {
      appLogger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  appLogger.info('Ready to accept requests');
};

// Run the application
main().catch(error => {
  appLogger.error('Failed to start server:', error);
  process.exit(1);
});
