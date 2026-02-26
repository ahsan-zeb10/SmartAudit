import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import ScanEngine from '@/pages/ScanEngine';
import Devices from '@/pages/Devices';
import Vulnerabilities from '@/pages/Vulnerabilities';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/scan-engine" element={<ScanEngine />} />
        <Route path="/devices" element={<Devices />} />
        <Route path="/vulnerabilities" element={<Vulnerabilities />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
