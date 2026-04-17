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
  Save 
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
    bio: user?.bio || ""
  });
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
        bio: user.bio || ""
      });
    }
  }, [user]);

  const handleSave = async (data: any) => {
    if (!auth.currentUser) return;
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
        bio: data.bio
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
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 text-sm font-bold rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary outline-none shadow-inner" 
                />
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
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 text-sm font-bold rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary outline-none shadow-inner" 
                  />
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
                  onChange={(e) => handleInputChange('subjects', e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 text-sm font-bold rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary outline-none shadow-inner" 
                />
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
        </div>
        
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleSave({...formData, experience})}
              disabled={isSaving}
              className="px-8 py-3.5 bg-primary text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              Update Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
