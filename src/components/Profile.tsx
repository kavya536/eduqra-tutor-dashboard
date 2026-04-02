import { User, Mail, Phone, GraduationCap, Briefcase, FileText, Save } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ProfileProps {
  onExperienceChange: (val: number) => void;
}

export function Profile({ onExperienceChange }: ProfileProps) {
  const [experience, setExperience] = useState(6);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onExperienceChange(experience);
      alert("Profile updated successfully!");
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">Profile</h2>
      
      <div className="bg-white p-8 rounded-3xl atelier-card-shadow w-full max-w-3xl border border-surface-variant">
        <div className="flex flex-col sm:flex-row items-center gap-8 mb-10">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-4xl border-4 border-background ring-4 ring-primary/20 transition-transform group-hover:scale-105">
              AJ
            </div>
            <button className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg border border-slate-100 text-primary hover:bg-primary hover:text-white transition-all">
              <User className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 w-full space-y-4">
            <div>
              <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  defaultValue="Alex Johnson" 
                  className="w-full pl-12 pr-4 py-3.5 text-sm font-bold rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary outline-none shadow-inner" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="email" 
                    defaultValue="alex.j@eduqra.com" 
                    className="w-full pl-12 pr-4 py-3.5 text-sm font-bold rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary outline-none shadow-inner" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="tel" 
                    defaultValue="+91 98765 43210" 
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
              <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">Subjects</label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  defaultValue="Mathematics, Physics, Calculus" 
                  className="w-full pl-12 pr-4 py-3.5 text-sm font-bold rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary outline-none shadow-inner" 
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">Experience (Years)</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="number" 
                  value={experience}
                  onChange={(e) => setExperience(Number(e.target.value))}
                  className="w-full pl-12 pr-4 py-3.5 text-sm font-bold rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary outline-none shadow-inner" 
                />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-black mb-1.5 uppercase tracking-wider text-on-surface-variant">Bio</label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
              <textarea 
                rows={4} 
                className="w-full pl-12 pr-4 py-4 text-sm font-medium rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary outline-none resize-none shadow-inner"
                defaultValue="Passionate educator making complex math simple and accessible for all students. Specialized in competitive exam preparation."
              />
            </div>
          </div>
        </div>
        
        <div className="pt-8">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "bg-primary text-white font-black px-10 py-4 rounded-2xl hover:bg-primary/90 transition-all text-sm shadow-xl hover:shadow-primary/20 active:scale-95 flex items-center gap-2",
              isSaving && "opacity-70 cursor-wait"
            )}
          >
            {isSaving ? "Saving..." : "Save Profile Changes"}
            <Save className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
