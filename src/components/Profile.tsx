import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  Briefcase, 
  FileText, 
  Save,
  IndianRupee,
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileProps {
  onExperienceChange: (val: string) => void;
  user: any;
}

export function Profile({ onExperienceChange, user }: ProfileProps) {
  const [experience, setExperience] = useState(user?.experience || 'Fresher');
  const [formData, setFormData] = useState({
    name: user?.displayName || user?.name || "Tutor",
    email: user?.email || "",
    phone: user?.phone || user?.mobile || user?.phoneNumber || "",
    subjects: user?.qualification || "",
    bio: user?.bio || "",
    classPricing: user?.classPricing || "160",
    upiId: user?.upiId || "",
    subjectsPricing: user?.subjectsPricing || []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync with user prop on initial load or if user changes externally
  useEffect(() => {
    if (user) {
      setExperience(user.experience || 'Fresher');
      setFormData({
        name: user.displayName || user.name || "Tutor",
        email: user.email || "",
        phone: user.phone || user.mobile || user.phoneNumber || "",
        subjects: user.qualification || "",
        bio: user.bio || "",
        classPricing: user.classPricing || "160",
        upiId: user.upiId || "",
        subjectsPricing: user.subjectsPricing || []
      });
    }
  }, [user]);

  const handleSave = async (data: any) => {
    if (!auth.currentUser) return;
    
    const newErrors: Record<string, string> = {};
    if (!data.name?.trim()) newErrors.name = "Name is required";
    if (!data.phone?.trim()) newErrors.phone = "Phone number is required";
    if (!data.subjects?.trim()) newErrors.subjects = "Qualification/subjects are required";
    if (!data.upiId?.trim()) {
      newErrors.upiId = "UPI ID is required";
    } else {
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiRegex.test(data.upiId)) {
        newErrors.upiId = "Please enter a valid UPI ID (e.g. name@bank)";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setIsSaving(true);
    const userRef = doc(db, 'users', auth.currentUser.uid);
    
    try {
      await updateDoc(userRef, {
        name: data.name,
        displayName: data.name,
        email: data.email,
        phone: data.phone,
        qualification: data.subjects,
        experience: data.experience,
        bio: data.bio,
        classPricing: data.classPricing,
        upiId: data.upiId,
        subjectsPricing: data.subjectsPricing
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (e) {
      console.error('Error saving profile:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleExperienceChange = (val: string) => {
    setExperience(val);
    onExperienceChange(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-black text-on-surface tracking-tight">My Profile</h2>
      
      <div className="bg-white p-8 rounded-3xl atelier-card-shadow w-full max-w-3xl border border-surface-variant">
        <div className="flex flex-col sm:flex-row items-center gap-8 mb-10">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-4xl border-4 border-background ring-4 ring-primary/20 transition-transform group-hover:scale-105 overflow-hidden">
               {user?.profilePic || user?.avatar ? (
                <img src={user.profilePic || user.avatar} className="w-full h-full object-cover" alt="Profile" />
               ) : (
                user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'
               )}
            </div>
          </div>
          
          <div className="flex-1 w-full space-y-4">
            <div>
              <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => {
                    handleInputChange('name', e.target.value);
                    if (errors.name) setErrors(prev => ({...prev, name: ''}));
                  }}
                  className={`w-full pl-12 pr-4 py-3.5 text-sm font-bold rounded-xl transition-all ${errors.name ? 'bg-red-50 ring-2 ring-red-500/20' : 'bg-slate-50'} border-none focus:ring-2 focus:ring-primary outline-none shadow-inner`} 
                />
                {errors.name && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1">{errors.name}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input 
                    type="email" 
                    value={formData.email}
                    disabled
                    className="w-full pl-12 pr-4 py-3.5 text-sm font-bold rounded-xl bg-gray-50 text-gray-400 border-none cursor-not-allowed" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => {
                      handleInputChange('phone', e.target.value);
                      if (errors.phone) setErrors(prev => ({...prev, phone: ''}));
                    }}
                    className={`w-full pl-12 pr-4 py-3.5 text-sm font-bold rounded-xl transition-all ${errors.phone ? 'bg-red-50 ring-2 ring-red-500/20' : 'bg-slate-50'} border-none focus:ring-2 focus:ring-primary outline-none shadow-inner`} 
                  />
                  {errors.phone && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1">{errors.phone}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">Subjects / Qualification</label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={formData.subjects}
                  onChange={(e) => {
                    handleInputChange('subjects', e.target.value);
                    if (errors.subjects) setErrors(prev => ({...prev, subjects: ''}));
                  }}
                  className={`w-full pl-12 pr-4 py-3.5 text-sm font-bold rounded-xl transition-all ${errors.subjects ? 'bg-red-50 ring-2 ring-red-500/20' : 'bg-slate-50'} border-none focus:ring-2 focus:ring-primary outline-none shadow-inner`} 
                />
                {errors.subjects && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1">{errors.subjects}</p>}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">Experience</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  value={experience}
                  onChange={(e) => handleExperienceChange(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 text-sm font-bold rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary outline-none shadow-inner appearance-none" 
                >
                  <option value="Fresher">Fresher (0 Years)</option>
                  <option value="1-3 Years">1-3 Years</option>
                  <option value="3-5 Years">3-5 Years</option>
                  <option value="5+ Years">5+ Years</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">Class Pricing (Per Subject)</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={formData.classPricing}
                  onChange={(e) => handleInputChange('classPricing', e.target.value)}
                  placeholder="e.g. 160"
                  className="w-full pl-12 pr-4 py-3.5 text-sm font-bold rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary outline-none shadow-inner" 
                />
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 leading-relaxed">
                * Min class timings: 1 hr or 1:30 hr. If student demands extra 30mins-1hr based on monthly pricing, provide a 10% increase.
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">UPI ID *</label>
              <div className="relative">
                <CreditCard className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.upiId ? 'text-red-400' : 'text-slate-400'}`} />
                  <input 
                    type="text" 
                    value={formData.upiId}
                    onChange={(e) => {
                      handleInputChange('upiId', e.target.value);
                      if (errors.upiId) setErrors(prev => ({...prev, upiId: ''}));
                    }}
                    placeholder="name@upi"
                    className={`w-full pl-12 pr-4 py-3.5 text-sm font-bold rounded-xl transition-all ${errors.upiId ? 'bg-red-50 ring-2 ring-red-500/20' : 'bg-slate-50'} border-none focus:ring-2 focus:ring-primary outline-none shadow-inner`}
                  />
                </div>
                {errors.upiId && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1">{errors.upiId}</p>}
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">Short Bio</label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
              <textarea 
                rows={4} 
                className="w-full pl-12 pr-4 py-4 text-sm font-medium rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary outline-none resize-none shadow-inner"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
              />
          </div>
        </div>

        {(user?.targetClasses?.includes('Graduate') || formData.subjects?.toLowerCase().includes('graduate')) && (
          <div className="pt-6 border-t border-slate-50">

              <label className="block text-[10px] font-black mb-3 uppercase tracking-wider text-primary">Subject-Specific Pricing (Graduate Courses)</label>
              <div className="space-y-4">
                {formData.subjectsPricing?.map((sp: any, idx: number) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-4 items-end animate-in fade-in slide-in-from-left-2 transition-all p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <div className="flex-1 w-full">
                      <label className="text-[9px] font-bold text-slate-400 mb-1 block">Subject (e.g. Java, Python)</label>
                      <input 
                        type="text" 
                        value={sp.subject} 
                        onChange={(e) => {
                          const newPricing = [...formData.subjectsPricing];
                          newPricing[idx].subject = e.target.value;
                          setFormData(prev => ({ ...prev, subjectsPricing: newPricing }));
                        }}
                        placeholder="Subject Name"
                        className="w-full px-4 py-3 text-sm font-bold rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-primary outline-none shadow-sm" 
                      />
                    </div>
                    <div className="w-full sm:w-32">
                      <label className="text-[9px] font-bold text-slate-400 mb-1 block">Your Price (₹)</label>
                      <input 
                        type="number" 
                        value={sp.price} 
                        onChange={(e) => {
                          const newPricing = [...formData.subjectsPricing];
                          newPricing[idx].price = Number(e.target.value);
                          setFormData(prev => ({ ...prev, subjectsPricing: newPricing }));
                        }}
                        className="w-full px-4 py-3 text-sm font-bold rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-primary outline-none shadow-sm" 
                      />
                    </div>
                    <div className="w-full sm:w-40">
                      <label className="text-[9px] font-bold text-blue-400 mb-1 block">Student Price (+17%)</label>
                      <div className="w-full px-4 py-3 text-sm font-bold rounded-xl bg-blue-50 text-blue-700 border border-blue-100 shadow-sm italic">
                        ₹{Math.ceil(sp.price * 1.17)}
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        const newPricing = formData.subjectsPricing.filter((_: any, i: number) => i !== idx);
                        setFormData(prev => ({ ...prev, subjectsPricing: newPricing }));
                      }}
                      className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={() => {
                    const currentPricing = formData.subjectsPricing || [];
                    setFormData(prev => ({ 
                      ...prev, 
                      subjectsPricing: [...currentPricing, { subject: '', price: 0 }] 
                    }));
                  }}
                  className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 hover:bg-primary/10 px-6 py-3 rounded-xl transition-all border border-primary/10"
                >
                  + Add Subject Price
                </button>
              </div>
              <p className="text-[9px] font-bold text-slate-400 mt-4 leading-relaxed">
                * Note: Graduate-level subjects require specific pricing. A platform fee of 17% is added by default to your base price when shown to students.
              </p>
            </div>
          )}
        </div>
        
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleSave({...formData, experience})}
              disabled={isSaving || showSuccess}
              className={`px-8 py-3.5 font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 min-w-[200px] ${
                isSaving 
                  ? 'bg-primary text-white opacity-70 cursor-not-allowed shadow-primary/20' 
                  : showSuccess 
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30 scale-105' 
                    : 'bg-primary text-white shadow-primary/20 hover:scale-105 active:scale-95'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : showSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Updated Successfully!
                </>
              ) : (
                <>
                  <Save size={16} />
                  Update Profile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
