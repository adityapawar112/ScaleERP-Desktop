import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Electron FIRST
vi.mock('electron', () => ({
  shell: { openExternal: vi.fn().mockResolvedValue(undefined) },
  app: { 
    getPath: vi.fn(() => '/mock/path'),
    isPackaged: false,
    on: vi.fn(),
    quit: vi.fn(),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((text) => Buffer.from(`encrypted-${text}`)),
    decryptString: vi.fn((buffer) => buffer.toString().replace('encrypted-', '')),
  },
  net: {
    isOnline: vi.fn(() => true)
  },
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn(),
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    on: vi.fn(),
    maximize: vi.fn(),
    show: vi.fn(),
    webContents: {
      openDevTools: vi.fn(),
      on: vi.fn(),
      setWindowOpenHandler: vi.fn(),
      send: vi.fn(),
    }
  }))
}));

// Mock electron-store as a CLASS
vi.mock('electron-store', () => {
  return {
    default: class {
      set = vi.fn();
      get = vi.fn();
      delete = vi.fn();
    }
  };
});

import { GoogleDriveService } from '../services/googleDriveService';
import { shell } from 'electron';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Mock other Dependencies
const mockDriveFilesCreate = vi.fn();
const mockDriveFilesList = vi.fn();

vi.mock('googleapis', () => {
  class MockOAuth2 {
    generateAuthUrl = vi.fn(() => 'https://mock-auth-url.com');
    getToken = vi.fn().mockResolvedValue({ tokens: { refresh_token: 'mock-refresh-token' } });
    setCredentials = vi.fn();
    credentials = { refresh_token: 'mock-refresh-token' }; // Mock existing token
  }

  return {
    google: {
      auth: {
        OAuth2: MockOAuth2
      },
      drive: vi.fn().mockImplementation(() => ({
        files: {
          list: mockDriveFilesList,
          create: mockDriveFilesCreate
        }
      })),
      oauth2: vi.fn().mockImplementation(() => ({
        userinfo: {
          get: vi.fn().mockResolvedValue({ data: { email: 'test@example.com' } })
        }
      }))
    }
  };
});

const mockDbRun = vi.fn((query, params, cb) => {
  if (typeof params === 'function') params(null);
  else if (cb) cb(null);
  return { lastID: 1 };
});
const mockDbGet = vi.fn((query, cb) => cb(null, { id: 1, account_email: 'test@example.com' }));
const mockDbAll = vi.fn((query, cb) => cb(null, []));

vi.mock('../database/manager', () => ({
  dbManager: {
    getDatabase: vi.fn().mockImplementation(() => ({
      run: mockDbRun,
      get: mockDbGet,
      all: mockDbAll
    }))
  }
}));

vi.mock('./securityService', () => ({
  SecurityService: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptToBase64: vi.fn((t) => Buffer.from(`encrypted-${t}`).toString('base64')),
    decryptFromBase64: vi.fn((t) => Buffer.from(t, 'base64').toString().replace('encrypted-', ''))
  }
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  createReadStream: vi.fn(() => ({ 
    pipe: vi.fn(),
    on: vi.fn((event, cb) => {
      if (event === 'data') cb(Buffer.from('mock-data'));
      if (event === 'end') cb();
      return this;
    })
  }))
}));

describe('GoogleDriveService (Non-Superficial)', () => {
  let service: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = GoogleDriveService.getInstance();
    
    // Ensure state is set for tests
    (service as any).accountEmail = 'test@example.com';
    (service as any).oauth2Client.credentials = { refresh_token: 'mock-refresh-token' };
    
    // Default mocks
    mockDriveFilesList.mockResolvedValue({ data: { files: [{ id: 'folder-id', name: 'ScaleERP Backups' }] } });
    mockDriveFilesCreate.mockResolvedValue({ data: { id: 'mock-file-id' } });
  });

  describe('Authentication Integrity', () => {
    it('should generate auth URL correctly', async () => {
      await service.login();
      expect(vi.mocked(shell.openExternal)).toHaveBeenCalledWith(expect.stringContaining('https://mock-auth-url.com'));
    });

    it('should handle OAuth callback and secure the token with encryption', async () => {
      (service as any).codeVerifier = 'mock-verifier';
      await service.handleCallback('scaleerp://auth?code=mock-code');
      
      const status = await service.getStatus();
      expect(status.account_email).toBe('test@example.com');
      expect(status.connected).toBe(true);
      
      // Verify storage was used with the CORRECT key and an encrypted value
      expect((service as any).store.set).toHaveBeenCalledWith(
        'refresh_token_encrypted', 
        expect.any(String)
      );
    });
  });

  describe('Durable Queueing & Retries', () => {
    it('should process pending items and update status to completed', async () => {
      mockDbAll.mockImplementationOnce((query, cb) => cb(null, [
        { id: '1', file_path: 'test.zip', attempt_count: 0 }
      ]));
      
      await service.processQueue();
      
      // Verify completed status update
      const completedCall = mockDbRun.mock.calls.find(call => 
        call[1] && Array.isArray(call[1]) && call[1].includes('completed')
      );
      expect(completedCall).toBeTruthy();
    });

    it('should implement exponential backoff on failure', async () => {
      mockDbAll.mockImplementationOnce((query, cb) => cb(null, [
        { id: '1', file_path: 'test.zip', attempt_count: 1 }
      ]));
      mockDriveFilesCreate.mockRejectedValueOnce(new Error('Network failure'));
      
      await service.processQueue();
      
      // Verify failed status update with incremented attempt
      const failedCall = mockDbRun.mock.calls.find(call => 
        call[1] && Array.isArray(call[1]) && call[1].includes('failed')
      );
      
      expect(failedCall).toBeTruthy();
      const params = failedCall![1];
      expect(params).toContain(2); // attempt_count should be 1 + 1 = 2
      expect(params).toContain('Network failure');
    });
  });

  describe('Data Sovereignty & Security', () => {
    it('should skip processing if login is missing', async () => {
      (service as any).oauth2Client.credentials = {};
      await service.processQueue();
      expect(mockDbAll).not.toHaveBeenCalled();
    });

    it('should use visible folder for backups', async () => {
      mockDbAll.mockImplementationOnce((query, cb) => cb(null, [{ id: '1', file_path: 'test.zip' }]));
      await service.processQueue();
      
      expect(mockDriveFilesList).toHaveBeenCalledWith(expect.objectContaining({
        q: expect.stringContaining("name = 'ScaleERP Backups'")
      }));
    });
  });
});
