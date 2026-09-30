// src/pages/LicenseLogs.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface LogEntry {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  details?: string;
}

const LicenseLogs: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'events' | 'heartbeats'>('events');
  const [events, setEvents] = useState<any[]>([]);
  const [heartbeats, setHeartbeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (window.electronAPI?.licensing) {
        const [eventsData, hbData] = await Promise.all([
          window.electronAPI.licensing.getEventHistory(),
          window.electronAPI.licensing.getHeartbeats(),
        ]);
        setEvents(eventsData.events || []);
        setHeartbeats(hbData.heartbeats || []);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatTimestamp = (iso: string | undefined): string => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  };

  const getEventTypeColor = (type: string): string => {
    if (type.includes('import') || type.includes('activate')) return '#10b981';
    if (type.includes('expire') || type.includes('invalid')) return '#ef4444';
    if (type.includes('warning')) return '#f59e0b';
    if (type.includes('tamper')) return '#dc2626';
    return '#6b7280';
  };

  const filteredEvents = events.filter(e =>
    !searchTerm ||
    (e.event_type && e.event_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.event_data && e.event_data.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredHeartbeats = heartbeats.filter(h =>
    !searchTerm ||
    (h.reason && h.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (h.system_time_iso && h.system_time_iso.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '4px solid #e5e7eb',
            borderTopColor: '#2563eb', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: '14px', color: '#666' }}>{t('licensing.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#1a1a1a' }}>
          {t('licensing.logsTitle')}
        </h2>
        <button
          onClick={() => navigate('/licensing')}
          style={{
            padding: '8px 16px', fontSize: '14px', backgroundColor: '#f8fafc',
            color: '#475569', border: '1px solid #d1d5db', borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          ← {t('licensing.backToDashboard')}
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder={t('licensing.searchLogs')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', fontSize: '14px',
            border: '1px solid #d1d5db', borderRadius: '8px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', marginBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab('events')}
          style={{
            flex: 1, padding: '10px 16px', fontSize: '14px', fontWeight: activeTab === 'events' ? 600 : 400,
            border: 'none', borderBottom: activeTab === 'events' ? '2px solid #2563eb' : '2px solid transparent',
            backgroundColor: 'transparent', color: activeTab === 'events' ? '#2563eb' : '#666',
            cursor: 'pointer', marginBottom: '-2px',
          }}
        >
          {t('licensing.eventHistory')} ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('heartbeats')}
          style={{
            flex: 1, padding: '10px 16px', fontSize: '14px', fontWeight: activeTab === 'heartbeats' ? 600 : 400,
            border: 'none', borderBottom: activeTab === 'heartbeats' ? '2px solid #2563eb' : '2px solid transparent',
            backgroundColor: 'transparent', color: activeTab === 'heartbeats' ? '#2563eb' : '#666',
            cursor: 'pointer', marginBottom: '-2px',
          }}
        >
          {t('licensing.heartbeatLogs')} ({heartbeats.length})
        </button>
      </div>

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {filteredEvents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              {t('licensing.noEvents')}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    {t('licensing.timestamp')}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    {t('licensing.eventType')}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    {t('licensing.details')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event, index) => (
                  <tr key={event.event_id || index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(event.created_at)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', fontSize: '11px',
                        fontWeight: 500, borderRadius: '4px',
                        backgroundColor: getEventTypeColor(event.event_type) + '20',
                        color: getEventTypeColor(event.event_type),
                      }}>
                        {event.event_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {event.event_data || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Heartbeats Tab */}
      {activeTab === 'heartbeats' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {filteredHeartbeats.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              {t('licensing.noHeartbeats')}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    {t('licensing.timestamp')}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    {t('licensing.systemTime')}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    {t('licensing.reason')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredHeartbeats.map((hb, index) => (
                  <tr key={hb.id || index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(hb.checked_at)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(hb.system_time_iso)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>
                      {hb.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default LicenseLogs;