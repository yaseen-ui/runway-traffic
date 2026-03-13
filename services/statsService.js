const flightService = require('./flightService');
const runwayService = require('./runwayService');

const getStats = () => {
  const flights = flightService.getAllFlights();
  const waitingFlights = flightService.getQueue().length;
  const processingFlights = flights.filter(flight => flight.status === flightService.STATUS.PROCESSING).length;
  const completedFlights = flights.filter(flight => flight.status === flightService.STATUS.COMPLETED).length;

  const runways = runwayService.getRunways();
  const runwaysBusy = runways.filter(runway => runway.status === runwayService.STATUS.BUSY).length;
  const runwaysIdle = runways.filter(runway => runway.status === runwayService.STATUS.IDLE).length;
  const runwaysDisabled = runways.filter(runway => runway.status === runwayService.STATUS.DISABLED).length;

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
};

module.exports = {
  getStats,
};
