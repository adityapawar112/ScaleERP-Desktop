import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { LicenseState, LicenseWarningLevel, LicenseUIState } from '../types/license';

interface LicenseContextType {
  licenseState: LicenseUIState;
  refreshLicense: () => Promise<void>;
  importLicense: (blob: string) => Promise<boolean>;
  clockTamperDetected: boolean;
  isElectronAvailable: boolean;
  setDeveloperBypass: (enabled: boolean) => void;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export const useLicense = (): LicenseContextType => {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseContextProvider');
  }
  return context;
};

interface LicenseContextProviderProps {
  children: ReactNode;
}

/**
 * Determine the warning level based on the current state of both maintenance and renewal.
 * Renewal warnings generally have higher priority as they lead to a Hard Lock.
 */
function getWarningLevel(
  maintenanceDays: number | null,
  renewalDays: number | null
): { level: LicenseWarningLevel | null; message: string | null } {
  // 1. Renewal Expiry takes top priority (Leading to Hard Lock)
  if (renewalDays !== null) {
    if (renewalDays < -7) {
      return {
        level: 'critical',
        message: 'License term has EXPIRED. System is now locked. Please renew to continue.'
      };
    }
    if (renewalDays < 0 && renewalDays >= -7) {
      const pastDays = Math.abs(renewalDays);
      const remainingGrace = 7 - pastDays;
      return {
        level: 'critical',
        message: `License term has EXPIRED (${pastDays} day${pastDays === 1 ? '' : 's'} ago). View-only grace period ends in ${remainingGrace} day${remainingGrace === 1 ? '' : 's'}.`
      };
    }
    if (renewalDays >= 0 && renewalDays <= 7) {
      return {
        level: 'critical',
        message: `License term expires in ${renewalDays} day${renewalDays === 1 ? '' : 's'}. Renew immediately to avoid system lockout.`
      };
    }
  }

  // 2. Maintenance Expiry (Leading to Soft Lock)
  if (maintenanceDays !== null) {
    if (maintenanceDays < 0 && maintenanceDays >= -7) {
      const pastDays = Math.abs(maintenanceDays);
      const remainingGrace = 7 - pastDays;
      return { 
        level: 'urgent', 
        message: `Maintenance has EXPIRED (${pastDays} day${pastDays === 1 ? '' : 's'} ago). View-only mode starts in ${remainingGrace} day${remainingGrace === 1 ? '' : 's'}.` 
      };
    }
    if (maintenanceDays >= 0 && maintenanceDays <= 14) {
      const level = maintenanceDays <= 3 ? 'critical' : 'urgent';
      return {
        level,
        message: `License maintenance expires in ${maintenanceDays} day${maintenanceDays === 1 ? '' : 's'}. Renew to keep write access.`
      };
    }
    if (maintenanceDays >= 0 && maintenanceDays <= 30) {
      return {
        level: 'info',
        message: `License maintenance expires in ${maintenanceDays} day${maintenanceDays === 1 ? '' : 's'}.`
      };
    }
  }

  return { level: null, message: null };
}

/**
 * Map backend license state string to UI state.
 */
function mapLicenseState(state: string | undefined): LicenseState {
  if (!state) return 'no-license';
  const known: Record<string, LicenseState> = {
    valid: 'valid',
    grace: 'grace',
    expired: 'expired',
    invalid: 'invalid',
  };
  return known[state] || 'no-license';
}

