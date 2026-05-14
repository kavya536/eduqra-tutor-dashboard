import { Save, CheckCircle2, AlertCircle, Plus, Trash2, BookOpen, Calendar, Zap, ChevronDown, Award, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';

interface PricingEntry {
  id: string;
  subject: string;
  type: 'hourly' | 'course';
  hourlyRate?: number;
  baseAmount: number; 
  durationDays?: number;
  totalAmountWithFees: number;
}

import { useAuthStore } from '../store/useAuthStore';
import { authService } from '../services/authService';

const PRIMARY_BLUE = "#0047AB";

// Centralized Subject Master System
const SUBJECT_MASTER: Record<string, { name: string, aliases: string[] }> = {
  'mathematics': {
    name: 'Mathematics',
    aliases: ['maths', 'math', 'mathemathics', 'calculus', 'algebra', 'maths 1a', 'maths 1b', 'maths 2a', 'maths 2b', 'discrete mathematics', 'mathematics (b.tech/b.sc)']
  },
  'physics': {
    name: 'Physics',
    aliases: ['phisics', 'phys']
  },
  'chemistry': {
    name: 'Chemistry',
    aliases: ['chemestry', 'chem']
  },
  'biology': {
    name: 'Biology',
    aliases: ['bio', 'biological sciences']
  },
  'computer_science': {
    name: 'Computer Science',
    aliases: ['cs', 'computer', 'programming', 'it', 'java', 'python', 'c programming', 'html/css', 'javascript', 'react.js', 'node.js', 'sql/mysql', 'postgresql', 'artificial intelligence', 'machine learning']
  },
  'english': {
    name: 'English',
    aliases: ['english language', 'literature']
  },
  'social_studies': {
    name: 'Social Studies',
    aliases: ['sst', 'social science', 'history', 'geography', 'civics']
  },
  'hindi': {
    name: 'Hindi',
    aliases: []
  },
  'sanskrit': {
    name: 'Sanskrit',
    aliases: []
  },
  'telugu': {
    name: 'Telugu',
    aliases: []
  },
  'business_studies': {
    name: 'Business Studies',
    aliases: ['business', 'bst']
  },
  'accountancy': {
    name: 'Accountancy',
    aliases: ['accounts', 'accounting']
  },
  'economics': {
    name: 'Economics',
    aliases: ['eco']
  },
  'science': {
    name: 'Science',
    aliases: ['general science']
  },
  'evs': {
    name: 'EVS',
    aliases: ['environmental science']
  }
};

const normalizeSubject = (input: string): string => {
  if (!input) return '';
  const normalized = input.trim().toLowerCase();
  if (SUBJECT_MASTER[normalized]) return normalized;
  for (const [id, data] of Object.entries(SUBJECT_MASTER)) {
    if (data.name.toLowerCase() === normalized) return id;
    if (data.aliases.some(alias => alias.toLowerCase() === normalized)) return id;
  }
  return normalized;
};

const getSubjectName = (id: string): string => {
  if (!id || typeof id !== 'string') return 'General Subject';
  return SUBJECT_MASTER[id]?.name || id.charAt(0).toUpperCase() + id.slice(1);
};

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

export function Pricing() {
  const { profile } = useAuthStore();
  const tutorId = profile?.id || '';
  const targetClasses = profile?.targetClasses || '';
  const [entries, setEntries] = useState<PricingEntry[]>([]);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddingCustom, setIsAddingCustom] = useState<string | null>(null);
  const [customSubject, setCustomSubject] = useState('');
  const [existingCustoms, setExistingCustoms] = useState<string[]>([]);

  // Exact matching based on Registration.tsx options
  const rawClasses = targetClasses || '';
  
  const isGraduate = rawClasses.includes('Graduate');
  const isIntermediate = rawClasses.includes('Intermediate');
  const isSchool = rawClasses.includes('Primary') || rawClasses.includes('Middle') || rawClasses.includes('Nursery') || rawClasses.includes('Secondary') || rawClasses.includes('1-5') || rawClasses.includes('6-10');

  useEffect(() => {
    if (profile?.pricingEntries) {
      setEntries(profile.pricingEntries);
    }
    if (profile?.subjects) {
      const standardSubjects = Object.values(SUBJECT_LISTS).flat();
      const customs = profile.subjects.filter((s: string) => !standardSubjects.includes(s));
      setExistingCustoms(customs);
    }
    setLoading(false);
  }, [profile]);

  const addEntry = () => {
    // Defaulting all to 'hourly' as per request to remove 'monthly'
    setEntries([...entries, { 
      id: Date.now().toString(), 
      subject: '', 
      type: 'hourly', 
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
        if (updates.subject) updated.subject = updates.subject;
        if (updated.type === 'hourly') {
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

    if (entries.length === 0) {
      setValidationError('Add at least one subject to update');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    // Strict Field Validation
    for (const entry of entries) {
      const subName = entry.subject ? getSubjectName(entry.subject) : 'Selected subject';
      
      if (!entry.subject) {
        setValidationError('Subject is required for all entries');
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
        return;
      }
      
      if (entry.type === 'hourly') {
        if (!entry.hourlyRate || entry.hourlyRate <= 0) {
          setValidationError(`Hourly rate is required for ${subName}`);
          setStatus('error');
          setTimeout(() => setStatus('idle'), 3000);
          return;
        }
      } else if (entry.type === 'course') {
        if (!entry.baseAmount || entry.baseAmount <= 0) {
          setValidationError(`Course amount is required for ${subName}`);
          setStatus('error');
          setTimeout(() => setStatus('idle'), 3000);
          return;
        }
        if (!entry.durationDays || entry.durationDays <= 0) {
          setValidationError(`Completion timeline is required for ${subName}`);
          setStatus('error');
          setTimeout(() => setStatus('idle'), 3000);
          return;
        }
      }
    }

    // Optimistic UI: Set success immediately
    setStatus('success');
    
    try {
      // Logic for visibility in student search: Needs UPI and Pricing
      const isPublic = !!profile?.upiId && entries.length > 0;

      await authService.updateProfile(tutorId, {
        pricingEntries: entries,
        price: entries.find(e => e.type === 'hourly')?.hourlyRate || (entries[0]?.baseAmount / 30) || 0,
        subjects: Array.from(new Set(entries.map(e => e.subject))),
        subjectsPricing: Array.from(new Set(entries.map(e => e.subject))).map(sub => {
          const subEntries = entries.filter(e => e.subject === sub);
          const course = subEntries.find(e => e.type === 'course');
          const hourly = subEntries.find(e => e.type === 'hourly');
          return {
            subject: sub,
            price: course?.baseAmount || 0,
            hourlyRate: hourly?.hourlyRate || 0,
            type: (course && hourly) ? 'both' : (course ? 'course' : 'hourly'),
            durationDays: course?.durationDays || null,
            totalPrice: course?.totalAmountWithFees || (hourly?.totalAmountWithFees || 0)
          };
        }),
        isPublic: isPublic
      });
      // Keep success status for a while
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error("Pricing update failed:", err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const getAllowedCategories = () => {
    if (isGraduate) return ["Graduate & Professional"];
    if (isIntermediate) return ["Intermediate (11th & 12th)"];
    if (isSchool) return ["Secondary (Upto 10th)"];
    
    return ["Secondary (Upto 10th)", "Intermediate (11th & 12th)", "Graduate & Professional"];
  };

  const handleAddCustom = () => {
    if (!customSubject.trim()) return;
    const normalized = normalizeSubject(customSubject.trim());
    const display = getSubjectName(normalized);
    if (!existingCustoms.includes(display)) {
      setExistingCustoms([...existingCustoms, display]);
    }
    if (isAddingCustom) {
      updateEntry(isAddingCustom, { subject: normalized });
    }
    setCustomSubject('');
    setIsAddingCustom(null);
  };

  const allowedCategories = getAllowedCategories();

  if (loading) return <div className="p-20 text-center font-black text-[#0047AB] animate-pulse uppercase tracking-[0.2em]">Syncing Pricing...</div>;

  return (
    <div className="space-y-6 py-4 px-2 md:px-0">
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
            <div className="absolute top-5 right-5 flex items-center gap-2 z-10">
               <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[8px] font-black text-slate-400 uppercase tracking-widest shadow-sm">Entry #{index + 1}</div>
               <button 
                 onClick={() => removeEntry(entry.id)} 
                 className="p-2 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 transition-all shadow-sm group/del"
               >
                 <Trash2 size={16} className="transition-transform group-hover/del:scale-110" />
               </button>
            </div>

            <div className="space-y-8 flex-1">
              {/* Type Switcher */}
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                {isGraduate ? (
                  <>
                    <button onClick={() => updateEntry(entry.id, { type: 'hourly' })} className={cn("flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", entry.type === 'hourly' ? "bg-[#0047AB] text-white shadow-lg" : "text-slate-400")}>Hour Rate</button>
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
                  <div className="flex gap-2">
                    <select 
                      value={entry.subject}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_CUSTOM') {
                          setIsAddingCustom(entry.id);
                        } else {
                          updateEntry(entry.id, { subject: e.target.value });
                        }
                      }}
                      className="flex-1 bg-slate-50 border-2 border-slate-100 p-4 pr-12 rounded-2xl font-black text-sm text-slate-800 outline-none focus:border-[#0047AB] focus:bg-white transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select Subject...</option>
                      {allowedCategories.map(cat => (
                        <optgroup key={cat} label={cat} className="text-[#0047AB] font-black bg-white">
                          {SUBJECT_LISTS[cat].map(s => <option key={s} value={s} className="text-slate-700">{s}</option>)}
                        </optgroup>
                      ))}
                      {existingCustoms.length > 0 && (
                        <optgroup label="My Custom Subjects" className="text-emerald-600 font-black bg-white">
                          {existingCustoms.map(s => <option key={s} value={normalizeSubject(s)} className="text-slate-700">{s}</option>)}
                        </optgroup>
                      )}
                      <option value="ADD_CUSTOM" className="text-[#0047AB] font-bold italic">+ Add New Subject...</option>
                    </select>
                    <button 
                      type="button"
                      onClick={() => setIsAddingCustom(entry.id)}
                      className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-[#0047AB] transition-all text-slate-400 hover:text-[#0047AB]"
                      title="Add Custom Subject"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <ChevronDown size={18} className="absolute right-16 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                </div>
              </div>

              {/* Custom Subject Modal/Input */}
              <AnimatePresence>
                {isAddingCustom === entry.id && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0047AB]/5 p-4 rounded-2xl border border-[#0047AB]/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-[#0047AB] uppercase tracking-widest">New Custom Subject</span>
                      <button onClick={() => setIsAddingCustom(null)} className="text-slate-400 hover:text-rose-500"><X size={14} /></button>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="e.g. Sanskrit"
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#0047AB]"
                      />
                      <button onClick={handleAddCustom} className="bg-[#0047AB] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Add</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Fields */}
              <div className="space-y-6">
                {(entry.type === 'hourly') ? (
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
                    {/* Net Monthly Payout display hidden as per request */}
                    {/* <div className="bg-[#0047AB]/5 p-4 sm:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-[#0047AB]/10 text-center">
                       <p className="text-[8px] font-black text-[#0047AB]/50 uppercase tracking-widest mb-1.5">Net Monthly Payout</p>
                       <h3 className="text-xl sm:text-3xl font-black text-[#0047AB]">₹{entry.baseAmount.toLocaleString('en-IN')}</h3>
                    </div> */}
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
                          className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-lg text-slate-800 outline-none focus:border-[#0047AB] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        />
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
                  <CheckCircle2 size={12} /> Updated Successfully
                </motion.div>
              )}
              {status === 'error' && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center gap-2 text-[9px] font-black text-rose-600 uppercase mb-3 bg-rose-50 py-2 px-4 rounded-xl text-center">
                  <AlertCircle size={12} className="shrink-0" /> {validationError}
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
