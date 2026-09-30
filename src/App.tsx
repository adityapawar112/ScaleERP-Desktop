// src/App.tsx
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createHashRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { LicenseContextProvider, useLicense } from './context/LicenseContext';
import Sidebar from './components/Sidebar';
import LicenseBanner from './components/LicenseBanner';
import LicenseGuard from './components/LicenseGuard';
import ChangePasswordModal from './components/ChangePasswordModal';
import PasswordResetModal from './components/PasswordResetModal';
import LicenseActivation from './pages/LicenseActivation';
import LoginScreen from './pages/LoginScreen';
import LockoutScreen from './pages/LockoutScreen';
import Inventory from './pages/Products';
import Brokers from './pages/Brokers';
import BrokerTransactions from './pages/BrokerTransactions';
import BrokerLeisures from './pages/BrokerLeisures';
import Customers from './pages/Customers';
import CustomerLeisures from './pages/CustomerLeisures';
import CustomerTransactions from './pages/CustomerTransactions';
import Settings from './pages/Settings';
import Backups from './pages/Backups';
import WhatsAppManager from './pages/WhatsAppManager';
import Licensing from './pages/Licensing';
import Reports from './pages/Reports';
import DevDashboard from './pages/DevDashboard';
import Dashboard from './pages/Dashboard';

interface AuthUser {
  user_id: string;
  username: string;
  license_id: string;
}

interface MainAppContentProps {
  currentUser: AuthUser;
  onLogout: () => void;
  onOpenChangePassword: () => void;
}

type AuthViewState = 'checking' | 'login' | 'lockout' | 'authenticated';

