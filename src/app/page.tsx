'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { LoginPage } from '@/components/LoginPage';
import { CustomerPortal } from '@/components/CustomerPortal';
import { SellerPortal } from '@/components/SellerPortal';
import { AdminPortal } from '@/components/AdminPortal';
import { authClient } from '@/lib/auth/auth-client';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [viewAsRole, setViewAsRole] = useState<'CUSTOMER' | 'SELLER' | 'ADMIN' | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Live canteen status
  const [canteenStatus, setCanteenStatus] = useState<'OPEN' | 'TOO_BUSY' | 'CLOSED'>('OPEN');
  const [isLive, setIsLive] = useState(true);

  // Fetch initial auth session
  const checkSession = async () => {
    try {
      const res = await authClient.getSession();
      if (res.data?.user) {
        setCurrentUser(res.data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Fetch canteen status
  const fetchCanteenStatus = async () => {
    try {
      const res = await fetch('/api/canteen/status');
      const data = await res.json();
      if (data.canteen?.operatingStatus) {
        setCanteenStatus(data.canteen.operatingStatus);
      }
    } catch {}
  };

  useEffect(() => {
    checkSession();
    fetchCanteenStatus();

    // SSE Realtime Subscription
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/realtime');
      eventSource.onopen = () => setIsLive(true);
      eventSource.onerror = () => setIsLive(false);

      eventSource.addEventListener('canteen_status', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.canteen?.operatingStatus) {
            setCanteenStatus(payload.canteen.operatingStatus);
          }
        } catch {}
      });
    } catch {
      setIsLive(false);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch {}
    setCurrentUser(null);
    setViewAsRole(null);
    window.location.reload();
  };

  const handleUpdateCanteenStatus = async (newStatus: 'OPEN' | 'TOO_BUSY' | 'CLOSED') => {
    try {
      const res = await fetch('/api/canteen/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatingStatus: newStatus }),
      });
      const data = await res.json();
      if (data.canteen?.operatingStatus) {
        setCanteenStatus(data.canteen.operatingStatus);
      }
    } catch {}
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-blue animate-spin" />
          <p className="text-xs font-bold text-slate-500">Loading QLess Campus Canteen...</p>
        </div>
      </div>
    );
  }

  // Not authenticated: Show Login
  if (!currentUser) {
    return <LoginPage onSuccess={(u) => { setCurrentUser(u); checkSession(); }} />;
  }

  // Determine effective role (supports Admin View-As mode)
  const effectiveRole = (currentUser.role === 'ADMIN' && viewAsRole) ? viewAsRole : currentUser.role;

  const navbarUser = {
    id: currentUser.id,
    name: currentUser.name,
    username: currentUser.username || currentUser.email,
    role: currentUser.role,
    effectiveRole,
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">
      <Navbar
        user={navbarUser}
        onLogout={handleLogout}
        onSwitchViewAs={(role) => setViewAsRole(role)}
        canteenStatus={canteenStatus}
        isLive={isLive}
      />

      <main className="flex-1">
        {effectiveRole === 'CUSTOMER' && (
          <CustomerPortal user={currentUser} canteenStatus={canteenStatus} />
        )}
        {effectiveRole === 'SELLER' && (
          <SellerPortal
            user={currentUser}
            canteenStatus={canteenStatus}
            onUpdateStatus={handleUpdateCanteenStatus}
            onLogout={handleLogout}
          />
        )}
        {effectiveRole === 'ADMIN' && (
          <AdminPortal onSwitchViewAs={(role) => setViewAsRole(role)} />
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-text-secondary bg-surface">
        <p className="font-semibold">QLess • Campus Canteen Ordering & Batch Queue Management</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Indraprastha College for Women (IPCW) • IP Canteen • Delhi University</p>
      </footer>
    </div>
  );
}
