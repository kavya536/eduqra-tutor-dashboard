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

import { useAuthStore } from '../store/useAuthStore';
import { authService } from '../services/authService';

export function Profile() {
  const { user, profile } = useAuthStore();
  const [experience, setExperience] = useState(profile?.experience || 'Fresher');
  const [formData, setFormData] = useState({
    name: profile?.displayName || profile?.name || "Tutor",
    email: profile?.email || user?.email || "",
    phone: profile?.phone || profile?.mobile || profile?.phoneNumber || "",
    subjects: Array.isArray(profile?.subjects) ? profile.subjects : (typeof profile?.subjects === 'string' ? profile.subjects.split(',').map((s: string) => s.trim()).filter(Boolean) : []),
    qualification: profile?.qualification || "",
    bio: profile?.bio || "",
    classPricing: profile?.classPricing || "160",
    upiId: profile?.upiId || "",
    subjectsPricing: profile?.subjectsPricing || []
  });
  const [newSubject, setNewSubject] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync with user prop on initial load or if user changes externally
  // Sync with profile from store
  useEffect(() => {
    if (profile) {
      setExperience(profile.experience || 'Fresher');
      const safeSubjects = Array.isArray(profile.subjects) 
        ? profile.subjects 
        : (typeof profile.subjects === 'string' ? profile.subjects.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

      setFormData({
        name: profile.displayName || profile.name || "Tutor",
        email: profile.email || user?.email || "",
        phone: profile.phone || profile.mobile || profile.phoneNumber || "",
        subjects: safeSubjects,
        qualification: profile.qualification || "",
        bio: profile.bio || "",
        classPricing: profile.classPricing || "160",
        upiId: profile.upiId || "",
        subjectsPricing: profile.subjectsPricing || []
      });
    }
  }, [profile, user]);

  const handleSave = async (data: any) => {
    setIsSaving(true);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setIsSaving(false);
      return;
    }
    
    // Validate UPI on save
    if (!data.upiId?.trim()) {
      setErrors(prev => ({...prev, upiId: 'UPI ID is required'}));
      setIsSaving(false);
      return;
    }

    if (!isUpiValid(data.upiId)) {
      setErrors(prev => ({...prev, upiId: 'invalid upi id'}));
      setIsSaving(false);
      return;
    }

    try {
      // Logic for visibility in student search: Needs UPI and Pricing
      const hasPricing = Array.isArray(profile?.pricingEntries) && profile.pricingEntries.length > 0;
      const isPublic = !!data.upiId && hasPricing;
      
      // Re-apply logic: If rejected, set status back to pending
      const updateData: any = {
        name: data.name,
        displayName: data.name,
        email: data.email,
        phone: data.phone,
        qualification: data.qualification,
        subjects: data.subjects,
        experience: data.experience,
        bio: data.bio,
        classPricing: data.classPricing,
        upiId: data.upiId,
        subjectsPricing: data.subjectsPricing,
        isPublic: isPublic
      };

      if (profile?.status === 'rejected') {
        updateData.status = 'pending';
        updateData.reAppliedAt = new Date().toISOString();
      }

      await authService.updateProfile(currentUser.uid, updateData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (e) {
      console.error('Error saving profile:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleExperienceChange = (val: string) => {
    setExperience(val);
  };

  const isUpiValid = (upi: string) => {
    return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi);
  };

  const isFormInvalid = !formData.name?.trim() || !formData.phone?.trim() || !formData.upiId?.trim() || !isUpiValid(formData.upiId);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-black text-on-surface tracking-tight">My Profile</h2>
      
      <div className="bg-white p-8 rounded-3xl atelier-card-shadow space-y-8 border border-surface-variant">
        <div className="flex flex-col sm:flex-row items-center gap-8 mb-10">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-4xl border-4 border-background ring-4 ring-primary/20 transition-transform group-hover:scale-105 overflow-hidden">
               {profile?.profilePic || profile?.avatar ? (
                <img src={profile.profilePic || profile.avatar} className="object-cover" alt="Profile" />
               ) : (
                profile?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'
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
              <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">Qualification</label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={formData.qualification}
                  disabled
                  className="w-full pl-12 pr-4 py-3.5 text-sm font-bold rounded-xl bg-gray-50 text-gray-400 border-none cursor-not-allowed" 
                />
                {errors.qualification && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1">{errors.qualification}</p>}
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
              <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">Class Pricing (starting amount)</label>
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
              <div className="mt-2 ml-1">
                <p className="text-[9px] font-bold text-slate-400 leading-tight italic">
                  * Note: This is a general starting amount for student visibility.
                </p>
              </div>
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

        {/* Legacy Graduate Pricing section removed as per request */}
      </div>
      
      <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleSave({...formData, experience})}
              disabled={isSaving || showSuccess || !formData.name?.trim() || !formData.phone?.trim()}
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
