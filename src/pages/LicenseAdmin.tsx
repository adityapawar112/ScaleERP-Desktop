// src/pages/LicenseAdmin.tsx
// Developer-only license override panel. Not linked from sidebar — access via /license-admin URL.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLicense } from '../context/LicenseContext';
import { useTranslation } from 'react-i18next';

const DEV_SECRET = 'scaleerp-dev-2026';

const LicenseAdmin: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { licenseState, refreshLicense } = useLicense();
  const [authenticated, setAuthenticated] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Form fields
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [maintenanceUntil, setMaintenanceUntil] = useState('');
  const [edition, setEdition] = useState('Pro');
  const [graceUntil, setGraceUntil] = useState('');
  const [graceMode, setGraceMode] = useState<'view_only' | 'admin_only'>('view_only');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const populateForm = useCallback(() => {
    if (licenseState.payload) {
      setValidFrom(licenseState.payload.valid_from || '');
      setValidUntil(licenseState.payload.valid_until || '');
      setMaintenanceUntil(licenseState.payload.maintenance_until || '');
      setEdition(licenseState.payload.edition || 'Pro');
      setGraceUntil(licenseState.payload.grace_until || '');
      setGraceMode(licenseState.payload.grace_mode || 'view_only');
    }
  }, [licenseState]);

  useEffect(() => {
    if (authenticated) populateForm();
  }, [authenticated, populateForm]);

  const handleAuth = () => {
    if (secretInput === DEV_SECRET) {
      setAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid developer secret');
    }
  };

  const handleApply = async () => {
    setLoading(true);
    setStatus(null);
    try {
      if (!window.electronAPI?.licensing?.adminUpdate) {
        setStatus({ type: 'error', msg: 'adminUpdate IPC not available. Restart the app.' });
        setLoading(false);
        return;
      }
      const result = await window.electronAPI.licensing.adminUpdate({
        valid_from: validFrom,
        valid_until: validUntil,
        maintenance_until: maintenanceUntil,
        edition,
        grace_until: graceUntil || null,
        grace_mode: graceMode,
      }, secretInput);
      if (result.success) {
        setStatus({ type: 'success', msg: 'License updated. Refreshing status...' });
        await refreshLicense();
      } else {
        setStatus({ type: 'error', msg: result.error || 'Update failed' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600 }}>Developer Access</h2>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Enter the developer secret to access license override controls.</p>
          {authError && <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '6px', fontSize: '13px', marginBottom: '12px' }}>{authError}</div>}
          <input
            type="password"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            placeholder="Developer secret"
            style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', marginBottom: '12px' }}
          />
          <button onClick={handleAuth} style={{ width: '100%', padding: '10px', fontSize: '14px', fontWeight: 500, backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Authenticate</button>
          <button onClick={() => navigate('/licensing')} style={{ width: '100%', padding: '10px', fontSize: '14px', marginTop: '8px', backgroundColor: 'transparent', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer' }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>License Override Panel</h2>
        <button onClick={() => navigate('/licensing')} style={{ padding: '8px 16px', fontSize: '14px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>← Back</button>
      </div>

      <div style={{ padding: '12px 16px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', fontSize: '13px', color: '#92400e', marginBottom: '24px' }}>
        ⚠️ <strong>Developer Mode:</strong> Changes made here directly modify the database and are NOT cryptographically signed. Use only for testing/debugging.
      </div>

      {status && (
        <div style={{ padding: '12px 16px', backgroundColor: status.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${status.type === 'success' ? '#22c55e' : '#ef4444'}`, borderRadius: '8px', fontSize: '13px', color: status.type === 'success' ? '#166534' : '#991b1b', marginBottom: '16px' }}>
          {status.msg}
        </div>
      )}

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Valid From</label>
            <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Valid Until</label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Maintenance Until (Effective Expiry)</label>
            <input type="date" value={maintenanceUntil} onChange={(e) => setMaintenanceUntil(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Edition</label>
            <select value={edition} onChange={(e) => setEdition(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}>
              <option value="Basic">Basic</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Grace Until (optional)</label>
            <input type="date" value={graceUntil} onChange={(e) => setGraceUntil(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Grace Mode</label>
            <select value={graceMode} onChange={(e) => setGraceMode(e.target.value as 'view_only' | 'admin_only')} style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}>
              <option value="view_only">View Only</option>
              <option value="admin_only">Admin Only</option>
            </select>
          </div>
        </div>

        <button onClick={handleApply} disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 600, backgroundColor: loading ? '#9ca3af' : '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '20px' }}>
          {loading ? 'Applying...' : 'Apply Changes'}
        </button>
      </div>
    </div>
  );
};

export default LicenseAdmin;