const flightController = require('../controllers/flightController');

const matchFlightIdRoute = (method, url) => {
  const match = url.match(/^\/flights\/([^\/]+)$/);
  if (!match) {
    return null;
  }

  return {
    method,
    id: match[1],
  };
};

const handleFlightRoutes = (req, res) => {
  const { method, url } = req;

  if (method === 'POST' && url === '/flights') {
    return flightController.createFlight(req, res);
  }

  if (method === 'GET' && url === '/flights') {
    return flightController.getAllFlights(req, res);
  }

  if (method === 'GET' && url === '/queue') {
    return flightController.getQueue(req, res);
  }

  const flightIdMatch = matchFlightIdRoute(method, url);
  if (!flightIdMatch) {
    return false;
  }

  if (flightIdMatch.method === 'GET') {
    return flightController.getFlightById(req, res, flightIdMatch.id);
  }

  if (flightIdMatch.method === 'PUT') {
    return flightController.updateFlight(req, res, flightIdMatch.id);
  }

  if (flightIdMatch.method === 'DELETE') {
    return flightController.deleteFlight(req, res, flightIdMatch.id);
  }

  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  return true;
};

module.exports = {
  handleFlightRoutes,
};
