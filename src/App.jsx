import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { isAdmin, getMaintenanceStatus } from './lib/admin';
import Dashboard from './pages/Dashboard';
import Widget from './pages/Widget';
import MaintenancePage from './pages/MaintenancePage';

function AppRoutes() {
  const [maintenance, setMaintenance] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const status = await getMaintenanceStatus();
        setMaintenance(status);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserEmail(user.email);
      } catch (err) {
        console.error('Init Error:', err);
      } finally {
        setChecked(true);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!checked) return null;

  // Widget routes always bypass maintenance (they need to work for OBS)
  // Dashboard routes check maintenance
  const adminBypass = userEmail && isAdmin(userEmail);

  return (
    <Routes>
      {/* Widgets always accessible */}
      <Route path="/widget" element={<Widget />} />

      {/* Dashboard routes: maintenance check */}
      <Route path="/" element={
        maintenance && !adminBypass ? <MaintenancePage /> : <Dashboard />
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
