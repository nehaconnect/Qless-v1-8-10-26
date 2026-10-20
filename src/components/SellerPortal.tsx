'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  hourMinuteAmpmToCanonical,
  validatePickupTimeCanonical,
  formatPickupTimeDisplay,
  formatCanonicalTo12Hour,
  calculate15MinBatch,
  parseTimeToMinutes,
} from '@/lib/pickup-time';
import {
  ShoppingBag,
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
  Inbox,
  ChefHat,
  Utensils,
  User,
  RefreshCw,
  Edit,
  Trash2,
  Pause,
  Play,
  Store,
  Phone,
  Shield,
  LogOut,
  Layers,
  CheckSquare,
  Menu as MenuIcon,
  Calendar,
  Search,
  Bell,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  Crop,
  LayoutGrid,
  List,
  Maximize2,
} from 'lucide-react';
import { QLessLogo } from './QLessLogo';

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
  customerPhone?: string;
  rejectionNote?: string | null;
  batch: { id: string; displayLabel: string; startTime: string; endTime: string } | null;
  items: OrderItem[];
  pickupCode?: string | null;
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
  description: string | null;
  price: string | null;
  isVegetarian: boolean;
  isAvailable: boolean;
  isTodaysMenu: boolean;
  isArchived: boolean;
  categoryId: string;
  imageUrl: string | null;
  dailyCapacity: number;
  currentStock: number;
}

interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
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

// Cross-tab and customer menu synchronization notification helper
export const notifyMenuUpdate = () => {
  if (typeof window !== 'undefined') {
    try {
      const channel = new BroadcastChannel('qless_menu_channel');
      channel.postMessage({ type: 'MENU_UPDATED', timestamp: Date.now() });
      channel.close();
    } catch {}
    try {
      localStorage.setItem('qless_menu_sync_timestamp', Date.now().toString());
    } catch {}
  }
};

const CANTEEN_THUMBNAIL_URL = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=160&q=80';

interface SellerPortalProps {
  user: any;
  canteenStatus: 'OPEN' | 'TOO_BUSY' | 'CLOSED';
  onUpdateStatus: (status: 'OPEN' | 'TOO_BUSY' | 'CLOSED') => void;
  onLogout?: () => void;
  canteensList?: Array<{ id: string; name: string }>;
  selectedCanteenId?: string;
  onSelectCanteen?: (canteenId: string) => void;
  onSwitchViewAs?: (role: 'CUSTOMER' | 'SELLER' | 'ADMIN') => void;
}

