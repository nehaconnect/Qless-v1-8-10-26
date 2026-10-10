'use client';

import React, { useState, useEffect } from 'react';
import { Search, Store, X, Check, Loader2, AlertCircle, Eye } from 'lucide-react';

export interface SellerSelection {
  userId: string;
  name: string;
  username: string;
  phoneNumber?: string;
  canteenId: string;
  canteenName: string;
}

interface SearchableSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSeller: (seller: SellerSelection) => void;
  currentSelectedSellerId?: string | null;
}

export const SearchableSellerModal: React.FC<SearchableSellerModalProps> = ({
  isOpen,
  onClose,
  onSelectSeller,
  currentSelectedSellerId,
}) => {
  const [sellers, setSellers] = useState<SellerSelection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSellers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/sellers');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load sellers');

        const approvedList: SellerSelection[] = (data.sellers || [])
          .filter((s: any) => s.approvalStatus === 'APPROVED' && s.canteenId)
          .map((s: any) => ({
            userId: s.userId,
            name: s.name || s.username,
            username: s.username,
            phoneNumber: s.phoneNumber || '',
            canteenId: s.canteenId,
            canteenName: s.canteenName || 'Campus Canteen',
          }));

        setSellers(approvedList);
      } catch (err: any) {
        setError(err.message || 'Could not load approved seller list.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSellers();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSellers = sellers.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      s.canteenName.toLowerCase().includes(q) ||
      (s.phoneNumber && s.phoneNumber.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog Box */}
      <div className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-[#BFEBDD] p-6 z-10 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#BFEBDD]/60 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#073653] text-white flex items-center justify-center font-bold shadow-sm">
              <Eye className="w-5 h-5 text-[#00B894]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#073653]">Select Seller Workspace</h3>
              <p className="text-xs text-[#64839A] font-semibold">Switch into a real, isolated seller canteen workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-[#64839A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search seller by name, username, or canteen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#DFF3E8]/40 border border-[#BFEBDD] rounded-xl text-xs font-semibold text-[#073653] placeholder-[#64839A] focus:outline-none focus:ring-2 focus:ring-[#00B894] transition"
            autoFocus
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Seller List */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="py-12 text-center text-xs font-bold text-[#64839A] flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-[#00B894] animate-spin" />
              <span>Loading approved sellers...</span>
            </div>
          ) : filteredSellers.length === 0 ? (
            <div className="py-8 text-center text-xs font-bold text-[#64839A]">
              {searchQuery ? 'No matching approved sellers found.' : 'No approved sellers configured.'}
            </div>
          ) : (
            filteredSellers.map(seller => {
              const isSelected = currentSelectedSellerId === seller.userId;
              return (
                <button
                  key={seller.userId}
                  onClick={() => {
                    onSelectSeller(seller);
                    onClose();
                  }}
                  className={`w-full p-3.5 rounded-2xl text-left border transition flex items-center justify-between min-h-[52px] ${
                    isSelected
                      ? 'bg-[#00B894] text-white border-[#00B894] shadow-sm'
                      : 'bg-white hover:bg-[#DFF3E8]/50 border-slate-200 text-[#073653]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#073653] text-[#00B894]'
                    }`}>
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-xs font-black ${isSelected ? 'text-white' : 'text-[#073653]'}`}>
                          {seller.name}
                        </h4>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {seller.username}
                        </span>
                      </div>
                      <p className={`text-[11px] font-semibold mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-[#64839A]'}`}>
                        Canteen: <strong className={isSelected ? 'text-white' : 'text-[#073653]'}>{seller.canteenName}</strong>
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-white text-[#00B894] flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-4 pt-3 border-t border-[#BFEBDD]/60 flex justify-between items-center text-[11px] text-[#64839A]">
          <span>View-As maintains Admin session and logs all mutations.</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#073653] font-bold transition min-h-[36px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
