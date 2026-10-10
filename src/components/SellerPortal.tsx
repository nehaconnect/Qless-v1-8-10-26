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
  Menu as MenuIcon
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
  customerPhone?: string;
  rejectionNote?: string | null;
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
  price: string | null;
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

  // Orders Tab Filter & Expanded Batches State
  const [ordersFilter, setOrdersFilter] = useState<'REQUESTED' | 'ACTIVE' | 'ALL'>('REQUESTED');
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});

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
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

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

    // Optimistic toggle
    setMenuItems(prev => prev.map(m => (m.id === itemId ? { ...m, isTodaysMenu: !currentVal } : m)));

    try {
      const res = await fetch('/api/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, isTodaysMenu: !currentVal }),
      });
      if (!res.ok) throw new Error('Failed to update Today\'s Menu status.');
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
    setFormPrice(item.price ? item.price : '');
    setFormPriceUnconfirmed(item.price === null);
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
    setFormPriceUnconfirmed(false);
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

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    if (menuFilterCategory === 'ALL') return menuItems;
    if (menuFilterCategory === 'TODAYS') return menuItems.filter(m => m.isTodaysMenu);
    return menuItems.filter(m => m.categoryId === menuFilterCategory);
  }, [menuItems, menuFilterCategory]);

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
                { id: 'ORDERS', label: 'Orders', icon: ShoppingBag, count: incomingRequestedOrders.length },
                { id: 'PREPARATION', label: 'Preparation', icon: ChefHat, count: batchOrdersMap.length },
                { id: 'PICKUP', label: 'Pickup', icon: QrCode, count: readyOrders.length },
                { id: 'MENU', label: 'Menu', icon: Utensils, count: menuItems.length },
                { id: 'ACCOUNT', label: 'Account', icon: User, count: 0 },
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
      {/* DESKTOP SIDEBAR NAVIGATION */}
      {/* ========================================================= */}
      <aside className="hidden md:flex w-[240px] bg-[#DFF3E8]/90 backdrop-blur-md rounded-3xl border border-[#BFEBDD] flex-col shrink-0 p-4 shadow-sm h-fit self-start">
        {/* Canteen Identity */}
        <div className="p-3.5 bg-white/70 rounded-2xl border border-[#BFEBDD]/80 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#073653] text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Store className="w-5 h-5 text-[#00B894]" />
            </div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-extrabold text-[#073653] truncate">{canteenDisplayName}</h2>
              <p className="text-[11px] font-bold text-[#64839A]">Seller Workspace</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5">
          <button
            onClick={() => setTab('ORDERS')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              tab === 'ORDERS'
                ? 'bg-[#00B894] text-white shadow-sm'
                : 'text-[#073653] hover:bg-[#BFEBDD]/50 hover:text-[#073653]'
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

          <button
            onClick={() => setTab('PREPARATION')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              tab === 'PREPARATION'
                ? 'bg-[#00B894] text-white shadow-sm'
                : 'text-[#073653] hover:bg-[#BFEBDD]/50 hover:text-[#073653]'
            }`}
          >
            <div className="flex items-center gap-3">
              <ChefHat className="w-4 h-4" />
              <span>Preparation</span>
            </div>
            {batchOrdersMap.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                tab === 'PREPARATION' ? 'bg-white text-[#00B894]' : 'bg-amber-500 text-white'
              }`}>
                {batchOrdersMap.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('PICKUP')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              tab === 'PICKUP'
                ? 'bg-[#00B894] text-white shadow-sm'
                : 'text-[#073653] hover:bg-[#BFEBDD]/50 hover:text-[#073653]'
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

          <button
            onClick={() => setTab('MENU')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              tab === 'MENU'
                ? 'bg-[#00B894] text-white shadow-sm'
                : 'text-[#073653] hover:bg-[#BFEBDD]/50 hover:text-[#073653]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Utensils className="w-4 h-4" />
              <span>Menu</span>
            </div>
            <span className="text-[10px] text-[#64839A] font-semibold">{menuItems.length} items</span>
          </button>

          <button
            onClick={() => setTab('ACCOUNT')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition min-h-[44px] ${
              tab === 'ACCOUNT'
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

        {/* Quick Refresh Button & Footer Slogan */}
        <div className="pt-4 border-t border-[#BFEBDD]/80 space-y-3">
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
      </aside>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================= */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Top Header: Hamburger on Mobile + Canteen Operating Status Switcher */}
        <div className="bg-surface rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center border border-slate-200"
              aria-label="Open navigation drawer"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
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
                Hours: <span className="font-semibold text-slate-700">8:00 AM to 5:00 PM IST</span> • 15-Minute Batch Queue
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
            {/* 1. ORDERS SECTION (Expandable/Collapsible 15-min Batches) */}
            {/* ========================================================= */}
            {tab === 'ORDERS' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-text-primary">Order Management</h2>
                    <p className="text-xs text-text-secondary">
                      Grouped by 15-minute preparation batches with exact customer pickup times.
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

                {/* Batch-Grouped Orders List */}
                {batchGroups.length === 0 ? (
                  <div className="bg-surface rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                      <Inbox className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-extrabold text-text-primary">
                      {ordersFilter === 'REQUESTED' ? 'No incoming requests.' : 'No orders yet in this workspace.'}
                    </h3>
                    <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                      {ordersFilter === 'REQUESTED'
                        ? 'New customer orders waiting for acceptance will appear here.'
                        : 'Orders placed by customers for this canteen will be displayed here.'}
                    </p>
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
                                      className="bg-white rounded-2xl border-2 border-slate-200/80 p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 transition"
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
                                      <div className="mt-3 pt-3 border-t border-slate-100">
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
                    {batchOrdersMap.map(({ batch, orders, itemsTally }) => {
                      const isBatchStarting = actionLoading[batch.id] === 'STARTING';
                      const isBatchMarkingReady = actionLoading[batch.id] === 'MARKING_BATCH_READY';

                      return (
                        <div
                          key={batch.id}
                          className="bg-surface rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden"
                        >
                          <div className="p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-soft">
                                <Flame className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="text-sm font-black text-text-primary">{batch.displayLabel}</h3>
                                <p className="text-xs text-text-secondary mt-0.5">
                                  {orders.length} committed order{orders.length !== 1 ? 's' : ''} in production
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleStartBatchPrep(batch.id)}
                                disabled={isBatchStarting || isBatchMarkingReady}
                                className="px-4 py-2.5 rounded-xl bg-primary-blue hover:bg-blue-600 text-white text-xs font-extrabold shadow-soft transition flex items-center gap-1.5 min-h-[44px] disabled:opacity-50"
                              >
                                {isBatchStarting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Start All</span>
                              </button>
                              <button
                                onClick={() => handleMarkBatchReady(batch.id)}
                                disabled={isBatchStarting || isBatchMarkingReady}
                                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-soft transition flex items-center gap-1.5 min-h-[44px] disabled:opacity-50"
                              >
                                {isBatchMarkingReady && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Mark Batch Ready</span>
                              </button>
                            </div>
                          </div>

                          <div className="p-5">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                              Aggregated Prep Quantities:
                            </h4>
                            <div className="flex flex-wrap gap-2 mb-5">
                              {Object.entries(itemsTally).map(([itemName, qty]) => (
                                <div
                                  key={itemName}
                                  className="px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200/70 text-xs font-black text-amber-900 flex items-center gap-2"
                                >
                                  <span className="w-5 h-5 rounded-lg bg-amber-200 flex items-center justify-center text-[10px]">
                                    {qty}
                                  </span>
                                  <span>{itemName}</span>
                                </div>
                              ))}
                            </div>

                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                              Order Tickets in this Batch:
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {orders.map(ord => (
                                <div
                                  key={ord.id}
                                  className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/70 flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="font-mono font-black text-slate-700">#{ord.orderNumber}</span>
                                      <span className="text-[11px] font-bold text-primary-blue">
                                        {format12Time(ord.exactPickupTime)}
                                      </span>
                                    </div>
                                    <h5 className="text-xs font-bold text-text-primary mt-1">{ord.customerName}</h5>
                                    <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                                      {ord.items.map((it, idx) => (
                                        <div key={idx}>{it.quantity}× {it.itemName}</div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center">
                                    <span className="text-xs font-black text-deep-blue">₹{parseFloat(ord.totalAmount).toFixed(2)}</span>
                                    <button
                                      onClick={() => handleMarkOrderReady(ord.id)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold min-h-[36px]"
                                    >
                                      Mark Ready
                                    </button>
                                  </div>
                                </div>
                              ))}
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
            {/* 4. MENU SECTION (Dedicated Menu Management) */}
            {/* ========================================================= */}
            {tab === 'MENU' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-extrabold text-text-primary">Menu Management</h2>
                    <p className="text-xs text-text-secondary">
                      Add, edit, change prices, toggle availability, and configure Today's Menu.
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

                {/* Empty State for Fresh Workspace */}
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
                                {item.price !== null ? `₹${parseFloat(item.price).toFixed(2)}` : 'Price not fixed'}
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
                                disabled={isAvailUpdating || item.price === null}
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
