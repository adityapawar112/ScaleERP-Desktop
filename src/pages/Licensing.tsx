// src/pages/Licensing.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLicense } from '../context/LicenseContext';
import { useTranslation } from 'react-i18next';
import { Alert, Container, Row, Col } from 'react-bootstrap';

const Licensing: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { licenseState, refreshLicense } = useLicense();
  const [showKey, setShowKey] = useState(false);
  const [eventHistory, setEventHistory] = useState<any[]>([]);
  const [heartbeats, setHeartbeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (window.electronAPI?.licensing) {
        const [events, hb] = await Promise.all([
          window.electronAPI.licensing.getEventHistory(),
          window.electronAPI.licensing.getHeartbeats(),
        ]);
        setEventHistory(events.events || []);
        setHeartbeats(hb.heartbeats || []);
      }
    } catch (err) {
      console.error('Failed to fetch license data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maskLicenseKey = (key: string | null | undefined): string => {
    if (!key) return '—';
    if (key.length <= 8) return '****';
    return `****-****-****-${key.slice(-4)}`;
  };

  const formatDaysRemaining = (daysLeft: number | null): string => {
    if (daysLeft === null) return t('licensing.noLicense');
    if (daysLeft < 0) return t('licensing.expired');
    if (daysLeft === 0) return t('licensing.expiresToday');
    if (daysLeft === 1) return t('licensing.oneDayLeft');
    return `${daysLeft} ${t('licensing.daysLeft')}`;
  };

  const getStatusColor = (state: string): string => {
    switch (state) {
      case 'valid': return '#10b981';
      case 'grace': return '#f59e0b';
      case 'expired': return '#ef4444';
      case 'invalid': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (state: string): string => {
    switch (state) {
      case 'valid': return t('licensing.statusValid');
      case 'grace': return t('licensing.statusGrace');
      case 'expired': return t('licensing.statusExpired');
      case 'invalid': return t('licensing.statusInvalid');
      case 'no-license': return t('licensing.noLicense');
      default: return state;
    }
  };

  const [forceCheckLoading, setForceCheckLoading] = useState(false);
  const [forceCheckResult, setForceCheckResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleForceCheck = async () => {
    if (!window.electronAPI?.licensing) return;
    setForceCheckLoading(true);
    setForceCheckResult(null);
    try {
      const result = await window.electronAPI.licensing.forceCheck();
      await refreshLicense();
      await fetchData();
      if (result.tamperDetected) {
        setForceCheckResult({ type: 'error', msg: 'Security Alert: Clock tampering detected in system history.' });
      } else {
        setForceCheckResult({ type: 'success', msg: 'License check completed successfully.' });
      }
    } catch (err) {
      setForceCheckResult({ type: 'error', msg: err instanceof Error ? err.message : 'Force check failed.' });
    } finally {
      setForceCheckLoading(false);
    }
  };

  const handleOpenKeysFolder = async () => {
    if (window.electronAPI?.licensing) {
      try {
        await window.electronAPI.licensing.openKeysFolder();
      } catch (err) {
        console.error('Failed to open keys folder:', err);
      }
    }
  };

  const handleImportLicense = () => {
    navigate('/activate');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '4px solid #e5e7eb',
            borderTopColor: '#2563eb', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: '14px', color: '#666' }}>{t('licensing.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <Container fluid className="py-4" style={{ maxWidth: '1200px' }}>
      <Row className="mb-4">
        <Col>
          <div className="page-header">
            <h2>{t('licensing.title')}</h2>
            <p>{t('licensing.subtitle')}</p>
          </div>
        </Col>
      </Row>

      {/* Clock Tamper Alert */}
      {licenseState.tamperDetected && (
        <Alert variant="danger" className="mb-4 shadow-sm">
          <div className="d-flex align-items-center">
            <div className="me-3" style={{ fontSize: '1.5rem' }}>🚨</div>
            <div>
              <Alert.Heading className="mb-1">Security Alert: Clock Tampering Detected</Alert.Heading>
              <p className="mb-0">
                The application has detected that your system clock was moved into the past. 
                Data operations have been disabled for security reasons. Please contact support to resolve this issue.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Status Card */}
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '12px', height: '12px', borderRadius: '50%',
            backgroundColor: getStatusColor(licenseState.state),
          }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {getStatusLabel(licenseState.state)}
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {/* License Key */}
          <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              {t('licensing.licenseKey')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <code style={{
                flex: 1, fontSize: '12px', fontFamily: 'monospace', color: '#1a1a1a',
                wordBreak: 'break-all',
              }}>
                {showKey ? (licenseState.licenseBlob || '—') : maskLicenseKey(licenseState.licenseId)}
              </code>
              <button
                onClick={() => setShowKey(!showKey)}
                style={{
                  padding: '2px 8px', fontSize: '11px', backgroundColor: '#e5e7eb',
                  border: 'none', borderRadius: '4px', cursor: 'pointer',
                }}
              >
                {showKey ? t('licensing.hide') : t('licensing.show')}
              </button>
              {showKey && licenseState.licenseBlob && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(licenseState.licenseBlob!);
                  }}
                  style={{
                    padding: '2px 8px', fontSize: '11px', backgroundColor: '#e5e7eb',
                    border: 'none', borderRadius: '4px', cursor: 'pointer',
                  }}
                >
                  {t('licensing.copy')}
                </button>
              )}
            </div>
          </div>

          {/* Edition */}
          <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              {t('licensing.edition')}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a' }}>
              {licenseState.edition || '—'}
              {licenseState.payload?.license_type === 'trial' && (
                <span style={{
                  marginLeft: '8px', padding: '2px 6px', fontSize: '10px',
                  backgroundColor: '#fef3c7', color: '#92400e',
                  borderRadius: '4px', border: '1px solid #fcd34d',
                  textTransform: 'uppercase', letterSpacing: '0.025em',
                }}>
                  Trial
                </span>
              )}
            </div>
          </div>

          {/* Customer ID */}
          <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              {t('licensing.customerId')}
            </div>
            <div style={{ fontSize: '14px', color: '#1a1a1a' }}>
              {licenseState.customerId || '—'}
            </div>
          </div>

          {/* Activation Date */}
          <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              {t('licensing.activationDate')}
            </div>
            <div style={{ fontSize: '14px', color: '#1a1a1a' }}>
              {licenseState.payload?.valid_from ? new Date(licenseState.payload.valid_from).toLocaleDateString() : '—'}
            </div>
          </div>

          {/* Cumulative Usage */}
          <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              {t('licensing.cumulativeUsage')}
            </div>
            <div style={{ fontSize: '14px', color: '#1a1a1a' }}>
              {licenseState.payload?.valid_from ? (
                Math.floor((new Date().getTime() - new Date(licenseState.payload.valid_from).getTime()) / (1000 * 60 * 60 * 24))
              ) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Time Remaining Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Maintenance Expiry */}
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            {t('licensing.maintenanceExpiry')}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px' }}>
            {formatDaysRemaining(licenseState.maintenanceDaysLeft)}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            {licenseState.maintenanceUntil ? new Date(licenseState.maintenanceUntil).toLocaleDateString() : '—'}
          </div>
        </div>

        {/* License Renewal */}
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            {t('licensing.licenseRenewal')}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px' }}>
            {formatDaysRemaining(licenseState.renewalDays)}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            {licenseState.renewalUntil ? new Date(licenseState.renewalUntil).toLocaleDateString() : '—'}
          </div>
        </div>
      </div>

      {/* Device Fingerprint */}
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px',
      }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 600 }}>
          {t('licensing.deviceFingerprint')}
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <code style={{
            flex: 1, fontSize: '12px', fontFamily: 'monospace', color: '#4b5563',
            wordBreak: 'break-all',
          }}>
            {licenseState.deviceFingerprint || '—'}
          </code>
          <button
            onClick={() => {
              if (licenseState.deviceFingerprint) {
                navigator.clipboard.writeText(licenseState.deviceFingerprint);
              }
            }}
            style={{
              padding: '6px 12px', fontSize: '12px', backgroundColor: '#e5e7eb',
              border: 'none', borderRadius: '6px', cursor: 'pointer',
            }}
          >
            {t('licensing.copy')}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px',
      }}>
        <h4 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>
          {t('licensing.quickActions')}
        </h4>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleImportLicense}
            style={{
              padding: '10px 20px', fontSize: '14px', fontWeight: 500,
              backgroundColor: '#2563eb', color: '#fff', border: 'none',
              borderRadius: '8px', cursor: 'pointer',
            }}
          >
            {t('licensing.importLicense')}
          </button>
          <button
            onClick={handleOpenKeysFolder}
            style={{
              padding: '10px 20px', fontSize: '14px', fontWeight: 500,
              backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #d1d5db',
              borderRadius: '8px', cursor: 'pointer',
            }}
          >
            {t('licensing.openKeysFolder')}
          </button>
          <button
            onClick={handleForceCheck}
            disabled={forceCheckLoading}
            style={{
              padding: '10px 20px', fontSize: '14px', fontWeight: 500,
              backgroundColor: forceCheckLoading ? '#9ca3af' : '#f8fafc',
              color: forceCheckLoading ? '#6b7280' : '#475569',
              border: '1px solid #d1d5db', borderRadius: '8px',
              cursor: forceCheckLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            {forceCheckLoading && (
              <div style={{
                width: '14px', height: '14px', border: '2px solid #d1d5db',
                borderTopColor: '#475569', borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            )}
            {forceCheckLoading ? 'Checking...' : t('licensing.forceCheck')}
          </button>
        </div>
        {forceCheckResult && (
          <div style={{
            marginTop: '12px', padding: '10px 16px',
            backgroundColor: forceCheckResult.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${forceCheckResult.type === 'success' ? '#22c55e' : '#ef4444'}`,
            borderRadius: '8px', fontSize: '13px',
            color: forceCheckResult.type === 'success' ? '#166534' : '#991b1b',
          }}>
            {forceCheckResult.msg}
          </div>
        )}
      </div>
    </Container>
  );
};

export default Licensing;