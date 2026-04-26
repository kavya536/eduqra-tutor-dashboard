import { Save, CheckCircle2, AlertCircle, Plus, Trash2, BookOpen, Calendar, Zap, ChevronDown, Award } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';

interface PricingEntry {
  id: string;
  subject: string;
  type: 'hourly' | 'monthly' | 'course';
  hourlyRate?: number;
  baseAmount: number; 
  durationDays?: number;
  totalAmountWithFees: number;
}

interface PricingProps {
  experience: number;
  tutorId?: string;
  targetClasses?: string;
}

const PRIMARY_BLUE = "#0047AB";

const SUBJECT_LISTS: Record<string, string[]> = {
  "Secondary (Upto 10th)": [
    "Telugu", "English", "Mathematics", "Science", "EVS", "Chemistry", "Biology", "Social Studies", "Hindi", "All Subjects (Upto 10th)"
  ],
  "Intermediate (11th & 12th)": [
    "Sanskrit", "Maths 1A", "Maths 1B", "Maths 2A", "Maths 2B", "Physics", "Chemistry", "JEE Mains/Adv", "EAMCET", "All Subjects (Intermediate)"
  ],
  "Graduate & Professional": [
    "Mathematics (B.Tech/B.Sc)", "Java", "Python", "C Programming", "HTML/CSS", "JavaScript", "React.js", "Node.js", "SQL/MySQL", "PostgreSQL", "Discrete Mathematics", "Artificial Intelligence", "Machine Learning", "All Subjects (Graduate)"
  ]
};

