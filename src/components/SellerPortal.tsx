'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  CheckSquare
} from 'lucide-react';
import { authClient } from '@/lib/auth/auth-client';

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
  batch: { id: string; displayLabel: string; startTime: string; endTime: string } | null;
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
  description: string | null;
  price: string;
  isVegetarian: boolean;
  isAvailable: boolean;
  isTodaysMenu: boolean;
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

interface SellerPortalProps {
  user: any;
  canteenStatus: 'OPEN' | 'TOO_BUSY' | 'CLOSED';
  onUpdateStatus: (status: 'OPEN' | 'TOO_BUSY' | 'CLOSED') => void;
  onLogout?: () => void;
}

export const SellerPortal: React.FC<SellerPortalProps> = ({
  user,
  canteenStatus,
  onUpdateStatus,
  onLogout,
}) => {
  // Navigation: 5 sections
  const [tab, setTab] = useState<'ORDERS' | 'PREPARATION' | 'PICKUP' | 'MENU' | 'ACCOUNT'>('ORDERS');

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

  // Orders Tab Filter
  const [ordersFilter, setOrdersFilter] = useState<'REQUESTED' | 'ACTIVE' | 'ALL'>('REQUESTED');

  // Time Suggestion Modal
  const [suggestOrderId, setSuggestOrderId] = useState<string | null>(null);
  const [suggestTimeStr, setSuggestTimeStr] = useState('11:30');
  const [suggestNote, setSuggestNote] = useState('');

  // Reject Order Modal
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Kitchen busy at requested time');

  // Batch Pause State Tracker (local toggle indicator)
  const [pausedBatches, setPausedBatches] = useState<Record<string, boolean>>({});

  // Pickup Verification
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [verifyTargetOrderId, setVerifyTargetOrderId] = useState<string | null>(null);
  const [verifyAttemptsLeft, setVerifyAttemptsLeft] = useState<number | null>(null);
  const [verifyTab, setVerifyTab] = useState<'READY' | 'COLLECTED'>('READY');

  // Menu Management
  const [menuFilterCategory, setMenuFilterCategory] = useState<string>('ALL');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form States for Menu Item
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formNewCategory, setFormNewCategory] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIsVeg, setFormIsVeg] = useState(true);
  const [formIsTodaysMenu, setFormIsTodaysMenu] = useState(true);
  const [formImage, setFormImage] = useState('');
  const [formOrderLimit, setFormOrderLimit] = useState('50');

  // Form State for Category
  const [newCatName, setNewCatName] = useState('');

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const refreshData = async (isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      else setIsRefreshing(true);

      const [ordRes, batchRes, menuRes, catRes, canRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/batches'),
        fetch('/api/menu'),
        fetch('/api/menu/categories'),
        fetch('/api/canteen/status'),
      ]);

      const [ordData, batchData, menuData, catData, canData] = await Promise.all([
        ordRes.json().catch(() => ({})),
        batchRes.json().catch(() => ({})),
        menuRes.json().catch(() => ({})),
        catRes.json().catch(() => ({})),
        canRes.json().catch(() => ({})),
      ]);

      if (ordData.orders) setOrdersList(ordData.orders);
      if (batchData.batches) setBatches(batchData.batches);
      if (menuData.items) setMenuItems(menuData.items);
      if (catData.categories) setCategories(catData.categories);
      else if (menuData.categories) setCategories(menuData.categories);
      if (canData.canteen) setCanteenData(canData.canteen);
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
  }, []);

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

  const handleSuggestTime = async () => {
    if (!suggestOrderId || actionLoading[suggestOrderId]) return;
    clearMessages();
    const orderId = suggestOrderId;
    setActionLoading(prev => ({ ...prev, [orderId]: 'SUGGESTING' }));

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const fullIsoTime = `${todayStr}T${suggestTimeStr}:00.000Z`;

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SELLER_SUGGEST_TIME',
          suggestedTime: fullIsoTime,
          note: suggestNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to suggest time.');

      setPortalSuccess(`Suggested new pickup time ${suggestTimeStr} sent to customer.`);
      setSuggestOrderId(null);
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

  const togglePauseBatch = (batchId: string) => {
    setPausedBatches(prev => ({ ...prev, [batchId]: !prev[batchId] }));
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

    setMenuItems(prev => prev.map(m => (m.id === itemId ? { ...m, isTodaysMenu: !currentVal } : m)));

    try {
      const res = await fetch('/api/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, isTodaysMenu: !currentVal }),
      });
      if (!res.ok) throw new Error('Failed to update Today\'s Menu flag.');
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

    if (!formName.trim() || !formPrice.trim()) {
      setPortalError('Item name and price are required.');
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setPortalError('Please enter a valid price.');
      return;
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
            price: priceNum.toFixed(2),
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
            price: priceNum.toFixed(2),
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

  const handleArchiveItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Archive "${itemName}"? Historical orders will be preserved, but customers will no longer see this item.`)) {
      return;
    }
    clearMessages();
    setActionLoading(prev => ({ ...prev, [itemId]: 'DELETING' }));

    try {
      const res = await fetch(`/api/menu?id=${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to archive item.');
      setPortalSuccess(`Item "${itemName}" archived.`);
      await refreshData(false);
    } catch (err: any) {
      setPortalError(err.message);
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

  const openEditItemModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormPrice(item.price);
    setFormCategory(item.categoryId);
    setFormNewCategory('');
    setFormDesc(item.description || '');
    setFormIsVeg(item.isVegetarian);
    setFormIsTodaysMenu(item.isTodaysMenu);
    setFormImage(item.imageUrl || '');
    setFormOrderLimit(item.dailyCapacity ? item.dailyCapacity.toString() : '50');
    setIsAddItemOpen(true);
  };

  const resetItemForm = () => {
    setFormName('');
    setFormPrice('');
    setFormCategory(categories[0]?.id || '');
    setFormNewCategory('');
    setFormDesc('');
    setFormIsVeg(true);
    setFormIsTodaysMenu(true);
    setFormImage('');
    setFormOrderLimit('50');
  };

  // -------------------------------------------------------------
  // Filtered Lists & Computations
  // -------------------------------------------------------------
  const incomingRequestedOrders = useMemo(() => {
    return ordersList.filter(o => o.status === 'REQUESTED');
  }, [ordersList]);

  const activeOrders = useMemo(() => {
    return ordersList.filter(o => ['ACCEPTED', 'PAYMENT_PENDING', 'CONFIRMED', 'PREPARING'].includes(o.status));
  }, [ordersList]);

  const readyOrders = useMemo(() => {
    return ordersList.filter(o => o.status === 'READY');
  }, [ordersList]);

  const collectedOrders = useMemo(() => {
    return ordersList.filter(o => o.status === 'COLLECTED');
  }, [ordersList]);

  // Aggregate items in batches for Preparation view
  const batchOrdersMap = useMemo(() => {
    const map = new Map<string, { batch: Batch; orders: Order[]; itemsTally: Record<string, number> }>();

    // Process orders that are CONFIRMED or PREPARING
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

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    if (menuFilterCategory === 'ALL') return menuItems;
    if (menuFilterCategory === 'TODAYS') return menuItems.filter(m => m.isTodaysMenu);
    return menuItems.filter(m => m.categoryId === menuFilterCategory);
  }, [menuItems, menuFilterCategory]);

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

  const canteenDisplayName = canteenData?.name || `${user.name}'s Canteen`;

  // -------------------------------------------------------------
  // Render
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row pb-20 md:pb-8">
      {/* ========================================================= */}
      {/* DESKTOP SIDEBAR NAVIGATION */}
      {/* ========================================================= */}
      <aside className="hidden md:flex w-64 bg-surface border-r border-slate-200 flex-col shrink-0 p-4">
        {/* Canteen Identity */}
        <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200/80 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-blue text-white flex items-center justify-center font-bold shadow-tactile shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-extrabold text-text-primary truncate">{canteenDisplayName}</h2>
              <p className="text-[11px] font-bold text-slate-500">Seller Workspace</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5">
          <button
            onClick={() => setTab('ORDERS')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition min-h-[44px] ${
              tab === 'ORDERS'
                ? 'bg-primary-blue text-white shadow-tactile'
                : 'text-text-secondary hover:bg-slate-100 hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4" />
              <span>Orders</span>
            </div>
            {incomingRequestedOrders.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                tab === 'ORDERS' ? 'bg-white text-primary-blue' : 'bg-rose-500 text-white'
              }`}>
                {incomingRequestedOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('PREPARATION')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition min-h-[44px] ${
              tab === 'PREPARATION'
                ? 'bg-primary-blue text-white shadow-tactile'
                : 'text-text-secondary hover:bg-slate-100 hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-3">
              <ChefHat className="w-4 h-4" />
              <span>Preparation</span>
            </div>
            {batchOrdersMap.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                tab === 'PREPARATION' ? 'bg-white text-primary-blue' : 'bg-amber-500 text-white'
              }`}>
                {batchOrdersMap.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('PICKUP')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition min-h-[44px] ${
              tab === 'PICKUP'
                ? 'bg-primary-blue text-white shadow-tactile'
                : 'text-text-secondary hover:bg-slate-100 hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-3">
              <QrCode className="w-4 h-4" />
              <span>Pickup</span>
            </div>
            {readyOrders.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                tab === 'PICKUP' ? 'bg-white text-primary-blue' : 'bg-emerald-500 text-white'
              }`}>
                {readyOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('MENU')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition min-h-[44px] ${
              tab === 'MENU'
                ? 'bg-primary-blue text-white shadow-tactile'
                : 'text-text-secondary hover:bg-slate-100 hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-3">
              <Utensils className="w-4 h-4" />
              <span>Menu</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">{menuItems.length} items</span>
          </button>

          <button
            onClick={() => setTab('ACCOUNT')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition min-h-[44px] ${
              tab === 'ACCOUNT'
                ? 'bg-primary-blue text-white shadow-tactile'
                : 'text-text-secondary hover:bg-slate-100 hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-3">
              <User className="w-4 h-4" />
              <span>Account</span>
            </div>
          </button>
        </nav>

        {/* Quick Refresh Button */}
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={() => refreshData(false)}
            disabled={isRefreshing}
            className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Latest Data'}</span>
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================= */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Top Header: Canteen Operating Status Switcher & Notifications */}
        <div className="bg-surface rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-primary-blue md:hidden">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-text-primary">{canteenDisplayName}</h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  canteenStatus === 'OPEN' ? 'bg-emerald-100 text-emerald-800' :
                  canteenStatus === 'TOO_BUSY' ? 'bg-amber-100 text-amber-800' :
                  'bg-rose-100 text-rose-800'
                }`}>
                  ● {canteenStatus}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Hours: <span className="font-semibold text-slate-700">08:00 to 17:00</span> (24h) • 15-min Batch Queue
              </p>
            </div>
          </div>

          {/* Canteen Status Toggle Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/60 w-full sm:w-auto">
            <button
              onClick={() => onUpdateStatus('OPEN')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black transition min-h-[36px] ${
                canteenStatus === 'OPEN'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              OPEN
            </button>
            <button
              onClick={() => onUpdateStatus('TOO_BUSY')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black transition min-h-[36px] ${
                canteenStatus === 'TOO_BUSY'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              TOO BUSY
            </button>
            <button
              onClick={() => onUpdateStatus('CLOSED')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black transition min-h-[36px] ${
                canteenStatus === 'CLOSED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CLOSED
            </button>
          </div>
        </div>

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
            {/* 1. ORDERS SECTION */}
            {/* ========================================================= */}
            {tab === 'ORDERS' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-text-primary">Order Management</h2>
                    <p className="text-xs text-text-secondary">
                      Review customer requests with exact pickup times and 15-minute batches.
                    </p>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
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

                {/* Orders List */}
                {(() => {
                  const displayList =
                    ordersFilter === 'REQUESTED'
                      ? incomingRequestedOrders
                      : ordersFilter === 'ACTIVE'
                      ? activeOrders
                      : ordersList;

                  if (displayList.length === 0) {
                    return (
                      <div className="bg-surface rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                          <Inbox className="w-8 h-8" />
                        </div>
                        <h3 className="text-sm font-extrabold text-text-primary">
                          {ordersFilter === 'REQUESTED' ? 'No incoming requests.' : 'No orders yet.'}
                        </h3>
                        <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                          {ordersFilter === 'REQUESTED'
                            ? 'New customer orders waiting for acceptance will appear here.'
                            : 'Orders placed by customers for this canteen will be displayed here.'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 gap-4">
                      {displayList.map(order => {
                        const isRequested = order.status === 'REQUESTED';
                        const exactTime24 = format24Time(order.exactPickupTime);
                        const batchDisplay = order.batch?.displayLabel || '15-min Batch';
                        const isAccepting = actionLoading[order.id] === 'ACCEPTING';
                        const isRejecting = actionLoading[order.id] === 'REJECTING';

                        return (
                          <div
                            key={order.id}
                            className="bg-surface rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition"
                          >
                            {/* Order Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-sm font-black text-deep-blue bg-slate-100 px-2.5 py-1 rounded-lg">
                                  #{order.orderNumber}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-extrabold text-text-primary">{order.customerName}</h4>
                                    {order.customerPhone && (
                                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> {order.customerPhone}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    Placed at {format24Time(order.createdAt)}
                                  </p>
                                </div>
                              </div>

                              {/* Exact Time & Batch Tags */}
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="px-3 py-1 rounded-xl bg-primary-blue/10 text-primary-blue border border-primary-blue/20 text-xs font-black flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Exact: {exactTime24}</span>
                                </div>
                                <div className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Batch: {batchDisplay}</span>
                                </div>
                                <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black uppercase ${
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
                            </div>

                            {/* Order Items Breakdown */}
                            <div className="py-3 space-y-1.5">
                              {order.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-slate-500">{it.quantity}×</span>
                                    <span className="font-semibold text-text-primary">{it.itemName}</span>
                                  </div>
                                  <span className="font-mono text-slate-600">₹{parseFloat(it.subtotal).toFixed(2)}</span>
                                </div>
                              ))}
                              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs font-black">
                                <span className="text-text-secondary uppercase">Order Total</span>
                                <span className="text-deep-blue text-sm">₹{parseFloat(order.totalAmount).toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Action Buttons for Incoming REQUESTED Orders */}
                            {isRequested && (
                              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setRejectOrderId(order.id);
                                    setRejectReason('Kitchen currently at capacity');
                                  }}
                                  disabled={isAccepting || isRejecting}
                                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition min-h-[44px] disabled:opacity-50"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => {
                                    setSuggestOrderId(order.id);
                                    setSuggestTimeStr(exactTime24);
                                  }}
                                  disabled={isAccepting || isRejecting}
                                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 transition min-h-[44px] disabled:opacity-50"
                                >
                                  Suggest Time
                                </button>
                                <button
                                  onClick={() => handleAcceptOrder(order.id)}
                                  disabled={isAccepting || isRejecting}
                                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-tactile transition flex items-center gap-2 min-h-[44px] disabled:opacity-50"
                                >
                                  {isAccepting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                  <span>{isAccepting ? 'Accepting...' : 'Accept Order'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ========================================================= */}
            {/* 2. PREPARATION SECTION (15-min Batch Containers) */}
            {/* ========================================================= */}
            {tab === 'PREPARATION' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-extrabold text-text-primary">Kitchen Preparation Batches</h2>
                  <p className="text-xs text-text-secondary">
                    Continuous 15-minute kitchen production containers with aggregated item prep totals.
                  </p>
                </div>

                {batchOrdersMap.length === 0 ? (
                  <div className="bg-surface rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                      <ChefHat className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-extrabold text-text-primary">No active preparation batches.</h3>
                    <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                      Confirmed orders will be automatically aggregated into 15-minute preparation containers here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {batchOrdersMap.map(({ batch, orders: batchOrders, itemsTally }) => {
                      const isStarting = actionLoading[batch.id] === 'STARTING';
                      const isMarkingReady = actionLoading[batch.id] === 'MARKING_BATCH_READY';
                      const isPaused = Boolean(pausedBatches[batch.id]);

                      return (
                        <div
                          key={batch.id}
                          className="bg-surface rounded-3xl border-2 border-slate-200/90 shadow-md overflow-hidden transition"
                        >
                          {/* Batch Container Header */}
                          <div className="bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-deep-blue text-white rounded-xl text-xs font-black tracking-wide">
                                  BATCH {batch.displayLabel}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  isPaused ? 'bg-amber-100 text-amber-800' :
                                  batch.status === 'PREPARING' ? 'bg-purple-100 text-purple-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  ● {isPaused ? 'PAUSED' : batch.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1.5 font-medium">
                                Batch Capacity: <span className="font-bold text-slate-700">{batchOrders.length}</span> / {batch.capacity} orders assigned
                              </p>
                            </div>

                            {/* Batch Actions */}
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => togglePauseBatch(batch.id)}
                                className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition min-h-[44px]"
                              >
                                {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5 text-amber-600" />}
                                <span>{isPaused ? 'Resume Prep' : 'Pause'}</span>
                              </button>

                              {batch.status !== 'PREPARING' && (
                                <button
                                  onClick={() => handleStartBatchPrep(batch.id)}
                                  disabled={isStarting}
                                  className="px-4 py-2 bg-primary-blue hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-tactile flex items-center gap-1.5 transition min-h-[44px] disabled:opacity-50"
                                >
                                  {isStarting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                  <span>{isStarting ? 'Starting...' : 'Start Preparing'}</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleMarkBatchReady(batch.id)}
                                disabled={isMarkingReady}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-tactile flex items-center gap-1.5 transition min-h-[44px] disabled:opacity-50"
                              >
                                {isMarkingReady && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>{isMarkingReady ? 'Updating...' : 'Mark Batch Ready'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Aggregate Item Prep Summary Card */}
                          <div className="p-5 bg-blue-50/40 border-b border-blue-100/60">
                            <h4 className="text-[11px] font-black uppercase text-primary-blue tracking-wider mb-2">
                              Aggregate Food Preparation (Cook in Kitchen):
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(itemsTally).map(([itemName, qty], i) => (
                                <div
                                  key={i}
                                  className="px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-xs font-extrabold text-slate-800 shadow-sm flex items-center gap-1.5"
                                >
                                  <span className="text-primary-blue font-black">{qty}×</span>
                                  <span>{itemName}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Nested Individual Order Tickets */}
                          <div className="p-5 bg-white space-y-3">
                            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                              Individual Order Tickets ({batchOrders.length}):
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {batchOrders.map(ord => {
                                const isItemMarkingReady = actionLoading[ord.id] === 'MARKING_READY';
                                return (
                                  <div
                                    key={ord.id}
                                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition flex flex-col justify-between"
                                  >
                                    <div>
                                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                                        <span className="font-mono text-xs font-black text-deep-blue">
                                          #{ord.orderNumber}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-lg bg-primary-blue/10 text-primary-blue text-[11px] font-black">
                                          Requested: {format24Time(ord.exactPickupTime)}
                                        </span>
                                      </div>
                                      <p className="text-xs font-bold text-text-primary mt-2">{ord.customerName}</p>
                                      <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
                                        {ord.items.map((it, idx) => (
                                          <div key={idx}>
                                            {it.quantity}× {it.itemName}
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="mt-4 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                                      <span className="text-xs font-black text-deep-blue">
                                        ₹{parseFloat(ord.totalAmount).toFixed(2)}
                                      </span>
                                      <button
                                        onClick={() => handleMarkOrderReady(ord.id)}
                                        disabled={isItemMarkingReady}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-sm transition min-h-[36px] disabled:opacity-50"
                                      >
                                        {isItemMarkingReady ? 'Updating...' : 'Mark Ready'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
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

                {/* Verification Box */}
                <div className="bg-surface rounded-3xl p-6 border-2 border-primary-blue/30 shadow-md max-w-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-blue/10 text-primary-blue flex items-center justify-center">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-text-primary">Counter Code Verification</h3>
                      <p className="text-xs text-text-secondary">
                        Enter the 4-character code shown on the customer's phone.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      maxLength={4}
                      value={pickupCodeInput}
                      onChange={e => setPickupCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. 29DL"
                      className="flex-1 px-4 py-3.5 text-center text-2xl font-mono font-black tracking-widest uppercase rounded-2xl border-2 border-slate-200 focus:border-primary-blue focus:outline-none min-h-[48px]"
                    />
                    <select
                      value={verifyTargetOrderId || ''}
                      onChange={e => setVerifyTargetOrderId(e.target.value || null)}
                      className="px-3 py-3 rounded-2xl border border-slate-200 text-xs font-bold bg-white focus:outline-none min-h-[48px]"
                    >
                      <option value="">Select Ready Order...</option>
                      {readyOrders.map(o => (
                        <option key={o.id} value={o.id}>
                          #{o.orderNumber} - {o.customerName} (₹{parseFloat(o.totalAmount).toFixed(2)})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (!verifyTargetOrderId) {
                          setPortalError('Please select which ready order you are verifying.');
                          return;
                        }
                        handleVerifyPickupCode(verifyTargetOrderId, pickupCodeInput);
                      }}
                      disabled={!pickupCodeInput.trim() || !verifyTargetOrderId}
                      className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-tactile transition disabled:opacity-50 min-h-[48px] shrink-0"
                    >
                      Verify & Complete
                    </button>
                  </div>

                  {verifyAttemptsLeft !== null && (
                    <p className="text-xs text-rose-600 font-bold mt-2">
                      ⚠️ Incorrect code. {verifyAttemptsLeft} attempt(s) remaining before security lockout.
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
                                Exact Pickup: <span className="font-bold text-slate-700">{format24Time(ord.exactPickupTime)}</span>
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
            {/* 4. MENU SECTION (Dedicated Menu Management) */}
            {/* ========================================================= */}
            {tab === 'MENU' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-extrabold text-text-primary">Menu Management</h2>
                    <p className="text-xs text-text-secondary">
                      Add, edit, change prices, toggle stock, and manage daily order limits.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsAddCategoryOpen(true)}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 min-h-[44px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Category</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        resetItemForm();
                        setIsAddItemOpen(true);
                      }}
                      className="px-4 py-2.5 bg-primary-blue hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-tactile transition flex items-center gap-1.5 min-h-[44px]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Menu Item</span>
                    </button>
                  </div>
                </div>

                {/* Category Filter Pills */}
                {categories.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setMenuFilterCategory('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition min-h-[36px] ${
                        menuFilterCategory === 'ALL'
                          ? 'bg-primary-blue text-white shadow-tactile'
                          : 'bg-surface border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      All ({menuItems.length})
                    </button>
                    <button
                      onClick={() => setMenuFilterCategory('TODAYS')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition min-h-[36px] ${
                        menuFilterCategory === 'TODAYS'
                          ? 'bg-primary-blue text-white shadow-tactile'
                          : 'bg-surface border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Today's Menu ({menuItems.filter(m => m.isTodaysMenu).length})
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setMenuFilterCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition min-h-[36px] ${
                          menuFilterCategory === cat.id
                            ? 'bg-primary-blue text-white shadow-tactile'
                            : 'bg-surface border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {cat.name} ({menuItems.filter(m => m.categoryId === cat.id).length})
                      </button>
                    ))}
                  </div>
                )}

                {/* Empty State for Fresh Workspace (Requirement 3 & 18) */}
                {menuItems.length === 0 ? (
                  <div className="bg-surface rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-primary-blue flex items-center justify-center mx-auto mb-3 shadow-inner">
                      <Utensils className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-extrabold text-text-primary">Your canteen is ready.</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Start by adding your first menu item so customers can order.
                    </p>
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        resetItemForm();
                        setIsAddItemOpen(true);
                      }}
                      className="mt-6 px-6 py-3 bg-primary-blue hover:bg-blue-600 text-white rounded-2xl text-xs font-black shadow-tactile transition inline-flex items-center gap-2 min-h-[44px]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add your first item</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMenuItems.map(item => {
                      const isAvailUpdating = actionLoading[item.id] === 'UPDATING_AVAIL';
                      const isTodayUpdating = actionLoading[item.id] === 'UPDATING_TODAY';
                      const isArchiving = actionLoading[item.id] === 'DELETING';
                      const catName = categories.find(c => c.id === item.categoryId)?.name || 'General';

                      return (
                        <div
                          key={item.id}
                          className={`bg-surface rounded-2xl border p-5 shadow-sm transition flex flex-col justify-between ${
                            !item.isAvailable ? 'opacity-70 border-slate-200 bg-slate-50/50' : 'border-slate-200'
                          }`}
                        >
                          <div>
                            {/* Card Top */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${item.isVegetarian ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                  {catName}
                                </span>
                              </div>
                              <span className="font-mono text-sm font-black text-deep-blue">
                                ₹{parseFloat(item.price).toFixed(2)}
                              </span>
                            </div>

                            <h3 className="text-sm font-extrabold text-text-primary mt-1.5">{item.name}</h3>
                            {item.description && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
                            )}
                            <p className="text-[11px] text-slate-400 mt-2 font-semibold">
                              Daily Order Limit: <span className="text-slate-700">{item.dailyCapacity || 50}</span>
                            </p>
                          </div>

                          {/* Toggles & Actions */}
                          <div className="mt-5 pt-3 border-t border-slate-100 space-y-2.5">
                            {/* In Stock vs Sold Out Switch */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700">
                                {item.isAvailable ? 'In Stock' : 'Sold Out'}
                              </span>
                              <button
                                onClick={() => handleToggleItemAvailability(item.id, item.isAvailable)}
                                disabled={isAvailUpdating}
                                className={`w-12 h-6 rounded-full transition p-1 flex items-center ${
                                  item.isAvailable ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                                }`}
                              >
                                <span className="w-4 h-4 rounded-full bg-white shadow-sm block" />
                              </button>
                            </div>

                            {/* Today's Menu Toggle */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-500">Today's Menu</span>
                              <button
                                onClick={() => handleToggleItemToday(item.id, item.isTodaysMenu)}
                                disabled={isTodayUpdating}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                  item.isTodaysMenu ? 'bg-blue-100 text-primary-blue' : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {item.isTodaysMenu ? 'ACTIVE' : 'OFF'}
                              </button>
                            </div>

                            {/* Edit / Archive Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                              <button
                                onClick={() => openEditItemModal(item)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition flex items-center gap-1 min-h-[36px]"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleArchiveItem(item.id, item.name)}
                                disabled={isArchiving}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition flex items-center gap-1 min-h-[36px]"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Archive</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* 5. ACCOUNT SECTION (Requirement 19) */}
            {/* ========================================================= */}
            {tab === 'ACCOUNT' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h2 className="text-base font-extrabold text-text-primary">Seller Account</h2>
                  <p className="text-xs text-text-secondary">
                    Operational information and account preferences.
                  </p>
                </div>

                <div className="bg-surface rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-deep-blue to-primary-blue text-white flex items-center justify-center font-black text-lg">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-text-primary">{user.name}</h3>
                      <p className="text-xs font-mono font-bold text-primary-blue">{user.username}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Canteen Workspace</span>
                      <p className="font-extrabold text-slate-800 mt-0.5">{canteenDisplayName}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Location</span>
                      <p className="font-extrabold text-slate-800 mt-0.5">{canteenData?.location || 'Campus Food Court'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Operating Hours</span>
                      <p className="font-extrabold text-slate-800 mt-0.5">08:00 to 17:00 (24h)</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Mobile Number</span>
                      <p className="font-extrabold text-slate-800 mt-0.5">{user.phoneNumber || '--'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Batch Capacity Limit</span>
                      <p className="font-extrabold text-slate-800 mt-0.5">{canteenData?.defaultBatchCapacity || 10} orders / 15-min</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px]">College Email</span>
                      <p className="font-extrabold text-slate-800 mt-0.5">
                        {user.email && !user.email.includes('@ipcw.du.ac.in') ? user.email : user.email || ''}
                      </p>
                    </div>
                  </div>

                  {/* Sign Out Action */}
                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={async () => {
                        if (onLogout) onLogout();
                        else {
                          try {
                            await authClient.signOut();
                          } catch {}
                          window.location.reload();
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black transition flex items-center gap-2 min-h-[44px]"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ========================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {/* ========================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-slate-200 px-2 py-1.5 flex justify-around items-center z-40 shadow-lg">
        <button
          onClick={() => setTab('ORDERS')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold min-h-[44px] ${
            tab === 'ORDERS' ? 'text-primary-blue' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {incomingRequestedOrders.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white rounded-full text-[9px] font-black w-4 h-4 flex items-center justify-center">
                {incomingRequestedOrders.length}
              </span>
            )}
          </div>
          <span className="mt-0.5">Orders</span>
        </button>

        <button
          onClick={() => setTab('PREPARATION')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold min-h-[44px] ${
            tab === 'PREPARATION' ? 'text-primary-blue' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <ChefHat className="w-5 h-5" />
            {batchOrdersMap.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-white rounded-full text-[9px] font-black w-4 h-4 flex items-center justify-center">
                {batchOrdersMap.length}
              </span>
            )}
          </div>
          <span className="mt-0.5">Prep</span>
        </button>

        <button
          onClick={() => setTab('PICKUP')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold min-h-[44px] ${
            tab === 'PICKUP' ? 'text-primary-blue' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <QrCode className="w-5 h-5" />
            {readyOrders.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-500 text-white rounded-full text-[9px] font-black w-4 h-4 flex items-center justify-center">
                {readyOrders.length}
              </span>
            )}
          </div>
          <span className="mt-0.5">Pickup</span>
        </button>

        <button
          onClick={() => setTab('MENU')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold min-h-[44px] ${
            tab === 'MENU' ? 'text-primary-blue' : 'text-slate-500'
          }`}
        >
          <Utensils className="w-5 h-5" />
          <span className="mt-0.5">Menu</span>
        </button>

        <button
          onClick={() => setTab('ACCOUNT')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold min-h-[44px] ${
            tab === 'ACCOUNT' ? 'text-primary-blue' : 'text-slate-500'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="mt-0.5">Account</span>
        </button>
      </nav>

      {/* ========================================================= */}
      {/* MODAL: TIME SUGGESTION */}
      {/* ========================================================= */}
      {suggestOrderId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-xl animate-scaleUp">
            <h3 className="text-sm font-black text-text-primary">Suggest Different Pickup Time</h3>
            <p className="text-xs text-text-secondary mt-1">
              Choose an alternative time (08:00 to 17:00). Customer will accept or decline.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Proposed Time (24h format):
                </label>
                <input
                  type="time"
                  min="08:00"
                  max="17:00"
                  value={suggestTimeStr}
                  onChange={e => setSuggestTimeStr(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:border-primary-blue min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Note to Customer (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Current slot is full, this time is ready faster"
                  value={suggestNote}
                  onChange={e => setSuggestNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setSuggestOrderId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSuggestTime}
                className="px-4 py-2 rounded-xl text-xs font-black bg-primary-blue hover:bg-blue-600 text-white shadow-tactile min-h-[44px]"
              >
                Send Suggestion
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
                  placeholder="e.g. Masala Dosa"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-primary-blue min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    placeholder="e.g. 50"
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-primary-blue min-h-[44px]"
                  />
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

              <div>
                <label className="font-bold text-slate-700 block mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://... (Persistent image link)"
                  value={formImage}
                  onChange={e => setFormImage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none min-h-[44px]"
                />
              </div>

              {/* Toggles */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formIsVeg}
                    onChange={e => setFormIsVeg(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-blue"
                  />
                  <span>Vegetarian</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formIsTodaysMenu}
                    onChange={e => setFormIsTodaysMenu(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-blue"
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
                  className="px-5 py-2 rounded-xl text-xs font-black bg-primary-blue hover:bg-blue-600 text-white shadow-tactile min-h-[44px]"
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
                  className="px-5 py-2 rounded-xl text-xs font-black bg-primary-blue hover:bg-blue-600 text-white shadow-tactile min-h-[44px]"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
