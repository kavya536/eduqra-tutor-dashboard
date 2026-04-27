import React, { useState, useEffect } from 'react';
import { 
  FileText, 
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
  ExternalLink,
  ShieldCheck as ShieldIcon,
  AlertTriangle,
  Loader2,
  ListTodo,
  Vote,
  BarChart3,
  User,
  RotateCcw,
  Minus,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, query, where, onSnapshot, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface Note {
  id: string;
  class: string;
  subject: string;
  topic: string;
  fileName: string;
  fileData: string; // Base64
  fileType: string;
  createdAt: any;
}

interface PollOption {
  text: string;
  votes: string[]; // List of student IDs
}

interface Poll {
  id: string;
  tutorId: string;
  question: string;
  targetClass: string;
  topic: string;
  options: { text: string; votes: string[] }[];
  allowMultiple: boolean;
  createdAt: any;
  status: 'active' | 'closed';
}

interface NotesProps {
  notes: Note[];
  tutorId: string;
  tutorName?: string;
}

export function Notes({ notes, tutorId, tutorName }: NotesProps) {
  const [activeTab, setActiveTab] = useState<'notes' | 'polls'>('notes');
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingPoll, setIsAddingPoll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Real-time Polls State
  const [polls, setPolls] = useState<Poll[]>([]);
  useEffect(() => {
    if (!tutorId) return;
    const q = query(collection(db, 'polls'), where('tutorId', '==', tutorId));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Poll));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPolls(list);
    });
    return unsub;
  }, [tutorId]);

  const [fileLoading, setFileLoading] = useState(false);
  const [formData, setFormData] = useState({
    class: '',
    subject: '',
    topic: '',
    file: null as File | null,
    fileBase64: ''
  });

  const [pollFormData, setPollFormData] = useState({
    question: '',
    targetClass: '',
    topic: '',
    options: ['', ''],
    allowMultiple: false
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

  const handleAddNote = async (e: React.FormEvent) => {
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
      await addDoc(collection(db, 'notes'), {
        tutorId,
        class: formData.class.trim(),
        subject: formData.subject.trim(),
        topic: formData.topic.trim() || 'General',
        fileName: formData.file?.name,
        fileType: formData.file?.type || 'application/pdf',
        fileData: formData.fileBase64,
        tutorName: tutorName || 'Your Tutor',
        createdAt: serverTimestamp()
      });

      // Notify Students in the targeted class
      const studentsQuery = query(collection(db, 'students'), where('class', '==', formData.class));
      const studentsSnap = await getDocs(studentsQuery);
      studentsSnap.forEach(async (studentDoc) => {
        await addDoc(collection(db, 'notifications'), {
          userId: studentDoc.id,
          title: 'New Study Material 📚',
          message: `${tutorName || 'Your tutor'} shared new notes: "${formData.subject}"`,
          type: 'booking',
          time: serverTimestamp(),
          read: false,
          link: 'notes'
        });
      });

      setStatus('success');
      setFormData({ class: '', subject: '', topic: '', file: null, fileBase64: '' });
      setTimeout(() => {
        setStatus('idle');
        setIsAdding(false);
      }, 2000);
    } catch (error) {
      setStatus('error');
      setErrorMessage("Failed to upload note. Please try again.");
    }
  };

  const handleAddPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollFormData.question.trim()) {
      setErrorMessage("Please enter a question");
      return;
    }
    const cleanOptions = pollFormData.options.filter(o => o.trim() !== '');
    if (cleanOptions.length < 2) {
      setErrorMessage("Please provide at least 2 options");
      return;
    }

    setStatus('saving');
    try {
      await addDoc(collection(db, 'polls'), {
        tutorId,
        question: pollFormData.question,
        targetClass: pollFormData.targetClass.trim() || 'All',
        topic: pollFormData.topic.trim() || 'General',
        options: cleanOptions.map(o => ({ text: o, votes: [] })),
        allowMultiple: pollFormData.allowMultiple,
        status: 'active',
        tutorName: tutorName || 'Your Tutor',
        createdAt: serverTimestamp()
      });

      // Notify Students in the targeted class
      const pollTargetClass = pollFormData.targetClass.trim() || 'All';
      const sQuery = pollTargetClass === 'All' 
        ? query(collection(db, 'students'))
        : query(collection(db, 'students'), where('class', '==', pollTargetClass));
      
      const sSnap = await getDocs(sQuery);
      sSnap.forEach(async (sDoc) => {
        await addDoc(collection(db, 'notifications'), {
          userId: sDoc.id,
          title: 'New Interactive Poll 📊',
          message: `${tutorName || 'Your tutor'} launched a new poll for your class.`,
          type: 'update',
          time: serverTimestamp(),
          read: false,
          link: 'notes'
        });
      });
      setStatus('success');
      setPollFormData({ question: '', targetClass: '', topic: '', options: ['', ''], allowMultiple: false });
      setTimeout(() => {
        setStatus('idle');
        setIsAddingPoll(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await deleteDoc(doc(db, 'notes', noteId));
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm("Delete this poll?")) return;
    try {
      await deleteDoc(doc(db, 'polls', pollId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleVote = async (pollId: string, optionIdx: number) => {
    const poll = polls.find(p => p.id === pollId);
    if (!poll || !tutorId) return;

    const newOptions = [...poll.options.map(o => ({ ...o, votes: [...o.votes] }))];
    const voterId = tutorId;

    const isAlreadyVoted = newOptions[optionIdx].votes.includes(voterId);
    
    // Calculate total selections for this user across all options
    const userSelections = newOptions.filter(o => o.votes.includes(voterId)).length;

    if (poll.allowMultiple) {
      if (isAlreadyVoted) {
        // PER USER REQUEST: Don't allow unselecting if it's their only selection
        if (userSelections <= 1) return; 
        newOptions[optionIdx].votes = newOptions[optionIdx].votes.filter(id => id !== voterId);
      } else {
        newOptions[optionIdx].votes.push(voterId);
      }
    } else {
      // Single Choice Logic: clicking the same one again shouldn't deselect (enforce at least one)
      if (isAlreadyVoted) return; 

      newOptions.forEach(opt => {
        opt.votes = opt.votes.filter(id => id !== voterId);
      });
      newOptions[optionIdx].votes.push(voterId);
    }

    try {
      await updateDoc(doc(db, 'polls', pollId), { options: newOptions });
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  const [viewingVoters, setViewingVoters] = useState<Poll | null>(null);
  const [voterNames, setVoterNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (viewingVoters) {
      const allVoterIds = Array.from(new Set(viewingVoters.options.flatMap(o => o.votes)));
      allVoterIds.forEach(async (id) => {
        if (voterNames[id]) return;
        try {
          // Priority 1: Check multiple common collections
          let sDoc = await getDoc(doc(db, 'students', id));
          if (!sDoc.exists()) sDoc = await getDoc(doc(db, 'users', id));
          if (!sDoc.exists()) sDoc = await getDoc(doc(db, 'student_profiles', id));

          if (sDoc.exists()) {
            const data = sDoc.data() || {};
            const officialName = data.name || data.fullName || data.displayName || data.userName;
            if (officialName) {
              setVoterNames(prev => ({ ...prev, [id]: officialName }));
              return;
            }
          }

          // Priority 2: Deep Query by email if ID is an email-key or raw email
          const email = id.includes('@') ? id : id.replace(/_/g, '.');
          const q = query(collection(db, 'students'), where('email', '==', email));
          const snap = await getDocs(q);
          
          if (!snap.empty) {
             const data = snap.docs[0].data();
             setVoterNames(prev => ({ ...prev, [id]: data.name || data.fullName || 'Student Participant' }));
          } else {
             // Second attempt query in global users
             const q2 = query(collection(db, 'users'), where('email', '==', email));
             const snap2 = await getDocs(q2);
             if (!snap2.empty) {
               const data = snap2.docs[0].data();
               setVoterNames(prev => ({ ...prev, [id]: data.name || data.fullName || 'Student Participant' }));
             } else {
               // Only use placeholder if student truly doesn't exist in DB (e.g. Test bypass users)
               setVoterNames(prev => ({ ...prev, [id]: id === tutorId ? 'You (Tutor)' : 'Student Participant' }));
             }
          }
        } catch (e) {
          console.error("Fetch name error", e);
        }
      });
    }
  }, [viewingVoters, tutorId]);

  const [viewingNote, setViewingNote] = useState<Note | null>(null);
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

  const allItems = [...notes.map(n => ({ ...n, itemType: 'note' })), ...polls.map(p => ({ ...p, itemType: 'poll' }))];
  const uniqueDates = Array.from(new Set(allItems.map(i => formatDateLabel(i.createdAt)).filter(Boolean)));
  const uniqueTopics = Array.from(new Set(allItems.map(i => i.topic).filter(Boolean)));

  const filteredNotes = notes.filter(n => {
    const dMatch = !selectedDate || formatDateLabel(n.createdAt) === selectedDate;
    const tMatch = !selectedTopic || n.topic === selectedTopic;
    const sMatch = n.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   n.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   n.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    return dMatch && tMatch && sMatch;
  });

  const filteredPolls = polls.filter(p => {
    const dMatch = !selectedDate || formatDateLabel(p.createdAt) === selectedDate;
    const tMatch = !selectedTopic || p.topic === selectedTopic;
    const sMatch = p.question.toLowerCase().includes(searchTerm.toLowerCase());
    return dMatch && tMatch && sMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Digital Library</h1>
          <div className="flex items-center gap-1 mt-2 bg-slate-100 p-1 rounded-xl w-fit border border-gray-100">
            <button 
              onClick={() => setActiveTab('notes')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'notes' ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Notes
            </button>
            <button 
              onClick={() => setActiveTab('polls')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'polls' ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Polls
            </button>
          </div>
        </div>
        
        {activeTab === 'notes' ? (
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
          >
            {isAdding ? <X size={16} /> : <Plus size={16} />}
            {isAdding ? 'Close' : 'Add Notes'}
          </button>
        ) : (
          <button 
            onClick={() => setIsAddingPoll(!isAddingPoll)}
            className="flex items-center gap-2 bg-secondary text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-secondary/20"
          >
            {isAddingPoll ? <X size={16} /> : <BarChart3 size={16} />}
            {isAddingPoll ? 'Close' : 'Create Poll'}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'notes' ? (
          <motion.div key="notes-tab" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <AnimatePresence>
              {isAdding && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white p-6 md:p-8 rounded-[2rem] border border-surface-variant atelier-card-shadow max-w-2xl mb-8"
                >
                  <form onSubmit={handleAddNote} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class</label>
                        <input 
                          type="text"
                          value={formData.class}
                          onChange={(e) => setFormData(p => ({...p, class: e.target.value}))}
                          placeholder="e.g. Class 10"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Topic Name</label>
                        <input 
                          type="text"
                          value={formData.topic}
                          onChange={(e) => setFormData(p => ({...p, topic: e.target.value}))}
                          placeholder="e.g. Calculus Basics"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                      <input 
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData(p => ({...p, subject: e.target.value}))}
                        placeholder="e.g. Mathematics"
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Document</label>
                      <div className="relative group">
                        <input 
                          type="file"
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                          className="hidden"
                          id="note-file"
                        />
                        <label 
                          htmlFor="note-file"
                          className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-200 rounded-2xl hover:border-primary hover:bg-primary/5 cursor-pointer transition-all group-hover:shadow-inner"
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
                              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Upload size={24} />
                              </div>
                              <p className="text-sm font-black text-on-surface">Choose file to upload</p>
                              <p className="text-[10px] font-bold text-slate-400">PDF, Word, PNG, JPG (Max 700KB)</p>
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
                          : (status === 'saving' || fileLoading) ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-primary text-white hover:opacity-90 shadow-primary/20'
                      }`}
                    >
                      {status === 'saving' || fileLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : status === 'success' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      {fileLoading ? 'Reading File...' : status === 'saving' ? 'Uploading...' : status === 'success' ? 'Note added to notes' : 'Confirm & Upload'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

          {/* Date Filter Bar */}
          <div className="flex items-center gap-3 overflow-x-auto pb-6 custom-scrollbar">
            <button 
              onClick={() => setSelectedDate(null)}
              className={cn(
                "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                selectedDate === null ? "bg-primary text-white" : "bg-white border border-gray-100 text-slate-400 hover:border-primary/20"
              )}
            >
              All Dates
            </button>
            {uniqueDates.map(date => (
              <button 
                key={date}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  selectedDate === date ? "bg-primary text-white" : "bg-white border border-gray-100 text-slate-400 hover:border-primary/20"
                )}
              >
                {date}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center bg-white border border-surface-variant px-4 py-2 rounded-xl w-full max-w-sm shadow-sm focus-within:ring-2 ring-primary transition-all">
              <Search className="w-5 h-5 text-primary mr-3" />
              <input 
                className="bg-transparent border-none focus:ring-0 secondary-text w-full placeholder:text-slate-400 outline-none font-medium" 
                placeholder="Filter items..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto">
               {uniqueTopics.map(topic => (
                 <button 
                   key={topic}
                   onClick={() => setSelectedTopic(selectedTopic === topic ? null : topic)}
                   className={cn(
                     "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                     selectedTopic === topic ? "bg-secondary text-white" : "bg-secondary/5 text-secondary border border-secondary/10"
                   )}
                 >
                   {topic}
                 </button>
               ))}
            </div>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotes.map((note) => (
                <motion.div
                  layout
                  key={note.id}
                  className="group bg-white rounded-[2.5rem] border border-surface-variant atelier-card-shadow flex flex-col overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500"
                >
                  <div className="p-5 flex items-center justify-between border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500">
                        {note.fileType?.includes('image') ? <ImageIcon size={20} /> : <File size={20} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                           <h3 className="text-xs font-black text-on-surface truncate" title={note.fileName}>{note.fileName}</h3>
                           {note.topic && <span className="bg-emerald-50 text-emerald-600 text-[7px] font-black px-1.5 py-0.5 rounded uppercase border border-emerald-100">{note.topic}</span>}
                        </div>
                        <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">{note.subject}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(note.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="px-5 py-3 flex items-center gap-3 text-on-surface-variant/60 border-b border-gray-50 bg-slate-50/30">
                     <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                        <GraduationCap size={12} className="text-secondary" />
                        <span className="text-[9px] font-black uppercase tracking-wider">{note.class}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                        <FileText size={12} className="text-tertiary" />
                        <span className="text-[9px] font-black uppercase tracking-wider">{note.fileType?.split('/')[1] || 'DOC'}</span>
                      </div>
                  </div>

                  <div className="relative h-48 bg-slate-50/50 flex items-center justify-center overflow-hidden group/preview">
                    {note.fileType?.includes('image') ? (
                      <img 
                        src={note.fileData} 
                        alt="Note Mini Preview" 
                        className="w-full h-full object-cover opacity-80 group-hover/preview:opacity-100 transition-opacity duration-700"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <FileText size={48} className="text-primary/10 transition-transform group-hover/preview:scale-110 duration-700" />
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">PDF Document</span>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-transparent to-transparent flex flex-col justify-between p-4 transition-opacity duration-300">
                      <div className="flex justify-start">
                        <span className="bg-primary/10 backdrop-blur-md text-primary text-[8px] font-black px-3 py-1.5 rounded-full border border-primary/20 shadow-sm uppercase tracking-widest">
                          {note.fileType?.includes('pdf') ? 'Multi-page Doc' : 'Image Note'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                         <button 
                          onClick={() => setViewingNote(note)}
                          className="w-full py-3.5 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-[1.25rem] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                        >
                          <Eye size={14} />
                          View Document
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {filteredNotes.length === 0 && !isAdding && (
                <div className="col-span-full py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText size={40} />
                  </div>
                  <h3 className="text-lg font-black text-on-surface">No notes found</h3>
                  <p className="text-sm font-bold text-slate-400">Start uploading study materials for your students</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="polls-tab" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <AnimatePresence>
              {isAddingPoll && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white p-6 md:p-8 rounded-[2rem] border border-surface-variant atelier-card-shadow max-w-2xl mb-8"
                >
                  <form onSubmit={handleAddPoll} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Topic Name</label>
                        <input 
                          type="text"
                          value={pollFormData.topic}
                          onChange={(e) => setPollFormData(p => ({...p, topic: e.target.value}))}
                          placeholder="e.g. Trig. Problems"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-secondary outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Poll Question</label>
                        <input 
                          type="text"
                          value={pollFormData.question}
                          onChange={(e) => setPollFormData(p => ({...p, question: e.target.value}))}
                          placeholder="What is your question?"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-secondary outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Class (Optional)</label>
                      <input 
                        type="text"
                        value={pollFormData.targetClass}
                        onChange={(e) => setPollFormData(p => ({...p, targetClass: e.target.value}))}
                        placeholder="e.g. 10th, Graduate"
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-secondary outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Options</label>
                      {pollFormData.options.map((opt, idx) => (
                        <div key={idx} className="flex gap-2 relative group">
                          <input 
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const next = [...pollFormData.options];
                              next[idx] = e.target.value;
                              setPollFormData(p => ({ ...p, options: next }));
                            }}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-secondary outline-none transition-all"
                          />
                          {pollFormData.options.length > 2 && (
                            <button 
                              type="button"
                              onClick={() => setPollFormData(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }))}
                              className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Minus size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      {pollFormData.options.length < 5 && (
                        <button 
                          type="button"
                          onClick={() => setPollFormData(p => ({ ...p, options: [...p.options, ''] }))}
                          className="flex items-center gap-2 text-secondary text-[10px] font-black uppercase tracking-widest hover:underline ml-1"
                        >
                          <Plus size={12} /> Add Option
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                       <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-all", pollFormData.allowMultiple ? "bg-secondary text-white" : "bg-white text-slate-400 border border-slate-200")}>
                            <ListTodo size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-on-surface">Allow multiple answers</p>
                            <p className="text-[10px] font-bold text-slate-400">Students can select more than one choice</p>
                          </div>
                       </div>
                       <button 
                        type="button"
                        onClick={() => setPollFormData(p => ({ ...p, allowMultiple: !p.allowMultiple }))}
                        className={cn(
                          "w-12 h-6 rounded-full relative transition-all duration-300",
                          pollFormData.allowMultiple ? "bg-secondary shadow-lg shadow-secondary/20" : "bg-slate-200"
                        )}
                       >
                         <div className={cn(
                           "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300",
                           pollFormData.allowMultiple ? "left-7" : "left-1"
                         )} />
                       </button>
                    </div>

                    {errorMessage && <p className="text-red-500 text-[11px] font-medium ml-1">{errorMessage}</p>}

                    <button 
                      type="submit"
                      disabled={status === 'saving'}
                      className="w-full py-4 bg-secondary text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                       {status === 'saving' ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                       {status === 'saving' ? 'Creating...' : status === 'success' ? 'Poll Created' : 'Confirm & Create Poll'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPolls.map((poll) => {
                const uniqueVoterIds = Array.from(new Set(poll.options.flatMap(o => o.votes)));
                const uniqueVoterCount = uniqueVoterIds.length;
                const totalSelections = poll.options.reduce((acc, opt) => acc + opt.votes.length, 0);

                return (
                  <motion.div 
                    layout
                    key={poll.id}
                    className="bg-white rounded-[2rem] border border-surface-variant atelier-card-shadow p-6 flex flex-col group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary/5 text-secondary flex items-center justify-center">
                          <Vote size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Poll</p>
                            {poll.topic && <span className="bg-secondary/10 text-secondary text-[8px] font-black px-2 py-0.5 rounded-md border border-secondary/10 uppercase tracking-widest">{poll.topic}</span>}
                          </div>
                          <h3 className="text-sm font-black text-on-surface line-clamp-2 mt-0.5">{poll.question}</h3>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeletePoll(poll.id)}
                        className="p-2 text-slate-200 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-2 mb-4">
                      {poll.options.map((opt, idx) => {
                        const isVoted = opt.votes.includes(tutorId);
                        const percentage = totalSelections > 0 ? Math.round((opt.votes.length / totalSelections) * 100) : 0;
                        return (
                          <button 
                            key={idx} 
                            onClick={() => handleVote(poll.id, idx)}
                            className={cn(
                              "relative w-full h-12 bg-slate-50 rounded-xl overflow-hidden group/opt border transition-all duration-300 text-left",
                              isVoted ? "border-secondary ring-1 ring-secondary/20 bg-secondary/5" : "border-transparent hover:border-slate-200"
                            )}
                          >
                            <div 
                              className={cn(
                                "absolute left-0 top-0 bottom-0 transition-all duration-1000",
                                isVoted ? "bg-secondary/10" : "bg-slate-200/50"
                              )}
                              style={{ width: `${percentage}%` }}
                            />
                            <div className="absolute inset-0 px-4 flex items-center justify-between z-10">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                                  isVoted ? "bg-secondary border-secondary text-white" : "border-slate-300 bg-white"
                                )}>
                                  {isVoted && <Check size={12} />}
                                </div>
                                <span className={cn("text-xs font-bold", isVoted ? "text-secondary" : "text-on-surface")}>{opt.text}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {opt.votes.length > 0 && (
                                  <div className="flex -space-x-1">
                                    {opt.votes.slice(0, 2).map((_, i) => (
                                      <div key={i} className="w-4 h-4 rounded-full bg-slate-300 border border-white" />
                                    ))}
                                  </div>
                                )}
                                <span className={cn("text-[10px] font-black", isVoted ? "text-secondary" : "text-slate-400")}>{percentage}%</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                       <button 
                         onClick={() => setViewingVoters(poll)}
                         className="flex items-center gap-3 text-slate-400 hover:text-secondary transition-all"
                       >
                          <div className="flex items-center gap-1.5">
                            <MessageSquare size={14} />
                            <span className="text-[10px] font-black uppercase tracking-wider">{uniqueVoterCount} Voters</span>
                          </div>
                          <Eye size={12} />
                       </button>
                    </div>
                  </motion.div>
                );
              })}

              {polls.length === 0 && !isAddingPoll && (
                <div className="col-span-full py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Vote size={40} />
                  </div>
                  <h3 className="text-lg font-black text-on-surface">No polls active</h3>
                  <p className="text-sm font-bold text-slate-400">Launch an interactive poll to engage your students</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Viewer Modal - PURE FULLSCREEN */}
      <AnimatePresence>
        {viewingNote && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="relative w-full h-full flex flex-col items-center justify-center"
             >
                {/* Compact Exit Button */}
                <button 
                  onClick={() => { setViewingNote(null); setZoomScale(0.9); }} 
                  className="fixed top-4 right-4 z-[110] bg-white/5 hover:bg-white/10 backdrop-blur-md p-2.5 rounded-full text-white/70 hover:text-white transition-all border border-white/10"
                >
                   <X size={20} />
                </button>

                {/* ZOOM CONTROLS */}
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
                <div className="flex-1 w-full h-full bg-[#0a0a0b] overflow-auto custom-scrollbar flex items-center justify-center p-2">
                   <motion.div 
                     animate={{ scale: zoomScale }}
                     transition={{ type: "spring", stiffness: 300, damping: 30 }}
                     className="origin-center flex items-center justify-center"
                   >
                      {viewingNote.fileType?.includes('image') ? (
                        <img 
                          src={viewUrl} 
                          className="max-w-[96vw] max-h-[96vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 rounded-md" 
                          alt={viewingNote.fileName} 
                        />
                      ) : (
                        <div className="w-[96vw] h-[96vh] bg-white rounded-md shadow-2xl overflow-hidden border border-white/10">
                           <iframe 
                             src={`${viewUrl}#toolbar=0&view=FitH`} 
                             className="w-full h-full border-none"
                             title="PDF Viewer"
                           />
                        </div>
                      )}
                   </motion.div>
                </div>
                
                {/* Discrete Security Watermark */}
                <div className="fixed bottom-6 right-6 opacity-10 pointer-events-none select-none z-[110]">
                   <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">SECURED TUTOR PREVIEW • {viewingNote.fileName}</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {viewingVoters && (
          <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white w-full max-w-md rounded-[2.5rem] p-8 atelier-card-shadow relative overflow-hidden"
             >
                <div className="absolute top-0 left-0 w-full h-2 bg-secondary/10" />
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                      <BarChart3 size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-on-surface">Voter List</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{Array.from(new Set(viewingVoters.options.flatMap(o => o.votes))).length} People Participated</p>
                    </div>
                  </div>
                  <button onClick={() => setViewingVoters(null)} className="p-3 bg-slate-50 text-slate-400 hover:text-on-surface rounded-xl transition-all">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 pr-2">
                  {Array.from(new Set(viewingVoters.options.flatMap(o => o.votes))).map((id) => (
                    <div key={id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-secondary/5 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                          <User size={20} className="text-secondary" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-on-surface">{voterNames[id] || 'Loading profile...'}</p>
                          <div className="flex gap-2 mt-1">
                            {viewingVoters.options.filter(o => o.votes.includes(id)).map((o, i) => (
                              <span key={i} className="text-[8px] font-black uppercase bg-white px-2 py-0.5 rounded-md border border-gray-100 text-secondary">{o.text}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
