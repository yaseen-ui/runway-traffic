import { IncomingMessage, ServerResponse } from 'http';
import { FlightService } from '../services/flightService';
import { FlightType } from '../types';

/**
 * FlightController handles HTTP requests for flight operations
 */
export class FlightController {
  private flightService: FlightService;

  constructor(flightService: FlightService) {
    this.flightService = flightService;
  }

  /**
   * Parse request body from incoming message
   */
  private parseRequestBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
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
          reject(new Error('Invalid JSON'));
        }
      });

      req.on('error', reject);
    });
  }

  /**
   * Send JSON response
   */
  private sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  /**
   * Create a new flight
   */
  async createFlight(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    try {
      const payload = await this.parseRequestBody(req);
      const errors = this.flightService.validateFlightPayload(payload);

      if (errors.length > 0) {
        this.sendJson(res, 400, { error: `Missing or invalid fields: ${errors.join(', ')}` });
        return true;
      }

      const p = payload as {
        flightNumber: string;
        airline: string;
        type: FlightType;
        emergency?: boolean;
      };

      const flight = this.flightService.createFlight({
        flightNumber: p.flightNumber,
        airline: p.airline,
        type: p.type,
        emergency: p.emergency,
      });

      if (flight.emergency) {
        console.log(`Emergency flight ${flight.flightNumber} requesting immediate ${flight.type}`);
      } else {
        console.log(`Flight ${flight.flightNumber} requesting ${flight.type}`);
      }

      this.sendJson(res, 201, flight);
      return true;
    } catch (error) {
      this.sendJson(res, 400, { error: 'Invalid JSON body' });
      return true;
    }
  }

  /**
   * Get all flights
   */
  getAllFlights(_req: IncomingMessage, res: ServerResponse): boolean {
    this.sendJson(res, 200, this.flightService.getAllFlights());
    return true;
  }

  /**
   * Get a single flight by ID
   */
  getFlightById(_req: IncomingMessage, res: ServerResponse, id: string): boolean {
    const flight = this.flightService.getFlightById(id);
    if (!flight) {
      this.sendJson(res, 404, { error: 'Flight not found' });
      return true;
    }

    this.sendJson(res, 200, flight);
    return true;
  }

  /**
   * Update a flight
   */
  async updateFlight(req: IncomingMessage, res: ServerResponse, id: string): Promise<boolean> {
    try {
      const payload = await this.parseRequestBody(req);
      const p = payload as Record<string, unknown>;

      if (p.type && p.type !== 'landing' && p.type !== 'takeoff') {
        this.sendJson(res, 400, { error: 'type must be landing or takeoff' });
        return true;
      }

      if (p.emergency !== undefined && typeof p.emergency !== 'boolean') {
        this.sendJson(res, 400, { error: 'emergency must be a boolean' });
        return true;
      }

      const updates: {
        flightNumber?: string;
        airline?: string;
        type?: FlightType;
        emergency?: boolean;
      } = {};

      if (p.flightNumber !== undefined) updates.flightNumber = String(p.flightNumber);
      if (p.airline !== undefined) updates.airline = String(p.airline);
      if (p.type !== undefined) updates.type = p.type as FlightType;
      if (p.emergency !== undefined) updates.emergency = Boolean(p.emergency);

      const result = this.flightService.updateFlight(id, updates);

      if (result.error === 'not_found') {
        this.sendJson(res, 404, { error: 'Flight not found' });
        return true;
      }

      if (result.error === 'not_waiting') {
        this.sendJson(res, 409, { error: 'Only waiting flights can be updated' });
        return true;
      }

      this.sendJson(res, 200, result.data);
      return true;
    } catch (error) {
      this.sendJson(res, 400, { error: 'Invalid JSON body' });
      return true;
    }
  }

  /**
   * Delete a flight
   */
  deleteFlight(_req: IncomingMessage, res: ServerResponse, id: string): boolean {
    const result = this.flightService.deleteFlight(id);

    if (result.error === 'not_found') {
      this.sendJson(res, 404, { error: 'Flight not found' });
      return true;
    }

    if (result.error === 'not_waiting') {
      this.sendJson(res, 409, { error: 'Only waiting flights can be deleted' });
      return true;
    }

    this.sendJson(res, 200, { message: 'Flight deleted' });
    return true;
  }

  /**
   * Get the current flight queue
   */
  getQueue(_req: IncomingMessage, res: ServerResponse): boolean {
    this.sendJson(res, 200, this.flightService.getQueue());
    return true;
  }
}
