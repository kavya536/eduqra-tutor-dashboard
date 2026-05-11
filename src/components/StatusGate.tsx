import React from 'react';
import { Clock, XCircle, ShieldCheck, LogOut, AlertCircle } from 'lucide-react';

interface StatusGateProps {
  status: 'pending' | 'rejected' | 'verify' | 'error';
  profile?: any;
  user?: any;
  onLogout: () => void;
  onReapply?: () => void;
  onResendVerification?: () => void;
}

export function StatusGate({ status, profile, user, onLogout, onReapply, onResendVerification }: StatusGateProps) {
  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-8 relative">
          <Clock size={40} className="text-amber-500 animate-pulse" />
          <div className="absolute inset-0 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin-slow"></div>
        </div>
        <h2 className="text-3xl font-black mb-4 tracking-tight text-slate-800">Application Under Review</h2>
        <p className="text-slate-500 font-bold max-w-md mb-10 text-sm leading-relaxed">
          Your tutor application is under admin review. <br/>
          <span className="block mt-2 text-primary font-black uppercase text-[11px] tracking-widest">Please wait up to 24 hours for verification and approval.</span>
        </p>

        <div className="max-w-md w-full bg-slate-50/50 border border-slate-100 p-8 rounded-4xl mb-12 text-left">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Verification Progress:</h4>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500/10 rounded-full flex items-center justify-center">
                <span className="text-green-600">✓</span>
              </div>
              <span className="text-sm font-bold text-slate-400 line-through">Profile Registered Successfully</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-amber-500/10 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></div>
              </div>
              <span className="text-sm font-bold text-slate-600">Waiting for Super Admin Approval</span>
            </div>
          </div>
        </div>

        <button onClick={onLogout} className="text-white font-black bg-slate-800 hover:bg-black px-10 py-4 rounded-2xl uppercase text-xs transition-colors shadow-2xl shadow-slate-200">Sign Out</button>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-28 h-28 bg-rose-500 rounded-full flex items-center justify-center mb-10 shadow-2xl shadow-rose-500/30">
          <XCircle size={56} className="text-white" />
        </div>
        <h2 className="text-4xl font-black mb-4 tracking-tight text-on-surface">Application Update</h2>
        <p className="text-rose-600 font-black uppercase text-[10px] mb-8 bg-rose-50 px-4 py-2 rounded-full border border-rose-100">Verification Feedback Received</p>
        
        <div className="max-w-md w-full bg-slate-50 border-l-4 border-rose-500 p-8 rounded-4xl mb-10 text-left">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Feedback from Administration:</p>
          <p className="text-slate-700 font-bold italic text-base leading-relaxed mb-6">"{profile?.rejectionReason || 'Please review your uploaded documents.'}"</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
          <button onClick={onReapply} className="w-full bg-primary text-white font-black px-8 py-5 rounded-2xl shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center justify-center gap-3">
            <ShieldCheck size={18} /> Update Details & Re-apply
          </button>
          <button onClick={onLogout} className="w-full bg-slate-100 text-slate-600 font-black px-8 py-5 rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (status === 'verify') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-12">
          <div className="w-32 h-32 bg-primary/5 rounded-full flex items-center justify-center">
            <div className="w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center relative">
              <div className="absolute inset-[-8px] border-[3px] border-primary/20 border-t-primary rounded-full animate-spin-slow"></div>
              <ShieldCheck size={32} className="text-[#0047AB]" />
            </div>
          </div>
        </div>
        <h2 className="text-5xl font-black mb-6 tracking-tighter text-slate-900">Verify Your Email</h2>
        <p className="text-slate-500 font-bold max-w-md mb-12 text-lg leading-relaxed">
          We've sent a verification link to <span className="text-slate-800">{user?.email}</span>.
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button onClick={onResendVerification} className="w-full bg-[#0047AB] text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest">Resend Magic Link</button>
          <button onClick={onLogout} className="w-full bg-slate-50 text-slate-400 font-black py-5 rounded-[2rem] hover:bg-slate-100 transition-all text-sm uppercase tracking-widest">Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle size={40} className="text-rose-500 mb-4" />
      <p className="text-slate-500 font-bold">Something went wrong. Please try again.</p>
      <button onClick={() => window.location.reload()} className="mt-4 text-primary font-bold underline">Reload Page</button>
    </div>
  );
}
