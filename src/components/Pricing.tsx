import { Save, CheckCircle2, AlertCircle, Star, Lock } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface PricingProps {
  experience: number;
}

export function Pricing({ experience }: PricingProps) {
  const [rate, setRate] = useState(experience < 1 ? 0 : 1200);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const isPro = experience > 5;
  const isFresher = experience < 1;
  const isDisabled = isFresher;

  const handleSave = () => {
    if (isDisabled) return;
    setStatus('success');
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">Pricing</h2>
        {isFresher && (
          <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full border border-amber-200 animate-pulse">
            <Lock className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Pricing Locked</span>
          </div>
        )}
      </div>
      
      <div className={cn(
        "bg-white p-10 rounded-[2.5rem] atelier-card-shadow max-w-3xl space-y-8 border border-surface-variant relative overflow-hidden transition-all",
        isDisabled && "opacity-80 grayscale-[0.5]"
      )}>
        {isDisabled && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-10 text-center">
            <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-surface-variant max-w-sm space-y-4">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-on-surface">Experience Required</h3>
              <p className="text-sm font-bold text-on-surface-variant leading-relaxed">
                To maintain quality standards, tutors must have at least <span className="text-primary underline decoration-2 underline-offset-4">1 year of experience</span> to set custom pricing.
              </p>
              <div className="bg-slate-50 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500">
                Current Experience: {experience} Years
              </div>
            </div>
          </div>
        )}

        <div className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 shadow-sm transition-all",
          isPro ? "bg-primary/10 border-primary text-primary" : 
          isFresher ? "bg-green-50 border-green-200 text-green-600" :
          "bg-slate-50 border-slate-200 text-slate-500"
        )}>
          {isPro ? <Star className="w-4 h-4 fill-primary" /> : <Star className="w-4 h-4" />}
          <span className="text-[10px] font-black uppercase tracking-widest">
            {isPro ? 'Premium Pricing Unlocked' : isFresher ? 'Fresher Benefit Mode' : 'Standard Pricing Mode'}
          </span>
        </div>

        {isFresher && (
          <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100 flex items-start gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h4 className="font-black text-green-700">Community Support Program</h4>
              <p className="text-xs font-bold text-green-600/80 mt-1">As a tutor with less than 1 year of experience, you can offer classes for free to build your profile or set a minimal rate. This helps students find affordable help while you gain experience!</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black mb-3 uppercase tracking-wider text-on-surface-variant">Class Rate (per hour)</label>
            <div className="flex items-center gap-4">
              <span className="text-3xl font-black text-primary">₹</span>
              <div className="relative w-full sm:w-1/2">
                <input 
                  type="number" 
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full p-5 rounded-2xl text-2xl font-black bg-slate-50 border-none focus:ring-2 focus:ring-primary outline-none shadow-inner" 
                />
                {isFresher && rate === 0 && (
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Free Class
                  </div>
                )}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isPro && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-8 pt-8 border-t border-surface-variant"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[10px] font-black mb-3 uppercase tracking-wider text-on-surface-variant">Specialization Fee</label>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold opacity-40">₹</span>
                      <input type="number" placeholder="500" className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none focus:ring-2 ring-primary font-bold text-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black mb-3 uppercase tracking-wider text-on-surface-variant">Trial Session Rate</label>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold opacity-40">₹</span>
                      <input type="number" placeholder="400" className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none focus:ring-2 ring-primary font-bold text-lg" />
                    </div>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[10px] font-black mb-3 uppercase tracking-wider text-on-surface-variant">Custom Package Description</label>
                    <textarea rows={3} placeholder="e.g. 5 Classes at ₹5000 total" className="w-full p-5 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 ring-primary text-sm font-medium resize-none shadow-inner"></textarea>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pt-4 space-y-4">
          <AnimatePresence>
            {status === 'success' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-xl border border-green-100"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-xs font-bold">Pricing settings saved successfully!</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={handleSave}
            disabled={isDisabled}
            className={cn(
              "w-full font-black px-8 py-5 rounded-2xl transition-all text-lg shadow-xl flex items-center justify-center gap-2",
              isDisabled 
                ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                : "bg-primary text-white hover:bg-primary-variant hover:-translate-y-1 hover:shadow-primary/20 active:scale-95"
            )}
          >
            {isDisabled ? 'Pricing Locked' : 'Save Pricing Setup'} <Save className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
