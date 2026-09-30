// src/pages/LockoutScreen.tsx
import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Container, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

interface LockoutScreenProps {
  username: string;
  onBackToLogin: () => void;
  onStartReset: (username: string) => void;
}

const LockoutScreen: React.FC<LockoutScreenProps> = ({ username, onBackToLogin, onStartReset }) => {
  const { t } = useTranslation();
  const [failedAttempts, setFailedAttempts] = useState<number | null>(null);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchLockout = async () => {
      if (!username || !window.electronAPI?.auth) {
        return;
      }

      setLoadingStatus(true);
      setStatusError(null);

      try {
        const result = await window.electronAPI.auth.lockoutStatus(username);
        if (!mounted) {
          return;
        }

        if (!result.success || !result.lockout) {
          setStatusError(result.message || 'Could not read lockout status.');
          return;
        }

        setFailedAttempts(result.lockout.failed_attempts);
        setMaxAttempts(result.lockout.max_failed_attempts);
      } catch (error) {
        if (mounted) {
          setStatusError(error instanceof Error ? error.message : 'Failed to fetch lockout status.');
        }
      } finally {
        if (mounted) {
          setLoadingStatus(false);
        }
      }
    };

    void fetchLockout();

    return () => {
      mounted = false;
    };
  }, [username]);

  return (
    <Container fluid className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f7f8fc' }}>
      <Row className="w-100 justify-content-center">
        <Col md={7} lg={5}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-4 text-center">
              <div style={{ fontSize: 42, marginBottom: 12 }}>🔒</div>
              <h4 className="mb-2">{t('auth.accountLocked', 'Account Locked')}</h4>
              <p className="text-muted mb-3">
                {t('auth.theAccount', 'The account')} <strong>{username || t('common.unknown', 'unknown')}</strong> {t('auth.lockoutReason', 'is currently locked due to repeated failed sign-in attempts.')}
              </p>

              {loadingStatus && (
                <div className="mb-3">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <small>{t('auth.checkingLockout', 'Checking lockout details...')}</small>
                </div>
              )}

              {statusError && <Alert variant="danger">{statusError}</Alert>}

              {!loadingStatus && !statusError && (
                <Alert variant="warning" className="text-start">
                  <div><strong>{t('auth.failedAttempts', 'Failed attempts:')}</strong> {failedAttempts ?? t('invoice.nA', 'N/A')}</div>
                  <div><strong>{t('auth.allowedAttempts', 'Allowed attempts:')}</strong> {maxAttempts ?? t('invoice.nA', 'N/A')}</div>
                  <div className="mt-2">
                    {t('auth.contactSupportUnlock', 'Contact support to unlock the account or proceed with password reset.')}
                  </div>
                </Alert>
              )}

              <div className="d-flex gap-2 justify-content-center mt-3">
                <Button variant="secondary" onClick={onBackToLogin}>
                  {t('auth.backToLogin', 'Back to Login')}
                </Button>
                <Button variant="primary" onClick={() => onStartReset(username)}>
                  {t('auth.resetPassword', 'Reset Password')}
                </Button>
              </div>

              <small className="text-muted d-block mt-3">
                {t('auth.supportContactHelp', 'Support contact: use your organization helpdesk process for account unlock.')}
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LockoutScreen;