import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Trash2, 
  Upload, 
  File, 
  Image as ImageIcon,
  Check,
  RefreshCw,
  X,
  GraduationCap,
  Eye,
  Loader2,
  FileText,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { projectService } from '../services/projectService';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

import { useAuthStore } from '../store/useAuthStore';
import { useProjectsStore } from '../store/useProjectsStore';
import { useProjectsListener } from '../hooks/useProjectsListener';

export function Projects() {
  // Activate isolated listener for projects
  useProjectsListener();

  const profile = useAuthStore(state => state.profile);
  const projects = useProjectsStore(state => state.projects);
  
  const tutorId = profile?.id || '';
  const tutorName = profile?.name || 'Tutor';
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [fileLoading, setFileLoading] = useState(false);
  const [formData, setFormData] = useState({
    class: '',
    subject: '',
    topic: '',
    file: null as File | null,
    fileBase64: ''
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const formatDateLabel = (ts: any) => {
    if (!ts) return '';
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 700 * 1024) {
        setErrorMessage("File is too large. Max limit 700KB.");
        return;
      }
      
      setFileLoading(true);
      setErrorMessage("");
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ 
          ...prev, 
          file: file,
          fileBase64: reader.result as string 
        }));
        setFileLoading(false);
      };
      reader.onerror = () => {
        setFileLoading(false);
        setErrorMessage("Failed to read file.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (fileLoading) return;

    if (!formData.class.trim() || !formData.subject.trim()) {
      setErrorMessage("Please enter both Class and Subject names.");
      return;
    }

    if (!formData.file || !formData.fileBase64) {
      setErrorMessage("Please select a valid document (PDF or Image) to upload.");
      return;
    }

    setStatus('saving');
    setErrorMessage('');

    try {
      await projectService.addProject(tutorId, tutorName || 'Your Tutor', {
        class: formData.class.trim(),
        subject: formData.subject.trim(),
        topic: formData.topic.trim() || 'General Project',
        fileName: formData.file?.name,
        fileType: formData.file?.type || 'application/pdf',
        fileData: formData.fileBase64,
        isProject: true // Flag to distinguish from notes if needed
      });

      setStatus('success');
      setFormData({ class: '', subject: '', topic: '', file: null, fileBase64: '' });
      setTimeout(() => {
        setStatus('idle');
        setIsAdding(false);
      }, 2000);
    } catch (error) {
      setStatus('error');
      setErrorMessage("Failed to upload project. Please try again.");
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project guidance?")) return;
    try {
      await projectService.deleteProject(projectId);
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const [viewingNote, setViewingNote] = useState<any | null>(null);
  const [viewUrl, setViewUrl] = useState<string>('');
  const [zoomScale, setZoomScale] = useState(0.9);

  useEffect(() => {
    if (viewingNote && viewingNote.fileData) {
      if (viewingNote.fileType?.includes('image')) {
        try {
          let base64 = viewingNote.fileData;
          if (base64.includes(',')) base64 = base64.split(',')[1];
          const binaryString = window.atob(base64.trim());
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
          const mime = viewingNote.fileType || 'image/jpeg';
          const blob = new Blob([bytes], { type: mime });
          const url = URL.createObjectURL(blob);
          setViewUrl(url);
        } catch (e) {
          setViewUrl(viewingNote.fileData);
        }
      } else {
        setViewUrl(viewingNote.fileData);
      }
    } else {
      if (viewUrl && viewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(viewUrl);
      }
      setViewUrl('');
    }
  }, [viewingNote]);

  const uniqueDates = Array.from(new Set(projects.map(i => formatDateLabel(i.createdAt)).filter(Boolean)));
  const uniqueTopics = Array.from(new Set(projects.map(i => i.topic).filter(Boolean)));

  const filteredProjects = projects.filter(n => {
    const dMatch = !selectedDate || formatDateLabel(n.createdAt) === selectedDate;
    const tMatch = !selectedTopic || n.topic === selectedTopic;
    const sMatch = n.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   n.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   n.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    return dMatch && tMatch && sMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Industry Project Guidance</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
             Shared exclusively with <span className="text-secondary">Elite Premium</span> Scholars
          </p>
        </div>
        
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-secondary text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-secondary/20"
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          {isAdding ? 'Close' : 'Add Project'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AnimatePresence>
            {isAdding && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white p-6 md:p-8 rounded-[2rem] border border-surface-variant atelier-card-shadow max-w-2xl mb-8"
              >
                <form onSubmit={handleAddProject} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Class</label>
                      <input 
                        type="text"
                        value={formData.class}
                        onChange={(e) => setFormData(p => ({...p, class: e.target.value}))}
                        placeholder="e.g. Graduate, B.Tech"
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-secondary outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Name/Topic</label>
                      <input 
                        type="text"
                        value={formData.topic}
                        onChange={(e) => setFormData(p => ({...p, topic: e.target.value}))}
                        placeholder="e.g. E-Commerce Backend"
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-secondary outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Course/Subject</label>
                    <input 
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData(p => ({...p, subject: e.target.value}))}
                      placeholder="e.g. Computer Science"
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-secondary outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Project Files</label>
                    <div className="relative group">
                      <input 
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        className="hidden"
                        id="project-file"
                      />
                      <label 
                        htmlFor="project-file"
                        className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-200 rounded-2xl hover:border-secondary hover:bg-secondary/5 cursor-pointer transition-all group-hover:shadow-inner"
                      >
                        {formData.file ? (
                          <>
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                              {fileLoading ? <Loader2 className="animate-spin" /> : <Check size={24} />}
                            </div>
                            <p className="text-sm font-black text-emerald-600">{formData.file.name}</p>
                            <p className="text-[10px] font-bold text-slate-400">{fileLoading ? 'Processing file...' : 'Click to change file'}</p>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Upload size={24} />
                            </div>
                            <p className="text-sm font-black text-on-surface">Choose file to upload</p>
                            <p className="text-[10px] font-bold text-slate-400">Project Docs or Diagrams (Max 700KB)</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {errorMessage && (
                    <p className="text-red-500 text-[11px] font-medium ml-1">{errorMessage}</p>
                  )}

                  <button 
                    type="submit"
                    disabled={status === 'saving' || status === 'success' || fileLoading}
                    className={`w-full py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                      status === 'success' 
                        ? 'bg-emerald-500 text-white' 
                        : (status === 'saving' || fileLoading) ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-secondary text-white hover:opacity-90 shadow-secondary/20'
                    }`}
                  >
                    {status === 'saving' || fileLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : status === 'success' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Briefcase className="w-4 h-4" />
                    )}
                    {fileLoading ? 'Reading File...' : status === 'saving' ? 'Uploading...' : status === 'success' ? 'Project uploaded!' : 'Confirm & Share with Elite Students'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center bg-white border border-surface-variant px-4 py-2 rounded-xl w-full max-w-sm shadow-sm focus-within:ring-2 ring-secondary transition-all">
              <Search className="w-5 h-5 text-secondary mr-3" />
              <input 
                className="bg-transparent border-none focus:ring-0 secondary-text w-full placeholder:text-slate-400 outline-none font-medium" 
                placeholder="Search projects..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto custom-scrollbar">
               {uniqueTopics.map(topic => (
                 <button 
                   key={topic}
                   onClick={() => setSelectedTopic(selectedTopic === topic ? null : topic)}
                   className={cn(
                     "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap border",
                     selectedTopic === topic ? "bg-secondary text-white border-secondary" : "bg-secondary/5 text-secondary border-secondary/10"
                   )}
                 >
                   {topic}
                 </button>
               ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <motion.div
                layout
                key={project.id}
                className="group bg-white rounded-[2.5rem] border border-surface-variant atelier-card-shadow flex flex-col overflow-hidden hover:shadow-2xl hover:shadow-secondary/5 transition-all duration-500"
              >
                <div className="p-5 flex items-center justify-between border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/5 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-all duration-500">
                      {project.fileType?.includes('image') ? <ImageIcon size={20} /> : <FileText size={20} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                         <h3 className="text-xs font-black text-on-surface truncate" title={project.fileName}>{project.fileName}</h3>
                      </div>
                      <p className="text-[10px] font-black text-secondary/60 uppercase tracking-widest">{project.subject}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(project.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="px-5 py-3 flex items-center gap-3 border-b border-gray-50 bg-slate-50/30">
                   <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                      <GraduationCap size={12} className="text-primary" />
                      <span className="text-[9px] font-black uppercase tracking-wider">{project.class}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                      <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">ELITE ONLY</span>
                    </div>
                </div>

                <div className="relative h-48 bg-slate-50/50 flex items-center justify-center overflow-hidden group/preview">
                  {project.fileType?.includes('image') ? (
                    <img 
                      src={project.fileData} 
                      alt="Project Preview" 
                      className="w-full h-full object-cover opacity-80 group-hover/preview:opacity-100 transition-opacity duration-700"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Briefcase size={48} className="text-secondary/10 transition-transform group-hover/preview:scale-110 duration-700" />
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Project Document</span>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-transparent to-transparent flex flex-col justify-end p-4 transition-opacity duration-300">
                    <button 
                      onClick={() => setViewingNote(project)}
                      className="w-full py-3.5 bg-secondary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-[1.25rem] shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                    >
                      <Eye size={14} />
                      Open Preview
                    </button>
                  </div>
                </div>
                
                <div className="px-5 py-4 bg-white">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Project Objective</p>
                   <p className="text-xs font-bold text-slate-800 line-clamp-2">{project.topic}</p>
                </div>
              </motion.div>
            ))}

            {filteredProjects.length === 0 && !isAdding && (
              <div className="col-span-full py-20 text-center space-y-4 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                <div className="w-20 h-20 bg-white text-slate-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Briefcase size={40} />
                </div>
                <h3 className="text-lg font-black text-on-surface">No Projects Shared</h3>
                <p className="text-sm font-bold text-slate-400">Share industry-standard projects with your Elite students</p>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* MODAL VIEWER */}
      <AnimatePresence>
        {viewingNote && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative w-full max-w-5xl h-[90vh] bg-white rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
             >
                <div className="p-6 md:p-8 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center">
                         {viewingNote.fileType?.includes('image') ? <ImageIcon size={24} /> : <FileText size={24} />}
                      </div>
                      <div>
                         <h2 className="text-xl font-black text-slate-800 tracking-tight">{viewingNote.fileName}</h2>
                         <p className="text-[10px] font-black text-secondary uppercase tracking-widest">{viewingNote.subject} • {viewingNote.class}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl mr-4">
                        <button onClick={() => setZoomScale(s => Math.max(0.5, s - 0.1))} className="p-1 hover:bg-white rounded-lg transition-colors"><Minus size={16}/></button>
                        <span className="text-[10px] font-black w-10 text-center">{Math.round(zoomScale * 100)}%</span>
                        <button onClick={() => setZoomScale(s => Math.min(2, s + 0.1))} className="p-1 hover:bg-white rounded-lg transition-colors"><Plus size={16}/></button>
                      </div>
                      <button 
                        onClick={() => setViewingNote(null)} 
                        className="w-12 h-12 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center shadow-inner"
                      >
                         <X size={24} />
                      </button>
                   </div>
                </div>

                <div className="flex-1 overflow-auto bg-slate-50 p-8 flex items-center justify-center custom-scrollbar">
                   <div style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.2s ease-out' }}>
                      {viewingNote.fileType?.includes('image') ? (
                        <img src={viewUrl || viewingNote.fileData} className="max-w-full rounded-xl shadow-2xl border border-gray-200" alt="Full Preview" />
                      ) : (
                        <div className="w-[800px] h-[1000px] bg-white shadow-2xl rounded-xl overflow-hidden border border-gray-200">
                           <iframe 
                             src={`${viewingNote.fileData}#toolbar=0&view=FitH`} 
                             className="w-full h-full"
                             title="Document Preview"
                           />
                        </div>
                      )}
                   </div>
                </div>
                
                <div className="p-6 border-t border-gray-100 bg-white/50 backdrop-blur-md flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secured Industry Content</span>
                   </div>
                   <button 
                     onClick={() => setViewingNote(null)}
                     className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                   >
                     Done Viewing
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
