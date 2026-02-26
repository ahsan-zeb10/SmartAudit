export const mockVulnerabilities = [
  {
    id: 1,
    title: 'SQL INJECTION VULNERABILITY',
    description: 'Improper input validation on login endpoint',
    details: 'The login form does not properly sanitize user input, allowing potential SQL injection attacks. This could lead to unauthorized database access.',
    severity: 'Critical',
    port: 443,
    cve: 'CVE-2024-1234',
    cwe: 'CWE-89',
  },
  {
    id: 2,
    title: 'WEAK SSL CERTIFICATE',
    description: 'Using TLS 1.0 which is deprecated',
    details: 'The SSL certificate is configured to use TLS 1.0, which has known security vulnerabilities. Should be upgraded to TLS 1.2 or higher.',
    severity: 'High',
    port: 443,
    cve: 'CVE-2024-5678',
    cwe: 'CWE-327',
  },
  {
    id: 3,
    title: 'OPEN PORT 8080',
    description: 'Unnecessary service exposed',
    details: 'Port 8080 is open and running an unknown service. This should either be closed or properly secured.',
    severity: 'Medium',
    port: 8080,
  },
  {
    id: 4,
    title: 'DEFAULT CREDENTIALS',
    description: 'Admin panel using default credentials',
    details: 'The admin panel is still using default username and password. These should be changed immediately.',
    severity: 'Critical',
  },
  {
    id: 5,
    title: 'MISSING SECURITY HEADERS',
    description: 'Missing Content-Security-Policy header',
    details: 'Several important security headers are missing from HTTP responses, which could leave the application vulnerable to various attacks.',
    severity: 'High',
  },
  {
    id: 6,
    title: 'OUTDATED LIBRARY',
    description: 'Using vulnerable version of jQuery',
    details: 'The website is using an outdated version of jQuery with known security issues. Should be updated to the latest stable version.',
    severity: 'Medium',
  },
  {
    id: 7,
    title: 'WEAK PASSWORD POLICY',
    description: 'No password complexity requirements',
    details: 'The system does not enforce strong password requirements, allowing users to set weak passwords.',
    severity: 'Low',
  },
];

export const mockSystemStats = [
  { label: 'CPU', value: 6, color: 'from-emerald-500 to-teal-400' },
  { label: 'RAM', value: 51, color: 'from-lime-500 to-green-400' },
  { label: 'DISK', value: 96, color: 'from-orange-600 to-orange-400' },
];

export const mockDevices = [
  {
    id: 1,
    ip: '127.0.0.1',
    mac: '00:00:00:00:00:00',
    hostname: 'localhost',
    status: 'online',
    lastSeen: 'now',
    violations: 7,
    score: 21,
  },
  {
    id: 2,
    ip: '192.168.1.1',
    mac: '00:1A:2B:3C:4D:5E',
    hostname: 'gateway',
    status: 'online',
    lastSeen: '2 minutes ago',
    violations: 3,
    score: 78,
  },
  {
    id: 3,
    ip: '192.168.1.100',
    mac: 'AA:BB:CC:DD:EE:FF',
    hostname: 'server-01',
    status: 'online',
    lastSeen: '5 minutes ago',
    violations: 5,
    score: 62,
  },
];

export const mockReports = [
  {
    id: 1,
    host: '127.0.0.1',
    date: '2024-02-26 10:30:00',
    violations: 7,
    score: 21,
    status: 'completed',
  },
  {
    id: 2,
    host: '192.168.1.1',
    date: '2024-02-26 10:15:00',
    violations: 3,
    score: 78,
    status: 'completed',
  },
  {
    id: 3,
    host: '192.168.1.100',
    date: '2024-02-26 09:45:00',
    violations: 5,
    score: 62,
    status: 'completed',
  },
];

export const riskDistributionData = [
  { name: 'Critical', value: 2, color: '#ff4757' },
  { name: 'High', value: 3, color: '#ff6348' },
  { name: 'Medium', value: 1, color: '#ffa502' },
  { name: 'Low', value: 1, color: '#ffb547' },
];