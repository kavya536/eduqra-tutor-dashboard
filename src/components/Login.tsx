import { Mail, Lock, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface LoginProps {
  onLogin: () => void;
  onSwitchToRegister: () => void;
}

const mapAuthError = (code: string) => {
  switch (code) {
    case 'auth/configuration-not-found':
      return "The Authentication service is not enabled for this project. Please enable Email/Password login in the Firebase Console.";
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return "Invalid email or password. Please try again.";
    case 'auth/too-many-requests':
      return "Too many failed attempts. Try again in a few minutes.";
    case 'auth/network-request-failed':
      return "Network connection issue. Please check your internet.";
    default:
      return "An error occurred. Please try again or contact support.";
  }
};

export function Login({ onLogin, onSwitchToRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [view, setView] = useState<'login' | 'forgot-password'>('login');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin(); 
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(mapAuthError(err.code));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    
    setIsSendingReset(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Check if tutor exists in Firestore first
      const tutorsRef = collection(db, 'tutors');
      const q = query(tutorsRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("No tutor account found with this email address. Please check your spelling or register a new account.");
        return;
      }

      await sendPasswordResetEmail(auth, email);
      setSuccessMessage(`A password reset link has been sent to ${email}`);
    } catch (err: any) {
      console.error("Reset Error:", err);
      setError(mapAuthError(err.code));
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating Background Elements */}
      <motion.div 
        animate={{ 
          y: [0, -20, 0],
          rotate: [0, 5, 0]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-20 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
      />
      <motion.div 
        animate={{ 
          y: [0, 20, 0],
          rotate: [0, -5, 0]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-40 -right-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl"
      />

      <div className="w-full max-w-md relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl font-black text-on-surface tracking-tight mb-2">
            {view === 'login' ? 'Welcome Back' : 'Reset Password'}
          </h1>
          <p className="label-caps opacity-60">
            {view === 'login' 
              ? 'Log in to your Eduqra tutor dashboard' 
              : 'Enter your email to receive a reset link'}
          </p>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white/80 backdrop-blur-3xl p-8 rounded-4xl atelier-card-shadow border border-white/30 space-y-6"
        >
          <form onSubmit={view === 'login' ? handleLogin : handleForgotPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="label-caps ml-2">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.j@eduqra.com" 
                  className="input-field" 
                  required
                />
              </div>
            </div>

            {view === 'login' && (
              <div className="space-y-3">
                <label className="label-caps ml-2">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="input-field" 
                    required={view === 'login'}
                  />
                </div>
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={() => { setView('forgot-password'); setError(null); setSuccessMessage(null); }}
                    className="text-[11px] font-black text-primary uppercase tracking-widest hover:underline transition-all hover:tracking-tight"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3 text-rose-600"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-[10px] font-bold">{error}</p>
                </motion.div>
              )}
              {successMessage && (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3 text-emerald-600"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <p className="text-[10px] font-bold">{successMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <button 
                type="submit"
                disabled={isLoggingIn || isSendingReset}
                className="w-full btn-primary text-lg py-5 rounded-3xl shadow-2xl shadow-primary/20 hover:shadow-primary/40 tracking-tight disabled:opacity-70 group"
              >
                <span className="group-hover:tracking-[0.1em] transition-all duration-300">
                  {view === 'login' 
                    ? (isLoggingIn ? 'Signing in...' : 'Sign In') 
                    : (isSendingReset ? 'Sending Link...' : 'Send Reset Link')}
                </span>
              </button>

              {view === 'forgot-password' && (
                <button 
                  type="button"
                  onClick={() => { setView('login'); setError(null); setSuccessMessage(null); }}
                  className="w-full flex items-center justify-center gap-2 text-[11px] font-black text-primary uppercase tracking-widest hover:tracking-tighter transition-all"
                >
                  <ArrowLeft size={14} /> Back to Login
                </button>
              )}

              {view === 'login' && (
                <div className="text-center pt-2">
                  <p className="text-sm font-bold text-on-surface-variant">
                    Don't have an account?{' '}
                    <button 
                      type="button" 
                      onClick={onSwitchToRegister}
                      className="text-primary font-black hover:underline transition-all hover:tracking-tight"
                    >
                      Sign Up
                    </button>
                  </p>
                </div>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
