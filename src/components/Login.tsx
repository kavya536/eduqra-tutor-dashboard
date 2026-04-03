import { Mail, Lock } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: () => void;
  onSwitchToRegister: () => void;
}

export function Login({ onLogin, onSwitchToRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    // Simulate login delay
    setTimeout(() => {
      onLogin();
    }, 1000);
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
          <h1 className="text-2xl font-black text-on-surface tracking-tight mb-2">Welcome Back</h1>
          <p className="label-caps opacity-60">Log in to your Eduqra tutor dashboard</p>
        </motion.div>

        <motion.form 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={handleLogin} 
          className="bg-white/80 backdrop-blur-3xl p-8 rounded-4xl atelier-card-shadow border border-white/30 space-y-6"
        >
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
              />
            </div>
          </div>

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
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" className="text-[11px] font-black text-primary uppercase tracking-widest hover:underline transition-all hover:tracking-tight">Forgot Password?</button>
          </div>

          <div className="space-y-4">
            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full btn-primary text-lg py-5 rounded-3xl shadow-2xl shadow-primary/20 hover:shadow-primary/40 tracking-tight disabled:opacity-70 group"
            >
              <span className="group-hover:tracking-[0.1em] transition-all duration-300">
                {isLoggingIn ? 'Signing in...' : 'Sign In'}
              </span>
            </button>

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
          </div>
        </motion.form>
      </div>
    </div>
  );
}
