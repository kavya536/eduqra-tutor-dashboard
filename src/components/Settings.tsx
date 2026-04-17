import { cn } from '../lib/utils';
import { auth, db } from '../firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Bell, Shield, Eye, EyeOff, Lock, Save, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function Settings() {
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [pwdStatus, setPwdStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [prefState, setPrefState] = useState({
    newBookings: true,
    cancellations: true,
    push: false,
    summary: true
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.notificationPreferences) {
          setPrefState(data.notificationPreferences);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleTogglePref = (id: keyof typeof prefState) => {
    setPrefState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSavePrefs = async () => {
    if (!auth.currentUser) return;
    setStatus('saving');
    
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        notificationPreferences: prefState
      });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      console.error('Error saving notification prefs:', e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleUpdatePassword = async () => {
    if (!auth.currentUser || !auth.currentUser.email) return;
    
    if (passwords.new !== passwords.confirm) {
      setErrorMessage("Passwords do not match");
      setPwdStatus('error');
      return;
    }

    if (passwords.new.length < 6) {
      setErrorMessage("Password should be at least 6 characters");
      setPwdStatus('error');
      return;
    }

    setPwdStatus('saving');
    setErrorMessage('');

    try {
      // Re-authenticate first (standard Firebase security requirement for sensitive operations)
      const credential = EmailAuthProvider.credential(auth.currentUser.email, passwords.current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Now update
      await updatePassword(auth.currentUser, passwords.new);
      setPwdStatus('success');
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setPwdStatus('idle'), 3000);
    } catch (e: any) {
      console.error('Error updating password:', e);
      setErrorMessage(e.message || "Failed to update password. Check your current password.");
      setPwdStatus('error');
      setTimeout(() => setPwdStatus('idle'), 5000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-black text-on-surface tracking-tight">Settings</h2>
      
      <div className="bg-white p-8 rounded-3xl atelier-card-shadow space-y-8 max-w-3xl border border-surface-variant">
        {/* Notification Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h4 className="font-bold text-lg">Notification Preferences</h4>
          </div>
          
          <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            {[
              { id: 'newBookings', label: 'Email notifications for new bookings' },
              { id: 'cancellations', label: 'SMS alerts for cancellations' },
              { id: 'push', label: 'Push notifications in browser' },
              { id: 'summary', label: 'Weekly performance summary' },
            ].map((pref, i) => (
              <label key={i} className="flex items-center justify-between group p-2 hover:bg-white rounded-xl transition-all cursor-pointer">
                <span className="text-sm font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">
                  {pref.label}
                </span>
                <button 
                  onClick={() => handleTogglePref(pref.id as any)}
                  className={`w-10 h-5 md:w-11 md:h-5.5 rounded-full transition-all relative ${prefState[pref.id as keyof typeof prefState] ? 'bg-primary' : 'bg-slate-300'}`}
                >
                  <motion.div 
                    animate={{ x: prefState[pref.id as keyof typeof prefState] ? '1.25rem' : '0.15rem' }}
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </button>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleSavePrefs}
              disabled={status === 'saving'}
              className="px-6 py-2.5 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {status === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save Preferences
            </button>
            {status === 'success' && <span className="text-green-500 text-[10px] font-black uppercase tracking-widest">Saved!</span>}
            {status === 'error' && <span className="text-red-500 text-[10px] font-black uppercase tracking-widest">Error Saving</span>}
          </div>
        </div>

        {/* Password Management */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h4 className="font-bold text-lg">Password Management</h4>
          </div>
          
          <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrentPassword ? 'text' : 'password'} 
                    value={passwords.current}
                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                    placeholder="Enter current password"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                  >
                    {showCurrentPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                  <div className="relative">
                    <input 
                      type={showNewPassword ? 'text' : 'password'} 
                      value={passwords.new}
                      onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                      placeholder="Enter new password"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                    >
                      {showNewPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'} 
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                      placeholder="Confirm new password"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                    >
                      {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {errorMessage && (
              <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest ml-1">{errorMessage}</p>
            )}

            <div className="flex items-center gap-4">
              <button 
                onClick={handleUpdatePassword}
                disabled={pwdStatus === 'saving'}
                className="text-[11px] font-black text-primary bg-white border border-primary/20 hover:bg-primary hover:text-white px-8 py-3 rounded-xl transition-all uppercase tracking-widest shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {pwdStatus === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                Update Password
              </button>
              {pwdStatus === 'success' && <span className="text-green-500 text-[10px] font-black uppercase tracking-widest">Password Updated!</span>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
