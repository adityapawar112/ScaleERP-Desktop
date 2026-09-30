import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { MdCloudDone, MdCloudOff, MdSync, MdVpnKey, MdWarning } from 'react-icons/md';

const CloudBackupSettings: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      if (window.electronAPI?.googleDrive) {
        const currentStatus = await window.electronAPI.googleDrive.getStatus();
        setStatus(currentStatus);
      }
    } catch (err) {
      console.error('Failed to fetch Google Drive status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Listen for auth events
    const cleanupSuccess = window.electronAPI?.googleDriveEvents?.onAuthSuccess(() => {
      fetchStatus();
    });

    const cleanupError = window.electronAPI?.googleDriveEvents?.onAuthError((err: string) => {
      setError(err);
      fetchStatus();
    });

    return () => {
      if (cleanupSuccess) cleanupSuccess();
      if (cleanupError) cleanupError();
    };
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await window.electronAPI?.googleDrive.login();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm(t('cloud.disconnectPrompt', 'Are you sure you want to disconnect Google Drive? Auto-uploads will be disabled.'))) {
      setLoading(true);
      try {
        await window.electronAPI?.googleDrive.logout();
        await fetchStatus();
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await window.electronAPI?.googleDrive.processQueue();
      // Wait a bit to show activity
      setTimeout(fetchStatus, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !status) {
    return (
      <Card className="shadow-sm border-0 mb-4">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">{t('cloud.checkingStatus', 'Checking cloud storage status...')}</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0 mb-4 overflow-hidden">
      <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
        <h5 className="mb-0" style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>
          <MdCloudDone className="me-2 mb-1" /> {t('cloud.title', 'Google Drive Cloud Backup')}
        </h5>
        {status?.connected ? (
          <Badge bg="success" pill className="px-3 py-2">{t('cloud.connected', 'Connected')}</Badge>
        ) : (
          <Badge bg="secondary" pill className="px-3 py-2">{t('cloud.disconnected', 'Disconnected')}</Badge>
        )}
      </Card.Header>
      
      <Card.Body className="pt-0">
        <hr className="mt-0 mb-4 opacity-10" />
        
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            <MdWarning className="me-2 mb-1" /> {error}
          </Alert>
        )}

        {!status?.encryption_available && (
          <Alert variant="warning" className="border-0 shadow-sm mb-4">
            <MdVpnKey className="me-2 mb-1" />
            <strong>{t('cloud.securityWarning', 'Security Warning:')}</strong> {t('cloud.encryptionWarning', 'System encryption (safeStorage) is unavailable. Login is restricted to protect your account. Please ensure your system keyring is enabled.')}
          </Alert>
        )}

        <Row className="align-items-center">
          <Col md={8}>
            {status?.connected ? (
              <div className="d-flex align-items-center">
                <div 
                  className="bg-light rounded-circle p-3 me-3 d-flex align-items-center justify-content-center"
                  style={{ width: '60px', height: '60px' }}
                >
                  <MdCloudDone size={32} color="var(--success)" />
                </div>
                <div>
                  <h6 className="mb-1 fw-bold">{status.account_email}</h6>
                  <p className="mb-0 text-muted small">
                    {t('cloud.autoUpload', 'Auto-upload is')} {status.auto_upload_enabled ? t('common.active', 'enabled') : t('common.inactive', 'disabled')}. 
                    {t('cloud.folderNote', " Backups are stored in 'ScaleERP Backups' folder.")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="d-flex align-items-center">
                <div 
                  className="bg-light rounded-circle p-3 me-3 d-flex align-items-center justify-content-center"
                  style={{ width: '60px', height: '60px' }}
                >
                  <MdCloudOff size={32} className="text-muted" />
                </div>
                <div>
                  <h6 className="mb-1 fw-bold">{t('cloud.notConfigured', 'Cloud Backup Not Configured')}</h6>
                  <p className="mb-0 text-muted small">
                    {t('cloud.connectPrompt', 'Connect your Google Drive to automatically store encrypted database backups.')}
                  </p>
                </div>
              </div>
            )}
          </Col>
          <Col md={4} className="text-md-end mt-3 mt-md-0">
            {status?.connected ? (
              <div className="d-grid gap-2">
                <Button 
                  variant="primary" 
                  onClick={handleSyncNow} 
                  disabled={syncing}
                  className="shadow-sm btn-premium"
                >
                  {syncing ? <Spinner animation="border" size="sm" className="me-2" /> : <MdSync className="me-2 mb-1" />}
                  {syncing ? t('common.processing', 'Syncing...') : t('cloud.syncNow', 'Sync Now')}
                </Button>
                <Button variant="outline-danger" size="sm" onClick={handleLogout} disabled={syncing}>
                  {t('cloud.disconnect', 'Disconnect Account')}
                </Button>
              </div>
            ) : (
              <Button 
                variant="success" 
                onClick={handleLogin} 
                disabled={loading || !status?.encryption_available}
                className="px-4 py-2 shadow-sm btn-premium"
              >
                {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <MdCloudDone className="me-2 mb-1" />}
                {t('cloud.connectDrive', 'Connect Google Drive')}
              </Button>
            )}
          </Col>
        </Row>

        {status?.connected && status?.storage_encryption_status === 'failed' && (
          <div className="mt-3 text-danger small">
            <MdWarning className="me-1 mb-1" /> {t('cloud.encryptionFailed', 'Encryption failed during last token save. Re-authentication recommended.')}
          </div>
        )}
      </Card.Body>
      
      <style>{`
        .btn-premium {
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .btn-premium:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }
        .bg-light {
          background-color: #f8f9fa !important;
        }
      `}</style>
    </Card>
  );
};

export default CloudBackupSettings;
