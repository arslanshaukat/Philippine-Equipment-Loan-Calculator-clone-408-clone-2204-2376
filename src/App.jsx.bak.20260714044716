import React, { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase/supabase';
import './App.css';

// Route-based code splitting for performance
const PaymentCalculator = React.lazy(() => import('./components/PaymentCalculator'));
const AdminLogin = React.lazy(() => import('./components/AdminLogin'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));

const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-gray-600 font-black uppercase tracking-widest text-[10px]">Initializing GT Systems...</p>
  </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef(null);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth init error:", error);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) return <PageLoader />;

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<PaymentCalculator />} />
            <Route 
              path="/admin" 
              element={user ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin onLogin={setUser} />} 
            />
            <Route 
              path="/admin/dashboard" 
              element={user ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/admin" replace />} 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}

export default App;