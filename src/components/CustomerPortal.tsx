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
  AlertTriangle
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

  // Time selection for ordering
  const [selectedTimeStr, setSelectedTimeStr] = useState<string>('11:00');
  const [calculatedBatch, setCalculatedBatch] = useState<string>('11:00–11:15 AM');

  // Customer orders
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [ordersTab, setOrdersTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [activePickupCodes, setActivePickupCodes] = useState<Record<string, string>>({}); // Stored from live session responses

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch Menu
  const fetchMenu = async () => {
    try {
      const res = await fetch('/api/menu');
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
      if (data.items) setMenuItems(data.items);
    } catch {}
  };

  // Fetch Orders
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.orders) setOrdersList(data.orders);
    } catch {}
  };

  useEffect(() => {
    fetchMenu();
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders();
      fetchMenu();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Update calculated 15-minute batch preview whenever user picks an arbitrary minute
  useEffect(() => {
    const [hStr, mStr] = selectedTimeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);

    const batchStartMin = Math.floor(m / 15) * 15;
    const batchEndMin = batchStartMin === 45 ? 0 : batchStartMin + 15;
    const batchEndHour = batchStartMin === 45 ? h + 1 : h;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatAmPm = (hour: number, min: number) => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayH = hour % 12 === 0 ? 12 : hour % 12;
      return `${displayH}:${pad(min)} ${ampm}`;
    };

    setCalculatedBatch(`${formatAmPm(h, batchStartMin)}–${formatAmPm(batchEndHour, batchEndMin)}`);
  }, [selectedTimeStr]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    if (!item.isAvailable || canteenStatus !== 'OPEN') return;
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.item.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.item.id !== itemId);
    });
  };

  const cartTotal = cart.reduce((sum, i) => sum + parseFloat(i.item.price) * i.quantity, 0);

  // Submit Order
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const exactPickupISO = `${todayStr}T${selectedTimeStr}:00.000Z`;

      const payload = {
        items: cart.map(i => ({ menuItemId: i.item.id, quantity: i.quantity })),
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

      // If plaintext pickup code was returned, store in session state for customer UI
      if (data.pickupCode && data.order?.id) {
        setActivePickupCodes(prev => ({ ...prev, [data.order.id]: data.pickupCode }));
      }

      setCart([]);
      setActiveTab('ORDERS');
      setOrdersTab('ACTIVE');
      fetchOrders();
      setSuccessMsg(`Order #${data.order.orderNumber} submitted successfully!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pay Order (Razorpay)
  const handlePayOrder = async (orderId: string) => {
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
      if (res.ok) {
        fetchOrders();
        setSuccessMsg('Payment confirmed! Kitchen will prepare your meal.');
      } else {
        setErrorMsg(data.error || 'Payment failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Time suggestion response (Accept / Decline)
  const handleRespondTime = async (orderId: string, accept: boolean) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CUSTOMER_RESPOND_TIME',
          accept,
        }),
      });
      if (res.ok) {
        fetchOrders();
        setSuccessMsg(accept ? 'New pickup time accepted!' : 'Order cancelled.');
      }
    } catch {}
  };

  // Filtered menu items
  const filteredItems = menuItems.filter(item => {
    if (menuMode === 'TODAY' && !item.isTodaysMenu) return false;
    if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) return false;
    return true;
  });

  const activeOrders = ordersList.filter(o => !['COLLECTED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(o.status));
  const previousOrders = ordersList.filter(o => ['COLLECTED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(o.status));

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
            <p className="text-xs text-rose-700 font-normal mt-0.5">Operating hours are 8:00 AM – 5:00 PM. New orders are disabled.</p>
          </div>
        </div>
      )}

      {/* Feedback Alerts */}
      {errorMsg && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-danger text-xs font-semibold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('MENU')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === 'MENU' ? 'bg-deep-blue text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Coffee className="w-4 h-4" /> Menu
          </button>
          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 relative ${activeTab === 'ORDERS' ? 'bg-deep-blue text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100'}`}
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
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition ${cart.length > 0 ? 'bg-primary-blue text-white shadow-soft' : 'bg-slate-100 text-slate-500'}`}
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
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${menuMode === 'TODAY' ? 'bg-white text-deep-blue shadow-sm' : 'text-slate-600'}`}
              >
                Today's Menu
              </button>
              <button
                onClick={() => setMenuMode('ALL')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${menuMode === 'ALL' ? 'bg-white text-deep-blue shadow-sm' : 'text-slate-600'}`}
              >
                Full Menu
              </button>
            </div>

            {/* Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === 'ALL' ? 'bg-soft-blue text-deep-blue border border-blue-300' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                All Items
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat.id ? 'bg-soft-blue text-deep-blue border border-blue-300' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Food Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map(item => {
              const inCart = cart.find(i => i.item.id === item.id);
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border p-4 shadow-card flex flex-col justify-between transition ${!item.isAvailable ? 'opacity-60 border-slate-200 bg-slate-50' : 'border-slate-200/80 hover:shadow-soft'}`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm border border-emerald-600 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700">VEG</span>
                      </div>
                      {!item.isAvailable && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                          SOLD OUT
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-text-primary mt-2">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-extrabold text-base text-text-primary">₹{item.price}</span>

                    {item.isAvailable && canteenStatus === 'OPEN' ? (
                      inCart ? (
                        <div className="flex items-center gap-2 bg-soft-blue px-2 py-1 rounded-xl border border-blue-200">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-6 h-6 rounded-lg bg-white text-deep-blue font-bold flex items-center justify-center hover:bg-blue-100"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-deep-blue px-1">{inCart.quantity}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-6 h-6 rounded-lg bg-white text-deep-blue font-bold flex items-center justify-center hover:bg-blue-100"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="btn-tactile px-3.5 py-1.5 rounded-xl bg-soft-blue text-deep-blue border border-blue-200 font-bold text-xs hover:bg-deep-blue hover:text-white transition flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      )
                    ) : (
                      <button disabled className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 font-semibold text-xs cursor-not-allowed">
                        Unavailable
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CART & TIME SELECTION TAB */}
      {/* ========================================================================= */}
      {activeTab === 'CART' && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-tactile p-6">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShoppingBag className="w-5 h-5 text-deep-blue" /> Your Cart
          </h2>

          {cart.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">Your cart is empty</p>
              <button
                onClick={() => setActiveTab('MENU')}
                className="mt-3 text-xs text-primary-blue font-bold hover:underline"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              {/* Cart Items List */}
              <div className="space-y-3">
                {cart.map(c => (
                  <div key={c.item.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold text-text-primary">{c.item.name}</h4>
                      <p className="text-[11px] text-text-secondary">₹{c.item.price} each</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200">
                        <button onClick={() => removeFromCart(c.item.id)} className="text-slate-600 hover:text-slate-900">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold px-1">{c.quantity}</span>
                        <button onClick={() => addToCart(c.item)} className="text-slate-600 hover:text-slate-900">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-xs font-extrabold text-text-primary w-14 text-right">
                        ₹{(parseFloat(c.item.price) * c.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Exact Requested Pickup Time Selection */}
              <div className="p-4 rounded-2xl bg-soft-blue/50 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-deep-blue" />
                    <span className="text-xs font-bold text-text-primary">Choose Exact Pickup Time</span>
                  </div>
                  <span className="text-[11px] text-deep-blue font-semibold">Continuous 15-Min Batching</span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    min="08:00"
                    max="17:00"
                    value={selectedTimeStr}
                    onChange={(e) => setSelectedTimeStr(e.target.value)}
                    className="px-3.5 py-2.5 bg-white border border-blue-300 rounded-xl text-sm font-bold text-deep-blue focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  />
                  <div className="text-xs text-text-secondary">
                    <p className="text-[11px] text-slate-500">Pick any exact minute (e.g. 11:07 AM)</p>
                    <p className="text-xs font-bold text-text-primary mt-0.5">
                      Batch assigned: <span className="text-deep-blue font-extrabold">{calculatedBatch}</span>
                    </p>
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
                  disabled={isSubmitting || canteenStatus !== 'OPEN'}
                  className="btn-tactile w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-deep-blue to-primary-blue shadow-soft hover:shadow-tactile hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Submitting Order Request...</span>
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
          <div className="flex p-1 bg-slate-200/70 rounded-xl w-fit">
            <button
              onClick={() => setOrdersTab('ACTIVE')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${ordersTab === 'ACTIVE' ? 'bg-white text-deep-blue shadow-sm' : 'text-slate-600'}`}
            >
              Active Orders ({activeOrders.length})
            </button>
            <button
              onClick={() => setOrdersTab('HISTORY')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${ordersTab === 'HISTORY' ? 'bg-white text-deep-blue shadow-sm' : 'text-slate-600'}`}
            >
              Previous Orders ({previousOrders.length})
            </button>
          </div>

          {/* Active Orders List */}
          {ordersTab === 'ACTIVE' && (
            <div className="space-y-4">
              {activeOrders.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center">
                  <Coffee className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No active orders</p>
                </div>
              ) : (
                activeOrders.map(order => {
                  const pickupCode = activePickupCodes[order.id];
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
                            Seller suggested an alternative pickup time: {new Date(order.sellerSuggestedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRespondTime(order.id, true)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                            >
                              Accept Suggested Time
                            </button>
                            <button
                              onClick={() => handleRespondTime(order.id, false)}
                              className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300"
                            >
                              Decline & Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Payment Required Card */}
                      {order.status === 'ACCEPTED' && order.paymentStatus === 'PENDING' && (
                        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-deep-blue">Payment Required</p>
                            <p className="text-[11px] text-slate-600">Seller accepted your order time. Complete payment via Razorpay.</p>
                          </div>
                          <button
                            onClick={() => handlePayOrder(order.id)}
                            className="btn-tactile px-4 py-2 rounded-xl bg-deep-blue text-white text-xs font-bold hover:opacity-95 flex items-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Pay ₹{order.totalAmount}
                          </button>
                        </div>
                      )}

                      {/* Pickup Code Card (when available / ready) */}
                      {pickupCode && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-soft-blue to-soft-lavender border border-blue-200 text-center">
                          <p className="text-xs font-bold text-deep-blue uppercase tracking-wider">Your Pickup Code</p>
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
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                  No previous orders
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
