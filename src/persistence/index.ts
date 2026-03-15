import fs from 'fs/promises';
import path from 'path';
import { Flight } from '../types';
import { logger } from '../utils';

const DATA_DIR = 'data';
const FLIGHTS_FILE = 'flights.json';
const DEFAULT_ID_COUNTER = 1;

/**
 * Serialized state structure for persistence
 */
interface PersistedState {
  flights: Flight[];
  idCounter: number;
  savedAt: string;
}

/**
 * PersistenceService handles saving and loading flight data to/from JSON file
 * Uses debounced writes to avoid excessive disk I/O during high activity
 */
export class PersistenceService {
  private filePath: string;
  private persistenceLogger = logger.child('Persistence');
  private writeTimeout: NodeJS.Timeout | null = null;
  private readonly WRITE_DEBOUNCE_MS = 100;
  private isLoading = false;

  constructor(dataDir: string = DATA_DIR) {
    this.filePath = path.join(process.cwd(), dataDir, FLIGHTS_FILE);
  }

  /**
   * Ensure data directory exists
   */
  private async ensureDataDir(): Promise<void> {
    const dir = path.dirname(this.filePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      this.persistenceLogger.info(`Created data directory: ${dir}`);
    }
  }

  /**
   * Load flights from JSON file
   * Returns empty state if file doesn't exist or is corrupt
   */
  async load(): Promise<{ flights: Flight[]; idCounter: number }> {
    this.isLoading = true;
    try {
      await this.ensureDataDir();

      try {
        const data = await fs.readFile(this.filePath, 'utf-8');
        const state: PersistedState = JSON.parse(data);

        // Validate loaded data
        if (!Array.isArray(state.flights)) {
          throw new Error('Invalid flights data');
        }

        this.persistenceLogger.info(
          `Loaded ${state.flights.length} flights from ${this.filePath}`
        );

        return {
          flights: state.flights,
          idCounter: state.idCounter || DEFAULT_ID_COUNTER,
        };
      } catch (error) {
        // File doesn't exist or is corrupt - return empty state
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          this.persistenceLogger.info('No existing data file found, starting fresh');
        } else {
          this.persistenceLogger.warn(`Could not load data: ${error}, starting fresh`);
        }
        return { flights: [], idCounter: DEFAULT_ID_COUNTER };
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Save flights to JSON file (debounced)
   * Multiple rapid calls will be batched into a single write
   */
  async save(flights: Map<string, Flight>, idCounter: number): Promise<void> {
    // Don't save while loading (avoid overwriting with empty data)
    if (this.isLoading) {
      return;
    }

    // Clear existing timeout to debounce
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }

    // Schedule new write
    this.writeTimeout = setTimeout(async () => {
      try {
        await this.performSave(flights, idCounter);
      } catch (error) {
        this.persistenceLogger.error('Failed to save data:', error);
      }
    }, this.WRITE_DEBOUNCE_MS);
  }

  /**
   * Perform actual file write
   */
  private async performSave(
    flights: Map<string, Flight>,
    idCounter: number
  ): Promise<void> {
    await this.ensureDataDir();

    const state: PersistedState = {
      flights: Array.from(flights.values()),
      idCounter,
      savedAt: new Date().toISOString(),
    };

    const tempFile = `${this.filePath}.tmp`;

    try {
      // Write to temp file first (atomic write pattern)
      await fs.writeFile(tempFile, JSON.stringify(state, null, 2), 'utf-8');

      // Rename temp file to actual file (atomic on most filesystems)
      await fs.rename(tempFile, this.filePath);

      this.persistenceLogger.debug(`Saved ${state.flights.length} flights to ${this.filePath}`);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Force immediate save (useful for shutdown)
   */
  async flush(flights: Map<string, Flight>, idCounter: number): Promise<void> {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
      this.writeTimeout = null;
    }
    await this.performSave(flights, idCounter);
  }

  /**
   * Get file path (for debugging)
   */
  getFilePath(): string {
    return this.filePath;
  }
}

// Export singleton instance
export const persistenceService = new PersistenceService();
