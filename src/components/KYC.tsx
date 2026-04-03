import { ShieldCheck, Upload, CheckCircle2, AlertCircle, Plus, Trash2, Landmark, DollarSign, ArrowRight, RefreshCw, XCircle, CreditCard, ChevronRight, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, ReactNode } from 'react';
import { cn } from '../lib/utils';

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-surface-variant flex items-center justify-between">
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
  const [kycStatus, setKycStatus] = useState<'not_submitted' | 'pending' | 'verified'>('not_submitted');
  const [idFile, setIdFile] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<string | null>(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [balance, setBalance] = useState(1450.00);
  const [paymentMethods, setPaymentMethods] = useState([
    { id: '1', type: 'UPI', value: 'alex@okaxis', label: 'Primary', isUPI: true },
    { id: '2', type: 'Bank', value: 'HDFC BANK **** 4592', label: 'Savings Account', isUPI: false },
  ]);

  const handleSubmit = () => {
    if (idFile && photoFile) {
      setKycStatus('pending');
      setTimeout(() => setKycStatus('verified'), 3000);
    } else {
      alert("Please upload both ID proof and profile photo.");
    }
  };

  const removeMethod = (id: string) => {
    setPaymentMethods(paymentMethods.filter(m => m.id !== id));
  };

  const addMethod = () => {
    if (paymentMethods.length >= 2) return;
    const newMethod = {
      id: Date.now().toString(),
      type: 'Bank',
      value: 'ICICI BANK **** 1234',
      label: 'Secondary Account',
      isUPI: false
    };
    setPaymentMethods([...paymentMethods, newMethod]);
  };

  const handleWithdraw = (methodId: string) => {
    setWithdrawStatus('processing');
    setTimeout(() => {
      setWithdrawStatus('success');
      setBalance(0);
      setTimeout(() => {
        setIsWithdrawModalOpen(false);
        setWithdrawStatus('idle');
      }, 2500);
    }, 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="page-title">KYC & Payments</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
        {/* KYC Section */}
        <div className="bg-white p-6 md:p-7 rounded-3xl atelier-card-shadow border border-surface-variant space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="subheading">Identity Verification</h3>
            <span className={cn(
              "text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest",
              kycStatus === 'not_submitted' ? "bg-slate-100 text-slate-500" :
              kycStatus === 'pending' ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-700"
            )}>
              {kycStatus.replace('_', ' ')}
            </span>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">ID Proof (Aadhaar / PAN)</label>
              <div 
                onClick={() => setIdFile("id_proof.pdf")}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center text-center cursor-pointer transition-all",
                  idFile ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary hover:bg-slate-50"
                )}
              >
                {idFile ? <CheckCircle2 className="w-8 h-8 text-primary mb-2" /> : <Upload className="w-8 h-8 text-slate-300 mb-2" />}
                <p className="text-xs font-bold text-on-surface">{idFile || "Click to upload ID document"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Profile Photo</label>
              <div 
                onClick={() => setPhotoFile("profile.jpg")}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center text-center cursor-pointer transition-all",
                  photoFile ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary hover:bg-slate-50"
                )}
              >
                {photoFile ? <CheckCircle2 className="w-8 h-8 text-primary mb-2" /> : <Upload className="w-8 h-8 text-slate-300 mb-2" />}
                <p className="text-xs font-bold text-on-surface">{photoFile || "Click to upload profile photo"}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={kycStatus !== 'not_submitted'}
            className="w-full bg-primary text-white font-black py-4 rounded-xl hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {kycStatus === 'not_submitted' ? 'Submit KYC' : 'Under Review'}
          </button>
        </div>

        {/* Payment Methods & Earnings */}
        <div className="space-y-6">
          <div className="bg-primary text-white p-8 rounded-3xl atelier-card-shadow shadow-primary/20 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Available Earnings</span>
              <DollarSign className="w-5 h-5 text-white/50" />
            </div>
            <h3 className="text-2xl font-black tracking-tight mb-4">₹{balance.toFixed(2)}</h3>
            <button 
              onClick={() => setIsWithdrawModalOpen(true)}
              disabled={balance <= 0}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                balance > 0 ? "bg-white text-primary hover:bg-slate-50 hover:scale-105 active:scale-95 shadow-lg" : "bg-white/20 text-white/40 cursor-not-allowed"
              }`}
            >
              Withdraw to UPI <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-4 text-center pb-2">Powered by RazorpayX</p>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-3xl atelier-card-shadow border border-surface-variant">
            <h3 className="subheading mb-4 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-primary" /> Payment Methods
            </h3>
            
            <div className="space-y-4">
              <AnimatePresence>
                {paymentMethods.map((method) => (
                  <motion.div 
                    key={method.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        {method.isUPI ? (
                          <span className="font-black text-primary text-xs">UPI</span>
                        ) : (
                          <Landmark className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{method.value}</p>
                        <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest">{method.label}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeMethod(method.id)}
                      className="text-red-400 hover:text-red-600 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              <button 
                onClick={addMethod}
                disabled={paymentMethods.length >= 2}
                className={cn(
                  "w-full border-2 border-dashed p-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                  paymentMethods.length >= 2 
                    ? "border-slate-100 text-slate-300 cursor-not-allowed opacity-50" 
                    : "border-slate-200 text-slate-400 hover:border-primary hover:text-primary"
                )}
              >
                <Plus className="w-4 h-4" /> 
                {paymentMethods.length >= 2 ? "Account Limit Reached" : "Add New Method"}
              </button>
            </div>
          </div>

          <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h4 className="font-black text-sm text-primary">Secure Payouts</h4>
            </div>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
              Your payment information is encrypted and handled via Razorpay secure financial gateway. Payouts via UPI are processed instantly.
            </p>
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isWithdrawModalOpen} 
        onClose={() => withdrawStatus !== 'processing' ? setIsWithdrawModalOpen(false) : null}
        title="RazorpayX Withdraw"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3 py-6 bg-slate-50 rounded-2xl border border-surface-variant">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Landmark className="text-primary" size={24} />
            </div>
            <h3 className="text-xl font-bold font-serif italic text-on-surface">Eduqra Tutor Payout</h3>
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Available Balance</p>
              <div className="text-3xl font-black text-primary mt-2 flex items-center justify-center gap-1">
                <span>₹</span>{balance.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Payout Method</p>
            
            <div className="grid grid-cols-1 gap-3">
              {paymentMethods.map((method) => (
                <button 
                  key={method.id}
                  disabled={withdrawStatus === 'processing' || withdrawStatus === 'success'}
                  onClick={() => handleWithdraw(method.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    withdrawStatus === 'processing' ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-100' : 
                    withdrawStatus === 'success' ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-100' : 
                    'bg-white border-slate-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center">
                      <CreditCard className="text-primary" size={16} />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-sm text-on-surface block">{method.isUPI ? 'UPI' : 'Bank Transfer'}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{method.value}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {withdrawStatus !== 'idle' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-xl flex items-center gap-3 justify-center ${
                  withdrawStatus === 'processing' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  withdrawStatus === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : ''
                }`}
              >
                {withdrawStatus === 'processing' && (
                  <>
                    <RefreshCw className="animate-spin w-5 h-5" />
                    <span className="text-sm font-bold">Processing instantly...</span>
                  </>
                )}
                {withdrawStatus === 'success' && (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-bold">Withdrawal Successful!</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2">
            <Lock className="w-3 h-3 text-slate-300" />
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Secured by RazorpayX</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
