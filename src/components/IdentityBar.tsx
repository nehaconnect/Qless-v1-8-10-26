'use client';

import React from 'react';
import { Building2, Landmark, Store, User, ShieldCheck, Clock, XCircle, AlertTriangle } from 'lucide-react';

export interface IdentityBarProps {
  organisation?: string;
  institution?: string;
  outlet?: string;
  sellerOperator?: string;
  sellerStatus?: string;
  adminContext?: string;
  role?: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  canteensList?: Array<{ id: string; name: string }>;
  selectedCanteenId?: string;
  onSelectCanteen?: (canteenId: string) => void;
  className?: string;
}

export const IdentityBar: React.FC<IdentityBarProps> = ({
  organisation = process.env.NEXT_PUBLIC_QLess_ORGANISATION || 'QLess Pilot',
  institution = 'Indraprastha College for Women (IPCW)',
  outlet = 'IP Canteen',
  sellerOperator,
  sellerStatus,
  adminContext,
  role,
  canteensList,
  selectedCanteenId,
  onSelectCanteen,
  className = '',
}) => {
  // Format seller status display
  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const normalized = status.toUpperCase();

    if (normalized === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>Approved</span>
        </span>
      );
    }
    if (normalized === 'PENDING_REVIEW' || normalized === 'PENDING_APPROVAL' || normalized === 'PENDING_CONTACT_VERIFICATION') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
          <span>Pending review</span>
        </span>
      );
    }
    if (normalized === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>Rejected</span>
        </span>
      );
    }
    if (normalized === 'DEACTIVATED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-200 text-slate-800 border border-slate-300">
          <AlertTriangle className="w-3 h-3 text-slate-600" />
          <span>Deactivated</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-700">
        <span>{status}</span>
      </span>
    );
  };

  return (
    <div
      data-testid="identity-bar"
      className={`w-full mb-4 px-4 py-2.5 bg-white/90 backdrop-blur-md rounded-2xl border border-[#BFEBDD] shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs ${className}`}
    >
      {/* Context Metadata Pills */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-5">
        {/* Organisation */}
        <div className="flex items-center gap-1.5" title="Configurable Organisation Context">
          <Building2 className="w-3.5 h-3.5 text-[#00B894] flex-shrink-0" />
          <span className="text-[#64839A] font-medium text-[11px]">Organisation:</span>
          <span className="font-extrabold text-[#073653] tracking-tight">{organisation}</span>
        </div>

        <span className="hidden sm:inline text-slate-300 font-light">•</span>

        {/* Institution */}
        <div className="flex items-center gap-1.5" title="Campus / Institution Context">
          <Landmark className="w-3.5 h-3.5 text-[#2B7BFF] flex-shrink-0" />
          <span className="text-[#64839A] font-medium text-[11px]">Institution:</span>
          <span className="font-extrabold text-[#073653] tracking-tight">{institution}</span>
        </div>

        <span className="hidden sm:inline text-slate-300 font-light">•</span>

        {/* Outlet Context */}
        <div className="flex items-center gap-1.5" title="Active Outlet / Canteen">
          <Store className="w-3.5 h-3.5 text-[#FF9F43] flex-shrink-0" />
          <span className="text-[#64839A] font-medium text-[11px]">Outlet:</span>
          {role === 'CUSTOMER' && canteensList && canteensList.length > 0 && onSelectCanteen ? (
            <select
              value={selectedCanteenId}
              onChange={(e) => onSelectCanteen(e.target.value)}
              className="py-1 px-2.5 bg-[#FFF5E9]/80 border border-[#FFE0C7] rounded-lg text-xs font-black text-[#073653] focus:outline-none focus:ring-1 focus:ring-[#00B894] cursor-pointer"
            >
              {canteensList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-extrabold text-[#073653] tracking-tight">{outlet}</span>
          )}
        </div>
      </div>

      {/* Seller Specific Operator & Status Context */}
      {(role === 'SELLER' || sellerOperator || sellerStatus) && (
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 pl-0 sm:pl-3 sm:border-l border-slate-200">
          {sellerOperator && (
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#073653] flex-shrink-0" />
              <span className="text-[#64839A] font-medium text-[11px]">Seller / Operator:</span>
              <span className="font-extrabold text-[#073653]">{sellerOperator}</span>
            </div>
          )}

          {sellerStatus && (
            <div className="flex items-center gap-1.5">
              <span className="text-[#64839A] font-medium text-[11px]">Status:</span>
              {getStatusBadge(sellerStatus)}
            </div>
          )}
        </div>
      )}

      {/* Admin Specific Context */}
      {role === 'ADMIN' && (
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 pl-0 sm:pl-3 sm:border-l border-slate-200">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00B894] flex-shrink-0" />
            <span className="text-[#64839A] font-medium text-[11px]">Context:</span>
            <span className="font-extrabold text-[#073653]">{adminContext || 'Campus Administration / All Outlets'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
