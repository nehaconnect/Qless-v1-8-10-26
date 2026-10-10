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
  Inbox,
  Menu,
  Bell,
  User,
  LogOut,
  Trash2,
  Shield,
  Layers,
  Check
} from 'lucide-react';
import {
  validatePickupTimeCanonical,
  calculate15MinBatch,
  formatPickupTimeDisplay,
} from '@/lib/pickup-time';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
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
  pickupCode?: string | null;
  batch: { displayLabel: string; startTime: string } | null;
  items: OrderItem[];
  createdAt: string;
}

interface CustomerPortalProps {
  user: any;
  canteenStatus: 'OPEN' | 'TOO_BUSY' | 'CLOSED';
  onLogout?: () => void;
  isViewAsAdmin?: boolean;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ user, canteenStatus, onLogout, isViewAsAdmin }) => {
  // Navigation: Menu, Cart, Orders, Notifications, Account
  const [activeTab, setActiveTab] = useState<'MENU' | 'CART' | 'ORDERS' | 'NOTIFICATIONS' | 'ACCOUNT'>('MENU');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const [menuMode, setMenuMode] = useState<'TODAY' | 'ALL'>('TODAY');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Menu data
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  // Time selection for ordering (24-hour internal HH:mm, default 11:00 AM)
  const [selectedTimeStr, setSelectedTimeStr] = useState<string>('11:00');
  const [calculatedBatch, setCalculatedBatch] = useState<string>('11:00 AM–11:15 AM');
  const [timeValidationError, setTimeValidationError] = useState<string | null>(null);

  // Customer orders
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [ordersTab, setOrdersTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  // Notifications
  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  // UI action states
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    } catch {}
    finally {
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
    } catch {}
    finally {
      if (isInitial) setIsLoadingOrders(false);
    }
  };

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.notifications) setNotificationsList(data.notifications);
    } catch {}
  };

  useEffect(() => {
    fetchCanteens();
    fetchMenu(true);
    fetchOrders(true);
    fetchNotifications();
    const interval = setInterval(() => {
      fetchOrders(false);
      fetchMenu(false);
      fetchNotifications();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectCanteen = (cId: string) => {
    setSelectedCanteenId(cId);
    setCart([]);
    setSelectedCategory('ALL');
    fetchMenu(true, cId);
  };

  // Format 12-hour AM/PM helper
  const format12Hour = (h: number, m: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${displayH}:${pad(m)} ${ampm}`;
  };

  // Update calculated 15-minute batch preview in 12-hour format & validate 8:00 AM to 5:00 PM IST
  useEffect(() => {
    const val = validatePickupTimeCanonical(selectedTimeStr);
    if (!val.valid) {
      setTimeValidationError(val.error || 'Please select a valid time between 8:00 AM and 5:00 PM.');
    } else {
      setTimeValidationError(null);
    }

    try {
      const batch = calculate15MinBatch(selectedTimeStr);
      setCalculatedBatch(batch.displayLabel);
    } catch {
      setCalculatedBatch('--:--');
    }
  }, [selectedTimeStr]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    if (!item.isAvailable || item.price === null) return;
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

  const cartTotal = cart.reduce((sum, ci) => sum + (ci.item.price ? parseFloat(ci.item.price) * ci.quantity : 0), 0);

  // Submit Order Request
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    if (timeValidationError) {
      setErrorMsg(timeValidationError);
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmittingOrder(true);

    try {
      const payload = {
        canteenId: selectedCanteenId || undefined,
        items: cart.map(ci => ({
          menuItemId: ci.item.id,
          quantity: ci.quantity,
        })),
        exactPickupTime: selectedTimeStr,
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

      setCart([]);
      setActiveTab('ORDERS');
      setOrdersTab('ACTIVE');
      await fetchOrders(false);
      setSuccessMsg(`Order #${data.order.orderNumber} submitted successfully! Awaiting seller confirmation.`);
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
      setSuccessMsg('Payment confirmed! Your secure 4-character pickup code is now active.');
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

  // Customer self-account deletion
  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const res = await fetch('/api/customer/account', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }
      if (onLogout) onLogout();
      else window.location.href = '/';
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not delete account');
      setIsDeletingAccount(false);
      setShowDeleteModal(false);
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

  const format12TimeIST = (val?: string | Date | null) => {
    return formatPickupTimeDisplay(val);
  };

  const currentCanteenName = canteensList.find(c => c.id === selectedCanteenId)?.name || 'IP Canteen';

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[calc(100vh-140px)]">
      {/* ========================================================= */}
      {/* MOBILE DRAWER OVERLAY */}
      {/* ========================================================= */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-50 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl p-6 flex flex-col justify-between z-50"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-deep-blue text-white flex items-center justify-center font-bold">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-text-primary">QLess IPCW</h3>
                    <p className="text-[10px] text-slate-500 font-bold">{currentCanteenName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                  aria-label="Close Navigation Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                <button
                  onClick={() => { setActiveTab('MENU'); setIsMobileDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition min-h-[44px] ${
                    activeTab === 'MENU' ? 'bg-deep-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Coffee className="w-4 h-4" />
                    <span>Menu</span>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab('CART'); setIsMobileDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition min-h-[44px] ${
                    activeTab === 'CART' ? 'bg-deep-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Cart</span>
                  </div>
                  {cart.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary-blue text-white">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('ORDERS'); setIsMobileDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition min-h-[44px] ${
                    activeTab === 'ORDERS' ? 'bg-deep-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4" />
                    <span>My Orders</span>
                  </div>
                  {activeOrders.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary-blue text-white">
                      {activeOrders.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('NOTIFICATIONS'); setIsMobileDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition min-h-[44px] ${
                    activeTab === 'NOTIFICATIONS' ? 'bg-deep-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </div>
                  {notificationsList.filter(n => !n.isRead).length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-danger text-white">
                      {notificationsList.filter(n => !n.isRead).length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('ACCOUNT'); setIsMobileDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition min-h-[44px] ${
                    activeTab === 'ACCOUNT' ? 'bg-deep-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4" />
                    <span>Account</span>
                  </div>
                </button>
              </nav>
            </div>

            {onLogout && (
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => { setIsMobileDrawerOpen(false); onLogout(); }}
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-xs font-bold text-danger hover:bg-red-50 transition min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DESKTOP SIDEBAR NAVIGATION */}
      {/* ========================================================= */}
      <aside className="hidden md:flex w-[240px] bg-[#DFF3E8]/90 backdrop-blur-md rounded-3xl border border-[#BFEBDD] flex-col shrink-0 p-4 shadow-sm h-fit self-start">
        {/* Canteen Identity Badge */}
        <div className="p-3.5 bg-white/70 rounded-2xl border border-[#BFEBDD]/80 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#073653] text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Coffee className="w-5 h-5 text-[#00B894]" />
            </div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-extrabold text-[#073653] truncate">{currentCanteenName}</h2>
              <p className="text-[11px] font-bold text-[#64839A]">Student Portal</p>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#BFEBDD]/60 flex items-center justify-between text-[11px]">
            <span className="text-[#64839A] font-semibold">Hours:</span>
            <span className="font-bold text-[#00B894]">8:00 AM – 5:00 PM</span>
          </div>
        </div>

        {/* 5-Section Desktop Navigation */}
        <nav className="flex-1 space-y-1.5">
          <button
            onClick={() => setActiveTab('MENU')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              activeTab === 'MENU'
                ? 'bg-[#00B894] text-white shadow-sm'
                : 'text-[#073653] hover:bg-[#BFEBDD]/50 hover:text-[#073653]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Coffee className="w-4 h-4" />
              <span>Menu</span>
            </div>
            <span className="text-[10px] opacity-80 font-semibold">{menuItems.length} items</span>
          </button>

          <button
            onClick={() => setActiveTab('CART')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              activeTab === 'CART'
                ? 'bg-[#00B894] text-white shadow-sm'
                : 'text-[#073653] hover:bg-[#BFEBDD]/50 hover:text-[#073653]'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4" />
              <span>Cart</span>
            </div>
            {cart.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'CART' ? 'bg-white text-[#00B894]' : 'bg-[#00B894] text-white'
              }`}>
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              activeTab === 'ORDERS'
                ? 'bg-[#00B894] text-white shadow-sm'
                : 'text-[#073653] hover:bg-[#BFEBDD]/50 hover:text-[#073653]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4" />
              <span>My Orders</span>
            </div>
            {activeOrders.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'ORDERS' ? 'bg-white text-[#00B894]' : 'bg-[#00B894] text-white'
              }`}>
                {activeOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('NOTIFICATIONS')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              activeTab === 'NOTIFICATIONS'
                ? 'bg-[#00B894] text-white shadow-sm'
                : 'text-[#073653] hover:bg-[#BFEBDD]/50 hover:text-[#073653]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </div>
            {notificationsList.filter(n => !n.isRead).length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'NOTIFICATIONS' ? 'bg-white text-rose-600' : 'bg-rose-500 text-white'
              }`}>
                {notificationsList.filter(n => !n.isRead).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ACCOUNT')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              activeTab === 'ACCOUNT'
                ? 'bg-[#00B894] text-white shadow-sm'
                : 'text-[#073653] hover:bg-[#BFEBDD]/50 hover:text-[#073653]'
            }`}
          >
            <div className="flex items-center gap-3">
              <User className="w-4 h-4" />
              <span>Account</span>
            </div>
          </button>
        </nav>

        {/* Sidebar Footer Slogan */}
        <div className="mt-8 pt-4 border-t border-[#BFEBDD]/80 text-center">
          <p className="text-[11px] font-black text-[#073653] tracking-wide">Less Queue</p>
          <p className="text-[10px] font-bold text-[#64839A] tracking-wider uppercase mt-0.5">More Campus Time</p>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN PORTAL CONTENT */}
      {/* ========================================================= */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
        {/* Mobile Top Navigation Bar */}
        <div className="flex md:hidden items-center justify-between mb-4 pb-3 border-b border-slate-200">
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-sm font-extrabold text-text-primary">{currentCanteenName}</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{activeTab}</p>
          </div>
          <button
            onClick={() => setActiveTab('CART')}
            className="p-2.5 rounded-xl bg-slate-100 text-slate-700 relative min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-primary-blue text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>

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
              <p className="text-xs text-rose-700 font-normal mt-0.5">Operating hours are 8:00 AM – 5:00 PM IST. New orders are currently disabled.</p>
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

        {/* Canteen Switcher (when multiple approved canteens exist) */}
        {canteensList.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-slate-100 rounded-2xl border border-slate-200">
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

        {/* ========================================================================= */}
        {/* 1. MENU SECTION */}
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
                  Full Menu
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

            {/* Menu Items Grid */}
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
                  const isPriceNotFixed = item.price === null || item.price === undefined;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-3xl border p-5 shadow-card flex flex-col justify-between transition hover:shadow-tactile ${
                        !item.isAvailable || isPriceNotFixed ? 'opacity-70 bg-slate-50/80 border-slate-200' : 'border-slate-200'
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
                        {isPriceNotFixed ? (
                          <span className="text-xs font-bold text-slate-500 italic">Price not fixed</span>
                        ) : (
                          <span className="text-base font-black text-deep-blue">₹{item.price}</span>
                        )}

                        {isPriceNotFixed ? (
                          <span className="text-[10px] font-extrabold text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded-lg">
                            Unavailable
                          </span>
                        ) : !item.isAvailable ? (
                          <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                            Sold Out
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
        {/* 2. CART & CHECKOUT SECTION */}
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
                          ₹{(ci.item.price ? parseFloat(ci.item.price) * ci.quantity : 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 12-Hour AM/PM Exact Pickup Time Picker */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-deep-blue" />
                      <span className="font-extrabold text-xs text-text-primary">Choose Exact Pickup Time</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-white px-2 py-0.5 rounded border">
                      8:00 AM – 5:00 PM IST
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="time"
                      value={selectedTimeStr}
                      onChange={(e) => setSelectedTimeStr(e.target.value)}
                      min="08:00"
                      max="17:00"
                      className="px-3 py-2 min-h-[44px] rounded-xl border border-slate-300 font-bold text-sm bg-white text-deep-blue focus:outline-none focus:ring-2 focus:ring-primary-blue"
                    />
                    <div className="text-xs">
                      <span className="text-text-secondary block">Assigned 15-Minute Prep Batch:</span>
                      <span className="font-extrabold text-deep-blue">{calculatedBatch}</span>
                    </div>
                  </div>

                  {timeValidationError && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {timeValidationError}
                    </p>
                  )}
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
                    disabled={isSubmittingOrder || canteenStatus !== 'OPEN' || Boolean(timeValidationError)}
                    className="btn-tactile w-full py-3.5 min-h-[48px] px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-deep-blue to-primary-blue shadow-soft hover:shadow-tactile hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmittingOrder ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Order Request...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Order for {selectedTimeStr && selectedTimeStr.includes(':') ? format12Hour(parseInt(selectedTimeStr.split(':')[0], 10), parseInt(selectedTimeStr.split(':')[1], 10)) : selectedTimeStr}</span>
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
        {/* 3. MY ORDERS SECTION */}
        {/* ========================================================================= */}
        {activeTab === 'ORDERS' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex p-1 bg-slate-200/70 rounded-xl w-fit" role="tablist">
              <button
                onClick={() => setOrdersTab('ACTIVE')}
                className={`px-4 py-2 min-h-[40px] rounded-lg text-xs font-bold transition ${
                  ordersTab === 'ACTIVE' ? 'bg-white text-deep-blue shadow-sm' : 'text-slate-600'
                }`}
              >
                Active Orders ({activeOrders.length})
              </button>
              <button
                onClick={() => setOrdersTab('HISTORY')}
                className={`px-4 py-2 min-h-[40px] rounded-lg text-xs font-bold transition ${
                  ordersTab === 'HISTORY' ? 'bg-white text-deep-blue shadow-sm' : 'text-slate-600'
                }`}
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
                    const pickupCode = order.pickupCode;
                    const isPaying = actionLoading[order.id] === 'PAYING';
                    const isRespondingAccept = actionLoading[`${order.id}_accept`] === 'RESPONDING';
                    const isRespondingDecline = actionLoading[`${order.id}_decline`] === 'RESPONDING';

                    return (
                      <div key={order.id} className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-text-primary">#{order.orderNumber}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                order.status === 'REQUESTED' ? 'bg-amber-100 text-amber-800' :
                                order.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                                order.status === 'PREPARING' ? 'bg-purple-100 text-purple-800' :
                                order.status === 'READY' ? 'bg-teal-100 text-teal-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            <p className="text-xs text-text-secondary mt-1">
                              Pickup Time: <span className="font-semibold text-slate-700">{format12TimeIST(order.exactPickupTime)}</span> • Batch: <span className="font-semibold text-slate-700">{order.batch?.displayLabel || '15-min Batch'}</span>
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-base font-extrabold text-deep-blue">₹{order.totalAmount}</span>
                            <span className="block text-[11px] text-text-secondary uppercase">{order.paymentStatus}</span>
                          </div>
                        </div>

                        {/* Order Items Snapshot */}
                        <div className="space-y-1 text-xs text-slate-600">
                          {order.items?.map((it, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>{it.quantity}× {it.itemName}</span>
                              <span>₹{parseFloat(it.subtotal).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Time Negotiation Alert */}
                        {order.timeNegotiationStatus === 'SUGGESTED_BY_SELLER' && order.sellerSuggestedTime && (
                          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                            <p className="text-xs font-bold text-amber-900">
                              Seller suggested an alternative pickup time: {format12TimeIST(order.sellerSuggestedTime)}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleRespondTime(order.id, true)}
                                disabled={isRespondingAccept || isRespondingDecline}
                                className="px-3.5 py-2 min-h-[44px] rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {isRespondingAccept && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Accept Suggested Time</span>
                              </button>
                              <button
                                onClick={() => handleRespondTime(order.id, false)}
                                disabled={isRespondingAccept || isRespondingDecline}
                                className="px-3.5 py-2 min-h-[44px] rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {isRespondingDecline && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Decline & Cancel</span>
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
                              className="btn-tactile px-4 py-2 min-h-[44px] rounded-xl bg-deep-blue text-white text-xs font-bold hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5"
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

                        {/* Prominent Pickup Code Display (Available after verified payment) */}
                        {pickupCode && ['CONFIRMED', 'PREPARING', 'READY'].includes(order.status) && (
                          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-primary-blue/30 text-center shadow-sm">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary-blue bg-white px-3 py-0.5 rounded-full border border-blue-100">
                              Official Counter Pickup Code
                            </span>
                            <p className="text-4xl font-mono font-black text-deep-blue tracking-widest my-2 select-all">
                              {pickupCode}
                            </p>
                            <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
                              Show this code to the counter staff when your order is marked <span className="font-bold text-teal-700">READY</span>.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Previous Orders History List */}
            {ordersTab === 'HISTORY' && (
              <div className="space-y-4">
                {previousOrders.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                    No previous order history.
                  </div>
                ) : (
                  previousOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-700">#{order.orderNumber}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">{format12TimeIST(order.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-800">₹{order.totalAmount}</span>
                        <span className={`block text-[10px] font-black uppercase ${
                          order.status === 'COLLECTED' ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. NOTIFICATIONS SECTION */}
        {/* ========================================================================= */}
        {activeTab === 'NOTIFICATIONS' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-lg font-black text-text-primary">Notifications</h2>
              <span className="text-xs text-slate-500 font-semibold">{notificationsList.length} updates</span>
            </div>

            {notificationsList.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications yet. Updates about your orders will appear here.
              </div>
            ) : (
              <div className="space-y-2.5">
                {notificationsList.map(n => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border transition ${
                      n.isRead ? 'bg-white border-slate-200 text-slate-600' : 'bg-blue-50/60 border-blue-200 text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold">{n.title}</h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. ACCOUNT SECTION */}
        {/* ========================================================================= */}
        {activeTab === 'ACCOUNT' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="pb-3 border-b border-slate-200">
              <h2 className="text-lg font-black text-text-primary">Customer Account</h2>
              <p className="text-xs text-text-secondary">Manage your student credentials and account preferences.</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-deep-blue to-primary-blue text-white font-black text-xl flex items-center justify-center shadow-soft">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-text-primary">{user?.name}</h3>
                  <p className="text-xs font-mono text-slate-500">{user?.username}</p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">
                    Active Student
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-semibold">Campus</span>
                  <span className="font-extrabold text-slate-800">Indraprastha College for Women</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-semibold">Assigned Canteen</span>
                  <span className="font-extrabold text-slate-800">{currentCanteenName}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-semibold">Email</span>
                  <span className="font-extrabold text-slate-800">{user?.email || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-semibold">Mobile</span>
                  <span className="font-extrabold text-slate-800">{user?.phoneNumber || 'N/A'}</span>
                </div>
              </div>

              {/* Sign Out Button */}
              {onLogout && (
                <div className="pt-2">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition min-h-[44px]"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Danger Zone: Account Deletion */}
            <div className="bg-rose-50/60 rounded-3xl border border-rose-200 p-6 space-y-3">
              <div className="flex items-center gap-2 text-rose-700">
                <Trash2 className="w-4 h-4" />
                <h4 className="text-xs font-black uppercase tracking-wider">Account Deletion</h4>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                Deleting your account will immediately revoke all authenticated sessions and disable future logins. Existing completed orders will be safely preserved for financial and audit compliance.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2.5 rounded-xl bg-danger text-white text-xs font-extrabold shadow-sm hover:bg-red-700 transition min-h-[44px]"
              >
                Delete My Customer Account
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-danger flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-extrabold text-text-primary">Confirm Account Deletion</h3>
              <p className="text-xs text-text-secondary mt-1">
                Are you sure you want to delete your customer account ({user?.username})? This action will revoke your login sessions immediately.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingAccount}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="flex-1 py-2.5 rounded-xl bg-danger text-white text-xs font-extrabold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                {isDeletingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeletingAccount ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
