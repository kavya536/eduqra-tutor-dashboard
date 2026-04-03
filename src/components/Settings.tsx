import { Bell, Shield, Smartphone, Globe, Save } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Settings() {
  const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const handleSave = () => {
    setStatus('saving');
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-black text-on-surface tracking-tight">Settings</h2>
      
      <div className="bg-white p-8 rounded-3xl atelier-card-shadow space-y-8 max-w-3xl border border-surface-variant">
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h4 className="font-bold text-lg">Notification Preferences</h4>
          </div>
          
          <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            {[
              { label: 'Email notifications for new bookings', checked: true },
              { label: 'SMS alerts for cancellations', checked: true },
              { label: 'Push notifications in browser', checked: false },
              { label: 'Weekly performance summary', checked: true },
            ].map((pref, i) => (
              <label key={i} className="flex items-center gap-4 cursor-pointer group p-2 hover:bg-white rounded-xl transition-all">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    defaultChecked={pref.checked}
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary transition-all" 
                  />
                </div>
                <span className="text-sm font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">
                  {pref.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h4 className="font-bold text-lg">Privacy & Security</h4>
          </div>
          
          <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            {[
              { label: 'Make profile visible to public search', checked: true },
              { label: 'Show my experience years on profile', checked: true },
              { label: 'Enable two-factor authentication', checked: false },
            ].map((pref, i) => (
              <label key={i} className="flex items-center gap-4 cursor-pointer group p-2 hover:bg-white rounded-xl transition-all">
                <input 
                  type="checkbox" 
                  defaultChecked={pref.checked}
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary transition-all" 
                />
                <span className="text-sm font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">
                  {pref.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <button 
            onClick={handleSave}
            disabled={status === 'saving'}
            className={cn(
              "bg-primary text-white font-bold px-8 py-4 rounded-xl hover:bg-primary/90 transition-all text-sm shadow-md active:scale-95 flex items-center gap-2",
              status === 'saving' && "opacity-70 cursor-wait"
            )}
          >
            {status === 'saving' ? "Saving..." : status === 'success' ? "Saved!" : "Save Preferences"}
            <Save className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