export const SellerPortal: React.FC<SellerPortalProps> = ({
  user,
  canteenStatus,
  onUpdateStatus,
  onLogout,
  canteensList = [],
  selectedCanteenId,
  onSelectCanteen,
  onSwitchViewAs,
}) => {
  // Navigation: 6 sections (Dashboard, Orders, Preparation, Pickup, Menu, Settings)
  const [tab, setTab] = useState<'DASHBOARD' | 'ORDERS' | 'PREPARATION' | 'PICKUP' | 'MENU' | 'ACCOUNT'>('MENU');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Core Data
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [canteenData, setCanteenData] = useState<any>(null);

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalSuccess, setPortalSuccess] = useState<string | null>(null);

  // Orders Tab Filter, View Mode & Detail Modal State
  const [ordersFilter, setOrdersFilter] = useState<'REQUESTED' | 'ACTIVE' | 'ALL'>('REQUESTED');
  const [viewMode, setViewMode] = useState<'LIST' | 'CARD'>('LIST');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);
  const [orderHistoryLogs, setOrderHistoryLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});

  // Helper fetcher sending View-As headers when admin is inspecting seller workspace
  const fetchWithViewAs = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (user?.isViewAsAdmin && user?.canteenId) {
      headers.set('x-view-as-role', 'SELLER');
      headers.set('x-view-as-canteen-id', user.canteenId);
      headers.set('x-view-as-seller-id', user.id);
    }
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(url, { ...options, headers });
  };

  // Fetch full ticket details and history when an order detail modal opens
  const openOrderDetailModal = async (ord: Order) => {
    setSelectedOrderDetail(ord);
    setIsLoadingHistory(true);
    try {
      const res = await fetchWithViewAs(`/api/orders/${ord.id}`);
      const data = await res.json();
      if (data.order) {
        setSelectedOrderDetail(data.order);
        if (data.order.history) {
          setOrderHistoryLogs(data.order.history);
        }
      }
    } catch {
      // Quiet fallback
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Controlled Time Suggestion Modal State
  const [suggestOrderId, setSuggestOrderId] = useState<string | null>(null);
  const [suggestHour, setSuggestHour] = useState<string>('1');
  const [suggestMinute, setSuggestMinute] = useState<string>('30');
  const [suggestAmpm, setSuggestAmpm] = useState<'AM' | 'PM'>('PM');
  const [suggestNote, setSuggestNote] = useState('');

  // Derived Canonical Time (HH:mm 24-hour zero padded) & Validation
  const canonicalSuggestTime = useMemo(() => {
    const h = parseInt(suggestHour, 10) || 12;
    const m = parseInt(suggestMinute, 10) || 0;
    return hourMinuteAmpmToCanonical(h, m, suggestAmpm);
  }, [suggestHour, suggestMinute, suggestAmpm]);

  const suggestValidation = useMemo(() => {
    return validatePickupTimeCanonical(canonicalSuggestTime);
  }, [canonicalSuggestTime]);

  const suggestBatch = useMemo(() => {
    if (!suggestValidation.valid) return null;
    return calculate15MinBatch(canonicalSuggestTime);
  }, [canonicalSuggestTime, suggestValidation.valid]);

  // Reject Order Modal
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Kitchen busy at requested time');

  // Pickup Verification
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [verifyTargetOrderId, setVerifyTargetOrderId] = useState<string | null>(null);
  const [verifyAttemptsLeft, setVerifyAttemptsLeft] = useState<number | null>(null);
  const [verifyTab, setVerifyTab] = useState<'READY' | 'COLLECTED'>('READY');

  // Menu Management
  const [menuFilterCategory, setMenuFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false);
  const [deleteCategorySelectedId, setDeleteCategorySelectedId] = useState('');
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false);
  const [deleteCategoryError, setDeleteCategoryError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Dedicated Image Upload for Single Item (+ Icon on Image)
  const [imageUploadItem, setImageUploadItem] = useState<MenuItem | null>(null);
  const [imageUploadMode, setImageUploadMode] = useState<'UPLOAD' | 'URL'>('UPLOAD');
  const [imageUploadPreview, setImageUploadPreview] = useState<string>('');
  const [imageUploadUrl, setImageUploadUrl] = useState<string>('');
  const [singleItemImageLoading, setSingleItemImageLoading] = useState(false);
  const [imageUploadSaving, setImageUploadSaving] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageUploadSuccess, setImageUploadSuccess] = useState<string | null>(null);

  // Archive & Restore Confirmation Modals
  const [confirmArchiveItem, setConfirmArchiveItem] = useState<MenuItem | null>(null);
  const [confirmRestoreItem, setConfirmRestoreItem] = useState<MenuItem | null>(null);

  // Compact Header Controls & Dropdown Refs
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCanteenDropdown, setShowCanteenDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const statusDropdownRef = React.useRef<HTMLDivElement>(null);
  const profileDropdownRef = React.useRef<HTMLDivElement>(null);
  const notificationsDropdownRef = React.useRef<HTMLDivElement>(null);
  const canteenDropdownRef = React.useRef<HTMLDivElement>(null);
  const prepDatePickerRef = React.useRef<HTMLDivElement>(null);
  const categoryDropdownRef = React.useRef<HTMLDivElement>(null);

  // Horizontal Category Scroll Ref
  const categoryScrollRef = React.useRef<HTMLDivElement>(null);

  // Form States for Menu Item
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formPriceUnconfirmed, setFormPriceUnconfirmed] = useState(false);
  const [formCategory, setFormCategory] = useState('');
  const [formNewCategory, setFormNewCategory] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIsVeg, setFormIsVeg] = useState(true);
  const [formIsTodaysMenu, setFormIsTodaysMenu] = useState(true);
  const [formImage, setFormImage] = useState('');
  const [formOrderLimit, setFormOrderLimit] = useState('50');

  // Image Upload & Crop State
  const [imageInputMode, setImageInputMode] = useState<'UPLOAD' | 'URL'>('UPLOAD');
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [cropModalSrc, setCropModalSrc] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropPanX, setCropPanX] = useState(0);
  const [cropPanY, setCropPanY] = useState(0);

  // Form State for Category
  const [newCatName, setNewCatName] = useState('');

  // Date filter state for Orders -> ALL tab (Asia/Kolkata timezone)
  const getTodayISTString = () => {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    let y = '', m = '', day = '';
    for (const p of parts) {
      if (p.type === 'year') y = p.value;
      if (p.type === 'month') m = p.value;
      if (p.type === 'day') day = p.value;
    }
    return `${y}-${m}-${day}`;
  };

  const getRelativeISTDateString = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    let y = '', m = '', day = '';
    for (const p of parts) {
      if (p.type === 'year') y = p.value;
      if (p.type === 'month') m = p.value;
      if (p.type === 'day') day = p.value;
    }
    return `${y}-${m}-${day}`;
  };

  const getFirstDayOfMonthISTString = () => {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    let y = '', m = '';
    for (const p of parts) {
      if (p.type === 'year') y = p.value;
      if (p.type === 'month') m = p.value;
    }
    return `${y}-${m}-01`;
  };

  const [dateFilterPreset, setDateFilterPreset] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('TODAY');
  const [startDateStr, setStartDateStr] = useState<string>(getTodayISTString());
  const [endDateStr, setEndDateStr] = useState<string>(getTodayISTString());

  // Kitchen Preparation Batches State (All Batches, Pending, In Preparation, Ready)
  const [prepTab, setPrepTab] = useState<'ALL' | 'PENDING' | 'PREPARING' | 'READY'>('ALL');
  const [prepViewMode, setPrepViewMode] = useState<'CARD' | 'LIST'>('CARD');
  const [prepDate, setPrepDate] = useState<string>(getTodayISTString());
  const [showPrepDatePicker, setShowPrepDatePicker] = useState(false);
  const [selectedCarouselBatchId, setSelectedCarouselBatchId] = useState<string | null>(null);
  const [carouselScrollIndex, setCarouselScrollIndex] = useState(0);
  const [prepHistoricalOrders, setPrepHistoricalOrders] = useState<Order[]>([]);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  const [expandedPrepBatches, setExpandedPrepBatches] = useState<Record<string, boolean>>({});

  const formatPrepDisplayDate = (dateStr: string) => {
    try {
      const today = getTodayISTString();
      const yest = getRelativeISTDateString(-1);
      const [y, m, d] = dateStr.split('-');
      const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formatted = `${parseInt(d, 10)} ${monthNames[dateObj.getMonth()]} ${y}`;
      if (dateStr === today) {
        return `Today, ${formatted}`;
      }
      if (dateStr === yest) {
        return `Yesterday, ${formatted}`;
      }
      return formatted;
    } catch {
      return dateStr;
    }
  };
  const [summaryData, setSummaryData] = useState<any>({
    totalOrders: 0,
    ordersCollected: 0,
    paidRevenue: '0.00',
    pendingPaymentsCount: 0,
    pendingPaymentAmount: '0.00',
    cancelledCount: 0,
    rejectedCount: 0,
    collectedOrderValue: '0.00',
  });

  // Cancellation Modal State
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelPresetReason, setCancelPresetReason] = useState('Customer did not pay within time limit');
  const [cancelCustomReason, setCancelCustomReason] = useState('');

  const handleDatePresetChange = (preset: 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM') => {
    setDateFilterPreset(preset);
    const today = getTodayISTString();
    if (preset === 'TODAY') {
      setStartDateStr(today);
      setEndDateStr(today);
    } else if (preset === 'YESTERDAY') {
      const yest = getRelativeISTDateString(-1);
      setStartDateStr(yest);
      setEndDateStr(yest);
    } else if (preset === 'LAST_7_DAYS') {
      const start7 = getRelativeISTDateString(-6);
      setStartDateStr(start7);
      setEndDateStr(today);
    } else if (preset === 'THIS_MONTH') {
      const startMonth = getFirstDayOfMonthISTString();
      setStartDateStr(startMonth);
      setEndDateStr(today);
    }
  };

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const refreshData = async (isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      else setIsRefreshing(true);

      let ordersUrl = '/api/orders';
      if (ordersFilter === 'ALL' && startDateStr) {
        ordersUrl += `?startDate=${startDateStr}&endDate=${endDateStr || startDateStr}`;
      }

      const [ordRes, batchRes, menuRes, catRes, canRes, notifRes] = await Promise.all([
        fetchWithViewAs(ordersUrl),
        fetchWithViewAs('/api/batches'),
        fetchWithViewAs('/api/menu?includeArchived=true'),
        fetchWithViewAs('/api/menu/categories'),
        fetchWithViewAs('/api/canteen/status'),
        fetchWithViewAs('/api/notifications').catch(() => null),
      ]);

      const [ordData, batchData, menuData, catData, canData] = await Promise.all([
        ordRes.json().catch(() => ({})),
        batchRes.json().catch(() => ({})),
        menuRes.json().catch(() => ({})),
        catRes.json().catch(() => ({})),
        canRes.json().catch(() => ({})),
      ]);

      if (ordData.orders) setOrdersList(ordData.orders);
      if (ordData.summary) setSummaryData(ordData.summary);
      if (batchData.batches) setBatches(batchData.batches);
      if (menuData.items) setMenuItems(menuData.items);
      if (catData.categories) setCategories(catData.categories);
      else if (menuData.categories) setCategories(menuData.categories);
      if (canData.canteen) setCanteenData(canData.canteen);

      if (notifRes && notifRes.ok) {
        const notifData = await notifRes.json().catch(() => ({}));
        if (notifData.notifications) {
          setNotificationsList(notifData.notifications);
          setUnreadNotificationsCount(notifData.unreadCount || 0);
        }
      }
    } catch (err: any) {
      console.error('Failed to refresh seller data:', err);
    } finally {
      if (isInitial) setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData(true);
    const interval = setInterval(() => refreshData(false), 15000);
    return () => clearInterval(interval);
  }, [user?.id, user?.canteenId, ordersFilter, startDateStr, endDateStr]);

  // Close header dropdowns on outside click or Escape key press (Section 3)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showStatusDropdown && statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setShowStatusDropdown(false);
      }
      if (showProfileDropdown && profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
        setShowProfileDropdown(false);
      }
      if (showNotifications && notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (showCanteenDropdown && canteenDropdownRef.current && !canteenDropdownRef.current.contains(target)) {
        setShowCanteenDropdown(false);
      }
      if (showPrepDatePicker && prepDatePickerRef.current && !prepDatePickerRef.current.contains(target)) {
        setShowPrepDatePicker(false);
      }
      if (showCategoryDropdown && categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setShowCategoryDropdown(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowStatusDropdown(false);
        setShowProfileDropdown(false);
        setShowNotifications(false);
        setShowCanteenDropdown(false);
        setShowPrepDatePicker(false);
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showStatusDropdown, showProfileDropdown, showNotifications, showCanteenDropdown, showPrepDatePicker, showCategoryDropdown]);

  // Fetch historical orders when seller inspects a previous date on PREPARATION tab
  useEffect(() => {
    if (tab !== 'PREPARATION') return;
    const today = getTodayISTString();
    if (prepDate === today) {
      setPrepHistoricalOrders([]);
      setIsLoadingHistorical(false);
      return;
    }

    let isMounted = true;
    setIsLoadingHistorical(true);

    fetchWithViewAs(`/api/orders?startDate=${prepDate}&endDate=${prepDate}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data && Array.isArray(data.orders)) {
          setPrepHistoricalOrders(data.orders);
        } else {
          setPrepHistoricalOrders([]);
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Error fetching historical prep orders:', err);
        setPrepHistoricalOrders([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingHistorical(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tab, prepDate]);

  const clearMessages = () => {
    setPortalError(null);
    setPortalSuccess(null);
  };

  // -------------------------------------------------------------
  // Order Actions
  // -------------------------------------------------------------
  const handleAcceptOrder = async (orderId: string) => {
    if (actionLoading[orderId]) return;
    clearMessages();
    setActionLoading(prev => ({ ...prev, [orderId]: 'ACCEPTING' }));

    // Optimistic status update
    setOrdersList(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: 'ACCEPTED', paymentStatus: 'PENDING' } : o))
    );

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SELLER_ACCEPT' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept order.');
      setPortalSuccess('Order accepted! Customer notified to complete payment.');
      await refreshData(false);
    } catch (err: any) {
      setPortalError(err.message);
      await refreshData(false);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    if (actionLoading[orderId]) return;
    clearMessages();
    setActionLoading(prev => ({ ...prev, [orderId]: 'REJECTING' }));

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SELLER_REJECT', reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject order.');
      setPortalSuccess('Order request declined.');
      setRejectOrderId(null);
      await refreshData(false);
    } catch (err: any) {
      setPortalError(err.message);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
    }
  };

  const handleCancelUnpaidOrder = async (orderId: string) => {
    if (actionLoading[orderId]) return;
    clearMessages();
    setActionLoading(prev => ({ ...prev, [orderId]: 'CANCELLING' }));

    const finalReason = cancelPresetReason === 'Other'
      ? (cancelCustomReason.trim() || 'Unpaid order cancelled by seller')
      : cancelPresetReason;

    try {
      const res = await fetchWithViewAs(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SELLER_CANCEL_UNPAID', reason: finalReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel unpaid order.');
      setPortalSuccess('Unpaid order cancelled successfully. Batch capacity released.');
      setCancelOrderId(null);
      setCancelCustomReason('');
      await refreshData(false);
    } catch (err: any) {
      setPortalError(err.message);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
    }
  };

  const openSuggestModal = (order: Order) => {
    setSuggestOrderId(order.id);
    setSuggestNote(order.rejectionNote || '');
    const timeToParse = order.sellerSuggestedTime || order.exactPickupTime;
    const parsed = parseTimeToMinutes(timeToParse);
    if (parsed) {
      const h12 = parsed.hours % 12 === 0 ? 12 : parsed.hours % 12;
      const ampm = parsed.hours >= 12 ? 'PM' : 'AM';
      const mStr = parsed.minutes.toString().padStart(2, '0');
      setSuggestHour(h12.toString());
      setSuggestMinute(mStr);
      setSuggestAmpm(ampm as 'AM' | 'PM');
    } else {
      setSuggestHour('1');
      setSuggestMinute('30');
      setSuggestAmpm('PM');
    }
  };

  const handleSuggestTime = async () => {
    if (!suggestOrderId || actionLoading[suggestOrderId]) return;
    if (!suggestValidation.valid) {
      setPortalError(suggestValidation.error || 'Invalid pickup time');
      return;
    }
    clearMessages();
    setActionLoading(prev => ({ ...prev, [suggestOrderId]: 'SUGGESTING' }));

    try {
      const res = await fetch(`/api/orders/${suggestOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SELLER_SUGGEST_TIME',
          suggestedTime: canonicalSuggestTime,
          note: suggestNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to suggest time.');
      setPortalSuccess(`Proposed pickup time (${suggestValidation.displayTime}) sent to customer.`);
      setSuggestOrderId(null);
      setSuggestNote('');
      await refreshData(false);
    } catch (err: any) {
      setPortalError(err.message);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[suggestOrderId];
        return copy;
      });
    }
  };

  // -------------------------------------------------------------
  // Preparation Actions
  // -------------------------------------------------------------
  const handleStartBatchPrep = async (batchId: string) => {
    if (actionLoading[batchId]) return;
    clearMessages();
    setActionLoading(prev => ({ ...prev, [batchId]: 'STARTING' }));

    try {
      const res = await fetch('/api/orders/batch-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, action: 'START' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start batch preparation.');
      setPortalSuccess(`Started preparation for ${data.count} order(s) in this batch!`);
      await refreshData(false);
    } catch (err: any) {
      setPortalError(err.message);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[batchId];
        return copy;
      });
    }
  };

  const handleMarkBatchReady = async (batchId: string) => {
    if (actionLoading[batchId]) return;
    clearMessages();
    setActionLoading(prev => ({ ...prev, [batchId]: 'MARKING_BATCH_READY' }));

    try {
      const res = await fetch('/api/orders/batch-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, action: 'MARK_READY' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark batch ready.');
      setPortalSuccess(`Marked ${data.count} order(s) in batch READY for customer pickup!`);
      await refreshData(false);
    } catch (err: any) {
      setPortalError(err.message);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[batchId];
        return copy;
      });
    }
  };

  const handleMarkOrderReady = async (orderId: string) => {
    if (actionLoading[orderId]) return;
    clearMessages();
    setActionLoading(prev => ({ ...prev, [orderId]: 'MARKING_READY' }));

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SELLER_READY' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark order ready.');
      setPortalSuccess('Order marked READY! Waiting for customer pickup.');
      await refreshData(false);
    } catch (err: any) {
      setPortalError(err.message);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
    }
  };

  const handleStartOrderPrep = async (orderId: string) => {
    if (actionLoading[orderId]) return;
    clearMessages();
    setActionLoading(prev => ({ ...prev, [orderId]: 'STARTING_PREP' }));

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SELLER_START_PREP' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start preparation.');
      setPortalSuccess('Order marked IN PREPARATION!');
      await refreshData(false);
    } catch (err: any) {
      setPortalError(err.message);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
    }
  };

  const handleCollectReadyOrder = async (order: Order) => {
    if (actionLoading[order.id]) return;
    clearMessages();
    const code = order.pickupCode;
    if (!code) {
      setVerifyTargetOrderId(order.id);
      setTab('PICKUP');
      return;
    }
    await handleVerifyPickupCode(order.id, code);
  };

  // -------------------------------------------------------------
  // Pickup Verification
  // -------------------------------------------------------------
  const handleVerifyPickupCode = async (orderId: string, codeToVerify: string) => {
    if (!codeToVerify.trim() || actionLoading[orderId]) return;
    clearMessages();
    setActionLoading(prev => ({ ...prev, [orderId]: 'VERIFYING' }));
    setVerifyAttemptsLeft(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/verify-pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickupCode: codeToVerify.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.attemptsLeft !== undefined) {
          setVerifyAttemptsLeft(data.attemptsLeft);
        }
        throw new Error(data.error || 'Invalid pickup code.');
      }

      setPortalSuccess('✅ Pickup Code Verified! Order status changed to COLLECTED.');
      setPickupCodeInput('');
      setVerifyTargetOrderId(null);
      await refreshData(false);
    } catch (err: any) {
      setPortalError(err.message);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
    }
  };

  // -------------------------------------------------------------
  // Menu Management
  // -------------------------------------------------------------
  const handleToggleItemAvailability = async (itemId: string, currentVal: boolean) => {
    clearMessages();
    setActionLoading(prev => ({ ...prev, [itemId]: 'UPDATING_AVAIL' }));

    // Optimistic toggle
    setMenuItems(prev => prev.map(m => (m.id === itemId ? { ...m, isAvailable: !currentVal } : m)));

    try {
      const res = await fetch('/api/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, isAvailable: !currentVal }),
      });
      if (!res.ok) throw new Error('Failed to update availability.');
      notifyMenuUpdate();
    } catch (err: any) {
      setPortalError(err.message);
      await refreshData(false);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });
    }
  };

  const handleToggleItemToday = async (itemId: string, currentVal: boolean) => {
    clearMessages();
    setActionLoading(prev => ({ ...prev, [itemId]: 'UPDATING_TODAY' }));

    // Optimistic toggle
    setMenuItems(prev => prev.map(m => (m.id === itemId ? { ...m, isTodaysMenu: !currentVal } : m)));

    try {
      const res = await fetch('/api/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, isTodaysMenu: !currentVal }),
      });
      if (!res.ok) throw new Error('Failed to update Today\'s Menu status.');
      notifyMenuUpdate();
    } catch (err: any) {
      setPortalError(err.message);
      await refreshData(false);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });
    }
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!formName.trim()) {
      setPortalError('Item name is required.');
      return;
    }

    let priceVal: string | null = null;
    if (!formPriceUnconfirmed) {
      if (!formPrice.trim()) {
        setPortalError('Price is required or check "Price not fixed / unconfirmed".');
        return;
      }
      const priceNum = parseFloat(formPrice);
      if (isNaN(priceNum) || priceNum < 0) {
        setPortalError('Please enter a valid price.');
        return;
      }
      priceVal = priceNum.toFixed(2);
    }

    const isEdit = Boolean(editingItem);
    const actionKey = isEdit ? editingItem!.id : 'NEW_ITEM';
    setActionLoading(prev => ({ ...prev, [actionKey]: 'SAVING' }));

    try {
      if (isEdit) {
        const res = await fetch('/api/menu', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: editingItem!.id,
            name: formName.trim(),
            price: priceVal,
            isAvailable: priceVal === null ? false : editingItem!.isAvailable,
            description: formDesc.trim() || null,
            categoryId: formCategory || undefined,
            imageUrl: formImage.trim() || null,
            dailyCapacity: formOrderLimit ? parseInt(formOrderLimit, 10) : 50,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update item.');
        setPortalSuccess(`Updated item "${formName.trim()}" successfully.`);
      } else {
        const res = await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            price: priceVal,
            description: formDesc.trim() || null,
            categoryId: formCategory || undefined,
            categoryName: formCategory ? undefined : formNewCategory.trim() || 'General',
            isVegetarian: formIsVeg,
            isTodaysMenu: formIsTodaysMenu,
            imageUrl: formImage.trim() || null,
            dailyCapacity: formOrderLimit ? parseInt(formOrderLimit, 10) : 50,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create item.');
        setPortalSuccess(`Added "${formName.trim()}" to your menu.`);
      }

      setIsAddItemOpen(false);
      setEditingItem(null);
      resetItemForm();
      await refreshData(false);
      notifyMenuUpdate();
    } catch (err: any) {
      setPortalError(err.message);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[actionKey];
        return copy;
      });
    }
  };

  // Image File Upload Processor (Client-side Canvas compression to max 600x600 WebP/JPEG data URL)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImageError('Unsupported format. Please select a JPG, PNG, or WebP image.');
      return;
    }

    // Validate size (max 2.5MB)
    if (file.size > 2.5 * 1024 * 1024) {
      setImageError('File size exceeds 2.5MB. Please choose a smaller image.');
      return;
    }

    setImageUploadLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCropModalSrc(dataUrl);
      setCropScale(1);
      setCropPanX(0);
      setCropPanY(0);
      setImageUploadLoading(false);
    };
    reader.onerror = () => {
      setImageError('Failed to read file from your device.');
      setImageUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  // Canvas-based square image cropping handler (600x600 px with clean white canvas)
  const handleApplyCrop = () => {
    if (!cropModalSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clean white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 600, 600);

        // Aspect fit base dimensions
        const ratio = Math.min(600 / img.width, 600 / img.height);
        const baseW = img.width * ratio;
        const baseH = img.height * ratio;

        const scaledW = baseW * cropScale;
        const scaledH = baseH * cropScale;

        // Apply pan offset (canvas 600px vs 256px preview = ~2.34x)
        const panFactor = 600 / 256;
        const drawX = (600 - scaledW) / 2 + (cropPanX * panFactor);
        const drawY = (600 - scaledH) / 2 + (cropPanY * panFactor);

        ctx.drawImage(img, drawX, drawY, scaledW, scaledH);

        const dataUrl = canvas.toDataURL('image/webp', 0.9);
        setFormImage(dataUrl);
        setCropModalSrc(null);
        setCropScale(1);
        setCropPanX(0);
        setCropPanY(0);
      } catch {
        setFormImage(cropModalSrc);
        setCropModalSrc(null);
      }
    };
    img.onerror = () => {
      setImageError('Failed to load image for cropping.');
      setCropModalSrc(null);
    };
    img.src = cropModalSrc;
  };

  // Helper to resolve dish photography (prefers custom image -> fallback to curated dish photo -> default)
  const getItemImage = (item: MenuItem): string => {
    if (item.imageUrl) return item.imageUrl;
    if (ITEM_IMAGE_MAP[item.name]) return ITEM_IMAGE_MAP[item.name];
    return 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80';
  };

  // Modal-driven Archive Confirmation Handler
  const handleConfirmArchive = async () => {
    if (!confirmArchiveItem) return;
    const { id: itemId, name: itemName } = confirmArchiveItem;
    clearMessages();
    setActionLoading(prev => ({ ...prev, [itemId]: 'ARCHIVING' }));

    // Optimistically update
    setMenuItems(prev => prev.map(m => (m.id === itemId ? { ...m, isArchived: true, isAvailable: false } : m)));

    try {
      const res = await fetch(`/api/menu?id=${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to archive item.');
      setPortalSuccess(`Item "${itemName}" archived successfully.`);
      setConfirmArchiveItem(null);
      await refreshData(false);
      notifyMenuUpdate();
    } catch (err: any) {
      setPortalError(err.message);
      await refreshData(false);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });
    }
  };

  // Modal-driven Restore Confirmation Handler
  const handleConfirmRestore = async () => {
    if (!confirmRestoreItem) return;
    const { id: itemId, name: itemName } = confirmRestoreItem;
    clearMessages();
    setActionLoading(prev => ({ ...prev, [itemId]: 'RESTORING' }));

    // Optimistically restore to normal menu (preserves existing availability and category)
    setMenuItems(prev => prev.map(m => (m.id === itemId ? { ...m, isArchived: false } : m)));

    try {
      const res = await fetch('/api/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, isArchived: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore item.');
      setPortalSuccess(`Item "${itemName}" restored to active menu.`);
      setConfirmRestoreItem(null);
      await refreshData(false);
      notifyMenuUpdate();
    } catch (err: any) {
      setPortalError(err.message);
      await refreshData(false);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    clearMessages();
    setActionLoading(prev => ({ ...prev, NEW_CAT: 'SAVING' }));

    try {
      const res = await fetch('/api/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create category.');
      setPortalSuccess(`Category "${newCatName.trim()}" created.`);
      setNewCatName('');
      setIsAddCategoryOpen(false);
      await refreshData(false);
      notifyMenuUpdate();
    } catch (err: any) {
      setPortalError(err.message);
    } finally {
      setActionLoading(prev => {
        const copy = { ...prev };
        delete copy.NEW_CAT;
        return copy;
      });
    }
  };

  // Category Deletion Handler with accidental-deletion prevention (Requirement 1)
  const handleDeleteCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteCategorySelectedId) {
      setDeleteCategoryError('Please select a category to delete.');
      return;
    }

    const catToDelete = categories.find(c => c.id === deleteCategorySelectedId);
    if (!catToDelete) return;

    // Check frontend usage first as immediate feedback
    const itemsUsing = menuItems.filter(m => m.categoryId === deleteCategorySelectedId);
    if (itemsUsing.length > 0) {
      setDeleteCategoryError(
        `Cannot delete category "${catToDelete.name}" because it is currently assigned to ${itemsUsing.length} menu item(s). Please reassign or delete these items first.`
      );
      return;
    }

    setDeleteCategoryLoading(true);
    setDeleteCategoryError(null);

    try {
      const res = await fetch(`/api/menu/categories?id=${deleteCategorySelectedId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete category.');
      }
      setPortalSuccess(`Category "${catToDelete.name}" deleted successfully.`);
      setIsDeleteCategoryOpen(false);
      setDeleteCategorySelectedId('');
      await refreshData(false);
      notifyMenuUpdate();
    } catch (err: any) {
      setDeleteCategoryError(err.message);
    } finally {
      setDeleteCategoryLoading(false);
    }
  };

  // Dedicated Image Upload Handlers for single item (+ Icon on image) (Requirement 2)
  const openImageUploadModal = (item: MenuItem) => {
    setImageUploadItem(item);
    setImageUploadMode('UPLOAD');
    setImageUploadPreview(item.imageUrl || '');
    setImageUploadUrl(item.imageUrl && !item.imageUrl.startsWith('data:') ? item.imageUrl : '');
    setSingleItemImageLoading(false);
    setImageUploadSaving(false);
    setImageUploadError(null);
    setImageUploadSuccess(null);
  };

  const handleDeviceImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploadError(null);
    setImageUploadSuccess(null);

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImageUploadError('Unsupported format. Please select a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setImageUploadError('File size exceeds 2.5MB. Please choose a smaller image.');
      return;
    }

    setSingleItemImageLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 600;
          canvas.height = 600;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 600, 600);
            const ratio = Math.min(600 / img.width, 600 / img.height);
            const w = img.width * ratio;
            const h = img.height * ratio;
            const x = (600 - w) / 2;
            const y = (600 - h) / 2;
            ctx.drawImage(img, x, y, w, h);
            const optimized = canvas.toDataURL('image/webp', 0.9);
            setImageUploadPreview(optimized);
          } else {
            setImageUploadPreview(dataUrl);
          }
        } catch {
          setImageUploadPreview(dataUrl);
        } finally {
          setSingleItemImageLoading(false);
        }
      };
      img.onerror = () => {
        setImageUploadError('Failed to load image for processing.');
        setSingleItemImageLoading(false);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setImageUploadError('Failed to read file from your device.');
      setSingleItemImageLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveItemImage = async (newImageUrl: string | null) => {
    if (!imageUploadItem) return;
    setImageUploadSaving(true);
    setImageUploadError(null);
    setImageUploadSuccess(null);

    try {
      const res = await fetch('/api/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: imageUploadItem.id,
          imageUrl: newImageUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update item image.');

      // Optimistically update local menu items
      setMenuItems(prev =>
        prev.map(m => (m.id === imageUploadItem.id ? { ...m, imageUrl: newImageUrl || null } : m))
      );
      const successText = newImageUrl
        ? `Updated image for "${imageUploadItem.name}" successfully.`
        : `Removed custom image for "${imageUploadItem.name}".`;
      setImageUploadSuccess(successText);
      setPortalSuccess(`Updated image for "${imageUploadItem.name}".`);
      await refreshData(false);
      notifyMenuUpdate();
      setTimeout(() => {
        setImageUploadItem(null);
      }, 700);
    } catch (err: any) {
      setImageUploadError(err.message);
    } finally {
      setImageUploadSaving(false);
    }
  };

  const openEditItemModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormPrice(item.price ? item.price : '');
    setFormPriceUnconfirmed(item.price === null);
    setFormCategory(item.categoryId);
    setFormNewCategory('');
    setFormDesc(item.description || '');
    setFormIsVeg(item.isVegetarian);
    setFormIsTodaysMenu(item.isTodaysMenu);
    setFormImage(item.imageUrl || '');
    setFormOrderLimit(item.dailyCapacity ? item.dailyCapacity.toString() : '50');
    setImageError(null);
    setImageInputMode('UPLOAD');
    setIsAddItemOpen(true);
  };

  const resetItemForm = () => {
    setFormName('');
    setFormPrice('');
    setFormPriceUnconfirmed(false);
    setFormCategory(categories[0]?.id || '');
    setFormNewCategory('');
    setFormDesc('');
    setFormIsVeg(true);
    setFormIsTodaysMenu(true);
    setFormImage('');
    setFormOrderLimit('50');
    setImageError(null);
    setImageInputMode('UPLOAD');
  };

  // -------------------------------------------------------------
  // Filtered Lists & Computations
  // -------------------------------------------------------------
  const incomingRequestedOrders = useMemo(() => {
    return ordersList.filter(o => ['REQUESTED', 'TIME_CHANGE_PROPOSED'].includes(o.status));
  }, [ordersList]);

  const activeOrders = useMemo(() => {
    return ordersList.filter(o =>
      ['ACCEPTED', 'AWAITING_PAYMENT', 'PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'READY'].includes(o.status)
    );
  }, [ordersList]);

  const readyOrders = useMemo(() => {
    return ordersList.filter(o => ['READY_FOR_PICKUP', 'READY'].includes(o.status));
  }, [ordersList]);

  const collectedOrders = useMemo(() => {
    return ordersList.filter(o => o.status === 'COLLECTED');
  }, [ordersList]);

  // Aggregate items in batches for Preparation view
  const batchOrdersMap = useMemo(() => {
    const map = new Map<string, { batch: Batch; orders: Order[]; itemsTally: Record<string, number> }>();

    for (const ord of ordersList) {
      if (!['CONFIRMED', 'PREPARING'].includes(ord.status)) continue;
      const bId = ord.batchId || 'unassigned';
      if (!map.has(bId)) {
        const foundBatch = batches.find(b => b.id === bId) || {
          id: bId,
          displayLabel: ord.batch?.displayLabel || 'Scheduled Batch',
          startTime: ord.batch?.startTime || '00:00',
          endTime: ord.batch?.endTime || '00:00',
          capacity: 10,
          reservedCount: 1,
          status: 'PREPARING',
        };
        map.set(bId, { batch: foundBatch, orders: [], itemsTally: {} });
      }

      const entry = map.get(bId)!;
      entry.orders.push(ord);

      for (const it of ord.items) {
        entry.itemsTally[it.itemName] = (entry.itemsTally[it.itemName] || 0) + it.quantity;
      }
    }

    return Array.from(map.values());
  }, [ordersList, batches]);

  // -------------------------------------------------------------
  // Kitchen Preparation Batches Computation (4 Views)
  // -------------------------------------------------------------
  const isPrepDateToday = prepDate === getTodayISTString();

  const prepSourceOrders = useMemo(() => {
    return isPrepDateToday ? ordersList : prepHistoricalOrders;
  }, [isPrepDateToday, ordersList, prepHistoricalOrders]);

  const prepTabCounts = useMemo(() => {
    if (!isPrepDateToday) {
      const historicalReady = prepSourceOrders.filter(o => ['READY', 'READY_FOR_PICKUP', 'COLLECTED'].includes(o.status));
      return {
        all: historicalReady.length,
        pending: 0,
        preparing: 0,
        ready: historicalReady.length,
      };
    }
    const pending = prepSourceOrders.filter(o => o.status === 'CONFIRMED').length;
    const preparing = prepSourceOrders.filter(o => o.status === 'PREPARING').length;
    const ready = prepSourceOrders.filter(o => ['READY', 'READY_FOR_PICKUP'].includes(o.status)).length;
    return {
      all: pending + preparing + ready,
      pending,
      preparing,
      ready,
    };
  }, [isPrepDateToday, prepSourceOrders]);

  const prepFilteredOrders = useMemo(() => {
    if (!isPrepDateToday) {
      if (prepTab === 'PENDING' || prepTab === 'PREPARING') {
        return [];
      }
      return prepSourceOrders.filter(o => ['READY', 'READY_FOR_PICKUP', 'COLLECTED'].includes(o.status));
    }

    if (prepTab === 'PENDING') {
      return prepSourceOrders.filter(o => o.status === 'CONFIRMED');
    }
    if (prepTab === 'PREPARING') {
      return prepSourceOrders.filter(o => o.status === 'PREPARING');
    }
    if (prepTab === 'READY') {
      return prepSourceOrders.filter(o => ['READY', 'READY_FOR_PICKUP'].includes(o.status));
    }
    // ALL
    return prepSourceOrders.filter(o => ['CONFIRMED', 'PREPARING', 'READY', 'READY_FOR_PICKUP'].includes(o.status));
  }, [isPrepDateToday, prepTab, prepSourceOrders]);

  const prepBatchGroups = useMemo(() => {
    const groupMap = new Map<string, {
      batchKey: string;
      batchLabel: string;
      startTime: string;
      endTime: string;
      capacity: number;
      reservedCount: number;
      orders: Order[];
      aggregateItems: Record<string, number>;
      pendingCount: number;
      preparingCount: number;
      readyCount: number;
      status: 'PENDING' | 'PREPARING' | 'READY';
    }>();

    for (const ord of prepFilteredOrders) {
      let bKey = ord.batchId;
      const matchedBatch = batches.find(b => b.id === ord.batchId);
      let label = ord.batch?.displayLabel || matchedBatch?.displayLabel;
      let startTime = ord.batch?.startTime || matchedBatch?.startTime;
      let endTime = ord.batch?.endTime || matchedBatch?.endTime;

      if (!label && ord.exactPickupTime) {
        try {
          const calc = calculate15MinBatch(ord.exactPickupTime);
          label = calc.displayLabel;
          startTime = calc.startTime;
          endTime = calc.endTime;
        } catch {
          label = '15-min Batch';
        }
      }

      if (!bKey) {
        bKey = startTime || 'unassigned';
      }

      if (!groupMap.has(bKey)) {
        groupMap.set(bKey, {
          batchKey: bKey,
          batchLabel: label || '15-min Batch',
          startTime: startTime || '00:00',
          endTime: endTime || '00:00',
          capacity: matchedBatch?.capacity || 10,
          reservedCount: matchedBatch?.reservedCount || 0,
          orders: [],
          aggregateItems: {},
          pendingCount: 0,
          preparingCount: 0,
          readyCount: 0,
          status: 'PENDING',
        });
      }

      const grp = groupMap.get(bKey)!;
      grp.orders.push(ord);

      if (ord.status === 'CONFIRMED') grp.pendingCount += 1;
      else if (ord.status === 'PREPARING') grp.preparingCount += 1;
      else if (['READY', 'READY_FOR_PICKUP', 'COLLECTED'].includes(ord.status)) grp.readyCount += 1;

      for (const it of ord.items) {
        grp.aggregateItems[it.itemName] = (grp.aggregateItems[it.itemName] || 0) + it.quantity;
      }
    }

    const groups = Array.from(groupMap.values()).map(grp => {
      if (grp.preparingCount > 0) {
        grp.status = 'PREPARING';
      } else if (grp.pendingCount > 0) {
        grp.status = 'PENDING';
      } else {
        grp.status = 'READY';
      }
      return grp;
    });

    return groups.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [prepFilteredOrders, batches]);

  const togglePrepBatchAccordion = (batchKey: string) => {
    setExpandedPrepBatches(prev => ({
      ...prev,
      [batchKey]: prev[batchKey] === undefined ? false : !prev[batchKey]
    }));
  };

  const isPrepBatchExpanded = (batchKey: string) => {
    if (selectedCarouselBatchId && selectedCarouselBatchId === batchKey) {
      return true;
    }
    return expandedPrepBatches[batchKey] !== false;
  };

  // -------------------------------------------------------------
  // Expandable/Collapsible 15-Minute Batch Groups for Orders Screen
  // -------------------------------------------------------------
  const batchGroups = useMemo(() => {
    const displayList =
      ordersFilter === 'REQUESTED'
        ? incomingRequestedOrders
        : ordersFilter === 'ACTIVE'
        ? activeOrders
        : ordersList;

    const groupMap = new Map<string, {
      batchKey: string;
      label: string;
      startTime: string;
      capacity: number;
      reservedCount: number;
      orders: Order[];
      pendingCount: number;
      aggregateItems: Record<string, number>;
    }>();

    for (const ord of displayList) {
      const bKey = ord.batchId || ord.batch?.startTime || 'unassigned';
      if (!groupMap.has(bKey)) {
        const matchedBatch = batches.find(b => b.id === ord.batchId);
        groupMap.set(bKey, {
          batchKey: bKey,
          label: ord.batch?.displayLabel || matchedBatch?.displayLabel || '15-min Batch',
          startTime: ord.batch?.startTime || matchedBatch?.startTime || '00:00',
          capacity: matchedBatch?.capacity || 10,
          reservedCount: matchedBatch?.reservedCount || 0,
          orders: [],
          pendingCount: 0,
          aggregateItems: {},
        });
      }

      const grp = groupMap.get(bKey)!;
      grp.orders.push(ord);
      if (ord.status === 'REQUESTED') {
        grp.pendingCount += 1;
      }
      for (const it of ord.items) {
        grp.aggregateItems[it.itemName] = (grp.aggregateItems[it.itemName] || 0) + it.quantity;
      }
    }

    return Array.from(groupMap.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [ordersFilter, incomingRequestedOrders, activeOrders, ordersList, batches]);

  const toggleBatchAccordion = (batchKey: string) => {
    setExpandedBatches(prev => ({
      ...prev,
      [batchKey]: prev[batchKey] === undefined ? false : !prev[batchKey]
    }));
  };

  const isBatchExpanded = (batchKey: string) => {
    // Default open if not explicitly toggled
    return expandedBatches[batchKey] !== false;
  };

  // Active (Non-Archived) Menu Items
  const activeMenuItems = useMemo(() => {
    return menuItems.filter(m => !m.isArchived);
  }, [menuItems]);

  // Today's Menu: Non-archived, marked for today, in stock (isAvailable), and priced
  const todaysMenuItems = useMemo(() => {
    return activeMenuItems.filter(m => m.isTodaysMenu && m.isAvailable && m.price !== null);
  }, [activeMenuItems]);

  // Archived Items
  const archivedMenuItems = useMemo(() => {
    return menuItems.filter(m => m.isArchived);
  }, [menuItems]);

  // Filtered Menu Items for Display
  const filteredMenuItems = useMemo(() => {
    let list: MenuItem[] = [];
    if (menuFilterCategory === 'ALL') {
      list = activeMenuItems;
    } else if (menuFilterCategory === 'TODAYS') {
      list = todaysMenuItems;
    } else if (menuFilterCategory === 'ARCHIVED') {
      list = archivedMenuItems;
    } else {
      list = activeMenuItems.filter(m => m.categoryId === menuFilterCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [activeMenuItems, todaysMenuItems, archivedMenuItems, menuFilterCategory, searchQuery]);

  // Sort menu items by stock availability: in-stock items first, followed by all out-of-stock items (Requirement 4)
  const { inStockMenuItems, outOfStockMenuItems } = useMemo(() => {
    const inStock: MenuItem[] = [];
    const outOfStock: MenuItem[] = [];
    for (const item of filteredMenuItems) {
      if (item.isAvailable) {
        inStock.push(item);
      } else {
        outOfStock.push(item);
      }
    }
    return { inStockMenuItems: inStock, outOfStockMenuItems: outOfStock };
  }, [filteredMenuItems]);

  const format12Time = (isoString?: string | Date | null) => {
    return formatPickupTimeDisplay(isoString);
  };

  const canteenDisplayName = canteenData?.name || `${user.name}'s Canteen`;

  // -------------------------------------------------------------
  // Render
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[calc(100vh-140px)]">
      {/* ========================================================= */}
      {/* MOBILE DRAWER BACKDROP & PANEL */}
      {/* ========================================================= */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-surface shadow-2xl p-5 border-r border-slate-200 z-10 animate-in slide-in-from-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-blue text-white flex items-center justify-center font-bold">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-text-primary">{canteenDisplayName}</h3>
                  <p className="text-[10px] text-slate-500">Seller Workspace</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close menu drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1 flex-1">
              {[
                { id: 'DASHBOARD', label: 'Dashboard', icon: Home, count: 0 },
                { id: 'ORDERS', label: 'Orders', icon: ShoppingBag, count: incomingRequestedOrders.length },
                { id: 'PREPARATION', label: 'Preparation', icon: ChefHat, count: batchOrdersMap.length },
                { id: 'PICKUP', label: 'Pickup', icon: QrCode, count: readyOrders.length },
                { id: 'MENU', label: 'Menu', icon: Utensils, count: activeMenuItems.length },
                { id: 'ACCOUNT', label: 'Settings', icon: Settings, count: 0 },
              ].map(item => {
                const Icon = item.icon;
                const isActive = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTab(item.id as any);
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition min-h-[44px] ${
                      isActive ? 'bg-primary-blue text-white shadow-tactile' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.count > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-white text-primary-blue' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.count}
                      </span>
                    )}
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

      {/* ========================================================= */}
      {/* DESKTOP SIDEBAR NAVIGATION (Reference Image 1) */}
      {/* ========================================================= */}
      <aside className="hidden md:flex w-[240px] bg-[#DFF3E8]/90 backdrop-blur-md rounded-3xl border border-[#BFEBDD] flex-col shrink-0 p-4 shadow-sm h-fit self-start sticky top-6 relative overflow-hidden">
        {/* QLess Brand Logo Header */}
        <div className="px-2 pt-2 pb-5 border-b border-[#BFEBDD]/60 mb-4">
          <QLessLogo size="md" />
        </div>

        {/* Navigation Links (Requested Order: Dashboard, Orders, Preparation, Pickup, Menu, Settings) */}
        <nav className="flex-1 space-y-1.5 relative z-10">
          {/* 1. Dashboard */}
          <button
            onClick={() => setTab('DASHBOARD')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              tab === 'DASHBOARD'
                ? 'bg-white/95 text-[#073653] shadow-sm border border-[#BFEBDD]/80 font-black'
                : 'text-[#073653] hover:bg-white/60 hover:text-[#073653]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Home className={`w-4 h-4 ${tab === 'DASHBOARD' ? 'text-[#00B894]' : 'text-[#64839A]'}`} />
              <span>Dashboard</span>
            </div>
          </button>

          {/* 2. Orders */}
          <button
            onClick={() => setTab('ORDERS')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              tab === 'ORDERS'
                ? 'bg-[#00B894] text-white shadow-sm'
                : 'text-[#073653] hover:bg-white/60 hover:text-[#073653]'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4" />
              <span>Orders</span>
            </div>
            {incomingRequestedOrders.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                tab === 'ORDERS' ? 'bg-white text-[#00B894]' : 'bg-rose-500 text-white'
              }`}>
                {incomingRequestedOrders.length}
              </span>
            )}
          </button>

          {/* 3. Preparation */}
          <button
            onClick={() => setTab('PREPARATION')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              tab === 'PREPARATION'
                ? 'bg-[#00B894] text-white shadow-sm'
                : 'text-[#073653] hover:bg-white/60 hover:text-[#073653]'
            }`}
          >
            <div className="flex items-center gap-3">
              <ChefHat className="w-4 h-4" />
              <span>Preparation</span>
            </div>
            {(prepTabCounts.pending + prepTabCounts.preparing > 0 || batchOrdersMap.length > 0) && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                tab === 'PREPARATION' ? 'bg-white text-[#00B894]' : 'bg-amber-500 text-white'
              }`}>
                {prepTabCounts.pending + prepTabCounts.preparing || batchOrdersMap.length}
              </span>
            )}
          </button>

          {/* 4. Pickup */}
          <button
            onClick={() => setTab('PICKUP')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              tab === 'PICKUP'
                ? 'bg-[#00B894] text-white shadow-sm'
                : 'text-[#073653] hover:bg-white/60 hover:text-[#073653]'
            }`}
          >
            <div className="flex items-center gap-3">
              <QrCode className="w-4 h-4" />
              <span>Pickup</span>
            </div>
            {readyOrders.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                tab === 'PICKUP' ? 'bg-white text-[#00B894]' : 'bg-[#00B894] text-white'
              }`}>
                {readyOrders.length}
              </span>
            )}
          </button>

          {/* 5. Menu */}
          <button
            onClick={() => setTab('MENU')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              tab === 'MENU'
                ? 'bg-white/95 text-[#073653] shadow-sm border border-[#BFEBDD]/80 font-black'
                : 'text-[#073653] hover:bg-white/60 hover:text-[#073653]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Utensils className={`w-4 h-4 ${tab === 'MENU' ? 'text-[#00B894]' : 'text-[#64839A]'}`} />
              <span>Menu</span>
            </div>
            <span className="text-[10px] text-[#64839A] font-semibold">{activeMenuItems.length}</span>
          </button>

          {/* 6. Settings */}
          <button
            onClick={() => setTab('ACCOUNT')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              tab === 'ACCOUNT'
                ? 'bg-[#00B894] text-white shadow-sm'
                : 'text-[#073653] hover:bg-white/60 hover:text-[#073653]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </div>
          </button>
        </nav>

        {/* Quick Refresh Button & Footer Slogan */}
        <div className="pt-4 mt-6 border-t border-[#BFEBDD]/80 space-y-3 relative z-10">
          <button
            onClick={() => refreshData(false)}
            disabled={isRefreshing}
            className="w-full py-2.5 px-3 bg-white/80 hover:bg-white text-[#073653] border border-[#BFEBDD] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00B894] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>

          <div className="text-center pt-2">
            <p className="text-[11px] font-black text-[#073653] tracking-wide">Less Queue</p>
            <p className="text-[10px] font-bold text-[#64839A] tracking-wider uppercase mt-0.5">More Campus Time</p>
          </div>
        </div>

        {/* Botanical leaf watermark in bottom corner */}
        <div className="absolute -bottom-6 -left-6 w-36 h-36 opacity-35 pointer-events-none select-none">
          <svg viewBox="0 0 200 200" className="w-full h-full fill-[#00B894]">
            <path d="M20 180 C40 120, 80 80, 160 40 C140 100, 100 140, 20 180 Z" opacity="0.3" />
            <path d="M50 160 C80 120, 110 90, 170 60 C150 110, 110 140, 50 160 Z" opacity="0.2" />
          </svg>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================= */}
      <main className="flex-1 min-w-0 w-full">
        {/* ========================================================= */}
        {/* TOP COMPACT HEADER (Reference Image 2) - Elevated Stacking */}
        {/* ========================================================= */}
        <header className="relative z-40 bg-white/90 backdrop-blur-md rounded-2xl p-2.5 px-4 border border-[#BFEBDD]/70 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-6">
          {/* Left: Outlet Thumbnail, Name, Operating Status Dropdown, Context */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-2.5 rounded-xl bg-white/80 text-[#073653] hover:bg-white md:hidden border border-[#BFEBDD]/80 flex items-center justify-center min-h-[44px] min-w-[44px]"
              aria-label="Open navigation menu"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              {/* Outlet Thumbnail */}
              <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200/60 shadow-sm">
                <img
                  src={CANTEEN_THUMBNAIL_URL}
                  alt={canteenDisplayName}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Outlet Info & Status Dropdown */}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-extrabold text-[#073653] tracking-tight">{canteenDisplayName}</h1>

                  {/* Status Dropdown Trigger */}
                  <div ref={statusDropdownRef} className="relative">
                    <button
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DFF3E8] text-[#073653] border border-[#BFEBDD]/80 hover:bg-[#DFF3E8]/80 transition cursor-pointer"
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        canteenStatus === 'OPEN' ? 'bg-[#00B894] animate-pulse' :
                        canteenStatus === 'TOO_BUSY' ? 'bg-amber-500' : 'bg-rose-500'
                      }`} />
                      <span>{canteenStatus === 'OPEN' ? 'Open' : canteenStatus === 'TOO_BUSY' ? 'Too Busy' : 'Closed'}</span>
                      <ChevronDown className="w-3 h-3 text-[#64839A]" />
                    </button>

                    {/* Status Dropdown Menu */}
                    {showStatusDropdown && (
                      <div className="absolute top-full left-0 mt-1.5 w-36 bg-white rounded-xl shadow-2xl border border-[#BFEBDD] p-1.5 z-50 animate-in fade-in zoom-in-95">
                        <button
                          onClick={() => { onUpdateStatus('OPEN'); setShowStatusDropdown(false); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                            canteenStatus === 'OPEN' ? 'bg-[#DFF3E8] text-[#073653]' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-[#00B894]" />
                          <span>Open</span>
                        </button>
                        <button
                          onClick={() => { onUpdateStatus('TOO_BUSY'); setShowStatusDropdown(false); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                            canteenStatus === 'TOO_BUSY' ? 'bg-amber-50 text-amber-900' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>Too Busy</span>
                        </button>
                        <button
                          onClick={() => { onUpdateStatus('CLOSED'); setShowStatusDropdown(false); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                            canteenStatus === 'CLOSED' ? 'bg-rose-50 text-rose-900' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>Closed</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Multi-Canteen Switcher Dropdown (Admin / Multi-canteen Authorized Only) */}
                  {canteensList && canteensList.length > 1 && user?.role === 'ADMIN' && (
                    <div className="relative">
                      <button
                        onClick={() => setShowCanteenDropdown(!showCanteenDropdown)}
                        className="text-[11px] font-bold text-[#64839A] hover:text-[#073653] flex items-center gap-1 border-l border-slate-200 pl-2"
                      >
                        <span>Switch Outlet</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {showCanteenDropdown && (
                        <div className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-[#BFEBDD] p-1.5 z-50">
                          {canteensList.map(c => (
                            <button
                              key={c.id}
                              onClick={() => {
                                onSelectCanteen?.(c.id);
                                setShowCanteenDropdown(false);
                                refreshData(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between ${
                                selectedCanteenId === c.id ? 'bg-[#DFF3E8] text-[#073653]' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{c.name}</span>
                              {selectedCanteenId === c.id && <Check className="w-3.5 h-3.5 text-[#00B894]" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-[#64839A] font-medium flex items-center gap-1.5 mt-0.5">
                  <span>Indraprastha College for Women · Main Canteen</span>
                  <span className="text-[#64839A]/60">|</span>
                  <span>Today 8:00 AM – 5:00 PM IST | 15-min time slots</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right: Search Bar, Notifications, Profile Pill */}
          <div className="flex items-center gap-3 self-end lg:self-auto w-full lg:w-auto justify-end">
            {/* Search Input */}
            <div className="relative flex-1 lg:w-64 max-w-xs">
              <Search className="w-4 h-4 text-[#64839A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white/90 border border-[#BFEBDD]/80 rounded-full text-xs text-[#073653] placeholder:text-[#64839A] focus:outline-none focus:ring-2 focus:ring-[#00B894]/30 shadow-sm"
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
            <div ref={notificationsDropdownRef} className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-full bg-white/90 border border-[#BFEBDD]/70 text-[#073653] hover:bg-white relative transition shadow-sm min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-[#073653]" />
                {unreadNotificationsCount > 0 && (
                  <span className="w-2.5 h-2.5 bg-[#FF5A5F] rounded-full absolute top-1.5 right-1.5 ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-[#BFEBDD] p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-[#DFF3E8]">
                    <span className="text-xs font-black text-[#073653]">Notifications</span>
                    <span className="text-[10px] text-[#64839A] font-bold">{unreadNotificationsCount} unread</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 mt-2">
                    {notificationsList.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No notifications</p>
                    ) : (
                      notificationsList.slice(0, 5).map((n, i) => (
                        <div key={n.id || i} className="py-2 text-xs">
                          <p className="font-bold text-[#073653]">{n.title || n.message}</p>
                          {n.description && <p className="text-[11px] text-[#64839A] mt-0.5">{n.description}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Seller Profile Pill with Elevated Dropdown Stacking (Section 3 B) */}
            <div ref={profileDropdownRef} className="relative z-50">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="bg-white/90 backdrop-blur-sm border border-[#BFEBDD]/70 pl-1.5 pr-3 py-1 rounded-full shadow-sm flex items-center gap-2.5 hover:bg-white transition cursor-pointer min-h-[40px]"
              >
                <div className="w-8 h-8 rounded-full bg-[#FFE0C7] text-[#073653] font-black flex items-center justify-center text-xs border border-[#FFE0C7] shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div className="text-left text-xs pr-1 hidden sm:block">
                  <p className="font-extrabold text-[#073653] leading-tight truncate max-w-[110px]">{user?.name || 'Simran Singh'}</p>
                  <p className="text-[10px] text-[#64839A] font-medium leading-tight">Canteen Admin</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#64839A]" />
              </button>

              {/* Profile Dropdown - Solid background, high z-index, shadow */}
              {showProfileDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-[#BFEBDD] p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-2 pb-3 border-b border-[#DFF3E8]">
                    <p className="text-xs font-black text-[#073653]">{user?.name}</p>
                    <p className="text-[11px] font-bold text-[#64839A] mt-0.5">{user?.username || user?.email}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#DFF3E8] text-[#073653] uppercase">
                      Canteen Admin
                    </span>
                  </div>
                  {onLogout && (
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition flex items-center gap-2 cursor-pointer"
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
        </header>

        {/* Global Feedback Banners */}
        {portalError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{portalError}</span>
            </div>
            <button onClick={clearMessages} className="text-rose-500 hover:text-rose-700 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {portalSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{portalSuccess}</span>
            </div>
            <button onClick={clearMessages} className="text-emerald-600 hover:text-emerald-800 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SKELETON LOADING STATE */}
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-28 bg-slate-200/70 rounded-2xl w-full" />
            <div className="h-44 bg-slate-200/70 rounded-2xl w-full" />
            <div className="h-44 bg-slate-200/70 rounded-2xl w-full" />
          </div>
        ) : (
          <>
            {/* ========================================================= */}
            {/* 0. CANTEEN DASHBOARD SECTION (Section 2 - Overview) */}
            {/* ========================================================= */}
            {tab === 'DASHBOARD' && (
              <div className="space-y-6">
                <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-[#BFEBDD]/70 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#BFEBDD]/50">
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#DFF3E8] text-[#073653] uppercase tracking-wider mb-2">
                        Canteen Operations Overview
                      </span>
                      <h2 className="text-2xl font-black text-[#073653] tracking-tight">{canteenDisplayName} Dashboard</h2>
                      <p className="text-xs text-[#64839A] font-medium mt-1">
                        Real-time operations summary for today's orders, prep batches, and menu availability.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTab('MENU')}
                        className="px-4 py-2.5 rounded-xl bg-[#00B894] hover:bg-[#00a382] text-white text-xs font-black shadow-sm transition flex items-center gap-2 min-h-[42px]"
                      >
                        <Utensils className="w-4 h-4" />
                        <span>Manage Menu</span>
                      </button>
                      <button
                        onClick={() => setTab('ORDERS')}
                        className="px-4 py-2.5 rounded-xl bg-[#073653] hover:bg-[#073653]/90 text-white text-xs font-black shadow-sm transition flex items-center gap-2 min-h-[42px]"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>View Orders</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    <div
                      onClick={() => setTab('ORDERS')}
                      className="bg-[#FFFDF9] p-4.5 rounded-2xl border border-[#F2ECE4] shadow-sm hover:shadow-md transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#64839A]">Incoming Orders</span>
                        <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                          <ShoppingBag className="w-4 h-4" />
                        </span>
                      </div>
                      <p className="text-2xl font-black text-[#073653] mt-2">{incomingRequestedOrders.length}</p>
                      <p className="text-[11px] text-[#64839A] mt-1">Awaiting kitchen review</p>
                    </div>

                    <div
                      onClick={() => setTab('PREPARATION')}
                      className="bg-[#FFFDF9] p-4.5 rounded-2xl border border-[#F2ECE4] shadow-sm hover:shadow-md transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#64839A]">In Preparation</span>
                        <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                          <ChefHat className="w-4 h-4" />
                        </span>
                      </div>
                      <p className="text-2xl font-black text-[#073653] mt-2">{batchOrdersMap.length}</p>
                      <p className="text-[11px] text-[#64839A] mt-1">Active prep batches</p>
                    </div>

                    <div
                      onClick={() => setTab('PICKUP')}
                      className="bg-[#FFFDF9] p-4.5 rounded-2xl border border-[#F2ECE4] shadow-sm hover:shadow-md transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#64839A]">Ready for Pickup</span>
                        <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                          <QrCode className="w-4 h-4" />
                        </span>
                      </div>
                      <p className="text-2xl font-black text-[#073653] mt-2">{readyOrders.length}</p>
                      <p className="text-[11px] text-[#64839A] mt-1">Awaiting customer collection</p>
                    </div>

                    <div
                      onClick={() => setTab('MENU')}
                      className="bg-[#FFFDF9] p-4.5 rounded-2xl border border-[#F2ECE4] shadow-sm hover:shadow-md transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#64839A]">Active Menu Items</span>
                        <span className="w-8 h-8 rounded-xl bg-[#DFF3E8] text-[#00B894] flex items-center justify-center font-bold">
                          <Utensils className="w-4 h-4" />
                        </span>
                      </div>
                      <p className="text-2xl font-black text-[#073653] mt-2">{activeMenuItems.length}</p>
                      <p className="text-[11px] text-[#64839A] mt-1">{todaysMenuItems.length} in Today's Menu</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 1. ORDERS SECTION (Uncluttered List View & Card View) */}
            {/* ========================================================= */}
            {tab === 'ORDERS' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-text-primary">Order Management</h2>
                    <p className="text-xs text-text-secondary">
                      Incoming requests, active production, and complete seller order history.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Mode Switcher (List vs Card) */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setViewMode('LIST')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition min-h-[36px] flex items-center gap-1.5 ${
                          viewMode === 'LIST' ? 'bg-white text-primary-blue shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>List View</span>
                      </button>
                      <button
                        onClick={() => setViewMode('CARD')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition min-h-[36px] flex items-center gap-1.5 ${
                          viewMode === 'CARD' ? 'bg-white text-primary-blue shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Card View</span>
                      </button>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setOrdersFilter('REQUESTED')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition min-h-[36px] ${
                          ordersFilter === 'REQUESTED' ? 'bg-white text-primary-blue shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        Incoming Requests ({incomingRequestedOrders.length})
                      </button>
                      <button
                        onClick={() => setOrdersFilter('ACTIVE')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition min-h-[36px] ${
                          ordersFilter === 'ACTIVE' ? 'bg-white text-primary-blue shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        Active ({activeOrders.length})
                      </button>
                      <button
                        onClick={() => setOrdersFilter('ALL')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition min-h-[36px] ${
                          ordersFilter === 'ALL' ? 'bg-white text-primary-blue shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        All ({ordersList.length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Calendar Filter & Daily Collection Summary (Shown in ALL tab) */}
                {ordersFilter === 'ALL' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-primary-blue border border-blue-100">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Order History Calendar</h4>
                          <p className="text-[11px] text-slate-500 font-medium">Asia/Kolkata (IST) Timezone Date Filter</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                          <button
                            onClick={() => handleDatePresetChange('TODAY')}
                            className={`px-3 py-1.5 rounded-lg transition min-h-[32px] ${dateFilterPreset === 'TODAY' ? 'bg-white text-primary-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Today
                          </button>
                          <button
                            onClick={() => handleDatePresetChange('YESTERDAY')}
                            className={`px-3 py-1.5 rounded-lg transition min-h-[32px] ${dateFilterPreset === 'YESTERDAY' ? 'bg-white text-primary-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Yesterday
                          </button>
                          <button
                            onClick={() => handleDatePresetChange('LAST_7_DAYS')}
                            className={`px-3 py-1.5 rounded-lg transition min-h-[32px] ${dateFilterPreset === 'LAST_7_DAYS' ? 'bg-white text-primary-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Last 7 Days
                          </button>
                          <button
                            onClick={() => handleDatePresetChange('THIS_MONTH')}
                            className={`px-3 py-1.5 rounded-lg transition min-h-[32px] ${dateFilterPreset === 'THIS_MONTH' ? 'bg-white text-primary-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            This Month
                          </button>
                          <button
                            onClick={() => handleDatePresetChange('CUSTOM')}
                            className={`px-3 py-1.5 rounded-lg transition min-h-[32px] ${dateFilterPreset === 'CUSTOM' ? 'bg-white text-primary-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Custom
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <input
                            type="date"
                            value={startDateStr}
                            onChange={(e) => {
                              setDateFilterPreset('CUSTOM');
                              setStartDateStr(e.target.value);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
                          />
                          <span className="text-slate-400 font-mono text-[11px]">to</span>
                          <input
                            type="date"
                            value={endDateStr}
                            onChange={(e) => {
                              setDateFilterPreset('CUSTOM');
                              setEndDateStr(e.target.value);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Daily Order & Collection Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Orders</span>
                        <span className="text-xl font-black text-slate-900 mt-1 block">{summaryData.totalOrders}</span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Orders Collected</span>
                        <span className="text-xl font-black text-emerald-600 mt-1 block">{summaryData.ordersCollected}</span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Paid Revenue</span>
                        <span className="text-xl font-black text-blue-700 mt-1 block">₹{parseFloat(summaryData.paidRevenue || '0').toFixed(2)}</span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Pending Payments</span>
                        <span className="text-xl font-black text-amber-600 mt-1 block">{summaryData.pendingPaymentsCount}</span>
                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">₹{parseFloat(summaryData.pendingPaymentAmount || '0').toFixed(2)} (Pending)</span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Cancelled / Rejected</span>
                        <span className="text-xs font-black text-red-600 mt-2 block">
                          Canc: {summaryData.cancelledCount} | Rej: {summaryData.rejectedCount}
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Collected Order Value</span>
                        <span className="text-xl font-black text-teal-700 mt-1 block">₹{parseFloat(summaryData.collectedOrderValue || '0').toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* LIST VIEW (Default uncluttered table layout) */}
                {/* ========================================================= */}
                {viewMode === 'LIST' ? (
                  <div>
                    {((ordersFilter === 'REQUESTED' ? incomingRequestedOrders : ordersFilter === 'ACTIVE' ? activeOrders : ordersList).length === 0) ? (
                      <div className="bg-surface rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                          <Inbox className="w-8 h-8" />
                        </div>
                        <h3 className="text-sm font-extrabold text-text-primary">
                          {ordersFilter === 'REQUESTED' ? 'No incoming requests.' : 'No orders in this category.'}
                        </h3>
                        <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                          {ordersFilter === 'REQUESTED'
                            ? 'New customer orders waiting for acceptance will appear here.'
                            : 'Orders belonging to this seller workspace will be listed here.'}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase text-[10px] font-black tracking-wider">
                                <th className="py-3.5 px-4">Order ID</th>
                                <th className="py-3.5 px-4">Customer & Phone</th>
                                <th className="py-3.5 px-4">Requested Pickup</th>
                                <th className="py-3.5 px-4">Items Summary</th>
                                <th className="py-3.5 px-4">Total</th>
                                <th className="py-3.5 px-4">Payment</th>
                                <th className="py-3.5 px-4">Order Status</th>
                                <th className="py-3.5 px-4">Created</th>
                                <th className="py-3.5 px-4 text-right">Actions / Details</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(ordersFilter === 'REQUESTED' ? incomingRequestedOrders : ordersFilter === 'ACTIVE' ? activeOrders : ordersList).map(ord => {
                                const isRequested = ord.status === 'REQUESTED';
                                const exactTime12 = format12Time(ord.exactPickupTime);
                                const isAccepting = actionLoading[ord.id] === 'ACCEPTING';
                                const isRejecting = actionLoading[ord.id] === 'REJECTING';
                                const isCancelling = actionLoading[ord.id] === 'CANCELLING';
                                const isUnpaidPending = ord.paymentStatus !== 'PAID' && ['REQUESTED', 'ACCEPTED', 'AWAITING_PAYMENT', 'PAYMENT_PENDING', 'TIME_CHANGE_PROPOSED'].includes(ord.status);

                                const itemsSummaryText = ord.items.map(i => `${i.quantity}× ${i.itemName}`).join(', ');

                                return (
                                  <tr
                                    key={ord.id}
                                    onClick={() => openOrderDetailModal(ord)}
                                    className="hover:bg-blue-50/30 transition cursor-pointer"
                                  >
                                    <td className="py-4 px-4 font-mono font-black text-deep-blue whitespace-nowrap">
                                      #{ord.orderNumber}
                                    </td>
                                    <td className="py-4 px-4">
                                      <div className="font-extrabold text-slate-900">{ord.customerName}</div>
                                      {ord.customerPhone && ord.customerPhone !== '--' && (
                                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                          <Phone className="w-3 h-3" /> {ord.customerPhone}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-4 px-4 whitespace-nowrap">
                                      <div className="font-bold text-deep-blue flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-primary-blue" />
                                        {exactTime12}
                                      </div>
                                      {ord.sellerSuggestedTime && ord.timeNegotiationStatus === 'SUGGESTED_BY_SELLER' && (
                                        <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                                          Proposed: {formatPickupTimeDisplay(ord.sellerSuggestedTime)}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-4 px-4 text-slate-700 max-w-xs truncate" title={itemsSummaryText}>
                                      {itemsSummaryText}
                                    </td>
                                    <td className="py-4 px-4 font-mono font-black text-slate-900 whitespace-nowrap">
                                      ₹{parseFloat(ord.totalAmount).toFixed(2)}
                                    </td>
                                    <td className="py-4 px-4 whitespace-nowrap">
                                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                        ord.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                                        ord.paymentStatus === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                        ord.paymentStatus === 'NOT_DUE' ? 'bg-slate-100 text-slate-600' :
                                        'bg-rose-100 text-rose-800'
                                      }`}>
                                        {ord.paymentStatus}
                                      </span>
                                    </td>
                                    <td className="py-4 px-4 whitespace-nowrap">
                                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                        ord.status === 'CANCELLED' ? 'bg-red-100 text-red-800 border border-red-200' :
                                        ord.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                        ord.status === 'REQUESTED' ? 'bg-amber-100 text-amber-800' :
                                        ord.status === 'TIME_CHANGE_PROPOSED' ? 'bg-purple-100 text-purple-800' :
                                        ord.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                                        ord.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                                        ord.status === 'PREPARING' ? 'bg-indigo-100 text-indigo-800' :
                                        ord.status === 'READY_FOR_PICKUP' || ord.status === 'READY' ? 'bg-teal-100 text-teal-800' :
                                        ord.status === 'COLLECTED' ? 'bg-slate-100 text-slate-600' :
                                        'bg-rose-100 text-rose-800'
                                      }`}>
                                        {ord.status === 'CANCELLED' ? 'CANCELLED BY SELLER' :
                                         ord.status === 'REJECTED' ? 'REJECTED BY SELLER' :
                                         ord.status}
                                      </span>
                                    </td>
                                    <td className="py-4 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                      {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="py-4 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                      <div className="flex items-center justify-end gap-1.5">
                                        {isRequested ? (
                                          <>
                                            <button
                                              onClick={() => handleAcceptOrder(ord.id)}
                                              disabled={isAccepting || isRejecting || isCancelling}
                                              className="px-2.5 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50 flex items-center gap-1 min-h-[32px]"
                                            >
                                              {isAccepting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Accept'}
                                            </button>
                                            <button
                                              onClick={() => openSuggestModal(ord)}
                                              disabled={isAccepting || isRejecting || isCancelling}
                                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 transition min-h-[32px]"
                                            >
                                              Time
                                            </button>
                                            <button
                                              onClick={() => {
                                                setRejectOrderId(ord.id);
                                                setRejectReason('Kitchen busy at requested time');
                                              }}
                                              disabled={isAccepting || isRejecting || isCancelling}
                                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition min-h-[32px]"
                                            >
                                              Reject
                                            </button>
                                          </>
                                        ) : isUnpaidPending ? (
                                          <button
                                            onClick={() => {
                                              setCancelOrderId(ord.id);
                                              setCancelPresetReason('Customer did not pay within time limit');
                                              setCancelCustomReason('');
                                            }}
                                            disabled={isCancelling}
                                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition min-h-[32px] flex items-center gap-1"
                                          >
                                            {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cancel Unpaid'}
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => openOrderDetailModal(ord)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200 transition min-h-[32px]"
                                          >
                                            View Ticket
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Summary Footer for ALL tab */}
                        {ordersFilter === 'ALL' && summaryData && (
                          <div className="p-4 bg-slate-900 text-white border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                            <div>
                              <span className="font-extrabold uppercase tracking-wider text-slate-400 text-[10px] block">Filter Period Summary ({startDateStr} to {endDateStr})</span>
                              <span className="text-sm font-bold text-white">{summaryData.totalOrders} total orders listed</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-6">
                              <div>
                                <span className="text-slate-400 text-[10px] font-bold block">Verified Payments Collected</span>
                                <span className="text-sm font-black text-emerald-400">₹{parseFloat(summaryData.paidRevenue || '0').toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-bold block">Collected Order Value</span>
                                <span className="text-sm font-black text-teal-300">₹{parseFloat(summaryData.collectedOrderValue || '0').toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] font-bold block">Unpaid / Pending Amount (Not Revenue)</span>
                                <span className="text-sm font-black text-amber-400">₹{parseFloat(summaryData.pendingPaymentAmount || '0').toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ========================================================= */
                  /* CARD VIEW (15-min batch grouped card grid) */
                  /* ========================================================= */
                  <div>
                    {batchGroups.length === 0 ? (
                      <div className="bg-surface rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                          <Inbox className="w-8 h-8" />
                        </div>
                        <h3 className="text-sm font-extrabold text-text-primary">
                          {ordersFilter === 'REQUESTED' ? 'No incoming requests.' : 'No orders yet in this workspace.'}
                        </h3>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {batchGroups.map(grp => {
                          const expanded = isBatchExpanded(grp.batchKey);
                          const aggregateSummary = Object.entries(grp.aggregateItems)
                            .map(([name, qty]) => `${qty}× ${name}`)
                            .join(', ');

                          return (
                            <div
                              key={grp.batchKey}
                              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition"
                            >
                              {/* Accordion / Batch Header */}
                              <div
                                onClick={() => toggleBatchAccordion(grp.batchKey)}
                                className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-white flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition select-none border-b border-slate-100"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-deep-blue text-white flex items-center justify-center font-bold shadow-soft shrink-0">
                                    <Clock className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="text-sm font-black text-text-primary">{grp.label}</h3>
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-deep-blue">
                                        {grp.orders.length} order{grp.orders.length !== 1 ? 's' : ''}
                                      </span>
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                                        Capacity: {grp.reservedCount}/{grp.capacity}
                                      </span>
                                      {grp.pendingCount > 0 && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                                          {grp.pendingCount} Pending Request{grp.pendingCount !== 1 ? 's' : ''}
                                        </span>
                                      )}
                                    </div>
                                    {aggregateSummary && (
                                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                                        <span className="font-bold text-slate-700">Kitchen Prep Totals:</span> {aggregateSummary}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                                  <span className="text-[11px] font-bold text-slate-400">
                                    {expanded ? 'Click to collapse' : 'Click to expand'}
                                  </span>
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Order Tickets Grid */}
                              {expanded && (
                                <div className="p-4 sm:p-5 bg-slate-50/40">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {grp.orders.map(order => {
                                      const isRequested = order.status === 'REQUESTED';
                                      const exactTime12 = format12Time(order.exactPickupTime);
                                      const isAccepting = actionLoading[order.id] === 'ACCEPTING';
                                      const isRejecting = actionLoading[order.id] === 'REJECTING';

                                      return (
                                        <div
                                          key={order.id}
                                          onClick={() => openOrderDetailModal(order)}
                                          className="bg-white rounded-2xl border-2 border-slate-200/80 p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 transition cursor-pointer"
                                        >
                                          <div>
                                            {/* Card Top Row */}
                                            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                                              <div>
                                                <span className="font-mono text-xs font-black text-deep-blue bg-slate-100 px-2 py-0.5 rounded">
                                                  #{order.orderNumber}
                                                </span>
                                                <h4 className="text-xs font-black text-text-primary mt-1.5">{order.customerName}</h4>
                                                {order.customerPhone && (
                                                  <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <Phone className="w-3 h-3" /> {order.customerPhone}
                                                  </p>
                                                )}
                                              </div>
                                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                                                order.status === 'REQUESTED' ? 'bg-amber-100 text-amber-800' :
                                                order.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                                                order.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                                                order.status === 'PREPARING' ? 'bg-purple-100 text-purple-800' :
                                                order.status === 'READY' ? 'bg-teal-100 text-teal-800' :
                                                order.status === 'COLLECTED' ? 'bg-slate-100 text-slate-600' :
                                                'bg-rose-100 text-rose-800'
                                              }`}>
                                                {order.status}
                                              </span>
                                            </div>

                                            {/* Exact Pickup Time Pill */}
                                            <div className="my-2.5 p-2 bg-blue-50/70 rounded-xl border border-blue-100/80 flex items-center justify-between text-xs">
                                              <span className="text-[10px] text-slate-500 font-bold uppercase">Requested Pickup:</span>
                                              <span className="font-black text-deep-blue flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5 text-primary-blue" />
                                                {exactTime12}
                                              </span>
                                            </div>

                                            {order.sellerSuggestedTime && order.timeNegotiationStatus === 'SUGGESTED_BY_SELLER' && (
                                              <div className="mb-2.5 p-2 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs">
                                                <span className="text-[10px] text-amber-800 font-bold uppercase">Proposed by you:</span>
                                                <span className="font-black text-amber-900 flex items-center gap-1">
                                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                  {formatPickupTimeDisplay(order.sellerSuggestedTime)}
                                                </span>
                                              </div>
                                            )}

                                            {/* Items list */}
                                            <div className="space-y-1 py-1 text-xs">
                                              {order.items.map((it, idx) => (
                                                <div key={idx} className="flex justify-between text-slate-700">
                                                  <span>{it.quantity}× {it.itemName}</span>
                                                  <span className="font-mono text-slate-500">₹{parseFloat(it.subtotal).toFixed(2)}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Total and Actions */}
                                          <div className="mt-3 pt-3 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-between items-center text-xs font-black mb-3">
                                              <span className="text-slate-400 uppercase text-[10px]">Order Total:</span>
                                              <span className="text-deep-blue text-sm">₹{parseFloat(order.totalAmount).toFixed(2)}</span>
                                            </div>

                                            {isRequested ? (
                                              <div className="grid grid-cols-3 gap-1.5">
                                                <button
                                                  onClick={() => {
                                                    setRejectOrderId(order.id);
                                                    setRejectReason('Kitchen busy at requested time');
                                                  }}
                                                  disabled={isAccepting || isRejecting}
                                                  className="py-2 px-1 rounded-xl text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition min-h-[44px] disabled:opacity-50 flex items-center justify-center text-center"
                                                >
                                                  Reject
                                                </button>
                                                <button
                                                  onClick={() => openSuggestModal(order)}
                                                  disabled={isAccepting || isRejecting}
                                                  className="py-2 px-1 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 transition min-h-[44px] disabled:opacity-50 flex items-center justify-center text-center leading-tight"
                                                >
                                                  {order.sellerSuggestedTime ? 'Change Time' : 'Suggest Time'}
                                                </button>
                                                <button
                                                  onClick={() => handleAcceptOrder(order.id)}
                                                  disabled={isAccepting || isRejecting}
                                                  className="py-2 px-1 rounded-xl text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft transition min-h-[44px] disabled:opacity-50 flex items-center justify-center gap-1"
                                                >
                                                  {isAccepting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Accept'}
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="text-[11px] font-bold text-slate-500 text-center py-1">
                                                Payment: <span className="text-slate-800 uppercase">{order.paymentStatus}</span>
                                              </div>
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
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* 2. PREPARATION SECTION (15-min Batch Containers) */}
            {/* ========================================================= */}
            {/* ========================================================= */}
            {/* 2. PREPARATION SECTION (15-min Batch Containers - 4 Views) */}
            {/* ========================================================= */}
            {tab === 'PREPARATION' && (
              <div className="space-y-6">
                {/* Header with Title and Date Selector Dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-extrabold text-[#073653]">Kitchen Preparation Batches</h2>
                    <p className="text-xs text-[#64839A] mt-0.5">
                      Continuous 15-minute kitchen production containers with aggregated item prep totals.
                    </p>
                  </div>

                  {/* Date Selector Dropdown */}
                  <div ref={prepDatePickerRef} className="relative self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setShowPrepDatePicker(prev => !prev)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black bg-white/90 hover:bg-white text-[#073653] border border-slate-200/90 shadow-soft transition cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-[#00B894]" />
                      <span>{formatPrepDisplayDate(prepDate)}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                          showPrepDatePicker ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {showPrepDatePicker && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
                          Select Preparation Date
                        </div>
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setPrepDate(getTodayISTString());
                              setShowPrepDatePicker(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                              prepDate === getTodayISTString()
                                ? 'bg-[#E6F9F4] text-[#00B894] font-black'
                                : 'text-[#073653] hover:bg-slate-50'
                            }`}
                          >
                            <span>Today</span>
                            <span className="text-[11px] text-slate-400">
                              {formatPrepDisplayDate(getTodayISTString())}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPrepDate(getRelativeISTDateString(-1));
                              setShowPrepDatePicker(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                              prepDate === getRelativeISTDateString(-1)
                                ? 'bg-[#E6F9F4] text-[#00B894] font-black'
                                : 'text-[#073653] hover:bg-slate-50'
                            }`}
                          >
                            <span>Yesterday</span>
                            <span className="text-[11px] text-slate-400">
                              {formatPrepDisplayDate(getRelativeISTDateString(-1))}
                            </span>
                          </button>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <label className="block text-[11px] font-bold text-slate-500 mb-1.5 px-1">
                            Pick Custom Date
                          </label>
                          <input
                            type="date"
                            value={prepDate}
                            max={getTodayISTString()}
                            onChange={(e) => {
                              if (e.target.value) {
                                setPrepDate(e.target.value);
                                setShowPrepDatePicker(false);
                              }
                            }}
                            className="w-full px-3 py-1.5 text-xs font-bold text-[#073653] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Filter Tabs & View Mode Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* 4 Filter Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setPrepTab('ALL')}
                      className={`px-4 py-2 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                        prepTab === 'ALL'
                          ? 'bg-[#00B894] text-white font-black shadow-soft'
                          : 'bg-white/80 hover:bg-white text-slate-700 font-bold border border-slate-200/80'
                      }`}
                    >
                      All Batches ({prepTabCounts.all})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrepTab('PENDING')}
                      className={`px-4 py-2 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                        prepTab === 'PENDING'
                          ? 'bg-[#00B894] text-white font-black shadow-soft'
                          : 'bg-white/80 hover:bg-white text-slate-700 font-bold border border-slate-200/80'
                      }`}
                    >
                      Pending ({prepTabCounts.pending})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrepTab('PREPARING')}
                      className={`px-4 py-2 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                        prepTab === 'PREPARING'
                          ? 'bg-[#00B894] text-white font-black shadow-soft'
                          : 'bg-white/80 hover:bg-white text-slate-700 font-bold border border-slate-200/80'
                      }`}
                    >
                      In Preparation ({prepTabCounts.preparing})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrepTab('READY')}
                      className={`px-4 py-2 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                        prepTab === 'READY'
                          ? 'bg-[#00B894] text-white font-black shadow-soft'
                          : 'bg-white/80 hover:bg-white text-slate-700 font-bold border border-slate-200/80'
                      }`}
                    >
                      Ready ({prepTabCounts.ready})
                    </button>
                  </div>

                  {/* View Mode Toggle: Card View / List View */}
                  <div className="flex items-center self-end sm:self-auto bg-white/80 border border-slate-200/80 rounded-xl p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setPrepViewMode('CARD')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        prepViewMode === 'CARD'
                          ? 'bg-[#00B894] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-[#073653]'
                      }`}
                      title="Card View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Card View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrepViewMode('LIST')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        prepViewMode === 'LIST'
                          ? 'bg-[#00B894] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-[#073653]'
                      }`}
                      title="List View"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>List View</span>
                    </button>
                  </div>
                </div>

                {/* Horizontal Batch Quick Slider Carousel (Tabs: All Batches, In Preparation, Ready) */}
                {prepBatchGroups.length > 0 && (
                  <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 p-3 shadow-2xs">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#073653] flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-[#00B894]" />
                        Active Kitchen Batches
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('prep-batch-carousel');
                            if (el) el.scrollBy({ left: -220, behavior: 'smooth' });
                          }}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 shadow-2xs transition cursor-pointer"
                          title="Scroll left"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('prep-batch-carousel');
                            if (el) el.scrollBy({ left: 220, behavior: 'smooth' });
                          }}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 shadow-2xs transition cursor-pointer"
                          title="Scroll right"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div
                      id="prep-batch-carousel"
                      className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none scroll-smooth"
                    >
                      {prepBatchGroups.map((grp) => {
                        const isSelected = selectedCarouselBatchId === grp.batchKey;
                        return (
                          <div
                            key={grp.batchKey}
                            onClick={() => {
                              setSelectedCarouselBatchId(isSelected ? null : grp.batchKey);
                              setExpandedPrepBatches(prev => ({ ...prev, [grp.batchKey]: true }));
                            }}
                            className={`shrink-0 w-60 p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-2 border-[#00B894] bg-[#E6F9F4]/70 shadow-soft'
                                : 'border-slate-200/90 bg-white hover:border-[#00B894]/40 hover:shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-[#073653] truncate">{grp.batchLabel}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E6F9F4] text-[#00B894]">
                                {grp.orders.length} Orders
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500 font-medium truncate">
                              {Object.entries(grp.aggregateItems).map(([name, qty]) => `${name} (${qty})`).join('  ') || 'No items'}
                            </div>
                            <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
                              <span>Capacity: {grp.orders.length}/{grp.capacity}</span>
                              <span
                                className={
                                  grp.status === 'READY'
                                    ? 'text-emerald-600 font-extrabold'
                                    : grp.status === 'PREPARING'
                                    ? 'text-blue-600 font-extrabold'
                                    : 'text-amber-600 font-extrabold'
                                }
                              >
                                {grp.status === 'READY' ? 'Ready' : grp.status === 'PREPARING' ? 'Preparing' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notice for Previous Date on Pending / In Preparation */}
                {!isPrepDateToday && (prepTab === 'PENDING' || prepTab === 'PREPARING') && (
                  <div className="bg-white/80 backdrop-blur-md rounded-3xl p-10 text-center border border-slate-200/80 shadow-soft">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-extrabold text-[#073653]">
                      No active preparation tickets from previous dates.
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Pending and in-preparation tickets only reflect real-time active kitchen tasks. You can view completed and ready orders for historical dates under &quot;Ready&quot; or &quot;All Batches&quot;.
                    </p>
                    <button
                      type="button"
                      onClick={() => setPrepTab('READY')}
                      className="mt-4 px-4 py-2 bg-[#00B894] text-white text-xs font-bold rounded-xl shadow-soft hover:bg-[#009e7f] transition cursor-pointer"
                    >
                      View Ready & Historical Orders
                    </button>
                  </div>
                )}

                {/* Loading Historical Data */}
                {isLoadingHistorical && (
                  <div className="bg-white/80 rounded-3xl p-12 text-center border border-slate-200/80 shadow-soft">
                    <Loader2 className="w-8 h-8 text-[#00B894] animate-spin mx-auto mb-3" />
                    <p className="text-xs font-bold text-[#073653]">Loading historical preparation batches...</p>
                  </div>
                )}

                {/* Empty State when no batches in current tab */}
                {!isLoadingHistorical &&
                  prepBatchGroups.length === 0 &&
                  !(!isPrepDateToday && (prepTab === 'PENDING' || prepTab === 'PREPARING')) && (
                    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                        <ChefHat className="w-8 h-8 text-[#00B894]" />
                      </div>
                      <h3 className="text-sm font-extrabold text-[#073653]">No orders in this preparation view.</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        {prepTab === 'PENDING'
                          ? 'Orders confirmed by customers will appear here ready to begin preparation.'
                          : prepTab === 'PREPARING'
                          ? 'Orders currently being prepared in the kitchen will show up here.'
                          : prepTab === 'READY'
                          ? 'Orders that are ready for customer pickup with verification codes will appear here.'
                          : 'Orders for this date will be grouped into 15-minute preparation containers.'}
                      </p>
                    </div>
                  )}

                {/* Batch Groups Accordions */}
                {!isLoadingHistorical && prepBatchGroups.length > 0 && (
                  <div className="space-y-5">
                    {prepBatchGroups.map((grp, idx) => {
                      const isExpanded = isPrepBatchExpanded(grp.batchKey);
                      const batchColors = [
                        'bg-[#F59E0B] text-white',
                        'bg-[#3B82F6] text-white',
                        'bg-[#10B981] text-white',
                        'bg-[#EF4444] text-white',
                        'bg-[#64748B] text-white',
                      ];
                      const colorClass = batchColors[idx % batchColors.length];
                      const isBatchStarting = actionLoading[grp.batchKey] === 'STARTING';
                      const isBatchMarkingReady = actionLoading[grp.batchKey] === 'MARKING_BATCH_READY';

                      const aggregateString = Object.entries(grp.aggregateItems)
                        .map(([itemName, qty]) => `${itemName} (${qty})`)
                        .join('    ');

                      return (
                        <div
                          key={grp.batchKey}
                          className={`bg-white/90 backdrop-blur-md rounded-3xl border transition-all duration-200 overflow-hidden shadow-soft ${
                            selectedCarouselBatchId === grp.batchKey
                              ? 'border-2 border-[#00B894] ring-2 ring-[#00B894]/20'
                              : 'border-slate-200/90 hover:border-slate-300'
                          }`}
                        >
                          {/* Batch Header Bar */}
                          <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/50 to-white">
                            {/* Left: Clock Icon, Time Slot & Orders Count, Aggregate Item Preview */}
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={`w-11 h-11 rounded-2xl ${colorClass} flex items-center justify-center font-bold shadow-soft shrink-0`}
                              >
                                <Clock className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-black text-[#073653] tracking-tight">
                                    {grp.batchLabel}
                                  </span>
                                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                                    {grp.orders.length} Order{grp.orders.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                {aggregateString && (
                                  <p className="text-xs font-semibold text-slate-500 mt-1 truncate max-w-xl">
                                    {aggregateString}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right: Capacity Badge, Status Pill, Batch Actions, View All & Chevron */}
                            <div className="flex items-center flex-wrap gap-2.5 self-end lg:self-auto shrink-0">
                              <div className="px-3 py-1 rounded-xl bg-[#E6F9F4] text-[#00B894] font-black text-xs border border-[#00B894]/20">
                                Capacity: {grp.orders.length}/{grp.capacity}
                              </div>

                              {grp.pendingCount > 0 && (
                                <div className="px-3 py-1 rounded-xl bg-amber-50 text-amber-700 font-black text-xs border border-amber-200">
                                  {grp.pendingCount} Pending
                                </div>
                              )}
                              {grp.preparingCount > 0 && (
                                <div className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 font-black text-xs border border-blue-200">
                                  {grp.preparingCount} In Prep
                                </div>
                              )}
                              {grp.readyCount > 0 && (
                                <div className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-black text-xs border border-emerald-200">
                                  {grp.readyCount} Ready
                                </div>
                              )}

                              {/* Batch level actions */}
                              {grp.pendingCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleStartBatchPrep(grp.batchKey)}
                                  disabled={isBatchStarting || isBatchMarkingReady}
                                  className="px-3.5 py-2 rounded-xl bg-[#00B894] hover:bg-[#009e7f] text-white text-xs font-bold shadow-soft transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                  {isBatchStarting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                  <span>Start All</span>
                                </button>
                              )}

                              {grp.preparingCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkBatchReady(grp.batchKey)}
                                  disabled={isBatchStarting || isBatchMarkingReady}
                                  className="px-3.5 py-2 rounded-xl bg-[#10B981] hover:bg-emerald-700 text-white text-xs font-bold shadow-soft transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                  {isBatchMarkingReady && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                  <span>Mark Batch Ready</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => togglePrepBatchAccordion(grp.batchKey)}
                                className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[#073653] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <span>{isExpanded ? 'Collapse' : 'View All'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Batch Content */}
                          {isExpanded && (
                            <div className="border-t border-slate-100">
                              {/* Aggregated prep quantities bar */}
                              <div className="p-4 sm:p-5 bg-slate-50/60 border-b border-slate-100">
                                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                                  <Utensils className="w-3.5 h-3.5 text-slate-400" />
                                  Aggregated Items in this Batch:
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(grp.aggregateItems).map(([itemName, qty]) => (
                                    <div
                                      key={itemName}
                                      className="px-3 py-1.5 bg-white rounded-xl border border-slate-200/80 text-xs font-black text-[#073653] flex items-center gap-2 shadow-2xs"
                                    >
                                      <span className="w-5 h-5 rounded-lg bg-[#E6F9F4] text-[#00B894] flex items-center justify-center text-[11px] font-black">
                                        {qty}
                                      </span>
                                      <span>{itemName}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Cards or List Representation */}
                              {prepViewMode === 'CARD' ? (
                                <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                  {grp.orders.map((ord) => {
                                    const isPrepStarting = actionLoading[ord.id] === 'STARTING_PREP';
                                    const isOrderMarkingReady = actionLoading[ord.id] === 'MARKING_READY';
                                    const isOrderCollecting = actionLoading[ord.id] === 'VERIFYING';

                                    return (
                                      <div
                                        key={ord.id}
                                        className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-soft hover:shadow-md transition-all flex flex-col justify-between"
                                      >
                                        <div>
                                          {/* Top Header of Card */}
                                          <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                                            <span className="font-mono font-black text-sm text-[#073653] tracking-wide">
                                              #{ord.orderNumber}
                                            </span>
                                            <div className="flex items-center gap-1 text-[11px] font-bold text-[#00B894] bg-[#E6F9F4] px-2 py-0.5 rounded-full">
                                              <Clock className="w-3 h-3" />
                                              <span>{format12Time(ord.exactPickupTime)}</span>
                                            </div>
                                          </div>

                                          {/* Customer Name */}
                                          <h5 className="text-xs font-bold text-[#073653] mt-2 truncate">
                                            {ord.customerName}
                                          </h5>

                                          {/* Clean Text Items (NO FOOD IMAGES) */}
                                          <div className="mt-2.5 space-y-1 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-xs">
                                            {ord.items.map((it, i) => (
                                              <div key={i} className="flex justify-between items-center text-slate-700">
                                                <span className="font-medium truncate pr-2">{it.itemName}</span>
                                                <span className="font-black text-[#073653] shrink-0">×{it.quantity}</span>
                                              </div>
                                            ))}
                                          </div>

                                          {/* Ready Tab: Prominent 4-digit pickup code */}
                                          {['READY', 'READY_FOR_PICKUP'].includes(ord.status) && (
                                            <div className="my-3 p-2.5 bg-[#E6F9F4] rounded-xl border border-[#00B894]/30 flex flex-col items-center justify-center">
                                              <span className="text-[10px] font-black uppercase tracking-wider text-[#00B894]">
                                                Pickup Verification Code
                                              </span>
                                              <span className="font-mono text-2xl font-black text-[#073653] tracking-widest mt-0.5">
                                                {ord.pickupCode || '••••'}
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Bottom: Price + Action Button */}
                                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                          <span className="text-sm font-black text-[#073653]">
                                            ₹{parseFloat(ord.totalAmount).toFixed(2)}
                                          </span>

                                          {ord.status === 'CONFIRMED' && (
                                            <button
                                              type="button"
                                              onClick={() => handleStartOrderPrep(ord.id)}
                                              disabled={isPrepStarting}
                                              className="px-3 py-1.5 bg-[#00B894] hover:bg-[#009e7f] text-white text-xs font-bold rounded-xl shadow-soft transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer min-h-[36px]"
                                            >
                                              {isPrepStarting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                              <span>Mark in Preparation</span>
                                            </button>
                                          )}

                                          {ord.status === 'PREPARING' && (
                                            <button
                                              type="button"
                                              onClick={() => handleMarkOrderReady(ord.id)}
                                              disabled={isOrderMarkingReady}
                                              className="px-3 py-1.5 bg-[#10B981] hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-soft transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer min-h-[36px]"
                                            >
                                              {isOrderMarkingReady && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                              <span>Mark Ready</span>
                                            </button>
                                          )}

                                          {['READY', 'READY_FOR_PICKUP'].includes(ord.status) && (
                                            <button
                                              type="button"
                                              onClick={() => handleCollectReadyOrder(ord)}
                                              disabled={isOrderCollecting}
                                              className="px-3 py-1.5 bg-[#00B894] hover:bg-[#009e7f] text-white text-xs font-bold rounded-xl shadow-soft transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer min-h-[36px]"
                                            >
                                              {isOrderCollecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                              <span>Mark as Collected</span>
                                            </button>
                                          )}

                                          {ord.status === 'COLLECTED' && (
                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-1">
                                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                                              <span>Collected</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                /* List View */
                                <div className="p-4 sm:p-5 overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                                        <th className="py-2.5 px-3">Order #</th>
                                        <th className="py-2.5 px-3">Customer</th>
                                        <th className="py-2.5 px-3">Items & Qty</th>
                                        <th className="py-2.5 px-3">Pickup Time</th>
                                        <th className="py-2.5 px-3">Total</th>
                                        {prepTab === 'READY' && <th className="py-2.5 px-3 text-center">Pickup Code</th>}
                                        <th className="py-2.5 px-3 text-right">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {grp.orders.map((ord) => (
                                        <tr key={ord.id} className="hover:bg-slate-50/60 transition">
                                          <td className="py-3 px-3 font-mono font-black text-[#073653]">
                                            #{ord.orderNumber}
                                          </td>
                                          <td className="py-3 px-3 font-bold text-[#073653]">
                                            {ord.customerName}
                                          </td>
                                          <td className="py-3 px-3 text-slate-600">
                                            {ord.items.map(it => `${it.quantity}× ${it.itemName}`).join(', ')}
                                          </td>
                                          <td className="py-3 px-3 font-bold text-[#00B894]">
                                            {format12Time(ord.exactPickupTime)}
                                          </td>
                                          <td className="py-3 px-3 font-black text-[#073653]">
                                            ₹{parseFloat(ord.totalAmount).toFixed(2)}
                                          </td>
                                          {prepTab === 'READY' && (
                                            <td className="py-3 px-3 text-center">
                                              <span className="font-mono font-black text-sm px-2.5 py-1 rounded-lg bg-[#E6F9F4] text-[#073653] tracking-widest border border-[#00B894]/30">
                                                {ord.pickupCode || '••••'}
                                              </span>
                                            </td>
                                          )}
                                          <td className="py-3 px-3 text-right">
                                            {ord.status === 'CONFIRMED' && (
                                              <button
                                                type="button"
                                                onClick={() => handleStartOrderPrep(ord.id)}
                                                className="px-3 py-1.5 bg-[#00B894] hover:bg-[#009e7f] text-white text-xs font-bold rounded-lg shadow-soft transition cursor-pointer"
                                              >
                                                Mark in Preparation
                                              </button>
                                            )}
                                            {ord.status === 'PREPARING' && (
                                              <button
                                                type="button"
                                                onClick={() => handleMarkOrderReady(ord.id)}
                                                className="px-3 py-1.5 bg-[#10B981] hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-soft transition cursor-pointer"
                                              >
                                                Mark Ready
                                              </button>
                                            )}
                                            {['READY', 'READY_FOR_PICKUP'].includes(ord.status) && (
                                              <button
                                                type="button"
                                                onClick={() => handleCollectReadyOrder(ord)}
                                                className="px-3 py-1.5 bg-[#00B894] hover:bg-[#009e7f] text-white text-xs font-bold rounded-lg shadow-soft transition cursor-pointer"
                                              >
                                                Mark as Collected
                                              </button>
                                            )}
                                            {ord.status === 'COLLECTED' && (
                                              <span className="text-xs font-bold text-slate-500">
                                                Collected
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* 3. PICKUP COUNTER SECTION */}
            {/* ========================================================= */}
            {tab === 'PICKUP' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-extrabold text-text-primary">Pickup Counter Verification</h2>
                  <p className="text-xs text-text-secondary">
                    Verify customer 4-character pickup code to hand over orders (READY → COLLECTED).
                  </p>
                </div>

                {/* Counter Verification Card (Aligned & Accessible) */}
                <div className="bg-surface rounded-3xl p-6 border-2 border-primary-blue/30 shadow-md max-w-3xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-blue/10 text-primary-blue flex items-center justify-center shrink-0">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-text-primary">Counter Code Verification</h3>
                      <p className="text-xs text-text-secondary">
                        Enter the 4-character code shown on the customer's phone to release order.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-4">
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Pickup Code:</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={pickupCodeInput}
                        onChange={e => setPickupCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && verifyTargetOrderId && pickupCodeInput.trim()) {
                            handleVerifyPickupCode(verifyTargetOrderId, pickupCodeInput);
                          }
                        }}
                        placeholder="e.g. 29DL"
                        className="w-full px-4 py-3 text-center text-xl font-mono font-black tracking-widest uppercase rounded-2xl border-2 border-slate-200 focus:border-primary-blue focus:outline-none min-h-[48px]"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Select Ready Order:</label>
                      <select
                        value={verifyTargetOrderId || ''}
                        onChange={e => setVerifyTargetOrderId(e.target.value || null)}
                        className="w-full px-3 py-3 rounded-2xl border border-slate-200 text-xs font-bold bg-white focus:outline-none min-h-[48px]"
                      >
                        <option value="">Select Ready Order ({readyOrders.length} ready)...</option>
                        {readyOrders.map(o => (
                          <option key={o.id} value={o.id}>
                            #{o.orderNumber} - {o.customerName} ({format12Time(o.exactPickupTime)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3 sm:self-end">
                      <button
                        onClick={() => {
                          if (!verifyTargetOrderId) {
                            setPortalError('Please select which ready order you are verifying.');
                            return;
                          }
                          handleVerifyPickupCode(verifyTargetOrderId, pickupCodeInput);
                        }}
                        disabled={!pickupCodeInput.trim() || !verifyTargetOrderId || actionLoading[verifyTargetOrderId] === 'VERIFYING'}
                        className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-tactile transition disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-1.5"
                      >
                        {verifyTargetOrderId && actionLoading[verifyTargetOrderId] === 'VERIFYING' && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        <span>Verify & Complete</span>
                      </button>
                    </div>
                  </div>

                  {verifyAttemptsLeft !== null && (
                    <p className="text-xs text-rose-600 font-bold mt-3">
                      ⚠️ Incorrect pickup code. {verifyAttemptsLeft} attempt(s) remaining before security lockout.
                    </p>
                  )}
                </div>

                {/* Ready vs Collected Switcher */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <button
                    onClick={() => setVerifyTab('READY')}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition min-h-[44px] ${
                      verifyTab === 'READY' ? 'bg-primary-blue text-white shadow-tactile' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Ready for Pickup ({readyOrders.length})
                  </button>
                  <button
                    onClick={() => setVerifyTab('COLLECTED')}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition min-h-[44px] ${
                      verifyTab === 'COLLECTED' ? 'bg-primary-blue text-white shadow-tactile' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Collected Today ({collectedOrders.length})
                  </button>
                </div>

                {/* Orders Waiting for Pickup */}
                {verifyTab === 'READY' && (
                  <div>
                    {readyOrders.length === 0 ? (
                      <div className="bg-surface rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                          <CheckSquare className="w-8 h-8" />
                        </div>
                        <h3 className="text-sm font-extrabold text-text-primary">No orders ready for pickup.</h3>
                        <p className="text-xs text-text-secondary mt-1">
                          Orders marked as READY in the Kitchen will appear here waiting for customer arrival.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {readyOrders.map(ord => (
                          <div
                            key={ord.id}
                            className="bg-surface rounded-2xl border-2 border-emerald-200 p-5 shadow-sm flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <span className="font-mono text-xs font-black text-deep-blue">
                                  #{ord.orderNumber}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                                  READY
                                </span>
                              </div>
                              <h4 className="text-xs font-extrabold text-text-primary mt-2.5">{ord.customerName}</h4>
                              <p className="text-[11px] text-slate-500">
                                Exact Pickup: <span className="font-bold text-slate-700">{format12Time(ord.exactPickupTime)}</span>
                              </p>
                              <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                                {ord.items.map((it, idx) => (
                                  <div key={idx}>
                                    {it.quantity}× {it.itemName}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setVerifyTargetOrderId(ord.id);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-tactile transition min-h-[44px]"
                            >
                              Verify Pickup Code
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Collected Orders Tab */}
                {verifyTab === 'COLLECTED' && (
                  <div className="space-y-3">
                    {collectedOrders.length === 0 ? (
                      <div className="bg-surface rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                        <p className="text-xs text-slate-500">No collected orders yet today.</p>
                      </div>
                    ) : (
                      collectedOrders.map(ord => (
                        <div
                          key={ord.id}
                          className="bg-surface rounded-2xl border border-slate-200 p-4 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-black text-slate-800 mr-3">#{ord.orderNumber}</span>
                            <span className="font-bold text-slate-700 mr-3">{ord.customerName}</span>
                            <span className="text-slate-400">
                              {ord.items.map(i => `${i.quantity}× ${i.itemName}`).join(', ')}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-extrabold text-[10px]">
                            COLLECTED
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* 4. MENU SECTION (Dedicated Menu Management - Reference Image 1) */}
            {/* ========================================================= */}
            {tab === 'MENU' && (
              <div className="space-y-5">
                {/* Section Header: Title & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-[#073653] tracking-tight">Menu Management</h2>
                    <p className="text-xs text-[#64839A] font-medium mt-0.5">
                      Add, edit, change price, toggle availability, and configure Today's Menu.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Category Management Dropdown (Requirement 1) */}
                    <div className="relative" ref={categoryDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowCategoryDropdown(prev => !prev)}
                        className="px-3.5 py-2 bg-white/90 hover:bg-white text-[#073653] border border-[#BFEBDD] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm min-h-[42px] cursor-pointer"
                        aria-expanded={showCategoryDropdown}
                        aria-haspopup="true"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#00B894]" />
                        <span>Category</span>
                        <ChevronDown className={`w-3 h-3 text-[#64839A] transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showCategoryDropdown && (
                        <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-[#BFEBDD]/80 p-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              setShowCategoryDropdown(false);
                              setIsAddCategoryOpen(true);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#073653] hover:bg-[#DFF3E8]/60 hover:text-[#0B725C] transition flex items-center gap-2 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#00B894]" />
                            <span>Create New Category</span>
                          </button>
                          <div className="my-1 h-[1px] bg-slate-100" />
                          <button
                            type="button"
                            onClick={() => {
                              setShowCategoryDropdown(false);
                              setDeleteCategorySelectedId(categories[0]?.id || '');
                              setDeleteCategoryError(null);
                              setIsDeleteCategoryOpen(true);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Delete Existing Category</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Add Menu Item Button */}
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        resetItemForm();
                        setIsAddItemOpen(true);
                      }}
                      className="px-4 py-2 bg-[#073653] hover:bg-[#073653]/90 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5 min-h-[42px]"
                    >
                      <Plus className="w-4 h-4 text-[#00B894]" />
                      <span>Add Menu Item</span>
                    </button>
                  </div>
                </div>

                {/* Horizontal Scrollable Category Filter Row */}
                <div className="relative flex items-center">
                  <div
                    ref={categoryScrollRef}
                    className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth w-full pr-10"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {/* All Filter */}
                    <button
                      onClick={() => setMenuFilterCategory('ALL')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap shrink-0 min-h-[36px] ${
                        menuFilterCategory === 'ALL'
                          ? 'bg-[#00B894] text-white shadow-sm'
                          : 'bg-white/85 text-[#073653] border border-[#BFEBDD]/70 hover:bg-white'
                      }`}
                    >
                      All ({activeMenuItems.length})
                    </button>

                    {/* Today's Menu Filter */}
                    <button
                      onClick={() => setMenuFilterCategory('TODAYS')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap shrink-0 min-h-[36px] ${
                        menuFilterCategory === 'TODAYS'
                          ? 'bg-[#00B894] text-white shadow-sm'
                          : 'bg-white/85 text-[#073653] border border-[#BFEBDD]/70 hover:bg-white'
                      }`}
                    >
                      Today's Menu ({todaysMenuItems.length})
                    </button>

                    {/* Dynamic Categories */}
                    {categories.map(cat => {
                      const count = activeMenuItems.filter(m => m.categoryId === cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setMenuFilterCategory(cat.id)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap shrink-0 min-h-[36px] ${
                            menuFilterCategory === cat.id
                              ? 'bg-[#00B894] text-white shadow-sm'
                              : 'bg-white/85 text-[#073653] border border-[#BFEBDD]/70 hover:bg-white'
                          }`}
                        >
                          {cat.name} ({count})
                        </button>
                      );
                    })}

                    {/* Archived Items Filter */}
                    <button
                      onClick={() => setMenuFilterCategory('ARCHIVED')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap shrink-0 min-h-[36px] ${
                        menuFilterCategory === 'ARCHIVED'
                          ? 'bg-[#073653] text-white shadow-sm'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100/70'
                      }`}
                    >
                      Archived ({archivedMenuItems.length})
                    </button>
                  </div>

                  {/* Scroll Right Indicator Button */}
                  <button
                    onClick={() => {
                      if (categoryScrollRef.current) {
                        categoryScrollRef.current.scrollBy({ left: 160, behavior: 'smooth' });
                      }
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-[#BFEBDD] text-[#073653] shadow-sm flex items-center justify-center hover:bg-white transition shrink-0 z-10"
                    aria-label="Scroll categories right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Search Active Notification */}
                {searchQuery.trim() && (
                  <div className="flex items-center justify-between text-xs bg-white/80 p-2 px-3 rounded-xl border border-[#BFEBDD]/60 text-[#64839A]">
                    <span>
                      Search results for <strong className="text-[#073653]">"{searchQuery}"</strong> ({filteredMenuItems.length} items found)
                    </span>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs font-bold text-[#00B894] hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {filteredMenuItems.length === 0 ? (
                  <div className="bg-white/90 rounded-3xl p-12 text-center border border-[#BFEBDD]/70 shadow-sm max-w-lg mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-[#DFF3E8] text-[#00B894] flex items-center justify-center mx-auto mb-3 shadow-inner">
                      <Utensils className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-extrabold text-[#073653]">
                      {menuFilterCategory === 'ARCHIVED'
                        ? 'No archived menu items'
                        : menuFilterCategory === 'TODAYS'
                        ? 'No active items in Today\'s Menu'
                        : searchQuery
                        ? 'No items matching your search'
                        : 'Your menu is empty'}
                    </h3>
                    <p className="text-xs text-[#64839A] mt-1">
                      {menuFilterCategory === 'ARCHIVED'
                        ? 'Archived items preserved from deletion will be listed here for restoration.'
                        : menuFilterCategory === 'TODAYS'
                        ? 'Items marked as in-stock and included in Today\'s Menu will appear here.'
                        : 'Add items or update filters to see them listed in your menu.'}
                    </p>
                    {menuFilterCategory !== 'ARCHIVED' && (
                      <button
                        onClick={() => {
                          setEditingItem(null);
                          resetItemForm();
                          setIsAddItemOpen(true);
                        }}
                        className="mt-6 px-6 py-2.5 bg-[#00B894] hover:bg-[#00a382] text-white rounded-xl text-xs font-black shadow-sm transition inline-flex items-center gap-2 min-h-[42px]"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New Item</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch">
                    {(() => {
                      const renderCard = (item: MenuItem) => {
                        const isAvailUpdating = actionLoading[item.id] === 'UPDATING_AVAIL';
                        const isArchiving = actionLoading[item.id] === 'ARCHIVING';
                        const isRestoring = actionLoading[item.id] === 'RESTORING';
                        const catName = categories.find(c => c.id === item.categoryId)?.name || 'General';

                        return (
                          <div
                            key={item.id}
                            className={`bg-[#FFFDF9] rounded-[24px] p-4.5 sm:p-5 border border-[#F2ECE4] shadow-[0_4px_16px_rgba(7,54,83,0.04)] hover:shadow-[0_8px_24px_rgba(7,54,83,0.08)] transition-all duration-200 flex flex-col justify-between h-full ${
                              item.isArchived
                                ? 'opacity-80 border-slate-200 bg-slate-50/80'
                                : !item.isAvailable
                                ? 'opacity-90 bg-[#FAF8F5]'
                                : ''
                            }`}
                          >
                            <div>
                              {/* Card Top: Category Dot & Label + Price */}
                              <div className="flex items-center justify-between gap-2 pb-2 h-6">
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                    item.isVegetarian ? 'bg-[#00B894]' : 'bg-rose-500'
                                  }`} />
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64839A] truncate">
                                    {catName}
                                  </span>
                                </div>
                                <span className="font-extrabold text-[15px] tracking-tight text-[#0284C7] shrink-0">
                                  {item.price !== null ? `₹${parseFloat(item.price).toFixed(2)}` : 'Price not fixed'}
                                </span>
                              </div>

                              {/* Card Body: Info on Left, Dish Photography on Right */}
                              <div className="flex items-center justify-between gap-3 my-auto py-2">
                                <div className="flex-1 min-w-0 pr-1 flex flex-col justify-between">
                                  <div>
                                    <h3 className="text-[17px] font-black text-[#073653] leading-tight tracking-tight truncate" title={item.name}>
                                      {item.name}
                                    </h3>
                                    <p className="text-xs text-[#8BA3B5] font-medium mt-1">
                                      Daily Order Limit: {item.dailyCapacity || 50}
                                    </p>
                                  </div>

                                  {/* Stock Status & Toggle */}
                                  <div className="mt-3.5">
                                    <span className={`text-xs font-bold block mb-1 ${
                                      item.isAvailable ? 'text-[#073653]' : 'text-slate-400'
                                    }`}>
                                      {item.isAvailable ? 'In Stock' : 'Sold Out'}
                                    </span>

                                    <div className="flex flex-col items-start gap-1">
                                      {/* Availability Toggle Switch */}
                                      <button
                                        type="button"
                                        disabled={item.isArchived || isAvailUpdating || item.price === null}
                                        onClick={() => handleToggleItemAvailability(item.id, item.isAvailable)}
                                        className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 cursor-pointer disabled:cursor-not-allowed ${
                                          item.isAvailable ? 'bg-[#00B894] justify-end' : 'bg-slate-300 justify-start'
                                        }`}
                                        aria-label={`Toggle availability for ${item.name}`}
                                      >
                                        <span className="w-5 h-5 rounded-full bg-white shadow-sm block transition-transform" />
                                      </button>

                                      {/* Active Badge */}
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                          item.isAvailable
                                            ? 'bg-[#DFF7F2] text-[#009E7E]'
                                            : 'bg-slate-100 text-slate-400'
                                        }`}
                                      >
                                        {item.isAvailable ? 'ACTIVE' : 'OFF'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Food Image: Consistent square container with dedicated Image Upload Plus button (Requirement 2) */}
                                <div className="relative shrink-0">
                                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border border-[#F2ECE4] shadow-sm flex items-center justify-center overflow-hidden p-1.5">
                                    <img
                                      src={getItemImage(item)}
                                      alt={item.name}
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80';
                                      }}
                                    />
                                  </div>
                                  {/* Dedicated Image Upload Button: Opens ONLY Image Upload Modal (Requirement 2) */}
                                  <button
                                    type="button"
                                    onClick={() => openImageUploadModal(item)}
                                    title="Upload or change image"
                                    aria-label={`Upload image for ${item.name}`}
                                    className="absolute -top-2.5 right-0 z-10 w-6 h-6 rounded-full bg-white shadow-md border border-slate-100 text-[#073653] flex items-center justify-center hover:scale-105 hover:bg-[#F0FDF4] transition cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5 text-[#073653]" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Card Footer: Peach/Cream Action Bar */}
                            <div className="mt-3 bg-[#FFF7F0] border border-[#FDE8D7] rounded-xl px-3 py-1.5 flex items-center justify-around gap-2">
                              <button
                                type="button"
                                onClick={() => openEditItemModal(item)}
                                className="font-bold text-xs text-[#073653] hover:text-[#00B894] transition flex items-center gap-1.5 py-0.5 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5 text-[#073653]" />
                                <span>Edit</span>
                              </button>

                              <div className="w-[1px] h-3.5 bg-[#FDE8D7]" />

                              {item.isArchived ? (
                                <button
                                  type="button"
                                  disabled={isRestoring}
                                  onClick={() => setConfirmRestoreItem(item)}
                                  className="font-bold text-xs text-[#00B894] hover:text-[#00a382] transition flex items-center gap-1.5 py-0.5 cursor-pointer"
                                >
                                  {isRestoring ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-3.5 h-3.5 text-[#00B894]" />
                                  )}
                                  <span>Restore</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isArchiving}
                                  onClick={() => setConfirmArchiveItem(item)}
                                  className="font-bold text-xs text-[#E53935] hover:text-[#c62828] transition flex items-center gap-1.5 py-0.5 cursor-pointer"
                                >
                                  {isArchiving ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5 text-[#E53935]" />
                                  )}
                                  <span>Archive</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      };

                      return (
                        <>
                          {/* 1. In-Stock Items First (Requirement 4) */}
                          {inStockMenuItems.map(item => renderCard(item))}

                          {/* Subtle Horizontal Divider & Shadow between In-Stock & Out-of-Stock groups (Requirement 4) */}
                          {inStockMenuItems.length > 0 && outOfStockMenuItems.length > 0 && (
                            <div className="col-span-full my-4 py-1 flex items-center gap-3">
                              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#BFEBDD]/80 to-[#BFEBDD]/20 shadow-[0_1px_2px_rgba(7,54,83,0.05)]" />
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64839A] bg-[#F4FAF7] px-3.5 py-1 rounded-full border border-[#BFEBDD]/70 shadow-xs flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                                <span>Out of Stock ({outOfStockMenuItems.length})</span>
                              </span>
                              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#BFEBDD]/80 to-[#BFEBDD]/20 shadow-[0_1px_2px_rgba(7,54,83,0.05)]" />
                            </div>
                          )}

                          {/* 2. Out-of-Stock Items Next (Requirement 4) */}
                          {outOfStockMenuItems.map(item => renderCard(item))}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* 5. ACCOUNT SECTION (Seller Credentials & Sign Out) */}
            {/* ========================================================= */}
            {tab === 'ACCOUNT' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h2 className="text-base font-extrabold text-text-primary">Seller Account & Canteen Setup</h2>
                  <p className="text-xs text-text-secondary">
                    Review your authenticated credentials, assigned canteen, and operating configuration.
                  </p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-deep-blue to-primary-blue text-white font-black text-xl flex items-center justify-center shadow-soft">
                      {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-text-primary">{user?.name}</h3>
                      <p className="text-xs font-mono text-slate-500">{user?.username}</p>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-deep-blue uppercase">
                        Approved Seller
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-semibold">Assigned Canteen</span>
                      <span className="font-extrabold text-slate-800">{canteenDisplayName}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-semibold">Campus</span>
                      <span className="font-extrabold text-slate-800">Indraprastha College for Women</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-semibold">Scheduled Operating Hours</span>
                      <span className="font-extrabold text-slate-800">8:00 AM to 5:00 PM IST (Asia/Kolkata)</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-semibold">Batch Queue Interval</span>
                      <span className="font-extrabold text-slate-800">15-Minute Windows</span>
                    </div>
                  </div>

                  {onLogout && (
                    <div className="pt-4 border-t border-slate-100">
                      <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-rose-50 text-danger hover:bg-rose-100 transition min-h-[44px]"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out of Seller Portal</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: TIME SUGGESTION */}
      {/* ========================================================= */}
      {suggestOrderId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-xl animate-scaleUp">
            <h3 className="text-sm font-black text-text-primary">Suggest Different Pickup Time</h3>
            <p className="text-xs text-text-secondary mt-1">
              Choose an alternative time (8:00 AM to 5:00 PM IST). Customer will review and accept.
            </p>

            <div className="mt-4 space-y-4">
              {/* 3-Part Controlled Time Selector: Hour, Minute, AM/PM */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                  Select Suggested Pickup Time:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Hour Selector */}
                  <div>
                    <label htmlFor="suggest-hour-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Hour
                    </label>
                    <select
                      id="suggest-hour-select"
                      value={suggestHour}
                      onChange={e => setSuggestHour(e.target.value)}
                      className="w-full px-2.5 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-bold bg-white focus:outline-none focus:border-primary-blue min-h-[44px]"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                        <option key={h} value={h.toString()}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Minute Input / Selector */}
                  <div>
                    <label htmlFor="suggest-minute-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Minute
                    </label>
                    <input
                      id="suggest-minute-input"
                      type="number"
                      min={0}
                      max={59}
                      value={suggestMinute}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '') {
                          setSuggestMinute('');
                          return;
                        }
                        const num = Math.max(0, Math.min(59, parseInt(val, 10) || 0));
                        setSuggestMinute(num.toString().padStart(2, '0'));
                      }}
                      onBlur={() => {
                        if (!suggestMinute) setSuggestMinute('00');
                        else setSuggestMinute(suggestMinute.padStart(2, '0'));
                      }}
                      className="w-full px-2.5 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-mono font-bold text-center bg-white focus:outline-none focus:border-primary-blue min-h-[44px]"
                    />
                  </div>

                  {/* AM / PM Toggle */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Period
                    </span>
                    <div className="flex rounded-xl border-2 border-slate-200 overflow-hidden min-h-[44px] bg-slate-100 p-0.5">
                      <button
                        type="button"
                        id="suggest-period-am"
                        onClick={() => setSuggestAmpm('AM')}
                        className={`flex-1 py-1 text-xs font-black rounded-lg transition ${
                          suggestAmpm === 'AM'
                            ? 'bg-primary-blue text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        id="suggest-period-pm"
                        onClick={() => setSuggestAmpm('PM')}
                        className={`flex-1 py-1 text-xs font-black rounded-lg transition ${
                          suggestAmpm === 'PM'
                            ? 'bg-primary-blue text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>

                {/* Minute Quick Presets */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-bold text-slate-400">Presets:</span>
                  {['00', '15', '30', '45', '59'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSuggestMinute(m)}
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border transition ${
                        suggestMinute === m
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      :{m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className={`p-3 rounded-2xl border transition ${
                suggestValidation.valid
                  ? 'bg-blue-50/70 border-blue-200/80'
                  : 'bg-rose-50/80 border-rose-200'
              }`}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-500">Internal Value (API):</span>
                  <span className="font-mono font-black text-deep-blue bg-white px-2 py-0.5 rounded border border-slate-200">
                    {canonicalSuggestTime}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary-blue" />
                    <span className="text-sm font-black text-text-primary">
                      {suggestValidation.displayTime}
                    </span>
                  </div>
                  {suggestBatch && (
                    <span className="text-[11px] font-bold text-primary-blue">
                      Batch: {suggestBatch.displayLabel}
                    </span>
                  )}
                </div>

                {!suggestValidation.valid && (
                  <div className="mt-2 text-[11px] font-bold text-rose-700 flex items-start gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{suggestValidation.error}</span>
                  </div>
                )}
              </div>

              {/* Note to Customer */}
              <div>
                <label htmlFor="suggest-note-input" className="text-[11px] font-bold text-slate-600 block mb-1">
                  Note to Customer (Optional):
                </label>
                <input
                  id="suggest-note-input"
                  type="text"
                  placeholder="e.g. Current slot is busy, this time is ready faster"
                  value={suggestNote}
                  onChange={e => setSuggestNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-primary-blue min-h-[44px]"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSuggestOrderId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                id="send-suggestion-button"
                onClick={handleSuggestTime}
                disabled={!suggestValidation.valid || Boolean(actionLoading[suggestOrderId || ''])}
                className="px-4 py-2 rounded-xl text-xs font-black bg-primary-blue hover:bg-blue-600 text-white shadow-tactile min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {actionLoading[suggestOrderId || ''] && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Suggestion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REJECT ORDER */}
      {/* ========================================================= */}
      {rejectOrderId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-xl animate-scaleUp">
            <h3 className="text-sm font-black text-rose-700">Decline Order Request</h3>
            <p className="text-xs text-text-secondary mt-1">
              Are you sure you want to decline this order? Customer will be notified immediately.
            </p>

            <div className="mt-4">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Reason:</label>
              <select
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none min-h-[44px]"
              >
                <option value="Kitchen busy at requested time">Kitchen busy at requested time</option>
                <option value="Requested ingredients out of stock">Requested ingredients out of stock</option>
                <option value="Canteen closing early">Canteen closing early</option>
                <option value="Other">Other reason</option>
              </select>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectOrderId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectOrder(rejectOrderId)}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-tactile min-h-[44px]"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT MENU ITEM */}
      {/* ========================================================= */}
      {isAddItemOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-xl animate-scaleUp my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-text-primary">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button
                onClick={() => {
                  setIsAddItemOpen(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMenuItem} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lemon Rice + Sambar"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-primary-blue min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.50"
                    disabled={formPriceUnconfirmed}
                    placeholder={formPriceUnconfirmed ? 'Price not fixed' : 'e.g. 50'}
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-primary-blue min-h-[44px] disabled:bg-slate-100"
                  />
                  <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPriceUnconfirmed}
                      onChange={e => {
                        setFormPriceUnconfirmed(e.target.checked);
                        if (e.target.checked) setFormPrice('');
                      }}
                      className="w-3.5 h-3.5 rounded"
                    />
                    <span className="text-[10px] text-slate-500 font-semibold">Price not confirmed</span>
                  </label>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Order Limit / Day</label>
                  <input
                    type="number"
                    placeholder="50"
                    value={formOrderLimit}
                    onChange={e => setFormOrderLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-primary-blue min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Category</label>
                {categories.length > 0 ? (
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none min-h-[44px]"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. South Indian / Snacks"
                    value={formNewCategory}
                    onChange={e => setFormNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none min-h-[44px]"
                  />
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Crispy crepe with spiced potato filling..."
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none"
                />
              </div>

              {/* Food Image Selection: Upload from Device or Image URL (Section 6) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#073653] block text-xs">Food Image (Optional)</label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('UPLOAD')}
                      className={`px-2 py-0.5 rounded transition ${imageInputMode === 'UPLOAD' ? 'bg-white text-[#073653] shadow-sm font-black' : 'text-[#64839A]'}`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('URL')}
                      className={`px-2 py-0.5 rounded transition ${imageInputMode === 'URL' ? 'bg-white text-[#073653] shadow-sm font-black' : 'text-[#64839A]'}`}
                    >
                      Image URL
                    </button>
                  </div>
                </div>

                {imageInputMode === 'UPLOAD' ? (
                  <div>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#BFEBDD] hover:border-[#00B894] rounded-2xl p-3 cursor-pointer bg-[#DFF3E8]/30 hover:bg-[#DFF3E8]/50 transition text-center">
                      {imageUploadLoading ? (
                        <Loader2 className="w-5 h-5 text-[#00B894] animate-spin mb-1" />
                      ) : (
                        <Upload className="w-5 h-5 text-[#00B894] mb-1" />
                      )}
                      <span className="text-xs font-bold text-[#073653]">
                        {imageUploadLoading ? 'Processing image...' : 'Choose image from device'}
                      </span>
                      <span className="text-[10px] text-[#64839A] mt-0.5">JPG, PNG, WebP (max 2.5MB)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={imageUploadLoading}
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      placeholder="https://... (Persistent image link)"
                      value={formImage}
                      onChange={e => {
                        setFormImage(e.target.value);
                        setImageError(null);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00B894] min-h-[44px]"
                    />
                  </div>
                )}

                {imageError && (
                  <p className="text-[11px] text-rose-600 font-bold">{imageError}</p>
                )}

                {/* Live Preview Box */}
                {formImage && (
                  <div className="flex items-center gap-3 p-2.5 bg-[#DFF3E8]/30 rounded-2xl border border-[#BFEBDD]">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0 shadow-sm">
                      <img
                        src={formImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={() => setImageError('Failed to load image preview. Please check link or file.')}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-[#073653]">Live Preview Ready</p>
                      <p className="text-[10px] text-[#64839A] truncate">{formImage.startsWith('data:') ? 'Custom uploaded device photo' : formImage}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCropModalSrc(formImage);
                        setCropScale(1);
                        setCropPanX(0);
                        setCropPanY(0);
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-[#00B894] hover:bg-[#DFF3E8] rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <Crop className="w-3 h-3" />
                      <span>Crop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormImage('')}
                      className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#073653]">
                  <input
                    type="checkbox"
                    checked={formIsVeg}
                    onChange={e => setFormIsVeg(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00B894]"
                  />
                  <span>Vegetarian</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#073653]">
                  <input
                    type="checkbox"
                    checked={formIsTodaysMenu}
                    onChange={e => setFormIsTodaysMenu(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00B894]"
                  />
                  <span>Show in Today's Menu</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddItemOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#00B894] hover:bg-[#00a382] text-white shadow-sm min-h-[44px]"
                >
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD CATEGORY */}
      {/* ========================================================= */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-xl animate-scaleUp">
            <h3 className="text-sm font-black text-text-primary">Create Menu Category</h3>
            <p className="text-xs text-text-secondary mt-1">
              Add a custom category to organize your canteen menu.
            </p>

            <form onSubmit={handleCreateCategory} className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Beverages, Rolls, Meals"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-primary-blue min-h-[44px] text-xs"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#00B894] hover:bg-[#00a382] text-white shadow-sm min-h-[44px]"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DELETE CATEGORY (Requirement 1) */}
      {/* ========================================================= */}
      {isDeleteCategoryOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-[#073653]">Delete Existing Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteCategoryOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDeleteCategory} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-[#073653] block mb-1.5">
                  Select Category to Delete
                </label>
                {categories.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No categories available to delete.</p>
                ) : (
                  <select
                    value={deleteCategorySelectedId}
                    onChange={e => {
                      setDeleteCategorySelectedId(e.target.value);
                      setDeleteCategoryError(null);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#073653] focus:outline-none focus:ring-2 focus:ring-rose-500/20 min-h-[44px]"
                  >
                    {categories.map(c => {
                      const count = menuItems.filter(m => m.categoryId === c.id).length;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} ({count} {count === 1 ? 'item' : 'items'})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Status and In-Use Accidental Deletion Protection (Requirement 1) */}
              {(() => {
                const selectedCat = categories.find(c => c.id === deleteCategorySelectedId);
                const itemsInSelected = menuItems.filter(m => m.categoryId === deleteCategorySelectedId);
                const isInUse = itemsInSelected.length > 0;

                if (!selectedCat) return null;

                if (isInUse) {
                  return (
                    <div className="p-3.5 bg-amber-50/90 border border-amber-200/80 rounded-2xl text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-800 font-extrabold">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Cannot Delete: Category In Use</span>
                      </div>
                      <p className="text-[11px] text-amber-900 leading-relaxed pl-5.5">
                        Category <strong className="font-bold">"{selectedCat.name}"</strong> is currently assigned to{' '}
                        <strong className="font-bold">{itemsInSelected.length} menu item(s)</strong> (
                        {itemsInSelected.slice(0, 3).map(i => i.name).join(', ')}
                        {itemsInSelected.length > 3 ? '...' : ''}
                        ). To prevent accidental loss of menu items, reassign or remove these items before deleting the category.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="p-3 bg-[#DFF3E8]/70 border border-[#BFEBDD] rounded-2xl text-xs flex items-center gap-2 text-[#0B725C]">
                    <CheckCircle2 className="w-4 h-4 text-[#00B894] shrink-0" />
                    <span>Category <strong>"{selectedCat.name}"</strong> has no menu items and can be safely removed.</span>
                  </div>
                );
              })()}

              {deleteCategoryError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{deleteCategoryError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteCategoryOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 min-h-[42px] cursor-pointer"
                >
                  Cancel
                </button>
                {(() => {
                  const itemsInSelected = menuItems.filter(m => m.categoryId === deleteCategorySelectedId);
                  const isBlocked = itemsInSelected.length > 0 || !deleteCategorySelectedId;

                  return (
                    <button
                      type="submit"
                      disabled={isBlocked || deleteCategoryLoading}
                      className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white shadow-sm transition flex items-center gap-1.5 min-h-[42px] cursor-pointer"
                    >
                      {deleteCategoryLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Delete Category</span>
                    </button>
                  );
                })()}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DEDICATED IMAGE UPLOAD FOR SINGLE MENU ITEM (Requirement 2) */}
      {/* ========================================================= */}
      {imageUploadItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#BFEBDD] shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-[#073653]">
                  Update Food Image
                </h3>
                <p className="text-xs text-[#64839A] mt-0.5 font-medium">
                  {imageUploadItem.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImageUploadItem(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100/80 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => {
                  setImageUploadMode('UPLOAD');
                  setImageUploadError(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  imageUploadMode === 'UPLOAD'
                    ? 'bg-white text-[#073653] shadow-xs'
                    : 'text-[#64839A] hover:text-[#073653]'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Device File</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setImageUploadMode('URL');
                  setImageUploadError(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  imageUploadMode === 'URL'
                    ? 'bg-white text-[#073653] shadow-xs'
                    : 'text-[#64839A] hover:text-[#073653]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Paste Image URL</span>
              </button>
            </div>

            {/* Mode 1: Device Upload */}
            {imageUploadMode === 'UPLOAD' && (
              <div className="space-y-3">
                <label className="border-2 border-dashed border-[#BFEBDD] hover:border-[#00B894] rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-[#F9FDFC]">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleDeviceImageSelected}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-[#DFF3E8] text-[#00B894] flex items-center justify-center shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-[#073653]">
                    Click to browse from your device
                  </span>
                  <span className="text-[10px] text-slate-400">
                    JPG, PNG, or WebP (max 2.5MB) • Standardises to 600×600 px
                  </span>
                </label>

                {singleItemImageLoading && (
                  <div className="flex items-center justify-center gap-2 py-2 text-xs text-[#00B894] font-bold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing & standardising image...</span>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Paste URL */}
            {imageUploadMode === 'URL' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#073653] block">Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUploadUrl}
                  onChange={e => {
                    setImageUploadUrl(e.target.value);
                    setImageUploadPreview(e.target.value);
                    setImageUploadError(null);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]/30 min-h-[44px]"
                />
              </div>
            )}

            {/* Image Preview Box */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                  {imageUploadPreview ? (
                    <img
                      src={imageUploadPreview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                      onError={() => setImageUploadError('Invalid image URL or unable to load preview.')}
                    />
                  ) : (
                    <img
                      src={getItemImage(imageUploadItem)}
                      alt="Current"
                      className="w-full h-full object-contain opacity-60"
                    />
                  )}
                </div>
                <div>
                  <span className="text-xs font-black text-[#073653] block">
                    {imageUploadPreview ? 'New Image Ready' : 'Current Dish Image'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Square 600×600 WebP (high quality)
                  </span>
                </div>
              </div>

              {imageUploadItem.imageUrl && (
                <button
                  type="button"
                  onClick={() => handleSaveItemImage(null)}
                  disabled={imageUploadSaving}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  Reset Default
                </button>
              )}
            </div>

            {/* Success & Error Feedback */}
            {imageUploadSuccess && (
              <div className="p-3 bg-[#DFF3E8]/80 border border-[#BFEBDD] rounded-xl text-xs text-[#0B725C] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00B894] shrink-0" />
                <span>{imageUploadSuccess}</span>
              </div>
            )}
            {imageUploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{imageUploadError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setImageUploadItem(null)}
                disabled={imageUploadSaving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 min-h-[42px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveItemImage(imageUploadMode === 'UPLOAD' ? imageUploadPreview : imageUploadUrl)}
                disabled={imageUploadSaving || singleItemImageLoading || (!imageUploadPreview && !imageUploadUrl)}
                className="px-5 py-2 rounded-xl text-xs font-black bg-[#00B894] hover:bg-[#00a382] disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm transition flex items-center gap-1.5 min-h-[42px] cursor-pointer"
              >
                {imageUploadSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Image...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Image</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SQUARE IMAGE CROP & FORMAT (Requirement 2) */}
      {/* ========================================================= */}
      {cropModalSrc && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setCropModalSrc(null); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setCropModalSrc(null); }}
          tabIndex={0}
        >
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#BFEBDD] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-[#073653]">Crop & Square Format Food Photo</h3>
                <p className="text-[11px] text-[#64839A]">Standardise image into a clean square with pure white canvas.</p>
              </div>
              <button
                onClick={() => setCropModalSrc(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Square Viewport */}
            <div className="w-64 h-64 mx-auto rounded-2xl bg-white border-2 border-dashed border-[#00B894] overflow-hidden relative shadow-inner flex items-center justify-center p-2">
              <img
                src={cropModalSrc}
                alt="Crop target"
                style={{
                  transform: `translate(${cropPanX}px, ${cropPanY}px) scale(${cropScale})`,
                  transformOrigin: 'center center',
                }}
                className="max-w-full max-h-full object-contain transition-transform duration-75 pointer-events-none select-none"
              />
            </div>

            {/* Zoom and Pan Controls */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#073653]">Zoom Level: {Math.round(cropScale * 100)}%</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setCropScale(1); setCropPanX(0); setCropPanY(0); }}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-[#073653] hover:bg-slate-200"
                  >
                    Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCropScale(1.35); setCropPanX(0); setCropPanY(0); }}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-[#073653] hover:bg-slate-200"
                  >
                    Fill
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.05"
                value={cropScale}
                onChange={(e) => setCropScale(parseFloat(e.target.value))}
                className="w-full accent-[#00B894] cursor-pointer"
              />

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] text-[#64839A] font-bold block mb-0.5">Horizontal Pan</span>
                  <input
                    type="range"
                    min="-120"
                    max="120"
                    step="5"
                    value={cropPanX}
                    onChange={(e) => setCropPanX(parseInt(e.target.value, 10))}
                    className="w-full accent-[#00B894] cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#64839A] font-bold block mb-0.5">Vertical Pan</span>
                  <input
                    type="range"
                    min="-120"
                    max="120"
                    step="5"
                    value={cropPanY}
                    onChange={(e) => setCropPanY(parseInt(e.target.value, 10))}
                    className="w-full accent-[#00B894] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormImage(cropModalSrc);
                  setCropModalSrc(null);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Skip Crop
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="px-4 py-2 rounded-xl text-xs font-black bg-[#00B894] hover:bg-[#00a382] text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Square Crop</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRM ARCHIVE MENU ITEM (Section 7) */}
      {/* ========================================================= */}
      {confirmArchiveItem && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmArchiveItem(null); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setConfirmArchiveItem(null); }}
          tabIndex={0}
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-rose-100 shadow-2xl animate-scaleUp text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-[#073653]">Archive Menu Item?</h3>
            <p className="text-xs text-[#64839A] mt-2">
              Are you sure you want to archive <strong className="text-[#073653]">"{confirmArchiveItem.name}"</strong>? It will be removed from normal menu views, but historical order records remain preserved.
            </p>
            <div className="flex items-center gap-2 mt-6">
              <button
                type="button"
                disabled={actionLoading[confirmArchiveItem.id] === 'ARCHIVING'}
                onClick={() => setConfirmArchiveItem(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading[confirmArchiveItem.id] === 'ARCHIVING'}
                onClick={handleConfirmArchive}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition flex items-center justify-center gap-2 min-h-[44px] shadow-sm"
              >
                {actionLoading[confirmArchiveItem.id] === 'ARCHIVING' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Yes, Archive</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRM RESTORE MENU ITEM (Section 7) */}
      {/* ========================================================= */}
      {confirmRestoreItem && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmRestoreItem(null); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setConfirmRestoreItem(null); }}
          tabIndex={0}
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-[#BFEBDD] shadow-2xl animate-scaleUp text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#DFF3E8] text-[#00B894] flex items-center justify-center mx-auto mb-3 shadow-inner">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-[#073653]">Restore Menu Item?</h3>
            <p className="text-xs text-[#64839A] mt-2">
              Restore <strong className="text-[#073653]">"{confirmRestoreItem.name}"</strong> back to the active menu? It will return to its saved category and pricing.
            </p>
            <div className="flex items-center gap-2 mt-6">
              <button
                type="button"
                disabled={actionLoading[confirmRestoreItem.id] === 'RESTORING'}
                onClick={() => setConfirmRestoreItem(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading[confirmRestoreItem.id] === 'RESTORING'}
                onClick={handleConfirmRestore}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black text-white bg-[#00B894] hover:bg-[#00a382] transition flex items-center justify-center gap-2 min-h-[44px] shadow-sm"
              >
                {actionLoading[confirmRestoreItem.id] === 'RESTORING' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Yes, Restore</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================= */}
      {/* MODAL: ORDER TICKET DETAIL & STATUS HISTORY */}
      {/* ========================================================= */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl animate-scaleUp my-8 space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-black text-deep-blue bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  #{selectedOrderDetail.orderNumber}
                </span>
                <h3 className="text-base font-black text-text-primary mt-2">Order Ticket Details</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Created: {new Date(selectedOrderDetail.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status & Payment Badges */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Order Status</span>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                  selectedOrderDetail.status === 'REQUESTED' ? 'bg-amber-100 text-amber-800' :
                  selectedOrderDetail.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                  selectedOrderDetail.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                  selectedOrderDetail.status === 'PREPARING' ? 'bg-indigo-100 text-indigo-800' :
                  selectedOrderDetail.status === 'READY_FOR_PICKUP' || selectedOrderDetail.status === 'READY' ? 'bg-teal-100 text-teal-800' :
                  selectedOrderDetail.status === 'COLLECTED' ? 'bg-slate-100 text-slate-600' :
                  'bg-rose-100 text-rose-800'
                }`}>
                  {selectedOrderDetail.status}
                </span>
              </div>

              <div className="flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Status</span>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                  selectedOrderDetail.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                  selectedOrderDetail.paymentStatus === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                  selectedOrderDetail.paymentStatus === 'NOT_DUE' ? 'bg-slate-100 text-slate-600' :
                  'bg-rose-100 text-rose-800'
                }`}>
                  {selectedOrderDetail.paymentStatus}
                </span>
              </div>
            </div>

            {/* Customer Details & Pickup Time */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Customer Name</span>
                <span className="font-extrabold text-slate-900 mt-0.5 block">{selectedOrderDetail.customerName}</span>
                {selectedOrderDetail.customerPhone && (
                  <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                    {selectedOrderDetail.customerPhone}
                  </span>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Requested Pickup Time</span>
                <span className="font-black text-deep-blue mt-0.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary-blue" />
                  {format12Time(selectedOrderDetail.exactPickupTime)}
                </span>
                {selectedOrderDetail.sellerSuggestedTime && (
                  <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                    Proposed: {formatPickupTimeDisplay(selectedOrderDetail.sellerSuggestedTime)}
                  </span>
                )}
              </div>
            </div>

            {/* Itemized Order Table */}
            <div>
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Item Breakdown:</h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black">
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrderDetail.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-bold text-slate-900">{it.itemName}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold">{it.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          ₹{parseFloat(it.unitPrice).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{parseFloat(it.subtotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-black border-t border-slate-200">
                      <td colSpan={3} className="py-2.5 px-3 text-right text-slate-600">Grand Total:</td>
                      <td className="py-2.5 px-3 text-right font-mono text-deep-blue text-sm">
                        ₹{parseFloat(selectedOrderDetail.totalAmount).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Order Status History Timeline */}
            <div>
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Status Audit History:</h4>
              {isLoadingHistory ? (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-blue" />
                  <span>Loading history logs...</span>
                </div>
              ) : orderHistoryLogs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No previous transition logs recorded.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {orderHistoryLogs.map((log, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-800">
                          {log.fromStatus ? `${log.fromStatus} → ` : ''}{log.toStatus}
                        </span>
                        {log.note && <p className="text-slate-500 mt-0.5 text-[10px]">{log.note}</p>}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              {selectedOrderDetail.paymentStatus !== 'PAID' &&
               ['REQUESTED', 'ACCEPTED', 'AWAITING_PAYMENT', 'PAYMENT_PENDING', 'TIME_CHANGE_PROPOSED'].includes(selectedOrderDetail.status) && (
                <button
                  onClick={() => {
                    setCancelOrderId(selectedOrderDetail.id);
                    setCancelPresetReason('Customer did not pay within time limit');
                    setCancelCustomReason('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition min-h-[44px]"
                >
                  Cancel Unpaid Order
                </button>
              )}
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 min-h-[44px]"
              >
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CANCEL UNPAID ORDER CONFIRMATION */}
      {/* ========================================================= */}
      {cancelOrderId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl animate-scaleUp">
            <div className="flex items-center gap-2 mb-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-black">Cancel Unpaid Order</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this unpaid order? The server will verify payment status and atomically release reserved batch capacity.
            </p>

            <div className="mt-4 space-y-3">
              <label className="text-[11px] font-bold text-slate-700 block">Select Cancellation Reason:</label>
              <div className="space-y-2 text-xs">
                {[
                  'Customer did not pay within time limit',
                  'Kitchen capacity unavailable',
                  'Customer requested cancellation',
                  'Other',
                ].map((r) => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer text-slate-800">
                    <input
                      type="radio"
                      name="cancelReason"
                      checked={cancelPresetReason === r}
                      onChange={() => setCancelPresetReason(r)}
                      className="accent-red-600"
                    />
                    <span className="font-semibold">{r === 'Other' ? 'Other reason (specify below)' : r}</span>
                  </label>
                ))}
              </div>

              {cancelPresetReason === 'Other' && (
                <textarea
                  value={cancelCustomReason}
                  onChange={(e) => setCancelCustomReason(e.target.value)}
                  placeholder="Enter reason for cancelling this unpaid order..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[70px]"
                />
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setCancelOrderId(null);
                  setCancelCustomReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 min-h-[44px]"
              >
                Keep Order
              </button>
              <button
                onClick={() => handleCancelUnpaidOrder(cancelOrderId)}
                disabled={actionLoading[cancelOrderId] === 'CANCELLING'}
                className="px-4 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-tactile min-h-[44px] flex items-center gap-1.5"
              >
                {actionLoading[cancelOrderId] === 'CANCELLING' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
