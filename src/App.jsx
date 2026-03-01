import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import OverlaySDashboard from './pages/OverlaySDashboard';
import Widget from './pages/Widget';
import OverlaySWidget from './pages/OverlaySWidget';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/overlays" element={<OverlaySDashboard />} />
        <Route path="/widget" element={<Widget />} />
        <Route path="/overlays/widget" element={<OverlaySWidget />} />
      </Routes>
    </BrowserRouter>
  );
}
