'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  LogOut,
  User,
  ChevronDown,
  Eye,
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { QLessLogo } from './QLessLogo';

interface NavbarProps {
  user: {
    id: string;
    name: string;
    username: string;
    role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
    effectiveRole: 'CUSTOMER' | 'SELLER' | 'ADMIN';
    selectedSellerForViewAs?: { userId: string; name: string; canteenName: string } | null;
  } | null;
  onLogout: () => Promise<void> | void;
  isLoggingOut?: boolean;
  logoutError?: string | null;
  onSwitchViewAs?: (role: 'CUSTOMER' | 'SELLER' | 'ADMIN') => void;
  onOpenSellerModal?: () => void;
  canteenStatus?: 'OPEN' | 'TOO_BUSY' | 'CLOSED';
  isLive?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  isLoggingOut = false,
  logoutError = null,
  onSwitchViewAs,
  onOpenSellerModal,
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
    const interval = setInterval(fetchNotifications, 25000);
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
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#DFF3E8] text-[#073653] border border-[#BFEBDD]">
            <span className="w-2 h-2 rounded-full bg-[#00B894] animate-pulse"></span>
            OPEN
          </span>
        );
      case 'TOO_BUSY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            BUSY
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            CLOSED
          </span>
        );
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#BFEBDD]/60 shadow-sm transition-all">
      {/* Admin View-As active support banner */}
      {user?.role === 'ADMIN' && user.effectiveRole !== 'ADMIN' && onSwitchViewAs && (
        <div className="bg-[#FFE0C7] text-[#073653] px-4 py-1.5 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-sm border-b border-[#FFE0C7]">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-[#2B7BFF]" />
            <span>
              Support View Mode: Viewing as <strong>{user.effectiveRole}</strong>
              {user.effectiveRole === 'SELLER' && user.selectedSellerForViewAs && (
                <> — Seller: <strong>{user.selectedSellerForViewAs.name}</strong> ({user.selectedSellerForViewAs.canteenName})</>
              )}
              {' '}(Session is Admin)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {user.effectiveRole === 'SELLER' && onOpenSellerModal && (
              <button
                onClick={onOpenSellerModal}
                className="px-2.5 py-0.5 bg-[#00B894] text-white rounded-lg font-bold hover:bg-[#00B894]/90 transition text-[11px]"
              >
                Switch Seller Workspace
              </button>
            )}
            <button
              onClick={() => onSwitchViewAs('ADMIN')}
              className="px-2.5 py-0.5 bg-[#073653] text-white rounded-lg font-bold hover:bg-[#073653]/90 transition text-[11px]"
            >
              Exit View-As (Back to Admin)
            </button>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <QLessLogo size="md" showSubtitle={false} />
          </div>

          {/* Center Canteen Live Status */}
          <div className="hidden sm:flex items-center gap-3">
            {getStatusBadge()}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64839A]">
              {isLive ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-[#00B894]" />
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
              <div className="hidden md:flex items-center gap-1 p-1 bg-[#DFF3E8]/60 rounded-xl border border-[#BFEBDD] text-xs">
                <span className="px-2 py-0.5 text-[#64839A] font-bold flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-[#2B7BFF]" /> View:
                </span>
                <button
                  onClick={() => onSwitchViewAs('ADMIN')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${user.effectiveRole === 'ADMIN' ? 'bg-[#00B894] text-white shadow-sm' : 'text-[#073653] hover:bg-[#BFEBDD]/40'}`}
                >
                  Admin
                </button>
                <button
                  onClick={() => onSwitchViewAs('SELLER')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${user.effectiveRole === 'SELLER' ? 'bg-[#00B894] text-white shadow-sm' : 'text-[#073653] hover:bg-[#BFEBDD]/40'}`}
                >
                  Seller
                </button>
                <button
                  onClick={() => onSwitchViewAs('CUSTOMER')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${user.effectiveRole === 'CUSTOMER' ? 'bg-[#00B894] text-white shadow-sm' : 'text-[#073653] hover:bg-[#BFEBDD]/40'}`}
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
                  className="p-2.5 rounded-xl text-[#073653] hover:bg-[#DFF3E8] relative transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-[#073653]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-card border border-[#BFEBDD] p-4 z-50 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-3 border-b border-[#DFF3E8] mb-2">
                      <h4 className="font-extrabold text-sm text-[#073653]">Notifications</h4>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-xs text-[#2B7BFF] hover:underline font-bold"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2">
                      {notificationsList.length === 0 ? (
                        <p className="text-center text-xs text-[#64839A] py-6 font-medium">No notifications yet</p>
                      ) : (
                        notificationsList.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 rounded-xl border transition text-left ${n.isRead ? 'bg-[#FFF5E9]/50 border-slate-100 text-[#64839A]' : 'bg-[#DFF3E8]/40 border-[#BFEBDD] text-[#073653] font-medium'}`}
                          >
                            <p className="text-xs font-bold text-[#073653]">{n.title}</p>
                            <p className="text-[11px] text-[#64839A] mt-0.5">{n.message}</p>
                            <span className="text-[10px] text-[#64839A]/80 mt-1 block font-mono">
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
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl hover:bg-[#DFF3E8] transition border border-[#BFEBDD]/60 min-h-[44px]"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#073653] text-white font-black flex items-center justify-center text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left text-xs">
                    <p className="font-extrabold text-[#073653] leading-tight">{user.name}</p>
                    <p className="text-[10px] font-bold text-[#64839A] leading-tight">{user.username}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#64839A]" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-card border border-[#BFEBDD] p-3 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-2 pb-3 border-b border-[#DFF3E8]">
                      <p className="text-xs font-black text-[#073653]">{user.name}</p>
                      <p className="text-[11px] font-bold text-[#64839A] mt-0.5">{user.username}</p>
                      <div className="mt-2 pt-2 border-t border-[#DFF3E8] space-y-1 text-[11px] text-[#64839A]">
                        <div className="flex justify-between items-center">
                          <span className="text-[#64839A]">Account Type:</span>
                          <span className="font-extrabold text-[#073653] uppercase px-2 py-0.5 bg-[#DFF3E8] rounded text-[10px]">
                            {user.effectiveRole}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#64839A]">Campus:</span>
                          <span className="font-bold text-[#073653]">IPCW (Delhi Univ.)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#64839A]">Canteen:</span>
                          <span className="font-bold text-[#2B7BFF]">IP Canteen</span>
                        </div>
                      </div>
                    </div>

                    {/* Admin Exit View-As Option */}
                    {user.role === 'ADMIN' && user.effectiveRole !== 'ADMIN' && onSwitchViewAs && (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onSwitchViewAs('ADMIN');
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-[#073653] bg-[#DFF3E8] hover:bg-[#BFEBDD] rounded-xl transition mt-2 min-h-[40px]"
                      >
                        <Eye className="w-4 h-4 text-[#2B7BFF]" />
                        <span>Exit View-As (Back to Admin)</span>
                      </button>
                    )}

                    {/* Sign Out Button */}
                    <button
                      id="navbar-sign-out-btn"
                      disabled={isLoggingOut}
                      onClick={async () => {
                        await onLogout();
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition mt-2 min-h-[44px]"
                    >
                      {isLoggingOut ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                          <span>Signing Out...</span>
                        </>
                      ) : (
                        <>
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </>
                      )}
                    </button>

                    {logoutError && (
                      <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-1.5 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{logoutError}</span>
                      </div>
                    )}
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
