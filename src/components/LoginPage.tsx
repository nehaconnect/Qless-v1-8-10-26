'use client';

import React, { useState } from 'react';
import {
  Coffee,
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
  Sparkles
} from 'lucide-react';
import { authClient } from '@/lib/auth/auth-client';

interface LoginPageProps {
  onSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Registration form
  const [regRole, setRegRole] = useState<'CUSTOMER' | 'SELLER'>('CUSTOMER');
  const [regFullName, setRegFullName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regUsernameRaw, setRegUsernameRaw] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Derived username with prefix
  const prefix = regRole === 'CUSTOMER' ? 'ctr/' : 'slr/';
  const cleanUsernameRaw = regUsernameRaw.trim().toLowerCase().replace(/^(ctr|slr|adm)\//i, '').replace(/[^a-z0-9_]/g, '');
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
        // Sign in via phone number plugin
        res = await authClient.signIn.phoneNumber({
          phoneNumber: trimmedId,
          password,
        });
      } else {
        // Sign in via username plugin
        // If user typed username with prefix (ctr/..., slr/..., adm/...), use as-is
        let usernameToTry = trimmedId.toLowerCase();
        if (!usernameToTry.includes('/')) {
          usernameToTry = `ctr/${usernameToTry}`;
        }

        res = await authClient.signIn.username({
          username: usernameToTry,
          password,
        });

        // If prefix was omitted and ctr/ didn't work, try slr/
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
        // Fetch session
        const sessionRes = await authClient.getSession();
        if (sessionRes.data?.user) {
          onSuccess(sessionRes.data.user);
        } else {
          // Hard reload to pick up cookies
          window.location.reload();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Incorrect username/mobile number or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!/^\d{10}$/.test(regMobile.trim())) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (cleanUsernameRaw.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (cleanUsernameRaw.length > 30) {
      setError('Username cannot exceed 30 characters');
      return;
    }

    setIsLoading(true);

    try {
      const email = regEmail.trim() || `${cleanUsernameRaw}@ipcw.du.ac.in`;

      const res = await (authClient as any).signUp.email({
        email,
        password: regPassword,
        name: regFullName.trim(),
        username: fullUsername,
        phoneNumber: regMobile.trim(),
        role: regRole,
      });

      if (res.error) {
        setError(res.error.message || 'Registration failed. Username or mobile may already exist.');
      } else {
        setSuccessMsg(
          regRole === 'CUSTOMER'
            ? 'Registration successful! You can now sign in.'
            : 'Seller registration submitted! Pending administrator approval.'
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

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-deep-blue to-primary-blue flex items-center justify-center text-white shadow-tactile">
            <Coffee className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-text-primary tracking-tight">
          QLess Campus Canteen
        </h2>
        <p className="mt-1 text-center text-sm text-text-secondary">
          Indraprastha College for Women (IPCW) • IP Canteen
        </p>

        {/* Tab Toggle */}
        <div className="mt-6 p-1 bg-slate-200/70 rounded-xl flex">
          <button
            type="button"
            onClick={() => { setTab('LOGIN'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${tab === 'LOGIN' ? 'bg-white text-deep-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('REGISTER'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${tab === 'REGISTER' ? 'bg-white text-deep-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Create Account
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-6 shadow-tactile rounded-3xl border border-slate-200/80 sm:px-10">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-danger text-xs font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'LOGIN' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Username or Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. ctr/siya_sen or 9876500001"
                    className="block w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="block w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-text-secondary">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-primary-blue focus:ring-primary-blue"
                  />
                  <span>Remember me</span>
                </label>
                <a href="#forgot" className="text-primary-blue hover:underline font-semibold">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-tactile w-full mt-2 py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-deep-blue to-primary-blue shadow-soft hover:shadow-tactile hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
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
            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Role Picker */}
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('CUSTOMER')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${regRole === 'CUSTOMER' ? 'bg-soft-blue border-blue-400 text-deep-blue' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    Student (ctr/)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('SELLER')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${regRole === 'SELLER' ? 'bg-soft-blue border-blue-400 text-deep-blue' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    Seller (slr/)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Siya Sen"
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Mobile Number (10 digits)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-medium">
                    +91
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={regMobile}
                    onChange={(e) => setRegMobile(e.target.value)}
                    placeholder="9876500001"
                    className="block w-full pl-12 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Username
                </label>
                <div className="relative flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  <span className="px-3 py-2.5 bg-slate-200/80 text-text-secondary text-xs font-bold select-none flex items-center">
                    {prefix}
                  </span>
                  <input
                    type="text"
                    required
                    value={regUsernameRaw}
                    onChange={(e) => setRegUsernameRaw(e.target.value)}
                    placeholder="siya_sen"
                    className="flex-1 px-3 py-2.5 bg-slate-50 text-sm focus:outline-none focus:bg-white"
                  />
                </div>
                <span className="text-[11px] text-text-secondary mt-0.5 block">
                  Full username will be: <span className="font-semibold text-deep-blue">{fullUsername}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-0.5">College</label>
                  <input
                    type="text"
                    disabled
                    value="IPCW (Default)"
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Canteen</label>
                  <input
                    type="text"
                    disabled
                    value="IP Canteen"
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">Confirm</label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  />
                </div>
              </div>

              {regRole === 'SELLER' && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  ⚠️ Seller accounts require administrator approval before operations can commence.
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-tactile w-full mt-2 py-3 px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-deep-blue to-primary-blue shadow-soft hover:shadow-tactile hover:opacity-95 focus:outline-none disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Register Account</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
