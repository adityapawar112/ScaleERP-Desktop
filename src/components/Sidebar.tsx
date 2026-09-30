// src/components/Sidebar.tsx
import React from 'react';
import { Nav, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MdInventory,
  MdPeople,
  MdReceipt,
  MdDescription,
  MdGroup,
  MdSettings,
  MdExitToApp,
  MdOutlineWhatsapp,
  MdVpnKey,
  MdLogout,
  MdPassword,
  MdAdminPanelSettings,
  MdStorage,
  MdAssessment,
  MdDashboard,
} from 'react-icons/md';
import LanguageSwitcher from './LanguageSwitcher';
import '../styles/Sidebar.css';

interface SidebarProps {
  currentUsername?: string | null;
  onLogout?: () => void;
  onChangePassword?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentUsername = null,
  onLogout,
  onChangePassword,
}) => {
  const location = useLocation();
  const { t } = useTranslation();

  const handleExit = () => {
    if (window && window.close) {
      window.close();
    } else {
      console.log('Exit button clicked');
    }
  };

  const handleLogout = () => {
    const confirmed = window.confirm(t('auth.logoutConfirm', 'Are you sure you want to logout?'));
    if (confirmed) {
      onLogout?.();
    }
  };

  return (
    <div className="sidebar-container">
      <div className="sidebar-header">
        <div className="d-flex align-items-center mb-3">
          <img src="./ScaleERPLogo.png" alt="ScaleERP Logo" className="scaleerp-logo me-2" />
          <h3 className="mb-0">{t('navigation.inventoryManagement')}</h3>
        </div>
      </div>
      <Nav className="flex-column sidebar-nav">
        <Nav.Link
          as={Link}
          to="/dashboard"
          className={`nav-dashboard ${location.pathname === '/dashboard' ? 'active' : ''}`}
        >
          <MdDashboard size={14} />
          {t('navigation.dashboard')}
        </Nav.Link>
        <Nav.Link
          as={Link}
          to="/inventory"
          className={`nav-inventory ${location.pathname === '/inventory' ? 'active' : ''}`}
        >
          <MdInventory size={14} />
          {t('navigation.inventory')}
        </Nav.Link>
        <hr className="section-separator" />

        <Nav.Link
          as={Link}
          to="/brokers"
          className={`nav-brokers ${location.pathname === '/brokers' ? 'active' : ''}`}
        >
          <MdPeople size={14} />
          {t('navigation.brokers')}
        </Nav.Link>
        <Nav.Link
          as={Link}
          to="/broker-transactions"
          className={`nav-broker-transactions ${location.pathname === '/broker-transactions' ? 'active' : ''}`}
        >
          <MdReceipt size={14} />
          {t('navigation.brokerTransactions')}
        </Nav.Link>
        <Nav.Link
          as={Link}
          to="/broker-leisures"
          className={`nav-broker-leisures ${location.pathname === '/broker-leisures' ? 'active' : ''}`}
        >
          <MdDescription size={14} />
          {t('navigation.brokerLeisures')}
        </Nav.Link>
        <hr className="section-separator" />

        <Nav.Link
          as={Link}
          to="/customers"
          className={`nav-customers ${location.pathname === '/customers' ? 'active' : ''}`}
        >
          <MdGroup size={14} />
          {t('navigation.customers')}
        </Nav.Link>
        <Nav.Link
          as={Link}
          to="/customer-transactions"
          className={`nav-customer-transactions ${location.pathname === '/customer-transactions' ? 'active' : ''}`}
        >
          <MdReceipt size={14} />
          {t('navigation.customerSales')}
        </Nav.Link>
        <Nav.Link
          as={Link}
          to="/customer-leisures"
          className={`nav-customer-leisures ${location.pathname === '/customer-leisures' ? 'active' : ''}`}
        >
          <MdDescription size={14} />
          {t('navigation.customerLeisures')}
        </Nav.Link>
        <Nav.Link
          as={Link}
          to="/whatsapp-manager"
          className={`nav-whatsapp-manager ${location.pathname === '/whatsapp-manager' ? 'active' : ''}`}
        >
          <MdOutlineWhatsapp size={14} />
          {t('navigation.whatsappManager', 'WhatsApp Manager')}
        </Nav.Link>
        <hr className="section-separator" />

        <Nav.Link
          as={Link}
          to="/reports"
          className={`nav-reports ${location.pathname === '/reports' ? 'active' : ''}`}
        >
          <MdAssessment size={14} />
          {t('navigation.reports', 'Reports & Analysis')}
        </Nav.Link>

        <Nav.Link
          as={Link}
          to="/backups"
          className={`nav-backups ${location.pathname === '/backups' ? 'active' : ''}`}
        >
          <MdStorage size={14} />
          {t('navigation.systemBackups', 'System Backups')}
        </Nav.Link>

        <Nav.Link
          as={Link}
          to="/settings"
          className={`nav-settings ${location.pathname === '/settings' ? 'active' : ''}`}
        >
          <MdSettings size={14} />
          {t('navigation.settings')}
        </Nav.Link>

        <Nav.Link
          as={Link}
          to="/licensing"
          className={`nav-licensing ${location.pathname === '/licensing' ? 'active' : ''}`}
        >
          <MdVpnKey size={14} />
          {t('navigation.licensing')}
        </Nav.Link>

        <Nav.Link
          as={Link}
          to="/dev-dashboard"
          className={`nav-dev-dashboard ${location.pathname === '/dev-dashboard' ? 'active' : ''}`}
        >
          <MdAdminPanelSettings size={14} />
          {t('navigation.devDashboard', 'Developer Dashboard')}
        </Nav.Link>
      </Nav>

      <div className="sidebar-footer">
        {currentUsername && (
          <div className="mb-2 text-center text-muted" style={{ fontSize: '0.8rem' }}>
            {t('auth.signedInAs', 'Signed in as')} <strong>{currentUsername}</strong>
          </div>
        )}

        <div className="language-switcher-container">
          <div className="d-flex align-items-center gap-2">
            <LanguageSwitcher />

            <Button
              variant="outline-primary"
              size="sm"
              onClick={onChangePassword}
              title={t('auth.changePasswordTitle', 'Change Password')}
              className="exit-button"
            >
              <MdPassword size={16} />
            </Button>

            <Button
              variant="outline-warning"
              size="sm"
              onClick={handleLogout}
              title={t('auth.logout', 'Logout')}
              className="exit-button"
            >
              <MdLogout size={16} />
            </Button>

            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleExit}
              title={t('navigation.exitApp', 'Exit Application')}
              className="exit-button"
            >
              <MdExitToApp size={16} />
            </Button>
          </div>
        </div>
        <div className="footer-bottom-row">
          <img src="./LOGO SNOW.png" alt="Ouroscale Logo" className="scaleerp-logo-compact" />
          <div className="copyright-text-compact">
            {t('footer.copyright')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;