export function Pricing({ experience, tutorId, targetClasses }: PricingProps) {
  const [entries, setEntries] = useState<PricingEntry[]>([]);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(true);

  // Exact matching based on Registration.tsx options
  const rawClasses = targetClasses || '';
  
  const isGraduate = rawClasses.includes('Graduate');
  const isIntermediate = rawClasses.includes('Intermediate');
  const isSchool = rawClasses.includes('Primary') || rawClasses.includes('Middle') || rawClasses.includes('Nursery');

  useEffect(() => {
    if (!tutorId) return;
    const unsub = onSnapshot(doc(db, 'users', tutorId), (snap) => {
      const data = snap.data();
      if (data?.pricingEntries) {
        setEntries(data.pricingEntries);
      } else {
        setEntries([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [tutorId]);

  const addEntry = () => {
    const defaultType = isGraduate ? 'monthly' : 'hourly';
    setEntries([...entries, { 
      id: Date.now().toString(), 
      subject: '', 
      type: defaultType, 
      hourlyRate: 0, 
      baseAmount: 0, 
      totalAmountWithFees: 0 
    }]);
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, updates: Partial<PricingEntry>) => {
    setEntries(entries.map(e => {
      if (e.id === id) {
        const updated = { ...e, ...updates };
        if (updated.type === 'hourly' || updated.type === 'monthly') {
          if (updates.hourlyRate !== undefined) {
             updated.baseAmount = Number(updates.hourlyRate) * 30;
          }
        }
        updated.totalAmountWithFees = updated.baseAmount * 1.17;
        return updated;
      }
      return e;
    }));
  };

  const handleSave = async () => {
    if (!tutorId) return;
    if (entries.length === 0 || entries.some(e => !e.subject || (e.type === 'hourly' && e.hourlyRate === 0) || (e.type === 'course' && e.baseAmount === 0))) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }
    try {
      await updateDoc(doc(db, 'users', tutorId), {
        pricingEntries: entries,
        price: entries[0].hourlyRate || (entries[0].baseAmount / 30),
        subjects: entries.map(e => e.subject),
        subjectsPricing: entries.map(e => ({
          subject: e.subject,
          price: e.baseAmount,
          type: e.type,
          durationDays: e.durationDays || null,
          totalPrice: e.totalAmountWithFees
        }))
      });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
    }
  };

  const getAllowedCategories = () => {
    // Strictly follow user mapping: 
    // - B-Tech (Graduate) -> Graduate & Professional only
    // - Secondary (Upto 10th) -> Intermediate (11th & 12th) only
    if (isGraduate) return ["Graduate & Professional"];
    if (isSchool) return ["Intermediate (11th & 12th)"];
    if (isIntermediate) return ["Intermediate (11th & 12th)"];
    
    // Fallback if none match
    return Object.keys(SUBJECT_LISTS);
  };

  const allowedCategories = getAllowedCategories();

  if (loading) return <div className="p-20 text-center font-black text-[#0047AB] animate-pulse uppercase tracking-[0.2em]">Syncing Pricing...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4 px-2 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="w-1.5 h-8 bg-[#0047AB] rounded-full" />
             <h1 className="text-2xl font-black text-slate-800 tracking-tight">Academic Subject Pricing</h1>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">
            Exclusive to: <span className="text-[#0047AB]">{targetClasses}</span>
          </p>
        </div>
        <button 
          onClick={addEntry}
          className="flex items-center justify-center gap-2 bg-[#0047AB] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-blue-900/10"
        >
          <Plus size={16} /> Add Subject
        </button>
      </div>

      <AnimatePresence>
        {entries.length === 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2rem] flex items-center gap-4 mx-2">
            <AlertCircle className="text-rose-500" size={24} />
            <div>
               <p className="text-sm font-black text-rose-900 leading-none">Setup Missing</p>
               <p className="text-[10px] font-bold text-rose-600 mt-1 uppercase tracking-widest opacity-80">You must list at least one subject to appear in student search results.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-2 md:px-0">
        {entries.map((entry, index) => (
          <motion.div 
            key={entry.id}
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group bg-white border-2 border-slate-100 rounded-[2rem] md:rounded-[3rem] p-5 md:p-8 relative flex flex-col h-full hover:border-[#0047AB] hover:shadow-2xl hover:shadow-blue-900/5 transition-all"
          >
            <div className="absolute top-8 right-8 flex gap-2">
               <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[8px] font-black text-slate-400 uppercase tracking-widest">Entry #{index + 1}</div>
               <button onClick={() => removeEntry(entry.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                 <Trash2 size={18} />
               </button>
            </div>

            <div className="space-y-8 flex-1">
              {/* Type Switcher */}
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                {isGraduate ? (
                  <>
                    <button onClick={() => updateEntry(entry.id, { type: 'hourly' })} className={cn("flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", entry.type === 'hourly' ? "bg-[#0047AB] text-white shadow-lg" : "text-slate-400")}>Hour Rate</button>
                    <button onClick={() => updateEntry(entry.id, { type: 'monthly' })} className={cn("flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", entry.type === 'monthly' ? "bg-[#0047AB] text-white shadow-lg" : "text-slate-400")}>Monthly Rate</button>
                    <button onClick={() => updateEntry(entry.id, { type: 'course' })} className={cn("flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", entry.type === 'course' ? "bg-[#0047AB] text-white shadow-lg" : "text-slate-400")}>Course Type</button>
                  </>
                ) : (
                  <div className="w-full py-3 text-center text-[9px] font-black uppercase tracking-widest text-[#0047AB]">Hourly Recurring Model</div>
                )}
              </div>

              {/* Subject Selection - Matching Image 2 */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                  <BookOpen size={14} className="text-[#0047AB]" /> Selection Course
                </label>
                <div className="relative">
                  <select 
                    value={entry.subject}
                    onChange={(e) => updateEntry(entry.id, { subject: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 pr-12 rounded-2xl font-black text-sm text-slate-800 outline-none focus:border-[#0047AB] focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select Subject...</option>
                    {allowedCategories.map(cat => (
                      <optgroup key={cat} label={cat} className="text-[#0047AB] font-black bg-white">
                        {SUBJECT_LISTS[cat].map(s => <option key={s} value={s} className="text-slate-700">{s}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
              </div>

              {/* Input Fields */}
              <div className="space-y-6">
                {(entry.type === 'hourly' || entry.type === 'monthly') ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">Hourly Rate (Your Share)</label>
                      <div className="bg-white border-2 border-slate-100 p-4 sm:p-6 rounded-[1.5rem] md:rounded-[2rem] flex items-center gap-4 focus-within:border-[#0047AB] transition-all">
                        <span className="text-xl sm:text-3xl font-black text-[#0047AB]">₹</span>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={entry.hourlyRate || ''}
                          onChange={(e) => updateEntry(entry.id, { hourlyRate: Number(e.target.value) })}
                          className="w-full bg-transparent text-xl sm:text-3xl font-black text-slate-800 outline-none"
                        />
                      </div>
                    </div>
                    <div className="bg-[#0047AB]/5 p-4 sm:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-[#0047AB]/10 text-center">
                       <p className="text-[8px] font-black text-[#0047AB]/50 uppercase tracking-widest mb-1.5">Net Monthly Payout</p>
                       <h3 className="text-xl sm:text-3xl font-black text-[#0047AB]">₹{entry.baseAmount.toLocaleString('en-IN')}</h3>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">Course Lump Sum</label>
                      <div className="bg-white border-2 border-slate-100 p-4 sm:p-6 rounded-[1.5rem] md:rounded-[2rem] flex items-center gap-4 focus-within:border-[#0047AB] transition-all">
                        <span className="text-xl sm:text-3xl font-black text-[#0047AB]">₹</span>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={entry.baseAmount || ''}
                          onChange={(e) => updateEntry(entry.id, { baseAmount: Number(e.target.value) })}
                          className="w-full bg-transparent text-xl sm:text-3xl font-black text-slate-800 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">Completion Timeline (Days)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          placeholder="e.g. 60"
                          value={entry.durationDays || ''}
                          onChange={(e) => updateEntry(entry.id, { durationDays: Number(e.target.value) })}
                          className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-lg text-slate-800 outline-none focus:border-[#0047AB] transition-all"
                        />
                        <Calendar size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="pt-12">
        <div className="max-w-md mx-auto relative group">
           <div className="absolute inset-0 bg-[#0047AB] rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
           <div className="relative bg-white border border-white p-3 rounded-[2rem] shadow-2xl">
              <AnimatePresence>
              {status === 'success' && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center gap-2 text-[9px] font-black text-emerald-600 uppercase mb-3 bg-emerald-50 py-2 rounded-xl">
                  <CheckCircle2 size={12} /> Pricing Structure Secured
                </motion.div>
              )}
              {status === 'error' && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center gap-2 text-[9px] font-black text-rose-600 uppercase mb-3 bg-rose-50 py-2 rounded-xl">
                  <AlertCircle size={12} /> Missing Required Logic
                </motion.div>
              )}
              </AnimatePresence>
              <button 
                onClick={handleSave}
                className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                Update Pricing <Save size={18} />
              </button>
           </div>
        </div>
      </div>
      
      <div className="h-20" />
    </div>
  );
}
