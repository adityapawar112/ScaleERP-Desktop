import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLicense } from '../context/LicenseContext';
import type { LicenseGuardProps } from '../types/license';

/**
 * LicenseGuard wraps application content and controls access based on license state.
 * - `valid` or `grace`: renders children normally
 * - `expired` / `invalid`: renders a blocking overlay with reactivation option
 * - `no-license`: renders the LicenseActivation page
 * - loading: renders a spinner or custom fallback
 */
const LicenseGuard: React.FC<LicenseGuardProps> = ({
  children,
  loadingFallback,
  onActivateLicense,
}) => {
  const { t } = useTranslation();
  const { licenseState, isElectronAvailable } = useLicense();
  const { state, isLoading, isDeveloperBypass } = licenseState;

  // Developer Bypass - allow all access
  if (isDeveloperBypass) {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f5f7fa',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e5e7eb',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ fontSize: '14px', color: '#666' }}>{t('licensing.checking', 'Checking license...')}</p>
        </div>
      </div>
    );
  }

  // No Electron API — allow access but log warning
  if (!isElectronAvailable) {
    console.warn('[LicenseGuard] Electron API not available; allowing access (dev mode)');
    return <>{children}</>;
  }

  // Valid or grace — allow full access
  if (state === 'valid' || state === 'grace') {
    return <>{children}</>;
  }

  // Expired or invalid — show blocking screen
  if (state === 'expired' || state === 'invalid') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9999,
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '440px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <span style={{ fontSize: '28px' }}>🔒</span>
          </div>
          <h2
            style={{
              margin: '0 0 8px',
              fontSize: '22px',
              fontWeight: 600,
              color: '#1a1a1a',
            }}
          >
            {t('licensing.license', 'License')} {state === 'expired' ? t('licenseBanner.expired', 'Expired') : t('licenseBanner.invalid', 'Invalid')}
          </h2>
          <p
            style={{
              margin: '0 0 24px',
              fontSize: '14px',
              color: '#666',
              lineHeight: 1.5,
            }}
          >
            {state === 'expired'
              ? t('licensing.expiredDesc', 'Your ScaleERP license has expired. Please import a valid license to continue.')
              : t('licensing.invalidDesc', 'Invalid license detected. Please contact support or import a valid license.')}
          </p>
          <button
            onClick={() => onActivateLicense?.()}
            style={{
              padding: '12px 32px',
              fontSize: '15px',
              fontWeight: 600,
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            {t('licensing.activate', 'Activate License')}
          </button>
        </div>
      </div>
    );
  }

  // No license — render activation screen
  if (state === 'no-license') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f5f7fa',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '440px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <span style={{ fontSize: '28px' }}>🔑</span>
          </div>
          <h2
            style={{
              margin: '0 0 8px',
              fontSize: '22px',
              fontWeight: 600,
              color: '#1a1a1a',
            }}
          >
            {t('licensing.noLicenseTitle', 'No License Found')}
          </h2>
          <p
            style={{
              margin: '0 0 24px',
              fontSize: '14px',
              color: '#666',
              lineHeight: 1.5,
            }}
          >
            {t('licensing.noLicenseDesc', 'Activate ScaleERP by importing your license file or pasting your license key.')}
          </p>
          <button
            onClick={() => onActivateLicense?.()}
            style={{
              padding: '12px 32px',
              fontSize: '15px',
              fontWeight: 600,
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            {t('licensing.importLicense', 'Import License')}
          </button>
        </div>
      </div>
    );
  }

  // Fallback — default to showing children
  return <>{children}</>;
};

export default LicenseGuard;