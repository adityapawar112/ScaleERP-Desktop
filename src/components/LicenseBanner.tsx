import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLicense } from '../context/LicenseContext';

/**
 * LicenseBanner displays warning/expiration notices based on license state.
 * Shows nothing when license is valid and well within its term.
 */
const LicenseBanner: React.FC = () => {
  const { t } = useTranslation();
  const { licenseState, clockTamperDetected } = useLicense();
  const { state, daysLeft, warningLevel, warningMessage } = licenseState;
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when warning changes
  useEffect(() => {
    setDismissed(false);
  }, [warningLevel, warningMessage, state]);

  // Nothing to show for valid licenses without warnings
  if (state === 'valid' && !warningLevel && !clockTamperDetected) {
    return null;
  }

  // Grace mode: show a subtle banner
  if (state === 'grace') {
    return (
      <div
        style={{
          padding: '10px 16px',
          backgroundColor: '#fefce8',
          borderLeft: '4px solid #f59e0b',
          fontSize: '13px',
          color: '#854d0e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>
          <strong>{t('licenseBanner.restrictedMode', 'Restricted Mode:')}</strong>{' '}
          {licenseState.renewalDays !== null && licenseState.renewalDays < 0
            ? `${t('licenseBanner.termEnded', 'License term ended')} ${Math.abs(licenseState.renewalDays)} ${t('licensing.daysLeft', 'days ago. System lockout is imminent.')}`
            : licenseState.maintenanceDaysLeft !== null && licenseState.maintenanceDaysLeft < 0
              ? `${t('licenseBanner.maintenanceExpired', 'Maintenance expired')} ${Math.abs(licenseState.maintenanceDaysLeft)} ${t('licensing.daysLeft', 'days ago. Write access is restricted.')}`
              : t('licenseBanner.restrictedDesc', 'Your license is in restricted mode. Please contact support.')}
        </span>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#854d0e',
            padding: '0 4px',
          }}
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          ×
        </button>
      </div>
    );
  }

  // Expired or invalid: full-blocking banner
  if (state === 'expired' || state === 'invalid') {
    return (
      <div
        style={{
          padding: '10px 16px',
          backgroundColor: '#fef2f2',
          borderLeft: '4px solid #ef4444',
          fontSize: '13px',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>
          <strong>{state === 'expired' ? t('licenseBanner.expired', 'License Expired') : t('licenseBanner.invalid', 'License Invalid')}:</strong>{' '}
          {clockTamperDetected
            ? t('licenseBanner.clockTamper', 'Clock tampering detected. Please contact support.')
            : t('licenseBanner.restorePrompt', 'Import a valid license to restore full functionality.')}
        </span>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#dc2626',
            padding: '0 4px',
          }}
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          ×
        </button>
      </div>
    );
  }

  // Clock tamper warning (always show regardless of state)
  if (clockTamperDetected) {
    return (
      <div
        style={{
          padding: '10px 16px',
          backgroundColor: '#fef2f2',
          borderLeft: '4px solid #ef4444',
          fontSize: '13px',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>
          <strong>{t('licenseBanner.securityWarning', 'Security Warning:')}</strong> {t('licenseBanner.clockSuspended', 'System clock manipulation detected. License validation is suspended.')}
        </span>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#dc2626',
            padding: '0 4px',
          }}
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          ×
        </button>
      </div>
    );
  }

  // Warning-level banners for valid licenses approaching expiry
  if (warningLevel === 'critical') {
    return (
      <div
        style={{
          padding: '10px 16px',
          backgroundColor: '#fef2f2',
          borderLeft: '4px solid #ef4444',
          fontSize: '13px',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>
          🚨 <strong>{t('licenseBanner.critical', 'Critical:')}</strong> {warningMessage}
        </span>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#dc2626',
            padding: '0 4px',
          }}
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          ×
        </button>
      </div>
    );
  }

  if (warningLevel === 'urgent') {
    return (
      <div
        style={{
          padding: '10px 16px',
          backgroundColor: '#fff7ed',
          borderLeft: '4px solid #f97316',
          fontSize: '13px',
          color: '#c2410c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>
          ⚠️ <strong>{t('licenseBanner.urgent', 'Urgent:')}</strong> {warningMessage}
        </span>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#c2410c',
            padding: '0 4px',
          }}
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          ×
        </button>
      </div>
    );
  }

  if (warningLevel === 'info') {
    return (
      <div
        style={{
          padding: '8px 16px',
          backgroundColor: '#eff6ff',
          borderLeft: '4px solid #3b82f6',
          fontSize: '13px',
          color: '#1d4ed8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>
          ℹ️ {warningMessage}
        </span>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#1d4ed8',
            padding: '0 4px',
          }}
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          ×
        </button>
      </div>
    );
  }

  return null;
};

export default LicenseBanner;