const flightService = require('./flightService');
const runwayService = require('./runwayService');

let isSchedulerRunning = false;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const getRandomDelay = () => {
  const minDelay = 3000;
  const maxDelay = 7000;
  return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
};

const processFlight = async (flight, runway) => {
  flightService.markProcessing(flight, runway.id);
  runwayService.assignRunway(runway, flight.id);
  const emergencyTag = flight.emergency ? ' EMERGENCY' : '';
  console.log(`Runway ${runway.id} assigned to${emergencyTag} flight ${flight.flightNumber} for ${flight.type}`);

  await delay(getRandomDelay());

  flightService.markCompleted(flight);
  console.log(`Runway ${runway.id} released by flight ${flight.flightNumber}`);
  flightService.clearRunwayAssignment(flight);
  runwayService.releaseRunway(runway);
};

const runwayWorker = async runway => {
  while (true) {
    if (runway.status === runwayService.STATUS.DISABLED) {
      await delay(500);
      continue;
    }

    const nextFlight = flightService.getNextQueuedFlight();
    if (nextFlight) {
      await processFlight(nextFlight, runway);
    } else {
      await delay(500);
    }
  }
};

const startScheduler = () => {
  if (isSchedulerRunning) {
    return;
  }

  isSchedulerRunning = true;
  const runways = runwayService.getRunways();
  runways.forEach(runway => {
    runwayWorker(runway);
  });
};

module.exports = {
  startScheduler,
};
