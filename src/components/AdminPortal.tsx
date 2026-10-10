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
  Inbox,
  Search,
  Filter,
  Trash2,
  LogOut,
  Menu as MenuIcon,
  Layers,
  Phone,
  Calendar,
  DollarSign,
  ChevronRight,
  Shield,
  UserCheck
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
  canteenId?: string | null;
  canteenName?: string | null;
  createdAt: string;
}

interface CustomerRecord {
  id: string;
  name: string;
  username: string;
  phoneNumber: string;
  email: string;
  registrationDate: string;
  isSessionActive: boolean;
  sessionStatus: 'ACTIVE' | 'OFFLINE' | 'DELETED';
  accountStatus: 'ACTIVE' | 'DELETED';
  orderCount: number;
}

interface AdminOrderRecord {
  id: string;
  orderNumber: string;
  customerName: string;
  username: string;
  phoneNumber: string;
  canteenName: string;
  canteenId: string;
  items: Array<{ name: string; quantity: number; unitPrice: string; subtotal: string }>;
  itemsSummary: string;
  totalAmount: string;
  createdAt: string;
  createdAtFormatted: string;
  exactPickupTime: string;
  exactPickupTimeFormatted: string;
  batchLabel: string;
  status: string;
  paymentStatus: string;
  collectedAt: string | null;
  collectedAtFormatted: string | null;
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
  onLogout?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onSwitchViewAs, onLogout }) => {
  // Navigation: 5 sections
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'OPERATIONS' | 'ANALYTICS' | 'MANAGEMENT' | 'ACCOUNT'>('OVERVIEW');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Data states
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [mostOrdered, setMostOrdered] = useState<any[]>([]);
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [availableCanteens, setAvailableCanteens] = useState<any[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [ordersList, setOrdersList] = useState<AdminOrderRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [canteenStatusData, setCanteenStatusData] = useState<any>(null);

  // Filter & Search states
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [customerSearch, setCustomerSearch] = useState('');
  const [managementSubTab, setManagementSubTab] = useState<'CUSTOMERS' | 'SELLERS'>('CUSTOMERS');

  // Loading & In-flight action states
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<Record<string, string>>({});

  // Customer Deletion Modal
  const [targetDeleteCustomer, setTargetDeleteCustomer] = useState<CustomerRecord | null>(null);

  const fetchOverview = async (isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      const [ovRes, selRes, custRes, ordRes, canRes] = await Promise.all([
        fetch('/api/admin/overview'),
        fetch('/api/admin/sellers'),
        fetch('/api/admin/customers'),
        fetch(`/api/admin/orders?status=${orderStatusFilter}&search=${encodeURIComponent(orderSearch)}`),
        fetch('/api/canteen/status'),
      ]);

      const [ovData, selData, custData, ordData, canData] = await Promise.all([
        ovRes.json().catch(() => ({})),
        selRes.json().catch(() => ({})),
        custRes.json().catch(() => ({})),
        ordRes.json().catch(() => ({})),
        canRes.json().catch(() => ({})),
      ]);

      if (ovData.metrics) setMetrics(ovData.metrics);
      if (ovData.mostOrdered) setMostOrdered(ovData.mostOrdered);
      if (ovData.recentLogs) setAuditLogs(ovData.recentLogs);
      if (selData.sellers) setSellers(selData.sellers);
      if (selData.canteens) setAvailableCanteens(selData.canteens);
      if (custData.customers) setCustomers(custData.customers);
      if (ordData.orders) setOrdersList(ordData.orders);
      if (canData.canteen) setCanteenStatusData(canData.canteen);
    } catch {
      // Quiet fail on background interval
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(true);
    const interval = setInterval(() => fetchOverview(false), 20000);
    return () => clearInterval(interval);
  }, [orderStatusFilter, orderSearch]);

  const handleApproveSeller = async (sellerProfileId: string, status: 'APPROVED' | 'REJECTED' | 'DEACTIVATED') => {
    if (submittingAction[sellerProfileId]) return;
    setActionError(null);
    setActionSuccess(null);
    setSubmittingAction(prev => ({ ...prev, [sellerProfileId]: status }));

    try {
      const res = await fetch('/api/admin/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerProfileId, status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to update seller.`);

      setActionSuccess(`Seller account successfully updated to ${status}.`);
      await fetchOverview(false);
    } catch (err: any) {
      setActionError(err.message || 'Action failed. Please try again.');
    } finally {
      setSubmittingAction(prev => {
        const next = { ...prev };
        delete next[sellerProfileId];
        return next;
      });
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (submittingAction[customerId]) return;
    setActionError(null);
    setActionSuccess(null);
    setSubmittingAction(prev => ({ ...prev, [customerId]: 'DELETING' }));

    try {
      const res = await fetch(`/api/admin/customers?id=${customerId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete customer.');

      setActionSuccess('Customer account deleted and sessions revoked successfully.');
      setTargetDeleteCustomer(null);
      await fetchOverview(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmittingAction(prev => {
        const next = { ...prev };
        delete next[customerId];
        return next;
      });
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q) || c.phoneNumber.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
      {/* Mobile Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-surface shadow-2xl p-5 border-r border-slate-200 z-10 animate-in slide-in-from-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-deep-blue text-white flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-text-primary">Admin Control</h3>
                  <p className="text-[10px] text-slate-500">Indraprastha College for Women</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1 flex-1">
              {[
                { id: 'OVERVIEW', label: 'Overview', icon: TrendingUp },
                { id: 'OPERATIONS', label: 'Operations & Orders', icon: ShoppingBag },
                { id: 'ANALYTICS', label: 'Analytics', icon: Layers },
                { id: 'MANAGEMENT', label: 'Management', icon: Users },
                { id: 'ACCOUNT', label: 'Account', icon: Shield },
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition min-h-[44px] ${
                      isActive ? 'bg-deep-blue text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {onLogout && (
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-rose-50 text-danger hover:bg-rose-100 transition min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Control Center Header */}
      <div className="bg-[#073653] rounded-3xl p-6 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#BFEBDD]">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-white"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <span className="text-xs uppercase font-black tracking-wider bg-[#00B894] text-white px-3 py-1 rounded-full">
              Admin Control Center
            </span>
          </div>
          <h2 className="text-xl font-black mt-2 text-white">Campus Administration & Live Oversight</h2>
          <p className="text-xs text-[#DFF3E8] mt-0.5 font-semibold">Indraprastha College for Women (IPCW) • IP Canteen Operations</p>
        </div>

        {/* View-As Support Mode Switcher */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSwitchViewAs('CUSTOMER')}
            className="px-3.5 py-2 min-h-[44px] rounded-xl bg-white text-[#073653] text-xs font-bold shadow-sm hover:bg-[#DFF3E8] flex items-center gap-1.5 focus:outline-none transition"
          >
            <Eye className="w-3.5 h-3.5 text-[#2B7BFF]" /> View as Student
          </button>
          <button
            onClick={() => onSwitchViewAs('SELLER')}
            className="px-3.5 py-2 min-h-[44px] rounded-xl bg-white text-[#073653] text-xs font-bold shadow-sm hover:bg-[#DFF3E8] flex items-center gap-1.5 focus:outline-none transition"
          >
            <Eye className="w-3.5 h-3.5 text-[#2B7BFF]" /> View as Seller
          </button>
        </div>
      </div>

      {/* Feedback Banners */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-800 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-[#DFF3E8] border border-[#BFEBDD] text-[#073653] text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00B894] shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-[#073653] hover:text-[#00B894] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5-Section Desktop Navigation Tabs */}
      <div className="hidden md:flex gap-2 border-b border-[#BFEBDD]/60 pb-3 overflow-x-auto">
        {[
          { id: 'OVERVIEW', label: 'Overview', icon: TrendingUp },
          { id: 'OPERATIONS', label: 'Operations', icon: ShoppingBag },
          { id: 'ANALYTICS', label: 'Analytics', icon: Layers },
          { id: 'MANAGEMENT', label: 'Management', icon: Users },
          { id: 'ACCOUNT', label: 'Account', icon: Shield },
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-extrabold transition flex items-center gap-2 shrink-0 ${
                isActive ? 'bg-[#00B894] text-white shadow-sm' : 'text-[#073653] hover:bg-[#DFF3E8]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. OVERVIEW TAB */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Canteen Status Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-deep-blue flex items-center justify-center font-bold">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-text-primary">IP Canteen Live Operating Status</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    canteenStatusData?.operatingStatus === 'OPEN' ? 'bg-emerald-100 text-emerald-800' :
                    canteenStatusData?.operatingStatus === 'TOO_BUSY' ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    ● {canteenStatusData?.operatingStatus || 'OPEN'}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Scheduled Hours: <span className="font-bold text-slate-700">8:00 AM to 5:00 PM IST</span> • Manual Override: {canteenStatusData?.manualOverrideStatus ? `Active (${canteenStatusData.manualOverrideStatus})` : 'None (Auto Hours)'}
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              One Approved Seller Rule: Enforced
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Customers</span>
              <p className="text-2xl font-black text-text-primary mt-1">{customers.length || metrics?.customers || 0}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">Registered ctr/</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Sellers</span>
              <p className="text-2xl font-black text-text-primary mt-1">{sellers.length || metrics?.sellers || 0}</p>
              <span className="text-[10px] text-blue-600 font-semibold">Registered slr/</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Orders Today</span>
              <p className="text-2xl font-black text-deep-blue mt-1">{ordersList.length || metrics?.ordersToday || 0}</p>
              <span className="text-[10px] text-slate-500 font-medium">IST Calendar</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Active Orders</span>
              <p className="text-2xl font-black text-primary-blue mt-1">{metrics?.activeOrders || ordersList.filter(o => !['COLLECTED', 'REJECTED', 'CANCELLED'].includes(o.status)).length}</p>
              <span className="text-[10px] text-amber-600 font-semibold">In prep / ready</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Completed</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{ordersList.filter(o => o.status === 'COLLECTED').length || metrics?.completedOrders || 0}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">Collected</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Cancelled / Rej</span>
              <p className="text-2xl font-black text-rose-600 mt-1">{ordersList.filter(o => ['REJECTED', 'CANCELLED'].includes(o.status)).length || metrics?.cancelledOrders || 0}</p>
              <span className="text-[10px] text-slate-400 font-medium">Declined</span>
            </div>
          </div>

          {/* Most Ordered Items */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
            <h3 className="font-extrabold text-sm text-text-primary">Most Ordered Items (Authoritative DB Aggregation)</h3>
            {mostOrdered.length === 0 ? (
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
      {/* 2. OPERATIONS TAB (Comprehensive Order Tracking & History) */}
      {/* ========================================================================= */}
      {activeTab === 'OPERATIONS' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-text-primary">Campus Order History & Tracking</h3>
              <p className="text-xs text-text-secondary">
                Track which customer ordered what and when across 15-minute batches and exact pickup times.
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search order #, customer..."
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none min-h-[40px]"
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold min-h-[40px]"
              >
                <option value="ALL">All Statuses</option>
                <option value="REQUESTED">REQUESTED</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PREPARING">PREPARING</option>
                <option value="READY">READY</option>
                <option value="COLLECTED">COLLECTED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          {ordersList.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No matching orders found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black">
                    <th className="py-3 px-3">Order #</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Canteen</th>
                    <th className="py-3 px-3">Items & Quantities</th>
                    <th className="py-3 px-3">Total</th>
                    <th className="py-3 px-3">Requested Pickup</th>
                    <th className="py-3 px-3">Batch Window</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Payment</th>
                    <th className="py-3 px-3">Collection Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordersList.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-mono font-bold text-deep-blue">#{o.orderNumber}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{o.customerName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{o.username}</div>
                        {o.phoneNumber !== '--' && (
                          <div className="text-[10px] text-slate-400">{o.phoneNumber}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{o.canteenName}</td>
                      <td className="py-3 px-3 text-slate-700 max-w-xs">{o.itemsSummary}</td>
                      <td className="py-3 px-3 font-black text-slate-900">₹{parseFloat(o.totalAmount).toFixed(2)}</td>
                      <td className="py-3 px-3 font-bold text-primary-blue">{o.exactPickupTimeFormatted}</td>
                      <td className="py-3 px-3 text-slate-600">{o.batchLabel}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          o.status === 'COLLECTED' ? 'bg-slate-100 text-slate-600' :
                          o.status === 'READY' ? 'bg-teal-100 text-teal-800' :
                          o.status === 'CONFIRMED' || o.status === 'PREPARING' ? 'bg-emerald-100 text-emerald-800' :
                          o.status === 'REQUESTED' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700 uppercase text-[10px]">{o.paymentStatus}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{o.collectedAtFormatted || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ANALYTICS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
            <h3 className="font-extrabold text-sm text-text-primary">Campus Batch Utilization & Sales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Food Sales</span>
                <p className="text-xl font-black text-deep-blue mt-1">
                  ₹{ordersList.filter(o => o.paymentStatus === 'COMPLETED').reduce((acc, curr) => acc + parseFloat(curr.totalAmount), 0).toFixed(2)}
                </p>
                <span className="text-[11px] text-emerald-600 font-semibold">Realtime payments</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Order Value</span>
                <p className="text-xl font-black text-slate-800 mt-1">
                  ₹{ordersList.length > 0 ? (ordersList.reduce((acc, curr) => acc + parseFloat(curr.totalAmount), 0) / ordersList.length).toFixed(2) : '0.00'}
                </p>
                <span className="text-[11px] text-slate-500 font-semibold">Across all batches</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Operating Hours</span>
                <p className="text-xl font-black text-emerald-700 mt-1">8:00 AM–5:00 PM</p>
                <span className="text-[11px] text-slate-500 font-semibold">15-minute intervals</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MANAGEMENT TAB (Customer & Seller Management) */}
      {/* ========================================================================= */}
      {activeTab === 'MANAGEMENT' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setManagementSubTab('CUSTOMERS')}
                className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  managementSubTab === 'CUSTOMERS' ? 'bg-deep-blue text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Customer Records ({customers.length})</span>
              </button>
              <button
                onClick={() => setManagementSubTab('SELLERS')}
                className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  managementSubTab === 'SELLERS' ? 'bg-deep-blue text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Seller Accounts ({sellers.length})</span>
              </button>
            </div>
          </div>

          {/* CUSTOMER TABLE */}
          {managementSubTab === 'CUSTOMERS' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-text-secondary">
                  Real registered customer records. Active session status updates based on authoritative session tracking.
                </p>
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none min-h-[40px]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black">
                      <th className="py-3 px-3">Customer Name</th>
                      <th className="py-3 px-3">Username</th>
                      <th className="py-3 px-3">Mobile Number</th>
                      <th className="py-3 px-3">Registered On</th>
                      <th className="py-3 px-3">Session Status</th>
                      <th className="py-3 px-3">Orders Placed</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 font-bold text-slate-900">{c.name}</td>
                        <td className="py-3 px-3 font-mono text-deep-blue">{c.username}</td>
                        <td className="py-3 px-3 text-slate-600">{c.phoneNumber}</td>
                        <td className="py-3 px-3 text-slate-500">
                          {c.registrationDate ? new Date(c.registrationDate).toLocaleDateString() : '--'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            c.sessionStatus === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.sessionStatus === 'DELETED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              c.sessionStatus === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' :
                              c.sessionStatus === 'DELETED' ? 'bg-rose-500' : 'bg-slate-400'
                            }`} />
                            {c.sessionStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-black text-slate-800">{c.orderCount} order{c.orderCount !== 1 ? 's' : ''}</td>
                        <td className="py-3 px-3 text-right">
                          {c.accountStatus !== 'DELETED' ? (
                            <button
                              onClick={() => setTargetDeleteCustomer(c)}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 text-danger hover:bg-rose-100 font-bold text-[11px] transition min-h-[36px]"
                            >
                              Delete Account
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-semibold">Account Deleted</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SELLER TABLE */}
          {managementSubTab === 'SELLERS' && (
            <div className="space-y-4">
              <p className="text-xs text-text-secondary">
                Enforces critical business rule: <span className="font-bold text-slate-700">1 Canteen ↔ 1 Active Seller</span>. Concurrency protected.
              </p>

              <div className="space-y-3">
                {sellers.map(s => {
                  const isSubmitting = Boolean(submittingAction[s.profileId]);

                  return (
                    <div
                      key={s.profileId}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-text-primary">{s.name}</span>
                          <span className="text-xs font-mono text-deep-blue font-bold">({s.username})</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            s.approvalStatus === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {s.approvalStatus}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary mt-1">
                          Phone: +91 {s.phoneNumber} • Assigned Canteen:{' '}
                          <span className="font-bold text-slate-800">{s.canteenName || 'None'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {s.approvalStatus === 'PENDING_APPROVAL' && (
                          <button
                            onClick={() => handleApproveSeller(s.profileId, 'APPROVED')}
                            disabled={isSubmitting}
                            className="px-3.5 py-2 min-h-[44px] rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}
                        {s.approvalStatus === 'APPROVED' && (
                          <button
                            onClick={() => handleApproveSeller(s.profileId, 'DEACTIVATED')}
                            disabled={isSubmitting}
                            className="px-3.5 py-2 min-h-[44px] rounded-xl bg-rose-50 text-danger hover:bg-rose-100 text-xs font-bold disabled:opacity-50"
                          >
                            Deactivate Seller
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ACCOUNT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'ACCOUNT' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4 max-w-xl">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-deep-blue text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-text-primary">Campus Administrator</h3>
              <p className="text-xs text-text-secondary">Indraprastha College for Women (IPCW)</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
              <span className="text-slate-400">Security Clearance:</span>
              <span className="font-bold text-slate-800">Super Administrator</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
              <span className="text-slate-400">Campus:</span>
              <span className="font-bold text-slate-800">IPCW (University of Delhi)</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
              <span className="text-slate-400">Active Canteen:</span>
              <span className="font-bold text-deep-blue">IP Canteen</span>
            </div>
          </div>

          {onLogout && (
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-rose-50 text-danger hover:bg-rose-100 transition min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Administrator Portal</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {targetDeleteCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-danger flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-extrabold text-text-primary">Delete Customer Account</h3>
              <p className="text-xs text-text-secondary mt-1">
                Are you sure you want to delete customer <span className="font-bold text-slate-800">{targetDeleteCustomer.name} ({targetDeleteCustomer.username})</span>?
                This will immediately revoke their active sessions while safely preserving order history.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTargetDeleteCustomer(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCustomer(targetDeleteCustomer.id)}
                disabled={Boolean(submittingAction[targetDeleteCustomer.id])}
                className="flex-1 py-2.5 rounded-xl bg-danger text-white text-xs font-extrabold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                {submittingAction[targetDeleteCustomer.id] && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
