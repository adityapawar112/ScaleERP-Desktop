import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLicense } from '../context/LicenseContext';
import LanguageSwitcher from './LanguageSwitcher';
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

  // Seamlessly transition to LicenseActivation on fresh startup with no license
  useEffect(() => {
    if (state === 'no-license' && onActivateLicense) {
      onActivateLicense();
    }
  }, [state, onActivateLicense]);

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
        className="position-relative d-flex align-items-center justify-content-center"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#f5f7fb',
          zIndex: 9999,
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        <div className="position-absolute top-0 end-0 p-3">
          <LanguageSwitcher />
        </div>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '460px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
            <img
              src="./brand/logomark-icon-green.png"
              alt="ScaleERP"
              style={{ width: 36, height: 36, objectFit: 'contain' }}
            />
            <span
              style={{
                fontFamily: "'Stack Sans Notch', 'Outfit', sans-serif",
                fontWeight: 800,
                fontSize: '24px',
                color: '#171717',
                letterSpacing: '-0.02em',
              }}
            >
              ScaleERP
            </span>
          </div>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <span style={{ fontSize: '24px' }}>🔒</span>
          </div>
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: '20px',
              fontWeight: 700,
              color: '#171717',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {t('licensing.license', 'License')} {state === 'expired' ? t('licenseBanner.expired', 'Expired') : t('licenseBanner.invalid', 'Invalid')}
          </h3>
          <p
            style={{
              margin: '0 0 24px',
              fontSize: '14px',
              color: '#64748b',
              lineHeight: 1.5,
            }}
          >
            {state === 'expired'
              ? t('licensing.expiredDesc', 'Your ScaleERP license has expired. Please import or enter a valid license key to continue.')
              : t('licensing.invalidDesc', 'Invalid license detected. Please enter a valid license key or contact developer support.')}
          </p>
          <button
            onClick={() => onActivateLicense?.()}
            style={{
              padding: '12px 32px',
              fontSize: '14px',
              fontWeight: 700,
              backgroundColor: '#00E600',
              color: '#171717',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              width: '100%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
            }}
          >
            {t('licensing.activate', 'Activate License')}
          </button>
        </div>
      </div>
    );
  }

  // No license — fallback if router hasn't updated yet
  if (state === 'no-license') {
    return (
      <div
        className="position-relative d-flex align-items-center justify-content-center"
        style={{
          minHeight: '100vh',
          backgroundColor: '#f5f7fb',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        <div className="position-absolute top-0 end-0 p-3">
          <LanguageSwitcher />
        </div>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '440px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
            <img
              src="./brand/logomark-icon-green.png"
              alt="ScaleERP"
              style={{ width: 36, height: 36, objectFit: 'contain' }}
            />
            <span
              style={{
                fontFamily: "'Stack Sans Notch', 'Outfit', sans-serif",
                fontWeight: 800,
                fontSize: '24px',
                color: '#171717',
                letterSpacing: '-0.02em',
              }}
            >
              ScaleERP
            </span>
          </div>
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: '20px',
              fontWeight: 700,
              color: '#171717',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {t('setup.licenseTitle', 'Activate ScaleERP')}
          </h3>
          <p
            style={{
              margin: '0 0 24px',
              fontSize: '14px',
              color: '#64748b',
              lineHeight: 1.5,
            }}
          >
            {t('setup.licenseSubtitle', 'Enter your store details and license key to begin.')}
          </p>
          <button
            onClick={() => onActivateLicense?.()}
            style={{
              padding: '12px 32px',
              fontSize: '14px',
              fontWeight: 700,
              backgroundColor: '#00E600',
              color: '#171717',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            {t('setup.activateBtn', 'Activate License')}
          </button>
        </div>
      </div>
    );
  }

  // Fallback — default to showing children
  return <>{children}</>;
};

export default LicenseGuard;