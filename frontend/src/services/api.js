/**
 * TECHIFY API Service — all calls are authenticated
 * Uses authFetch which auto-adds Bearer token + refreshes on 401
 */
import { authFetch } from './auth';

const get  = (url)        => authFetch(url);
const post = (url, body)  => authFetch(url, { method: 'POST', body: JSON.stringify(body) });

export const getLatestAudit     = (host = '127.0.0.1') => get(`/latest-audit?host=${encodeURIComponent(host)}`);
export const getAllDevicesAudit  = ()                   => get('/all-devices-audit');
export const startScan          = (host)                => post('/scan', { host });
export const discoverDevices    = (range)               => post('/discover', { range });
export const remediateViolation = (violation, host)     => post('/remediate', { violation, host });
export const getLiveStats       = (host = '127.0.0.1')  => get(`/live-stats/${host}`);
export const getScanProgress    = (host)                => get(`/scan-progress/${encodeURIComponent(host)}`);
export const getOpenvasStatus   = ()                    => get('/openvas/status');
export const configureOpenvas   = (config)              => post('/openvas/configure', config);
export const downloadReport     = (host) => {
  const token = localStorage.getItem('access_token');
  window.open(`http://localhost:8000/download-report?host=${encodeURIComponent(host)}&token=${token}`, '_blank');
};