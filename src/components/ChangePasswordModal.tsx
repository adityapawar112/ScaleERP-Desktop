// src/components/ChangePasswordModal.tsx
import React, { useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, ProgressBar } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { evaluatePasswordStrength } from '../utils/passwordStrength';

interface ChangePasswordModalProps {
  show: boolean;
  username: string;
  onHide: () => void;
  onSuccess?: (message: string) => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ show, username, onHide, onSuccess }) => {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const strength = useMemo(() => evaluatePasswordStrength(newPassword), [newPassword]);

  const resetLocalState = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSubmitting(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    resetLocalState();
    onHide();
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage('New password must be different from current password.');
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
    try {
      const result = await window.electronAPI.auth.changePassword(username, currentPassword, newPassword);
      if (!result.success) {
        setErrorMessage(result.message || 'Failed to change password.');
        return;
      }

      setSuccessMessage(result.message || 'Password changed successfully.');
      onSuccess?.(result.message || 'Password changed successfully.');

      setTimeout(() => {
        handleClose();
      }, 900);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={submitting ? () => {} : handleClose} centered>
      <Modal.Header closeButton={!submitting}>
        <Modal.Title>{t('auth.changePasswordTitle', 'Change Password')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-3" style={{ fontSize: '0.92rem' }}>
          {t('auth.signedInAs', 'Signed in as')} <strong>{username}</strong>
        </p>

        {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>{t('auth.currentPassword', 'Current Password')}</Form.Label>
            <Form.Control
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={submitting}
              autoComplete="current-password"
            />
          </Form.Group>

          <Form.Group className="mb-2">
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
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={submitting}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? t('auth.updating', 'Updating...') : t('auth.updatePassword', 'Update Password')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ChangePasswordModal;