const MainAppContent: React.FC<MainAppContentProps> = ({
  currentUser,
  onLogout,
  onOpenChangePassword,
}) => {
  const { licenseState, setDeveloperBypass } = useLicense();
  const [showActivationInternal, setShowActivationInternal] = useState(false);

  const handleImportSuccess = useCallback(() => {
    setShowActivationInternal(false);
    window.location.hash = '/inventory';
  }, []);

  const handlersRef = useRef({ onLogout, onOpenChangePassword, setDeveloperBypass, handleImportSuccess });
  useEffect(() => {
    handlersRef.current = { onLogout, onOpenChangePassword, setDeveloperBypass, handleImportSuccess };
  });

  const router = useMemo(() => createHashRouter([
    {
      path: "/",
      element: (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div style={{ display: 'flex', flex: 1 }}>
            <Sidebar
              currentUsername={currentUser.username}
              onLogout={() => handlersRef.current.onLogout()}
              onChangePassword={() => handlersRef.current.onOpenChangePassword()}
            />
            <div
              style={{
                marginLeft: '250px',
                padding: '0',
                backgroundColor: '#ffffff',
                minHeight: '100vh',
                width: 'calc(100% - 250px)',
                overflowY: 'auto',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <LicenseBanner />
              <div style={{ padding: '20px', flex: 1 }}>
                <Outlet />
              </div>
            </div>
          </div>
        </div>
      ),
      children: [
        { path: "/", element: <Navigate to="/dashboard" replace /> },
        { path: "/dashboard", element: <Dashboard /> },
        { path: "/inventory", element: <Inventory /> },
        { path: "/brokers", element: <Brokers /> },
        { path: "/broker-transactions", element: <BrokerTransactions /> },
        { path: "/broker-leisures", element: <BrokerLeisures /> },
        { path: "/customers", element: <Customers /> },
        { path: "/customer-leisures", element: <CustomerLeisures /> },
        { path: "/customer-transactions", element: <CustomerTransactions /> },
        { path: "/settings", element: <Settings /> },
        { path: "/backups", element: <Backups /> },
        { path: "/whatsapp-manager", element: <WhatsAppManager /> },
        { path: "/licensing", element: <Licensing /> },
        { path: "/activate", element: (
          <LicenseActivation
            deviceFingerprint={licenseState.deviceFingerprint}
            onImportSuccess={() => handlersRef.current.handleImportSuccess()}
            onDeveloperAccess={() => {
              handlersRef.current.setDeveloperBypass(true);
              setShowActivationInternal(false);
              window.location.hash = '/dev-dashboard';
            }}
          />
        ) },
        { path: "/dev-dashboard", element: <DevDashboard /> },
        { path: "/reports", element: <Reports /> },
        { path: "/database-diagnostics", element: <Navigate to="/dev-dashboard" replace /> },
        { path: "/table-viewer", element: <Navigate to="/dev-dashboard" replace /> },
        { path: "/license-logs", element: <Navigate to="/dev-dashboard" replace /> },
        { path: "/license-admin", element: <Navigate to="/dev-dashboard" replace /> },
      ],
    }
  ]), [currentUser.username, licenseState.deviceFingerprint]);

  return <RouterProvider router={router} />;
};

const AppRouter: React.FC = () => {
  const { t } = useTranslation();
  const { licenseState, setDeveloperBypass } = useLicense();
  const [showActivation, setShowActivation] = useState(false);

  const [authView, setAuthView] = useState<AuthViewState>('checking');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [lockedUsername, setLockedUsername] = useState('');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetModalUsername, setResetModalUsername] = useState('');
  const [showLicenseWarning, setShowLicenseWarning] = useState(false);
  const [hasShownSessionWarning, setHasShownSessionWarning] = useState(false);

  const handleActivateLicense = useCallback(() => {
    setShowActivation(true);
  }, []);

  const handleImportSuccess = useCallback(() => {
    setShowActivation(false);
  }, []);

  const bootstrapSession = useCallback(async () => {
    if (!window.electronAPI?.auth) {
      setCurrentUser({
        user_id: 'dev-user',
        username: 'developer',
        license_id: 'dev-license',
      });
      setAuthView('authenticated');
      return;
    }

    try {
      const status = await window.electronAPI.auth.checkSession();
      if (status.authenticated && status.user) {
        setCurrentUser(status.user);
        setAuthView('authenticated');
      } else {
        setCurrentUser(null);
        setAuthView('login');
      }
    } catch {
      setCurrentUser(null);
      setAuthView('login');
    }
  }, []);

  useEffect(() => {
    if (showActivation) {
      return;
    }
    void bootstrapSession();
  }, [bootstrapSession, showActivation]);

  const handleLoginSuccess = useCallback((user: AuthUser) => {
    setCurrentUser(user);
    setLockedUsername('');
    setAuthView('authenticated');
    setHasShownSessionWarning(false); // Reset session flag on fresh login
  }, []);

  const handleLockedOut = useCallback((username: string) => {
    setLockedUsername(username);
    setAuthView('lockout');
  }, []);

  const openResetModal = useCallback((username: string) => {
    setResetModalUsername(username || '');
    setShowResetModal(true);
  }, []);

  const handleLogout = useCallback(async () => {
    if (window.electronAPI?.auth) {
      await window.electronAPI.auth.logout();
    }
    setCurrentUser(null);
    setShowChangePasswordModal(false);
    setHasShownSessionWarning(false);
    setAuthView('login');
    if (window.electronAPI?.reloadWindow) {
      void window.electronAPI.reloadWindow();
    } else {
      window.location.reload();
    }
  }, []);

  const handlePasswordResetSuccess = useCallback(() => {
    setShowResetModal(false);
    setAuthView('login');
    setHasShownSessionWarning(false);
    setLockedUsername('');
  }, []);

  // Monitor license state for session warnings
  useEffect(() => {
    if (authView === 'authenticated' && !hasShownSessionWarning && !licenseState.isLoading) {
      const isPastMaintenance = licenseState.maintenanceDaysLeft !== null && licenseState.maintenanceDaysLeft < 0;
      const isPastRenewal = licenseState.renewalDays !== null && licenseState.renewalDays < 0;

      if (isPastMaintenance || isPastRenewal) {
        setShowLicenseWarning(true);
        setHasShownSessionWarning(true);
      }
    }
  }, [authView, licenseState.isLoading, licenseState.maintenanceDaysLeft, licenseState.renewalDays, hasShownSessionWarning]);

  if (showActivation) {
    return (
      <LicenseActivation
        deviceFingerprint={licenseState.deviceFingerprint}
        onImportSuccess={handleImportSuccess}
        onDeveloperAccess={() => {
          setDeveloperBypass(true);
          setShowActivation(false);
          setCurrentUser({
            user_id: 'dev-user',
            username: 'developer',
            license_id: 'dev-dashboard-license',
          });
          setAuthView('authenticated');
          setHasShownSessionWarning(true); // Don't bother dev with license popups
          window.location.hash = '/dev-dashboard';
        }}
      />
    );
  }

  return (
    <LicenseGuard onActivateLicense={handleActivateLicense}>
      {authView === 'checking' && (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f7fa',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '4px solid #e5e7eb',
                borderTopColor: '#2563eb',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>{t('app.checkingSession', 'Checking session...')}</p>
          </div>
        </div>
      )}

      {authView === 'login' && (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onLockedOut={handleLockedOut}
          onForgotPassword={openResetModal}
          onDeveloperAccess={() => {
            setDeveloperBypass(true);
            setShowActivation(false);
            setCurrentUser({
              user_id: 'dev-user',
              username: 'developer',
              license_id: 'dev-dashboard-license',
            });
            setAuthView('authenticated');
            setHasShownSessionWarning(true);
            window.location.hash = '/dev-dashboard';
          }}
        />
      )}

      {authView === 'lockout' && (
        <LockoutScreen
          username={lockedUsername}
          onBackToLogin={() => setAuthView('login')}
          onStartReset={openResetModal}
        />
      )}

      {authView === 'authenticated' && currentUser && (
        <>
          <MainAppContent
            currentUser={currentUser}
            onLogout={() => {
              void handleLogout();
            }}
            onOpenChangePassword={() => setShowChangePasswordModal(true)}
          />
          <ChangePasswordModal
            show={showChangePasswordModal}
            username={currentUser.username}
            onHide={() => setShowChangePasswordModal(false)}
          />
        </>
      )}

      <PasswordResetModal
        show={showResetModal}
        defaultUsername={resetModalUsername}
        onHide={() => setShowResetModal(false)}
        onSuccess={handlePasswordResetSuccess}
      />

      {/* License Warning Modal - Only show if not fully blocked (Hard Locked) */}
      {showLicenseWarning && licenseState.state !== 'expired' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 10001
        }}>
          <div style={{
            backgroundColor: 'white', padding: '30px', borderRadius: '12px',
            maxWidth: '500px', width: '90%', textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 15px', color: '#111827' }}>{t('app.licenseAdvisory', 'License Advisory')}</h3>
            <p style={{ margin: '0 0 25px', color: '#4b5563', lineHeight: 1.5 }}>
              {licenseState.renewalDays !== null && licenseState.renewalDays < 0 
                ? `${t('app.termEnded', 'Your software license term ended')} ${Math.abs(licenseState.renewalDays)} ${t('app.graceNotice', 'days ago. You are currently in a view-only grace period. Please renew immediately to avoid a full system lockout.')}`
                : licenseState.maintenanceDaysLeft !== null && licenseState.maintenanceDaysLeft < 0
                  ? (7 + licenseState.maintenanceDaysLeft > 0 
                      ? `${t('app.maintenanceExpired', 'Your maintenance and support period expired')} ${Math.abs(licenseState.maintenanceDaysLeft)} ${t('app.writeRestrictedIn', 'days ago. Write operations will be restricted in')} ${7 + licenseState.maintenanceDaysLeft} ${t('common.days', 'days.')}`
                      : t('app.writeRestrictedNow', 'Your maintenance and support period has expired. Write operations across the application are now restricted.'))
                  : t('app.licenseAttention', 'Your license requires attention. Please check your licensing settings for more details.')}
            </p>
            <button
              onClick={() => setShowLicenseWarning(false)}
              style={{
                width: '100%', padding: '12px', backgroundColor: '#2563eb',
                color: 'white', border: 'none', borderRadius: '8px',
                fontWeight: 600, cursor: 'pointer'
              }}
            >
              {t('app.continueApp', 'Continue to Application')}
            </button>
          </div>
        </div>
      )}
    </LicenseGuard>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <LicenseContextProvider>
        <AppRouter />
      </LicenseContextProvider>
    </AppProvider>
  );
};

export default App;