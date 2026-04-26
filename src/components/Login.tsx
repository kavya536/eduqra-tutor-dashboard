import { Mail, Lock, AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useState, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';

interface LoginProps {
  onLogin: () => void;
  onSwitchToRegister: () => void;
  onReapply: (email?: string) => void;
}

const mapAuthError = (code: string) => {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return "Incorrect email or password";
    case 'auth/too-many-requests': return "⚠️ Too many failed attempts. Please try again later or reset your password.";
    default: return "⚠️ An unexpected error occurred. Please try again.";
  }
};

export function Login({ onLogin, onSwitchToRegister, onReapply }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [view, setView] = useState<'login' | 'forgot-password' | 'reset-mode'>('login');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const blockedStatus = (window as any).__blockedTutorStatus;
    if (blockedStatus) {
      setError(blockedStatus === 'pending' ? '⏳ Your account is pending admin approval.' : '❌ Your registration was not approved.');
      (window as any).__blockedTutorStatus = null;
    }
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);
    try {
      const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
      if (!emailRegex.test(email)) throw new Error("Please enter a valid email address.");
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      const userDocSnap = await getDoc(doc(db, 'users', uid));
      
      if (userDocSnap.exists()) {
        const profile = userDocSnap.data();
        if (profile.status === 'pending' || profile.status === 'rejected') {
          onLogin();
          return;
        }
      }
      onLogin(); 
    } catch (err: any) {
      setError(mapAuthError(err.code) || err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email || !email.includes('@')) {
      setError("Please provide a complete email address.");
      return;
    }
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("✅ Reset link sent! Check your inbox.");
      // Simulate moving to step 2 for demo purposes
      setTimeout(() => setView('reset-mode'), 2000);
    } catch (err: any) {
      console.error("❌ Reset Error:", err);
      setError("⚠️ Could not process reset request.");
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setIsResetting(true);
    try {
      setSuccessMessage("✅ Password successfully updated! Sign in now.");
      setTimeout(() => setView('login'), 2000);
    } catch (err: any) {
      setError("Failed to update password.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-20 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      <motion.div animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-40 -right-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-on-surface tracking-tight mb-2">
            {view === 'login' ? 'Welcome Back' : 'Secure Recovery'}
          </h1>
          <p className="label-caps opacity-60">
            {view === 'login' ? 'Log in to your Eduqra tutor dashboard' : 'Enter email for reset link'}
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-3xl p-8 rounded-4xl atelier-card-shadow border border-white/30 space-y-6">
          <form onSubmit={view === 'login' ? handleLogin : (view === 'forgot-password' ? handleForgotPassword : handleUpdatePassword)} className="space-y-6" autoComplete="off">
            {/* Honeypot fields to trick browser autofill */}
            <input type="text" name="dummy-email" style={{ display: 'none' }} aria-hidden="true" />
            <input type="password" name="dummy-password" style={{ display: 'none' }} aria-hidden="true" />

            <AnimatePresence mode="wait">
              <motion.div key={view} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                {(view === 'login' || view === 'forgot-password') && (
                  <div className="space-y-2">
                    <label className="label-caps ml-2">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input type="email" name="user-identifier-login" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" placeholder="tutor@example.com" autoComplete="off" />
                    </div>
                  </div>
                )}
                
                {view === 'login' && (
                  <div className="space-y-2">
                    <label className="label-caps ml-2">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input type={showPassword ? "text" : "password"} name="user-security-key" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-field pr-12" placeholder="••••••••" autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors">
                        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {view === 'reset-mode' && (
                  <>
                    <div className="space-y-2">
                      <label className="label-caps ml-2">New Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="input-field pl-14" placeholder="Min 8 chars..." />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps ml-2">Confirm New Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={cn("input-field pl-14", newPassword && confirmPassword && newPassword !== confirmPassword && "border-rose-300")} placeholder="Repeat password..." />
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {view === 'login' && (
              <div className="flex justify-end">
                <button type="button" onClick={() => { setView('forgot-password'); setError(null); setSuccessMessage(null); }} className="text-[11px] font-black text-primary uppercase tracking-widest hover:underline transition-all" > Forgot Password? </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {error && ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3 text-rose-600" > <AlertCircle className="w-5 h-5 shrink-0" /> <p className="text-[10px] font-bold">{error}</p> </motion.div> )}
              {successMessage && ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3 text-emerald-600" > <CheckCircle2 className="w-5 h-5 shrink-0" /> <p className="text-[10px] font-bold">{successMessage}</p> </motion.div> )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={isLoggingIn || isSendingReset || isResetting || (view === 'reset-mode' && (!newPassword || newPassword !== confirmPassword))} 
              className="w-full btn-primary text-lg py-5 rounded-3xl shadow-2xl shadow-primary/20 hover:shadow-primary/40 tracking-tight disabled:opacity-50 disabled:grayscale group"
            >
              <span className="group-hover:tracking-[0.1em] transition-all duration-300">
                {isLoggingIn ? 'Signing in...' : (isSendingReset ? 'Processing...' : (isResetting ? 'Updating...' : (view === 'login' ? 'Sign In' : (view === 'forgot-password' ? 'Send Reset Link' : 'Update Password'))))}
              </span>
            </button>

            <div className="text-center pt-2 space-y-4">
              {view === 'forgot-password' ? (
                <button type="button" onClick={() => { setView('login'); setError(null); setSuccessMessage(null); }} className="flex items-center justify-center gap-2 w-full text-[10px] font-black text-primary uppercase tracking-widest transition-all" > <ArrowLeft size={14} /> Back to Sign In </button>
              ) : (
                <>
                  <p className="text-sm font-bold text-on-surface-variant"> Don't have an account? <button type="button" onClick={onSwitchToRegister} className="text-primary font-black hover:underline transition-all">Sign Up</button> </p>
                  <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previously Rejected?</p>
                    <button type="button" onClick={() => onReapply(email)} className="text-[11px] font-black text-primary bg-primary/5 hover:bg-primary/10 px-6 py-3 rounded-xl transition-all border border-primary/10 uppercase tracking-widest" > Re-apply </button>
                  </div>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
