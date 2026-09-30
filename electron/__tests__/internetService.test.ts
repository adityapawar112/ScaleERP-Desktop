import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InternetService } from '../services/internetService';
import { net } from 'electron';

// Mock Electron
vi.mock('electron', () => ({
  net: {
    isOnline: vi.fn(() => true)
  },
  app: {
    getPath: vi.fn(() => '/mock/path'),
    isPackaged: false,
  }
}));

describe('InternetService', () => {
  let service: InternetService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    service = InternetService.getInstance();
    // Force initial state to true for predictable tests
    vi.mocked(net.isOnline).mockReturnValue(true);
    (service as any).isOnline = true;
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
  });

  it('should report correct online status', () => {
    vi.mocked(net.isOnline).mockReturnValue(true);
    expect(service.getOnlineStatus()).toBe(true);

    vi.mocked(net.isOnline).mockReturnValue(false);
    expect(service.getOnlineStatus()).toBe(false);
  });

  it('should emit events when status changes', () => {
    // Start as online
    vi.mocked(net.isOnline).mockReturnValue(true);
    (service as any).isOnline = true;
    
    const onlineSpy = vi.fn();
    const offlineSpy = vi.fn();
    
    service.on('online', onlineSpy);
    service.on('offline', offlineSpy);

    // Change to offline
    vi.mocked(net.isOnline).mockReturnValue(false);
    (service as any).checkConnectivity(); // Call directly to avoid timer flakiness in tests
    
    expect(offlineSpy).toHaveBeenCalled();
    expect(onlineSpy).not.toHaveBeenCalled();

    // Change back to online
    vi.mocked(net.isOnline).mockReturnValue(true);
    (service as any).checkConnectivity();
    
    expect(onlineSpy).toHaveBeenCalled();
  });
});
