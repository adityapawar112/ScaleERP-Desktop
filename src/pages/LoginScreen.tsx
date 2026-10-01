// src/pages/LoginScreen.tsx
import React, { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useLicense } from '../context/LicenseContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

interface AuthUser {
  user_id: string;
  username: string;
  license_id: string;
}

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
  onLockedOut: (username: string) => void;
  onForgotPassword: (username: string) => void;
  onDeveloperAccess: () => void;
}

const DEV_SECRET = 'scaleerp-dev-2026';

const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onLockedOut,
  onForgotPassword,
  onDeveloperAccess,
}) => {
  const { t } = useTranslation();
  const { licenseState } = useLicense();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);

  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const [developerSecret, setDeveloperSecret] = useState('');
  const [developerError, setDeveloperError] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    setHelperMessage(null);

    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      setErrorMessage(t('auth.usernamePasswordRequired', 'Username and password are required.'));
      return;
    }

    if (!window.electronAPI?.auth) {
      setErrorMessage(t('auth.electronAuthUnavailable', 'Electron auth API is not available.'));
      return;
    }

    setSubmitting(true);
    try {
      const lockoutStatus = await window.electronAPI.auth.lockoutStatus(normalizedUsername);
      if (lockoutStatus.success && lockoutStatus.lockout?.locked_out) {
        onLockedOut(normalizedUsername);
        return;
      }

      const result = await window.electronAPI.auth.login(normalizedUsername, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
        return;
      }

      if (result.lockout?.locked_out) {
        onLockedOut(normalizedUsername);
        return;
      }

      setErrorMessage(result.message || t('auth.loginFailed', 'Login failed.'));
      if (result.lockout) {
        setHelperMessage(
          t('auth.failedAttemptsCount', {
            defaultValue: 'Failed attempts: {{failed}}/{{max}}',
            failed: result.lockout.failed_attempts,
            max: result.lockout.max_failed_attempts,
          })
        );
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('auth.loginFailed', 'Login failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeveloperAuthenticate = () => {
    setDeveloperError(null);

    if (developerSecret.trim() !== DEV_SECRET) {
      setDeveloperError(t('auth.invalidDevSecret', 'Invalid developer secret.'));
      return;
    }

    try {
      window.sessionStorage.setItem('dev_access_granted', 'true');
      window.sessionStorage.setItem('dev_secret_stored', developerSecret);
    } catch {
      // Ignore storage failures; dashboard fallback guard still exists.
    }

    setShowDeveloperModal(false);
    setDeveloperSecret('');
    onDeveloperAccess();
  };

  const licenseStateText =
    licenseState.state === 'valid' 
      ? t('auth.statusActive', 'Active') 
      : licenseState.state === 'grace' 
        ? t('auth.statusRestricted', 'Restricted') 
        : t('auth.statusInactive', 'Inactive');

  const licenseVariant =
    licenseState.state === 'valid' 
      ? 'success' 
      : licenseState.state === 'grace' 
        ? 'warning' 
        : 'danger';

  return (
    <Container
      fluid
      className="d-flex align-items-center justify-content-center position-relative"
      style={{ minHeight: '100vh', background: '#f5f7fb' }}
    >
      <div className="position-absolute top-0 end-0 p-3">
        <LanguageSwitcher />
      </div>
      <Row className="w-100 justify-content-center">
        <Col md={6} lg={4}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                  <img
                    src="./brand/logomark-icon-green.png"
                    alt="ScaleERP"
                    style={{ width: 36, height: 36, objectFit: 'contain' }}
                  />
                  <span
                    style={{
                      fontFamily: "'Stack Sans Notch', 'Outfit', sans-serif",
                      fontWeight: 800,
                      fontSize: '26px',
                      color: '#171717',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    ScaleERP
                  </span>
                </div>
                <h4
                  className="mb-1"
                  style={{
                    fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: '18px',
                    color: '#1e293b',
                  }}
                >
                  {t('auth.signIn', 'Sign in')}
                </h4>
                <p className="text-muted mb-0" style={{ fontSize: '0.86rem' }}>
                  {t('setup.brandSubtitle', 'Fast billing and inventory management')}
                </p>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-3">
                <small className="text-muted">{t('auth.licenseStatus', 'License status')}</small>
                <Badge bg={licenseVariant}>{licenseStateText}</Badge>
              </div>

              {errorMessage && <Alert variant="danger" className="mb-2">{errorMessage}</Alert>}
              {helperMessage && <Alert variant="warning" className="mb-2">{helperMessage}</Alert>}

              <Form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleLogin();
                }}
              >
                <Form.Group className="mb-3">
                  <Form.Label>{t('auth.username', 'Username')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    disabled={submitting}
                  />
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label>{t('auth.password', 'Password')}</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    disabled={submitting}
                  />
                </Form.Group>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Button
                    variant="link"
                    className="p-0 text-decoration-none"
                    disabled={submitting}
                    onClick={() => onForgotPassword(username.trim())}
                  >
                    {t('auth.forgotPassword', 'Forgot Password?')}
                  </Button>
                  <Button
                    variant="link"
                    className="p-0 text-decoration-none"
                    disabled={submitting}
                    onClick={() => {
                      setDeveloperError(null);
                      setShowDeveloperModal(true);
                    }}
                  >
                    {t('auth.developerAccess', 'Developer Access')}
                  </Button>
                </div>

                <Button type="submit" className="w-100" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      {t('auth.signingIn', 'Signing in...')}
                    </>
                  ) : (
                    t('auth.signIn', 'Sign in')
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal
        show={showDeveloperModal}
        onHide={() => setShowDeveloperModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{t('auth.developerAccess', 'Developer Access')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3" style={{ fontSize: '0.92rem' }}>
            {t('auth.devModalSubtitle', 'Enter developer secret to continue to the Developer Dashboard.')}
          </p>
          {developerError && <Alert variant="danger">{developerError}</Alert>}
          <Form.Group>
            <Form.Label>{t('auth.devSecretLabel', 'Developer Secret')}</Form.Label>
            <Form.Control
              type="password"
              value={developerSecret}
              onChange={(event) => setDeveloperSecret(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleDeveloperAuthenticate();
                }
              }}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeveloperModal(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleDeveloperAuthenticate}>
            {t('common.continue', 'Continue')}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default LoginScreen;