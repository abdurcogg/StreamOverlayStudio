import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Widget from './pages/Widget';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/widget" element={<Widget />} />
      </Routes>
    </BrowserRouter>
  );
}
