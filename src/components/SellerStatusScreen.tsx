'use client';

import React from 'react';
import {
  Clock,
  ShieldAlert,
  XCircle,
  Building2,
  MapPin,
  Calendar,
  LogOut,
  Mail,
  Phone,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { IdentityBar } from './IdentityBar';

interface SellerStatusScreenProps {
  user: any;
  profile: any;
  onLogout: () => void;
}

export const SellerStatusScreen: React.FC<SellerStatusScreenProps> = ({ user, profile, onLogout }) => {
  const status = profile?.approvalStatus?.toUpperCase() || 'PENDING_REVIEW';
  const isPending =
    status === 'PENDING_REVIEW' ||
    status === 'PENDING_APPROVAL' ||
    status === 'PENDING_CONTACT_VERIFICATION';
  const isRejected = status === 'REJECTED';
  const isDeactivated = status === 'DEACTIVATED';

  const sellerOperator = profile?.name || user?.name || 'Seller Applicant';
  const institution = profile?.collegeName || 'Indraprastha College for Women (IPCW)';
  const outlet = profile?.outletName || profile?.canteenName || 'First Outlet (Pending)';

  return (
    <div className="max-w-4xl mx-auto py-2 px-4 sm:px-6">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#FFE0C7]/80 shadow-card p-6 sm:p-10 space-y-8">
        {/* Main Status Header */}
        <div className="text-center max-w-xl mx-auto space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl shadow-sm mb-2">
            {isPending && (
              <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
              </div>
            )}
            {isRejected && (
              <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-rose-600" />
              </div>
            )}
            {isDeactivated && (
              <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-300 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-slate-700" />
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#073653] tracking-tight">
            {isPending && 'Seller Application Under Review'}
            {isRejected && 'Seller Application Rejected'}
            {isDeactivated && 'Seller Account Deactivated'}
          </h1>

          <p className="text-sm font-semibold text-[#64839A] leading-relaxed">
            {isPending && (
              <>
                Your application to operate an outlet on the QLess campus network has been received and is
                currently under administrative review. Your workspace will remain inactive until your contact
                details and first outlet are verified and approved.
              </>
            )}
            {isRejected && (
              <>
                Your seller application was not approved by QLess administration. You cannot access the seller
                portal or operations workspace.
              </>
            )}
            {isDeactivated && (
              <>
                This seller account has been deactivated by administration. Active operations and customer
                ordering for this outlet are suspended.
              </>
            )}
          </p>
        </div>

        {/* Rejection / Deactivation Reason Banner */}
        {(isRejected || isDeactivated) && profile?.rejectionReason && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-700">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Reason Provided by Administration</span>
            </div>
            <p className="text-sm font-semibold pl-6">{profile.rejectionReason}</p>
          </div>
        )}

        {/* Real Contact Verification State */}
        <div className="p-5 rounded-2xl bg-[#FFF5E9]/70 border border-[#FFE0C7] space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#073653] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#FF9F43]" />
            <span>Contact Details & Verification State</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Mobile Verification */}
            <div className="p-3.5 rounded-xl bg-white/80 border border-[#FFE0C7] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#64839A]" />
                <div>
                  <p className="text-xs font-bold text-[#073653]">+91 {profile?.phoneNumber || user?.phoneNumber}</p>
                  <p className="text-[10px] text-[#64839A]">Mobile Contact</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                {profile?.phoneVerificationStatus === 'VERIFIED_BY_ADMIN' || profile?.phoneVerificationStatus === 'VERIFIED'
                  ? 'Verified'
                  : 'Pending Admin Verification'}
              </span>
            </div>

            {/* Email Verification */}
            <div className="p-3.5 rounded-xl bg-white/80 border border-[#FFE0C7] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#64839A]" />
                <div>
                  <p className="text-xs font-bold text-[#073653]">{profile?.email || user?.email}</p>
                  <p className="text-[10px] text-[#64839A]">Email Address</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                {profile?.emailVerificationStatus === 'VERIFIED_BY_ADMIN' || profile?.emailVerificationStatus === 'VERIFIED'
                  ? 'Verified'
                  : 'Pending Admin Verification'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[#64839A] italic">
            Automated SMS/Email delivery channels are unconfigured in this pilot environment. Contact authenticity is
            directly reviewed and confirmed by QLess administration during application evaluation.
          </p>
        </div>

        {/* Application Summary Card */}
        <div className="p-5 rounded-2xl bg-[#DFF3E8]/60 border border-[#BFEBDD] space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#073653] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#00B894]" />
            <span>Submitted First Outlet Application Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs pt-1">
            <div className="p-3 rounded-xl bg-white/80 border border-[#BFEBDD]">
              <span className="text-[10px] text-[#64839A] font-bold uppercase">Business / Brand</span>
              <p className="font-extrabold text-[#073653] mt-0.5">{profile?.businessName || '--'}</p>
            </div>

            <div className="p-3 rounded-xl bg-white/80 border border-[#BFEBDD]">
              <span className="text-[10px] text-[#64839A] font-bold uppercase">First Outlet Name</span>
              <p className="font-extrabold text-[#073653] mt-0.5">{profile?.outletName || '--'}</p>
            </div>

            <div className="p-3 rounded-xl bg-white/80 border border-[#BFEBDD]">
              <span className="text-[10px] text-[#64839A] font-bold uppercase">Campus / Institution</span>
              <p className="font-extrabold text-[#073653] mt-0.5">{institution}</p>
            </div>

            <div className="p-3 rounded-xl bg-white/80 border border-[#BFEBDD]">
              <span className="text-[10px] text-[#64839A] font-bold uppercase">Outlet Location</span>
              <p className="font-extrabold text-[#073653] mt-0.5">{profile?.outletLocation || '--'}</p>
            </div>

            <div className="p-3 rounded-xl bg-white/80 border border-[#BFEBDD]">
              <span className="text-[10px] text-[#64839A] font-bold uppercase">City</span>
              <p className="font-extrabold text-[#073653] mt-0.5">{profile?.outletCity || 'Delhi'}</p>
            </div>

            <div className="p-3 rounded-xl bg-white/80 border border-[#BFEBDD]">
              <span className="text-[10px] text-[#64839A] font-bold uppercase">Proposed Operating Hours</span>
              <p className="font-extrabold text-[#073653] mt-0.5">
                {profile?.openingTime ? `${profile.openingTime.slice(0, 5)} – ${profile.closingTime ? profile.closingTime.slice(0, 5) : '17:00'}` : '08:00 – 17:00'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-[#64839A]">
            Username: <strong className="text-[#073653] font-mono">{user?.username}</strong>
          </p>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-xs font-extrabold bg-[#FFF5E9] text-[#073653] hover:bg-[#FFE0C7] transition border border-[#FFE0C7]"
          >
            <LogOut className="w-4 h-4 text-[#64839A]" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
