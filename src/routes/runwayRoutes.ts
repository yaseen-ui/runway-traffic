import { IncomingMessage, ServerResponse } from 'http';
import { RunwayController } from '../controllers/runwayController';

/**
 * Route matcher for runway action routes
 */
const matchRunwayActionRoute = (
  method: string,
  url: string
): { method: string; id: string; action: string } | null => {
  const match = url.match(/^\/runways\/([^\/]+)\/(enable|disable)$/);
  if (!match) {
    return null;
  }

  return {
    method,
    id: match[1],
    action: match[2],
  };
};

/**
 * Create runway routes handler
 */
export const createRunwayRoutes = (controller: RunwayController) => {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    const { method, url } = req;

    if (!url) {
      return false;
    }

    // GET /runways - Get all runways
    if (method === 'GET' && url === '/runways') {
      return controller.getRunways(req, res);
    }

    // Match /runways/:id/(enable|disable) routes
    const runwayMatch = matchRunwayActionRoute(method || '', url);
    if (!runwayMatch) {
      return false;
    }

    // Only POST is allowed for enable/disable actions
    if (runwayMatch.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return true;
    }

    // POST /runways/:id/disable
    if (runwayMatch.action === 'disable') {
      return controller.disableRunway(req, res, runwayMatch.id);
    }

    // POST /runways/:id/enable
    return controller.enableRunway(req, res, runwayMatch.id);
  };
};
