import React, { useState, useEffect } from 'react';
import { 
  FileCheck, 
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
  Clock,
  Minus,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { assignmentService } from '../services/assignmentService';
import { useAuthStore } from '../store/useAuthStore';
import { useAssignmentStore } from '../store/useAssignmentStore';
import { useAssignmentListener } from '../hooks/useAssignmentListener';

export default function Assignments() {
  useAssignmentListener();

  const profile = useAuthStore(state => state.profile);
  const assignments = useAssignmentStore(state => state.assignments);
  
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
      if (file.size > 1024 * 1024) { // 1MB limit for assignments
        setErrorMessage("File is too large. Max limit 1MB.");
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

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fileLoading) return;

    if (!formData.class.trim() || !formData.subject.trim() || !formData.topic.trim()) {
      setErrorMessage("Please fill in all fields (Class, Subject, and Topic).");
      return;
    }

    if (!formData.file || !formData.fileBase64) {
      setErrorMessage("Please select a valid document to upload.");
      return;
    }

    setStatus('saving');
    setErrorMessage('');

    try {
      await assignmentService.addAssignment(tutorId, tutorName, {
        class: formData.class.trim(),
        subject: formData.subject.trim(),
        topic: formData.topic.trim(),
        fileName: formData.file?.name,
        fileType: formData.file?.type || 'application/pdf',
        fileData: formData.fileBase64
      });

      setStatus('success');
      setFormData({ class: '', subject: '', topic: '', file: null, fileBase64: '' });
      setTimeout(() => {
        setStatus('idle');
        setIsAdding(false);
      }, 2000);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMessage("Failed to upload assignment. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await assignmentService.deleteAssignment(id);
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting assignment:", error);
    }
  };

  const uniqueDates = Array.from(new Set(assignments.map(a => formatDateLabel(a.createdAt)).filter(Boolean)));
  const uniqueTopics = Array.from(new Set(assignments.map(a => a.topic).filter(Boolean)));

  const filteredAssignments = assignments.filter(a => {
    const dMatch = !selectedDate || formatDateLabel(a.createdAt) === selectedDate;
    const tMatch = !selectedTopic || a.topic === selectedTopic;
    const sMatch = a.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   a.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   a.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    return dMatch && tMatch && sMatch;
  });

  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Assessments</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage and assign tasks to your students</p>
        </div>
        
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          {isAdding ? 'Close' : 'Add Assignment'}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-6 md:p-8 rounded-[2rem] border border-surface-variant atelier-card-shadow mb-8"
          >
            <form onSubmit={handleAddAssignment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Class</label>
                  <input 
                    type="text"
                    value={formData.class}
                    onChange={(e) => setFormData(p => ({...p, class: e.target.value}))}
                    placeholder="e.g. Class 12"
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Topic Name</label>
                  <input 
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData(p => ({...p, topic: e.target.value}))}
                    placeholder="e.g. Quantum Physics"
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                <input 
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData(p => ({...p, subject: e.target.value}))}
                  placeholder="e.g. Physics"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Assignment File</label>
                <input 
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  id="assignment-file"
                />
                <label 
                  htmlFor="assignment-file"
                  className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-200 rounded-2xl hover:border-primary hover:bg-primary/5 cursor-pointer transition-all group"
                >
                  {formData.file ? (
                    <>
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Check size={24} />
                      </div>
                      <p className="text-sm font-black text-emerald-600">{formData.file.name}</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload size={24} />
                      </div>
                      <p className="text-sm font-black text-on-surface">Choose assignment file</p>
                      <p className="text-[10px] font-bold text-slate-400">PDF, Word, or Images (Max 1MB)</p>
                    </>
                  )}
                </label>
              </div>

              {errorMessage && <p className="text-rose-500 text-[11px] font-bold ml-1">{errorMessage}</p>}

              <button 
                type="submit"
                disabled={status === 'saving' || status === 'success' || fileLoading}
                className={cn(
                  "w-full py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl transition-all duration-300 flex items-center justify-center gap-2",
                  status === 'success' ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:opacity-90 shadow-primary/20'
                )}
              >
                {status === 'saving' ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                {status === 'saving' ? 'Uploading...' : status === 'success' ? 'Assignment Added' : 'Publish Assignment'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto">
          <button 
            onClick={() => setSelectedDate(null)}
            className={cn(
              "px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
              selectedDate === null ? "bg-primary text-white" : "bg-white border border-gray-100 text-slate-400"
            )}
          >
            All Dates
          </button>
          {uniqueDates.map(date => (
            <button 
              key={date}
              onClick={() => setSelectedDate(date)}
              className={cn(
                "px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                selectedDate === date ? "bg-primary text-white" : "bg-white border border-gray-100 text-slate-400"
              )}
            >
              {date}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-surface-variant rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssignments.map((a) => (
          <motion.div
            layout
            key={a.id}
            className="group bg-white rounded-[2rem] border border-surface-variant atelier-card-shadow overflow-hidden hover:shadow-2xl transition-all duration-500"
          >
            <div className="p-5 flex items-center justify-between border-b border-slate-50 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                  <FileCheck size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-on-surface truncate max-w-[120px]">{a.fileName}</h3>
                  <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">{a.subject}</p>
                </div>
              </div>
              
              <AnimatePresence>
                {deletingId === a.id ? (
                  <motion.div 
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 50, opacity: 0 }}
                    className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-end gap-2 px-4 z-10"
                  >
                    <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mr-auto">Delete?</span>
                    <button 
                      onClick={() => setDeletingId(null)}
                      className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                    >
                      No
                    </button>
                    <button 
                      onClick={() => handleDelete(a.id)}
                      className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                    >
                      Yes, Delete
                    </button>
                  </motion.div>
                ) : (
                  <button onClick={() => setDeletingId(a.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </AnimatePresence>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="bg-slate-100 text-slate-600 text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">
                  <GraduationCap size={10} /> {a.class}
                </span>
                <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-wider">
                  {a.topic}
                </span>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-slate-400" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{formatDateLabel(a.createdAt)}</span>
                </div>
                <button 
                  onClick={() => setViewingDoc(a)}
                  className="p-2 bg-white border border-slate-100 rounded-lg text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredAssignments.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileCheck size={40} />
            </div>
            <h3 className="text-lg font-black text-slate-400">No Assignments Yet</h3>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Start by adding a new task for your classes</p>
          </div>
        )}
      </div>

      {/* FULL SCREEN VIEWER - TRUE FULLSCREEN */}
      <AnimatePresence>
        {viewingDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="relative w-full h-full flex flex-col items-center justify-center"
             >
                {/* Compact Exit Button */}
                <button 
                  onClick={() => { setViewingDoc(null); setZoomScale(1); }} 
                  className="fixed top-4 right-4 z-[110] bg-white/5 hover:bg-white/10 backdrop-blur-md p-2.5 rounded-full text-white/70 hover:text-white transition-all border border-white/10"
                >
                   <X size={20} />
                </button>

                {/* ZOOM CONTROLS - COMPACT */}
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
                   <button 
                     onClick={() => setZoomScale(prev => Math.max(0.1, prev - 0.1))}
                     className="p-2 text-white hover:bg-white/20 rounded-xl transition-all"
                   >
                      <Minus size={20} />
                   </button>
                   <div className="w-12 text-center">
                      <span className="text-white font-black text-[10px] uppercase tracking-widest">{Math.round(zoomScale * 100)}%</span>
                   </div>
                   <button 
                     onClick={() => setZoomScale(prev => Math.min(3, prev + 0.1))}
                     className="p-2 text-white hover:bg-white/20 rounded-xl transition-all"
                   >
                      <Plus size={20} />
                   </button>
                </div>

                {/* Content Area - Occupies Entire Screen */}
                <div className="flex-1 w-full h-full bg-[#0a0a0b] overflow-auto custom-scrollbar flex p-4">
                   <motion.div 
                     animate={{ scale: zoomScale }}
                     transition={{ type: "spring", stiffness: 300, damping: 30 }}
                     className="origin-center m-auto flex items-center justify-center min-w-max"
                   >
                      {viewingDoc.fileType?.startsWith('image/') ? (
                        <img 
                          src={viewingDoc.fileData} 
                          className="max-w-[96vw] max-h-[96vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 rounded-md" 
                          alt={viewingDoc.fileName} 
                        />
                      ) : (
                        <div className="w-[96vw] h-[96vh] bg-white rounded-md shadow-2xl overflow-hidden border border-white/10">
                           <iframe 
                             src={`${viewingDoc.fileData}#toolbar=0&view=FitH`} 
                             className="w-full h-full border-none"
                             title="PDF Viewer"
                           />
                        </div>
                      )}
                   </motion.div>
                </div>
                
                {/* Discrete Security Watermark */}
                <div className="fixed bottom-6 right-6 opacity-10 pointer-events-none select-none z-[110]">
                   <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">SCHOLAR PRIVATE CONTENT • {viewingDoc.fileName}</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
