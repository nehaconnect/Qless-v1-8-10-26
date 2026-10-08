'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  QrCode,
  Coffee,
  Calendar,
  X,
  History,
  AlertTriangle,
  Loader2,
  Inbox
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  isVegetarian: boolean;
  isAvailable: boolean;
  isTodaysMenu: boolean;
  categoryId: string;
}

interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
}

interface CartItem {
  item: MenuItem;
  quantity: number;
}

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
  batch: { displayLabel: string; startTime: string } | null;
  items: OrderItem[];
  createdAt: string;
}

interface CustomerPortalProps {
  user: any;
  canteenStatus: 'OPEN' | 'TOO_BUSY' | 'CLOSED';
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ user, canteenStatus }) => {
  const [activeTab, setActiveTab] = useState<'MENU' | 'CART' | 'ORDERS'>('MENU');
  const [menuMode, setMenuMode] = useState<'TODAY' | 'ALL'>('TODAY');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Menu data
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  // Time selection for ordering
  const [selectedTimeStr, setSelectedTimeStr] = useState<string>('11:00');
  const [calculatedBatch, setCalculatedBatch] = useState<string>('11:00–11:15 AM');

  // Customer orders
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [ordersTab, setOrdersTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [activePickupCodes, setActivePickupCodes] = useState<Record<string, string>>({}); // Stored from live session responses

  // UI action states
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [canteensList, setCanteensList] = useState<any[]>([]);
  const [selectedCanteenId, setSelectedCanteenId] = useState<string>('');

  // Fetch Available Canteens
  const fetchCanteens = async () => {
    try {
      const res = await fetch('/api/canteens');
      const data = await res.json();
      if (data.canteens && Array.isArray(data.canteens)) {
        setCanteensList(data.canteens);
        if (data.canteens.length > 0 && !selectedCanteenId) {
          setSelectedCanteenId(data.canteens[0].id);
        }
      }
    } catch {}
  };

  // Fetch Menu
  const fetchMenu = async (isInitial = false, canteenIdOverride?: string) => {
    try {
      if (isInitial) setIsLoadingMenu(true);
      const targetId = canteenIdOverride || selectedCanteenId;
      const url = targetId ? `/api/menu?canteenId=${targetId}` : '/api/menu';
      const res = await fetch(url);
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
      if (data.items) setMenuItems(data.items);
    } catch {
      // Quiet fail on background interval
    } finally {
      if (isInitial) setIsLoadingMenu(false);
    }
  };

  // Fetch Orders
  const fetchOrders = async (isInitial = false) => {
    try {
      if (isInitial) setIsLoadingOrders(true);
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.orders) setOrdersList(data.orders);
    } catch {
      // Quiet fail on background interval
    } finally {
      if (isInitial) setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchCanteens();
    fetchMenu(true);
    fetchOrders(true);
    const interval = setInterval(() => {
      fetchOrders(false);
      fetchMenu(false);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // When selected canteen changes, reload menu and reset cart
  const handleSelectCanteen = (cId: string) => {
    setSelectedCanteenId(cId);
    setCart([]);
    setSelectedCategory('ALL');
    fetchMenu(true, cId);
  };

  // Update calculated 15-minute batch preview (Strict 24-hour format, NO AM/PM)
  useEffect(() => {
    const [hStr, mStr] = selectedTimeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);

    let batchStartMin = Math.floor(m / 15) * 15;
    let batchEndMin = batchStartMin === 45 ? 0 : batchStartMin + 15;
    let batchEndHour = batchStartMin === 45 ? h + 1 : h;
    let effectiveHour = h;

    if (h === 17 && m === 0) {
      effectiveHour = 16;
      batchStartMin = 45;
      batchEndHour = 17;
      batchEndMin = 0;
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    setCalculatedBatch(`${pad(effectiveHour)}:${pad(batchStartMin)}–${pad(batchEndHour)}:${pad(batchEndMin)}`);
  }, [selectedTimeStr]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    if (!item.isAvailable) return;
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => (i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(i => {
          if (i.item.id === itemId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const cartTotal = cart.reduce((sum, ci) => sum + parseFloat(ci.item.price) * ci.quantity, 0);

  // Submit Order Request
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmittingOrder(true);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const exactPickupISO = `${todayStr}T${selectedTimeStr}:00.000Z`;

      const payload = {
        canteenId: selectedCanteenId || undefined,
        items: cart.map(ci => ({
          menuItemId: ci.item.id,
          quantity: ci.quantity,
        })),
        exactPickupTime: exactPickupISO,
        idempotencyKey: `ord_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      if (data.pickupCode && data.order?.id) {
        setActivePickupCodes(prev => ({ ...prev, [data.order.id]: data.pickupCode }));
      }

      setCart([]);
      setActiveTab('ORDERS');
      setOrdersTab('ACTIVE');
      await fetchOrders(false);
      setSuccessMsg(`Order #${data.order.orderNumber} submitted successfully!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating order');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Pay Order (Razorpay)
  const handlePayOrder = async (orderId: string) => {
    if (actionLoading[orderId]) return;
    setErrorMsg(null);
    setActionLoading(prev => ({ ...prev, [orderId]: 'PAYING' }));

    // Optimistic status update
    const prevOrders = [...ordersList];
    setOrdersList(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: 'CONFIRMED', paymentStatus: 'PAID' } : o))
    );

    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerPaymentId: `pay_rzp_${Date.now()}`,
          providerOrderId: `order_rzp_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment failed');
      }
      await fetchOrders(false);
      setSuccessMsg('Payment confirmed! Kitchen will prepare your meal.');
    } catch (err: any) {
      setOrdersList(prevOrders);
      setErrorMsg(err.message || 'Payment processing failed');
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  // Time suggestion response (Accept / Decline)
  const handleRespondTime = async (orderId: string, accept: boolean) => {
    const actKey = `${orderId}_${accept ? 'accept' : 'decline'}`;
    if (actionLoading[actKey]) return;
    setErrorMsg(null);
    setActionLoading(prev => ({ ...prev, [actKey]: 'RESPONDING' }));

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CUSTOMER_RESPOND_TIME',
          accept,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update time proposal');
      }
      await fetchOrders(false);
      setSuccessMsg(accept ? 'New pickup time accepted!' : 'Order cancelled.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating response');
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[actKey];
        return next;
      });
    }
  };

  // Filtered menu items
  const filteredItems = menuItems.filter(item => {
    if (menuMode === 'TODAY' && !item.isTodaysMenu) return false;
    if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) return false;
    return true;
  });

  const activeOrders = ordersList.filter(o => !['COLLECTED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(o.status));
  const previousOrders = ordersList.filter(o => ['COLLECTED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(o.status));

  const format24Time = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '--:--';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Canteen Status Banner */}
      {canteenStatus === 'TOO_BUSY' && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-bold">Canteen is Currently Busy</p>
            <p className="text-xs text-amber-700 font-normal mt-0.5">Existing orders are being prepared. New orders are temporarily paused.</p>
          </div>
        </div>
      )}

      {canteenStatus === 'CLOSED' && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div>
            <p className="font-bold">Canteen Closed</p>
            <p className="text-xs text-rose-700 font-normal mt-0.5">Operating hours are 08:00 – 17:00 (24h). New orders are disabled.</p>
          </div>
        </div>
      )}

      {/* Feedback Alerts */}
      {errorMsg && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-danger text-xs font-semibold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="p-1"><X className="w-4 h-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="p-1"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Canteen Switcher (when multiple canteens exist) */}
      {canteensList.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-6 p-2.5 bg-slate-100/90 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 mr-1">
            <Coffee className="w-4 h-4 text-primary-blue" />
            <span>Select Canteen:</span>
          </div>
          {canteensList.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelectCanteen(c.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition min-h-[36px] ${
                selectedCanteenId === c.id
                  ? 'bg-deep-blue text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('MENU')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'MENU' ? 'bg-deep-blue text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Coffee className="w-4 h-4" /> Menu
          </button>
          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center gap-2 relative ${
              activeTab === 'ORDERS' ? 'bg-deep-blue text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> My Orders
            {activeOrders.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary-blue text-white text-[10px] flex items-center justify-center font-bold">
                {activeOrders.length}
              </span>
            )}
          </button>
        </div>

        {/* Cart Quick Toggle Button */}
        <button
          onClick={() => setActiveTab('CART')}
          className={`py-2 px-4 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            cart.length > 0 ? 'bg-primary-blue text-white shadow-soft' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
          {cartTotal > 0 && <span className="font-extrabold ml-1">₹{cartTotal.toFixed(2)}</span>}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. MENU TAB */}
      {/* ========================================================================= */}
      {activeTab === 'MENU' && (
        <div>
          {/* Subheader: Today's Menu vs Full Menu toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex p-1 bg-slate-200/70 rounded-xl w-fit">
              <button
                onClick={() => setMenuMode('TODAY')}
                className={`px-4 py-2 min-h-[40px] rounded-lg text-xs font-bold transition ${
                  menuMode === 'TODAY' ? 'bg-white text-deep-blue shadow-sm' : 'text-slate-600'
                }`}
              >
                Today's Menu
              </button>
              <button
                onClick={() => setMenuMode('ALL')}
                className={`px-4 py-2 min-h-[40px] rounded-lg text-xs font-bold transition ${
                  menuMode === 'ALL' ? 'bg-white text-deep-blue shadow-sm' : 'text-slate-600'
                }`}
              >
                All Items
              </button>
            </div>

            {/* Category filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === 'ALL' ? 'bg-deep-blue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    selectedCategory === cat.id ? 'bg-deep-blue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid or Skeleton */}
          {isLoadingMenu && menuItems.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-200 p-5 h-44 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-8 bg-slate-200 rounded-xl mt-4" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No menu items currently available for this selection.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => {
                const inCart = cart.find(ci => ci.item.id === item.id);
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-3xl border p-5 shadow-card flex flex-col justify-between transition hover:shadow-tactile ${
                      !item.isAvailable ? 'opacity-60 bg-slate-50 border-slate-200' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold text-sm text-text-primary leading-snug">{item.name}</h3>
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${item.isVegetarian ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      </div>
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                        {item.description || 'Freshly prepared at IP Canteen.'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-base font-black text-deep-blue">₹{item.price}</span>

                      {!item.isAvailable ? (
                        <span className="text-[11px] font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                          SOLD OUT
                        </span>
                      ) : inCart ? (
                        <div className="flex items-center gap-2 bg-soft-blue rounded-xl p-1">
                          <button
                            onClick={() => updateCartQuantity(item.id, -1)}
                            className="w-7 h-7 rounded-lg bg-white text-deep-blue flex items-center justify-center font-bold hover:bg-slate-50"
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black text-deep-blue px-1">{inCart.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.id, 1)}
                            className="w-7 h-7 rounded-lg bg-white text-deep-blue flex items-center justify-center font-bold hover:bg-slate-50"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          disabled={canteenStatus !== 'OPEN'}
                          className="btn-tactile px-3.5 py-2 min-h-[44px] rounded-xl bg-deep-blue text-white text-xs font-bold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-soft"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
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
      {/* 2. CART & CHECKOUT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'CART' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-lg font-black text-text-primary">Your Order Cart</h2>
            <button
              onClick={() => setActiveTab('MENU')}
              className="text-xs font-bold text-primary-blue hover:underline"
            >
              + Add More Items
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">Your cart is empty</p>
              <button
                onClick={() => setActiveTab('MENU')}
                className="btn-tactile px-4 py-2 min-h-[44px] rounded-xl bg-deep-blue text-white text-xs font-bold"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
              {/* Line items list */}
              <div className="space-y-3 divide-y divide-slate-100">
                {cart.map(ci => (
                  <div key={ci.item.id} className="pt-3 first:pt-0 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-text-primary">{ci.item.name}</h4>
                      <span className="text-[11px] text-text-secondary">₹{ci.item.price} each</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
                        <button
                          onClick={() => updateCartQuantity(ci.item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white text-slate-700 flex items-center justify-center font-bold hover:bg-slate-50"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-black text-text-primary px-1">{ci.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(ci.item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white text-slate-700 flex items-center justify-center font-bold hover:bg-slate-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-xs font-black text-deep-blue min-w-[50px] text-right">
                        ₹{(parseFloat(ci.item.price) * ci.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Exact Pickup Time Picker */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-deep-blue" />
                    <span className="font-extrabold text-xs text-text-primary">Choose Exact Pickup Time</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-white px-2 py-0.5 rounded border">
                    8:00 AM – 5:00 PM
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={selectedTimeStr}
                    onChange={(e) => setSelectedTimeStr(e.target.value)}
                    min="08:00"
                    max="17:00"
                    className="px-3 py-2 min-h-[44px] rounded-xl border border-slate-300 font-bold text-sm bg-white text-deep-blue focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  />
                  <div className="text-xs">
                    <span className="text-text-secondary block">Continuous 15-Minute Prep Batch:</span>
                    <span className="font-extrabold text-deep-blue">{calculatedBatch}</span>
                  </div>
                </div>
              </div>

              {/* Total & Checkout */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary font-medium">Subtotal</span>
                  <span className="font-bold text-text-primary">₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-extrabold">
                  <span>Grand Total</span>
                  <span className="text-deep-blue text-lg">₹{cartTotal.toFixed(2)}</span>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmittingOrder || canteenStatus !== 'OPEN'}
                  className="btn-tactile w-full py-3.5 min-h-[48px] px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-deep-blue to-primary-blue shadow-soft hover:shadow-tactile hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  aria-busy={isSubmittingOrder}
                >
                  {isSubmittingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Order Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Order for {selectedTimeStr}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MY ORDERS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'ORDERS' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex p-1 bg-slate-200/70 rounded-xl w-fit" role="tablist">
            <button
              onClick={() => setOrdersTab('ACTIVE')}
              className={`px-4 py-2 min-h-[40px] rounded-lg text-xs font-bold transition ${
                ordersTab === 'ACTIVE' ? 'bg-white text-deep-blue shadow-sm' : 'text-slate-600'
              }`}
              role="tab"
              aria-selected={ordersTab === 'ACTIVE'}
            >
              Active Orders ({activeOrders.length})
            </button>
            <button
              onClick={() => setOrdersTab('HISTORY')}
              className={`px-4 py-2 min-h-[40px] rounded-lg text-xs font-bold transition ${
                ordersTab === 'HISTORY' ? 'bg-white text-deep-blue shadow-sm' : 'text-slate-600'
              }`}
              role="tab"
              aria-selected={ordersTab === 'HISTORY'}
            >
              Previous Orders ({previousOrders.length})
            </button>
          </div>

          {/* Active Orders List */}
          {ordersTab === 'ACTIVE' && (
            <div className="space-y-4">
              {isLoadingOrders && ordersList.length === 0 ? (
                <div className="space-y-4 animate-pulse">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 h-40" />
                  ))}
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                  <Coffee className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No active orders</p>
                  <p className="text-xs text-slate-400 mt-1">Place an order from the menu tab to track it here.</p>
                </div>
              ) : (
                activeOrders.map(order => {
                  const pickupCode = activePickupCodes[order.id];
                  const isPaying = actionLoading[order.id] === 'PAYING';
                  const isRespondingAccept = actionLoading[`${order.id}_accept`] === 'RESPONDING';
                  const isRespondingDecline = actionLoading[`${order.id}_decline`] === 'RESPONDING';

                  return (
                    <div key={order.id} className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-text-primary">{order.orderNumber}</span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-soft-blue text-deep-blue">
                              {order.status}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5">
                            Batch: <span className="font-semibold text-slate-700">{order.batch?.displayLabel || 'Continuous 15-min'}</span>
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-base font-extrabold text-deep-blue">₹{order.totalAmount}</span>
                          <span className="block text-[11px] text-text-secondary">{order.paymentStatus}</span>
                        </div>
                      </div>

                      {/* Time Negotiation Alert */}
                      {order.timeNegotiationStatus === 'SUGGESTED_BY_SELLER' && order.sellerSuggestedTime && (
                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                          <p className="text-xs font-bold text-amber-900">
                            Seller suggested an alternative pickup time: {format24Time(order.sellerSuggestedTime)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleRespondTime(order.id, true)}
                              disabled={isRespondingAccept || isRespondingDecline}
                              className="px-3.5 py-2 min-h-[44px] rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
                              aria-busy={isRespondingAccept}
                            >
                              {isRespondingAccept ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Accepting...
                                </>
                              ) : (
                                'Accept Suggested Time'
                              )}
                            </button>
                            <button
                              onClick={() => handleRespondTime(order.id, false)}
                              disabled={isRespondingAccept || isRespondingDecline}
                              className="px-3.5 py-2 min-h-[44px] rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 disabled:opacity-50 flex items-center gap-1.5"
                              aria-busy={isRespondingDecline}
                            >
                              {isRespondingDecline ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Declining...
                                </>
                              ) : (
                                'Decline & Cancel'
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Payment Required Card */}
                      {order.status === 'ACCEPTED' && order.paymentStatus === 'PENDING' && (
                        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-deep-blue">Payment Required</p>
                            <p className="text-[11px] text-slate-600">Seller accepted your order time. Complete payment via Razorpay.</p>
                          </div>
                          <button
                            onClick={() => handlePayOrder(order.id)}
                            disabled={isPaying}
                            className="btn-tactile px-4 py-2 min-h-[44px] rounded-xl bg-deep-blue text-white text-xs font-bold hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                            aria-busy={isPaying}
                          >
                            {isPaying ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-3.5 h-3.5" /> Pay ₹{order.totalAmount}
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Pickup Code Card (ONLY shown after verified payment: CONFIRMED, PREPARING, READY) */}
                      {pickupCode && ['CONFIRMED', 'PREPARING', 'READY'].includes(order.status) && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-soft-blue to-soft-lavender border border-blue-200 text-center animate-fadeIn">
                          <p className="text-xs font-bold text-deep-blue uppercase tracking-wider">Your 4-Character Pickup Code</p>
                          <p className="text-3xl font-black text-deep-blue tracking-widest my-1">{pickupCode}</p>
                          <p className="text-[11px] text-slate-600">Show this 4-character code at the pickup counter when food is ready.</p>
                        </div>
                      )}

                      {/* Order Items List */}
                      <div className="text-xs space-y-1">
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Ordered Items:</span>
                        {order.items?.map(item => (
                          <div key={item.id} className="flex justify-between text-slate-700">
                            <span>{item.itemName} × {item.quantity}</span>
                            <span className="font-semibold">₹{item.subtotal}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Previous Orders History */}
          {ordersTab === 'HISTORY' && (
            <div className="space-y-3">
              {previousOrders.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No previous orders in history.
                </div>
              ) : (
                previousOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-text-primary">{order.orderNumber}</p>
                      <p className="text-[11px] text-text-secondary">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-text-primary">₹{order.totalAmount}</span>
                      <span className="block text-[10px] text-slate-500">{order.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
