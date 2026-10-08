'use client';

import React, { useState, useEffect } from 'react';
import {
  Store,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Flame,
  Check,
  QrCode,
  Lock,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Inbox
} from 'lucide-react';

interface OrderItem {
  id: string;
  itemName: string;
  unitPrice: string;
  quantity: number;
  subtotal: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  exactPickupTime: string;
  sellerSuggestedTime: string | null;
  timeNegotiationStatus: string;
  paymentStatus: string;
  batchId: string;
  customerName: string;
  customerPhone: string;
  batch: { displayLabel: string; startTime: string } | null;
  items: OrderItem[];
  createdAt: string;
}

interface Batch {
  id: string;
  displayLabel: string;
  startTime: string;
  endTime: string;
  capacity: number;
  reservedCount: number;
  status: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: string;
  isAvailable: boolean;
  isTodaysMenu: boolean;
  categoryId: string;
}

interface SellerPortalProps {
  user: any;
  canteenStatus: 'OPEN' | 'TOO_BUSY' | 'CLOSED';
  onUpdateStatus: (status: 'OPEN' | 'TOO_BUSY' | 'CLOSED') => void;
}

export const SellerPortal: React.FC<SellerPortalProps> = ({
  user,
  canteenStatus,
  onUpdateStatus,
}) => {
  const [tab, setTab] = useState<'ORDERS' | 'MENU'>('ORDERS');

  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // In-flight action tracking
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [portalError, setPortalError] = useState<string | null>(null);

  // Expanded batch IDs in accordion
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});

  // Verification state
  const [verifyOrderId, setVerifyOrderId] = useState<string | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);

  // Time Suggestion state
  const [suggestOrderId, setSuggestOrderId] = useState<string | null>(null);
  const [suggestTimeStr, setSuggestTimeStr] = useState('11:30');

  // Load orders & batches
  const refreshData = async (isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      const [ordRes, batchRes, menuRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/batches'),
        fetch('/api/menu'),
      ]);
      const [ordData, batchData, menuData] = await Promise.all([
        ordRes.json(),
        batchRes.json(),
        menuRes.json(),
      ]);

      if (ordData.orders) setOrdersList(ordData.orders);
      if (batchData.batches) setBatches(batchData.batches);
      if (menuData.items) setMenuItems(menuData.items);
    } catch {
      // Quiet fail on background interval
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData(true);
    // 15-second balanced interval
    const interval = setInterval(() => refreshData(false), 15000);
    return () => clearInterval(interval);
  }, []);

  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => ({ ...prev, [batchId]: !prev[batchId] }));
  };

  // Seller Action: Accept Requested Time
  const handleAcceptOrder = async (orderId: string) => {
    if (actionLoading[orderId]) return;
    setPortalError(null);
    setActionLoading(prev => ({ ...prev, [orderId]: 'ACCEPTING' }));

    // Optimistic update
    const prevOrders = [...ordersList];
    setOrdersList(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: 'ACCEPTED', paymentStatus: 'PENDING' } : o))
    );

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SELLER_ACCEPT' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to accept order.');
      }
      await refreshData(false);
    } catch (err: any) {
      setOrdersList(prevOrders);
      setPortalError(err.message || 'Error accepting order.');
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  // Seller Action: Suggest Different Time
  const handleSuggestTime = async () => {
    if (!suggestOrderId || actionLoading[suggestOrderId]) return;
    setPortalError(null);
    const orderId = suggestOrderId;
    setActionLoading(prev => ({ ...prev, [orderId]: 'SUGGESTING' }));

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const suggestedISO = `${todayStr}T${suggestTimeStr}:00.000Z`;

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SELLER_SUGGEST_TIME',
          suggestedTime: suggestedISO,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to suggest time.');
      }
      setSuggestOrderId(null);
      await refreshData(false);
    } catch (err: any) {
      setPortalError(err.message || 'Error suggesting time.');
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  // Seller Action: Start Preparing Batch
  const handleStartBatchPrep = async (batchId: string) => {
    if (actionLoading[batchId]) return;
    setPortalError(null);
    setActionLoading(prev => ({ ...prev, [batchId]: 'STARTING_PREP' }));

    // Optimistic update
    const prevOrders = [...ordersList];
    setOrdersList(prev =>
      prev.map(o => (o.batchId === batchId && o.status === 'CONFIRMED' ? { ...o, status: 'PREPARING' } : o))
    );

    try {
      const res = await fetch('/api/orders/batch-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start batch preparation.');
      }
      await refreshData(false);
    } catch (err: any) {
      setOrdersList(prevOrders);
      setPortalError(err.message || 'Error starting batch.');
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[batchId];
        return next;
      });
    }
  };

  // Seller Action: Mark Order Ready
  const handleMarkReady = async (orderId: string) => {
    if (actionLoading[orderId]) return;
    setPortalError(null);
    setActionLoading(prev => ({ ...prev, [orderId]: 'MARKING_READY' }));

    // Optimistic update
    const prevOrders = [...ordersList];
    setOrdersList(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: 'READY' } : o))
    );

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SELLER_READY' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to mark order ready.');
      }
      await refreshData(false);
    } catch (err: any) {
      setOrdersList(prevOrders);
      setPortalError(err.message || 'Error marking ready.');
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  // Seller Action: Verify 4-Char Pickup Code
  const handleVerifyPickupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyOrderId || !enteredCode.trim() || verifyLoading) return;

    setVerifyLoading(true);
    setVerifyError(null);
    setVerifySuccess(null);

    try {
      const res = await fetch(`/api/orders/${verifyOrderId}/verify-pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickupCode: enteredCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Pickup verification failed');
      }

      setVerifySuccess('✓ Verified! Order marked as Collected.');
      setEnteredCode('');
      setTimeout(() => {
        setVerifyOrderId(null);
        setVerifySuccess(null);
      }, 1200);
      await refreshData(false);
    } catch (err: any) {
      setVerifyError(err.message || 'Incorrect pickup code');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Menu Toggle (Sold-Out / Today's Menu)
  const handleToggleMenuItem = async (itemId: string, field: 'isAvailable' | 'isTodaysMenu', currentVal: boolean) => {
    const key = `${itemId}_${field}`;
    if (actionLoading[key]) return;

    setPortalError(null);
    setActionLoading(prev => ({ ...prev, [key]: 'SAVING' }));

    // Optimistic toggle
    const prevMenu = [...menuItems];
    setMenuItems(prev =>
      prev.map(it => (it.id === itemId ? { ...it, [field]: !currentVal } : it))
    );

    try {
      const res = await fetch('/api/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, [field]: !currentVal }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update menu item.');
      }
      await refreshData(false);
    } catch (err: any) {
      setMenuItems(prevMenu);
      setPortalError(err.message || 'Error updating item.');
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Group active orders by batch
  const batchesWithOrders = batches.map(batch => {
    const ordersInBatch = ordersList.filter(o => o.batchId === batch.id);

    const itemQuantities: Record<string, number> = {};
    ordersInBatch.forEach(o => {
      o.items?.forEach(i => {
        itemQuantities[i.itemName] = (itemQuantities[i.itemName] || 0) + i.quantity;
      });
    });

    return {
      batch,
      orders: ordersInBatch,
      itemQuantities,
    };
  }).filter(b => b.orders.length > 0 || b.batch.reservedCount > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Canteen Status Control Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase">Canteen Operating Status</span>
          <div className="flex items-center gap-2 mt-1">
            <h2 className="text-base font-extrabold text-text-primary">IP Canteen (IPCW)</h2>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              canteenStatus === 'OPEN'
                ? 'bg-emerald-100 text-emerald-800'
                : canteenStatus === 'TOO_BUSY'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}>
              {canteenStatus}
            </span>
          </div>
        </div>

        {/* Operating Status Quick Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onUpdateStatus('OPEN')}
            className={`btn-tactile px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              canteenStatus === 'OPEN'
                ? 'bg-emerald-600 text-white shadow-soft'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Check className="w-3.5 h-3.5" /> OPEN (Accepting Orders)
          </button>
          <button
            onClick={() => onUpdateStatus('TOO_BUSY')}
            className={`btn-tactile px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
              canteenStatus === 'TOO_BUSY'
                ? 'bg-amber-500 text-white shadow-soft'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> TOO BUSY (Pause New)
          </button>
          <button
            onClick={() => onUpdateStatus('CLOSED')}
            className={`btn-tactile px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500 ${
              canteenStatus === 'CLOSED'
                ? 'bg-rose-600 text-white shadow-soft'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <X className="w-3.5 h-3.5" /> CLOSED
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {portalError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{portalError}</span>
          </div>
          <button onClick={() => setPortalError(null)} className="text-rose-600 hover:text-rose-800 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3" role="tablist">
        <button
          onClick={() => setTab('ORDERS')}
          className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            tab === 'ORDERS' ? 'bg-deep-blue text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100'
          }`}
          role="tab"
          aria-selected={tab === 'ORDERS'}
        >
          <Clock className="w-4 h-4" /> Batches & Orders
        </button>
        <button
          onClick={() => setTab('MENU')}
          className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            tab === 'MENU' ? 'bg-deep-blue text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100'
          }`}
          role="tab"
          aria-selected={tab === 'MENU'}
        >
          <Store className="w-4 h-4" /> Menu & Sold Out
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. ORDERS BY 15-MINUTE BATCH */}
      {/* ========================================================================= */}
      {tab === 'ORDERS' && (
        <div className="space-y-4">
          {isLoading && batches.length === 0 ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 h-36" />
              ))}
            </div>
          ) : batchesWithOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No active orders received for any batch yet today.
            </div>
          ) : (
            batchesWithOrders.map(({ batch, orders: bOrders, itemQuantities }) => {
              const isExpanded = expandedBatches[batch.id] ?? true;
              const isBatchPrepStarting = actionLoading[batch.id] === 'STARTING_PREP';

              return (
                <div key={batch.id} className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
                  {/* Batch Header Bar */}
                  <div
                    onClick={() => toggleBatch(batch.id)}
                    className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-deep-blue text-white font-bold flex items-center justify-center text-xs">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-text-primary">{batch.displayLabel}</h3>
                        <p className="text-[11px] text-text-secondary">
                          Capacity: <span className="font-bold text-deep-blue">{batch.reservedCount} / {batch.capacity} booked</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Start Preparing Batch button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartBatchPrep(batch.id);
                        }}
                        disabled={isBatchPrepStarting}
                        className="btn-tactile px-3 py-2 min-h-[44px] rounded-xl bg-primary-blue text-white text-xs font-bold hover:bg-deep-blue disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                        aria-busy={isBatchPrepStarting}
                      >
                        {isBatchPrepStarting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting...
                          </>
                        ) : (
                          <>
                            <Flame className="w-3.5 h-3.5" /> Start Preparing Batch
                          </>
                        )}
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Batch Body */}
                  {isExpanded && (
                    <div className="p-4 space-y-4">
                      {/* Batch Preparation Summary */}
                      {Object.keys(itemQuantities).length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                          <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider block mb-1">
                            Batch Preparation Quantities:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(itemQuantities).map(([name, qty]) => (
                              <span key={name} className="px-2.5 py-1 rounded-xl bg-white border border-amber-200 text-xs font-extrabold text-amber-950 shadow-sm">
                                {name} × <span className="text-deep-blue text-sm">{qty}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Individual Customer Orders in this Batch */}
                      <div className="space-y-3">
                        {bOrders.map(ord => {
                          const isAccepting = actionLoading[ord.id] === 'ACCEPTING';
                          const isMarkingReady = actionLoading[ord.id] === 'MARKING_READY';
                          const isOrderBusy = Boolean(actionLoading[ord.id]);

                          return (
                            <div key={ord.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-text-primary">{ord.customerName}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">({ord.customerPhone})</span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-soft-blue text-deep-blue">
                                    {ord.status}
                                  </span>
                                </div>
                                <p className="text-[11px] text-text-secondary mt-0.5">
                                  Exact Requested Time: <span className="font-bold text-deep-blue">{new Date(ord.exactPickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> • Order #{ord.orderNumber}
                                </p>
                                <div className="text-[11px] text-slate-700 mt-1">
                                  {ord.items?.map(i => `${i.itemName} × ${i.quantity}`).join(', ')}
                                </div>
                              </div>

                              {/* Seller Action Controls */}
                              <div className="flex items-center gap-2">
                                {ord.status === 'REQUESTED' && (
                                  <>
                                    <button
                                      onClick={() => handleAcceptOrder(ord.id)}
                                      disabled={isOrderBusy}
                                      className="px-3.5 py-2 min-h-[44px] rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                      aria-busy={isAccepting}
                                    >
                                      {isAccepting ? (
                                        <>
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Accepting...
                                        </>
                                      ) : (
                                        'Accept Time'
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setSuggestOrderId(ord.id)}
                                      disabled={isOrderBusy}
                                      className="px-3.5 py-2 min-h-[44px] rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Suggest Time
                                    </button>
                                  </>
                                )}

                                {ord.status === 'PREPARING' && (
                                  <button
                                    onClick={() => handleMarkReady(ord.id)}
                                    disabled={isOrderBusy}
                                    className="px-3.5 py-2 min-h-[44px] rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    aria-busy={isMarkingReady}
                                  >
                                    {isMarkingReady ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3.5 h-3.5" /> Mark Ready
                                      </>
                                    )}
                                  </button>
                                )}

                                {ord.status === 'READY' && (
                                  <button
                                    onClick={() => {
                                      setVerifyOrderId(ord.id);
                                      setEnteredCode('');
                                      setVerifyError(null);
                                      setVerifySuccess(null);
                                    }}
                                    className="px-3.5 py-2 min-h-[44px] rounded-xl bg-deep-blue text-white text-xs font-bold hover:bg-blue-800 flex items-center gap-1.5 shadow-soft focus:outline-none focus:ring-2 focus:ring-primary-blue"
                                  >
                                    <QrCode className="w-3.5 h-3.5" /> Enter Pickup Code
                                  </button>
                                )}

                                {ord.status === 'COLLECTED' && (
                                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4" /> Collected
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MENU & SOLD OUT TAB */}
      {/* ========================================================================= */}
      {tab === 'MENU' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <h3 className="font-extrabold text-sm text-text-primary">Menu Management & Availability Switches</h3>
          <p className="text-xs text-text-secondary">Toggle SOLD OUT immediately to disable customer orders in real-time.</p>

          {isLoading && menuItems.length === 0 ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 h-16" />
              ))}
            </div>
          ) : menuItems.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No menu items configured for your canteen.
            </div>
          ) : (
            <div className="space-y-3">
              {menuItems.map(item => {
                const isAvailBusy = actionLoading[`${item.id}_isAvailable`] === 'SAVING';
                const isTodaysBusy = actionLoading[`${item.id}_isTodaysMenu`] === 'SAVING';

                return (
                  <div key={item.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-xs text-text-primary">{item.name}</h4>
                      <span className="text-[11px] font-extrabold text-slate-700">₹{item.price}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Today's Menu Toggle */}
                      <button
                        onClick={() => handleToggleMenuItem(item.id, 'isTodaysMenu', item.isTodaysMenu)}
                        disabled={isTodaysBusy}
                        className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold border transition disabled:opacity-50 flex items-center gap-1 ${
                          item.isTodaysMenu
                            ? 'bg-blue-50 border-blue-300 text-deep-blue'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}
                        aria-busy={isTodaysBusy}
                      >
                        {isTodaysBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : null}
                        {item.isTodaysMenu ? "Today's Menu: ON" : "Today's: OFF"}
                      </button>

                      {/* Instant Sold Out Toggle */}
                      <button
                        onClick={() => handleToggleMenuItem(item.id, 'isAvailable', item.isAvailable)}
                        disabled={isAvailBusy}
                        className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold border transition disabled:opacity-50 flex items-center gap-1 ${
                          item.isAvailable
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-rose-50 border-rose-300 text-rose-700'
                        }`}
                        aria-busy={isAvailBusy}
                      >
                        {isAvailBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : null}
                        {item.isAvailable ? 'AVAILABLE' : 'SOLD OUT'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Verify Pickup Code Modal */}
      {verifyOrderId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-tactile border border-slate-200 p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Lock className="w-4 h-4 text-deep-blue" /> Verify Customer Pickup Code
              </h3>
              <button onClick={() => setVerifyOrderId(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyPickupCode} className="space-y-4">
              <p className="text-xs text-text-secondary">
                Enter the 4-character code shown on the customer's phone:
              </p>

              <input
                type="text"
                maxLength={4}
                autoFocus
                required
                disabled={verifyLoading}
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                placeholder="A7K2"
                className="w-full text-center text-3xl font-black tracking-widest py-3 border-2 border-primary-blue rounded-2xl uppercase focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
              />

              {verifyError && (
                <p className="text-xs font-bold text-danger text-center bg-red-50 p-2.5 rounded-xl border border-red-200">
                  {verifyError}
                </p>
              )}
              {verifySuccess && (
                <p className="text-xs font-bold text-emerald-700 text-center bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  {verifySuccess}
                </p>
              )}

              <button
                type="submit"
                disabled={verifyLoading || enteredCode.length !== 4}
                className="w-full py-3 min-h-[44px] rounded-xl bg-deep-blue text-white font-bold text-sm hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-tactile focus:outline-none focus:ring-2 focus:ring-primary-blue"
                aria-busy={verifyLoading}
              >
                {verifyLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  'Verify & Complete Pickup'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Suggest Alternative Time Modal */}
      {suggestOrderId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-tactile border border-slate-200 p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Clock className="w-4 h-4 text-deep-blue" /> Suggest Alternative Time
              </h3>
              <button onClick={() => setSuggestOrderId(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-text-secondary">
                Select an alternative time for this order. Customer will receive a notification to accept or decline:
              </p>

              <input
                type="time"
                value={suggestTimeStr}
                onChange={(e) => setSuggestTimeStr(e.target.value)}
                min="08:00"
                max="17:00"
                className="w-full text-center text-xl font-bold py-2.5 border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-blue"
              />

              <button
                onClick={handleSuggestTime}
                disabled={Boolean(actionLoading[suggestOrderId])}
                className="w-full py-3 min-h-[44px] rounded-xl bg-primary-blue text-white font-bold text-sm hover:bg-deep-blue disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-tactile"
                aria-busy={Boolean(actionLoading[suggestOrderId])}
              >
                {actionLoading[suggestOrderId] ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending Suggestion...
                  </>
                ) : (
                  'Send Proposed Time to Customer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
