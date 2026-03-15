import { IncomingMessage, ServerResponse } from 'http';
import { RunwayService } from '../services/runwayService';

/**
 * RunwayController handles HTTP requests for runway operations
 */
export class RunwayController {
  private runwayService: RunwayService;

  constructor(runwayService: RunwayService) {
    this.runwayService = runwayService;
  }

  /**
   * Send JSON response
   */
  private sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  /**
   * Get all runways
   */
  getRunways(_req: IncomingMessage, res: ServerResponse): boolean {
    this.sendJson(res, 200, this.runwayService.getRunways());
    return true;
  }

  /**
   * Disable a runway for maintenance
   */
  disableRunway(_req: IncomingMessage, res: ServerResponse, id: string): boolean {
    const result = this.runwayService.disableRunway(id);

    if (result.error === 'not_found') {
      this.sendJson(res, 404, { error: 'Runway not found' });
      return true;
    }

    console.log(`Runway ${result.data!.id} disabled for maintenance`);
    this.sendJson(res, 200, result.data);
    return true;
  }

  /**
   * Enable a runway after maintenance
   */
  enableRunway(_req: IncomingMessage, res: ServerResponse, id: string): boolean {
    const result = this.runwayService.enableRunway(id);

    if (result.error === 'not_found') {
      this.sendJson(res, 404, { error: 'Runway not found' });
      return true;
    }

    console.log(`Runway ${result.data!.id} enabled again`);
    this.sendJson(res, 200, result.data);
    return true;
  }
}
