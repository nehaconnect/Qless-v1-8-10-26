'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Menu as MenuIcon,
  Bell,
  User,
  LogOut,
  Trash2,
  Shield,
  Layers,
  Check,
  Heart,
  Search,
  LayoutGrid,
  List,
  Sun,
  ChevronDown,
  ChevronRight,
  Utensils,
  ExternalLink
} from 'lucide-react';
import {
  validatePickupTimeCanonical,
  calculate15MinBatch,
  formatPickupTimeDisplay,
} from '@/lib/pickup-time';
import { QLessLogo } from '@/components/QLessLogo';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  isVegetarian: boolean;
  isAvailable: boolean;
  isTodaysMenu: boolean;
  categoryId: string;
  imageUrl?: string | null;
  dailyCapacity?: number | null;
  currentStock?: number | null;
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
  rejectionReason?: string | null;
  rejectionNote?: string | null;
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
  selectedCanteenId?: string;
  onSelectCanteen?: (canteenId: string) => void;
  canteensList?: any[];
  onSwitchViewAs?: (role: 'CUSTOMER' | 'SELLER' | 'ADMIN') => void;
}

// Curated high quality food photography matching IP Canteen dishes
const ITEM_IMAGE_MAP: Record<string, string> = {
  'Tea': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80',
  'Coffee': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80',
  'Black Coffee': 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=400&q=80',
  'Green Tea': 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?auto=format&fit=crop&w=400&q=80',
  'Poha': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=400&q=80',
  'Samosa': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
  'Chole Samosa': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
  'Idli Sambar': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
  'Veg Noodles': 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80',
  'Red Sauce Pasta': 'https://images.unsplash.com/photo-1621996346565-e3adc644d9fa?auto=format&fit=crop&w=400&q=80',
  'White Sauce Pasta': 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=400&q=80',
  'Chole Rice': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
  'Dal Rice': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
  'Rajma Rice': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
  'Veg Fried Rice': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400&q=80',
  'Curd Rice': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
  'Lemon Rice + Sambar': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
  'Macaroni': 'https://images.unsplash.com/photo-1621996346565-e3adc644d9fa?auto=format&fit=crop&w=400&q=80',
  'Veg Grilled Sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80',
  'Bread Pakora': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
  'Kachori + Sabji': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
  'Puri': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
  'Cold Coffee': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=400&q=80',
  'Juices and Shakes': 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=400&q=80',
  'Sweet Corn Salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
  'Masala Dosa': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=400&q=80',
};

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  'South Indian': '🥐',
  'Snacks & Quick Bites': '🍲',
  'Snacks': '🥡',
  'Beverages': '🥤',
  'Meals & Thali': '🍱',
  'Meals': '🍱',
  'Chinese': '🍜',
  'Continental': '🍝',
};

