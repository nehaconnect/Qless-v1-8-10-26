'use client';

import React, { useState, useEffect } from 'react';
import {
  Coffee,
  Bell,
  LogOut,
  User,
  Shield,
  Store,
  GraduationCap,
  ChevronDown,
  Eye,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { authClient } from '@/lib/auth/auth-client';

interface NavbarProps {
  user: {
    id: string;
    name: string;
    username: string;
    role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
    effectiveRole: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  } | null;
  onLogout: () => void;
  onSwitchViewAs?: (role: 'CUSTOMER' | 'SELLER' | 'ADMIN') => void;
  canteenStatus?: 'OPEN' | 'TOO_BUSY' | 'CLOSED';
  isLive?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onSwitchViewAs,
  canteenStatus = 'OPEN',
  isLive = true,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.notifications) {
        setNotificationsList(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
      setNotificationsList(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  const getStatusBadge = () => {
    switch (canteenStatus) {
      case 'OPEN':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>OPEN</span>;
      case 'TOO_BUSY':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><span className="w-2 h-2 rounded-full bg-amber-500"></span>BUSY</span>;
      case 'CLOSED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><span className="w-2 h-2 rounded-full bg-rose-500"></span>CLOSED</span>;
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-deep-blue to-primary-blue flex items-center justify-center text-white shadow-soft">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-text-primary">QLess</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-soft-blue text-deep-blue border border-blue-100">IPCW</span>
              </div>
              <p className="text-[11px] text-text-secondary -mt-0.5">IP Canteen Batch Queue</p>
            </div>
          </div>

          {/* Center Canteen Live Status */}
          <div className="hidden sm:flex items-center gap-3">
            {getStatusBadge()}
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              {isLive ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Live Sync</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-600 font-medium">Reconnecting...</span>
                </>
              )}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Admin View-As Support Switcher */}
            {user?.role === 'ADMIN' && onSwitchViewAs && (
              <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                <span className="px-2 py-0.5 text-text-secondary font-medium flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> View:
                </span>
                <button
                  onClick={() => onSwitchViewAs('ADMIN')}
                  className={`px-2.5 py-1 rounded font-medium transition ${user.effectiveRole === 'ADMIN' ? 'bg-white shadow-sm text-deep-blue font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Admin
                </button>
                <button
                  onClick={() => onSwitchViewAs('SELLER')}
                  className={`px-2.5 py-1 rounded font-medium transition ${user.effectiveRole === 'SELLER' ? 'bg-white shadow-sm text-deep-blue font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Seller
                </button>
                <button
                  onClick={() => onSwitchViewAs('CUSTOMER')}
                  className={`px-2.5 py-1 rounded font-medium transition ${user.effectiveRole === 'CUSTOMER' ? 'bg-white shadow-sm text-deep-blue font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Customer
                </button>
              </div>
            )}

            {/* Notification Bell */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-tactile border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                      <h4 className="font-bold text-sm text-text-primary">Notifications</h4>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-xs text-primary-blue hover:underline font-medium"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2">
                      {notificationsList.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-6">No notifications yet</p>
                      ) : (
                        notificationsList.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 rounded-xl border transition text-left ${n.isRead ? 'bg-slate-50 border-slate-100 text-slate-600' : 'bg-soft-blue/40 border-blue-200 text-slate-900 font-medium'}`}
                          >
                            <p className="text-xs font-semibold">{n.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl hover:bg-slate-100 transition border border-slate-200/60"
                >
                  <div className="w-8 h-8 rounded-lg bg-soft-blue text-deep-blue font-bold flex items-center justify-center text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left text-xs">
                    <p className="font-semibold text-text-primary leading-tight">{user.name}</p>
                    <p className="text-[10px] text-text-secondary leading-tight">{user.username}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-tactile border border-slate-200 p-2 z-50">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-text-primary">{user.name}</p>
                      <p className="text-[11px] text-text-secondary">{user.username}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase">
                        {user.effectiveRole}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-danger hover:bg-red-50 rounded-xl transition mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
