// src/pages/DevDashboard.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
} from 'react-bootstrap';
import { useLicense } from '../context/LicenseContext';
import DatabaseDiagnostics from './DatabaseDiagnostics';
import TableViewer from './TableViewer';
import LicenseLogs from './LicenseLogs';

type DevTab = 'license-tools' | 'users' | 'database' | 'table-browser' | 'logs' | 'system-info';
type StatusMessage = { type: 'success' | 'error' | 'info'; message: string } | null;

interface GenerateLicenseResult {
  success: boolean;
  blob?: string;
  payload?: Record<string, unknown>;
  error?: string;
}

interface CreateUserResult {
  success: boolean;
  userId?: string;
  username?: string;
  licenseId?: string;
  message?: string;
  error?: string;
}

interface GenerateResetCodeResult {
  success: boolean;
  resetCodeBlob?: string;
  error?: string;
}

const addDaysIso = (baseDateIso: string, days: number): string => {
  const value = new Date(baseDateIso);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
};

const toDateInputValue = (isoDate: string): string => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const DevDashboard: React.FC = () => {
  const { licenseState, refreshLicense } = useLicense();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState<DevTab>('license-tools');
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);

  const [appVersion, setAppVersion] = useState<string>('—');
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('—');
  const [sessionUsername, setSessionUsername] = useState<string>('—');
  const [systemInfoLoading, setSystemInfoLoading] = useState(false);

  // License Generator State
  const [licenseValidFrom, setLicenseValidFrom] = useState('');
  const [showGenerateLicenseModal, setShowGenerateLicenseModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showResetCodeModal, setShowResetCodeModal] = useState(false);

  const [licenseCustomerId, setLicenseCustomerId] = useState('customer-dev');
  const [licenseCustomerName, setLicenseCustomerName] = useState('Developer Customer');
  const [licenseCustomerEmail, setLicenseCustomerEmail] = useState('');
  const [licenseCustomerCompany, setLicenseCustomerCompany] = useState('');
  const [licenseEdition, setLicenseEdition] = useState<'Basic' | 'Pro' | 'Enterprise'>('Pro');
  const [licenseBackupDurationDays, setLicenseBackupDurationDays] = useState(365); // For filename metadata only
  const [licenseMaintenanceDays, setLicenseMaintenanceDays] = useState(90);
  const [licenseBindDevice, setLicenseBindDevice] = useState(true);
  const [licenseDeviceFingerprint, setLicenseDeviceFingerprint] = useState('');
  const [privateKeyPem, setPrivateKeyPem] = useState('');
  const [generatedLicenseBlob, setGeneratedLicenseBlob] = useState('');
  const [generateLicenseLoading, setGenerateLicenseLoading] = useState(false);

  const [applyingOverride, setApplyingOverride] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserLicenseId, setNewUserLicenseId] = useState('');
  const [newUserMaxFailedAttempts, setNewUserMaxFailedAttempts] = useState(5);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserResult, setCreateUserResult] = useState<CreateUserResult | null>(null);

  const [userList, setUserList] = useState<any[]>([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [resetChallengeBlob, setResetChallengeBlob] = useState('');
  const [generatedResetCodeBlob, setGeneratedResetCodeBlob] = useState('');
  const [generateResetCodeLoading, setGenerateResetCodeLoading] = useState(false);

  const canUseElectron = Boolean(window.electronAPI);

  const tabButtons: Array<{ key: DevTab; label: string }> = useMemo(
    () => [
      { key: 'license-tools', label: 'License Tools' },
      { key: 'users', label: 'User Management' },
      { key: 'database', label: 'Database' },
      { key: 'table-browser', label: 'Table Browser' },
      { key: 'logs', label: 'Logs' },
      { key: 'system-info', label: 'System Info' },
    ],
    []
  );

  useEffect(() => {
    try {
      const granted = window.sessionStorage.getItem('dev_access_granted') === 'true';
      const storedSecret = window.sessionStorage.getItem('dev_secret_stored');
      
      if (granted) {
        if (storedSecret) {
          setIsAuthenticated(true);
        } else {
          // If access was granted but secret is missing (e.g. from an old login or manual flag set),
          // clear the flag and force the user to provide the secret again for security.
          window.sessionStorage.removeItem('dev_access_granted');
          setIsAuthenticated(false);
        }
      }
    } catch {
      // Ignore storage failures, fallback to in-page secret auth.
    }
  }, []);

  const authenticate = useCallback(async () => {
    if (!window.electronAPI?.devTools?.authenticateSecret) {
      setAuthError('Authentication service not available');
      return;
    }

    const result = await window.electronAPI.devTools.authenticateSecret(secretInput);
    if (result.success) {
      try {
        window.sessionStorage.setItem('dev_access_granted', 'true');
        window.sessionStorage.setItem('dev_secret_stored', secretInput);
      } catch {
        // Ignore storage failures
      }
      setIsAuthenticated(true);
      setAuthError('');
      setStatusMessage(null);
      return;
    }
    setAuthError(result.error || 'Invalid developer secret');
  }, [secretInput]);

  useEffect(() => {
    if (!isAuthenticated || !licenseState.payload) {
      return;
    }
    // Set default validFrom for generator if not yet set
    if (!licenseValidFrom) {
      setLicenseValidFrom(toDateInputValue(new Date().toISOString()));
    }
  }, [isAuthenticated, licenseState.payload, licenseValidFrom]);

  const handleResetMaintenance = useCallback(async () => {
    setApplyingOverride(true);
    setStatusMessage(null);
    try {
      if (!window.electronAPI?.licensing?.adminUpdate) throw new Error('IPC not available');

      const secret = window.sessionStorage.getItem('dev_secret_stored') || secretInput;
      if (!secret) {
        setIsAuthenticated(false);
        throw new Error('Authentication expired or missing. Please re-authenticate.');
      }

      // Reset to Today + 90 Days
      const newMaintenanceUntil = addDaysIso(new Date().toISOString(), 90);
      const result = await window.electronAPI.licensing.adminUpdate({
        license_id: licenseState.licenseId || undefined,
        maintenance_until: newMaintenanceUntil,
      }, secret);

      if (!result.success) throw new Error(result.error || 'Failed to reset maintenance');

      await refreshLicense();
      setStatusMessage({ type: 'success', message: 'Maintenance timer reset to 90 days from today.' });
    } catch (error) {
      setStatusMessage({ type: 'error', message: error instanceof Error ? error.message : 'Reset failed' });
    } finally {
      setApplyingOverride(false);
    }
  }, [refreshLicense, licenseState.licenseId, secretInput]);

  const handleResetRenewal = useCallback(async () => {
    setApplyingOverride(true);
    setStatusMessage(null);
    try {
      if (!window.electronAPI?.licensing?.adminUpdate) throw new Error('IPC not available');

      const secret = window.sessionStorage.getItem('dev_secret_stored') || secretInput;
      if (!secret) {
        setIsAuthenticated(false);
        throw new Error('Authentication expired or missing. Please re-authenticate.');
      }

      // Reset activation date to Today (resets 364-day anniversary clock)
      const newValidFrom = new Date().toISOString();
      const result = await window.electronAPI.licensing.adminUpdate({
        license_id: licenseState.licenseId || undefined,
        valid_from: newValidFrom,
      }, secret);

      if (!result.success) throw new Error(result.error || 'Failed to reset renewal');

      await refreshLicense();
      setStatusMessage({ type: 'success', message: 'Renewal anniversary reset to 1 year from today.' });
    } catch (error) {
      setStatusMessage({ type: 'error', message: error instanceof Error ? error.message : 'Reset failed' });
    } finally {
      setApplyingOverride(false);
    }
  }, [refreshLicense, licenseState.licenseId, secretInput]);

  const handleClearClockTamper = useCallback(async () => {
    setApplyingOverride(true);
    setStatusMessage(null);
    try {
      if (!window.electronAPI?.licensing?.adminClearTamper) {
        throw new Error('Licensing IPC (clearTamper) not available');
      }

      const secret = window.sessionStorage.getItem('dev_secret_stored') || secretInput;
      if (!secret) {
        setIsAuthenticated(false);
        throw new Error('Authentication expired or missing. Please re-authenticate.');
      }

      const result = await window.electronAPI.licensing.adminClearTamper(licenseState.licenseId || '', secret);
      if (!result.success) {
        throw new Error(result.error || 'Failed to clear clock tamper state');
      }

      await refreshLicense();
      setStatusMessage({ type: 'success', message: 'Future heartbeats cleared. Security timeline reset.' });
    } catch (error) {
      setStatusMessage({ type: 'error', message: error instanceof Error ? error.message : 'Override failed' });
    } finally {
      setApplyingOverride(false);
    }
  }, [refreshLicense, licenseState.licenseId, secretInput]);

  const handleGenerateLicense = useCallback(async () => {
    setGenerateLicenseLoading(true);
    setGeneratedLicenseBlob('');
    setStatusMessage(null);

    try {
      if (!window.electronAPI?.devTools?.generateLicense) {
        throw new Error('Developer tools IPC is not available');
      }

      const secret = window.sessionStorage.getItem('dev_secret_stored') || secretInput;
      if (!secret) {
        setIsAuthenticated(false);
        throw new Error('Authentication expired or missing. Please re-authenticate.');
      }

      const normalizedMaintenance = Number(licenseMaintenanceDays);

      const result = await window.electronAPI.devTools.generateLicense({
        customerId: licenseCustomerId.trim(),
        customerName: licenseCustomerName.trim(),
        customerEmail: licenseCustomerEmail.trim() || undefined,
        customerCompany: licenseCustomerCompany.trim() || undefined,
        edition: licenseEdition,
        validFrom: licenseValidFrom ? new Date(`${licenseValidFrom}T00:00:00.000Z`).toISOString() : undefined,
        durationDays: 365, // Business rule: All licenses are 1 year
        maintenanceDays: Number.isFinite(normalizedMaintenance) ? normalizedMaintenance : 90,
        customDeviceFingerprint: licenseDeviceFingerprint.trim() || null,
        privateKeyPem: privateKeyPem.trim() || undefined,
      }, secret);

      if (!result.success || !result.blob) {
        throw new Error(result.error || 'Failed to generate license blob');
      }

      setGeneratedLicenseBlob(result.blob);
      setStatusMessage({ type: 'success', message: 'License blob generated successfully.' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to generate license',
      });
    } finally {
      setGenerateLicenseLoading(false);
    }
  }, [
    licenseDeviceFingerprint,
    privateKeyPem,
    licenseCustomerCompany,
    licenseCustomerEmail,
    licenseCustomerId,
    licenseCustomerName,
    licenseEdition,
    licenseMaintenanceDays,
    licenseValidFrom,
    secretInput,
  ]);

  const handleCreateUser = useCallback(async () => {
    setCreateUserLoading(true);
    setCreateUserResult(null);
    setStatusMessage(null);

    try {
      if (!window.electronAPI?.devTools?.createUser) {
        throw new Error('Developer tools IPC is not available');
      }

      const secret = window.sessionStorage.getItem('dev_secret_stored') || secretInput;
      if (!secret) {
        setIsAuthenticated(false);
        throw new Error('Authentication expired or missing. Please re-authenticate.');
      }

      const result = await window.electronAPI.devTools.createUser({
        username: newUsername.trim(),
        password: newPassword,
        licenseId: newUserLicenseId.trim() || undefined,
        maxFailedAttempts: Number(newUserMaxFailedAttempts),
      }, secret);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create user');
      }

      setCreateUserResult(result);
      setStatusMessage({ type: 'success', message: 'User account created successfully.' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create user',
      });
    } finally {
      setCreateUserLoading(false);
    }
  }, [newPassword, newUserLicenseId, newUserMaxFailedAttempts, newUsername, secretInput]);

  const handleGenerateResetCode = useCallback(async () => {
    setGenerateResetCodeLoading(true);
    setGeneratedResetCodeBlob('');
    setStatusMessage(null);

    try {
      if (!window.electronAPI?.devTools?.generateResetCode) {
        throw new Error('Developer tools IPC is not available');
      }

      const secret = window.sessionStorage.getItem('dev_secret_stored') || secretInput;
      if (!secret) {
        setIsAuthenticated(false);
        throw new Error('Authentication expired or missing. Please re-authenticate.');
      }

      const result = await window.electronAPI.devTools.generateResetCode({ challengeBlob: resetChallengeBlob }, secret);

      if (!result.success || !result.resetCodeBlob) {
        throw new Error(result.error || 'Failed to generate reset code');
      }

      setGeneratedResetCodeBlob(result.resetCodeBlob);
      setStatusMessage({ type: 'success', message: 'Reset code generated successfully.' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to generate reset code',
      });
    } finally {
      setGenerateResetCodeLoading(false);
    }
  }, [resetChallengeBlob, secretInput]);

  const handleGenerateQuickTrial = useCallback(async () => {
    setGenerateLicenseLoading(true);
    setStatusMessage(null);
    try {
      if (!window.electronAPI?.devTools?.generateLicense) {
        throw new Error('Developer tools IPC is not available');
      }
      if (!window.electronAPI?.licensing?.importLicense) {
        throw new Error('Licensing IPC (import) not available');
      }

      const secret = window.sessionStorage.getItem('dev_secret_stored') || secretInput;
      if (!secret) {
        setIsAuthenticated(false);
        throw new Error('Authentication expired or missing. Please re-authenticate.');
      }

      const result = await window.electronAPI.devTools.generateLicense({
        customerId: `trial-${Date.now()}`,
        customerName: 'Trial User',
        edition: 'Pro',
        licenseType: 'trial',
        maintenanceDays: 14,
        bindToCurrentDevice: false,
      }, secret);

      if (!result.success || !result.blob) {
        throw new Error(result.error || 'Failed to generate trial license');
      }

      const importResult = await window.electronAPI.licensing.importLicense(result.blob);
      if (!importResult.valid) {
        throw new Error(importResult.reason || 'Failed to activate trial license');
      }

      await refreshLicense();
      setStatusMessage({ type: 'success', message: '14-Day Trial generated and activated successfully!' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to generate quick trial',
      });
    } finally {
      setGenerateLicenseLoading(false);
    }
  }, [refreshLicense]);

  const fetchUsers = useCallback(async () => {
    setUserListLoading(true);
    setStatusMessage(null);
    try {
      if (!window.electronAPI?.devTools?.getUsers) {
        throw new Error('Developer tools IPC (getUsers) not available');
      }

      const secret = window.sessionStorage.getItem('dev_secret_stored') || secretInput;
      if (!secret) {
        setIsAuthenticated(false);
        throw new Error('Authentication expired or missing. Please re-authenticate.');
      }

      const result = await window.electronAPI.devTools.getUsers(secret);
      if (result.success) {
        setUserList(result.users || []);
      } else {
        throw new Error(result.error || 'Failed to fetch users');
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch users',
      });
    } finally {
      setUserListLoading(false);
    }
  }, [secretInput]);

  const handleResetPassword = useCallback(async () => {
    if (!resetUsername || !resetPassword) {
      setStatusMessage({ type: 'error', message: 'Username and new password are required' });
      return;
    }

    setResetLoading(true);
    setStatusMessage(null);
    try {
      if (!window.electronAPI?.devTools?.resetUserPassword) {
        throw new Error('Developer tools IPC (resetUserPassword) not available');
      }

      const secret = window.sessionStorage.getItem('dev_secret_stored') || secretInput;
      if (!secret) {
        setIsAuthenticated(false);
        throw new Error('Authentication expired or missing. Please re-authenticate.');
      }

      const result = await window.electronAPI.devTools.resetUserPassword({
        username: resetUsername,
        newPassword: resetPassword,
      }, secret);

      if (result.success) {
        setStatusMessage({ type: 'success', message: result.message || 'Password reset successfully' });
        setResetPassword('');
        // Refresh user list to show unlocked status
        await fetchUsers();
      } else {
        throw new Error(result.error || 'Failed to reset password');
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to reset password',
      });
    } finally {
      setResetLoading(false);
    }
  }, [resetUsername, resetPassword, fetchUsers, secretInput]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'users') {
      void fetchUsers();
    }
  }, [isAuthenticated, activeTab, fetchUsers]);

  const loadSystemInfo = useCallback(async () => {
    setSystemInfoLoading(true);

    try {
      const [version, fingerprint, session] = await Promise.all([
        window.electronAPI?.getAppVersion ? window.electronAPI.getAppVersion() : Promise.resolve('—'),
        window.electronAPI?.licensing?.getDeviceFingerprint
          ? window.electronAPI.licensing.getDeviceFingerprint()
          : Promise.resolve('—'),
        window.electronAPI?.auth?.checkSession
          ? window.electronAPI.auth.checkSession()
          : Promise.resolve({ authenticated: false } as const),
      ]);

      setAppVersion(version || '—');
      setDeviceFingerprint(fingerprint || '—');
      setSessionUsername(session.authenticated && session.user ? session.user.username : 'Not signed in');
    } catch {
      setAppVersion('Unavailable');
      setDeviceFingerprint('Unavailable');
      setSessionUsername('Unavailable');
    } finally {
      setSystemInfoLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'system-info') {
      void loadSystemInfo();
    }
  }, [activeTab, isAuthenticated, loadSystemInfo]);

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: 'calc(100vh - 40px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card style={{ width: '100%', maxWidth: '440px' }}>
          <Card.Body className="p-4">
            <h3 className="mb-2">Developer Access</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              Enter developer secret to access the dashboard.
            </p>

            {authError && <Alert variant="danger">{authError}</Alert>}

            <Form.Group className="mb-3">
              <Form.Label>Developer Secret</Form.Label>
              <Form.Control
                type="password"
                value={secretInput}
                onChange={(event) => setSecretInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    authenticate();
                  }
                }}
              />
            </Form.Group>

            <Button onClick={authenticate} className="w-100">
              Authenticate
            </Button>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 4px' }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h2 className="mb-1">Developer Dashboard</h2>
          <small className="text-muted">Internal tools and diagnostics</small>
        </div>
        <Badge bg="warning" text="dark">
          Developer Mode
        </Badge>
      </div>

      {statusMessage && (
        <Alert
          variant={
            statusMessage.type === 'success'
              ? 'success'
              : statusMessage.type === 'error'
                ? 'danger'
                : 'info'
          }
          className="mb-3"
        >
          {statusMessage.message}
        </Alert>
      )}

      <ButtonGroup className="mb-3 flex-wrap">
        {tabButtons.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'primary' : 'outline-primary'}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </ButtonGroup>

      {activeTab === 'license-tools' && (
        <div>
          <Card className="mb-3">
            <Card.Header>
              <strong>Generation Tools</strong>
            </Card.Header>
            <Card.Body>
              <p className="text-muted mb-3">
                Use developer tools to generate signed license blobs, create users, and generate reset codes.
              </p>
              <div className="d-flex gap-2 flex-wrap">
                <Button variant="outline-primary" onClick={() => setShowGenerateLicenseModal(true)}>
                  Generate License Key
                </Button>
                <Button variant="outline-success" onClick={() => void handleGenerateQuickTrial()} disabled={generateLicenseLoading}>
                  {generateLicenseLoading ? <Spinner animation="border" size="sm" /> : 'Generate 14-Day Trial'}
                </Button>
                <Button variant="outline-primary" onClick={() => setShowCreateUserModal(true)}>
                  Create User Account
                </Button>
                <Button variant="outline-primary" onClick={() => setShowResetCodeModal(true)}>
                  Generate Reset Code
                </Button>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <strong>License Override</strong>
            </Card.Header>
            <Card.Body>
              <Alert variant="warning">
                Changes made here are not cryptographically signed. Use for testing only.
              </Alert>
              <p className="text-muted small mb-3">
                Quickly reset renewal or maintenance timers for the active license to standard values.
              </p>

              <Row className="g-3">
                <Col md={6}>
                  <Button
                    variant="outline-warning"
                    className="w-100 py-3"
                    onClick={() => void handleResetMaintenance()}
                    disabled={applyingOverride}
                  >
                    {applyingOverride ? <Spinner animation="border" size="sm" /> : 'Reset Maintenance (90 Days)'}
                  </Button>
                  <div className="text-center mt-2 small text-muted">Sets maintenance_until to Today + 90 days</div>
                </Col>
                <Col md={6}>
                  <Button
                    variant="outline-danger"
                    className="w-100 py-3"
                    onClick={() => void handleResetRenewal()}
                    disabled={applyingOverride}
                  >
                    {applyingOverride ? <Spinner animation="border" size="sm" /> : 'Reset Renewal (1 Year)'}
                  </Button>
                  <div className="text-center mt-2 small text-muted">Sets valid_from to Today (Resets 365d clock)</div>
                </Col>
                <Col md={12} className="mt-3">
                  <Button
                    variant="outline-info"
                    className="w-100 py-2"
                    onClick={() => void handleClearClockTamper()}
                    disabled={applyingOverride}
                  >
                    {applyingOverride ? <Spinner animation="border" size="sm" /> : 'Clear Clock Tamper (Security Reset)'}
                  </Button>
                  <div className="text-center mt-2 small text-muted">Deletes "future" heartbeats used for tamper detection</div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </div>
      )}

      {activeTab === 'users' && (
        <Row>
          <Col lg={8}>
            <Card className="mb-3">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <strong>System Users</strong>
                <Button variant="outline-primary" size="sm" onClick={() => void fetchUsers()} disabled={userListLoading}>
                  {userListLoading ? <Spinner animation="border" size="sm" /> : 'Refresh'}
                </Button>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0" style={{ fontSize: '0.9rem' }}>
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">Username</th>
                        <th>License ID</th>
                        <th>Status</th>
                        <th>Failed Attempts</th>
                        <th>Last Login</th>
                        <th className="pe-3 text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-muted">
                            {userListLoading ? 'Loading users...' : 'No users found.'}
                          </td>
                        </tr>
                      ) : (
                        userList.map((user) => (
                          <tr key={user.user_id}>
                            <td className="ps-3 font-monospace">{user.username}</td>
                            <td className="font-monospace" style={{ fontSize: '0.8rem' }}>{user.license_id}</td>
                            <td>
                              <Badge bg={user.locked_out ? 'danger' : 'success'}>
                                {user.locked_out ? 'Locked' : 'Active'}
                              </Badge>
                            </td>
                            <td>{user.failed_attempts} / {user.max_failed_attempts}</td>
                            <td>{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</td>
                            <td className="pe-3 text-end">
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => {
                                  setResetUsername(user.username);
                                  // Scroll to the reset form if needed
                                }}
                              >
                                Select
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={4}>
            <Card>
              <Card.Header>
                <strong>Admin Password Reset</strong>
              </Card.Header>
              <Card.Body>
                <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                  Directly reset any user's password. This will also unlock the account and reset failed attempts.
                </p>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    placeholder="Select a user or type username"
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter new password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                  />
                </Form.Group>
                <Button
                  className="w-100"
                  variant="danger"
                  onClick={() => void handleResetPassword()}
                  disabled={resetLoading || !resetUsername || !resetPassword}
                >
                  {resetLoading ? <Spinner animation="border" size="sm" className="me-2" /> : null}
                  Reset Password
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {activeTab === 'database' && <DatabaseDiagnostics />}

      {activeTab === 'table-browser' && <TableViewer />}

      {activeTab === 'logs' && <LicenseLogs />}

      {activeTab === 'system-info' && (
        <Card>
          <Card.Header>
            <strong>System Info</strong>
          </Card.Header>
          <Card.Body>
            {systemInfoLoading ? (
              <div className="d-flex align-items-center gap-2">
                <Spinner animation="border" size="sm" />
                <span>Loading system information...</span>
              </div>
            ) : (
              <Row>
                <Col md={6}>
                  <p className="mb-2">
                    <strong>App Version:</strong> {appVersion}
                  </p>
                  <p className="mb-2">
                    <strong>Electron API:</strong> {canUseElectron ? 'Available' : 'Unavailable'}
                  </p>
                  <p className="mb-2">
                    <strong>License State:</strong> {licenseState.state}
                  </p>
                  <p className="mb-2">
                    <strong>Session User:</strong> {sessionUsername}
                  </p>
                </Col>
                <Col md={6}>
                  <p className="mb-2">
                    <strong>Platform:</strong> {window.navigator.platform}
                  </p>
                  <p className="mb-2">
                    <strong>Language:</strong> {window.navigator.language}
                  </p>
                  <p className="mb-2">
                    <strong>Online:</strong> {window.navigator.onLine ? 'Yes' : 'No'}
                  </p>
                  <p className="mb-2">
                    <strong>Device Fingerprint:</strong>
                  </p>
                  <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{deviceFingerprint}</code>
                </Col>
              </Row>
            )}
          </Card.Body>
        </Card>
      )}

      <Modal show={showGenerateLicenseModal} onHide={() => setShowGenerateLicenseModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Generate License Key</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Customer ID</Form.Label>
                <Form.Control
                  value={licenseCustomerId}
                  onChange={(event) => setLicenseCustomerId(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Customer Name</Form.Label>
                <Form.Control
                  value={licenseCustomerName}
                  onChange={(event) => setLicenseCustomerName(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Email (optional)</Form.Label>
                <Form.Control
                  value={licenseCustomerEmail}
                  onChange={(event) => setLicenseCustomerEmail(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Company (optional)</Form.Label>
                <Form.Control
                  value={licenseCustomerCompany}
                  onChange={(event) => setLicenseCustomerCompany(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Edition</Form.Label>
                <Form.Select
                  value={licenseEdition}
                  onChange={(event) => setLicenseEdition(event.target.value as 'Basic' | 'Pro' | 'Enterprise')}
                >
                  <option value="Basic">Basic</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Maintenance (days)</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={licenseMaintenanceDays}
                  onChange={(event) => setLicenseMaintenanceDays(Number(event.target.value))}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Valid From</Form.Label>
                <Form.Control type="date" value={licenseValidFrom} onChange={(event) => setLicenseValidFrom(event.target.value)} />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Device Fingerprint Binding (optional)</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    placeholder="Enter target device fingerprint, or leave blank for no binding"
                    value={licenseDeviceFingerprint}
                    onChange={(event) => setLicenseDeviceFingerprint(event.target.value)}
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={async () => {
                      if (window.electronAPI?.licensing?.getDeviceFingerprint) {
                        const current = await window.electronAPI.licensing.getDeviceFingerprint();
                        setLicenseDeviceFingerprint(current);
                      }
                    }}
                  >
                    Use Current Device
                  </Button>
                </div>
                <Form.Text className="text-muted">
                  Leave empty for no hardware binding. Paste the fingerprint from the user's activation screen.
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Private Key PEM (optional in Dev mode, required in Prod packaged mode)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Paste your Private Key (PEM) content here starting with -----BEGIN... and ending with -----END..."
                  value={privateKeyPem}
                  onChange={(event) => setPrivateKeyPem(event.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
                <Form.Text className="text-muted">
                  If running in dev mode, you can leave this blank to automatically load from local keys.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          {generatedLicenseBlob && (
            <Form.Group className="mt-3">
              <Form.Label>Signed License Blob</Form.Label>
              <Form.Control as="textarea" rows={8} value={generatedLicenseBlob} readOnly />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGenerateLicenseModal(false)}>
            Close
          </Button>
          {generatedLicenseBlob && (
            <Button
              variant="outline-secondary"
              onClick={() => {
                const start = licenseValidFrom
                  ? new Date(`${licenseValidFrom}T00:00:00.000Z`).toISOString()
                  : new Date().toISOString();
                const autoValidUntil = addDaysIso(start, 365);
                const fileName = `license-${licenseCustomerId || 'customer'}-${toDateInputValue(autoValidUntil) || 'export'}.lic`;
                const blob = new Blob([generatedLicenseBlob], { type: 'text/plain;charset=utf-8' });
                const objectUrl = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = objectUrl;
                anchor.download = fileName;
                anchor.click();
                URL.revokeObjectURL(objectUrl);
              }}
            >
              Download .lic
            </Button>
          )}
          <Button onClick={() => void handleGenerateLicense()} disabled={generateLicenseLoading}>
            {generateLicenseLoading ? 'Generating...' : 'Generate'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showCreateUserModal} onHide={() => setShowCreateUserModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create User Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Username</Form.Label>
                <Form.Control value={newUsername} onChange={(event) => setNewUsername(event.target.value)} />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label>License ID (optional: defaults to active license)</Form.Label>
                <Form.Control
                  value={newUserLicenseId}
                  onChange={(event) => setNewUserLicenseId(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Max Failed Attempts</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={newUserMaxFailedAttempts}
                  onChange={(event) => setNewUserMaxFailedAttempts(Number(event.target.value))}
                />
              </Form.Group>
            </Col>
          </Row>

          {createUserResult?.success && (
            <Alert variant="success" className="mt-3 mb-0">
              <div><strong>User ID:</strong> {createUserResult.userId}</div>
              <div><strong>Username:</strong> {createUserResult.username}</div>
              <div><strong>License ID:</strong> {createUserResult.licenseId}</div>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateUserModal(false)}>
            Close
          </Button>
          <Button onClick={() => void handleCreateUser()} disabled={createUserLoading}>
            {createUserLoading ? 'Creating...' : 'Create User'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showResetCodeModal} onHide={() => setShowResetCodeModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Generate Reset Code</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Challenge Blob</Form.Label>
            <Form.Control
              as="textarea"
              rows={6}
              value={resetChallengeBlob}
              onChange={(event) => setResetChallengeBlob(event.target.value)}
            />
          </Form.Group>

          {generatedResetCodeBlob && (
            <Form.Group className="mt-3">
              <Form.Label>Signed Reset Code Blob</Form.Label>
              <Form.Control as="textarea" rows={6} value={generatedResetCodeBlob} readOnly />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResetCodeModal(false)}>
            Close
          </Button>
          <Button onClick={() => void handleGenerateResetCode()} disabled={generateResetCodeLoading}>
            {generateResetCodeLoading ? 'Generating...' : 'Generate Reset Code'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DevDashboard;