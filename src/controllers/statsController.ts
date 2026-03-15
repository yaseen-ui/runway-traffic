import { IncomingMessage, ServerResponse } from 'http';
import { StatsService } from '../services/statsService';

/**
 * StatsController handles HTTP requests for statistics
 */
export class StatsController {
  private statsService: StatsService;

  constructor(statsService: StatsService) {
    this.statsService = statsService;
  }

  /**
   * Send JSON response
   */
  private sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  /**
   * Get system statistics
   */
  getStats(_req: IncomingMessage, res: ServerResponse): boolean {
    this.sendJson(res, 200, this.statsService.getStats());
    return true;
  }
}
