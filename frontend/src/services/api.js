const BASE_URL = 'http://localhost:8000';

const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

// GET /latest-audit?host=x.x.x.x — per-device audit data
export const getLatestAudit = (host = '127.0.0.1') =>
  apiCall(`/latest-audit?host=${encodeURIComponent(host)}`);

// GET /all-devices-audit — all scanned devices
export const getAllDevicesAudit = () => apiCall('/all-devices-audit');

// POST /scan
export const startScan = (host) =>
  apiCall('/scan', { method: 'POST', body: JSON.stringify({ host }) });

// POST /discover
export const discoverDevices = (range) =>
  apiCall('/discover', { method: 'POST', body: JSON.stringify({ range }) });

// POST /remediate
export const remediateViolation = (violation, host = '127.0.0.1') =>
  apiCall('/remediate', { method: 'POST', body: JSON.stringify({ violation, host }) });

// GET /live-stats/{host}
export const getLiveStats = (host = '127.0.0.1') =>
  apiCall(`/live-stats/${host}`);

// Download PDF report
export const downloadReport = (host) => {
  window.open(`${BASE_URL}/download-report?host=${encodeURIComponent(host)}`, '_blank');
};