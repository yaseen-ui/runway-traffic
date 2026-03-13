const STATUS = {
  WAITING: 'waiting',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
};

const flights = [];
const queue = [];
let nextFlightId = 1;

const createFlight = ({ flightNumber, airline, type, emergency = false }) => {
  const now = new Date().toISOString();
  const flight = {
    id: String(nextFlightId++),
    flightNumber,
    airline,
    type,
    emergency: Boolean(emergency),
    status: STATUS.WAITING,
    runwayId: null,
    scheduledAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  flights.push(flight);
  queue.push(flight.id);

  return flight;
};

const getAllFlights = () => flights;

const getFlightById = id => flights.find(flight => flight.id === id);

const updateFlight = (id, updates) => {
  const flight = getFlightById(id);
  if (!flight) {
    return { error: 'not_found' };
  }

  if (flight.status !== STATUS.WAITING) {
    return { error: 'not_waiting' };
  }

  if (updates.flightNumber) {
    flight.flightNumber = updates.flightNumber;
  }

  if (updates.airline) {
    flight.airline = updates.airline;
  }

  if (updates.type) {
    flight.type = updates.type;
  }

  if (typeof updates.emergency === 'boolean') {
    flight.emergency = updates.emergency;
  }

  flight.updatedAt = new Date().toISOString();
  return { flight };
};

const deleteFlight = id => {
  const flightIndex = flights.findIndex(flight => flight.id === id);
  if (flightIndex === -1) {
    return { error: 'not_found' };
  }

  if (flights[flightIndex].status !== STATUS.WAITING) {
    return { error: 'not_waiting' };
  }

  flights.splice(flightIndex, 1);
  const queueIndex = queue.indexOf(id);
  if (queueIndex !== -1) {
    queue.splice(queueIndex, 1);
  }

  return { deleted: true };
};

const getQueue = () => queue.map(id => getFlightById(id)).filter(Boolean);

const getNextQueuedFlight = () => {
  if (queue.length === 0) {
    return null;
  }

  const emergencyIndex = queue.findIndex(id => {
    const flight = getFlightById(id);
    return flight && flight.emergency;
  });

  if (emergencyIndex !== -1) {
    const [nextId] = queue.splice(emergencyIndex, 1);
    return getFlightById(nextId);
  }

  const landingIndex = queue.findIndex(id => {
    const flight = getFlightById(id);
    return flight && flight.type === 'landing';
  });

  const indexToUse = landingIndex !== -1 ? landingIndex : 0;
  const [nextId] = queue.splice(indexToUse, 1);
  return getFlightById(nextId);
};

const markProcessing = (flight, runwayId) => {
  flight.status = STATUS.PROCESSING;
  flight.runwayId = runwayId;
  flight.scheduledAt = new Date().toISOString();
  flight.updatedAt = new Date().toISOString();
};

const markCompleted = flight => {
  flight.status = STATUS.COMPLETED;
  flight.completedAt = new Date().toISOString();
  flight.updatedAt = new Date().toISOString();
};

const clearRunwayAssignment = flight => {
  flight.runwayId = null;
  flight.updatedAt = new Date().toISOString();
};

const validateFlightPayload = payload => {
  const errors = [];

  if (!payload.flightNumber || typeof payload.flightNumber !== 'string') {
    errors.push('flightNumber');
  }

  if (!payload.airline || typeof payload.airline !== 'string') {
    errors.push('airline');
  }

  if (!payload.type || (payload.type !== 'landing' && payload.type !== 'takeoff')) {
    errors.push('type');
  }

  if (payload.emergency !== undefined && typeof payload.emergency !== 'boolean') {
    errors.push('emergency');
  }

  return errors;
};

module.exports = {
  STATUS,
  createFlight,
  getAllFlights,
  getFlightById,
  updateFlight,
  deleteFlight,
  getQueue,
  getNextQueuedFlight,
  markProcessing,
  markCompleted,
  clearRunwayAssignment,
  validateFlightPayload,
};
