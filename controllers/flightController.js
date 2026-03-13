const flightService = require('../services/flightService');

const parseRequestBody = (req, res) => new Promise((resolve, reject) => {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    if (!body) {
      resolve({});
      return;
    }

    try {
      resolve(JSON.parse(body));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      reject(error);
    }
  });
});

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

const createFlight = async (req, res) => {
  try {
    const payload = await parseRequestBody(req, res);
    const errors = flightService.validateFlightPayload(payload);

    if (errors.length > 0) {
      sendJson(res, 400, { error: `Missing or invalid fields: ${errors.join(', ')}` });
      return true;
    }

    const flight = flightService.createFlight(payload);
    if (flight.emergency) {
      console.log(`Emergency flight ${flight.flightNumber} requesting immediate ${flight.type}`);
    } else {
      console.log(`Flight ${flight.flightNumber} requesting ${flight.type}`);
    }
    sendJson(res, 201, flight);
    return true;
  } catch (error) {
    return true;
  }
};

const getAllFlights = (req, res) => {
  sendJson(res, 200, flightService.getAllFlights());
  return true;
};

const getFlightById = (req, res, id) => {
  const flight = flightService.getFlightById(id);
  if (!flight) {
    sendJson(res, 404, { error: 'Flight not found' });
    return true;
  }

  sendJson(res, 200, flight);
  return true;
};

const updateFlight = async (req, res, id) => {
  try {
    const payload = await parseRequestBody(req, res);
    if (payload.type && payload.type !== 'landing' && payload.type !== 'takeoff') {
      sendJson(res, 400, { error: 'type must be landing or takeoff' });
      return true;
    }

    if (payload.emergency !== undefined && typeof payload.emergency !== 'boolean') {
      sendJson(res, 400, { error: 'emergency must be a boolean' });
      return true;
    }

    const { error, flight } = flightService.updateFlight(id, payload);
    if (error === 'not_found') {
      sendJson(res, 404, { error: 'Flight not found' });
      return true;
    }

    if (error === 'not_waiting') {
      sendJson(res, 409, { error: 'Only waiting flights can be updated' });
      return true;
    }

    sendJson(res, 200, flight);
    return true;
  } catch (error) {
    return true;
  }
};

const deleteFlight = (req, res, id) => {
  const result = flightService.deleteFlight(id);
  if (result.error === 'not_found') {
    sendJson(res, 404, { error: 'Flight not found' });
    return true;
  }

  if (result.error === 'not_waiting') {
    sendJson(res, 409, { error: 'Only waiting flights can be deleted' });
    return true;
  }

  sendJson(res, 200, { message: 'Flight deleted' });
  return true;
};

const getQueue = (req, res) => {
  sendJson(res, 200, flightService.getQueue());
  return true;
};

module.exports = {
  createFlight,
  getAllFlights,
  getFlightById,
  updateFlight,
  deleteFlight,
  getQueue,
};
