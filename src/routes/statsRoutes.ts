import { IncomingMessage, ServerResponse } from 'http';
import { StatsController } from '../controllers/statsController';

/**
 * Create stats routes handler
 */
export const createStatsRoutes = (controller: StatsController) => {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    const { method, url } = req;

    if (!url) {
      return false;
    }

    // GET /stats - Get system statistics
    if (method === 'GET' && url === '/stats') {
      return controller.getStats(req, res);
    }

    return false;
  };
};