const CANTEEN_THUMBNAIL_URL = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=160&q=80';

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  user,
  canteenStatus,
  onLogout,
  isViewAsAdmin,
  selectedCanteenId: propSelectedCanteenId,
  onSelectCanteen: propOnSelectCanteen,
  canteensList: propCanteensList,
  onSwitchViewAs,
}) => {
  // Navigation: Menu, Cart, Orders, Notifications, Account
  const [activeTab, setActiveTab] = useState<'MENU' | 'CART' | 'ORDERS' | 'NOTIFICATIONS' | 'ACCOUNT'>('MENU');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Menu Mode: Today's Menu vs Full Menu
  const [menuMode, setMenuMode] = useState<'TODAY' | 'ALL'>('TODAY');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [searchQuery, setSearchQuery] = useState('');

  // Favorites state (persisted locally)
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('qless_favorites');
        if (saved) return new Set(JSON.parse(saved));
      } catch {}
    }
    return new Set<string>();
  });

  // Category chip strip scroll ref
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Top header dropdowns
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showCanteenDropdown, setShowCanteenDropdown] = useState(false);

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

  // Customer orders & counter-time picker modal
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [ordersTab, setOrdersTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [chooseTimeOrderId, setChooseTimeOrderId] = useState<string | null>(null);
  const [chooseTimeInput, setChooseTimeInput] = useState<string>('12:00');

  // Notifications
  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  // UI action states
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [internalCanteensList, setInternalCanteensList] = useState<any[]>([]);
  const [internalSelectedCanteenId, setInternalSelectedCanteenId] = useState<string>('');

  const canteensList = propCanteensList && propCanteensList.length > 0 ? propCanteensList : internalCanteensList;
  const selectedCanteenId = propSelectedCanteenId || internalSelectedCanteenId;

  // Toggle favorite
  const toggleFavorite = (itemId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      try {
        localStorage.setItem('qless_favorites', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Scroll category strip
  const handleScrollCategoriesRight = () => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: 160, behavior: 'smooth' });
    }
  };

  // Fetch Available Canteens
  const fetchCanteens = async () => {
    try {
      const res = await fetch('/api/canteens');
      const data = await res.json();
      if (data.canteens && Array.isArray(data.canteens)) {
        setInternalCanteensList(data.canteens);
        if (data.canteens.length > 0 && !internalSelectedCanteenId && !propSelectedCanteenId) {
          const ipCanteen = data.canteens.find((c: any) => c.name === 'IP Canteen');
          setInternalSelectedCanteenId(ipCanteen ? ipCanteen.id : data.canteens[0].id);
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
      fetchNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedCanteenId]);

  // Recalculate assigned 15-min batch on pickup time change
  useEffect(() => {
    if (!selectedTimeStr) {
      setTimeValidationError('Pickup time is required');
      return;
    }
    const validation = validatePickupTimeCanonical(selectedTimeStr);
    if (!validation.valid) {
      setTimeValidationError(validation.error || 'Invalid pickup time');
      setCalculatedBatch('—');
    } else {
      setTimeValidationError(null);
      const batch = calculate15MinBatch(selectedTimeStr);
      setCalculatedBatch(batch.displayLabel);
    }
  }, [selectedTimeStr]);

  // Canteen Switching
  const handleSelectCanteen = (canteenId: string) => {
    if (propOnSelectCanteen) {
      propOnSelectCanteen(canteenId);
    } else {
      setInternalSelectedCanteenId(canteenId);
    }
    setShowCanteenDropdown(false);
    fetchMenu(false, canteenId);
  };

  // Cart operations
  const addToCart = (item: MenuItem, qty = 1) => {
    if (!item.isAvailable || item.price === null || item.price === undefined) {
      setErrorMsg(`Cannot add ${item.name}: item is unavailable or price is unlisted.`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(ci => ci.item.id === item.id);
      if (existing) {
        return prev.map(ci =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + qty } : ci
        );
      }
      return [...prev, { item, quantity: qty }];
    });
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      const target = prev.find(ci => ci.item.id === itemId);
      if (!target) return prev;
      const newQty = target.quantity + delta;
      if (newQty <= 0) {
        return prev.filter(ci => ci.item.id !== itemId);
      }
      return prev.map(ci =>
        ci.item.id === itemId ? { ...ci, quantity: newQty } : ci
      );
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(ci => ci.item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, ci) => {
    const p = ci.item.price ? parseFloat(ci.item.price) : 0;
    return sum + p * ci.quantity;
  }, 0);

  const cartItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  // Helper to resolve dish image
  const getItemImage = (item: MenuItem): string => {
    if (item.imageUrl) return item.imageUrl;
    if (ITEM_IMAGE_MAP[item.name]) return ITEM_IMAGE_MAP[item.name];
    return 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80';
  };

  // Place Order submission
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    if (timeValidationError) {
      setErrorMsg('Please select a valid pickup time between 8:00 AM and 5:00 PM IST');
      return;
    }
    if (canteenStatus !== 'OPEN') {
      setErrorMsg(`Canteen is currently ${canteenStatus}. Orders cannot be placed at this time.`);
      return;
    }

    setIsSubmittingOrder(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        exactPickupTime: selectedTimeStr,
        items: cart.map(ci => ({
          menuItemId: ci.item.id,
          quantity: ci.quantity,
        })),
        canteenId: selectedCanteenId || undefined,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order request');
      }

      setCart([]);
      setSuccessMsg(`Order #${data.order.orderNumber} placed successfully! Please wait for seller acceptance.`);
      setActiveTab('ORDERS');
      fetchOrders(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting order');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Responding to proposed time
  const handleRespondTime = async (orderId: string, action: 'ACCEPT' | 'DECLINE', counterTime?: string) => {
    const key = `${orderId}_${action.toLowerCase()}`;
    setActionLoading(prev => ({ ...prev, [key]: 'RESPONDING' }));
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CUSTOMER_RESPOND_TIME',
          customerTimeResponse: action,
          exactPickupTime: counterTime || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      setSuccessMsg(action === 'ACCEPT' ? 'Alternative pickup time accepted!' : 'Time adjustment declined.');
      setChooseTimeOrderId(null);
      fetchOrders(false);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  // Pay order
  const handlePayOrder = async (orderId: string) => {
    setActionLoading(prev => ({ ...prev, [orderId]: 'PAYING' }));
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isSimulated: true }),
      });

      let data: any = null;
      try {
        const text = await res.text();
        if (text && text.trim().length > 0) {
          data = JSON.parse(text);
        }
      } catch {
        // Non-JSON response
      }

      if (!res.ok) {
        throw new Error(data?.error || `Payment failed (Status: ${res.status})`);
      }

      setSuccessMsg('Payment confirmed! Your order is now queued for kitchen preparation.');
      fetchOrders(false);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
    }
  };

  // Mark all notifications read
  const markAllNotificationsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotificationsList(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  // Delete customer account
  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/customer/account', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');
      if (onLogout) onLogout();
      else window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  // Filtered Menu Items
  const filteredItems = menuItems.filter(item => {
    if (menuMode === 'TODAY' && !item.isTodaysMenu) return false;
    if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  const activeOrders = ordersList.filter(o => !['COLLECTED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(o.status));
  const previousOrders = ordersList.filter(o => ['COLLECTED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(o.status));
  const unreadNotificationsCount = notificationsList.filter(n => !n.isRead).length;

  const currentCanteenName = canteensList.find(c => c.id === selectedCanteenId)?.name || 'IP Canteen';

  const format12Hour = (h: number, m: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const mStr = m.toString().padStart(2, '0');
    return `${h12}:${mStr} ${ampm} IST`;
  };

  const format12TimeIST = (val?: string | Date | null) => {
    return formatPickupTimeDisplay(val);
  };

  return (
    <div className="flex flex-col md:flex-row gap-5 lg:gap-6 min-h-[calc(100vh-40px)] w-full">
      {/* ========================================================= */}
      {/* MOBILE NAVIGATION DRAWER OVERLAY */}
      {/* ========================================================= */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-50 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            className="fixed inset-y-0 left-0 w-72 bg-[#DFF3E8] shadow-2xl p-6 flex flex-col justify-between z-50 border-r border-[#BFEBDD]"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#BFEBDD]/80 mb-6">
                <QLessLogo size="sm" showSubtitle={false} />
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#073653] hover:bg-[#BFEBDD]/60"
                  aria-label="Close Navigation Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                <button
                  onClick={() => { setActiveTab('MENU'); setIsMobileDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
                    activeTab === 'MENU' ? 'bg-[#C6EBD9] text-[#073653] shadow-sm' : 'text-[#073653] hover:bg-[#BFEBDD]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Utensils className="w-4 h-4 text-[#073653]" />
                    <span>Menu</span>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab('CART'); setIsMobileDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
                    activeTab === 'CART' ? 'bg-[#C6EBD9] text-[#073653] shadow-sm' : 'text-[#073653] hover:bg-[#BFEBDD]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4 text-[#073653]" />
                    <span>Cart</span>
                  </div>
                  {cartItemCount > 0 && (
                    <span className="w-5 h-5 rounded-full text-[11px] font-black bg-[#FF5A5F] text-white flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('ORDERS'); setIsMobileDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
                    activeTab === 'ORDERS' ? 'bg-[#C6EBD9] text-[#073653] shadow-sm' : 'text-[#073653] hover:bg-[#BFEBDD]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[#073653]" />
                    <span>My Orders</span>
                  </div>
                  {activeOrders.length > 0 && (
                    <span className="w-5 h-5 rounded-full text-[11px] font-black bg-[#00B894] text-white flex items-center justify-center">
                      {activeOrders.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('NOTIFICATIONS'); setIsMobileDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
                    activeTab === 'NOTIFICATIONS' ? 'bg-[#C6EBD9] text-[#073653] shadow-sm' : 'text-[#073653] hover:bg-[#BFEBDD]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-[#073653]" />
                    <span>Notifications</span>
                  </div>
                  {unreadNotificationsCount > 0 && (
                    <span className="w-5 h-5 rounded-full text-[11px] font-black bg-[#FF5A5F] text-white flex items-center justify-center">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('ACCOUNT'); setIsMobileDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
                    activeTab === 'ACCOUNT' ? 'bg-[#C6EBD9] text-[#073653] shadow-sm' : 'text-[#073653] hover:bg-[#BFEBDD]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-[#073653]" />
                    <span>Account Settings</span>
                  </div>
                </button>
              </nav>
            </div>

            {onLogout && (
              <div className="pt-4 border-t border-[#BFEBDD]/80">
                <button
                  onClick={() => { setIsMobileDrawerOpen(false); onLogout(); }}
                  className="w-full flex items-center gap-2 px-3.5 py-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition min-h-[44px]"
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
      {/* 3. LEFT SIDEBAR — CUSTOMER NAVIGATION */}
      {/* ========================================================= */}
      <aside className="hidden md:flex w-[230px] lg:w-[245px] bg-[#DFF3E8]/90 backdrop-blur-md rounded-3xl border border-[#BFEBDD]/80 flex-col shrink-0 p-5 shadow-sm min-h-[calc(100vh-48px)] justify-between relative overflow-hidden self-start">
        <div>
          {/* Top: QLess Brand Logo */}
          <div className="pt-2 pb-7">
            <QLessLogo size="md" showSubtitle={false} />
          </div>

          {/* Navigation Links in exact required order */}
          <nav className="space-y-1.5">
            {/* 1. Menu */}
            <button
              onClick={() => setActiveTab('MENU')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
                activeTab === 'MENU'
                  ? 'bg-[#C6EBD9] text-[#073653] shadow-sm'
                  : 'text-[#073653] hover:bg-[#BFEBDD]/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Utensils className="w-4 h-4 text-[#073653]" />
                <span>Menu</span>
              </div>
            </button>

            {/* 2. Cart */}
            <button
              onClick={() => setActiveTab('CART')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
                activeTab === 'CART'
                  ? 'bg-[#C6EBD9] text-[#073653] shadow-sm'
                  : 'text-[#073653] hover:bg-[#BFEBDD]/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 text-[#073653]" />
                <span>Cart</span>
              </div>
              {cartItemCount > 0 && (
                <span className="w-5 h-5 rounded-full text-[11px] font-black bg-[#FF5A5F] text-white flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* 3. My Orders */}
            <button
              onClick={() => setActiveTab('ORDERS')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
                activeTab === 'ORDERS'
                  ? 'bg-[#C6EBD9] text-[#073653] shadow-sm'
                  : 'text-[#073653] hover:bg-[#BFEBDD]/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#073653]" />
                <span>My Orders</span>
              </div>
              {activeOrders.length > 0 && (
                <span className="w-5 h-5 rounded-full text-[11px] font-black bg-[#00B894] text-white flex items-center justify-center">
                  {activeOrders.length}
                </span>
              )}
            </button>

            {/* 4. Notifications */}
            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
                activeTab === 'NOTIFICATIONS'
                  ? 'bg-[#C6EBD9] text-[#073653] shadow-sm'
                  : 'text-[#073653] hover:bg-[#BFEBDD]/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-[#073653]" />
                <span>Notifications</span>
              </div>
              {unreadNotificationsCount > 0 && (
                <span className="w-5 h-5 rounded-full text-[11px] font-black bg-[#FF5A5F] text-white flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* 5. Account Settings */}
            <button
              onClick={() => setActiveTab('ACCOUNT')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
                activeTab === 'ACCOUNT'
                  ? 'bg-[#C6EBD9] text-[#073653] shadow-sm'
                  : 'text-[#073653] hover:bg-[#BFEBDD]/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-[#073653]" />
                <span>Account Settings</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Bottom Slogan & Botanical Leaf Graphic */}
        <div className="relative pt-6 pb-2 z-10">
          <div className="text-left pl-1">
            <p className="text-xs font-extrabold text-[#073653] tracking-wide">Less Queue</p>
            <p className="text-[11px] font-bold text-[#073653] tracking-tight">More Campus Time</p>
            <div className="w-8 h-0.5 bg-[#00B894] rounded-full mt-1.5" />
          </div>
        </div>

        {/* Botanical leaf watermark in bottom corner */}
        <div className="absolute -bottom-8 -left-8 w-40 h-40 opacity-40 pointer-events-none select-none">
          <svg viewBox="0 0 200 200" className="w-full h-full fill-[#00B894]">
            <path d="M20 180 C40 120, 80 80, 160 40 C140 100, 100 140, 20 180 Z" opacity="0.3" />
            <path d="M50 160 C80 120, 110 90, 170 60 C150 110, 110 140, 50 160 Z" opacity="0.2" />
          </svg>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN RIGHT COLUMN */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ========================================================= */}
        {/* 4. TOP HEADER — SAME STRUCTURE & THEME */}
        {/* ========================================================= */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
          {/* Left: Outlet Information Card & Status */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-2.5 rounded-xl bg-white/80 text-[#073653] hover:bg-white md:hidden border border-[#BFEBDD]/80 flex items-center justify-center min-h-[44px] min-w-[44px]"
              aria-label="Open navigation menu"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            <div className="relative">
              <div
                onClick={() => canteensList.length > 1 && setShowCanteenDropdown(!showCanteenDropdown)}
                className={`bg-white/85 backdrop-blur-md rounded-2xl p-1.5 pr-4 border border-[#BFEBDD]/70 shadow-sm flex items-center gap-3 ${
                  canteensList.length > 1 ? 'cursor-pointer hover:bg-white transition' : ''
                }`}
              >
                {/* Outlet Thumbnail */}
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200/60">
                  <img
                    src={CANTEEN_THUMBNAIL_URL}
                    alt={currentCanteenName}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Outlet Context */}
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm font-extrabold text-[#073653]">{currentCanteenName}</h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#DFF3E8] text-[#073653] border border-[#BFEBDD]/60">
                      <span className={`w-2 h-2 rounded-full ${
                        canteenStatus === 'OPEN' ? 'bg-[#00B894] animate-pulse' :
                        canteenStatus === 'TOO_BUSY' ? 'bg-amber-500' : 'bg-rose-500'
                      }`} />
                      {canteenStatus === 'OPEN' ? 'Open' : canteenStatus === 'TOO_BUSY' ? 'Busy' : 'Closed'}
                      {canteensList.length > 1 && <ChevronDown className="w-3 h-3 text-[#64839A]" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64839A] font-medium flex items-center gap-1.5 mt-0.5">
                    <span>Indraprastha College for Women · Main Canteen</span>
                    <span className="text-[#64839A]/60">|</span>
                    <span>Today 8:00 AM – 5:00 PM IST</span>
                  </p>
                </div>
              </div>

              {/* Multiple Canteens Selection Dropdown */}
              {showCanteenDropdown && canteensList.length > 1 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-card border border-[#BFEBDD] p-2 z-50 animate-in fade-in zoom-in-95">
                  <p className="text-[10px] uppercase font-bold text-[#64839A] px-2 py-1">Switch Canteen</p>
                  {canteensList.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCanteen(c.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                        selectedCanteenId === c.id ? 'bg-[#DFF3E8] text-[#073653]' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{c.name}</span>
                      {selectedCanteenId === c.id && <Check className="w-4 h-4 text-[#00B894]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Header: Search Bar + Notifications + Customer Profile */}
          <div className="flex items-center gap-3 self-end lg:self-auto w-full lg:w-auto justify-end">
            {/* Menu Search Field */}
            <div className="relative flex-1 lg:w-64 max-w-xs">
              <Search className="w-4 h-4 text-[#64839A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/90 backdrop-blur-sm border border-[#BFEBDD]/80 rounded-full text-xs text-[#073653] placeholder:text-[#64839A] focus:outline-none focus:ring-2 focus:ring-[#00B894]/30 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className="p-2.5 rounded-full bg-white/90 border border-[#BFEBDD]/70 text-[#073653] hover:bg-white relative transition shadow-sm min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-[#073653]" />
              {unreadNotificationsCount > 0 && (
                <span className="w-2.5 h-2.5 bg-[#FF5A5F] rounded-full absolute top-1.5 right-1.5 ring-2 ring-white" />
              )}
            </button>

            {/* Customer Profile Pill */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="bg-white/90 backdrop-blur-sm border border-[#BFEBDD]/70 pl-1.5 pr-3 py-1 rounded-full shadow-sm flex items-center gap-2.5 hover:bg-white transition cursor-pointer min-h-[40px]"
              >
                <div className="w-8 h-8 rounded-full bg-[#DFF3E8] text-[#073653] font-black flex items-center justify-center text-xs border border-[#BFEBDD]/60 shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div className="text-left text-xs pr-1 hidden sm:block">
                  <p className="font-extrabold text-[#073653] leading-tight truncate max-w-[110px]">{user?.name || 'Siya Sen'}</p>
                  <p className="text-[10px] text-[#64839A] font-medium leading-tight">Student</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#64839A]" />
              </button>

              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-card border border-[#BFEBDD] p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-2 pb-3 border-b border-[#DFF3E8]">
                    <p className="text-xs font-black text-[#073653]">{user?.name}</p>
                    <p className="text-[11px] font-bold text-[#64839A] mt-0.5">{user?.username || user?.email}</p>
                    <div className="mt-2 pt-2 border-t border-[#DFF3E8] space-y-1 text-[11px] text-[#64839A]">
                      <div className="flex justify-between items-center">
                        <span>Role:</span>
                        <span className="font-extrabold text-[#073653] uppercase px-2 py-0.5 bg-[#DFF3E8] rounded text-[10px]">Student</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Campus:</span>
                        <span className="font-bold text-[#073653]">IPCW (Delhi Univ.)</span>
                      </div>
                    </div>
                  </div>

                  {/* Switch to Account Settings Tab */}
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      setActiveTab('ACCOUNT');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#073653] hover:bg-[#DFF3E8]/50 rounded-xl transition mt-1"
                  >
                    <User className="w-4 h-4 text-[#64839A]" />
                    <span>Account Settings</span>
                  </button>

                  {/* Exit View-As if Admin */}
                  {isViewAsAdmin && onSwitchViewAs && (
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        onSwitchViewAs('ADMIN');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#073653] bg-[#FFE0C7]/60 hover:bg-[#FFE0C7] rounded-xl transition mt-1"
                    >
                      <span>Exit View-As (Back to Admin)</span>
                    </button>
                  )}

                  {/* Sign Out */}
                  {onLogout && (
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Global Feedback Banners */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="p-1"><X className="w-4 h-4" /></button>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="p-1"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. MENU SECTION (When activeTab === 'MENU') */}
        {/* ========================================================================= */}
        {activeTab === 'MENU' && (
          <div className="space-y-4">
            {/* 5. MENU CONTROLS ROW */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Left: Today's Menu vs Full Menu Tabs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMenuMode('TODAY')}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-2 shadow-sm ${
                    menuMode === 'TODAY'
                      ? 'bg-[#0B725C] text-white'
                      : 'bg-white/90 text-[#073653] border border-[#BFEBDD]/60 hover:bg-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Today's Menu</span>
                </button>
                <button
                  onClick={() => setMenuMode('ALL')}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-2 shadow-sm ${
                    menuMode === 'ALL'
                      ? 'bg-[#0B725C] text-white'
                      : 'bg-white/90 text-[#073653] border border-[#BFEBDD]/60 hover:bg-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Full Menu</span>
                </button>
              </div>

              {/* Right: Grid View vs List View Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`px-4 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-2 shadow-sm ${
                    viewMode === 'GRID'
                      ? 'bg-[#0F5A4E] text-white'
                      : 'bg-white/90 text-[#073653] border border-[#BFEBDD]/60 hover:bg-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid View</span>
                </button>
                <button
                  onClick={() => setViewMode('LIST')}
                  className={`px-4 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-2 shadow-sm ${
                    viewMode === 'LIST'
                      ? 'bg-[#0F5A4E] text-white'
                      : 'bg-white/90 text-[#073653] border border-[#BFEBDD]/60 hover:bg-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List View</span>
                </button>
              </div>
            </div>

            {/* CATEGORY CHIPS STRIP */}
            <div className="flex items-center gap-2 pt-1 pb-2">
              <div
                ref={categoryScrollRef}
                className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 max-w-full"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {/* All Items Chip */}
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                    selectedCategory === 'ALL'
                      ? 'bg-[#00B894] text-white'
                      : 'bg-white/90 text-[#073653] border border-[#BFEBDD]/60 hover:bg-[#DFF3E8]/50'
                  }`}
                >
                  All Items ({menuMode === 'TODAY' ? menuItems.filter(i => i.isTodaysMenu).length : menuItems.length})
                </button>

                {/* Individual Categories */}
                {categories.map(cat => {
                  const count = menuItems.filter(i =>
                    i.categoryId === cat.id && (menuMode === 'ALL' || i.isTodaysMenu)
                  ).length;
                  const emoji = CATEGORY_EMOJI_MAP[cat.name] || '🍽️';

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm flex items-center gap-1.5 ${
                        selectedCategory === cat.id
                          ? 'bg-[#0B725C] text-white'
                          : 'bg-white/90 text-[#073653] border border-[#BFEBDD]/60 hover:bg-[#DFF3E8]/50'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span>{cat.name} ({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Scroll Right Arrow Button */}
              <button
                onClick={handleScrollCategoriesRight}
                className="w-8 h-8 rounded-full bg-white/90 border border-[#BFEBDD]/70 shadow-sm flex items-center justify-center text-[#073653] shrink-0 hover:bg-white transition"
                aria-label="Scroll categories right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* SKELETON LOADING STATE */}
            {isLoadingMenu && menuItems.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-pulse">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white/90 rounded-[24px] border border-[#F2ECE4] p-5 h-56 space-y-4">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-6 bg-slate-200 rounded w-2/3" />
                    <div className="h-20 bg-slate-100 rounded-2xl w-full" />
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-[#BFEBDD]/60 p-12 text-center text-[#64839A] text-xs">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#00B894]" />
                <p className="font-bold text-sm text-[#073653]">No menu items found</p>
                <p className="mt-1">Try adjusting your category filter or search keyword.</p>
              </div>
            ) : viewMode === 'GRID' ? (
              /* ========================================================= */
              /* 6. GRID VIEW MATCHING REFERENCE 1 (Strictly 4 Columns Max) */
              /* ========================================================= */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch">
                {filteredItems.map(item => {
                  const inCart = cart.find(ci => ci.item.id === item.id);
                  const isPriceNotFixed = item.price === null || item.price === undefined;
                  const catName = categories.find(c => c.id === item.categoryId)?.name || 'Canteen Special';
                  const isFav = favorites.has(item.id);
                  const dishImage = getItemImage(item);

                  return (
                    <div
                      key={item.id}
                      className="bg-[#FFFDF9] rounded-[24px] p-4.5 sm:p-5 border border-[#F2ECE4] shadow-[0_4px_16px_rgba(7,54,83,0.04)] hover:shadow-[0_8px_24px_rgba(7,54,83,0.08)] transition-all flex flex-col justify-between h-full relative group"
                    >
                      <div>
                        {/* Top Header Row of Card */}
                        <div className="flex items-center justify-between gap-2 pb-2 h-6">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              item.isVegetarian ? 'bg-[#00B894]' : 'bg-rose-500'
                            }`} />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64839A] truncate">
                              {catName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[15px] tracking-tight text-[#0284C7] shrink-0">
                              {isPriceNotFixed ? 'Price not fixed' : `₹${parseFloat(item.price as string).toFixed(2)}`}
                            </span>
                            <button
                              onClick={() => toggleFavorite(item.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 transition cursor-pointer"
                              aria-label="Add to favorites"
                            >
                              <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Item Details & Dish Image Row */}
                        <div className="flex items-center justify-between gap-3 my-auto py-2">
                          <div className="flex-1 min-w-0 pr-1 flex flex-col justify-between">
                            <div>
                              <h3 className="text-[17px] font-black text-[#073653] leading-tight tracking-tight truncate" title={item.name}>
                                {item.name}
                              </h3>
                              {item.dailyCapacity && (
                                <p className="text-xs text-[#8BA3B5] font-medium mt-1">
                                  Daily Order Limit: {item.dailyCapacity}
                                </p>
                              )}
                              {item.description && (
                                <p className="text-xs text-[#64839A] line-clamp-2 mt-1 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            <div className="mt-3.5">
                              <span className={`text-xs font-bold block mb-1 ${
                                item.isAvailable && !isPriceNotFixed ? 'text-[#073653]' : 'text-slate-400'
                              }`}>
                                {isPriceNotFixed ? 'Unavailable' : item.isAvailable ? 'In Stock' : 'Sold Out'}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider inline-block ${
                                  item.isAvailable && !isPriceNotFixed
                                    ? 'bg-[#DFF7F2] text-[#009E7E]'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {item.isAvailable && !isPriceNotFixed ? 'AVAILABLE' : 'OFF'}
                              </span>
                            </div>
                          </div>

                          {/* Consistent square image container with slightly rounded corners on clean white bg (Requirement 2) */}
                          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border border-[#F2ECE4] shadow-sm shrink-0 flex items-center justify-center overflow-hidden p-1.5">
                            <img
                              src={dishImage}
                              alt={item.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                            {item.isAvailable && !isPriceNotFixed && (
                              <button
                                onClick={() => addToCart(item)}
                                disabled={canteenStatus !== 'OPEN'}
                                title="Add to cart"
                                className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white shadow-md border border-slate-100 text-[#073653] flex items-center justify-center hover:scale-105 hover:bg-[#F0FDF4] transition disabled:opacity-40 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 text-[#073653]" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom Row: Peach/Cream Action Bar */}
                      <div className="mt-3 bg-[#FFF7F0] border border-[#FDE8D7] rounded-xl px-3 py-1.5 flex items-center justify-between gap-2">
                        {isPriceNotFixed ? (
                          <span className="text-xs font-bold text-[#64839A] italic">Price not fixed</span>
                        ) : (
                          <span className="text-sm font-extrabold text-[#073653]">
                            ₹{parseFloat(item.price as string).toFixed(2)}
                          </span>
                        )}

                        {isPriceNotFixed ? (
                          <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                            Unavailable
                          </span>
                        ) : !item.isAvailable ? (
                          <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/60">
                            Sold Out
                          </span>
                        ) : inCart ? (
                          <div className="flex items-center gap-1.5 bg-white rounded-lg p-0.5 border border-[#BFEBDD]">
                            <button
                              onClick={() => updateCartQuantity(item.id, inCart.quantity - 1)}
                              className="w-6 h-6 rounded-md bg-[#DFF3E8] text-[#073653] font-bold flex items-center justify-center hover:bg-[#BFEBDD] transition text-xs"
                            >
                              -
                            </button>
                            <span className="px-1.5 font-mono text-xs font-black text-[#073653]">{inCart.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.id, inCart.quantity + 1)}
                              disabled={canteenStatus !== 'OPEN'}
                              className="w-6 h-6 rounded-md bg-[#00B894] text-white font-bold flex items-center justify-center hover:bg-[#00a382] transition text-xs disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            disabled={canteenStatus !== 'OPEN'}
                            className="px-4 py-1.5 rounded-lg bg-[#00B894] hover:bg-[#00a382] text-white text-xs font-bold flex items-center gap-1 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ========================================================= */
              /* 7. LIST VIEW WITH RIGHT-SIDE CART PREVIEW MATCHING REF 2 */
              /* ========================================================= */
              <div className="flex flex-col lg:flex-row gap-5 items-start">
                {/* Left: Vertically scrollable queue of menu-item rows */}
                <div className="flex-1 w-full space-y-3">
                  {filteredItems.map(item => {
                    const inCart = cart.find(ci => ci.item.id === item.id);
                    const isPriceNotFixed = item.price === null || item.price === undefined;
                    const catName = categories.find(c => c.id === item.categoryId)?.name || 'Canteen Special';
                    const isFav = favorites.has(item.id);
                    const dishImage = getItemImage(item);

                    return (
                      <div
                        key={item.id}
                        className="bg-white/95 rounded-2xl border border-[#BFEBDD]/60 p-3 sm:p-4 shadow-card hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        {/* Image + Info */}
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-amber-50/40 border border-slate-100">
                            <img
                              src={dishImage}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#00B894] mb-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00B894]" />
                              <span>{catName}</span>
                            </span>
                            <h3 className="font-extrabold text-sm sm:text-base text-[#073653] leading-snug truncate">
                              {item.name}
                            </h3>
                            <p className="text-xs text-[#64839A] truncate mt-0.5">
                              {item.description || 'Steamed and freshly prepared at IP Canteen.'}
                            </p>
                            {item.dailyCapacity && (
                              <p className="text-[10px] text-[#64839A]/80 font-semibold mt-0.5">
                                Daily Order Limit: {item.dailyCapacity}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Price, Stepper, + Add & Favorite */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <span className="text-base font-black text-[#073653] min-w-[70px] text-left sm:text-right">
                            {isPriceNotFixed ? 'Unlisted' : `₹${item.price}`}
                          </span>

                          {/* Stepper if available */}
                          {item.isAvailable && !isPriceNotFixed && (
                            <div className="flex items-center gap-1 bg-[#F1F6F4] rounded-xl p-1 border border-[#BFEBDD]/60">
                              <button
                                onClick={() => updateCartQuantity(item.id, -1)}
                                disabled={!inCart}
                                className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-[#073653] hover:bg-slate-100 font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-black text-[#073653] px-2 min-w-[20px] text-center">
                                {inCart ? inCart.quantity : 1}
                              </span>
                              <button
                                onClick={() => updateCartQuantity(item.id, 1)}
                                className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-[#073653] hover:bg-slate-100 font-bold"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* + Add Button */}
                          {item.isAvailable && !isPriceNotFixed ? (
                            <button
                              onClick={() => addToCart(item)}
                              disabled={canteenStatus !== 'OPEN'}
                              className="px-4 py-2 rounded-xl bg-[#0B725C] hover:bg-[#095E4B] text-white text-xs font-bold flex items-center gap-1 shadow-sm transition disabled:opacity-50"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl">
                              Unavailable
                            </span>
                          )}

                          {/* Favorite Heart Button */}
                          <button
                            onClick={() => toggleFavorite(item.id)}
                            className="p-1 text-slate-300 hover:text-rose-500 transition"
                            aria-label="Add to favorites"
                          >
                            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right: "Your Cart" Preview Card */}
                <div className="w-full lg:w-[340px] xl:w-[380px] bg-white/95 rounded-3xl border border-[#BFEBDD]/70 p-5 shadow-card flex flex-col justify-between shrink-0 sticky top-5">
                  <div>
                    {/* Cart Header */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-[#BFEBDD]/50 mb-4">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-[#073653]" />
                        <h3 className="font-extrabold text-sm text-[#073653]">Your Cart</h3>
                        {cartItemCount > 0 && (
                          <span className="w-5 h-5 rounded-full text-[11px] font-black bg-[#FF5A5F] text-white flex items-center justify-center">
                            {cartItemCount}
                          </span>
                        )}
                      </div>

                      {cart.length > 0 && (
                        <button
                          onClick={clearCart}
                          className="px-3 py-1 rounded-full text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {/* Cart Items List */}
                    {cart.length === 0 ? (
                      <div className="py-8 text-center text-[#64839A] space-y-2">
                        <ShoppingBag className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-semibold">Your cart is empty.</p>
                        <p className="text-[11px]">Select items from the menu to build your order.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {cart.map(ci => (
                          <div
                            key={ci.item.id}
                            className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 last:border-b-0"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-slate-50 border border-slate-100">
                                <img
                                  src={getItemImage(ci.item)}
                                  alt={ci.item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-extrabold text-[#073653] truncate">{ci.item.name}</p>
                                <p className="text-[11px] font-black text-[#0B725C]">₹{ci.item.price}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1 bg-[#F1F6F4] rounded-lg p-0.5 border border-[#BFEBDD]/60">
                                <button
                                  onClick={() => updateCartQuantity(ci.item.id, -1)}
                                  className="w-5 h-5 rounded bg-white flex items-center justify-center text-[#073653] font-bold hover:bg-slate-100"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="text-xs font-black text-[#073653] px-1">{ci.quantity}</span>
                                <button
                                  onClick={() => updateCartQuantity(ci.item.id, 1)}
                                  className="w-5 h-5 rounded bg-white flex items-center justify-center text-[#073653] font-bold hover:bg-slate-100"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeFromCart(ci.item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition"
                                aria-label="Remove item"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cart Footer */}
                  {cart.length > 0 && (
                    <div className="pt-4 border-t border-[#BFEBDD]/50 mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#073653]">Subtotal</span>
                        <span className="text-base font-black text-[#073653]">₹{cartTotal.toFixed(2)}</span>
                      </div>

                      <button
                        onClick={() => setActiveTab('CART')}
                        className="w-full py-3 px-4 rounded-xl bg-[#0B725C] hover:bg-[#095E4B] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
                      >
                        <span>Proceed to Order</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <div className="bg-[#EAF5F8] p-2.5 rounded-xl border border-[#BFEBDD]/60 flex items-center gap-2 text-[11px] text-[#073653] font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#2B7BFF] shrink-0" />
                        <span>You can add more items from the menu.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. CART & CHECKOUT SECTION (When activeTab === 'CART') */}
        {/* ========================================================================= */}
        {activeTab === 'CART' && (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#BFEBDD]/60">
              <h2 className="text-lg font-black text-[#073653]">Order Checkout & Exact Pickup Time</h2>
              <button
                onClick={() => setActiveTab('MENU')}
                className="text-xs font-bold text-[#0B725C] hover:underline"
              >
                + Add More Items
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="bg-white/95 rounded-3xl border border-[#BFEBDD]/60 p-12 text-center space-y-3 shadow-card">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">Your cart is empty</p>
                <button
                  onClick={() => setActiveTab('MENU')}
                  className="px-5 py-2.5 rounded-full bg-[#0B725C] text-white text-xs font-bold"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <div className="bg-white/95 rounded-3xl border border-[#BFEBDD]/60 shadow-card p-6 space-y-6">
                {/* Line items list */}
                <div className="space-y-3 divide-y divide-slate-100">
                  {cart.map(ci => (
                    <div key={ci.item.id} className="pt-3 first:pt-0 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 border shrink-0">
                          <img src={getItemImage(ci.item)} alt={ci.item.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-[#073653]">{ci.item.name}</h4>
                          <span className="text-[11px] text-[#64839A]">₹{ci.item.price} each</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-[#F1F6F4] rounded-xl p-1 border border-[#BFEBDD]/60">
                          <button
                            onClick={() => updateCartQuantity(ci.item.id, -1)}
                            className="w-7 h-7 rounded-lg bg-white text-slate-700 flex items-center justify-center font-bold hover:bg-slate-50"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black text-[#073653] px-1">{ci.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(ci.item.id, 1)}
                            className="w-7 h-7 rounded-lg bg-white text-slate-700 flex items-center justify-center font-bold hover:bg-slate-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-xs font-black text-[#0B725C] min-w-[50px] text-right">
                          ₹{(ci.item.price ? parseFloat(ci.item.price) * ci.quantity : 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 12-Hour AM/PM Exact Pickup Time Picker */}
                <div className="p-4 rounded-2xl bg-[#EAF5F8]/70 border border-[#BFEBDD]/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#0B725C]" />
                      <span className="font-extrabold text-xs text-[#073653]">Choose Exact Pickup Time</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-[#073653] bg-white px-2 py-0.5 rounded border border-[#BFEBDD]">
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
                      className="px-3.5 py-2 min-h-[44px] rounded-xl border border-[#BFEBDD] font-bold text-sm bg-white text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                    />
                    <div className="text-xs">
                      <span className="text-[#64839A] block font-medium">Assigned 15-Minute Prep Batch:</span>
                      <span className="font-extrabold text-[#0B725C]">{calculatedBatch}</span>
                    </div>
                  </div>

                  {timeValidationError && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {timeValidationError}
                    </p>
                  )}
                </div>

                {/* Total & Checkout Button */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#64839A] font-medium">Subtotal</span>
                    <span className="font-bold text-[#073653]">₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-extrabold">
                    <span>Grand Total</span>
                    <span className="text-[#0B725C] text-lg font-black">₹{cartTotal.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={isSubmittingOrder || canteenStatus !== 'OPEN' || Boolean(timeValidationError)}
                    className="w-full py-3.5 min-h-[48px] px-4 rounded-xl text-white font-bold text-sm bg-[#0B725C] hover:bg-[#095E4B] shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        {/* 3. MY ORDERS SECTION (When activeTab === 'ORDERS') */}
        {/* ========================================================================= */}
        {activeTab === 'ORDERS' && (
          <div className="max-w-3xl mx-auto w-full space-y-6">
            <div className="flex p-1 bg-white/80 border border-[#BFEBDD]/60 rounded-full w-fit shadow-sm" role="tablist">
              <button
                onClick={() => setOrdersTab('ACTIVE')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition ${
                  ordersTab === 'ACTIVE' ? 'bg-[#0B725C] text-white shadow-sm' : 'text-[#073653]'
                }`}
              >
                Active Orders ({activeOrders.length})
              </button>
              <button
                onClick={() => setOrdersTab('HISTORY')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition ${
                  ordersTab === 'HISTORY' ? 'bg-[#0B725C] text-white shadow-sm' : 'text-[#073653]'
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
                      <div key={i} className="bg-white/95 rounded-3xl border border-[#BFEBDD]/60 p-6 h-40" />
                    ))}
                  </div>
                ) : activeOrders.length === 0 ? (
                  <div className="bg-white/95 rounded-3xl border border-[#BFEBDD]/60 p-12 text-center shadow-card">
                    <Coffee className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No active orders</p>
                    <p className="text-xs text-slate-400 mt-1">Place an order from the menu tab to track it here.</p>
                  </div>
                ) : (
                  activeOrders.map(order => {
                    const pickupCode = order.pickupCode;
                    const isPaying = actionLoading[order.id] === 'PAYING';

                    return (
                      <div key={order.id} className="bg-white/95 rounded-3xl border border-[#BFEBDD]/60 shadow-card p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-[#073653]">#{order.orderNumber}</span>
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
                            <p className="text-xs text-[#64839A] mt-1 font-medium">
                              Pickup Time: <span className="font-bold text-[#073653]">{format12TimeIST(order.exactPickupTime)}</span> • Batch: <span className="font-bold text-[#073653]">{order.batch?.displayLabel || '15-min Batch'}</span>
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-base font-extrabold text-[#0B725C]">₹{order.totalAmount}</span>
                            <span className="block text-[11px] text-[#64839A] uppercase font-bold">{order.paymentStatus}</span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-1 text-xs text-slate-600">
                          {order.items?.map((it, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>{it.quantity}× {it.itemName}</span>
                              <span>₹{parseFloat(it.subtotal).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Pay Button for Accepted Order */}
                        {order.status === 'ACCEPTED' && order.paymentStatus === 'PENDING' && (
                          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold text-blue-900">Order Accepted by Kitchen!</p>
                              <p className="text-[11px] text-blue-700">Complete payment to confirm production slot.</p>
                            </div>
                            <button
                              onClick={() => handlePayOrder(order.id)}
                              disabled={isPaying}
                              className="px-4 py-2 bg-[#0B725C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                            >
                              {isPaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                              <span>Simulate Payment (₹{order.totalAmount})</span>
                            </button>
                          </div>
                        )}

                        {/* Pickup Code Display */}
                        {pickupCode && ['CONFIRMED', 'PREPARING', 'READY'].includes(order.status) && (
                          <div className="p-3 bg-[#DFF3E8] rounded-xl border border-[#BFEBDD] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <QrCode className="w-4 h-4 text-[#0B725C]" />
                              <span className="text-xs font-bold text-[#073653]">Pickup Verification Code:</span>
                            </div>
                            <span className="font-mono text-sm font-black text-[#0B725C] tracking-wider">{pickupCode}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* History List */}
            {ordersTab === 'HISTORY' && (
              <div className="space-y-4">
                {previousOrders.length === 0 ? (
                  <div className="bg-white/95 rounded-3xl border border-[#BFEBDD]/60 p-12 text-center shadow-card">
                    <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No past orders</p>
                  </div>
                ) : (
                  previousOrders.map(order => (
                    <div key={order.id} className="bg-white/95 rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-xs text-[#073653]">#{order.orderNumber}</span>
                        <p className="text-[11px] text-[#64839A] mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString()} • {order.items?.length || 0} items
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-[#073653]">₹{order.totalAmount}</span>
                        <span className="block text-[10px] text-[#64839A] uppercase font-bold">{order.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. NOTIFICATIONS SECTION (When activeTab === 'NOTIFICATIONS') */}
        {/* ========================================================================= */}
        {activeTab === 'NOTIFICATIONS' && (
          <div className="max-w-2xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#BFEBDD]/60">
              <h2 className="text-lg font-black text-[#073653]">Notifications</h2>
              {unreadNotificationsCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="text-xs font-bold text-[#2B7BFF] hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {notificationsList.length === 0 ? (
              <div className="bg-white/95 rounded-3xl border border-[#BFEBDD]/60 p-12 text-center text-[#64839A] text-xs shadow-card">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#00B894]" />
                <p className="font-bold text-sm text-[#073653]">No notifications yet</p>
                <p className="mt-1">Order status updates and reminders will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notificationsList.map(n => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border transition ${
                      n.isRead ? 'bg-white/80 border-slate-100 text-[#64839A]' : 'bg-[#DFF3E8]/70 border-[#BFEBDD] text-[#073653]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#073653]">{n.title}</p>
                      <span className="text-[10px] text-[#64839A] font-mono">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-[#64839A] mt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. ACCOUNT SETTINGS SECTION (When activeTab === 'ACCOUNT') */}
        {/* ========================================================================= */}
        {activeTab === 'ACCOUNT' && (
          <div className="max-w-xl mx-auto w-full space-y-6">
            <div className="bg-white/95 rounded-3xl border border-[#BFEBDD]/60 p-6 shadow-card space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-[#DFF3E8] text-[#073653] font-black flex items-center justify-center text-base border border-[#BFEBDD]/60">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <h3 className="font-black text-base text-[#073653]">{user?.name}</h3>
                  <p className="text-xs text-[#64839A] font-medium">{user?.username || user?.email}</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-[#64839A]">Account Role</span>
                  <span className="font-bold text-[#073653] uppercase px-2.5 py-0.5 bg-[#DFF3E8] rounded-full text-[10px]">
                    Student / Customer
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-[#64839A]">Institution</span>
                  <span className="font-bold text-[#073653]">Indraprastha College for Women (IPCW)</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-[#64839A]">Current Outlet</span>
                  <span className="font-bold text-[#0B725C]">{currentCanteenName}</span>
                </div>
              </div>

              {/* Danger Zone: Delete Account */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Customer Account</span>
                </button>
              </div>
            </div>

            {/* Delete Account Modal Confirmation */}
            {showDeleteModal && (
              <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
                  <h4 className="text-base font-extrabold text-rose-600">Delete Account?</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This will permanently remove your student profile and sign you out. Your order history will be anonymised.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 flex items-center justify-center gap-1.5"
                    >
                      {isDeletingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Confirm Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
