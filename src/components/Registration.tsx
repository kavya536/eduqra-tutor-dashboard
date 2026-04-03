import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, BadgeCheck, Video, User, Mail, Phone, Lock, Award, ShieldCheck, Clock, Globe, Wallet, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface RegistrationProps {
  onComplete: () => void;
  onSwitchToLogin: () => void;
}

export function Registration({ onComplete, onSwitchToLogin }: RegistrationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      // Wait for success animation then complete
      setTimeout(() => {
        onComplete();
      }, 200);
    }, 100);
  };

  return (
    <div className="fixed inset-0 bg-background z-[9999] overflow-y-auto selection:bg-primary/20">
      <div className="flex flex-col items-center py-10 px-6 gap-10 max-w-5xl mx-auto relative">
        
        {/* Floating Background Elements */}
        <motion.div 
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-40 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"
        />
        <motion.div 
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-40 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10"
        />

        {/* Centered Header & Branding */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <h1 className="text-4xl font-black text-primary tracking-tight mb-1 drop-shadow-sm">Eduqra</h1>
          <p className="label-caps opacity-60">Global Academic Atelier</p>
        </motion.div>

        {/* Main Form Card */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full bg-white/80 backdrop-blur-3xl p-8 md:p-12 rounded-4xl atelier-card-shadow border border-white/30 relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-on-surface tracking-tight mb-2">Tutor Registration</h2>
              <p className="text-base text-on-surface-variant font-bold opacity-60">Join our specialized teaching network and empower students worldwide.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {isSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-200">
                    <Check className="w-12 h-12 text-white stroke-[4px]" />
                  </div>
                  <h2 className="text-2xl font-black text-primary mb-2">Registration Complete!</h2>
                  <p className="text-slate-500 font-bold">Welcome to the Eduqra family. Redirecting to your dashboard...</p>
                </motion.div>
              ) : (
                <div className="space-y-8">
                  {/* Personal Info Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="label-caps ml-2">Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input type="text" placeholder="Enter full name" className="input-field" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps ml-2">Email ID</label>
                      <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input type="text" placeholder="example@eduqra.com" className="input-field" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps ml-2">Mobile Number</label>
                      <div className="relative group">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input type="text" placeholder="+1 234 567 890" className="input-field" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps ml-2">Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input type="password" placeholder="Create secure password" className="input-field" />
                      </div>
                    </div>
                  </div>

                  {/* Professional Info & Certifications */}
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="label-caps ml-2">Highest Qualification</label>
                        <div className="relative group">
                          <Award className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                          <input type="text" placeholder="e.g. PhD in Physics" className="input-field" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="label-caps ml-2">Experience (Years)</label>
                        <input type="number" placeholder="Years of teaching" className="input-field" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-5xl flex flex-col items-center text-center relative hover:border-primary hover:bg-primary/5 transition-all group cursor-pointer h-full">
                        <BadgeCheck className="w-10 h-10 text-slate-400 mb-3 group-hover:text-primary transition-all group-hover:-translate-y-1" />
                        <p className="font-black text-lg text-on-surface mb-1 leading-tight">Identity Proof</p>
                        <p className="text-[10px] text-on-surface-variant font-bold opacity-50 uppercase tracking-widest">Aadhaar / PAN</p>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>

                      <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-5xl flex flex-col items-center text-center relative hover:border-primary hover:bg-primary/5 transition-all group cursor-pointer h-full">
                        <GraduationCap className="w-10 h-10 text-slate-400 mb-3 group-hover:text-primary transition-all group-hover:-translate-y-1" />
                        <p className="font-black text-lg text-on-surface mb-1 leading-tight">Certificates</p>
                        <p className="text-[10px] text-on-surface-variant font-bold opacity-50 uppercase tracking-widest">Degrees / Awards</p>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>

                      <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-5xl flex flex-col items-center text-center relative hover:border-primary hover:bg-primary/5 transition-all group cursor-pointer h-full">
                        <Video className="w-10 h-10 text-slate-400 mb-3 group-hover:text-primary transition-all group-hover:-translate-y-1" />
                        <p className="font-black text-lg text-on-surface mb-1 leading-tight">Demo Video</p>
                        <p className="text-[10px] text-on-surface-variant font-bold opacity-50 uppercase tracking-widest">30-40 min session</p>
                        <input type="file" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-8">
                {!isSuccess && (
                  <>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn-primary text-lg py-5 rounded-3xl shadow-2xl shadow-primary/20 hover:shadow-primary/40 tracking-tight disabled:opacity-70 group"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-3">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Clock className="w-7 h-7" />
                          </motion.div>
                          <span>Initializing Workspace...</span>
                        </div>
                      ) : (
                        <span className="group-hover:tracking-[0.1em] transition-all duration-300">
                          Complete Registration
                        </span>
                      )}
                    </button>
                    
                    <div className="text-center mt-8">
                      <p className="text-sm font-bold text-on-surface-variant">
                        Already have an account?{' '}
                        <button 
                          type="button"
                          onClick={onSwitchToLogin}
                          className="text-primary font-black hover:underline ml-1 transition-all hover:tracking-tight"
                        >
                          Sign In
                        </button>
                      </p>
                    </div>
                  </>
                )}

                <p className="text-center text-[11px] text-on-surface-variant mt-10 font-black uppercase tracking-widest opacity-40 flex items-center justify-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" /> Data handled strictly via Eduqra Privacy Protocols
                </p>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Branding & Perks Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full bg-primary p-10 md:p-14 rounded-4xl flex flex-col items-center justify-center text-center relative overflow-hidden text-white shadow-2xl"
        >
          {/* Decorative Circles */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-black/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 w-full">
            <h2 className="text-2xl md:text-3xl font-black mb-8 leading-tight tracking-tight">Join our elite network of verified tutors today.</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Flexible Remote Hours', icon: Clock, desc: 'Set your own schedule and teach from anywhere in the world.' },
                { title: 'Transparent Payouts', icon: Wallet, desc: 'Direct, on-time payments with clear earnings tracking.' },
                { title: 'Global Audience Reach', icon: Globe, desc: 'Connect with students across continents and cultures.' },
              ].map((perk, i) => (
                <motion.div
                  key={perk.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/10 p-8 rounded-5xl backdrop-blur-xl flex flex-col items-center border border-white/20 hover:-translate-y-2 hover:bg-white/20 transition-all duration-500 cursor-pointer group shadow-xl"
                >
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all border border-white/5 shadow-inner">
                    <perk.icon className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-bold text-lg leading-tight mb-2 uppercase tracking-tight">{perk.title}</h4>
                  <p className="text-sm md:text-base font-bold text-white mb-2 leading-relaxed opacity-100">{perk.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
        
        <div className="pb-12 text-on-surface-variant font-bold text-xs opacity-30 uppercase tracking-widest">© 2026 Eduqra Learning Technologies</div>
      </div>
    </div>
  );
}
