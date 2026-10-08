'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Store,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Eye,
  Check,
  X,
  Loader2
} from 'lucide-react';

interface AdminMetrics {
  customers: number;
  sellers: number;
  ordersToday: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

interface SellerProfile {
  profileId: string;
  userId: string;
  name: string;
  username: string;
  phoneNumber: string;
  email: string;
  approvalStatus: string;
  createdAt: string;
}

interface AuditLog {
  id: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  metadata?: any;
}

interface AdminPortalProps {
  onSwitchViewAs: (role: 'CUSTOMER' | 'SELLER' | 'ADMIN') => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onSwitchViewAs }) => {
  const [activeTab, setActiveTab] = useState<'METRICS' | 'SELLERS' | 'AUDIT'>('METRICS');

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [mostOrdered, setMostOrdered] = useState<any[]>([]);
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOverview = async () => {
    try {
      const [ovRes, selRes] = await Promise.all([
        fetch('/api/admin/overview'),
        fetch('/api/admin/sellers'),
      ]);
      const [ovData, selData] = await Promise.all([
        ovRes.json(),
        selRes.json(),
      ]);

      if (ovData.metrics) setMetrics(ovData.metrics);
      if (ovData.mostOrdered) setMostOrdered(ovData.mostOrdered);
      if (ovData.recentLogs) setAuditLogs(ovData.recentLogs);
      if (selData.sellers) setSellers(selData.sellers);
    } catch {}
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleApproveSeller = async (sellerProfileId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await fetch('/api/admin/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerProfileId, status }),
      });
      fetchOverview();
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Admin Quick Switcher Banner */}
      <div className="bg-gradient-to-r from-deep-blue to-indigo-accent rounded-3xl p-6 text-white shadow-tactile flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider bg-white/20 px-3 py-1 rounded-full">
            Admin Control Center
          </span>
          <h2 className="text-xl font-black mt-2">Campus Administration & Live Oversight</h2>
          <p className="text-xs text-blue-100 mt-0.5">Indraprastha College for Women (IPCW) • IP Canteen Operations</p>
        </div>

        {/* View-As Support Mode Switcher */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSwitchViewAs('CUSTOMER')}
            className="btn-tactile px-3.5 py-2 rounded-xl bg-white text-deep-blue text-xs font-bold shadow-soft hover:bg-blue-50 flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> View as Student
          </button>
          <button
            onClick={() => onSwitchViewAs('SELLER')}
            className="btn-tactile px-3.5 py-2 rounded-xl bg-white text-deep-blue text-xs font-bold shadow-soft hover:bg-blue-50 flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> View as Seller
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('METRICS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === 'METRICS' ? 'bg-deep-blue text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <TrendingUp className="w-4 h-4" /> Operations Overview
        </button>
        <button
          onClick={() => setActiveTab('SELLERS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 relative ${activeTab === 'SELLERS' ? 'bg-deep-blue text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Store className="w-4 h-4" /> Seller Approvals
          {sellers.filter(s => s.approvalStatus === 'PENDING_APPROVAL').length > 0 && (
            <span className="w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
              {sellers.filter(s => s.approvalStatus === 'PENDING_APPROVAL').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === 'AUDIT' ? 'bg-deep-blue text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <FileText className="w-4 h-4" /> Immutable Audit Logs
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. METRICS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'METRICS' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Customers</span>
              <p className="text-2xl font-black text-text-primary mt-1">{metrics?.customers || 0}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">Registered ctr/</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Sellers</span>
              <p className="text-2xl font-black text-text-primary mt-1">{metrics?.sellers || 0}</p>
              <span className="text-[10px] text-blue-600 font-semibold">Registered slr/</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Orders Today</span>
              <p className="text-2xl font-black text-deep-blue mt-1">{metrics?.ordersToday || 0}</p>
              <span className="text-[10px] text-slate-500 font-medium">IST Calendar</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Active Orders</span>
              <p className="text-2xl font-black text-primary-blue mt-1">{metrics?.activeOrders || 0}</p>
              <span className="text-[10px] text-amber-600 font-semibold">In prep / ready</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Completed</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{metrics?.completedOrders || 0}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">Collected</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Cancelled</span>
              <p className="text-2xl font-black text-rose-600 mt-1">{metrics?.cancelledOrders || 0}</p>
              <span className="text-[10px] text-slate-400 font-medium">Rejections / timeout</span>
            </div>
          </div>

          {/* Most Ordered Items */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
            <h3 className="font-extrabold text-sm text-text-primary">Most Ordered Items (Authoritative DB Aggregation)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {mostOrdered.map((m, idx) => (
                <div key={m.itemName} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-soft-blue text-deep-blue text-xs font-black flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-text-primary">{m.itemName}</span>
                  </div>
                  <span className="text-xs font-extrabold text-deep-blue">{m.totalQuantity} sold</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SELLER APPROVALS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'SELLERS' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <h3 className="font-extrabold text-sm text-text-primary">Seller Accounts & Approval Workflow</h3>
          <p className="text-xs text-text-secondary">Sellers with PENDING_APPROVAL cannot access kitchen operations until approved.</p>

          <div className="space-y-3">
            {sellers.map(s => (
              <div key={s.profileId} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-text-primary">{s.name}</span>
                    <span className="text-xs font-mono text-deep-blue font-bold">({s.username})</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : s.approvalStatus === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                      {s.approvalStatus}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">Phone: +91 {s.phoneNumber} • Email: {s.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  {s.approvalStatus === 'PENDING_APPROVAL' ? (
                    <>
                      <button
                        onClick={() => handleApproveSeller(s.profileId, 'APPROVED')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleApproveSeller(s.profileId, 'REJECTED')}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium">Status active</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. AUDIT LOGS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-text-primary">Immutable Audit Trail</h3>
              <p className="text-xs text-text-secondary">Tracks all administrative state mutations and sensitive actions.</p>
            </div>
            <span className="text-[10px] font-bold uppercase bg-slate-100 px-3 py-1 rounded-full text-slate-600">Append-Only</span>
          </div>

          <div className="space-y-2">
            {auditLogs.map(log => (
              <div key={log.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-deep-blue text-[11px]">{log.action}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 font-bold text-slate-700">
                      {log.entityType} #{log.entityId.substring(0, 8)}
                    </span>
                    <span className="text-[10px] text-slate-400">Actor Role: {log.actorRole}</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
