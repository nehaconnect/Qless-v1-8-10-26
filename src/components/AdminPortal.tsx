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
  Loader2,
  Inbox
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
  const [isLoading, setIsLoading] = useState(true);

  // In-flight action tracking & error display
  const [submittingAction, setSubmittingAction] = useState<Record<string, 'APPROVED' | 'REJECTED'>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchOverview = async (isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
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
    } catch {
      // Quiet fail on background interval
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(true);
    // Balanced 20s interval to prevent connection pool starvation
    const interval = setInterval(() => fetchOverview(false), 20000);
    return () => clearInterval(interval);
  }, []);

  const handleApproveSeller = async (sellerProfileId: string, status: 'APPROVED' | 'REJECTED') => {
    if (submittingAction[sellerProfileId]) return; // Prevent duplicate clicks

    setActionError(null);
    setSubmittingAction(prev => ({ ...prev, [sellerProfileId]: status }));

    // Safe optimistic update
    const prevSellers = [...sellers];
    setSellers(prev =>
      prev.map(s => (s.profileId === sellerProfileId ? { ...s, approvalStatus: status } : s))
    );

    try {
      const res = await fetch('/api/admin/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerProfileId, status }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to ${status.toLowerCase()} seller.`);
      }

      // Re-sync authoritative overview
      await fetchOverview(false);
    } catch (err: any) {
      // Rollback optimistic state on error
      setSellers(prevSellers);
      setActionError(err.message || 'Action failed. Please try again.');
    } finally {
      setSubmittingAction(prev => {
        const next = { ...prev };
        delete next[sellerProfileId];
        return next;
      });
    }
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
            className="btn-tactile px-3.5 py-2 min-h-[44px] rounded-xl bg-white text-deep-blue text-xs font-bold shadow-soft hover:bg-blue-50 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="View interface as Student"
          >
            <Eye className="w-3.5 h-3.5" /> View as Student
          </button>
          <button
            onClick={() => onSwitchViewAs('SELLER')}
            className="btn-tactile px-3.5 py-2 min-h-[44px] rounded-xl bg-white text-deep-blue text-xs font-bold shadow-soft hover:bg-blue-50 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="View interface as Seller"
          >
            <Eye className="w-3.5 h-3.5" /> View as Seller
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-600 hover:text-rose-800 p-1"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3 overflow-x-auto" role="tablist">
        <button
          onClick={() => setActiveTab('METRICS')}
          className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'METRICS'
              ? 'bg-deep-blue text-white shadow-soft'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          role="tab"
          aria-selected={activeTab === 'METRICS'}
        >
          <TrendingUp className="w-4 h-4" /> Operations Overview
        </button>
        <button
          onClick={() => setActiveTab('SELLERS')}
          className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center gap-2 flex-shrink-0 relative ${
            activeTab === 'SELLERS'
              ? 'bg-deep-blue text-white shadow-soft'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          role="tab"
          aria-selected={activeTab === 'SELLERS'}
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
          className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'AUDIT'
              ? 'bg-deep-blue text-white shadow-soft'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          role="tab"
          aria-selected={activeTab === 'AUDIT'}
        >
          <FileText className="w-4 h-4" /> Immutable Audit Logs
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. METRICS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'METRICS' && (
        <div className="space-y-6">
          {/* Skeletons or Key Metric Cards */}
          {isLoading && !metrics ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 h-24 space-y-2">
                  <div className="h-2.5 bg-slate-200 rounded w-16" />
                  <div className="h-6 bg-slate-200 rounded w-10 mt-2" />
                  <div className="h-2 bg-slate-100 rounded w-20" />
                </div>
              ))}
            </div>
          ) : (
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
          )}

          {/* Most Ordered Items */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
            <h3 className="font-extrabold text-sm text-text-primary">Most Ordered Items (Authoritative DB Aggregation)</h3>
            {isLoading && mostOrdered.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 h-16" />
                ))}
              </div>
            ) : mostOrdered.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No item sales recorded yet for today.
              </div>
            ) : (
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
            )}
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

          {isLoading && sellers.length === 0 ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 h-20" />
              ))}
            </div>
          ) : sellers.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <Store className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No seller accounts registered yet.
            </div>
          ) : (
            <div className="space-y-3">
              {sellers.map(s => {
                const isSubmitting = Boolean(submittingAction[s.profileId]);
                const actionType = submittingAction[s.profileId];

                return (
                  <div key={s.profileId} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-text-primary">{s.name}</span>
                        <span className="text-xs font-mono text-deep-blue font-bold">({s.username})</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.approvalStatus === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.approvalStatus === 'PENDING_APPROVAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
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
                            disabled={isSubmitting}
                            className="px-3.5 py-2 min-h-[44px] rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            aria-busy={isSubmitting && actionType === 'APPROVED'}
                          >
                            {isSubmitting && actionType === 'APPROVED' ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Approving...
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" /> Approve
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleApproveSeller(s.profileId, 'REJECTED')}
                            disabled={isSubmitting}
                            className="px-3.5 py-2 min-h-[44px] rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            aria-busy={isSubmitting && actionType === 'REJECTED'}
                          >
                            {isSubmitting && actionType === 'REJECTED' ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rejecting...
                              </>
                            ) : (
                              <>
                                <X className="w-3.5 h-3.5" /> Reject
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded-lg">
                          Status: {s.approvalStatus}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

          {isLoading && auditLogs.length === 0 ? (
            <div className="space-y-2 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 h-12" />
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No audit logs recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map(log => (
                <div key={log.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-deep-blue text-[11px]">{log.action}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 font-bold text-slate-700">
                        {log.entityType} #{log.entityId.substring(0, 8)}
                      </span>
                      <span className="text-[10px] text-slate-400">Actor: {log.actorRole}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
