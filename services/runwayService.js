const RUNWAY_COUNT = 2;

const STATUS = {
  IDLE: 'idle',
  BUSY: 'busy',
  DISABLED: 'disabled',
};

const runways = Array.from({ length: RUNWAY_COUNT }, (_, index) => ({
  id: String(index + 1),
  status: STATUS.IDLE,
  currentFlightId: null,
}));

const getRunways = () => runways;

const getRunwayById = id => runways.find(runway => runway.id === String(id));

const disableRunway = id => {
  const runway = getRunwayById(id);
  if (!runway) {
    return { error: 'not_found' };
  }

  runway.status = STATUS.DISABLED;
  return { runway };
};

const enableRunway = id => {
  const runway = getRunwayById(id);
  if (!runway) {
    return { error: 'not_found' };
  }

  if (runway.status === STATUS.DISABLED) {
    runway.status = runway.currentFlightId ? STATUS.BUSY : STATUS.IDLE;
  }

  return { runway };
};

const assignRunway = (runway, flightId) => {
  runway.status = STATUS.BUSY;
  runway.currentFlightId = flightId;
};

const releaseRunway = runway => {
  runway.currentFlightId = null;
  runway.status = runway.status === STATUS.DISABLED ? STATUS.DISABLED : STATUS.IDLE;
};

module.exports = {
  RUNWAY_COUNT,
  STATUS,
  getRunways,
  getRunwayById,
  disableRunway,
  enableRunway,
  assignRunway,
  releaseRunway,
};
