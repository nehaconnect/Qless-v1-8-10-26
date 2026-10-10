'use client';

import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { authClient } from '@/lib/auth/auth-client';
import { QLessLogo } from './QLessLogo';

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
      setError('Please enter a valid username.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authClient.signUp.email({
        email: regEmail.trim(),
        password: regPassword,
        name: regFullName.trim(),
        username: fullUsername,
        phoneNumber: regMobile.trim(),
        role: regRole,
      } as any);

      if (res?.error) {
        setError(res.error.message || 'Registration failed.');
      } else {
        setSuccessMsg(
          regRole === 'SELLER'
            ? 'Seller account created! Pending Admin approval. You can sign in after approval.'
            : `Registration successful! You can now sign in using username: ${fullUsername} or mobile number: ${regMobile.trim()}`
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
    <div className="min-h-screen bg-transparent flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
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

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/90 backdrop-blur-md py-8 px-6 shadow-card rounded-3xl border border-[#FFE0C7]/80 sm:px-10">
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-2xl bg-[#DFF3E8] border border-[#BFEBDD] text-[#073653] text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#00B894]" />
              <span>{successMsg}</span>
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
                    placeholder="e.g. ctr/siya_sen or 9876500001"
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
            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Role Picker */}
              <div>
                <label className="block text-xs font-black text-[#073653] mb-1">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('CUSTOMER')}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${regRole === 'CUSTOMER' ? 'bg-[#DFF3E8] border-[#00B894] text-[#073653]' : 'bg-[#FFF5E9]/50 border-[#FFE0C7] text-[#64839A]'}`}
                  >
                    Student (ctr/)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('SELLER')}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${regRole === 'SELLER' ? 'bg-[#DFF3E8] border-[#00B894] text-[#073653]' : 'bg-[#FFF5E9]/50 border-[#FFE0C7] text-[#64839A]'}`}
                  >
                    Seller (slr/)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#073653] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Siya Sen"
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
                    placeholder="siya_sen"
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
                  placeholder="siya@ipcw.du.ac.in"
                  className="block w-full px-3.5 py-2.5 bg-[#FFF5E9]/60 border border-[#FFE0C7] rounded-xl text-xs font-semibold text-[#073653] focus:outline-none focus:ring-2 focus:ring-[#00B894]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
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

              <button
                type="submit"
                disabled={isLoading}
                className="btn-tactile w-full mt-3 py-3 px-4 rounded-xl text-white font-black text-xs bg-[#00B894] hover:bg-[#00a383] shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
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
