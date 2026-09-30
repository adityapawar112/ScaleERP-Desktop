// electron/services/logger.ts
import { app } from 'electron';
import log from 'electron-log';
import * as path from 'path';
import * as fs from 'fs';

/**
 * LogLevel determines the verbosity in the console.
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SECURITY = 4,
}

const MAX_LOGS_PER_SECOND = 100;

/**
 * Secure Logger utility for the Main process.
 * Handles persistent file logging, environment-aware redaction, 
 * and flood protection (loop prevention).
 */
class Logger {
  private isDev: boolean;
  private logCount: number = 0;
  private lastResetTime: number = Date.now();
  private isFlooded: boolean = false;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development' || (app && !app.isPackaged);
    
    // Configure electron-log
    log.transports.file.level = 'info';
    log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB limit
    
    // Custom rotation to keep up to 5 archive files
    // electron-log v5 uses archiveLogFn.
    log.transports.file.archiveLogFn = (oldLogFile) => {
      const file = oldLogFile.path;
      const date = new Date();
      const timestamp = date.toISOString().replace(/[:.]/g, '-');
      const newPath = file.replace('.log', `.${timestamp}.log`);

      try {
        fs.renameSync(file, newPath);
        
        // Cleanup old archives (keep only last 5)
        const dir = path.dirname(file);
        const ext = path.extname(file);
        const base = path.basename(file, ext);
        
        const files = fs.readdirSync(dir)
          .filter(f => f.startsWith(base) && f.endsWith(ext) && f !== path.basename(file))
          .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
          .sort((a, b) => b.time - a.time);
        
        if (files.length > 5) {
          files.slice(5).forEach(f => {
            try {
              fs.unlinkSync(path.join(dir, f.name));
            } catch (e) {
              // Ignore deletion errors
            }
          });
        }
      } catch (e) {
        // Fallback or ignore if rename fails
      }
    };

    // Set format
    log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
    log.transports.console.format = '[{level}] {text}';
    
    if (this.isDev) {
      log.transports.console.level = 'debug';
    } else {
      log.transports.console.level = 'info';
    }
  }

  /**
   * Prevents runaway logging loops from crashing the system.
   */
  private checkFlood(): boolean {
    const now = Date.now();
    if (now - this.lastResetTime >= 1000) {
      this.logCount = 0;
      this.lastResetTime = now;
      if (this.isFlooded) {
        this.isFlooded = false;
        log.warn('[LOGGER] Flood protection disabled: normal logging resumed.');
      }
    }

    this.logCount++;

    if (!this.isFlooded && this.logCount > MAX_LOGS_PER_SECOND) {
      this.isFlooded = true;
      log.error('[LOGGER] FLOOD DETECTED: Muting logs for the next second to prevent system crash.');
      return false;
    }

    return !this.isFlooded;
  }

  info(message: string, ...args: any[]): void {
    if (!this.checkFlood()) return;
    log.info(message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    if (!this.checkFlood()) return;
    log.warn(message, ...args);
  }

  error(message: string, ...args: any[]): void {
    if (!this.checkFlood()) return;
    log.error(message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (!this.checkFlood()) return;
    if (this.isDev) {
      log.debug(message, ...args);
    }
  }

  /**
   * Security-sensitive logs (Tamper details, Fingerprints, IDs).
   * Automatically redacts data objects in production file logs.
   */
  security(message: string, data?: any): void {
    if (!this.checkFlood()) return;

    if (this.isDev) {
      log.warn(`[SECURITY] ${message}`, data || '');
    } else {
      // Production: Log ONLY the message to the file, redact the data object
      log.warn(`[SECURITY] ${message} [DATA REDACTED FOR PRODUCTION]`);
    }
  }
}

export const logger = new Logger();
