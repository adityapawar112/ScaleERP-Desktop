import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Toast, ToastContainer, Badge, Alert, ProgressBar, Modal, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FiCheck, FiDownload, FiUpload, FiFolder, FiRefreshCw, FiCloudOff } from 'react-icons/fi';
import { MdCloudDone, MdCloudQueue, MdSync, MdError } from 'react-icons/md';
import { BackupListItem } from '../../electron/database/backupOps';
import CloudBackupSettings from '../components/CloudBackupSettings';

const Backups: React.FC = () => {
  const { t } = useTranslation();

  // State for alert management
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [backups, setBackups] = useState<BackupListItem[]>([]);
  const [isManualBackupRunning, setIsManualBackupRunning] = useState(false);
  const [manualBackupProgress, setManualBackupProgress] = useState(0);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<{show: boolean, backup: BackupListItem | null}>({show: false, backup: null});
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);

  // Load backup history
  useEffect(() => {
    loadBackupHistory();
  }, []);

  const loadBackupHistory = async () => {
    try {
      const backupsList = await window.electronAPI?.database.backup.list();
      if (backupsList) {
        setBackups(backupsList);
      }
    } catch (error) {
      console.error('Failed to load backup history:', error);
    }
  };

  const handleManualBackup = async () => {
    setIsManualBackupRunning(true);
    setManualBackupProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setManualBackupProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await window.electronAPI?.database.backup.create();

      clearInterval(progressInterval);
      setManualBackupProgress(100);

      if (result) {
        console.log('Manual backup completed successfully');
        await loadBackupHistory();
      }
    } catch (error) {
      console.error('Manual backup failed:', error);
      setErrorMessage(t('common.error', 'Manual backup failed'));
      setShowErrorAlert(true);
    } finally {
      setTimeout(() => {
        setIsManualBackupRunning(false);
        setManualBackupProgress(0);
      }, 1000);
    }
  };

  const handleRestoreBackup = (backup: BackupListItem) => {
    setShowRestoreConfirm({ show: true, backup });
  };

  const confirmRestoreBackup = async () => {
    if (!showRestoreConfirm.backup) return;

    setIsRestoring(true);
    setRestoreProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setRestoreProgress(prev => Math.min(prev + 5, 90));
      }, 300);

      const backupPath = showRestoreConfirm.backup?.path;
      if (!backupPath) {
        throw new Error('Backup path not available');
      }

      const result = await window.electronAPI?.database.backup.restore(backupPath);

      clearInterval(progressInterval);
      setRestoreProgress(100);

      if (result && result.success) {
        console.log('Backup restoration completed successfully');
        setShowSuccessAlert(true);

        setTimeout(async () => {
          if (!window.electronAPI) return;
          await window.electronAPI.reloadWindow();
        }, 1500);
      } else {
        const errorMsg = result?.errors?.join(', ') || 'Unknown error during restoration';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Backup restoration failed:', error);
      setErrorMessage(error instanceof Error ? `Backup restoration failed: ${error.message}` : t('common.error', 'Backup restoration failed'));
      setShowErrorAlert(true);
    } finally {
      setShowRestoreConfirm({ show: false, backup: null });
      setTimeout(() => {
        setIsRestoring(false);
        setRestoreProgress(0);
      }, 1000);
    }
  };

  const cancelRestoreBackup = () => {
    setShowRestoreConfirm({ show: false, backup: null });
  };

  const handleToggleCloudSync = async (filePath: string) => {
    try {
      const result = await window.electronAPI?.googleDrive.toggleItemStatus(filePath);
      if (result) {
        await loadBackupHistory();
      }
    } catch (error) {
      console.error('Failed to toggle cloud sync:', error);
      setErrorMessage(t('common.error', 'Failed to toggle cloud sync'));
      setShowErrorAlert(true);
    }
  };

  const getCloudStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <MdCloudDone className="text-success" title="Synced to Cloud" size={18} />;
      case 'uploading':
        return <MdSync className="text-primary spin-animation" title="Uploading..." size={18} />;
      case 'pending':
        return <MdCloudQueue className="text-warning" title="Pending Upload" size={18} />;
      case 'failed':
        return <MdError className="text-danger" title="Sync Failed" size={18} />;
      default:
        return <FiCloudOff className="text-muted" title="Not Synced" size={18} />;
    }
  };



  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="page-header">
            <h2>{t('backups.title', 'Backups System')}</h2>
            <p>{t('backups.subtitle', 'Manage background data backups and restore manually generated checkpoints.')}</p>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <CloudBackupSettings />
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white py-3">
              <Row className="align-items-center">
                <Col>
                  <h5 className="mb-0" style={{ color: 'var(--primary-dark)' }}>{t('backups.autoBackups', 'Automatic Backups')}</h5>
                </Col>
                <Col xs="auto">
                  <Badge bg="success" className="px-3 py-2">
                    {t('common.active', 'Active')}
                  </Badge>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body>
              <Alert variant="info" className="mb-4">
                <strong>Schedule:</strong> Automated backups run gracefully in the background daily at 2:00 AM. 
                The system strictly retains 3 Daily, 3 Weekly, 3 Monthly, and All Yearly tags to protect data lifecycle space limitations.
              </Alert>

                <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                  <div>
                    <h5 className="mb-1">{t('backups.manualCheckpoint', 'Manual Database Checkpoint')}</h5>
                    <p className="text-muted mb-0 small">Generate an out-of-schedule backup instantly.</p>
                  </div>
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-secondary"
                      size="lg"
                      onClick={async () => {
                        try {
                          await window.electronAPI?.database.backup.openFolder();
                        } catch (error) {
                          console.error('Failed to open backup folder:', error);
                          setErrorMessage(t('common.error', 'Failed to open backup folder'));
                          setShowErrorAlert(true);
                        }
                      }}
                      className="d-flex align-items-center"
                    >
                      <FiFolder className="me-2" />
                      Open Backup Folder
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleManualBackup}
                      disabled={isManualBackupRunning}
                      className="d-flex align-items-center"
                    >
                      {isManualBackupRunning ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          {t('common.processing', 'Creating Backup...')}
                        </>
                      ) : (
                        <>
                          <FiDownload className="me-2" />
                          {t('backups.createManual', 'Create Manual Backup')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {isManualBackupRunning && (
                  <ProgressBar
                    animated
                    now={manualBackupProgress}
                    label={`${manualBackupProgress}%`}
                    className="mb-3"
                  />
                )}

                <div className="mt-5">
                  <h6 className="mb-3">{t('backups.history', 'Database Restoration & History')}</h6>
                  {backups.length === 0 ? (
                    <Alert variant="secondary">
                      No backups found. Checkpoints will populate here automatically.
                    </Alert>
                  ) : (
                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <Table striped bordered hover responsive size="sm" className="align-middle">
                      <thead className="sticky-top bg-white">
                        <tr>
                          <th>{t('common.dateTime', 'Timestamp')}</th>
                          <th>Tag Type</th>
                          <th>Size</th>
                          <th>{t('common.status', 'Integrity Status')}</th>
                          <th>Cloud Sync</th>
                          <th className="text-end">{t('common.actions', 'Actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backups.map((backup, index) => {
                           // Parse name explicitly if tagged:
                           const name = backup.path.split(/\\|\//).pop() || '';
                           let tag = "Legacy Auto";
                           if(name.includes('-manual')) tag = "Manual Checkpoint";
                           else if(name.includes('-yearly')) tag = "Yearly";
                           else if(name.includes('-monthly')) tag = "Monthly";
                           else if(name.includes('-weekly')) tag = "Weekly";
                           else if(name.includes('-daily')) tag = "Daily";

                           return (
                             <tr key={index}>
                              <td>{new Date(backup.timestamp).toLocaleDateString()} at {new Date(backup.timestamp).toLocaleTimeString()}</td>
                              <td><Badge bg={tag.includes('Manual') ? 'primary' : 'info'} className="text-capitalize">{tag}</Badge></td>
                              <td>{(backup.size / 1024 / 1024).toFixed(2)} MB</td>
                              <td>
                                <Badge bg={backup.integrityCheck ? 'success' : 'danger'}>
                                  {backup.integrityCheck ? t('common.success', 'Verified Secure') : t('common.error', 'Corrupted / Invalid')}
                                </Badge>
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  {getCloudStatusIcon(backup.cloudStatus)}
                                  <span className="small text-capitalize text-muted">
                                    {backup.cloudStatus?.replace('_', ' ') || 'None'}
                                  </span>
                                </div>
                              </td>
                              <td className="text-end">
                                <div className="d-flex justify-content-end gap-2">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleToggleCloudSync(backup.path)}
                                    title="Force Re-sync / Enqueue"
                                  >
                                    <FiRefreshCw size={14} />
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleRestoreBackup(backup)}
                                    disabled={!backup.integrityCheck}
                                  >
                                    <FiUpload size={14} className="me-1" />
                                    {t('backups.restoreSystem', 'Restore System')}
                                  </Button>
                                </div>
                              </td>
                             </tr>
                           )
                        })}
                      </tbody>
                    </Table>
                    </div>
                  )}
                </div>
                <style>{`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                  .spin-animation {
                    animation: spin 2s linear infinite;
                  }
                `}</style>
              </Card.Body>
            </Card>
        </Col>
      </Row>

      <ToastContainer
        position="bottom-end"
        className="p-3"
        style={{ zIndex: 9999, position: 'fixed', bottom: '20px', right: '20px' }}
      >
        <Toast show={showSuccessAlert} onClose={() => setShowSuccessAlert(false)} delay={2000} autohide bg="success">
          <Toast.Header><strong className="me-auto">{t('common.success', 'Success')}</strong></Toast.Header>
          <Toast.Body className="text-white">{t('common.completed', 'Operation completed successfully.')}</Toast.Body>
        </Toast>
        <Toast show={showErrorAlert} onClose={() => setShowErrorAlert(false)} bg="danger">
          <Toast.Header><strong className="me-auto">{t('common.error', 'Error')}</strong></Toast.Header>
          <Toast.Body className="text-white"><strong>Failed:</strong> {errorMessage}</Toast.Body>
        </Toast>
      </ToastContainer>

      <Modal show={showRestoreConfirm.show} onHide={isRestoring ? () => {} : cancelRestoreBackup} backdrop="static">
        <Modal.Header closeButton={!isRestoring}>
          <Modal.Title>{isRestoring ? t('common.processing', 'Applying System Restoration...') : t('backups.confirmRestoreTitle', 'Critical: Confirm Restore')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!isRestoring ? (
            <>
              <p>Are you sure you want to revert the system to the backup captured on: <strong>{showRestoreConfirm.backup ? new Date(showRestoreConfirm.backup.timestamp).toLocaleString() : 'Unknown'}</strong>?</p>
              <Alert variant="danger">
                <strong>{t('common.warning', 'CRITICAL WARNING:')}</strong> All progress, transactions, and data entered after this date will be permanently destroyed. The application will force restart upon completion. 
              </Alert>
            </>
          ) : (
            <>
              <p>Overwriting encrypted system files...</p>
              <ProgressBar animated variant="danger" now={restoreProgress} label={`${restoreProgress}%`} className="mb-3" />
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {!isRestoring ? (
            <>
              <Button variant="secondary" onClick={cancelRestoreBackup}>{t('common.cancel', 'Cancel')}</Button>
              <Button variant="danger" onClick={confirmRestoreBackup}>{t('backups.acceptRestore', 'Accept Data Loss & Restore')}</Button>
            </>
          ) : (
            <Alert variant="info" className="w-100"><small>{t('common.processing', 'Securing database locks... please do not close the application.')}</small></Alert>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Backups;
