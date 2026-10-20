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
  ExternalLink,
  RotateCcw,
  Receipt,
  CalendarCheck
} from 'lucide-react';
import {
  validatePickupTimeCanonical,
  validateFuturePickupTimeCanonical,
  isPastPickupSlot,
  getAllDayPickupSlots,
  PickupSlotOption,
  calculate15MinBatch,
  formatPickupTimeDisplay,
  formatCanonicalTo12Hour,
  getISTDateParts,
  getISTTodayString,
  getISTTomorrowString,
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
  isArchived?: boolean;
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
  menuItemId?: string;
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
  paymentMethod?: string;
  canteenName?: string;
  canteenLocation?: string;
  rejectionReason?: string | null;
  rejectionNote?: string | null;
  pickupCode?: string | null;
  batch: { displayLabel: string; startTime: string } | null;
  items: OrderItem[];
  createdAt: string;
  collectedAt?: string | null;
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
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('qless_customer_cart');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  // Time selection for ordering (24-hour internal HH:mm) & Day (Today vs Tomorrow)
  const [selectedPickupDay, setSelectedPickupDay] = useState<'TODAY' | 'TOMORROW'>('TODAY');
  const [daySlots, setDaySlots] = useState<PickupSlotOption[]>(() => getAllDayPickupSlots());
  const [selectedTimeStr, setSelectedTimeStr] = useState<string>(() => {
    const slots = getAllDayPickupSlots();
    const firstAvailable = slots.find(s => !s.isPast);
    return firstAvailable ? firstAvailable.canonical : '08:00';
  });
  const [calculatedBatch, setCalculatedBatch] = useState<string>(() => {
    const slots = getAllDayPickupSlots();
    const firstAvailable = slots.find(s => !s.isPast);
    return firstAvailable ? firstAvailable.batchLabel : '8:00 AM–8:15 AM';
  });
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

  // Synchronize cart state to localStorage for persistence across reloads/navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('qless_customer_cart', JSON.stringify(cart));
      } catch {}
    }
  }, [cart]);

  // Refresh pickup slot availability periodically and whenever Cart tab or selected day changes
  useEffect(() => {
    const isTomorrow = selectedPickupDay === 'TOMORROW';
    const refreshSlots = () => {
      const refreshed = getAllDayPickupSlots(new Date(), isTomorrow);
      setDaySlots(refreshed);

      if (isTomorrow) {
        // For tomorrow, all slots are future; if no time is selected, default to first slot (08:00)
        if (!selectedTimeStr) {
          const first = refreshed[0];
          if (first) {
            setSelectedTimeStr(first.canonical);
            setCalculatedBatch(first.batchLabel);
            setTimeValidationError(null);
          }
        }
      } else {
        // If currently selected slot is now in the past, update to next available future slot
        if (selectedTimeStr) {
          const check = isPastPickupSlot(selectedTimeStr);
          if (check.isPast) {
            const firstValid = refreshed.find(s => !s.isPast);
            if (firstValid) {
              setSelectedTimeStr(firstValid.canonical);
              setCalculatedBatch(firstValid.batchLabel);
              setTimeValidationError(null);
            }
          }
        }
      }
    };

    refreshSlots();
    const timer = setInterval(refreshSlots, 30000);
    return () => clearInterval(timer);
  }, [activeTab, selectedPickupDay]);

  // Recalculate assigned 15-min batch on pickup time change & validate future slot
  useEffect(() => {
    if (!selectedTimeStr) {
      setTimeValidationError('Pickup time is required');
      return;
    }
    const isTomorrow = selectedPickupDay === 'TOMORROW';
    const targetDateStr = isTomorrow ? getISTTomorrowString() : getISTTodayString();
    const validation = validateFuturePickupTimeCanonical(selectedTimeStr, new Date(), targetDateStr);
    if (!validation.valid) {
      setTimeValidationError(validation.error || 'Invalid pickup time');
      if (validation.canonical) {
        const batch = calculate15MinBatch(validation.canonical);
        setCalculatedBatch(batch.displayLabel);
      } else {
        setCalculatedBatch('—');
      }
    } else {
      setTimeValidationError(null);
      const batch = calculate15MinBatch(selectedTimeStr);
      setCalculatedBatch(batch.displayLabel);
    }
  }, [selectedTimeStr, selectedPickupDay]);

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

  // Cart operations with single-step state transitions (+1, -1)
  const handleIncrement = (item: MenuItem) => {
    if (!item.isAvailable || item.price === null || item.price === undefined) {
      setErrorMsg(`Cannot add ${item.name}: item is unavailable or price is unlisted.`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(ci => ci.item.id === item.id);
      if (existing) {
        return prev.map(ci =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleDecrement = (itemId: string) => {
    setCart(prev => {
      const target = prev.find(ci => ci.item.id === itemId);
      if (!target) return prev;
      if (target.quantity <= 1) {
        return prev.filter(ci => ci.item.id !== itemId);
      }
      return prev.map(ci =>
        ci.item.id === itemId ? { ...ci, quantity: ci.quantity - 1 } : ci
      );
    });
  };

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
    if (delta > 0) {
      setCart(prev => {
        const target = prev.find(ci => ci.item.id === itemId);
        if (!target) return prev;
        return prev.map(ci =>
          ci.item.id === itemId ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      });
    } else {
      handleDecrement(itemId);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(ci => ci.item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Customer Pre-Payment Cancellation
  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }
    setActionLoading(prev => ({ ...prev, [orderId]: 'CANCELLING' }));
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CUSTOMER_CANCEL', reason: 'Cancelled by customer before payment' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order');
      setSuccessMsg('Order cancelled successfully.');
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

  const cartTotal = cart.reduce((sum, ci) => {
    const p = ci.item.price ? parseFloat(ci.item.price) : 0;
    return sum + p * ci.quantity;
  }, 0);

  const cartItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  // Helper to resolve dish image: strictly prioritizes exact seller-uploaded image from DB
  const getItemImage = (item: MenuItem): string => {
    if (item.imageUrl && item.imageUrl.trim().length > 0) {
      return item.imageUrl.trim();
    }
    if (ITEM_IMAGE_MAP[item.name]) {
      return ITEM_IMAGE_MAP[item.name];
    }
    return 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80';
  };

  // Place Order submission
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    const isTomorrow = selectedPickupDay === 'TOMORROW';
    const targetDateStr = isTomorrow ? getISTTomorrowString() : getISTTodayString();
    const validation = validateFuturePickupTimeCanonical(selectedTimeStr, new Date(), targetDateStr);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Please select a valid future pickup time between 8:00 AM and 5:00 PM IST');
      return;
    }
    // Only check current-day OPEN status if ordering for today!
    if (!isTomorrow && canteenStatus !== 'OPEN') {
      setErrorMsg(`Canteen is currently ${canteenStatus}. Orders for today cannot be placed at this time. You can schedule an order for tomorrow.`);
      return;
    }

    setIsSubmittingOrder(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const fullPickupIso = `${targetDateStr}T${selectedTimeStr}:00+05:30`;
      const payload = {
        exactPickupTime: fullPickupIso,
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
      try {
        localStorage.removeItem('qless_customer_cart');
      } catch {}
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

  // Reorder items from a past order
  const handleReorder = (order: Order) => {
    if (!order.items || order.items.length === 0) {
      setErrorMsg('No items found in this order to reorder.');
      return;
    }

    const availableToAdd: Array<{ item: MenuItem; quantity: number }> = [];
    const unavailableNames: string[] = [];

    for (const ordItem of order.items) {
      // Find current item in menuItems (by menuItemId or case-insensitive name)
      const currentItem = menuItems.find(
        m => (ordItem.menuItemId && m.id === ordItem.menuItemId) || m.name.toLowerCase() === ordItem.itemName.toLowerCase()
      );

      // Must be currently available, not archived, and have a valid listed price
      if (
        currentItem &&
        currentItem.isAvailable &&
        !currentItem.isArchived &&
        currentItem.price !== null &&
        currentItem.price !== undefined
      ) {
        availableToAdd.push({
          item: currentItem, // Uses current menu item data and CURRENT price!
          quantity: ordItem.quantity,
        });
      } else {
        unavailableNames.push(ordItem.itemName);
      }
    }

    if (availableToAdd.length === 0) {
      setErrorMsg(
        `None of the items from Order #${order.orderNumber} (${unavailableNames.join(', ')}) are currently available on today's menu.`
      );
      return;
    }

    // Add available items to cart with their current prices
    setCart(prev => {
      const updated = [...prev];
      for (const { item, quantity } of availableToAdd) {
        const existing = updated.find(ci => ci.item.id === item.id);
        if (existing) {
          existing.quantity += quantity;
        } else {
          updated.push({ item, quantity });
        }
      }
      return updated;
    });

    // Refresh day slots and ensure selected pickup slot is a valid future slot (Today or Tomorrow)
    const refreshedToday = getAllDayPickupSlots(new Date(), false);
    const firstValidToday = refreshedToday.find(s => !s.isPast);

    if (firstValidToday) {
      setSelectedPickupDay('TODAY');
      setDaySlots(refreshedToday);
      if (!selectedTimeStr || isPastPickupSlot(selectedTimeStr).isPast) {
        setSelectedTimeStr(firstValidToday.canonical);
        setCalculatedBatch(firstValidToday.batchLabel);
      }
      setTimeValidationError(null);
    } else {
      // If all today's slots have passed, switch to Tomorrow automatically
      setSelectedPickupDay('TOMORROW');
      const refreshedTomorrow = getAllDayPickupSlots(new Date(), true);
      setDaySlots(refreshedTomorrow);
      const firstValidTomorrow = refreshedTomorrow[0];
      if (firstValidTomorrow) {
        setSelectedTimeStr(firstValidTomorrow.canonical);
        setCalculatedBatch(firstValidTomorrow.batchLabel);
      }
      setTimeValidationError(null);
    }

    // Switch to Cart tab so customer can select a new available pickup slot and complete checkout
    setActiveTab('CART');

    if (unavailableNames.length > 0) {
      setErrorMsg(
        `Added ${availableToAdd.length} available item(s) to your cart at today's prices. Note: ${unavailableNames.join(', ')} is currently unavailable and was not added.`
      );
    } else {
      setSuccessMsg(
        `Added all items from Order #${order.orderNumber} to your cart with current prices! Please select an available pickup time slot below to proceed.`
      );
    }
  };

  // Helper to determine if an unresolved order is past its 2-hour post-pickup grace period
  const isPast2HourGrace = (order: Order) => {
    if (!order.exactPickupTime) return false;
    const pickupEpoch = new Date(order.exactPickupTime).getTime();
    if (isNaN(pickupEpoch)) return false;
    return Date.now() - pickupEpoch > 2 * 60 * 60 * 1000;
  };

  // Active orders: unresolved orders whose scheduled pickup time + 2-hour grace period has not elapsed
  const activeOrders = ordersList
    .filter(o => !['COLLECTED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(o.status) && !isPast2HourGrace(o))
    .sort((a, b) => {
      const timeB = b.exactPickupTime ? new Date(b.exactPickupTime).getTime() : new Date(b.createdAt).getTime();
      const timeA = a.exactPickupTime ? new Date(a.exactPickupTime).getTime() : new Date(a.createdAt).getTime();
      return timeB - timeA;
    });

  // Previous orders: collected, cancelled, rejected, expired orders OR orders past the 2-hour grace period
  // Kept in strict chronological order using the scheduled pickup date/time (falling back to createdAt)
  const previousOrders = ordersList
    .filter(o => ['COLLECTED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(o.status) || isPast2HourGrace(o))
    .sort((a, b) => {
      const timeB = b.exactPickupTime ? new Date(b.exactPickupTime).getTime() : new Date(b.createdAt).getTime();
      const timeA = a.exactPickupTime ? new Date(a.exactPickupTime).getTime() : new Date(a.createdAt).getTime();
      return timeB - timeA;
    });

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

  const formatDateTimeIST = (dateStr: string | Date) => {
    try {
      const d = new Date(dateStr);
      const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return { date, time, full: `${date}, ${time} IST` };
    } catch {
      return { date: '—', time: '—', full: '—' };
    }
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
        <header className="mb-4 sm:mb-5 space-y-2.5">
          {/* Main Top Header Bar: Left (Menu + Outlet info) | Right (Desktop Search, Notification Bell, Profile) */}
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {/* Left: Menu Drawer Toggle + Outlet Information Card */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={() => setIsMobileDrawerOpen(true)}
                className="p-2 sm:p-2.5 rounded-xl bg-white/85 text-[#073653] hover:bg-white md:hidden border border-[#BFEBDD]/80 flex items-center justify-center min-h-[42px] min-w-[42px] shrink-0 shadow-sm"
                aria-label="Open navigation menu"
              >
                <MenuIcon className="w-5 h-5" />
              </button>

              <div className="relative min-w-0 flex-1">
                <div
                  onClick={() => canteensList.length > 1 && setShowCanteenDropdown(!showCanteenDropdown)}
                  className={`bg-white/85 backdrop-blur-md rounded-2xl p-1.5 pr-2.5 sm:pr-4 border border-[#BFEBDD]/70 shadow-sm flex items-center gap-2 sm:gap-3 ${
                    canteensList.length > 1 ? 'cursor-pointer hover:bg-white transition' : ''
                  }`}
                >
                  {/* Outlet Thumbnail */}
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200/60">
                    <img
                      src={CANTEEN_THUMBNAIL_URL}
                      alt={currentCanteenName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Outlet Context */}
                  <div className="text-left min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h1 className="text-xs sm:text-sm font-extrabold text-[#073653] truncate">{currentCanteenName}</h1>
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#DFF3E8] text-[#073653] border border-[#BFEBDD]/60 shrink-0">
                        <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                          canteenStatus === 'OPEN' ? 'bg-[#00B894] animate-pulse' :
                          canteenStatus === 'TOO_BUSY' ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                        <span>{canteenStatus === 'OPEN' ? 'Open' : canteenStatus === 'TOO_BUSY' ? 'Busy' : 'Closed'}</span>
                        {canteensList.length > 1 && <ChevronDown className="w-3 h-3 text-[#64839A]" />}
                      </span>
                    </div>
                    {/* Neat aligned outlet info: 1 line on desktop, 2 clean lines on mobile */}
                    <div className="text-[10px] sm:text-[11px] text-[#64839A] font-medium leading-tight mt-0.5">
                      <div className="hidden sm:flex items-center gap-1.5 truncate">
                        <span>Indraprastha College for Women · Main Canteen</span>
                        <span className="text-[#64839A]/60">|</span>
                        <span>Today 8:00 AM – 5:00 PM IST</span>
                      </div>
                      <div className="sm:hidden space-y-0.5">
                        <p className="truncate text-[#073653]/90 font-semibold">IPCW · Main Canteen</p>
                        <p className="text-[#0B725C] font-bold">8:00 AM – 5:00 PM IST</p>
                      </div>
                    </div>
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

            {/* Right Header: Notifications + Customer Profile (Visible & Accessible on mobile & desktop) */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Notification Bell */}
              <button
                onClick={() => setActiveTab('NOTIFICATIONS')}
                className="p-2 sm:p-2.5 rounded-full bg-white/90 border border-[#BFEBDD]/70 text-[#073653] hover:bg-white relative transition shadow-sm min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center shrink-0 cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-[#073653]" />
                {unreadNotificationsCount > 0 && (
                  <span className="w-2.5 h-2.5 bg-[#FF5A5F] rounded-full absolute top-1 right-1 ring-2 ring-white" />
                )}
              </button>

              {/* Customer Profile Pill (Visible on top right on mobile and desktop) */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="bg-white/90 backdrop-blur-sm border border-[#BFEBDD]/70 p-1 sm:pl-1.5 sm:pr-3 sm:py-1 rounded-full shadow-sm flex items-center gap-1.5 sm:gap-2.5 hover:bg-white transition cursor-pointer min-h-[38px] sm:min-h-[40px]"
                  aria-label="User profile settings"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#DFF3E8] text-[#073653] font-black flex items-center justify-center text-xs border border-[#BFEBDD]/60 shrink-0">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="text-left text-xs pr-1 hidden sm:block">
                    <p className="font-extrabold text-[#073653] leading-tight truncate max-w-[100px]">{user?.name || 'Siya Sen'}</p>
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

                    {/* Quick Link to My Orders */}
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setActiveTab('ORDERS');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#073653] hover:bg-[#DFF3E8]/50 rounded-xl transition"
                    >
                      <Clock className="w-4 h-4 text-[#64839A]" />
                      <span>My Orders</span>
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
                      <div className="mt-2 pt-2 border-t border-[#DFF3E8]">
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
            {/* DESKTOP CONTROLS ROW (lg and above, matching Desktop Reference Image 2) */}
            <div className="hidden lg:flex items-center justify-between gap-4">
              {/* Left: Today's Menu / Full Menu Tabs */}
              <div className="inline-flex p-1 bg-white/90 backdrop-blur-sm rounded-full border border-[#BFEBDD]/70 shadow-sm shrink-0" role="tablist">
                <button
                  onClick={() => setMenuMode('TODAY')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 min-h-[38px] ${
                    menuMode === 'TODAY'
                      ? 'bg-[#0B725C] text-white shadow-sm'
                      : 'text-[#073653] hover:text-[#0B725C]'
                  }`}
                  role="tab"
                  aria-selected={menuMode === 'TODAY'}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Today's Menu</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                </button>
                <button
                  onClick={() => setMenuMode('ALL')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 min-h-[38px] ${
                    menuMode === 'ALL'
                      ? 'bg-[#0B725C] text-white shadow-sm'
                      : 'text-[#073653] hover:text-[#0B725C]'
                  }`}
                  role="tab"
                  aria-selected={menuMode === 'ALL'}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>Full Menu</span>
                </button>
              </div>

              {/* Center: Search Field */}
              <div className="relative flex-1 max-w-lg">
                <Search className="w-4 h-4 text-[#64839A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="आज क्या खाएं?"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-7 py-2 bg-white/90 backdrop-blur-sm border border-[#BFEBDD]/80 rounded-full text-xs text-[#073653] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00B894]/30 shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Right: Grid / List View Toggle */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-xs ${
                    viewMode === 'GRID'
                      ? 'bg-[#00897B] text-white'
                      : 'bg-white border border-[#BFEBDD]/80 text-[#64839A] hover:text-[#073653]'
                  }`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('LIST')}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-xs ${
                    viewMode === 'LIST'
                      ? 'bg-[#00897B] text-white'
                      : 'bg-white border border-[#BFEBDD]/80 text-[#64839A] hover:text-[#073653]'
                  }`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MOBILE CONTROLS (below lg, matching Mobile Reference Image 1) */}
            <div className="flex flex-col gap-2.5 lg:hidden">
              {/* Row 1: Search Box + Grid & List Buttons immediately to the right */}
              <div className="flex items-center gap-2 w-full">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#64839A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="आज क्या खाएं?"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-7 py-2 bg-white/90 backdrop-blur-sm border border-[#BFEBDD]/80 rounded-full text-xs text-[#073653] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00B894]/30 shadow-sm"
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

                {/* Compact Grid and List Toggle to right of search */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setViewMode('GRID')}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-xs ${
                      viewMode === 'GRID'
                        ? 'bg-[#00897B] text-white'
                        : 'bg-white border border-[#BFEBDD]/80 text-[#64839A] hover:text-[#073653]'
                    }`}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('LIST')}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-xs ${
                      viewMode === 'LIST'
                        ? 'bg-[#00897B] text-white'
                        : 'bg-white border border-[#BFEBDD]/80 text-[#64839A] hover:text-[#073653]'
                    }`}
                    aria-label="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Row 2: Today's Menu & Full Menu Tabs */}
              <div className="inline-flex p-1 bg-white/90 backdrop-blur-sm rounded-full border border-[#BFEBDD]/70 shadow-sm self-start" role="tablist">
                <button
                  onClick={() => setMenuMode('TODAY')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 min-h-[34px] ${
                    menuMode === 'TODAY'
                      ? 'bg-[#0B725C] text-white shadow-xs'
                      : 'text-[#073653] hover:text-[#0B725C]'
                  }`}
                  role="tab"
                  aria-selected={menuMode === 'TODAY'}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Today's Menu</span>
                </button>
                <button
                  onClick={() => setMenuMode('ALL')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 min-h-[34px] ${
                    menuMode === 'ALL'
                      ? 'bg-[#0B725C] text-white shadow-xs'
                      : 'text-[#073653] hover:text-[#0B725C]'
                  }`}
                  role="tab"
                  aria-selected={menuMode === 'ALL'}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>Full Menu</span>
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
                      ? 'bg-[#00897B] text-white'
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
                          ? 'bg-[#00897B] text-white'
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 animate-pulse">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-white/90 rounded-[20px] border border-[#F2ECE4] p-3 h-56 space-y-3">
                    <div className="h-28 bg-slate-100 rounded-xl w-full" />
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
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
              /* 6. GRID VIEW MATCHING REFERENCES (2 Cols Mobile, 6 Cols Desktop) */
              /* ========================================================= */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 items-stretch">
                {filteredItems.map(item => {
                  const inCart = cart.find(ci => ci.item.id === item.id);
                  const isPriceNotFixed = item.price === null || item.price === undefined;
                  const isFav = favorites.has(item.id);
                  const dishImage = getItemImage(item);

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-[20px] p-3 border border-[#F2ECE4] shadow-[0_2px_8px_rgba(7,54,83,0.04)] hover:shadow-[0_4px_16px_rgba(7,54,83,0.08)] transition-all flex flex-col justify-between h-full relative group"
                    >
                      <div>
                        {/* Food Image with Floating Favorite Heart */}
                        <div className="relative w-full aspect-square sm:aspect-[4/3] rounded-xl overflow-hidden bg-slate-50 border border-[#F2ECE4]/80">
                          <img
                            src={dishImage}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80';
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(item.id);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 backdrop-blur-sm text-slate-300 hover:text-rose-500 shadow-xs transition cursor-pointer"
                            aria-label="Add to favorites"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-[#64839A]'}`} />
                          </button>
                        </div>

                        {/* Title & Price */}
                        <div className="mt-2.5">
                          <h3 className="font-extrabold text-sm sm:text-base text-[#073653] leading-snug tracking-tight truncate" title={item.name}>
                            {item.name}
                          </h3>
                          <div className="mt-0.5">
                            <span className="font-black text-sm sm:text-base text-[#0284C7]">
                              {isPriceNotFixed ? 'Price not fixed' : `₹${parseFloat(item.price as string).toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Initial "+ Add" button, replacing with Stepper when inCart */}
                      {!inCart || inCart.quantity === 0 ? (
                        <button
                          onClick={() => handleIncrement(item)}
                          disabled={!item.isAvailable || isPriceNotFixed}
                          className="mt-3 w-full py-2 px-3 rounded-xl bg-[#00B894] hover:bg-[#00a382] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[34px]"
                          aria-label={`Add ${item.name} to cart`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      ) : (
                        <div className="mt-3 bg-[#F1F6F4] border border-[#BFEBDD]/60 rounded-xl p-1 flex items-center justify-between min-h-[34px]">
                          <button
                            onClick={() => handleDecrement(item.id)}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white text-[#073653] flex items-center justify-center font-bold hover:bg-slate-100 transition text-sm shadow-xs cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs sm:text-sm font-black text-[#073653] px-1 sm:px-2 font-mono">
                            {inCart.quantity}
                          </span>
                          <button
                            onClick={() => handleIncrement(item)}
                            disabled={!item.isAvailable || isPriceNotFixed}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#00B894] hover:bg-[#00a382] text-white flex items-center justify-center font-bold transition text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ========================================================= */
              /* 7. LIST VIEW MATCHING REFERENCE 1 (Right Screen) */
              /* ========================================================= */
              <div className="flex flex-col lg:flex-row gap-5 items-start">
                {/* List Items */}
                <div className="flex-1 w-full space-y-3">
                  {filteredItems.map(item => {
                    const inCart = cart.find(ci => ci.item.id === item.id);
                    const isPriceNotFixed = item.price === null || item.price === undefined;
                    const isFav = favorites.has(item.id);
                    const dishImage = getItemImage(item);

                    return (
                      <div
                        key={item.id}
                        className="bg-white/95 rounded-2xl border border-[#BFEBDD]/60 p-3 sm:p-3.5 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3"
                      >
                        {/* Left: Square Dish Image + Title & Price */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden shrink-0 bg-slate-50 border border-slate-100">
                            <img
                              src={dishImage}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold text-sm sm:text-base text-[#073653] leading-snug truncate">
                              {item.name}
                            </h3>
                            <p className="text-sm sm:text-base font-black text-[#0284C7] mt-0.5">
                              {isPriceNotFixed ? 'Unlisted' : `₹${parseFloat(item.price as string).toFixed(2)}`}
                            </p>
                          </div>
                        </div>

                        {/* Right: Stepper + Favorite Heart */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          {!inCart || inCart.quantity === 0 ? (
                            <button
                              onClick={() => handleIncrement(item)}
                              disabled={!item.isAvailable || isPriceNotFixed}
                              className="py-1.5 px-3 rounded-xl bg-[#00B894] hover:bg-[#00a382] text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[32px]"
                              aria-label={`Add ${item.name} to cart`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 bg-[#F1F6F4] rounded-xl p-1 border border-[#BFEBDD]/60 min-h-[32px]">
                              <button
                                onClick={() => handleDecrement(item.id)}
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white flex items-center justify-center text-[#073653] hover:bg-slate-100 font-bold shadow-xs cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </button>
                              <span className="text-xs sm:text-sm font-black text-[#073653] px-2 min-w-[20px] text-center font-mono">
                                {inCart.quantity}
                              </span>
                              <button
                                onClick={() => handleIncrement(item)}
                                disabled={!item.isAvailable || isPriceNotFixed}
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#00B894] hover:bg-[#00a382] text-white flex items-center justify-center font-bold transition shadow-xs disabled:opacity-40 cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => toggleFavorite(item.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 transition cursor-pointer"
                            aria-label="Add to favorites"
                          >
                            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-[#64839A]'}`} />
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

                {/* 12-Hour AM/PM Exact Pickup Time Slot Picker (Past slots disabled/blocked) */}
                <div className="p-4 rounded-2xl bg-[#EAF5F8]/70 border border-[#BFEBDD]/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#0B725C]" />
                      <span className="font-extrabold text-xs text-[#073653]">Choose Available Pickup Slot</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-[#073653] bg-white px-2 py-0.5 rounded border border-[#BFEBDD]">
                      8:00 AM – 5:00 PM IST
                    </span>
                  </div>

                  {/* Today vs Tomorrow Day Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPickupDay('TODAY')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        selectedPickupDay === 'TODAY'
                          ? 'bg-[#0B725C] text-white shadow-xs'
                          : 'bg-white text-[#073653] border border-[#BFEBDD] hover:bg-slate-50'
                      }`}
                    >
                      <span>Today</span>
                      <span className="text-[10px] opacity-80">({getISTTodayString()})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPickupDay('TOMORROW')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        selectedPickupDay === 'TOMORROW'
                          ? 'bg-[#0B725C] text-white shadow-xs'
                          : 'bg-white text-[#073653] border border-[#BFEBDD] hover:bg-slate-50'
                      }`}
                    >
                      <span>Tomorrow</span>
                      <span className="text-[10px] opacity-80">({getISTTomorrowString()})</span>
                    </button>
                  </div>

                  {selectedPickupDay === 'TODAY' && daySlots.every(s => s.isPast) ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>All pickup slots for today have ended.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPickupDay('TOMORROW')}
                        className="px-3 py-1.5 rounded-lg bg-[#0B725C] text-white text-xs font-bold hover:bg-[#095E4B] transition cursor-pointer"
                      >
                        Order for Tomorrow ({getISTTomorrowString()}) →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 15-Minute Slot Selector Dropdown */}
                        <div>
                          <label className="text-[11px] font-bold text-[#64839A] block mb-1">
                            Available 15-Minute Slots ({selectedPickupDay === 'TOMORROW' ? 'Tomorrow' : 'Today'})
                          </label>
                          <select
                            value={selectedTimeStr}
                            onChange={(e) => setSelectedTimeStr(e.target.value)}
                            className="w-full px-3 py-2 min-h-[44px] rounded-xl border border-[#BFEBDD] font-bold text-xs bg-white text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894] cursor-pointer"
                          >
                            {daySlots.map(slot => (
                              <option key={slot.canonical} value={slot.canonical} disabled={slot.isPast}>
                                {slot.batchLabel} {slot.isPast ? '(Passed)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Precise Target Time (HH:mm) */}
                        <div>
                          <label className="text-[11px] font-bold text-[#64839A] block mb-1">
                            Exact Pickup Time ({selectedPickupDay === 'TOMORROW' ? 'Tomorrow' : 'Today'})
                          </label>
                          <input
                            type="time"
                            value={selectedTimeStr}
                            onChange={(e) => setSelectedTimeStr(e.target.value)}
                            min="08:00"
                            max="17:00"
                            className="w-full px-3.5 py-2 min-h-[44px] rounded-xl border border-[#BFEBDD] font-bold text-xs bg-white text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                          />
                        </div>
                      </div>

                      <div className="text-xs pt-1 flex items-center justify-between">
                        <span className="text-[#64839A] font-medium">Assigned Kitchen Batch:</span>
                        <span className="font-extrabold text-[#0B725C]">{calculatedBatch}</span>
                      </div>
                    </div>
                  )}

                  {timeValidationError && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
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
                    disabled={isSubmittingOrder || (selectedPickupDay === 'TODAY' && canteenStatus !== 'OPEN') || Boolean(timeValidationError)}
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
                      <div key={i} className="bg-white/95 rounded-3xl border border-[#BFEBDD]/60 p-6 h-48" />
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
                    const dateTime = formatDateTimeIST(order.createdAt);

                    return (
                      <div key={order.id} className="bg-[#FFFDF9] rounded-3xl border border-[#BFEBDD]/70 shadow-card p-5 sm:p-6 space-y-4">
                        {/* Receipt Top Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#DFF3E8]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#DFF3E8] border border-[#BFEBDD]/70 flex items-center justify-center text-[#0B725C] shrink-0">
                              <Receipt className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-mono font-black text-sm text-[#073653]">#{order.orderNumber}</span>
                              <p className="text-[11px] text-[#64839A] font-medium">
                                Placed: {dateTime.date} at {dateTime.time} IST
                              </p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                            order.status === 'REQUESTED' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            order.status === 'ACCEPTED' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            order.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            order.status === 'PREPARING' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                            order.status === 'READY' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        {/* Outlet & Pickup Metadata */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#F7FCFA] rounded-2xl p-3 border border-[#DFF3E8]">
                          <div>
                            <span className="text-[#64839A] block font-medium">Outlet:</span>
                            <span className="font-extrabold text-[#073653]">{order.canteenName || currentCanteenName}</span>
                            <span className="text-[#64839A] block text-[11px]">{order.canteenLocation || 'Indraprastha College for Women'}</span>
                          </div>
                          <div className="sm:text-right">
                            <span className="text-[#64839A] block font-medium">Scheduled Pickup:</span>
                            <span className="font-extrabold text-[#0B725C]">
                              {order.batch?.displayLabel || (order.exactPickupTime ? format12TimeIST(order.exactPickupTime) : '15-min Batch')}
                            </span>
                            {order.exactPickupTime && (
                              <span className="text-[#64839A] block text-[11px]">
                                Target Time: {format12TimeIST(order.exactPickupTime)} IST
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Itemized Receipt Table */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#64839A] pb-1 border-b border-dashed border-[#BFEBDD]/60">
                            <span>Item & Qty</span>
                            <div className="flex items-center gap-6">
                              <span className="hidden sm:inline">Price</span>
                              <span>Amount</span>
                            </div>
                          </div>
                          <div className="space-y-2 text-xs">
                            {order.items?.map((it, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[#073653]">
                                <div className="pr-2">
                                  <span className="font-bold">{it.quantity}× </span>
                                  <span className="font-medium">{it.itemName}</span>
                                </div>
                                <div className="flex items-center gap-6 shrink-0 font-mono">
                                  <span className="text-[#64839A] text-[11px] hidden sm:inline">
                                    ₹{parseFloat(it.unitPrice).toFixed(2)}
                                  </span>
                                  <span className="font-bold text-[#073653] text-right min-w-[55px]">
                                    ₹{parseFloat(it.subtotal).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Bill Summary */}
                        <div className="border-t border-[#DFF3E8] pt-3 space-y-1.5 text-xs">
                          <div className="flex justify-between items-center text-[#64839A]">
                            <span>Items Subtotal</span>
                            <span className="font-mono font-bold text-[#073653]">₹{parseFloat(order.totalAmount).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm font-black text-[#073653] pt-1 border-t border-dashed border-[#BFEBDD]/60">
                            <span>Final Total</span>
                            <span className="text-base text-[#0B725C] font-mono">₹{parseFloat(order.totalAmount).toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Payment Details */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#DFF3E8] text-xs">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-[#0B725C]" />
                            <span className="text-[#64839A]">Payment Method:</span>
                            <span className="font-bold text-[#073653]">{order.paymentMethod || 'UPI / Online'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#64839A]">Payment Status:</span>
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                              order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                              order.paymentStatus === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {order.paymentStatus}
                            </span>
                          </div>
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
                              className="px-4 py-2 bg-[#0B725C] hover:bg-[#085a49] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                            >
                              {isPaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                              <span>Simulate Payment (₹{order.totalAmount})</span>
                            </button>
                          </div>
                        )}

                        {/* Customer Cancel Order Action (Eligible before payment is confirmed) */}
                        {order.paymentStatus !== 'PAID' && ['REQUESTED', 'ACCEPTED', 'TIME_CHANGE_PROPOSED'].includes(order.status) && (
                          <div className="pt-1 flex justify-end">
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              disabled={actionLoading[order.id] === 'CANCELLING'}
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer py-1 px-2.5 rounded-lg hover:bg-rose-50 transition"
                            >
                              {actionLoading[order.id] === 'CANCELLING' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              <span>Cancel Order</span>
                            </button>
                          </div>
                        )}

                        {/* Pickup Code Display */}
                        {pickupCode && ['CONFIRMED', 'PREPARING', 'READY'].includes(order.status) && (
                          <div className="p-3.5 bg-[#DFF3E8] rounded-2xl border border-[#BFEBDD] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <QrCode className="w-4 h-4 text-[#0B725C]" />
                              <span className="text-xs font-bold text-[#073653]">Pickup Verification Code:</span>
                            </div>
                            <span className="font-mono text-base font-black text-[#0B725C] tracking-widest">{pickupCode}</span>
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
                    <p className="text-xs text-slate-400 mt-1">Completed and past orders will appear here.</p>
                  </div>
                ) : (
                  previousOrders.map(order => {
                    const dateTime = formatDateTimeIST(order.createdAt);

                    return (
                      <div key={order.id} className="bg-[#FFFDF9] rounded-3xl border border-[#BFEBDD]/70 shadow-card p-5 sm:p-6 space-y-4">
                        {/* Receipt Top Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#DFF3E8]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#DFF3E8] border border-[#BFEBDD]/70 flex items-center justify-center text-[#0B725C] shrink-0">
                              <Receipt className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-mono font-black text-sm text-[#073653]">#{order.orderNumber}</span>
                              <p className="text-[11px] text-[#64839A] font-medium">
                                Placed: {dateTime.date} at {dateTime.time} IST
                              </p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                            order.status === 'COLLECTED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            order.status === 'CANCELLED' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                            (order.status === 'EXPIRED' || isPast2HourGrace(order)) ? (
                              order.paymentStatus === 'PAID' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                            ) :
                            order.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {order.status === 'COLLECTED' ? '✓ Collected' :
                             order.status === 'CANCELLED' ? 'Cancelled' :
                             (order.status === 'EXPIRED' || isPast2HourGrace(order)) ? (
                               order.paymentStatus === 'PAID' ? 'Not Collected' : 'No Payment'
                             ) :
                             order.status === 'REJECTED' ? 'Rejected' :
                             order.status}
                          </span>
                        </div>

                        {/* Outlet & Historical Pickup Metadata */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#F7FCFA] rounded-2xl p-3 border border-[#DFF3E8]">
                          <div>
                            <span className="text-[#64839A] block font-medium">Outlet:</span>
                            <span className="font-extrabold text-[#073653]">{order.canteenName || currentCanteenName}</span>
                            <span className="text-[#64839A] block text-[11px]">{order.canteenLocation || 'Indraprastha College for Women'}</span>
                          </div>
                          <div className="sm:text-right">
                            <span className="text-[#64839A] block font-medium">Original Pickup Slot:</span>
                            <span className="font-extrabold text-[#073653]">
                              {order.batch?.displayLabel || (order.exactPickupTime ? format12TimeIST(order.exactPickupTime) : '15-min Batch')}
                            </span>
                            {order.exactPickupTime && (
                              <span className="text-[#64839A] block text-[11px]">
                                Target Time: {format12TimeIST(order.exactPickupTime)} IST
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Itemized Receipt Table */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#64839A] pb-1 border-b border-dashed border-[#BFEBDD]/60">
                            <span>Purchased Items & Qty</span>
                            <div className="flex items-center gap-6">
                              <span className="hidden sm:inline">Price</span>
                              <span>Amount</span>
                            </div>
                          </div>
                          <div className="space-y-2 text-xs">
                            {order.items?.map((it, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[#073653]">
                                <div className="pr-2">
                                  <span className="font-bold">{it.quantity}× </span>
                                  <span className="font-medium">{it.itemName}</span>
                                </div>
                                <div className="flex items-center gap-6 shrink-0 font-mono">
                                  <span className="text-[#64839A] text-[11px] hidden sm:inline">
                                    ₹{parseFloat(it.unitPrice).toFixed(2)}
                                  </span>
                                  <span className="font-bold text-[#073653] text-right min-w-[55px]">
                                    ₹{parseFloat(it.subtotal).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Bill Summary */}
                        <div className="border-t border-[#DFF3E8] pt-3 space-y-1.5 text-xs">
                          <div className="flex justify-between items-center text-[#64839A]">
                            <span>Items Subtotal</span>
                            <span className="font-mono font-bold text-[#073653]">₹{parseFloat(order.totalAmount).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm font-black text-[#073653] pt-1 border-t border-dashed border-[#BFEBDD]/60">
                            <span>Final Total</span>
                            <span className="text-base text-[#0B725C] font-mono">₹{parseFloat(order.totalAmount).toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Payment Details & Reorder Action */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#DFF3E8]">
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-3.5 h-3.5 text-[#0B725C]" />
                              <span className="text-[#64839A]">Payment Method:</span>
                              <span className="font-bold text-[#073653]">{order.paymentMethod || 'UPI / Online'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[#64839A]">Payment Status:</span>
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                                order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                                order.paymentStatus === 'REFUNDED' ? 'bg-purple-100 text-purple-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {order.paymentStatus}
                              </span>
                            </div>
                          </div>

                          {/* Reorder Button */}
                          <button
                            onClick={() => handleReorder(order)}
                            className="px-4 py-2 bg-[#0B725C] hover:bg-[#085a49] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer self-start sm:self-auto"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reorder</span>
                          </button>
                        </div>

                        {/* Notice for uncollected / expired orders */}
                        {(order.status === 'EXPIRED' || isPast2HourGrace(order)) && (
                          <div className={`p-3 rounded-xl border text-xs ${
                            order.paymentStatus === 'PAID'
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-rose-50 border-rose-200 text-rose-700'
                          }`}>
                            <span className="font-bold">Notice: </span>
                            <span>
                              {order.paymentStatus === 'PAID'
                                ? 'This paid order was marked as Not Collected because it was not picked up within 2 hours after the scheduled pickup time.'
                                : 'This order was closed with No Payment because payment was not completed within 2 hours after the scheduled pickup time.'}
                            </span>
                          </div>
                        )}

                        {/* Rejection/Cancellation note if any */}
                        {order.status !== 'EXPIRED' && (order.rejectionReason || order.rejectionNote) && (
                          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700">
                            <span className="font-bold">Reason: </span>
                            <span>{order.rejectionReason || order.rejectionNote}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
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
