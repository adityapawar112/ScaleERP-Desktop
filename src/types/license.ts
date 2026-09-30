/**
 * License UI types for ScaleERP licensing frontend.
 * Mirrors and extends the backend LicenseStatus for UI consumption.
 */

export type LicenseState = 'valid' | 'grace' | 'expired' | 'invalid' | 'no-license';

export type LicenseWarningLevel = 'info' | 'urgent' | 'critical';

/**
 * Full license state consumed by UI components.
 */
export interface LicensePayload {
  license_id: string;
  customer_id: string;
  edition: 'Basic' | 'Pro' | 'Enterprise';
  license_type?: string;
  valid_from: string;
  valid_until: string;
  maintenance_until: string;
  device_fingerprint?: string | null;
  grace_until?: string | null;
  grace_mode?: 'view_only' | 'admin_only';
  features?: Record<string, boolean>;
}

export interface LicenseUIState {
  state: LicenseState;
  daysLeft: number | null;
  maintenanceDaysLeft: number | null;
  renewalDays: number | null;
  warningLevel: LicenseWarningLevel | null;
  warningMessage: string | null;
  deviceFingerprint: string | null;
  expiresAt: string | null;
  maintenanceUntil: string | null;
  renewalUntil: string | null;
  licenseId: string | null;
  licenseBlob: string | null;
  edition: string | null;
  customerId: string | null;
  payload: LicensePayload | null;
  isLoading: boolean;
  clockTamperDetected: boolean;
  tamperDetected: boolean;
  isDeveloperBypass: boolean;
}

/**
 * Props for LicenseBanner component.
 */
export interface LicenseBannerProps {
  state: LicenseState;
  daysLeft: number | null;
  warningLevel: LicenseWarningLevel | null;
  warningMessage: string | null;
  clockTamperDetected: boolean;
  tamperDetected: boolean;
}

/**
 * Props for LicenseGuard component.
 */
export interface LicenseGuardProps {
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  onActivateLicense?: () => void;
}

/**
 * Props for LicenseActivation component.
 */
export interface LicenseActivationProps {
  deviceFingerprint: string | null;
  onImportSuccess?: () => void;
  onImportError?: (error: string) => void;
}