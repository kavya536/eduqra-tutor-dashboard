import { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { Bookings } from './components/Bookings';
import { Chat } from './components/Chat';
import { Availability } from './components/Availability';
import { Pricing } from './components/Pricing';
import { Reviews } from './components/Reviews';
import { KYC } from './components/KYC';
import { Settings } from './components/Settings';
import { Profile } from './components/Profile';
import { Registration } from './components/Registration';
import { Login } from './components/Login';
import { Booking, BookingStatus, ChatContact, AvailabilitySlot, Review, PageId, TutorNotification, Message } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { GraduationCap, LogOut, X, User, Camera, Mic, XCircle, Send, MessageSquare, Smile, Clock, Monitor } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const INITIAL_BOOKINGS: Booking[] = [
  { id: 1, name: 'Alex Johnson', status: 'confirmed', subject: 'Mathematics', date: 'Oct 24, 2026', time: '10:00 AM', duration: '1 Hrs', message: 'Looking forward to reviewing integrals.', studentPhone: '919876543210', studentEmail: 'alex.j@example.com' },
  { id: 2, name: 'Emma Wilson', status: 'pending', subject: 'Physics', date: 'Oct 24, 2026', time: '2:00 PM', duration: '2 Hrs', message: 'Need help with Kinematics before my test.', studentPhone: '919876543211', studentEmail: 'emma.w@example.com' },
  { id: 3, name: 'Michael Brown', status: 'pending', subject: 'Calculus', date: 'Oct 25, 2026', time: '11:00 AM', duration: '1.5 Hrs', message: 'Is this time okay for derivatives cover?', studentPhone: '919876543212', studentEmail: 'michael.b@example.com' },
  { id: 4, name: 'Sofia Garcia', status: 'confirmed', subject: 'Statistics', date: 'Oct 25, 2026', time: '3:00 PM', duration: '1 Hrs', message: "Thanks for accepting! I'll bring the data set.", studentPhone: '919876543213', studentEmail: 'sofia.g@example.com' },
  { id: 5, name: 'James Lee', status: 'cancelled', subject: 'Mathematics', date: 'Oct 26, 2026', time: '9:00 AM', duration: '2 Hrs', message: 'Sorry, have a conflict.', studentPhone: '919876543214', studentEmail: 'james.l@example.com' }
];

const INITIAL_CONTACTS: ChatContact[] = [
  { 
    id: 'Emma Wilson', initials: 'EW', online: true, unread: 1,
    messages: [
      { id: 1, sender: 'student', text: 'Hi! Can we start at 2 today instead of 3?', time: '10:05 AM', date: 'YESTERDAY' },
      { id: 2, sender: 'me', text: 'Sure, that works for me. See you at 2!', time: '10:08 AM', date: 'YESTERDAY' },
      { id: 3, sender: 'student', text: 'Thanks for the session!', time: '11:30 AM', date: 'TODAY' },
    ]
  },
  { 
    id: 'Michael Lee', initials: 'ML', online: false, unread: 2,
    messages: [
      { id: 1, sender: 'student', text: 'Struggling with the calculus assignment. Can we cover it next session?', time: '09:15 AM', date: 'YESTERDAY' },
      { id: 2, sender: 'student', text: 'Can we reschedule?', time: '09:20 AM', date: 'TODAY' },
    ]
  },
  { 
    id: 'Sofia Garcia', initials: 'SG', online: true, unread: 0,
    messages: [
      { id: 1, sender: 'me', text: 'Great progress on statistics today!', time: '04:00 PM', date: 'MARCH 21, 2024' },
      { id: 2, sender: 'student', text: 'Thank you so much!', time: '04:15 PM', date: 'MARCH 21, 2024' },
    ]
  },
];

const INITIAL_SLOTS: AvailabilitySlot[] = [
  { id: 1, day: 'Monday', start: '09:00', end: '12:00', booked: false },
  { id: 2, day: 'Tuesday', start: '14:00', end: '17:00', booked: true },
  { id: 3, day: 'Wednesday', start: '06:00', end: '08:00', booked: false },
  { id: 4, day: 'Thursday', start: '18:00', end: '20:00', booked: false },
  { id: 5, day: 'Friday', start: '10:00', end: '13:00', booked: false },
];

const INITIAL_REVIEWS: Review[] = [
  { id: 1, name: 'Sarah Connor', subject: 'Calculus', date: '2026-03-20', time: '07:00 AM', rating: 5, text: 'Amazing tutor! Explained Taylor series perfectly.' },
  { id: 2, name: 'John Doe', subject: 'Physics', date: '2026-03-18', time: '08:30 AM', rating: 4, text: 'Good session, but ran a bit late.' },
  { id: 3, name: 'Emily Chen', subject: 'Mathematics', date: '2026-03-15', time: '11:15 AM', rating: 5, text: 'Very patient and understanding!' },
  { id: 4, name: 'David Miller', subject: 'Statistics', date: '2026-03-20', time: '08:00 AM', rating: 5, text: 'Solved all my probability doubts in one go.' },
  { id: 5, name: 'Grace Hopper', subject: 'CS', date: '2026-03-21', time: '09:15 AM', rating: 5, text: 'Brilliant insights into algorithm complexity.' }
];

const INITIAL_NOTIFICATIONS: TutorNotification[] = [
  { id: 'n1', type: 'booking', title: 'New Booking Request', description: 'Emma Wilson requested Physics on Oct 24 at 2:00 PM', time: '2 hours ago', read: false },
  { id: 'n2', type: 'booking', title: 'New Booking Request', description: 'Michael Brown requested Calculus on Oct 25 at 11:00 AM', time: '3 hours ago', read: false },
  { id: 'n3', type: 'message', title: 'New Message', description: 'Michael Lee: "Can we reschedule?"', time: '4 hours ago', read: false },
  { id: 'n4', type: 'review', title: 'New Review Received', description: 'Grace Hopper left a 5-star review on CS session', time: 'Yesterday', read: true },
];

export default function App() {
  const [authState, setAuthState] = useState<'login' | 'register' | 'authenticated'>('login');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthState('authenticated');
        // Fetch full profile from Firestore backend
        try {
          console.log("🔍 Fetching Firestore data for UUID:", user.uid);
          const docRef = doc(db, 'tutors', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("✅ Tutor Document Found:", data);
            setCurrentUser({ 
              ...user, 
              ...data, 
              displayName: data.name || user.displayName || user.email?.split('@')[0],
              email: data.email || user.email 
            });
          } else {
            console.warn("⚠️ No Firestore document for this tutor. Defaulting to Auth User.");
            setCurrentUser({
              ...user,
              displayName: user.displayName || user.email?.split('@')[0]
            });
          }
        } catch (err) {
          console.error("❌ Error fetching tutor profile:", err);
          setCurrentUser(user);
        }
      } else {
        setAuthState('login');
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

  useState(() => {
    (window as any).setCurrentPage = setCurrentPage;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [contacts, setContacts] = useState<ChatContact[]>(INITIAL_CONTACTS);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>(INITIAL_SLOTS);
  const [experience, setExperience] = useState(6);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<TutorNotification[]>(INITIAL_NOTIFICATIONS);

  // --- Live Class States ---
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionTimer, setSessionTimer] = useState("00:00:00");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'connecting' | 'live' | 'disconnected'>('waiting');
  const [liveMessages, setLiveMessages] = useState<{id: string, sender: string, text: string, time: string}[]>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      setIsCamOn(false);
      setTimeout(() => setIsCamOn(true), 100);
    } else {
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsScreenSharing(true);
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setIsCamOn(true);
        };
      } catch (err) {
        console.error("Error sharing screen:", err);
      }
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        if (isCamOn && currentPage === 'live-class' && sessionStatus === 'live') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: isMicOn });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } else {
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
          }
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCamOn, isMicOn, currentPage, sessionStatus]);

  const startSession = () => {
    setSessionStatus('connecting');
    setTimeout(() => {
      setSessionStatus('live');
      setSessionStartTime(new Date());
    }, 2000);
  };

  const endSession = () => {
    setSessionStatus('disconnected');
    setSessionStartTime(null);
    setSessionTimer("00:00:00");
    setTimeout(() => setCurrentPage('dashboard'), 3000);
  };

  const handleSendLiveMessage = (text: string) => {
    if (!text.trim()) return;
    const newMessage = {
      id: Date.now().toString(),
      sender: 'You',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setLiveMessages([...liveMessages, newMessage]);
  };

  useState(() => {
    const interval = setInterval(() => {
      if (sessionStatus === 'live' && sessionStartTime) {
        const diff = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000);
        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        setSessionTimer(`${h}:${m}:${s}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  });


  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleMarkRead = (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  };

  const addNotification = (notif: Omit<TutorNotification, 'id' | 'read' | 'time'>) => {
    const newNotif: TutorNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      read: false,
      time: 'Just now',
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleStatusChange = (id: number, status: BookingStatus) => {
    const booking = bookings.find(b => b.id === id);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    if (booking && status === 'confirmed') {
      addNotification({
        type: 'booking',
        title: 'Booking Confirmed',
        description: `${booking.name}'s ${booking.subject} session on ${booking.date} at ${booking.time} confirmed.`,
      });
    }
    if (booking && status === 'cancelled') {
      addNotification({
        type: 'booking',
        title: 'Booking Cancelled',
        description: `${booking.name}'s ${booking.subject} session was cancelled.`,
      });
    }
  };

  const handleReschedule = (id: number, date: string, time: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, date, time } : b));
  };

  const handleSendMessage = (contactId: string, text: string, messageId?: number) => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    setContacts(prev => prev.map(c => {
      if (c.id === contactId) {
        let newMessages;
        if (messageId) {
          newMessages = c.messages.map(m => m.id === messageId ? { ...m, text } : m);
        } else {
          newMessages = [...c.messages, { id: Date.now(), sender: 'me', text, time, date: 'TODAY' } as Message];
        }
        return { ...c, messages: newMessages };
      }
      return c;
    }));
  };

  const handleAddSlot = (slot: Omit<AvailabilitySlot, 'id'>) => {
    setSlots(prev => [...prev, { ...slot, id: Date.now() }]);
  };

  const handleDeleteSlot = (id: number) => {
    setSlots(prev => prev.filter(s => s.id !== id));
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage('bookings');
  };

  const handleLogout = () => {
    setAuthState('login');
    setCurrentPage('dashboard');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard user={currentUser} bookings={bookings} onPageChange={setCurrentPage} onSearch={handleSearch} />;
      case 'bookings':
        return <Bookings bookings={bookings} onStatusChange={handleStatusChange} onReschedule={handleReschedule} onPageChange={setCurrentPage} />;
      case 'chat':
        return <Chat contacts={contacts} activeContactId={activeChatId} onContactSelect={setActiveChatId} onSendMessage={handleSendMessage} />;
      case 'availability':
        return <Availability slots={slots} bookings={bookings} />;
      case 'pricing':
        return <Pricing experience={experience} />;
      case 'reviews':
        return <Reviews reviews={INITIAL_REVIEWS} />;
      case 'kyc':
        return <KYC />;
      case 'settings':
        return <Settings />;
      case 'profile':
        return <Profile user={currentUser} onExperienceChange={setExperience} />;
      case 'live-class':
        return null; // Handled by fixed overlay
      default:
        return <Dashboard user={currentUser} bookings={bookings} onPageChange={setCurrentPage} onSearch={handleSearch} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="label-caps opacity-40 animate-pulse tracking-widest font-black uppercase text-xs">Syncing with Eduqra Database...</p>
      </div>
    );
  }

  if (authState !== 'authenticated') {
    return (authState === 'register' 
      ? <Registration onComplete={() => setAuthState('authenticated')} onSwitchToLogin={() => setAuthState('login')} /> 
      : <Login onLogin={() => setAuthState('authenticated')} onSwitchToRegister={() => setAuthState('register')} />);
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar user={currentUser} currentPage={currentPage} onPageChange={setCurrentPage} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="md:ml-[280px] ml-0 min-h-screen flex flex-col transition-all duration-500 ease-[0.16,1,0.3,1]">
        <TopBar
          user={currentUser}
          onPageChange={setCurrentPage}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          onLogout={handleLogout}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
          onMarkRead={handleMarkRead}
        />
        <div className={cn("flex-1 overflow-x-hidden", currentPage === 'chat' ? "p-0 md:p-6" : "p-4 md:p-10")}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              className="h-full"
              initial={{ opacity: 0, y: 30, scale: 0.98, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -30, scale: 0.98, filter: 'blur(10px)' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Live Class Overlay */}
      <AnimatePresence>
        {currentPage === 'live-class' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[#0A0A0B] text-white flex flex-col font-sans overflow-hidden"
          >
            {/* Header Bar */}
            <div className="h-20 px-6 flex items-center justify-between border-b border-white/5 bg-[#121214]/80 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                  <GraduationCap className="text-primary" size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight">Advanced Calculus - Student Session</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${sessionStatus === 'live' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : sessionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-white/20'}`}></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                      {sessionStatus === 'live' ? 'Live Session' : sessionStatus === 'connecting' ? 'Connecting...' : 'Waiting'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Elapsed</span>
                  <span className="text-xl font-mono font-bold tracking-wider text-primary">{sessionTimer}</span>
                </div>
                <button onClick={() => setCurrentPage('dashboard')} className="p-3 hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} className="text-white/40" />
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex relative overflow-hidden">
              <div className={`flex-1 p-6 flex flex-col items-center justify-center gap-6 transition-all duration-500 ${isLiveChatOpen ? 'md:pr-[400px]' : ''}`}>
                
                {/* Video Grid */}
                <div className="w-full h-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  {/* Remote Participant (Student) */}
                  <div className="relative bg-[#1A1A1E] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center group">
                    {sessionStatus === 'live' ? (
                      <>
                        <img 
                          src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&h=800&fit=crop" 
                          className="w-full h-full object-cover grayscale-[0.2]"
                          alt="Student Video"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                          <div className="flex items-center gap-3">
                            <div className="p-1 px-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg backdrop-blur-md">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Active</span>
                              </div>
                            </div>
                            <p className="text-sm font-bold text-white/90">Alex Johnson (Student)</p>
                          </div>
                        </div>
                      </>
                    ) : sessionStatus === 'waiting' ? (
                      <div className="text-center space-y-6">
                        <div className="relative w-24 h-24 mx-auto">
                          <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-ping"></div>
                          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl relative z-10 border-4 border-white">AJ</div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg font-serif italic text-white/80">Alex Johnson</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">Waiting for student to join...</p>
                        </div>
                        <button onClick={startSession} className="px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Start Session</button>
                      </div>
                    ) : sessionStatus === 'connecting' ? (
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Securing Connection...</p>
                      </div>
                    ) : (
                      <div className="text-center p-8 bg-rose-500/5 rounded-[3rem] border border-rose-500/20">
                        <XCircle size={40} className="text-rose-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-rose-500 mb-2">Session Ended</h3>
                        <p className="text-sm text-white/40 max-w-xs">The student has disconnected.</p>
                      </div>
                    )}
                  </div>

                  {/* Local Participant (Tutor Self) */}
                  <div className={`relative bg-[#1A1A1E] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center transition-opacity duration-700 ${sessionStatus === 'live' ? 'opacity-100' : 'opacity-40'}`}>
                    {isCamOn ? (
                      <div className="w-full h-full relative group">
                        <video 
                          ref={localVideoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover grayscale-[0.2]" 
                        />
                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                          <p className="text-sm font-bold text-white/90">Dr. Sarah Jenkins (You)</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                          <User size={32} className="text-white/20" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Camera Off</p>
                      </div>
                    )}
                    
                    {!isMicOn && (
                      <div className="absolute top-6 right-6 p-2 bg-rose-500 text-white rounded-xl shadow-lg ring-4 ring-rose-500/20">
                        <Mic size={16} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Centered Controls Overlay */}
                <div className="flex items-center gap-2 md:gap-4 bg-[#121214]/60 backdrop-blur-2xl p-2.5 px-4 md:px-6 rounded-[2.5rem] border border-white/10 shadow-2xl z-20">
                  <button 
                    onClick={() => setIsMicOn(!isMicOn)}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'}`}
                  >
                    {isMicOn ? <Mic size={20} /> : <XCircle size={20} />}
                  </button>
                  
                  <button 
                    onClick={() => setIsCamOn(!isCamOn)}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isCamOn ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-white text-black'}`}
                  >
                    {isCamOn ? <Camera size={20} /> : <X size={20} />}
                  </button>

                  <button 
                    onClick={handleScreenShare}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white hover:bg-white/10'}`}
                  >
                    <Monitor size={20} />
                  </button>

                  <button 
                    onClick={endSession}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-rose-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-rose-500/40"
                  >
                    <LogOut size={20} />
                  </button>

                  <div className="w-px h-8 bg-white/10 mx-1 md:mx-2"></div>

                  <button 
                    onClick={() => setIsLiveChatOpen(!isLiveChatOpen)}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isLiveChatOpen ? 'bg-primary text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
                  >
                    <MessageSquare size={20} />
                  </button>
                </div>
              </div>

              {/* Sliding Chat Panel */}
              <AnimatePresence>
                {isLiveChatOpen && (
                  <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    className="fixed right-0 top-0 bottom-0 md:relative w-full max-w-[400px] bg-[#121214] border-l border-white/5 flex flex-col shadow-2xl z-[210]"
                  >
                    <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <MessageSquare className="text-primary" size={18} />
                        </div>
                        <h3 className="font-bold text-sm tracking-tight">Session Chat</h3>
                      </div>
                      <button onClick={() => setIsLiveChatOpen(false)} className="text-white/20 hover:text-white transition-colors">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
                      <div className="text-center py-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Messages are private & secure</p>
                      </div>
                      
                      <div className="space-y-4">
                        {liveMessages.length === 0 && (
                          <div className="text-center py-20">
                            <Smile size={32} className="text-white/5 mx-auto mb-4" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">No messages yet</p>
                          </div>
                        )}
                        {liveMessages.map(msg => (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={msg.id} 
                            className="flex flex-col items-end gap-1"
                          >
                            <div className="bg-primary px-4 py-2.5 rounded-2xl rounded-tr-none text-sm font-semibold max-w-[85%] text-white">
                              {msg.text}
                            </div>
                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter pr-1">{msg.time}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 md:p-6 bg-[#0A0A0B] border-t border-white/5">
                      <div className="relative flex items-center">
                        <input 
                          placeholder="Type a message..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSendLiveMessage(e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                          className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-6 pr-14 outline-none focus:bg-white/10 focus:border-primary/40 transition-all font-semibold text-sm placeholder:text-white/20 text-white"
                        />
                        <button className="absolute right-3 p-2 bg-primary rounded-xl text-white shadow-lg shadow-primary/20">
                          <Send size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
