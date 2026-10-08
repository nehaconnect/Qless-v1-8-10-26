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
  Edit,
  Sliders,
  DollarSign
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
  const [tab, setTab] = useState<'ORDERS' | 'PREPARATION' | 'PICKUP' | 'MENU'>('ORDERS');

  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

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
  const refreshData = async () => {
    try {
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
    } catch {}
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => ({ ...prev, [batchId]: !prev[batchId] }));
  };

  // Seller Action: Accept Requested Time
  const handleAcceptOrder = async (orderId: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SELLER_ACCEPT' }),
      });
      refreshData();
    } catch {}
  };

  // Seller Action: Suggest Different Time
  const handleSuggestTime = async () => {
    if (!suggestOrderId) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const suggestedISO = `${todayStr}T${suggestTimeStr}:00.000Z`;

      await fetch(`/api/orders/${suggestOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SELLER_SUGGEST_TIME',
          suggestedTime: suggestedISO,
        }),
      });
      setSuggestOrderId(null);
      refreshData();
    } catch {}
  };

  // Seller Action: Start Preparing Batch
  const handleStartBatchPrep = async (batchId: string) => {
    try {
      await fetch('/api/orders/batch-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId }),
      });
      refreshData();
    } catch {}
  };

  // Seller Action: Mark Order Ready
  const handleMarkReady = async (orderId: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SELLER_READY' }),
      });
      refreshData();
    } catch {}
  };

  // Seller Action: Verify 4-Char Pickup Code
  const handleVerifyPickupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyOrderId || !enteredCode.trim()) return;

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
      }, 1500);
      refreshData();
    } catch (err: any) {
      setVerifyError(err.message || 'Incorrect pickup code');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Menu Toggle (Sold-Out / Today's Menu)
  const handleToggleMenuItem = async (itemId: string, field: 'isAvailable' | 'isTodaysMenu', currentVal: boolean) => {
    try {
      await fetch('/api/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, [field]: !currentVal }),
      });
      refreshData();
    } catch {}
  };

  // Group active orders by batch
  const batchesWithOrders = batches.map(batch => {
    const ordersInBatch = ordersList.filter(o => o.batchId === batch.id);

    // Calculate aggregated item quantities for the batch preparation summary
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
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${canteenStatus === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : canteenStatus === 'TOO_BUSY' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
              {canteenStatus}
            </span>
          </div>
        </div>

        {/* Status Switcher Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onUpdateStatus('OPEN')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${canteenStatus === 'OPEN' ? 'bg-emerald-600 text-white shadow-soft' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            OPEN
          </button>
          <button
            onClick={() => onUpdateStatus('TOO_BUSY')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${canteenStatus === 'TOO_BUSY' ? 'bg-amber-600 text-white shadow-soft' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            TOO BUSY
          </button>
          <button
            onClick={() => onUpdateStatus('CLOSED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${canteenStatus === 'CLOSED' ? 'bg-rose-600 text-white shadow-soft' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            CLOSED
          </button>
        </div>
      </div>

      {/* Seller Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setTab('ORDERS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${tab === 'ORDERS' ? 'bg-deep-blue text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Clock className="w-4 h-4" /> Batches & Orders
        </button>
        <button
          onClick={() => setTab('MENU')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${tab === 'MENU' ? 'bg-deep-blue text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Store className="w-4 h-4" /> Menu & Sold Out
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. ORDERS BY 15-MINUTE BATCH */}
      {/* ========================================================================= */}
      {tab === 'ORDERS' && (
        <div className="space-y-4">
          {batchesWithOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
              No orders received for any batch yet.
            </div>
          ) : (
            batchesWithOrders.map(({ batch, orders: bOrders, itemQuantities }) => {
              const isExpanded = expandedBatches[batch.id] ?? true;
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
                        className="btn-tactile px-3 py-1.5 rounded-xl bg-primary-blue text-white text-xs font-bold hover:bg-deep-blue flex items-center gap-1.5"
                      >
                        <Flame className="w-3.5 h-3.5" /> Start Preparing Batch
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Batch Body */}
                  {isExpanded && (
                    <div className="p-4 space-y-4">
                      {/* Batch Preparation Summary (Consolidated Quantities) */}
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
                        {bOrders.map(ord => (
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
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                                  >
                                    Accept Time
                                  </button>
                                  <button
                                    onClick={() => setSuggestOrderId(ord.id)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300"
                                  >
                                    Suggest Time
                                  </button>
                                </>
                              )}

                              {ord.status === 'PREPARING' && (
                                <button
                                  onClick={() => handleMarkReady(ord.id)}
                                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" /> Mark Ready
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
                                  className="px-3.5 py-1.5 rounded-xl bg-deep-blue text-white text-xs font-bold hover:bg-blue-800 flex items-center gap-1 shadow-soft"
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
                        ))}
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

          <div className="space-y-3">
            {menuItems.map(item => (
              <div key={item.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-text-primary">{item.name}</h4>
                  <span className="text-[11px] font-extrabold text-slate-700">₹{item.price}</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Today's Menu Toggle */}
                  <button
                    onClick={() => handleToggleMenuItem(item.id, 'isTodaysMenu', item.isTodaysMenu)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${item.isTodaysMenu ? 'bg-blue-50 border-blue-300 text-deep-blue' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                  >
                    {item.isTodaysMenu ? "Today's Menu: ON" : "Today's: OFF"}
                  </button>

                  {/* Instant Sold Out Toggle */}
                  <button
                    onClick={() => handleToggleMenuItem(item.id, 'isAvailable', item.isAvailable)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${item.isAvailable ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-rose-50 border-rose-300 text-rose-700'}`}
                  >
                    {item.isAvailable ? 'AVAILABLE' : 'SOLD OUT'}
                  </button>
                </div>
              </div>
            ))}
          </div>
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
              <button onClick={() => setVerifyOrderId(null)}><X className="w-4 h-4 text-slate-400" /></button>
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
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                placeholder="A7K2"
                className="w-full text-center text-3xl font-black tracking-widest py-3 border-2 border-primary-blue rounded-2xl uppercase focus:outline-none focus:ring-4 focus:ring-blue-100"
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

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVerifyOrderId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyLoading || enteredCode.length < 4}
                  className="flex-1 py-2.5 rounded-xl bg-deep-blue text-white text-xs font-bold hover:bg-blue-800 disabled:opacity-50"
                >
                  {verifyLoading ? 'Verifying...' : 'Complete Pickup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suggest Alternative Pickup Time Modal */}
      {suggestOrderId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-tactile border border-slate-200 p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95">
            <h3 className="font-bold text-sm text-text-primary">Suggest Alternative Pickup Time</h3>
            <p className="text-xs text-text-secondary">Customer will be notified to accept or decline your suggested time.</p>
            <input
              type="time"
              min="08:00"
              max="17:00"
              value={suggestTimeStr}
              onChange={(e) => setSuggestTimeStr(e.target.value)}
              className="w-full py-2.5 px-3 border border-slate-300 rounded-xl text-center text-lg font-bold"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setSuggestOrderId(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSuggestTime}
                className="flex-1 py-2 rounded-xl bg-deep-blue text-white text-xs font-bold"
              >
                Send Suggestion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
