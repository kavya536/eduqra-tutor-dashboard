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
import { GraduationCap, LogOut, X, User, Camera, Mic, MicOff, XCircle, Send, MessageSquare, Smile, Clock, Monitor, ShieldCheck, AlertCircle, Check } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc, serverTimestamp, addDoc, setDoc, orderBy, increment, arrayUnion } from 'firebase/firestore';

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
  const parseTimeStr = (t: string) => {
    if (!t) return 0;
    const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let [_, h, m, ampm] = match;
    let hours = parseInt(h, 10);
    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return hours * 60 + parseInt(m, 10);
  };

  // Correct Auth & Profile State Management
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isReapplying, setIsReapplying] = useState(false);
  const [prefilledEmail, setPrefilledEmail] = useState('');
  const [view, setView] = useState<'login' | 'register' | 'app'>('login');
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    // 1. Handle query parameters for re-application flow (triggered by email links)
    const urlParams = new URLSearchParams(window.location.search);
    const reapplyFlag = urlParams.get('reapply');
    const autoEmail = urlParams.get('email');
    
    if (reapplyFlag === 'true') {
      setIsReapplying(true);
      if (autoEmail) setPrefilledEmail(autoEmail);
      setView('register');
      // Clean URL to avoid re-triggering on refresh
      window.history.replaceState({}, '', window.location.pathname);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        setProfileLoading(true);
        
        // 2. Listen to 'tutors' (Pending or Approved)
        const unsubProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data());
            setView('app');
            setProfileLoading(false);
            setLoading(false);
          } else {
            // AUTO-MIGRATION BRIDGE: 
            // If not in 'users', check legacy 'tutors' or 'rejectedProfiles'
            try {
              let legacyDoc = null;
              let isFromLegacy = false;

              // 1. Direct UID Check
              const tutorSnap = await getDoc(doc(db, 'tutors', firebaseUser.uid));
              const rejSnap = !tutorSnap.exists() ? await getDoc(doc(db, 'rejectedProfiles', firebaseUser.uid)) : null;
              
              if (tutorSnap.exists() || (rejSnap?.exists())) {
                legacyDoc = tutorSnap.exists() ? tutorSnap : rejSnap;
                isFromLegacy = true;
              } else {
                // 2. Email Fallback Check (Crucial for linking older registrations)
                const qUsers = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
                const userLegacySnap = await getDocs(qUsers);
                
                if (!userLegacySnap.empty) {
                   const userDoc = userLegacySnap.docs[0];
                   console.log("🛠️ Linking existing user record to new UID:", firebaseUser.uid);
                   const userData = userDoc.data();
                   await setDoc(doc(db, 'users', firebaseUser.uid), { ...userData, id: firebaseUser.uid }, { merge: true });
                   setProfile({ ...userData, id: firebaseUser.uid });
                   setView('app');
                   setProfileLoading(false);
                   setLoading(false);
                   return;
                }
              }

              if (legacyDoc) {
                console.log("🛠️ Profile Found (Migration Required). Syncing to unified schema...");
                const data = legacyDoc.data();
                const migratedProfile = {
                  ...data,
                  id: firebaseUser.uid,
                  role: 'tutor',
                  status: (data.status === 'rejected' || legacyDoc.ref.path.includes('rejected')) ? 'rejected' : (data.status || 'pending'),
                  documents: data.documents || {
                    profileImage: data.avatar || data.profileImage || null,
                    identityProof: data.identityProof || data.identityURL || data.idCard || null,
                    degreeCertificate: data.degreeCertificate || data.degreeURL || data.qualificationDoc || null,
                    experienceCertificate: data.experienceCertificate || data.certURL || data.expDoc || null,
                    demoVideo: data.demoVideo || data.videoURL || null
                  }
                };
                
                await setDoc(doc(db, 'users', firebaseUser.uid), migratedProfile, { merge: true });
                setProfile(migratedProfile);
                setView('app');
              } else {
                // Truly new user with no record anywhere
                setProfile(null);
                setView('register');
              }
            } catch (err) {
              console.error("Linker check failed:", err);
            } finally {
              setProfileLoading(false);
              setLoading(false);
            }
          }
        });
        
        return () => unsubProfile();
      } else {
        setUser(null);
        setProfile(null);
        setView('login');
        setLoading(false);
        setProfileLoading(false);
      }
    });

    return () => unsubscribe();
  }, []); // Only listen once on mount

  // Handle Re-apply Action (Single Collection Logic)
  const handleReapply = async () => {
    if (!user) return;
    setProfileLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        status: 'pending',
        rejectionReason: "", // Clear the reason
        reappliedAt: serverTimestamp()
      });
      console.log("✅ Re-application successful in users collection.");
      
      // Notify Admin
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'Reapplication',
        tutorId: user.uid,
        title: 'Tutor Re-application',
        message: `${profile?.name || 'A tutor'} has corrected their profile and re-applied.`,
        time: serverTimestamp(),
        read: false
      });
    } catch (err) {
      console.error("Re-apply failed:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Scroll to top when page changes
  useEffect(() => {
    // Use setTimeout to ensure scroll happens after page transition
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      // Also scroll the main content area if it exists
      const mainElement = document.querySelector('main') || document.querySelector('.main-content') || document.body;
      if (mainElement) {
        mainElement.scrollTop = 0;
      }
    }, 100);
  }, [currentPage]);
  
  // --- REAL-TIME DATA STATE ---
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<TutorNotification[]>([]);
  const [manualSlots, setManualSlots] = useState<AvailabilitySlot[]>([]);

  // Keep local availability slots in sync with profile data from Firestore.
  useEffect(() => {
    const profileAvailability = profile?.availability;
    if (!Array.isArray(profileAvailability)) {
      setManualSlots([]);
      return;
    }

    const normalizedSlots: AvailabilitySlot[] = profileAvailability
      .map((slot: any, idx: number) => {
        if (!slot || typeof slot !== 'object') return null;
        return {
          id: typeof slot.id === 'number' ? slot.id : Date.now() + idx,
          day: slot.day || '',
          date: slot.date || '',
          start: slot.start || '',
          end: slot.end || '',
          booked: !!slot.booked
        } as AvailabilitySlot;
      })
      .filter((slot: AvailabilitySlot | null): slot is AvailabilitySlot => !!slot && !!slot.day && !!slot.start && !!slot.end);

    setManualSlots(normalizedSlots);
  }, [profile?.availability]);

  // Handle Real-time Sync
  useEffect(() => {
    if (!profile?.id) return;

    // 1. Sync Bookings (Classes)
    const bQuery = query(collection(db, 'bookings'), where('tutorId', '==', profile.id));
    const unsubBookings = onSnapshot(bQuery, (snap) => {
      const bookingList = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      // Sort locally to avoid index requirement
      bookingList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setBookings(bookingList);
    });

    // 2. Sync Chat Global (Rename to whatsapp)
    const cQuery = query(collection(db, 'whatsapp'), where('tutorId', '==', profile.id));
    const unsubChats = onSnapshot(cQuery, (snap) => {
      setContacts(prev => {
        const chatList = snap.docs.map(d => {
          const data = d.data();
          const existing = prev.find(p => p.id === d.id);
          return {
            id: d.id,
            name: data.studentName || data.studentEmail || 'Student',
            initials: (data.studentName || 'ST').substring(0, 2).toUpperCase(),
            online: true,
            unread: data.tutorUnreadCount || 0,
            studentUnreadCount: data.studentUnreadCount || 0,
            timestamp: data.timestamp,
            lastMessage: data.lastMessage || 'No messages yet',
            time: getSmartDate(data.timestamp || data.lastMessageTime),
            messages: existing?.messages || []
          } as any;
        });
        chatList.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        return chatList;
      });
    });

    // 3. Sync Notifications
    const nQuery = query(collection(db, 'tutor_notifications'), where('tutorId', '==', profile.id));
    const unsubNotifs = onSnapshot(nQuery, (snap) => {
      const notifList = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      // Sort by time (assuming it has a timestamp or similar, if not we use ID or createdAt)
      notifList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotifications(notifList);
    });

    return () => {
      unsubBookings();
      unsubChats();
      unsubNotifs();
    };
  }, [profile?.id]);

  // 4. Sync Active Chat Messages
  useEffect(() => {
    if (!activeChatId || !profile?.id) return;

    const mQuery = query(collection(db, `whatsapp/${activeChatId}/messages`), orderBy('timestamp', 'asc'));
    const unsubMsgs = onSnapshot(mQuery, (snap) => {
      const msgs = snap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          sender: data.senderId === profile.id ? 'me' : 'student' 
        };
      }).filter((m: any) => !m.deletedBy?.includes(profile.id)); // Local filter for "Delete for me"
      
      setContacts(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: msgs } : c));
      
      // Mark Read
      const chatRef = doc(db, 'whatsapp', activeChatId);
      updateDoc(chatRef, { tutorUnreadCount: 0 });
    });

    return () => unsubMsgs();
  }, [activeChatId, profile?.id]);

  
  // --- WhatsApp-style Smart Date Logic ---
  const getSmartDate = (dateVal: any) => {
    if (!dateVal) return 'Now';
    let date: Date;
    
    // Handle Firestore Timestamps
    if (dateVal.seconds) {
      date = new Date(dateVal.seconds * 1000);
    } else {
      date = new Date(dateVal);
    }

    if (isNaN(date.getTime())) return 'Now';

    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return weekdays[date.getDay()];
    }
    
    return date.toLocaleDateString();
  };

  // --- Real-time Handlers ---
  const baseSendMessage = async (contactId: string, payload: any) => {
    if (!profile?.id) return;
    const chatId = contactId.includes('_') ? contactId : `${profile.id}_${contactId.replace(/\./g, '_')}`;
    const chatRef = doc(db, 'whatsapp', chatId);
    const msgCol = collection(chatRef, 'messages');

    const now = new Date();
    const msg = {
      senderId: profile.id,
      timestamp: serverTimestamp(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: now.toDateString(), // Store real date string for Today/Yesterday logic
      deletedBy: [],
      ...payload
    };

    if (payload.editId) {
      // Logic for editing existing message
      const msgRef = doc(db, `whatsapp/${chatId}/messages`, payload.editId);
      await updateDoc(msgRef, { text: payload.text, edited: true });
    } else {
      await addDoc(msgCol, msg);
    }

    // Always keep chat document metadata in sync
    await setDoc(chatRef, {
      lastMessage: payload.text || (payload.type === 'poll' ? '📊 Poll' : '📎 Attachment'),
      lastMessageTime: now.toISOString(),
      timestamp: serverTimestamp(),
      studentUnreadCount: payload.editId ? increment(0) : increment(1),
      tutorId: profile.id,
      tutorName: profile.name,
      tutorAvatar: profile.avatar || '',
      studentEmail: contactId.includes('_') ? contactId.split(/_(.+)/)[1].replace(/_/g, '.') : contactId,
      studentName: bookings.find(b => b.studentEmail === (contactId.includes('_') ? contactId.split(/_(.+)/)[1].replace(/_/g, '.') : contactId))?.name || 'Student'
    }, { merge: true });
  };

  const handleSendMessage = async (contactId: string, text: string, editId?: any) => {
    if (!text.trim() || !contactId) return;
    if (editId) {
      await baseSendMessage(contactId, { text: text.trim(), editId });
    } else {
      await baseSendMessage(contactId, { text: text.trim() });
    }
  };

  const handleDeleteMessage = async (msgId: string, everyone: boolean) => {
    if (!activeChatId || !profile?.id) return;
    const msgRef = doc(db, `whatsapp/${activeChatId}/messages`, msgId);

    if (everyone) {
      await updateDoc(msgRef, {
        text: '🚫 This message was deleted',
        deletedForEveryone: true
      });
    } else {
      await updateDoc(msgRef, {
        deletedBy: arrayUnion(profile.id)
      });
    }
  };
  
  const handleVote = async (messageId: string, optionIndex: number) => {
    if (!profile?.id || !activeChatId) return;
    const msgRef = doc(db, `whatsapp/${activeChatId}/messages`, messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    
    const data = snap.data();
    const votes = { ...(data.pollData?.votes || {}) };
    const emailKey = profile.id.replace(/\./g, '_'); // Using profile.id for consistency
    let userVotes = votes[emailKey] || [];
    
    if (data.pollData.allowMultiple) {
      if (userVotes.includes(optionIndex)) {
        userVotes = userVotes.filter((v: number) => v !== optionIndex);
      } else {
        userVotes.push(optionIndex);
      }
    } else {
      userVotes = [optionIndex];
    }
    
    votes[emailKey] = userVotes;
    await updateDoc(msgRef, { 'pollData.votes': votes });
  };

  const handleOpenChat = async (booking: Booking) => {
    if (!profile?.id || !booking.studentEmail) return;
    
    const chatId = `${profile.id}_${booking.studentEmail.replace(/\./g, '_')}`;
    const chatRef = doc(db, 'whatsapp', chatId);
    
    // Proactively initialize the chat document in 'whatsapp' if it's the first interaction
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) {
      const initialMsg = 'Hello! How can I help you today?';
      await setDoc(chatRef, {
        tutorId: profile.id,
        tutorName: profile.name,
        tutorAvatar: profile.avatar || '',
        studentEmail: booking.studentEmail,
        studentName: booking.name || (booking as any).studentName || 'Student',
        studentAvatar: '',
        lastMessage: initialMsg,
        lastMessageTime: new Date().toISOString(),
        timestamp: serverTimestamp(),
        tutorUnreadCount: 0,
        studentUnreadCount: 1
      });

      // Add actual message record
      await addDoc(collection(chatRef, 'messages'), {
        senderId: profile.id,
        text: initialMsg,
        timestamp: serverTimestamp(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: 'TODAY',
        deletedBy: []
      });
    }

    setActiveChatId(chatId);
    setCurrentPage('chat');
  };

  const [experience, setExperience] = useState(profile?.experience === 'Fresher' ? 0 : 6);
  const [searchTerm, setSearchTerm] = useState('');
  const [openRescheduleFor, setOpenRescheduleFor] = useState<number | null>(null);

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

  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [talkingTime, setTalkingTime] = useState(0);
  const talkingTimeRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<any>(null);


  // --- Real-time Attendance & Global Status Engine ---
  useEffect(() => {
    if (!profile?.id || !bookings.length) return;

    const auditInterval = setInterval(async () => {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const todayStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const isoToday = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

      bookings.forEach(async (booking) => {
        if (booking.status === 'confirmed' || booking.status === 'pending') {
          const isToday = booking.date === todayStr || booking.date === isoToday;
          const bMins = parseTimeStr(booking.time);
          const durationHrs = parseFloat(booking.duration || '1');
          const diff = bMins - nowMins;

          // 1. 10min Pre-Class Notification
          if (isToday && diff === 10) {
            const notifId = `rem_${booking.id}`;
            if (!notifications.some(n => n.id === notifId)) {
              setNotifications(prev => [{
                id: notifId,
                type: 'booking',
                title: 'Class Starts in 10m!',
                description: `Your session with ${booking.name} starts soon. Please prepare to join.`,
                time: 'Just now',
                read: false
              }, ...prev]);
            }
          }

          // 2. Automated Completion/Cancellation Audit (60m + extra margin)
          if (isToday && nowMins > (bMins + (durationHrs * 60) + 10)) {
            const bookingRef = doc(db, 'bookings', booking.id.toString());
            const snap = await getDoc(bookingRef);
            if (snap.exists()) {
              const data = snap.data();
              if (data.status === 'confirmed' || data.status === 'pending') {
                  if (data.studentPresent && data.tutorJoined && (data.talkingTime || 0) >= 840) {
                    await updateDoc(bookingRef, { 
                      status: 'completed', 
                      attendance_status: 'attended', 
                      completedAt: serverTimestamp() 
                    });
                  } else {
                    await updateDoc(bookingRef, { 
                      status: 'cancelled', 
                      attendance_status: 'not_attended' 
                    });
                  }
              }
            }
          }
          
          // 3. Auto-cancel pending sessions if they started without confirmation
          if (isToday && nowMins > bMins && booking.status === 'pending') {
             await updateDoc(doc(db, 'bookings', booking.id.toString()), { status: 'cancelled' });
          }
        }
      });
    }, 60000);

    return () => clearInterval(auditInterval);
  }, [bookings, profile?.id, notifications]);


  const handleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      
      // Update Firestore state
      if (activeMeetingId) {
        updateDoc(doc(db, 'live_sessions', activeMeetingId), {
          tutorSharing: false
        }).catch(e => console.error(e));
      }

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

        // Update Firestore state
        if (activeMeetingId) {
          updateDoc(doc(db, 'live_sessions', activeMeetingId), {
            tutorSharing: true
          }).catch(e => console.error(e));
        }

        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setIsCamOn(true);
          if (activeMeetingId) {
            updateDoc(doc(db, 'live_sessions', activeMeetingId), {
              tutorSharing: false
            }).catch(e => console.error(e));
          }
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
  
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [sessionTopic, setSessionTopic] = useState('');

  const startSession = async (bookingId: string) => {
    setCurrentPage('live-class');
    setSessionStatus('connecting');
    setActiveMeetingId(bookingId);

    // Track tutor joined in booking
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, { 
      tutorJoined: true, 
      tutorPresent: true,
      status: 'live',
      startedAt: serverTimestamp()
    });

    // Initialize/Update Live Session in Firestore
    const sessionRef = doc(db, 'live_sessions', bookingId);
    await setDoc(sessionRef, {
      tutorId: profile.id,
      tutorName: profile.name,
      tutorJoined: true,
      tutorMicOn: isMicOn,
      tutorCamOn: isCamOn,
      tutorSharing: false,
      status: 'live',
      participants: [profile.name],
      startTime: serverTimestamp(),
      lastUpdate: serverTimestamp(),
      startedAt: serverTimestamp() // Secondary sync for UI redundancy
    }, { merge: true });

    // Listen for reactions, student entry & messages
    const unsub = onSnapshot(sessionRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status === 'completed') {
        endSession();
        return;
      }
    });

    const msgUnsub = onSnapshot(query(collection(db, `live_sessions/${bookingId}/messages`), orderBy('timestamp', 'asc')), (snap) => {
      const msgs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...'
      })) as any[];
      setLiveMessages(msgs);
    });

    const startVoiceDetection = (stream: MediaStream) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        detectionIntervalRef.current = setInterval(() => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Check average volume
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          
          if (average > 15) { // Threshold for talking
            talkingTimeRef.current += 1;
            setTalkingTime(talkingTimeRef.current);
            
            // Periodically sync to DB for the audit engine
            if (talkingTimeRef.current % 30 === 0 && activeMeetingId) {
               updateDoc(doc(db, 'bookings', activeMeetingId), { talkingTime: talkingTimeRef.current });
            }
          }
        }, 1000);
      } catch (e) {
        console.error("Audio detection error:", e);
      }
    };

    setTimeout(async () => {
      setSessionStatus('live');
      
      const bSnap = await getDoc(bookingRef);
      if (bSnap.exists()) {
        const bData = bSnap.data();
        if (bData.startedAt) {
          setSessionStartTime(bData.startedAt.toDate());
        } else {
          setSessionStartTime(new Date());
        }
      }
      
      // Start voice detection
      try {
        const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = aStream;
        startVoiceDetection(aStream);
      } catch (err) {
        console.error("Error starting mic for detection:", err);
      }
    }, 1500);

    return () => {
      unsub();
      msgUnsub();
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  };

  const endSession = async () => {
    const bookingId = activeMeetingId;
    if (!bookingId) return;

    if (!showTopicModal && !sessionTopic) {
      setShowTopicModal(true);
      return;
    }

    const finalTopic = sessionTopic.trim() || bookings.find(b => b.id.toString() === bookingId)?.subject || 'Class Session';

    try {
      const sessionRef = doc(db, 'live_sessions', bookingId);
      await updateDoc(sessionRef, {
        tutorJoined: false,
        status: 'completed',
        endTime: serverTimestamp()
      });

      // Also mark the specific booking as completed and finalize attendance
      const bookingDoc = doc(db, 'bookings', bookingId);
      const snap = await getDoc(bookingDoc);
      
      if (snap.exists()) {
        const bookingData = snap.data() as Booking;
        const isVoiceSuccess = talkingTimeRef.current >= 840; // 14 mins
        
        let durationMins = 0;
        if (sessionStartTime) {
          durationMins = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 60000);
        }

        const updates: any = { 
          status: 'completed',
          topic: finalTopic,
          durationConducted: durationMins,
          talkingTime: talkingTimeRef.current,
          completedAt: serverTimestamp()
        };

        if (bookingData.isGroup && bookingData.participantData) {
          // Process attendance for each participant in the group
          const updatedParticipantData = { ...bookingData.participantData };
          Object.keys(updatedParticipantData).forEach(emailKey => {
            const p = updatedParticipantData[emailKey];
            if (p.joinTime) {
              const joinTime = p.joinTime.toDate();
              const stayDuration = Math.floor((new Date().getTime() - joinTime.getTime()) / 60000);
              // Student must stay 12 mins AND Tutor must talk 14 mins
              updatedParticipantData[emailKey].status = (stayDuration >= 12 && isVoiceSuccess) ? 'attended' : 'not_attended';
            }
          });
          updates.participantData = updatedParticipantData;
          updates.attendance_status = isVoiceSuccess ? 'attended' : 'not_attended'; // Overall session status
        } else {
          // 1-on-1 logic
          const studentJoinTime = bookingData.studentJoinTime?.toDate();
          const studentStayDuration = studentJoinTime ? Math.floor((new Date().getTime() - studentJoinTime.getTime()) / 60000) : 0;
          
          updates.attendance_status = (bookingData?.studentPresent && isVoiceSuccess && studentStayDuration >= 12) ? 'attended' : 'not_attended';
        }

        await updateDoc(bookingDoc, updates);
      }
    } catch (e) {
      console.error("Error finalizing class:", e);
    }

    setShowTopicModal(false);
    setSessionTopic('');
    setSessionStatus('disconnected');
    setSessionStartTime(null);
    setSessionTimer("00:00:00");
    setTimeout(() => {
      setActiveMeetingId(null);
      setCurrentPage('dashboard');
    }, 2000);
  };

  const handleMuteAll = async () => {
    if (!activeMeetingId) return;
    const sessionRef = doc(db, 'live_sessions', activeMeetingId);
    await updateDoc(sessionRef, {
      muteAllSignal: Date.now() // Trigger for students
    });
  };

  const handleSendLiveMessage = async (text: string) => {
    if (!text.trim() || !activeMeetingId) return;
    
    await addDoc(collection(db, `live_sessions/${activeMeetingId}/messages`), {
      sender: profile.name,
      senderId: profile.id,
      text,
      timestamp: serverTimestamp()
    });
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

  const handleStatusChange = async (id: any, status: BookingStatus) => {
    try {
      // 1. Update Firestore first for persistence
      const bookingRef = doc(db, 'bookings', id.toString());
      await updateDoc(bookingRef, { status });

      // 2. Update local state
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      
      const booking = bookings.find(b => b.id === id);
      if (booking && status === 'confirmed') {
        addNotification({
          type: 'booking',
          title: 'Booking Confirmed',
          description: `${booking.name || 'Student'}'s ${booking.subject || 'Session'} confirmed.`,
        });
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      alert("Failed to update status. Please check your connection.");
    }
  };



  const handleAddSlot = (slot: Omit<AvailabilitySlot, 'id'>) => {
    const newSlots = [...manualSlots, { ...slot, id: Date.now(), booked: false }];
    setManualSlots(newSlots);
    
    // Sync to Firestore profile
    if (profile?.id) {
      const profileRef = doc(db, 'users', profile.id);
      updateDoc(profileRef, { availability: newSlots });
    }
  };

  const handleDeleteSlot = (id: number) => {
    const newSlots = manualSlots.filter(s => s.id !== id);
    setManualSlots(newSlots);
    
    // Sync to Firestore profile
    if (profile?.id) {
      const profileRef = doc(db, 'users', profile.id);
      updateDoc(profileRef, { availability: newSlots });
    }
  };

  const handleEditSlot = (id: number, updatedSlot: Partial<AvailabilitySlot>) => {
    const newSlots = manualSlots.map(s => s.id === id ? { ...s, ...updatedSlot } : s);
    setManualSlots(newSlots);
    
    // Sync to Firestore profile
    if (profile?.id) {
      const profileRef = doc(db, 'users', profile.id);
      updateDoc(profileRef, { availability: newSlots });
    }
  };

  const handleReschedule = async (id: any, date: string, time: string) => {
    try {
      const bookingRef = doc(db, 'bookings', id.toString());
      await updateDoc(bookingRef, {
        date,
        time,
        status: 'confirmed',
        tutorJoined: false,
        studentJoined: false,
        studentPresent: false,
        topic: '',
        durationConducted: 0,
        completedAt: null
      });

      setBookings(prev => prev.map(b => b.id === id ? { 
        ...b, 
        date, 
        time, 
        status: 'confirmed',
        tutorJoined: false,
        studentJoined: false,
        studentPresent: false,
        topic: '',
        durationConducted: 0,
        completedAt: null
      } : b));

      addNotification({
        type: 'booking',
        title: 'Session Rescheduled',
        description: `You've successfully rescheduled the session. Student has been notified.`,
      });
    } catch (e) {
      console.error("Reschedule error:", e);
      alert("Failed to reschedule session.");
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage('bookings');
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    auth.signOut();
    setView('login');
    setIsReapplying(false);
    setPrefilledEmail('');
    setCurrentPage('dashboard');
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard user={{...user, ...profile}} bookings={bookings} onPageChange={setCurrentPage} onSearch={handleSearch} onRescheduleStart={(id) => { setOpenRescheduleFor(id); setCurrentPage('bookings'); }} onReschedule={handleReschedule} tutorAvailability={manualSlots} onJoinSession={startSession} />;
      case 'bookings':
        return <Bookings bookings={bookings} onStatusChange={handleStatusChange} onRescheduleStart={(id) => { setOpenRescheduleFor(id); }} onReschedule={handleReschedule} onPageChange={setCurrentPage} onOpenChat={handleOpenChat} initialRescheduleId={openRescheduleFor} onClearReschedule={() => setOpenRescheduleFor(null)} tutorAvailability={manualSlots} />;
      case 'chat': {
        const bookedStudents = Array.from(new Set(bookings.map(b => b.studentEmail))).filter((email): email is string => typeof email === 'string' && !!email);
        const fullContactList = [
          ...contacts,
          ...bookedStudents
            .filter(email => !contacts.some(c => c.id.includes(email?.replace(/\./g, '_') || '')))
            .map(email => {
              const b = bookings.find(b => b.studentEmail === email);
              return {
                id: `${profile.id}_${email?.replace(/\./g, '_')}`,
                name: b?.studentName || b?.name || 'Student',
                initials: (b?.studentName || b?.name || 'ST').substring(0, 2).toUpperCase(),
                online: false,
                unread: 0,
                lastMessage: '👋 Start a conversation...',
                time: 'Now',
                messages: []
              };
            })
        ];
        return (
          <Chat 
            contacts={fullContactList} 
            activeContactId={activeChatId} 
            onContactSelect={(id) => {
              const cleanedId = id.includes('_') ? id.split(/_(.+)/)[1].replace(/_/g, '.') : id;
              handleOpenChat({ studentEmail: cleanedId, name: fullContactList.find(c => c.id === id)?.name } as any);
            }} 
            onSendMessage={handleSendMessage} 
            onSpecialMessage={baseSendMessage}
            onDeleteMessage={handleDeleteMessage} 
            onVote={handleVote}
            profile={profile}
          />
        );
      }
      case 'availability':
        return (
          <Availability 
            slots={manualSlots} 
            bookings={bookings} 
            onAddSlot={handleAddSlot}
            onDeleteSlot={handleDeleteSlot}
            onEditSlot={handleEditSlot}
          />
        );
      case 'pricing':
        return <Pricing experience={experience} />;
      case 'reviews':
        const realReviews = bookings
          .filter(b => b.reviewSubmitted)
          .map(b => ({
            id: b.id,
            studentName: b.studentName || 'Scholar Student',
            rating: b.reviewRating || 5,
            comment: b.reviewComment || 'Excellent teaching style and very patient.',
            date: b.date,
            time: b.time,
            subject: b.subject
          }));
        const combinedReviews = [...INITIAL_REVIEWS, ...realReviews];
        return <Reviews reviews={combinedReviews} profile={profile} />;
      case 'kyc':
        return <KYC />;
      case 'settings':
        return <Settings />;
      case 'profile':
        return <Profile user={{...user, ...profile}} onExperienceChange={setExperience} />;
      case 'live-class':
        return null; // Handled by fixed overlay
      default:
        return <Dashboard user={{...user, ...profile}} bookings={bookings} onPageChange={setCurrentPage} onSearch={handleSearch} onRescheduleStart={(id) => { setOpenRescheduleFor(id); setCurrentPage('bookings'); }} onReschedule={handleReschedule} tutorAvailability={manualSlots} onJoinSession={startSession} />;
    }
  };

  // --- CENTRALIZED CONTENT ROUTER: STATUS-FIRST ---
  const renderAppContent = () => {
    if (loading) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="label-caps opacity-40 animate-pulse tracking-widest font-black uppercase text-xs">Authenticating Profile...</p>
        </div>
      );
    }

    // 1. THE RE-APPLY BRIDGE (Highest Priority Override)
    if (isReapplying) {
      return (
        <Registration 
          currentUser={{ ...user, ...profile }} 
          onComplete={() => { 
            setIsReapplying(false); 
            setView('app'); 
          }} 
          onSwitchToLogin={handleLogout} 
          isCompletingProfile={!!user} 
          isDirectReapply={!user}
          initialEmail={prefilledEmail}
        />
      );
    }

    // 2. UNAUTHENTICATED
    if (!user) {
      if (view === 'register') {
        return (
          <Registration 
            onComplete={() => {
              setIsReapplying(false);
              setView('app');
            }} 
            onSwitchToLogin={() => {
              setIsReapplying(false);
              setPrefilledEmail('');
              setView('login');
            }} 
            isDirectReapply={isReapplying}
            initialEmail={prefilledEmail}
          />
        );
      }
      return (
        <Login 
          onLogin={() => setView('app')} 
          onSwitchToRegister={() => {
            setIsReapplying(false);
            setPrefilledEmail('');
            setView('register');
          }} 
          onReapply={(email) => {
            setIsReapplying(true);
            setPrefilledEmail('');
            setView('register');
          }}
        />
      );
    }

    // 3. AUTHENTICATED BUT PROFILE STILL FETCHING
    if (profileLoading) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 mx-auto"></div>
          <p className="label-caps opacity-40 animate-pulse tracking-widest font-black uppercase text-xs">Fetching your verification status...</p>
        </div>
      );
    }

    // 4. AUTHENTICATED BUT NO PROFILE FOUND (True Registration Incomplete)
    if (!profile) {
      if (view === 'app') {
        // We expected a profile but didn't find one - show a small wait state before forcing registration
        return (
          <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 mx-auto"></div>
            <p className="label-caps opacity-40 animate-pulse tracking-widest font-black uppercase text-xs">Waiting for database synchronization...</p>
          </div>
        );
      }
      return <Registration currentUser={user} onComplete={() => setView('app')} onSwitchToLogin={handleLogout} isCompletingProfile={true} />;
    }

    // 4. STATUS GATE: PENDING
    if (profile.status === 'pending') {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-8 relative">
            <Clock size={40} className="text-amber-500 animate-pulse" />
            <div className="absolute inset-0 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin-slow"></div>
          </div>
          <h2 className="text-3xl font-black mb-4 tracking-tight text-slate-800">Application Under Review</h2>
          <p className="text-slate-500 font-bold max-w-md mb-10 text-sm leading-relaxed">
            Thank you for registering! Your profile is currently being verified by our Super Admin team. 
            <span className="block mt-2 text-primary font-black uppercase text-[10px] tracking-widest">You will get a response regarding your approval within 24 hours.</span>
          </p>

          <div className="max-w-md w-full bg-slate-50/50 border border-slate-100 p-8 rounded-4xl mb-12 text-left">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Verification Progress:</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-green-500/10 rounded-full flex items-center justify-center">
                  <Check size={14} className="text-green-600" />
                </div>
                <span className="text-sm font-bold text-slate-400 line-through">Profile Registered Successfully</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-amber-500/10 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></div>
                </div>
                <span className="text-sm font-bold text-slate-600">Waiting for Super Admin Approval</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                </div>
                <span className="text-sm font-bold text-slate-400">Dashboard Unlocked (Post-Approval)</span>
              </div>
            </div>
          </div>

          <button onClick={handleLogout} className="text-white font-black bg-slate-800 hover:bg-black px-10 py-4 rounded-2xl uppercase text-xs transition-colors shadow-2xl shadow-slate-200">Sign Out</button>
          <p className="mt-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Eduqra Global Academic Atelier</p>
        </div>
      );
    }

    // 5. STATUS GATE: REJECTED
    if (profile.status === 'rejected') {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="w-28 h-28 bg-rose-500 rounded-full flex items-center justify-center mb-10 shadow-2xl shadow-rose-500/30">
            <XCircle size={56} className="text-white" />
          </div>
          <h2 className="text-4xl font-black mb-4 tracking-tight text-on-surface">Action Required</h2>
          <p className="text-rose-600 font-black uppercase text-[10px] mb-8 bg-rose-50 px-4 py-2 rounded-full border border-rose-100">Verification Failed</p>
          
          <div className="max-w-md w-full bg-slate-50 border-l-4 border-rose-500 p-8 rounded-4xl mb-10 text-left">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Admin Feedback & Reason:</p>
            <p className="text-slate-700 font-bold italic text-base leading-relaxed">"{profile.rejectionReason || 'One or more of your documents were blurred or invalid. Please re-apply with clearly visible credentials.'}"</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
            <button onClick={handleReapply} className="w-full bg-primary text-white font-black px-8 py-5 rounded-2xl shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center justify-center gap-3">
              <ShieldCheck size={18} /> Re-apply for Approved Status
            </button>
            <button onClick={handleLogout} className="w-full sm:w-auto text-slate-400 font-bold px-8 py-5 text-[10px]">Sign Out</button>
          </div>
        </div>
      );
    }

    // 6. STATUS GATE: APPROVED (THE ONLY WAY TO REACH THE DASHBOARD)
    if (profile.status === 'approved') {
      return (
        <div className="min-h-screen bg-background text-on-surface">
          <Sidebar 
            currentPage={currentPage} 
            onPageChange={setCurrentPage} 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
            unreadChatCount={contacts.filter(c => c.unread > 0).length}
          />
          <main className="md:ml-[280px] ml-0 min-h-screen flex flex-col transition-all duration-500 ease-[0.16,1,0.3,1]">
            <TopBar
              user={{ ...user, ...profile }}
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

          {/* Live Class Overlay Integrated into Dashboard Access */}
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

                <div className="flex-1 flex relative overflow-hidden">
                   <div className={`flex-1 p-4 md:p-6 flex flex-col items-center justify-center gap-4 md:gap-6 transition-all duration-500 ${isLiveChatOpen ? 'md:pr-[400px]' : ''}`}>
                      
                      {/* Video Grid */}
                      <div className="w-full h-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-stretch">
                        {/* Self Participant (Tutor) */}
                        <div className="relative bg-[#1A1A1E] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center">
                          {isCamOn ? (
                            <div className="w-full h-full relative group">
                              <video 
                                ref={localVideoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className="w-full h-full object-cover grayscale-[0.2]"
                              />
                              <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                <p className="text-xs md:text-sm font-bold text-white/90">{profile.name} (You - Tutor)</p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center space-y-4">
                              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                                <User size={32} className="text-white/20" />
                              </div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Camera Off</p>
                            </div>
                          )}
                          {!isMicOn && (
                            <div className="absolute top-4 right-4 md:top-6 md:right-6 p-2 bg-rose-500 text-white rounded-xl shadow-lg ring-4 ring-rose-500/20">
                              <Mic size={16} />
                            </div>
                          )}
                        </div>

                        {/* Remote Participant(s) */}
                        <div className="relative bg-[#1A1A1E] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center group p-8">
                          {(() => {
                            const b = bookings.find(bk => bk.id.toString() === activeMeetingId);
                            if (b?.isGroup) {
                              return (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                                  <div className="flex -space-x-4">
                                    {[1, 2, 3].map((_, i) => (
                                      <div key={i} className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-[#1A1A1E] flex items-center justify-center font-black ${i === 0 ? 'bg-primary/20 text-primary' : i === 1 ? 'bg-amber-500/20 text-amber-500' : 'bg-rose-500/20 text-rose-500'}`}>
                                        <User size={24} />
                                      </div>
                                    ))}
                                    {b.participantCount && b.participantCount > 3 && (
                                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-[#1A1A1E] bg-[#2A2A30] flex items-center justify-center font-black text-white/40 text-xs">
                                        +{b.participantCount - 3}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm md:text-xl font-serif italic text-white/80">Group Session</p>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mt-2">
                                      {b.participantCount || 0}/5 Participants Enrolled
                                    </p>
                                  </div>
                                  <div className="w-full max-w-sm grid grid-cols-1 gap-2 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
                                    {Object.entries(b.participantData || {}).map(([email, p]: [string, any]) => (
                                      <div key={email} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-2 h-2 rounded-full ${!p.leaveTime && p.joinTime ? 'bg-emerald-500 animate-pulse' : 'bg-white/10'}`} />
                                          <span className="text-[10px] font-bold text-white/60">{p?.name || email.split('@')[0]}</span>
                                        </div>
                                        <span className={`text-[8px] font-black uppercase tracking-tighter ${!p.leaveTime && p.joinTime ? 'text-emerald-500' : 'text-white/20'}`}>
                                          {!p.leaveTime && p.joinTime ? 'Live' : 'Offline'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            } else {
                              // Student 1-on-1 logic
                              return sessionStatus === 'live' ? (
                                <div className="text-center space-y-6">
                                  <div className="relative w-20 h-20 md:w-24 md:h-24 mx-auto">
                                    <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-ping"></div>
                                    <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-2xl border-0 relative z-10">
                                      ST
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-sm md:text-lg font-serif italic text-white/80">Student Connected</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Video Available</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center space-y-6">
                                  <div className="w-12 h-12 border-4 border-white/5 border-t-primary rounded-full animate-spin mx-auto"></div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Waiting for Student...</p>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>

                      {/* Tutor Command Bar */}
                      <div className="flex items-center gap-2 md:gap-4 bg-[#121214]/60 backdrop-blur-2xl p-2 md:p-2.5 px-4 md:px-6 rounded-[2.5rem] border border-white/10 shadow-2xl z-20">
                        <button 
                          onClick={() => setIsMicOn(!isMicOn)}
                          className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'}`}
                        >
                          {isMicOn ? <Mic size={20} /> : <div className="relative"><Mic size={20} /><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-0.5 bg-white rotate-45" /></div>}
                        </button>
                        
                        <button 
                          onClick={() => setIsCamOn(!isCamOn)}
                          className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isCamOn ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-white text-black shadow-lg'}`}
                        >
                          {isCamOn ? <Camera size={20} /> : <div className="relative"><Camera size={20} /><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-0.5 bg-black rotate-45" /></div>}
                        </button>

                        <button 
                          onClick={handleScreenShare}
                          className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white hover:bg-white/10'}`}
                          title="Share Screen"
                        >
                          <Monitor size={20} />
                        </button>

                        <div className="w-px h-8 bg-white/10 mx-1"></div>


                        <div className="relative group">
                          <button className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/5 text-white hover:bg-white/10 flex items-center justify-center transition-all">
                            <Smile size={20} />
                          </button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-[#1A1A1E]/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl hidden group-hover:flex gap-2 shadow-2xl">
                             {['👍', '❤️', '👏', '💡', '🔥', '🎉'].map(emoji => (
                               <button 
                                 key={emoji}
                                 onClick={() => {
                                   if (activeMeetingId) {
                                     addDoc(collection(db, `live_sessions/${activeMeetingId}/reactions`), {
                                       emoji,
                                       sender: profile.name,
                                       timestamp: serverTimestamp()
                                     });
                                   }
                                 }}
                                 className="hover:scale-125 transition-transform p-1 text-xl"
                               >
                                 {emoji}
                               </button>
                             ))}
                          </div>
                        </div>

                        <button 
                          onClick={() => setIsLiveChatOpen(!isLiveChatOpen)}
                          className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isLiveChatOpen ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white hover:bg-white/10'}`}
                        >
                          <MessageSquare size={20} />
                        </button>

                        <div className="w-px h-8 bg-white/10 mx-1"></div>

                        <button 
                          onClick={endSession}
                          className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-rose-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-rose-500/40"
                          title="End Session for All"
                        >
                          <LogOut size={20} />
                        </button>
                      </div>
                   </div>

                   {/* Chat Panel */}
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
                            <h3 className="font-bold text-sm tracking-tight text-white">Class Chat</h3>
                          </div>
                          <button onClick={() => setIsLiveChatOpen(false)} className="text-white/20 hover:text-white transition-colors">
                            <X size={20} />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
                          {liveMessages.map(msg => (
                            <div key={msg.id} className="flex flex-col gap-1 items-end">
                              <div className="bg-primary px-4 py-2.5 rounded-2xl rounded-tr-none text-sm font-semibold max-w-[85%] text-white">
                                {msg.text}
                              </div>
                              <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">{msg.time}</span>
                            </div>
                          ))}
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

          {/* Topic entry modal for ending session */}
          <AnimatePresence>
            {showTopicModal && (
              <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-white rounded-[2.5rem] w-full max-w-md p-8 md:p-10 shadow-2xl"
                >
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-primary text-2xl font-bold">📖</span>
                    </div>
                    <h3 className="text-2xl font-serif font-bold italic text-slate-800">Class Conducted</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">What did you cover today?</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2">Class Topic</label>
                      <input 
                        type="text" 
                        autoFocus
                        placeholder="e.g. Introduction to Derivatives" 
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-800 font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                        value={sessionTopic}
                        onChange={(e) => setSessionTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && endSession()}
                      />
                    </div>
                    
                    <button 
                      onClick={endSession}
                      className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase text-xs tracking-widest"
                    >
                      Complete Session & Save
                    </button>
                    
                    <p className="text-center text-[10px] text-slate-400 font-bold leading-relaxed px-4">
                      Completing this will move the session to history and notify the student.
                    </p>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    // 7. FALLBACK: CATCH-ALL FOR STATUS MISMATCH
    auth.signOut();
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={40} className="text-rose-500 mb-4" />
        <p className="text-slate-500 font-bold">Unauthorized account state. Please sign in again.</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-primary font-bold underline">Return to Login</button>
      </div>
    );
  };

  return (
    <>
      {renderAppContent()}
      
      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md p-8 md:p-10 shadow-2xl"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LogOut size={30} className="text-rose-600" />
                </div>
                <h3 className="text-2xl font-serif font-bold italic text-slate-800">Are you sure?</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Do you want to logout?</p>
              </div>
              
              <div className="space-y-4">
                <button 
                  onClick={confirmLogout}
                  className="w-full bg-rose-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-rose-600/20 hover:scale-[1.02] active:scale-95 transition-all uppercase text-xs tracking-widest"
                >
                  Yes, Logout
                </button>
                
                <button 
                  onClick={cancelLogout}
                  className="w-full bg-slate-100 text-slate-600 font-black py-5 rounded-2xl hover:bg-slate-200 transition-all uppercase text-xs tracking-widest"
                >
                  No, Stay Here
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
