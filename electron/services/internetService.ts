import { net } from 'electron';
import { EventEmitter } from 'events';
import { logger } from './logger';

/**
 * InternetService
 * Monitors system connectivity using Electron's net.isOnline().
 * Acts as a hint provider for background services (like cloud backup).
 */
export class InternetService extends EventEmitter {
  private static instance: InternetService;
  private isOnline: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.isOnline = net.isOnline();
    this.startMonitoring();
  }

  public static getInstance(): InternetService {
    if (!InternetService.instance) {
      InternetService.instance = new InternetService();
    }
    return InternetService.instance;
  }

  private startMonitoring(): void {
    // Check every 30 seconds for connectivity changes
    // Note: This is just a hint. The real source of truth is the actual upload attempt.
    this.checkInterval = setInterval(() => {
      this.checkConnectivity();
    }, 30000);

    // Initial check
    this.checkConnectivity();
  }

  private checkConnectivity(): void {
    const currentlyOnline = net.isOnline();
    
    if (currentlyOnline !== this.isOnline) {
      this.isOnline = currentlyOnline;
      logger.info(`System connectivity changed: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
      
      if (this.isOnline) {
        this.emit('online');
      } else {
        this.emit('offline');
      }
    }
  }

  public getOnlineStatus(): boolean {
    // Re-verify immediately when asked
    this.isOnline = net.isOnline();
    return this.isOnline;
  }

  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const internetService = InternetService.getInstance();
