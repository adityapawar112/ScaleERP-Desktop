import React, { useState, useEffect } from 'react';
import { useLicense } from '../context/LicenseContext';
import { Modal, Button, Form, Alert, Card, Spinner, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FiKey,
  FiUser,
  FiPhone,
  FiLock,
  FiCheckCircle,
  FiCopy,
  FiUpload,
  FiShield,
  FiArrowRight,
  FiCheck,
  FiAlertCircle,
} from 'react-icons/fi';
import LanguageSwitcher from '../components/LanguageSwitcher';
import type { LicenseActivationProps } from '../types/license';

interface ExtendedLicenseActivationProps extends LicenseActivationProps {
  initialStep?: 'license' | 'admin_setup';
  hasUsers?: boolean | null;
  onAdminSetupSuccess?: (user?: any) => void;
  onDeveloperAccess?: () => void;
}

const LicenseActivation: React.FC<ExtendedLicenseActivationProps> = ({
  deviceFingerprint,
  initialStep,
  hasUsers: externalHasUsers,
  onImportSuccess,
  onImportError,
  onAdminSetupSuccess,
  onDeveloperAccess,
}) => {
  const { t } = useTranslation();
  const { licenseState, importLicense, refreshLicense } = useLicense();

  // Wizard state: 'license' = Step 1, 'admin_setup' = Step 2
  const [step, setStep] = useState<'license' | 'admin_setup'>(initialStep || 'license');
  const [hasUsers, setHasUsers] = useState<boolean | null>(
    externalHasUsers !== undefined ? externalHasUsers : null
  );

  useEffect(() => {
    if (externalHasUsers !== undefined && externalHasUsers !== null) {
      setHasUsers(externalHasUsers);
      if (initialStep) {
        setStep(initialStep);
      }
    }
  }, [externalHasUsers, initialStep]);

  // Step 1: License Activation State
  const [activeTab, setActiveTab] = useState<'online' | 'offline'>('online');
  const [activationKey, setActivationKey] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [licenseBlob, setLicenseBlob] = useState('');
  const [offlineSubTab, setOfflineSubTab] = useState<'file' | 'paste'>('paste');

  // Touched states for inline validations
  const [keyTouched, setKeyTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [activatedEdition, setActivatedEdition] = useState<string>('Pro');
  const [activatedExpiry, setActivatedExpiry] = useState<string>('');

  // Step 2: Store Administrator Setup State
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [adminCreating, setAdminCreating] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Utility states
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const [developerSecret, setDeveloperSecret] = useState('');
  const [developerError, setDeveloperError] = useState<string | null>(null);

  const DEV_SECRET = 'ouro-dev-2026';

  // Check whether users already exist in SQLite on mount
  useEffect(() => {
    let isMounted = true;
    if (window.electronAPI?.auth?.hasUsers) {
      window.electronAPI.auth
        .hasUsers()
        .then((res) => {
          if (isMounted) {
            setHasUsers(res.hasUsers);
          }
        })
        .catch(() => {
          if (isMounted) {
            setHasUsers(false);
          }
        });
    } else {
      setHasUsers(false);
    }
    return () => {
      isMounted = false;
    };
  }, []);

  // Validation Rules
  const cleanKey = activationKey.trim().toUpperCase();
  const isKeyValid = cleanKey.length === 19; // Formatted XXXX-XXXX-XXXX-XXXX
  const isStoreNameValid = customerName.trim().length >= 2;

  // Phone number sanitization and validation (10 digits, e.g. Indian mobile [6-9]\d{9} or standard 10 digits)
  const digitsOnly = customerPhone.replace(/\D/g, '');
  const rawMobile = digitsOnly.startsWith('91') && digitsOnly.length === 12
    ? digitsOnly.slice(2)
    : digitsOnly.startsWith('0') && digitsOnly.length === 11
    ? digitsOnly.slice(1)
    : digitsOnly;
  const isPhoneValid = /^[6-9]\d{9}$/.test(rawMobile) || /^\d{10}$/.test(rawMobile);

  const isOnlineFormValid = isKeyValid && isStoreNameValid && isPhoneValid;

  // Step 2 validations
  const isAdminUsernameValid = adminUsername.trim().length >= 3;
  const isPasswordValid = adminPassword.length >= 4;
  const doPasswordsMatch = adminPassword.length > 0 && adminPassword === adminConfirmPassword;
  const isAdminFormValid = isAdminUsernameValid && isPasswordValid && doPasswordsMatch;

  // Format 16-character key automatically as XXXX-XXXX-XXXX-XXXX
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const clean = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
    const parts = [];
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.slice(i, i + 4));
    }
    setActivationKey(parts.join('-'));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow digits, spaces, plus sign, dashes
    const filtered = val.replace(/[^\d\s\+\-]/g, '');
    setCustomerPhone(filtered);
  };

  const copyFingerprint = () => {
    if (deviceFingerprint) {
      navigator.clipboard.writeText(deviceFingerprint).catch(() => {});
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
    }
  };

  // Online Activation Handler
  const handleOnlineActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyTouched(true);
    setNameTouched(true);
    setPhoneTouched(true);
    setActivationError(null);

    if (!isKeyValid) {
      setActivationError('Please enter a valid 16-digit activation key.');
      return;
    }

    if (!isStoreNameValid) {
      setActivationError(t('setup.storeNameRequired', 'Please enter your store or business name.'));
      return;
    }

    if (!isPhoneValid) {
      setActivationError(t('setup.invalidPhone', 'Please enter a valid 10-digit mobile number.'));
      return;
    }

    if (!window.electronAPI?.licensing?.activateOnline) {
      setActivationError('Desktop licensing service unavailable. Please check Electron runtime.');
      return;
    }

    setActivating(true);
    try {
      const result = await window.electronAPI.licensing.activateOnline({
        activationKey: cleanKey,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
      });

      if (!result.success) {
        setActivationError(result.message || 'Activation failed. Please check your key or internet connection.');
        return;
      }

      setActivatedEdition(result.edition || 'Pro');
      if (result.validUntil) {
        setActivatedExpiry(
          new Date(result.validUntil).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        );
      }
      // Re-verify whether any users exist in SQLite database
      let usersExist = hasUsers;
      if (window.electronAPI?.auth?.hasUsers) {
        try {
          const uRes = await window.electronAPI.auth.hasUsers();
          usersExist = uRes.hasUsers;
          setHasUsers(uRes.hasUsers);
        } catch {
          // fallback
        }
      }

      setActivationSuccess(true);
      await refreshLicense();

      // If workstation has no admin users yet, advance to Step 2
      if (!usersExist) {
        setTimeout(() => {
          setStep('admin_setup');
          setActivationSuccess(false);
        }, 500);
      } else {
        setTimeout(() => {
          onImportSuccess?.();
        }, 1000);
      }
    } catch (err: any) {
      setActivationError(err.message || 'An unexpected error occurred during activation.');
    } finally {
      setActivating(false);
    }
  };

  // Offline File Browser Handler
  const handleFileImport = async () => {
    if (!window.electronAPI) {
      setActivationError('Electron API not available.');
      return;
    }

    try {
      const result = await window.electronAPI.showOpenDialog({
        title: 'Select ScaleERP License File',
        properties: ['openFile'],
        filters: [
          { name: 'License Files', extensions: ['json', 'lic', 'license'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return;
      }

      const fileContent = await window.electronAPI.invoke('read-license-file', result.filePaths[0]);
      if (!fileContent || typeof fileContent !== 'string') {
        setActivationError('Failed to read license file contents.');
        return;
      }
      await processOfflineImport(fileContent);
    } catch (err: any) {
      setActivationError(err.message || 'Failed to import license file.');
    }
  };

  const processOfflineImport = async (blob: string) => {
    setActivating(true);
    setActivationError(null);

    try {
      const success = await importLicense(blob.trim());
      if (success) {
        setActivationSuccess(true);
        await refreshLicense();

        // Re-verify whether any users exist in SQLite database
        let usersExist = hasUsers;
        if (window.electronAPI?.auth?.hasUsers) {
          try {
            const uRes = await window.electronAPI.auth.hasUsers();
            usersExist = uRes.hasUsers;
            setHasUsers(uRes.hasUsers);
          } catch {
            // fallback
          }
        }

        if (!usersExist) {
          setTimeout(() => {
            setStep('admin_setup');
            setActivationSuccess(false);
          }, 500);
        } else {
          setTimeout(() => {
            onImportSuccess?.();
          }, 1000);
        }
      } else {
        setActivationError('License verification failed. The file may be invalid or generated for a different computer.');
      }
    } catch (err: any) {
      setActivationError(err.message || 'Import error occurred.');
    } finally {
      setActivating(false);
    }
  };

  // Step 2: Administrator Creation Handler
  const handleAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameTouched(true);
    setPasswordTouched(true);
    setConfirmTouched(true);
    setAdminError(null);

    const username = adminUsername.trim().toLowerCase();
    if (!isAdminUsernameValid) {
      setAdminError(t('setup.usernameRequired', 'Username must be at least 3 characters.'));
      return;
    }

    if (!isPasswordValid) {
      setAdminError(t('setup.passwordLengthError', 'Password must be at least 4 characters long.'));
      return;
    }

    if (!doPasswordsMatch) {
      setAdminError(t('setup.passwordMismatch', 'Passwords do not match. Please re-enter.'));
      return;
    }

    if (!window.electronAPI?.auth?.setupInitialAdmin) {
      setAdminError('Administrator setup service is unavailable.');
      return;
    }

    setAdminCreating(true);
    try {
      const storeName = customerName || (licenseState.payload as any)?.customer_name || '';
      const phone = customerPhone || '';

      const result = await window.electronAPI.auth.setupInitialAdmin({
        username,
        password: adminPassword,
        fullName: storeName || undefined,
      });

      if (!result.success) {
        setAdminError(result.message || 'Failed to create administrator account.');
        return;
      }

      // Auto-seed store profile into SQLite so invoice headers and WhatsApp have store info
      if (window.electronAPI?.invoke) {
        try {
          await window.electronAPI.invoke('db:businessSettings:insert', {
            id: 1,
            business_name: storeName || 'My Store',
            address: '',
            proprietor_name: username,
            phone_numbers: phone ? JSON.stringify([phone]) : '[]',
            default_invoice_template: 'standard_a4',
            invoice_accent_color: '#00E600',
          });
        } catch (settingsErr) {
          console.warn('[Onboarding] Auto-seed business settings non-critical error:', settingsErr);
        }
      }

      // Live Tutorial Hook: Mark onboarding completed & tutorial pending
      try {
        localStorage.setItem('scaleerp_onboarding_completed', 'true');
        localStorage.setItem('scaleerp_tutorial_status', 'pending');
        sessionStorage.setItem('scaleerp_fresh_install', 'true');
      } catch {
        // ignore storage errors
      }

      setHasUsers(true);
      await refreshLicense();
      if (onAdminSetupSuccess) {
        onAdminSetupSuccess(result.user);
      } else {
        onImportSuccess?.();
      }
    } catch (err: any) {
      setAdminError(err.message || 'An unexpected error occurred during user configuration.');
    } finally {
      setAdminCreating(false);
    }
  };

  // Developer Backdoor Authenticate
  const handleDeveloperAuthenticate = () => {
    setDeveloperError(null);
    if (developerSecret.trim() !== DEV_SECRET && developerSecret.trim() !== 'scaleerp-dev-2026') {
      setDeveloperError('Invalid developer secret.');
      return;
    }
    try {
      window.sessionStorage.setItem('dev_access_granted', 'true');
      window.sessionStorage.setItem('dev_secret_stored', developerSecret);
    } catch {
      // Ignore storage errors
    }
    setShowDeveloperModal(false);
    setDeveloperSecret('');
    onDeveloperAccess?.();
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center position-relative"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f7fb',
        padding: '24px 16px',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* High-Contrast Language Switcher in Top Right */}
      <div className="position-absolute top-0 end-0 p-3 z-3">
        <LanguageSwitcher />
      </div>

      <div style={{ maxWidth: '540px', width: '100%' }}>
        {/* Main Card */}
        <Card className="shadow-sm border-0" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          {/* Card Top Brand Accent Bar */}
          <div style={{ height: '5px', background: 'linear-gradient(90deg, #00E600 0%, #00B800 100%)' }} />

          <Card.Body className="p-4 p-sm-5">
            {/* Header: Brand Mark + Brand Headline */}
            <div className="text-center mb-4">
              <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                <img
                  src="./brand/logomark-icon-green.png"
                  alt="ScaleERP"
                  style={{ width: 38, height: 38, objectFit: 'contain' }}
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
                {step === 'license' ? t('setup.licenseTitle', 'Activate ScaleERP') : t('setup.adminTitle', 'Create Administrator Account')}
              </h4>
              <p className="text-muted mb-0" style={{ fontSize: '0.86rem' }}>
                {step === 'license'
                  ? t('setup.licenseSubtitle', 'Enter your store details and license key to begin.')
                  : t('setup.adminSubtitle', 'Set up your login password to use ScaleERP on this computer.')}
              </p>
            </div>

            {/* Modern Step Progress Stepper */}
            <div className="d-flex align-items-center justify-content-center gap-2 mb-4">
              <div
                className="px-3 py-1.5 rounded-pill d-flex align-items-center gap-1.5"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: step === 'license' ? '#D9FBD9' : '#f1f5f9',
                  color: step === 'license' ? '#008A00' : '#64748b',
                  border: step === 'license' ? '1px solid #99F599' : '1px solid #e2e8f0',
                }}
              >
                {step === 'admin_setup' ? <FiCheck size={13} /> : <span>1.</span>}
                <span>{t('setup.step1', '1. Activate License')}</span>
              </div>
              <span className="text-muted" style={{ fontSize: '13px' }}>→</span>
              <div
                className="px-3 py-1.5 rounded-pill d-flex align-items-center gap-1.5"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: step === 'admin_setup' ? '#D9FBD9' : '#f8fafc',
                  color: step === 'admin_setup' ? '#008A00' : '#94a3b8',
                  border: step === 'admin_setup' ? '1px solid #99F599' : '1px solid #e2e8f0',
                }}
              >
                <span>2.</span>
                <span>{t('setup.step2', '2. Admin Account')}</span>
              </div>
            </div>

            {/* ================= STEP 1: LICENSE ACTIVATION ================= */}
            {step === 'license' && (
              <>
                {/* Mode Selector Tabs */}
                <div
                  className="d-flex p-1 mb-4 rounded"
                  style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab('online')}
                    className="flex-fill btn btn-sm border-0 d-flex align-items-center justify-content-center gap-1.5"
                    style={{
                      borderRadius: '8px',
                      backgroundColor: activeTab === 'online' ? '#ffffff' : 'transparent',
                      color: activeTab === 'online' ? '#171717' : '#64748b',
                      boxShadow: activeTab === 'online' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                      fontWeight: activeTab === 'online' ? 600 : 500,
                      padding: '8px 12px',
                      fontSize: '13px',
                    }}
                  >
                    <span>{t('setup.onlineTab', 'Online Activation')}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        backgroundColor: activeTab === 'online' ? '#D9FBD9' : '#e2e8f0',
                        color: activeTab === 'online' ? '#008A00' : '#64748b',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontWeight: 600,
                      }}
                    >
                      {t('setup.recommended', 'Recommended')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('offline')}
                    className="flex-fill btn btn-sm border-0"
                    style={{
                      borderRadius: '8px',
                      backgroundColor: activeTab === 'offline' ? '#ffffff' : 'transparent',
                      color: activeTab === 'offline' ? '#171717' : '#64748b',
                      boxShadow: activeTab === 'offline' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                      fontWeight: activeTab === 'offline' ? 600 : 500,
                      padding: '8px 12px',
                      fontSize: '13px',
                    }}
                  >
                    {t('setup.offlineTab', 'Offline License (.lic)')}
                  </button>
                </div>

                {activationError && (
                  <Alert variant="danger" className="py-2.5 px-3 mb-3 d-flex align-items-center gap-2" style={{ fontSize: '13px', borderRadius: '10px' }}>
                    <FiAlertCircle size={16} className="flex-shrink-0" />
                    <div>{activationError}</div>
                  </Alert>
                )}

                {activationSuccess && (
                  <Alert variant="success" className="py-2.5 px-3 mb-3 d-flex align-items-center gap-2" style={{ fontSize: '13px', borderRadius: '10px' }}>
                    <FiCheckCircle className="text-success flex-shrink-0" size={18} />
                    <div>
                      <strong>{t('setup.activationSuccess', 'License Activated! Bound to this device.')}</strong>
                      <div className="text-muted" style={{ fontSize: '12px' }}>
                        {hasUsers === false ? t('setup.adminSubtitle', 'Proceeding to account setup...') : t('setup.launching', 'Launching ScaleERP...')}
                      </div>
                    </div>
                  </Alert>
                )}

                {/* Tab A: Online Activation */}
                {activeTab === 'online' && (
                  <Form onSubmit={handleOnlineActivation}>
                    {/* Key Input */}
                    <Form.Group className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <Form.Label className="text-muted text-uppercase font-weight-bold d-flex align-items-center gap-1.5 mb-0" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                          <FiKey size={13} /> {t('setup.keyLabel', '16-Digit License Key')}
                        </Form.Label>
                        {isKeyValid && (
                          <span className="text-success d-flex align-items-center gap-1" style={{ fontSize: '11px', fontWeight: 600 }}>
                            <FiCheck size={12} /> 16 Digits
                          </span>
                        )}
                      </div>
                      <Form.Control
                        type="text"
                        value={activationKey}
                        onChange={handleKeyChange}
                        onBlur={() => setKeyTouched(true)}
                        placeholder={t('setup.keyPlaceholder', 'DEMO-XXXX-XXXX-XXXX')}
                        disabled={activating || activationSuccess}
                        maxLength={19}
                        className="text-center font-monospace font-weight-bold"
                        style={{
                          fontSize: '17px',
                          letterSpacing: '0.12em',
                          padding: '12px',
                          borderRadius: '10px',
                          borderColor: keyTouched && !isKeyValid ? '#ef4444' : isKeyValid ? '#10b981' : '#cbd5e1',
                          backgroundColor: '#ffffff',
                        }}
                        required
                        autoFocus
                      />
                      {keyTouched && !isKeyValid && (
                        <div className="text-danger mt-1" style={{ fontSize: '11px' }}>
                          Please enter the full 16-character license key (format: XXXX-XXXX-XXXX-XXXX).
                        </div>
                      )}
                    </Form.Group>

                    {/* Customer & Phone Grid with Real-Time Validation */}
                    <Row className="g-3 mb-3">
                      <Col sm={6}>
                        <Form.Group>
                          <Form.Label className="text-muted text-uppercase font-weight-bold d-flex align-items-center gap-1.5 mb-1" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                            <FiUser size={13} /> {t('setup.storeNameLabel', 'Store / Retailer Name')}
                          </Form.Label>
                          <Form.Control
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            onBlur={() => setNameTouched(true)}
                            placeholder={t('setup.storeNamePlaceholder', 'e.g. Kisan Agro Agency')}
                            disabled={activating || activationSuccess}
                            style={{
                              borderRadius: '10px',
                              fontSize: '13px',
                              padding: '10px 12px',
                              borderColor: nameTouched && !isStoreNameValid ? '#ef4444' : isStoreNameValid ? '#10b981' : '#cbd5e1',
                            }}
                            required
                          />
                          {nameTouched && !isStoreNameValid && (
                            <div className="text-danger mt-1" style={{ fontSize: '11px' }}>
                              {t('setup.storeNameRequired', 'Store name is required.')}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                      <Col sm={6}>
                        <Form.Group>
                          <Form.Label className="text-muted text-uppercase font-weight-bold d-flex align-items-center gap-1.5 mb-1" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                            <FiPhone size={13} /> {t('setup.phoneLabel', 'Contact Mobile Number')}
                          </Form.Label>
                          <Form.Control
                            type="tel"
                            value={customerPhone}
                            onChange={handlePhoneChange}
                            onBlur={() => setPhoneTouched(true)}
                            placeholder={t('setup.phonePlaceholder', 'e.g. 9876543210')}
                            disabled={activating || activationSuccess}
                            maxLength={15}
                            style={{
                              borderRadius: '10px',
                              fontSize: '13px',
                              padding: '10px 12px',
                              borderColor: phoneTouched && !isPhoneValid ? '#ef4444' : isPhoneValid ? '#10b981' : '#cbd5e1',
                            }}
                            required
                          />
                          {phoneTouched && !isPhoneValid && (
                            <div className="text-danger mt-1" style={{ fontSize: '11px' }}>
                              {t('setup.invalidPhone', 'Enter a valid 10-digit mobile number.')}
                            </div>
                          )}
                          {isPhoneValid && (
                            <div className="text-success mt-1 d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                              <FiCheck size={11} /> {t('setup.validPhone', 'Valid 10-digit mobile number')}
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                    </Row>

                    {/* Machine ID Note (Clean and Subtle) */}
                    <div
                      className="d-flex align-items-center justify-content-between p-2.5 mb-3 rounded"
                      style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '11px' }}
                    >
                      <div className="d-flex align-items-center gap-1.5 text-muted">
                        <FiShield size={13} className="text-success flex-shrink-0" />
                        <span>{t('setup.machineId', 'Machine ID')}:</span>
                        <code className="text-dark font-monospace" style={{ fontSize: '11px' }}>
                          {deviceFingerprint ? `${deviceFingerprint.slice(0, 10)}...${deviceFingerprint.slice(-6)}` : 'Detecting...'}
                        </code>
                        <span className="text-muted d-none d-sm-inline" style={{ fontSize: '10px' }}>
                          ({t('setup.autoBound', 'Bound to this PC')})
                        </span>
                      </div>
                      <Button
                        variant="link"
                        onClick={copyFingerprint}
                        className="p-0 text-decoration-none d-flex align-items-center gap-1"
                        style={{ fontSize: '11px', color: copiedFingerprint ? '#10b981' : '#008A00', fontWeight: 600 }}
                      >
                        {copiedFingerprint ? <FiCheck size={12} /> : <FiCopy size={12} />}
                        <span>{copiedFingerprint ? t('setup.copied', 'Copied') : t('setup.copy', 'Copy')}</span>
                      </Button>
                    </div>

                    {/* Activation Button */}
                    <Button
                      type="submit"
                      disabled={activating || !isOnlineFormValid || activationSuccess}
                      className="w-100 py-3 font-weight-bold border-0 shadow-sm d-flex align-items-center justify-content-center gap-2"
                      style={{
                        backgroundColor: isOnlineFormValid ? '#00E600' : '#e2e8f0',
                        color: isOnlineFormValid ? '#171717' : '#94a3b8',
                        borderRadius: '12px',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: isOnlineFormValid ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {activating ? (
                        <>
                          <Spinner animation="border" size="sm" />
                          <span>{t('setup.activating', 'Verifying & Activating...')}</span>
                        </>
                      ) : (
                        <>
                          <span>{t('setup.activateBtn', 'Activate License')}</span>
                          <FiArrowRight size={16} />
                        </>
                      )}
                    </Button>
                  </Form>
                )}

                {/* Tab B: Offline License File Import */}
                {activeTab === 'offline' && (
                  <div className="space-y-3">
                    <div className="d-flex gap-2 mb-3">
                      <Button
                        size="sm"
                        variant={offlineSubTab === 'paste' ? 'primary' : 'outline-secondary'}
                        onClick={() => setOfflineSubTab('paste')}
                        className="flex-fill"
                        style={{
                          borderRadius: '8px',
                          backgroundColor: offlineSubTab === 'paste' ? '#171717' : 'transparent',
                          borderColor: offlineSubTab === 'paste' ? '#171717' : '#cbd5e1',
                          color: offlineSubTab === 'paste' ? '#ffffff' : '#64748b',
                          fontWeight: 600,
                          fontSize: '12px',
                          padding: '7px',
                        }}
                      >
                        {t('setup.offlinePaste', 'Paste License Key')}
                      </Button>
                      <Button
                        size="sm"
                        variant={offlineSubTab === 'file' ? 'primary' : 'outline-secondary'}
                        onClick={() => setOfflineSubTab('file')}
                        className="flex-fill"
                        style={{
                          borderRadius: '8px',
                          backgroundColor: offlineSubTab === 'file' ? '#171717' : 'transparent',
                          borderColor: offlineSubTab === 'file' ? '#171717' : '#cbd5e1',
                          color: offlineSubTab === 'file' ? '#ffffff' : '#64748b',
                          fontWeight: 600,
                          fontSize: '12px',
                          padding: '7px',
                        }}
                      >
                        {t('setup.offlineFile', 'Choose File (.lic)')}
                      </Button>
                    </div>

                    {offlineSubTab === 'file' ? (
                      <div
                        className="text-center p-4 rounded mb-3"
                        style={{ border: '2px dashed #cbd5e1', backgroundColor: '#f8fafc' }}
                      >
                        <FiUpload size={32} className="text-muted mb-2" />
                        <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
                          {t('setup.selectFileNote', 'Select your scaleerp.lic file provided by your administrator.')}
                        </p>
                        <Button
                          variant="secondary"
                          onClick={handleFileImport}
                          disabled={activating || activationSuccess}
                          className="px-4 py-2 text-white font-weight-bold"
                          style={{ borderRadius: '8px', fontSize: '13px', backgroundColor: '#334155', border: 'none' }}
                        >
                          {t('setup.browseBtn', 'Browse License File (.lic)')}
                        </Button>
                      </div>
                    ) : (
                      <div className="mb-3">
                        <Form.Control
                          as="textarea"
                          rows={4}
                          value={licenseBlob}
                          onChange={(e) => setLicenseBlob(e.target.value)}
                          placeholder={t('setup.pastePlaceholder', 'Paste your license key or text here...')}
                          disabled={activating || activationSuccess}
                          className="font-monospace"
                          style={{ fontSize: '12px', borderRadius: '10px' }}
                        />
                        <Button
                          onClick={() => processOfflineImport(licenseBlob)}
                          disabled={activating || !licenseBlob.trim() || activationSuccess}
                          className="w-100 mt-3 py-2.5 font-weight-bold border-0"
                          style={{
                            borderRadius: '10px',
                            backgroundColor: licenseBlob.trim() ? '#00E600' : '#e2e8f0',
                            color: licenseBlob.trim() ? '#171717' : '#94a3b8',
                            cursor: licenseBlob.trim() ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {activating ? t('setup.activating', 'Verifying...') : t('setup.importBtn', 'Import & Activate')}
                        </Button>
                      </div>
                    )}

                    <div className="p-3 rounded" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-dark font-weight-bold d-flex align-items-center gap-1.5">
                          <FiShield size={13} className="text-success" /> {t('setup.machineId', 'Machine ID')}:
                        </span>
                        <Button variant="link" onClick={copyFingerprint} className="p-0 text-decoration-none d-flex align-items-center gap-1" style={{ fontSize: '11px', color: copiedFingerprint ? '#10b981' : '#008A00', fontWeight: 600 }}>
                          {copiedFingerprint ? <FiCheck size={12} /> : <FiCopy size={12} />}
                          <span>{copiedFingerprint ? t('setup.copied', 'Copied') : t('setup.copy', 'Copy')}</span>
                        </Button>
                      </div>
                      <code className="text-truncate d-block p-1.5 bg-white rounded border text-muted" style={{ fontSize: '10px', wordBreak: 'break-all' }}>
                        {deviceFingerprint}
                      </code>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ================= STEP 2: STORE ADMINISTRATOR SETUP ================= */}
            {step === 'admin_setup' && (
              <Form onSubmit={handleAdminSetup}>
                {/* Verified License Banner */}
                <div
                  className="p-3 mb-4 rounded d-flex align-items-center gap-3"
                  style={{ backgroundColor: '#D9FBD9', border: '1px solid #99F599' }}
                >
                  <FiCheckCircle className="text-success flex-shrink-0" size={24} />
                  <div>
                    <div className="font-weight-bold text-dark" style={{ fontSize: '13px' }}>
                      {t('setup.licenseVerified', 'License Activated')} ({activatedEdition || (licenseState.payload as any)?.edition || licenseState.edition || 'Pro'} Edition)
                    </div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      {activatedExpiry || (licenseState.expiresAt ? new Date(licenseState.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : (licenseState.payload as any)?.valid_until ? new Date((licenseState.payload as any).valid_until).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : null)
                        ? `${t('setup.validUntil', 'Valid until')} ${activatedExpiry || (licenseState.expiresAt ? new Date(licenseState.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : new Date((licenseState.payload as any).valid_until).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }))}`
                        : t('setup.activeBound', 'Active & Bound')}
                    </div>
                  </div>
                </div>

                {adminError && (
                  <Alert variant="danger" className="py-2.5 px-3 mb-3 d-flex align-items-center gap-2" style={{ fontSize: '13px', borderRadius: '10px' }}>
                    <FiAlertCircle size={16} className="flex-shrink-0" />
                    <div>{adminError}</div>
                  </Alert>
                )}

                <Form.Group className="mb-3">
                  <Form.Label className="text-muted text-uppercase font-weight-bold d-flex align-items-center gap-1.5" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                    <FiUser size={13} /> {t('setup.adminUsernameLabel', 'Administrator Username')}
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    onBlur={() => setUsernameTouched(true)}
                    placeholder="admin"
                    disabled={adminCreating}
                    style={{
                      borderRadius: '10px',
                      fontSize: '14px',
                      padding: '10px 12px',
                      borderColor: usernameTouched && !isAdminUsernameValid ? '#ef4444' : '#cbd5e1',
                    }}
                    required
                  />
                  <Form.Text className="text-muted" style={{ fontSize: '11px' }}>
                    {t('setup.adminUsernameNote', 'Default master login for this computer.')}
                  </Form.Text>
                  {usernameTouched && !isAdminUsernameValid && (
                    <div className="text-danger mt-1" style={{ fontSize: '11px' }}>
                      {t('setup.usernameRequired', 'Username must be at least 3 characters.')}
                    </div>
                  )}
                </Form.Group>

                <Row className="g-3 mb-4">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="text-muted text-uppercase font-weight-bold d-flex align-items-center gap-1.5" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                        <FiLock size={13} /> {t('setup.passwordLabel', 'Password')}
                      </Form.Label>
                      <Form.Control
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        onBlur={() => setPasswordTouched(true)}
                        placeholder="••••••••"
                        disabled={adminCreating}
                        minLength={4}
                        style={{
                          borderRadius: '10px',
                          fontSize: '14px',
                          padding: '10px 12px',
                          borderColor: passwordTouched && !isPasswordValid ? '#ef4444' : '#cbd5e1',
                        }}
                        required
                        autoFocus
                      />
                      {passwordTouched && !isPasswordValid && (
                        <div className="text-danger mt-1" style={{ fontSize: '11px' }}>
                          {t('setup.passwordLengthError', 'Password must be at least 4 characters long.')}
                        </div>
                      )}
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="text-muted text-uppercase font-weight-bold d-flex align-items-center gap-1.5" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                        <FiLock size={13} /> {t('setup.confirmPasswordLabel', 'Confirm Password')}
                      </Form.Label>
                      <Form.Control
                        type="password"
                        value={adminConfirmPassword}
                        onChange={(e) => setAdminConfirmPassword(e.target.value)}
                        onBlur={() => setConfirmTouched(true)}
                        placeholder="••••••••"
                        disabled={adminCreating}
                        minLength={4}
                        style={{
                          borderRadius: '10px',
                          fontSize: '14px',
                          padding: '10px 12px',
                          borderColor: confirmTouched && !doPasswordsMatch ? '#ef4444' : doPasswordsMatch ? '#10b981' : '#cbd5e1',
                        }}
                        required
                      />
                      {confirmTouched && !doPasswordsMatch && (
                        <div className="text-danger mt-1" style={{ fontSize: '11px' }}>
                          {t('setup.passwordMismatch', 'Passwords do not match.')}
                        </div>
                      )}
                      {doPasswordsMatch && (
                        <div className="text-success mt-1 d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                          <FiCheck size={11} /> {t('setup.passwordsMatch', 'Passwords match')}
                        </div>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <Button
                  type="submit"
                  disabled={adminCreating || !isAdminFormValid}
                  className="w-100 py-3 font-weight-bold border-0 shadow-sm d-flex align-items-center justify-content-center gap-2"
                  style={{
                    backgroundColor: isAdminFormValid ? '#00E600' : '#e2e8f0',
                    color: isAdminFormValid ? '#171717' : '#94a3b8',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: isAdminFormValid ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {adminCreating ? (
                    <>
                      <Spinner animation="border" size="sm" />
                      <span>{t('setup.configuring', 'Setting up account...')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('setup.finishBtn', 'Finish Setup & Open ScaleERP')}</span>
                      <FiArrowRight size={16} />
                    </>
                  )}
                </Button>
              </Form>
            )}

            {/* Subtle Developer & Support Footer */}
            <div className="mt-4 pt-3 text-center border-top" style={{ borderColor: '#f1f5f9' }}>
              <button
                type="button"
                onClick={() => {
                  setDeveloperError(null);
                  setShowDeveloperModal(true);
                }}
                className="btn btn-link p-0 text-muted text-decoration-none"
                style={{ fontSize: '11px', opacity: 0.7 }}
              >
                {t('setup.devAccess', 'Developer Diagnostic Access')}
              </button>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Developer Access Modal */}
      <Modal show={showDeveloperModal} onHide={() => setShowDeveloperModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '18px', fontWeight: 600 }}>Developer Access</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
            Enter developer secret key to access diagnostics and direct database management.
          </p>
          {developerError && <Alert variant="danger" className="py-2 text-xs">{developerError}</Alert>}
          <Form.Group>
            <Form.Label style={{ fontSize: '12px', fontWeight: 600 }}>Developer Secret</Form.Label>
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
          <Button variant="secondary" size="sm" onClick={() => setShowDeveloperModal(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleDeveloperAuthenticate}
            style={{ backgroundColor: '#00E600', color: '#171717', border: 'none', fontWeight: 600 }}
          >
            Authenticate
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default LicenseActivation;