export const LicenseContextProvider: React.FC<LicenseContextProviderProps> = ({ children }) => {
  const isElectronAvailable = typeof window !== 'undefined' && !!window.electronAPI;

  const [licenseState, setLicenseState] = useState<LicenseUIState>({
    state: 'no-license',
    daysLeft: null,
    maintenanceDaysLeft: null,
    renewalDays: null,
    warningLevel: null,
    warningMessage: null,
    deviceFingerprint: null,
    expiresAt: null,
    maintenanceUntil: null,
    renewalUntil: null,
    licenseId: null,
    licenseBlob: null,
    edition: null,
    customerId: null,
    payload: null,
    isLoading: true,
    clockTamperDetected: false,
    tamperDetected: false,
    isDeveloperBypass: false,
  });

  const fetchStatus = useCallback(async () => {
    if (!isElectronAvailable) {
      setLicenseState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const status = await window.electronAPI!.licensing.getStatus();
      const currentState = mapLicenseState(status?.state);
      
      // Calculate maintenance days left from maintenance_until
      let maintenanceDaysLeft: number | null = null;
      if (status?.payload?.maintenance_until) {
        const now = new Date();
        const maintenanceUntil = new Date(status.payload.maintenance_until);
        maintenanceDaysLeft = Math.floor(
          (maintenanceUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      // Calculate renewal days left from valid_from (activation date) + 365 days
      let renewalDays: number | null = null;
      let renewalUntilDate: string | null = null;
      if (status?.payload?.valid_from) {
        const now = new Date();
        const validFrom = new Date(status.payload.valid_from);
        const renewalDate = new Date(validFrom.getTime() + 365 * 24 * 60 * 60 * 1000);
        renewalUntilDate = renewalDate.toISOString();
        renewalDays = Math.floor(
          (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        console.log('[LicenseContext] Renewal check:', { 
          validFrom: status.payload.valid_from, 
          renewalDate: renewalUntilDate, 
          daysLeft: renewalDays 
        });
      }

      const { level, message } = getWarningLevel(maintenanceDaysLeft, renewalDays);

      // Get the license blob from the database (stored in license_blob field)
      let licenseBlob: string | null = null;
      if (window.electronAPI?.licensing?.getBlob) {
        try {
          const blobResult = await window.electronAPI.licensing.getBlob();
          licenseBlob = blobResult?.blob ?? null;
        } catch {
          // Blob fetch failed, continue without it
        }
      }

      setLicenseState(prev => ({
        state: currentState,
        daysLeft: maintenanceDaysLeft, // Maintain legacy field for now
        maintenanceDaysLeft,
        renewalDays,
        warningLevel: level,
        warningMessage: message,
        deviceFingerprint: status?.deviceFingerprint ?? null,
        expiresAt: status?.payload?.valid_until ?? null,
        maintenanceUntil: status?.payload?.maintenance_until ?? null,
        renewalUntil: renewalUntilDate,
        licenseId: status?.payload?.license_id ?? null,
        licenseBlob,
        edition: status?.payload?.edition ?? null,
        customerId: status?.payload?.customer_id ?? null,
        payload: status?.payload ?? null,
        isLoading: false,
        clockTamperDetected: status?.tamperDetected ?? false,
        tamperDetected: status?.tamperDetected ?? false,
        isDeveloperBypass: prev.isDeveloperBypass,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch license status';
      console.warn('[LicenseContext] Error fetching status:', message);
      setLicenseState(prev => ({
        ...prev,
        state: 'no-license',
        daysLeft: null,
        maintenanceDaysLeft: null,
        warningLevel: null,
        warningMessage: null,
        licenseId: null,
        edition: null,
        customerId: null,
        payload: null,
        isLoading: false,
      }));
    }
  }, [isElectronAvailable]);

  const importLicense = useCallback(async (blob: string): Promise<boolean> => {
    if (!isElectronAvailable) {
      console.error('[LicenseContext] Electron API not available for import');
      return false;
    }

    try {
      const result = await window.electronAPI!.licensing.importLicense(blob);
      // Accept both 'valid' and 'grace' states as successful imports
      if (result && (result.state === 'valid' || result.state === 'grace')) {
        await fetchStatus();
        return true;
      }
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import license';
      console.error('[LicenseContext] Import failed:', message);
      return false;
    }
  }, [isElectronAvailable, fetchStatus]);

  // Initial fetch on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Subscribe to licensing events from preload
  useEffect(() => {
    if (!isElectronAvailable || !window.electronAPI?.licensingEvents) {
      return;
    }

    const cleanups: Array<() => void> = [];

    const cleanupWarning = window.electronAPI.licensingEvents.onWarning((data) => {
      // Data might contain maintenanceDaysLeft and renewalDays if updated in main, 
      // but for now we fall back to current context state
      const { level, message } = getWarningLevel(licenseState.maintenanceDaysLeft, licenseState.renewalDays);
      setLicenseState(prev => ({
        ...prev,
        warningLevel: level || prev.warningLevel,
        warningMessage: message || prev.warningMessage,
      }));
    });
    cleanups.push(cleanupWarning);

    const cleanupExpired = window.electronAPI.licensingEvents.onExpired((_data) => {
      setLicenseState(prev => ({
        ...prev,
        state: 'expired',
        warningLevel: 'critical',
        warningMessage: 'License has expired. Import a valid license to continue.',
      }));
    });
    cleanups.push(cleanupExpired);

    const cleanupTamper = window.electronAPI.licensingEvents.onClockTamperDetected((_data) => {
      setLicenseState(prev => ({
        ...prev,
        clockTamperDetected: true,
        tamperDetected: true,
        warningLevel: 'critical',
        warningMessage: 'System clock manipulation detected. License validation suspended.',
      }));
    });
    cleanups.push(cleanupTamper);

    const cleanupMaintenance = window.electronAPI.licensingEvents.onMaintenanceExpired((_data) => {
      setLicenseState(prev => ({
        ...prev,
        warningLevel: 'urgent',
        warningMessage: 'Maintenance period has expired. Core functionality available, updates require renewal.',
      }));
    });
    cleanups.push(cleanupMaintenance);

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [isElectronAvailable]);

  const refreshLicense = useCallback(async () => {
    setLicenseState(prev => ({ ...prev, isLoading: true }));
    await fetchStatus();
  }, [fetchStatus]);

  const setDeveloperBypass = useCallback((enabled: boolean) => {
    setLicenseState(prev => ({ ...prev, isDeveloperBypass: enabled }));
  }, []);

  return (
    <LicenseContext.Provider
      value={{
        licenseState,
        refreshLicense,
        importLicense,
        setDeveloperBypass,
        clockTamperDetected: licenseState.clockTamperDetected,
        isElectronAvailable,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
};