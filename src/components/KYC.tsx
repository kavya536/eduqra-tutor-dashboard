import { ShieldCheck, Upload, CheckCircle2, AlertCircle, Plus, Trash2, Landmark, DollarSign, ArrowRight, RefreshCw, XCircle, CreditCard, ChevronRight, Lock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, ReactNode, useRef, ChangeEvent } from 'react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/useAuthStore';
import { authService } from '../services/authService';

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-black">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
            <XCircle className="text-slate-400" size={24} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export function KYC() {
  const { profile } = useAuthStore();
  
  const [kycStatus, setKycStatus] = useState<'not_submitted' | 'pending' | 'verified'>(
    profile?.status === 'approved' ? 'verified' : (profile?.status === 'pending' ? 'pending' : 'not_submitted')
  );
  
  const [idFile, setIdFile] = useState<string | null>(null);
  const [idFilePreview, setIdFilePreview] = useState<string | null>(profile?.documents?.identityProof || null);
  const [photoFile, setPhotoFile] = useState<string | null>(null);
  const [photoFilePreview, setPhotoFilePreview] = useState<string | null>(profile?.documents?.profileImage || null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, type: 'id' | 'photo') => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      if (type === 'id') {
        setIdFile(file.name);
        setIdFilePreview(preview);
      } else {
        setPhotoFile(file.name);
        setPhotoFilePreview(preview);
      }
      setError(null);
    }
  };
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [balance, setBalance] = useState(1450.00);
  const [paymentMethods, setPaymentMethods] = useState([
    { id: '1', type: 'UPI', value: profile?.upiId || 'Not Set', label: 'Primary UPI', isUPI: true },
  ]);

  const [transactions] = useState([
    { id: 'SETL001', date: '2026-05-02', amount: 450.00, type: 'Class Settlement', student: 'Aravind K.', status: 'settled' },
    { id: 'SETL002', date: '2026-05-02', amount: 500.00, type: 'Class Settlement', student: 'Isha S.', status: 'processing' },
    { id: 'SETL003', date: '2026-04-30', amount: 500.00, type: 'Class Settlement', student: 'Rahul M.', status: 'settled' },
  ]);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!idFile && !photoFile) {
      setError("Please upload both ID proof and profile photo.");
    } else if (!idFile) {
      setError("Please upload ID Proof (Aadhaar/PAN).");
    } else if (!photoFile) {
      setError("Please upload Profile Photo.");
    } else {
      setError(null);
      setKycStatus('pending');
      
      try {
        await authService.updateProfile(profile.id, {
          status: 'pending',
          kyc_submitted_at: new Date().toISOString()
        });
      } catch (err) {
        console.error(err);
        setError("Failed to submit documents");
        setKycStatus('not_submitted');
      }
    }
  };

  const removeMethod = (id: string) => {
    setPaymentMethods(paymentMethods.filter(m => m.id !== id));
  };

  const addMethod = () => {
    if (paymentMethods.length >= 2) return;
    const newMethod = {
      id: Date.now().toString(),
      type: 'UPI',
      value: 'alex@upi',
      label: 'Secondary UPI',
      isUPI: true
    };
    setPaymentMethods([...paymentMethods, newMethod]);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <ShieldCheck className="text-primary" size={28} /> KYC & Payments
        </h1>
        <p className="text-xs font-bold text-slate-500 opacity-80 ml-1">
          Monitor your earnings and verified settlement status.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* KYC Section */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Identity Verification</h3>
            <span className={cn(
              "text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-widest transition-all duration-500",
              kycStatus === 'not_submitted' ? "bg-slate-100 text-slate-500" :
              kycStatus === 'pending' ? "bg-amber-100 text-amber-600 animate-pulse" : "bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-100/50"
            )}>
              {kycStatus === 'verified' ? (
                <span className="flex items-center gap-1.5"><CheckCircle2 size={12} /> Verified Tutor</span>
              ) : kycStatus.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">ID Proof (Aadhaar / PAN)</label>
              <input 
                type="file" 
                ref={idInputRef} 
                onChange={(e) => handleFileChange(e, 'id')} 
                className="hidden" 
                accept=".pdf,.png,.jpg,.jpeg"
              />
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => kycStatus === 'not_submitted' && idInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center text-center cursor-pointer transition-all h-[160px] justify-center relative group",
                  idFile ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50/50 hover:border-primary hover:bg-white"
                )}
              >
                {idFile ? (
                  <div className="flex flex-col items-center w-full">
                    {idFilePreview && !idFile.toLowerCase().endsWith('.pdf') ? (
                      <div className="relative mb-3">
                        <img src={idFilePreview} className="w-16 h-16 object-cover rounded-xl shadow-lg border-2 border-white ring-4 ring-primary/5" alt="ID Preview" />
                        <div className="absolute -right-1.5 -top-1.5 bg-primary text-white p-0.5 rounded-full shadow-md">
                          <CheckCircle2 size={12} />
                        </div>
                      </div>
                    ) : (
                      <CheckCircle2 className="w-10 h-10 text-primary mb-3" />
                    )}
                    <p className="text-[11px] font-black text-slate-800 leading-tight px-4 truncate w-full">{idFile}</p>
                    {kycStatus === 'not_submitted' && (
                      <span className="absolute bottom-3 text-[8px] font-black uppercase tracking-[0.2em] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to Change
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-[11px] font-black text-slate-800 leading-tight">Upload Document</p>
                  </>
                )}
              </motion.div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Profile Photo</label>
              <input 
                type="file" 
                ref={photoInputRef} 
                onChange={(e) => handleFileChange(e, 'photo')} 
                className="hidden" 
                accept="image/*"
              />
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => kycStatus === 'not_submitted' && photoInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center text-center cursor-pointer transition-all h-[160px] justify-center relative group",
                  photoFile ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50/50 hover:border-primary hover:bg-white"
                )}
              >
                {photoFile ? (
                  <div className="flex flex-col items-center w-full">
                    {photoFilePreview ? (
                      <div className="relative mb-3">
                        <img src={photoFilePreview} className="w-16 h-16 object-cover rounded-xl shadow-lg border-2 border-white ring-4 ring-primary/5" alt="Photo Preview" />
                        <div className="absolute -right-1.5 -top-1.5 bg-primary text-white p-0.5 rounded-full shadow-md">
                          <CheckCircle2 size={12} />
                        </div>
                      </div>
                    ) : (
                      <CheckCircle2 className="w-10 h-10 text-primary mb-3" />
                    )}
                    <p className="text-[11px] font-black text-slate-800 leading-tight px-4 truncate w-full">{photoFile}</p>
                    {kycStatus === 'not_submitted' && (
                      <span className="absolute bottom-3 text-[8px] font-black uppercase tracking-[0.2em] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to Change
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-[11px] font-black text-slate-800 leading-tight">Upload Photo</p>
                  </>
                )}
              </motion.div>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-600 mb-2"
            >
              <AlertCircle size={16} />
              <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
            </motion.div>
          )}

          <button 
            onClick={handleSubmit}
            disabled={kycStatus !== 'not_submitted'}
            className={cn(
              "w-full font-black py-5 rounded-2xl transition-all shadow-xl text-[11px] uppercase tracking-[0.2em]",
              kycStatus === 'not_submitted' 
                ? "bg-primary text-white hover:brightness-110 active:scale-95 shadow-primary/20" 
                : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
            )}
          >
            {kycStatus === 'not_submitted' ? 'Submit for Verification' : 'Documents Under Review'}
          </button>
        </div>

        {/* Automatic Settlement & Earnings */}
        <div className="space-y-6">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-[#004AAD] text-white p-10 rounded-[2.5rem] shadow-2xl shadow-blue-500/20 relative overflow-hidden group"
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Settled Earnings (UPI)</span>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white/80" />
              </div>
            </div>
            <h3 className="text-4xl font-black tracking-tight mb-8">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">Pending Settlement</p>
                  <p className="text-xl font-black">₹500.00</p>
                </div>
                <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-xl border border-amber-500/30">
                  <RefreshCw size={12} className="animate-spin" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Processing</span>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-3 py-3 border-t border-white/5 mt-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                <span className="text-[9px] font-black text-white/70 uppercase tracking-[0.2em]">Automatic UPI Settlements Enabled</span>
              </div>
            </div>
          </motion.div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <Landmark size={18} className="text-primary" /> Primary UPI Destination
              </h3>
            </div>
            
            <div className="space-y-4">
              {paymentMethods.filter(m => m.isUPI).map((method) => (
                <div 
                  key={method.id}
                  className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm text-primary font-black text-[10px]">
                      UPI
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{method.value}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{method.label}</p>
                    </div>
                  </div>
                  <CheckCircle2 size={18} className="text-emerald-500" />
                </div>
              ))}
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center px-4">
                Payments are automatically sent to your primary UPI ID within 3-4 hours of class completion.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settlement Passbook Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Landmark className="text-primary" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Settlement Passbook</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Recent Class Payouts</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="text-left px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Payout ID</th>
                <th className="text-left px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="text-left px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Student / Type</th>
                <th className="text-left px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="text-left px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 text-xs font-black text-slate-800">{txn.id}</td>
                  <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(txn.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-black text-slate-800">{txn.student}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{txn.type}</p>
                  </td>
                  <td className="px-8 py-5 text-xs font-black text-slate-900">₹{txn.amount.toFixed(2)}</td>
                  <td className="px-8 py-5 text-right">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                      txn.status === 'settled' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {txn.status === 'settled' ? <CheckCircle2 size={10} /> : <RefreshCw size={10} className="animate-spin" />}
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10 flex items-start gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
          <ShieldCheck className="text-primary" size={24} />
        </div>
        <div>
          <h4 className="font-black text-sm text-primary mb-1">Guaranteed Financial Safety</h4>
          <p className="text-xs text-on-surface-variant font-medium leading-relaxed max-w-2xl">
            Eduqra ensures that every completed class is settled directly to your primary UPI ID. Our verification team reviews class logs immediately upon completion to guarantee your 3-4 hour payment window.
          </p>
        </div>
      </div>
    </div>
  );
}
