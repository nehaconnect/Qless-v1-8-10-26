'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Building2,
  Sparkles,
  Store,
  MapPin,
  Clock,
  Landmark,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { authClient } from '@/lib/auth/auth-client';
import { QLessLogo } from './QLessLogo';

interface LoginPageProps {
  onSuccess: (user: any) => void;
}

interface CollegeOption {
  id: string;
  code: string;
  name: string;
  address?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Common Registration form fields
  const [regRole, setRegRole] = useState<'CUSTOMER' | 'SELLER'>('CUSTOMER');
  const [regFullName, setRegFullName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regUsernameRaw, setRegUsernameRaw] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Seller-only Application Fields
  const [businessName, setBusinessName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [businessType, setBusinessType] = useState('individual canteen operator');
  const [collegeId, setCollegeId] = useState('');
  const [outletName, setOutletName] = useState('');
  const [outletLocation, setOutletLocation] = useState('');
  const [outletCity, setOutletCity] = useState('Delhi');
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('17:00');
  const [upiId, setUpiId] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);

  // Dynamic colleges from DB
  const [collegesList, setCollegesList] = useState<CollegeOption[]>([]);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch colleges list for seller campus selection
  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await fetch('/api/seller/apply');
        const data = await res.json();
        if (data.colleges && Array.isArray(data.colleges)) {
          setCollegesList(data.colleges);
          if (data.colleges.length > 0 && !collegeId) {
            setCollegeId(data.colleges[0].id);
          }
        }
      } catch {}
    };
    fetchColleges();
  }, []);

  // Derived username with prefix
  const prefix = regRole === 'CUSTOMER' ? 'ctr/' : 'slr/';
  const cleanUsernameRaw = regUsernameRaw
    .trim()
    .toLowerCase()
    .replace(/^(ctr|slr|adm)\//i, '')
    .replace(/[^a-z0-9_]/g, '');
  const fullUsername = `${prefix}${cleanUsernameRaw}`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const trimmedId = identifier.trim();
      const isMobile = /^\d{10}$/.test(trimmedId);

      let res: any;

      if (isMobile) {
        res = await authClient.signIn.phoneNumber({
          phoneNumber: trimmedId,
          password,
        });
      } else {
        let usernameToTry = trimmedId.toLowerCase();
        if (!usernameToTry.includes('/')) {
          usernameToTry = `ctr/${usernameToTry}`;
        }

        res = await authClient.signIn.username({
          username: usernameToTry,
          password,
        });

        if (res?.error && !trimmedId.includes('/')) {
          const sellerRes = await authClient.signIn.username({
            username: `slr/${trimmedId.toLowerCase()}`,
            password,
          });
          if (!sellerRes?.error) {
            res = sellerRes;
          }
        }
      }

      if (res?.error) {
        setError(res.error.message || 'Incorrect username/mobile number or password.');
      } else {
        const sessionRes = await authClient.getSession();
        if (sessionRes.data?.user) {
          onSuccess(sessionRes.data.user);
        } else {
          setError('Session creation failed. Please try again.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Common validations
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!/^\d{10}$/.test(regMobile.trim())) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!cleanUsernameRaw) {
      setError('Please enter a valid username (3–30 lowercase characters).');
      return;
    }

    setIsLoading(true);

    try {
      if (regRole === 'CUSTOMER') {
        // Customer Registration (Better Auth standard registration unchanged)
        const res = await authClient.signUp.email({
          email: regEmail.trim(),
          password: regPassword,
          name: regFullName.trim(),
          username: fullUsername,
          phoneNumber: regMobile.trim(),
          role: 'CUSTOMER',
        } as any);

        if (res?.error) {
          setError(res.error.message || 'Registration failed.');
        } else {
          setSuccessMsg(
            `Registration successful! You can now sign in using username: ${fullUsername} or mobile number: ${regMobile.trim()}`
          );
          setTab('LOGIN');
          setIdentifier(fullUsername);
        }
      } else {
        // Seller Application Submission
        if (!declarationConfirmed) {
          setError('You must confirm the authorisation declaration to operate this outlet.');
          setIsLoading(false);
          return;
        }

        const selectedCollege = collegeId || collegesList[0]?.id;
        if (!selectedCollege) {
          setError('Please select an institution/campus.');
          setIsLoading(false);
          return;
        }

        const res = await fetch('/api/seller/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: regFullName.trim(),
            mobile: regMobile.trim(),
            email: regEmail.trim(),
            usernameRaw: cleanUsernameRaw,
            password: regPassword,
            confirmPassword: regConfirmPassword,
            businessName: businessName.trim(),
            legalName: legalName ? legalName.trim() : undefined,
            businessType,
            collegeId: selectedCollege,
            outletName: outletName.trim(),
            outletLocation: outletLocation.trim(),
            outletCity: outletCity.trim(),
            openingTime: openingTime ? `${openingTime}:00` : '08:00:00',
            closingTime: closingTime ? `${closingTime}:00` : '17:00:00',
            upiId: upiId ? upiId.trim() : undefined,
            gstNumber: gstNumber ? gstNumber.trim() : undefined,
            declarationConfirmed: true,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Seller application failed.');
        }

        setSuccessMsg(
          data.message ||
            'Seller application submitted successfully! Your account and first outlet will remain inactive until contact details and outlet details are verified and approved by QLess administration.'
        );
        setTab('LOGIN');
        setIdentifier(fullUsername);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSellerReg = tab === 'REGISTER' && regRole === 'SELLER';

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className={`sm:mx-auto sm:w-full ${isSellerReg ? 'sm:max-w-2xl' : 'sm:max-w-md'} transition-all duration-300`}>
        {/* Brand Header */}
        <div className="flex justify-center">
          <QLessLogo size="lg" showSubtitle={false} />
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-[#073653] tracking-tight">
          Campus Canteen Order Portal
        </h2>
        <p className="mt-1 text-center text-sm font-semibold text-[#64839A]">
          Indraprastha College for Women (IPCW) • IP Canteen
        </p>

        {/* Tab Toggle */}
        <div className="mt-6 p-1 bg-[#DFF3E8]/80 rounded-2xl flex border border-[#BFEBDD]">
          <button
            type="button"
            onClick={() => { setTab('LOGIN'); setError(null); }}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition ${tab === 'LOGIN' ? 'bg-[#00B894] text-white shadow-sm' : 'text-[#073653] hover:text-[#00B894]'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('REGISTER'); setError(null); }}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition ${tab === 'REGISTER' ? 'bg-[#00B894] text-white shadow-sm' : 'text-[#073653] hover:text-[#00B894]'}`}
          >
            Create Account
          </button>
        </div>
      </div>

      <div className={`mt-6 sm:mx-auto sm:w-full ${isSellerReg ? 'sm:max-w-2xl' : 'sm:max-w-md'} transition-all duration-300`}>
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-card rounded-3xl border border-[#FFE0C7]/80 sm:px-10">
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-4 rounded-2xl bg-[#DFF3E8] border border-[#BFEBDD] text-[#073653] text-xs font-semibold flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#00B894] mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-sm block">Application Received</span>
                <span className="leading-relaxed block">{successMsg}</span>
              </div>
            </div>
          )}

          {tab === 'LOGIN' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#073653] mb-1">
                  Username or Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64839A]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. ctr/siya_sen, slr/soman_singh or 9876500001"
                    className="block w-full pl-10 pr-3.5 py-3 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-sm font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#073653] mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64839A]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="block w-full pl-10 pr-10 py-3 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-sm font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894] focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64839A] hover:text-[#073653]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[#64839A] font-semibold">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#64839A]/40 text-[#00B894] focus:ring-[#00B894]"
                  />
                  <span>Remember me</span>
                </label>
                <a href="#forgot" className="text-[#2B7BFF] hover:underline font-bold">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-tactile w-full mt-2 py-3.5 min-h-[44px] px-4 rounded-xl text-white font-black text-sm bg-[#00B894] shadow-sm hover:bg-[#00a383] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00B894] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Role Picker */}
              <div>
                <label className="block text-xs font-black text-[#073653] mb-1">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setRegRole('CUSTOMER'); setError(null); }}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${regRole === 'CUSTOMER' ? 'bg-[#DFF3E8] border-[#00B894] text-[#073653]' : 'bg-[#FFF5E9]/50 border-[#FFE0C7] text-[#64839A]'}`}
                  >
                    Student (ctr/)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRegRole('SELLER'); setError(null); }}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${regRole === 'SELLER' ? 'bg-[#DFF3E8] border-[#00B894] text-[#073653]' : 'bg-[#FFF5E9]/50 border-[#FFE0C7] text-[#64839A]'}`}
                  >
                    Seller (slr/)
                  </button>
                </div>
              </div>

              {/* Clear Pre-form Copy for Seller Applications */}
              {regRole === 'SELLER' && (
                <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed font-medium">
                    Seller applications are reviewed by QLess administration. Your account will remain inactive
                    until your contact details and first outlet are verified and approved.
                  </p>
                </div>
              )}

              {/* Section 1: Owner / Contact Details */}
              <div className="space-y-3">
                <div className="border-b border-[#FFE0C7]/60 pb-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#64839A]">
                    {regRole === 'SELLER' ? '1. Owner & Account Credentials' : 'Account Details'}
                  </span>
                </div>

                <div className={regRole === 'SELLER' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}>
                  <div>
                    <label className="block text-xs font-black text-[#073653] mb-1">
                      {regRole === 'SELLER' ? 'Owner / Contact Full Name' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Soman Singh"
                      className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-[#073653] mb-1">Mobile Number (10 Digits)</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={regMobile}
                      onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876500001"
                      className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                    />
                  </div>
                </div>

                <div className={regRole === 'SELLER' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}>
                  <div>
                    <label className="block text-xs font-black text-[#073653] mb-1">Desired Username</label>
                    <div className="flex rounded-xl overflow-hidden border border-[#FFE0C7]">
                      <span className="px-3 py-2.5 bg-[#DFF3E8] text-[#073653] text-xs font-black select-none border-r border-[#BFEBDD]">
                        {prefix}
                      </span>
                      <input
                        type="text"
                        required
                        value={regUsernameRaw}
                        onChange={(e) => setRegUsernameRaw(e.target.value)}
                        placeholder="soman_singh"
                        className="flex-1 px-3 py-2.5 bg-[#FFF5E9]/60 text-xs font-semibold text-[#073653] focus:outline-none"
                      />
                    </div>
                    {cleanUsernameRaw && (
                      <p className="text-[10px] text-[#64839A] mt-1 font-mono">
                        Full Username: <strong className="text-[#00B894]">{fullUsername}</strong>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-black text-[#073653] mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="soman@canteen.du.ac.in"
                      className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-[#073653] mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-[#073653] mb-1">Confirm Password</label>
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-type password"
                      className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Seller Application Organisation & First Outlet Details */}
              {regRole === 'SELLER' && (
                <div className="space-y-3 pt-2">
                  <div className="border-b border-[#FFE0C7]/60 pb-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#64839A]">
                      2. Business & First Outlet Details
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-[#073653] mb-1">
                        Business / Brand Name
                      </label>
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Soman Caterers"
                        className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[#073653] mb-1">
                        Legal / Trading Name <span className="font-normal text-[#64839A]">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="e.g. Soman Enterprises Pvt Ltd"
                        className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-[#073653] mb-1">
                        Business Type
                      </label>
                      <select
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                      >
                        <option value="individual canteen operator">Individual Canteen Operator</option>
                        <option value="college canteen">College Canteen</option>
                        <option value="corporate cafeteria">Corporate Cafeteria</option>
                        <option value="food vendor">Food Vendor</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[#073653] mb-1">
                        Institution / Campus
                      </label>
                      <select
                        value={collegeId}
                        onChange={(e) => setCollegeId(e.target.value)}
                        className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                      >
                        {collegesList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-[#073653] mb-1">
                        First Outlet Name
                      </label>
                      <input
                        type="text"
                        required
                        value={outletName}
                        onChange={(e) => setOutletName(e.target.value)}
                        placeholder="e.g. IP Canteen"
                        className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[#073653] mb-1">
                        Outlet City
                      </label>
                      <input
                        type="text"
                        required
                        value={outletCity}
                        onChange={(e) => setOutletCity(e.target.value)}
                        placeholder="e.g. Delhi"
                        className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-[#073653] mb-1">
                      First Outlet Location (within institution / building)
                    </label>
                    <input
                      type="text"
                      required
                      value={outletLocation}
                      onChange={(e) => setOutletLocation(e.target.value)}
                      placeholder="e.g. Near Auditorium Ground, Main Campus"
                      className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-[#073653] mb-1">
                        Proposed Opening Hour
                      </label>
                      <input
                        type="time"
                        required
                        value={openingTime}
                        onChange={(e) => setOpeningTime(e.target.value)}
                        className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[#073653] mb-1">
                        Proposed Closing Hour
                      </label>
                      <input
                        type="time"
                        required
                        value={closingTime}
                        onChange={(e) => setClosingTime(e.target.value)}
                        className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-[#073653] mb-1">
                        UPI / Payment Contact <span className="font-normal text-[#64839A]">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. soman@upi"
                        className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-[#073653] mb-1">
                        GST Number <span className="font-normal text-[#64839A]">(Optional - Not required for pilot)</span>
                      </label>
                      <input
                        type="text"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value)}
                        placeholder="e.g. 07AAAAA0000A1Z5"
                        className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                      />
                    </div>
                  </div>

                  {/* Authorisation Declaration Checkbox */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl bg-[#FFF5E9]/90 border border-[#FFE0C7]">
                      <input
                        type="checkbox"
                        required
                        checked={declarationConfirmed}
                        onChange={(e) => setDeclarationConfirmed(e.target.checked)}
                        className="rounded border-[#64839A]/40 text-[#00B894] focus:ring-[#00B894] mt-0.5"
                      />
                      <span className="text-[11px] text-[#073653] font-semibold leading-relaxed">
                        I hereby declare and confirm that I am authorised to operate this outlet at the specified
                        institution and agree that the outlet will remain inactive until administrative review and
                        approval are completed.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-tactile w-full mt-4 py-3.5 px-4 rounded-xl text-white font-black text-xs bg-[#00B894] hover:bg-[#00a383] shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{regRole === 'SELLER' ? 'Submitting Application...' : 'Creating account...'}</span>
                  </>
                ) : (
                  <>
                    <span>{regRole === 'SELLER' ? 'Submit Seller Application' : 'Create Account'}</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
