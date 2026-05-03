import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

// Layout Components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Pages
import DashboardPage from './pages/DashboardPage';
import ClaimsPage from './pages/ClaimsPage';
import ReturnsPage from './pages/ReturnsPage';
import PricingPage from './pages/PricingPage';
import ShipmentsPage from './pages/ShipmentsPage';
import ProfitPage from './pages/ProfitPage';
import SettingsPage from './pages/SettingsPage';

function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const activePage = useMemo(() => {
        return location.pathname.split('/')[1] || 'dashboard';
    }, [location.pathname]);

    const handleNavigate = useCallback((pageId) => {
        navigate(`/${pageId}`);
    }, [navigate]);

    // Close sidebar only when the pathname changes
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className="flex h-screen bg-[#f5f5f7] overflow-hidden selection:bg-[#4f86f7]/20 selection:text-[#4f86f7]">
            <Sidebar
                activePage={activePage}
                onNavigate={handleNavigate}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <Header
                    activePage={activePage}
                    onMenuOpen={() => setSidebarOpen(true)}
                />

                <main className="flex-1 overflow-y-auto w-full">
                    <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<DashboardPage onNavigate={handleNavigate} />} />
                        <Route path="/claims" element={<ClaimsPage />} />
                        <Route path="/returns" element={<ReturnsPage />} />
                        <Route path="/pricing" element={<PricingPage />} />
                        <Route path="/shipments" element={<ShipmentsPage />} />
                        <Route path="/profit" element={<ProfitPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AppLayout />
        </BrowserRouter>
    );
}