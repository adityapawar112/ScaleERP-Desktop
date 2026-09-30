// src/components/PasswordResetModal.tsx
import React, { useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, ProgressBar } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { evaluatePasswordStrength } from '../utils/passwordStrength';

interface PasswordResetModalProps {
  show: boolean;
  defaultUsername?: string;
  onHide: () => void;
  onSuccess?: (message: string) => void;
}

type ResetStep = 'request' | 'apply';

type VerifyResetResponse = Awaited<
  ReturnType<NonNullable<Window['electronAPI']>['auth']['verifyResetCode']>
>;

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  show,
  defaultUsername = '',
  onHide,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<ResetStep>('request');
  const [username, setUsername] = useState(defaultUsername);
  const [challengeBlob, setChallengeBlob] = useState('');
  const [resetCodeBlob, setResetCodeBlob] = useState('');
  const [verification, setVerification] = useState<VerifyResetResponse | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [workingMessage, setWorkingMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const strength = useMemo(() => evaluatePasswordStrength(newPassword), [newPassword]);

  const resetState = () => {
    setStep('request');
    setUsername(defaultUsername);
    setChallengeBlob('');
    setResetCodeBlob('');
    setVerification(null);
    setNewPassword('');
    setConfirmPassword('');
    setSubmitting(false);
    setWorkingMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    resetState();
    onHide();
  };

  const handleRequestChallenge = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setWorkingMessage(null);

    if (!username.trim()) {
      setErrorMessage('Username is required.');
      return;
    }

    if (!window.electronAPI?.auth) {
      setErrorMessage('Electron auth API is not available.');
      return;
    }

    setSubmitting(true);
    setWorkingMessage('Generating reset challenge...');
    try {
      const blob = await window.electronAPI.auth.requestReset(username.trim());
      setChallengeBlob(blob);
      setStep('apply');
      setWorkingMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate reset challenge.');
      setWorkingMessage(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyResetCode = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!resetCodeBlob.trim()) {
      setErrorMessage('Reset code is required.');
      return;
    }

    if (!window.electronAPI?.auth) {
      setErrorMessage('Electron auth API is not available.');
      return;
    }

    setSubmitting(true);
    setWorkingMessage('Verifying reset code...');
    try {
      const result = await window.electronAPI.auth.verifyResetCode(resetCodeBlob.trim());
      setVerification(result);

      if (!result.success || !result.valid) {
        setErrorMessage(result.reason || 'Reset code verification failed.');
      } else {
        setSuccessMessage('Reset code verified. You can set a new password now.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to verify reset code.');
    } finally {
      setWorkingMessage(null);
      setSubmitting(false);
    }
  };

  const handleApplyReset = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!verification?.valid || !verification.success) {
      setErrorMessage('Please verify a valid reset code before applying reset.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setErrorMessage('New password and confirmation are required.');
      return;
    }

    if (!newPassword || newPassword !== confirmPassword) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }

    if (strength.score < 3) {
      setErrorMessage('Please choose a stronger password before continuing.');
      return;
    }

    if (!window.electronAPI?.auth) {
      setErrorMessage('Electron auth API is not available.');
      return;
    }

    setSubmitting(true);
    setWorkingMessage('Applying password reset...');
    try {
      const result = await window.electronAPI.auth.performReset(resetCodeBlob.trim(), newPassword);
      if (!result.success) {
        setErrorMessage(result.message || 'Password reset failed.');
        return;
      }

      setSuccessMessage(result.message || 'Password reset successful.');
      onSuccess?.(result.message || 'Password reset successful.');

      setTimeout(() => {
        handleClose();
      }, 900);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to apply password reset.');
    } finally {
      setWorkingMessage(null);
      setSubmitting(false);
    }
  };

  const expiresAtText =
    verification?.expiresAt && Number.isFinite(verification.expiresAt)
      ? new Date(verification.expiresAt).toLocaleString()
      : null;

  return (
    <Modal show={show} onHide={submitting ? () => {} : handleClose} centered size="lg">
      <Modal.Header closeButton={!submitting}>
        <Modal.Title>{t('auth.passwordResetTitle', 'Password Reset')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
          Offline flow: request challenge → share with support → paste signed reset code → set new password.
        </p>

        {workingMessage && <Alert variant="info">{workingMessage}</Alert>}
        {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}

        <div className="mb-3">
          <strong>{t('auth.step1Challenge', 'Step 1: Generate Reset Challenge')}</strong>
          <Form.Group className="mt-2">
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={submitting || step !== 'request'}
              placeholder="Enter username"
            />
          </Form.Group>
          <div className="mt-2">
            <Button variant="outline-primary" onClick={handleRequestChallenge} disabled={submitting || step !== 'request'}>
              Generate Challenge
            </Button>
          </div>
          {challengeBlob && (
            <Form.Group className="mt-3">
              <Form.Label>Challenge Blob (share with support)</Form.Label>
              <Form.Control as="textarea" rows={4} value={challengeBlob} readOnly />
            </Form.Group>
          )}
        </div>

        <hr />

        <div className="mb-3">
          <strong>{t('auth.step2Verify', 'Step 2: Verify Support Reset Code')}</strong>
          <Form.Group className="mt-2">
            <Form.Label>Reset Code Blob</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={resetCodeBlob}
              onChange={(event) => setResetCodeBlob(event.target.value)}
              disabled={submitting || step !== 'apply'}
              placeholder="Paste signed reset code from support"
            />
          </Form.Group>
          <div className="mt-2">
            <Button variant="outline-secondary" onClick={handleVerifyResetCode} disabled={submitting || step !== 'apply'}>
              {t('auth.verifyCode', 'Verify Reset Code')}
            </Button>
          </div>

          {verification?.valid && verification.success && (
            <Alert variant="secondary" className="mt-3 mb-0">
              <div><strong>Verified user:</strong> {verification.username || 'Unknown'}</div>
              <div><strong>License ID:</strong> {verification.licenseId || 'Unknown'}</div>
              {expiresAtText && <div><strong>Code expires at:</strong> {expiresAtText}</div>}
            </Alert>
          )}
        </div>

        <hr />

        <div>
          <strong>{t('auth.step3SetPassword', 'Step 3: Set New Password')}</strong>
          <Form.Group className="mt-2 mb-2">
            <Form.Label>{t('auth.newPassword', 'New Password')}</Form.Label>
            <Form.Control
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={submitting}
              autoComplete="new-password"
            />
          </Form.Group>

          {newPassword.length > 0 && (
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <small>{t('auth.passwordStrength', 'Password strength:')} {strength.label}</small>
                <small>{strength.percent}%</small>
              </div>
              <ProgressBar now={strength.percent} variant={strength.variant} />
              {strength.suggestions.length > 0 && (
                <ul className="mb-0 mt-2 ps-3 text-muted" style={{ fontSize: '0.82rem' }}>
                  {strength.suggestions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <Form.Group className="mb-1">
            <Form.Label>{t('auth.confirmNewPassword', 'Confirm New Password')}</Form.Label>
            <Form.Control
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={submitting}
              autoComplete="new-password"
            />
          </Form.Group>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={submitting}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button variant="primary" onClick={handleApplyReset} disabled={submitting}>
          {submitting ? t('common.processing', 'Processing...') : t('auth.applyReset', 'Apply Reset')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PasswordResetModal;