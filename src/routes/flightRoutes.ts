import { IncomingMessage, ServerResponse } from 'http';
import { FlightController } from '../controllers/flightController';

/**
 * Route matcher for flight ID routes
 */
const matchFlightIdRoute = (
  method: string,
  url: string
): { method: string; id: string } | null => {
  const match = url.match(/^\/flights\/([^\/]+)$/);
  if (!match) {
    return null;
  }

  return {
    method,
    id: match[1],
  };
};

/**
 * Create flight routes handler
 */
export const createFlightRoutes = (controller: FlightController) => {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    const { method, url } = req;

    if (!url) {
      return false;
    }

    // POST /flights - Create flight
    if (method === 'POST' && url === '/flights') {
      // Note: controller.createFlight returns a Promise
      controller.createFlight(req, res);
      return true;
    }

    // GET /flights - Get all flights
    if (method === 'GET' && url === '/flights') {
      return controller.getAllFlights(req, res);
    }

    // GET /queue - Get flight queue
    if (method === 'GET' && url === '/queue') {
      return controller.getQueue(req, res);
    }

    // Match /flights/:id routes
    const flightIdMatch = matchFlightIdRoute(method || '', url);
    if (!flightIdMatch) {
      return false;
    }

    // GET /flights/:id - Get single flight
    if (flightIdMatch.method === 'GET') {
      return controller.getFlightById(req, res, flightIdMatch.id);
    }

    // PUT /flights/:id - Update flight
    if (flightIdMatch.method === 'PUT') {
      controller.updateFlight(req, res, flightIdMatch.id);
      return true;
    }

    // DELETE /flights/:id - Delete flight
    if (flightIdMatch.method === 'DELETE') {
      return controller.deleteFlight(req, res, flightIdMatch.id);
    }

    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return true;
  };
};
