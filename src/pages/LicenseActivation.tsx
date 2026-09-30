import React, { useState } from 'react';
import { useLicense } from '../context/LicenseContext';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import type { LicenseActivationProps } from '../types/license';

interface ExtendedLicenseActivationProps extends LicenseActivationProps {
  onDeveloperAccess?: () => void;
}

const LicenseActivation: React.FC<ExtendedLicenseActivationProps> = ({
  deviceFingerprint,
  onImportSuccess,
  onImportError,
  onDeveloperAccess,
}) => {
  const { importLicense, refreshLicense } = useLicense();
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('paste');
  const [licenseBlob, setLicenseBlob] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const [developerSecret, setDeveloperSecret] = useState('');
  const [developerError, setDeveloperError] = useState<string | null>(null);

  const DEV_SECRET = 'ouro-dev-2026';

  const handleDeveloperAuthenticate = () => {
    setDeveloperError(null);
    if (developerSecret.trim() !== DEV_SECRET) {
      setDeveloperError('Invalid developer secret.');
      return;
    }
    try {
      window.sessionStorage.setItem('dev_access_granted', 'true');
      window.sessionStorage.setItem('dev_secret_stored', developerSecret);
    } catch {
      // Ignore storage failures
    }
    setShowDeveloperModal(false);
    setDeveloperSecret('');
    onDeveloperAccess?.();
  };

  const handleFileImport = async () => {
    if (!window.electronAPI) {
      setImportError('Electron API not available. Please run this app in Electron.');
      return;
    }

    try {
      const result = await window.electronAPI.showOpenDialog({
        title: 'Select License File',
        properties: ['openFile'],
        filters: [
          { name: 'License Files', extensions: ['json', 'lic', 'license'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return;
      }

      // Read file content via Electron IPC to avoid renderer fs access
      const invokeResult = await window.electronAPI.invoke('read-license-file', result.filePaths[0]);
      if (!invokeResult || typeof invokeResult !== 'string') {
        setImportError('Failed to read license file.');
        return;
      }
      processImport(invokeResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read file';
      setImportError(message);
      onImportError?.(message);
    }
  };

  const handlePasteImport = () => {
    if (!licenseBlob.trim()) {
      setImportError('Please enter a license blob.');
      return;
    }
    processImport(licenseBlob);
  };

  const processImport = async (blob: string) => {
    setImporting(true);
    setImportError(null);
    setImportSuccess(false);

    try {
      const success = await importLicense(blob.trim());

      if (success) {
        setImportSuccess(true);
        onImportSuccess?.();
        // Refresh license state to update the rest of the app
        await refreshLicense();
      } else {
        const errorMsg = 'License import failed. Please check the license and try again.';
        setImportError(errorMsg);
        onImportError?.(errorMsg);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during import';
      setImportError(message);
      onImportError?.(message);
    } finally {
      setImporting(false);
    }
  };

  const copyFingerprint = () => {
    if (deviceFingerprint) {
      navigator.clipboard.writeText(deviceFingerprint).catch(() => {});
    }
  };

  const openKeysFolder = async () => {
    if (!window.electronAPI) {
      setImportError('Electron API not available. Please run this app in Electron.');
      return;
    }
    try {
      await window.electronAPI.licensing.openKeysFolder();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open keys folder';
      setImportError(message);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f7fa',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
        }}
      >
        <h2
          style={{
            margin: '0 0 8px',
            fontSize: '24px',
            fontWeight: 600,
            color: '#1a1a1a',
            textAlign: 'center',
          }}
        >
          Activate License
        </h2>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: '14px',
            color: '#666',
            textAlign: 'center',
          }}
        >
          Enter your license key or import a license file to activate ScaleERP.
        </p>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            marginBottom: '16px',
            borderBottom: '2px solid #e5e7eb',
          }}
        >
          <button
            onClick={() => setActiveTab('paste')}
            style={{
              flex: 1,
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: activeTab === 'paste' ? 600 : 400,
              border: 'none',
              borderBottom: activeTab === 'paste' ? '2px solid #2563eb' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'paste' ? '#2563eb' : '#666',
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            Paste License
          </button>
          <button
            onClick={() => setActiveTab('file')}
            style={{
              flex: 1,
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: activeTab === 'file' ? 600 : 400,
              border: 'none',
              borderBottom: activeTab === 'file' ? '2px solid #2563eb' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'file' ? '#2563eb' : '#666',
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            Import File
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'paste' && (
          <div style={{ marginBottom: '16px' }}>
            <textarea
              value={licenseBlob}
              onChange={(e) => setLicenseBlob(e.target.value)}
              placeholder="Paste your license JSON here..."
              rows={6}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                fontFamily: 'monospace',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {activeTab === 'file' && (
          <div
            style={{
              marginBottom: '16px',
              padding: '24px',
              border: '2px dashed #d1d5db',
              borderRadius: '8px',
              textAlign: 'center',
              backgroundColor: '#fafbfc',
            }}
          >
            <p style={{ margin: '0 0 16px', color: '#666', fontSize: '14px' }}>
              Select a license file (.json, .lic, .license)
            </p>
            <button
              onClick={handleFileImport}
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 500,
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Browse Files
            </button>
          </div>
        )}

        {/* Device Fingerprint */}
        {deviceFingerprint && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f0f4f8',
              borderRadius: '6px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px', fontWeight: 500 }}>
              Device Fingerprint
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <code
                style={{
                  flex: 1,
                  fontSize: '11px',
                  color: '#1e293b',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                }}
              >
                {deviceFingerprint}
              </code>
              <button
                onClick={copyFingerprint}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: '#e2e8f0',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#1e293b',
                }}
                title="Copy fingerprint to clipboard"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Open License Keys Folder Button */}
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <button
            onClick={openKeysFolder}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor: '#f8fafc',
              color: '#475569',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Open the folder containing license keys"
          >
            📁 Open License Keys Folder
          </button>
        </div>

        {/* Error/Success Messages */}
        {importError && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '13px',
            }}
          >
            {importError}
          </div>
        )}

        {importSuccess && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              color: '#16a34a',
              fontSize: '13px',
            }}
          >
            License activated successfully! Loading application...
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={activeTab === 'paste' ? handlePasteImport : undefined}
          disabled={importing}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '15px',
            fontWeight: 600,
            backgroundColor: importing ? '#93c5fd' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: importing ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {importing ? 'Importing...' : 'Activate License'}
        </button>

        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
          <button
            onClick={() => {
              setDeveloperError(null);
              setShowDeveloperModal(true);
            }}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              color: '#64748b',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Developer Access
          </button>
        </div>
      </div>

      <Modal show={showDeveloperModal} onHide={() => setShowDeveloperModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Developer Access</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3" style={{ fontSize: '0.92rem' }}>
            Enter developer secret to continue to the Developer Dashboard.
          </p>
          {developerError && <Alert variant="danger">{developerError}</Alert>}
          <Form.Group>
            <Form.Label>Developer Secret</Form.Label>
            <Form.Control
              type="password"
              value={developerSecret}
              onChange={(e) => setDeveloperSecret(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleDeveloperAuthenticate();
                }
              }}
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeveloperModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeveloperAuthenticate}>
            Continue
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default LicenseActivation;