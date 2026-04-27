import { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

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
import { Notes } from './components/Notes';
import { Booking, BookingStatus, ChatContact, AvailabilitySlot, Review, PageId, TutorNotification, Message } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { GraduationCap, LogOut, X, User, Camera, Mic, MicOff, XCircle, Send, MessageSquare, Smile, Clock, Monitor, ShieldCheck, AlertCircle, Check, Play } from 'lucide-react';
import { auth, db, messaging } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getToken, onMessage } from 'firebase/messaging';

import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc, serverTimestamp, addDoc, setDoc, orderBy, increment, arrayUnion } from 'firebase/firestore';

const BOARDS = ['CBSE', 'ICSE', 'IGCSE', 'IB', 'State Board', 'Other'];

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

    if (urlParams.get('view') === 'login') {
      auth.signOut().then(() => {
        window.history.replaceState({}, '', window.location.pathname);
        setView('login');
      });
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        setProfileLoading(true);
        
        // 2. Listen to 'users' collection (The source of truth for all modern accounts)
        const unsubProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // SECURITY: Blocked status check
            if (data.status === 'blocked') {
              setProfile({ id: firebaseUser.uid, ...data });
              setView('login'); 
              setProfileLoading(false);
              setLoading(false);
              return;
            }

            // Sync profile data
            setProfile({ id: docSnap.id, ...data });

            // FLOW CONTROL: 
            // Avoid jumping to 'app' view if the user is actively registering or reapplying,
            // UNLESS the status is already 'approved'. This keeps the success/waiting screens visible.
            if (data.status === 'approved') {
              setView('app');
            } else if (view !== 'register' && view !== 'login') {
              // If we are in 'app' or elsewhere, keep it there to show status screens
              setView('app');
            } else {
              // If we just logged in and profile exists, jump to app view
              setView('app');
            }

            setProfileLoading(false);
            setLoading(false);
          } else {
            // AUTO-MIGRATION BRIDGE: Check legacy collections if 'users' doc is missing
            try {
              let legacyDoc = null;
              const tutorSnap = await getDoc(doc(db, 'tutors', firebaseUser.uid));
              const rejSnap = !tutorSnap.exists() ? await getDoc(doc(db, 'rejectedProfiles', firebaseUser.uid)) : null;
              
              if (tutorSnap.exists() || (rejSnap?.exists())) {
                legacyDoc = tutorSnap.exists() ? tutorSnap : rejSnap;
                if (legacyDoc.data().status === 'blocked') {
                  setProfile({ id: firebaseUser.uid, ...legacyDoc.data() });
                  setView('login');
                  setProfileLoading(false);
                  setLoading(false);
                  return;
                }
              } else {
                // Secondary check: By Email (in case UID changed but email is same)
                const qUsers = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
                const userLegacySnap = await getDocs(qUsers);
                
                if (!userLegacySnap.empty) {
                   const userDoc = userLegacySnap.docs[0];
                   const userData = userDoc.data();
                   // Migrate to correct UID
                   await setDoc(doc(db, 'users', firebaseUser.uid), { 
                     ...userData, 
                     id: firebaseUser.uid,
                     role: 'tutor' // Force role to ensure Admin visibility
                   }, { merge: true });
                   setProfile({ ...userData, id: firebaseUser.uid, role: 'tutor' });
                   setView('app');
                   setProfileLoading(false);
                   setLoading(false);
                   return;
                }
              }

              if (legacyDoc) {
                const data = legacyDoc.data();
                const migratedProfile = {
                  ...data,
                  id: firebaseUser.uid,
                  role: 'tutor', // Ensure role for Admin dashboard query
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
                // TRUE NEW USER: Show registration if they just signed up
                setProfile(null);
                // CRITICAL: Only switch to register if we are NOT already in 'app' (waiting for sync)
                if (view !== 'register' && view !== 'app') setView('register');
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
        setLoading(false);
        setProfileLoading(false);
        setView('login');
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
      console.log("âœ… Re-application successful in users collection.");
      
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
  const [studentProfiles, setStudentProfiles] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState<any[]>([]);

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
          booked: !!slot.booked,
          type: slot.type || 'custom'
        } as AvailabilitySlot;
      })
      .filter((slot: AvailabilitySlot | null): slot is AvailabilitySlot => {
        if (!slot || !slot.day || !slot.start || !slot.end) return false;
        return true;
      });

    // Only update if the content has actually changed to prevent 'ghosting' issues during saves
    const isSame = JSON.stringify(normalizedSlots.map(s => ({...s, id: null}))) === 
                   JSON.stringify(manualSlots.map(s => ({...s, id: null})));
    
    if (!isSame || manualSlots.length === 0) {
      setManualSlots(normalizedSlots);
    }
  }, [profile?.availability]);

  useEffect(() => {
    if (Object.keys(studentProfiles).length > 0) {
      console.log(`[DEBUG PROFILES] Identity Cache Updated:`, studentProfiles);
    }
  }, [studentProfiles]);

  // Handle Real-time Sync
  useEffect(() => {
    if (!profile?.id) return;

    // 1. Sync Bookings (Classes)
    const bQuery = query(collection(db, 'bookings'), where('tutorId', '==', profile.id));
    const unsubBookings = onSnapshot(bQuery, (snap) => {
      const bookingList = snap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          name: data.studentName || data.name || 'Student'
        } as any;
      });
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
          const dId = d.id;
          // 1. IMPROVED EMAIL EXTRACTION
          let sEmail = (data.studentEmail || '').toLowerCase().trim();
          if (!sEmail) {
            // Priority: Find '_at_' then anything before '_tut' (if exists) or the last part
            if (dId.includes('_at_')) {
               // Handles: user_name_at_gmail_dot_com_tutorId
               const parts = dId.split('_at_');
               const local = parts[0]; 
               const rest = parts[1].split('_').filter(p => p.includes('com') || p.includes('dot'))[0] || parts[1].split('_')[0];
               sEmail = `${local}@${rest.replace(/_dot_/g, '.')}`.toLowerCase();
            } else {
               // Fallback: assume everything after first underscore is email/ID
               sEmail = dId.substring(dId.indexOf('_') + 1).toLowerCase();
            }
          }
          
          console.log(`[DEBUG CHAT] ID: ${dId} | Extracted Email: ${sEmail} | Profile Name in Doc: ${data.studentName}`);
          
          // 2. ROBUST IDENTITY LOOKUP: Try multiple variations in the cache
          const lookup = (email: string) => {
            if (!email) return null;
            const norm = email.toLowerCase().trim();
            return studentProfiles[norm] || 
                   studentProfiles[norm.replace(/\./g, '_')] || 
                   studentProfiles[norm.replace(/_/g, '.')];
          };

          const spr = lookup(sEmail) || lookup(data.studentEmail) || lookup(dId);
          
          // 3. RESOLVE NAME & AVATAR: Prioritize profile data over placeholders
          const resolvedName = (spr?.name && spr.name !== 'Student') ? spr.name : (data.studentName || data.name || "Student");
          const resolvedAvatar = spr?.avatar || spr?.profileImage || data.studentAvatar || data.avatar || '';

          return {
            id: d.id,
            studentEmail: sEmail,
            name: resolvedName,
            avatar: resolvedAvatar,
            initials: (resolvedName && resolvedName !== 'Student' && !resolvedName.includes('@') ? resolvedName : 'ST').substring(0, 2).toUpperCase(),
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
      const allNotifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      // Filter based on Tutor Preferences
      const prefs = profile.notificationPreferences || { reminders: true, messages: true, updates: true };
      const filtered = allNotifs.filter(n => {
        if (n.type === 'booking') return prefs.reminders !== false;
        if (n.type === 'message') return prefs.messages !== false;
        // Map other types (reviews, platform etc) to updates
        return prefs.updates !== false;
      });

      filtered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotifications(filtered);
    });

    // 4. Sync Notes
    const notesQuery = query(collection(db, 'notes'), where('tutorId', '==', profile.id));
    const unsubNotes = onSnapshot(notesQuery, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotes(list);
    }, (err) => console.error("Notes Sync Error:", err));

  // 5. System Profile Guard Notification
  useEffect(() => {
    if (!profile?.id) return;
    
    const isIncomplete = !profile.upiId || !Array.isArray(profile.subjects) || profile.subjects.length === 0;
    
    if (isIncomplete) {
      // Check if we already have a setup notification to avoid duplication
      const hasSetupNotif = notifications.some(n => n.id === 'system-setup-warning');
      
      if (!hasSetupNotif) {
        const setupNotif: TutorNotification = {
          id: 'system-setup-warning',
          type: 'booking', // Using booking icon as placeholder
          title: 'PROFILE HIDDEN: SETUP REQUIRED',
          description: 'Students cannot see or book you until you update your Subjects and UPI ID in Profile section.',
          time: 'Now',
          read: false
        };
        setNotifications(prev => [setupNotif, ...prev]);
      }
    }
  }, [profile, notifications.length]);

  return () => {
    unsubBookings();
    unsubChats();
    unsubNotifs();
    unsubNotes();
  };
}, [profile?.id, studentProfiles]);

  // Fetch student profiles for all relevant emails
  useEffect(() => {
    const emailsToFetch = Array.from(new Set([
      ...bookings.map(b => b.studentEmail),
      ...contacts.map(c => c.studentEmail)
    ])).map(e => (e || '').toLowerCase().trim()).filter((e): e is string => !!e && e.includes('@') && !studentProfiles[e]);

    if (emailsToFetch.length === 0) return;

    emailsToFetch.forEach(async (email) => {
      try {
        // More robust search: try underscore and dot variations for mixed legacy/unified IDs
        const variations = [email, email.replace(/\./g, '_'), email.replace(/_/g, '.')];
        const q = query(collection(db, 'students'), where('email', 'in', Array.from(new Set(variations))));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setStudentProfiles(prev => {
            const next = { ...prev };
            // Cache by all variations to avoid redundant fetches
            variations.forEach(v => { next[v.toLowerCase()] = data; });
            return next;
          });
        }
      } catch (err) {
        console.error("Error fetching student profile for", email, err);
      }
    });
  }, [bookings, contacts]);

  // --- Student Name Healing Engine ---
  // Automatically fetches and syncs student profile names for chats with generic placeholders
  useEffect(() => {
    if (!profile?.id || contacts.length === 0) return;

    const listToFix = contacts.filter(c => 
      !c.name || 
      c.name === 'Student' || 
      c.name === 'Unknown' || 
      c.name.includes('@')
    );

    if (listToFix.length === 0) return;

    const healNames = async () => {
      for (const contact of listToFix) {
        const dId = contact.id;
        let email = (contact.studentEmail || '').toLowerCase().trim();
        if (!email && dId.includes('_')) {
          email = dId.substring(dId.indexOf('_') + 1).toLowerCase().trim();
        }
        if (!email || !email.includes('@')) continue;

        try {
          // Robust multi-variation search
          const variations = Array.from(new Set([email, email.replace(/\./g, '_'), email.replace(/_/g, '.')]));
          const q = query(collection(db, 'students'), where('email', 'in', variations));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const profileData = snap.docs[0].data();
            const profileName = profileData.name;
            const profileAvatar = profileData.avatar || profileData.profileImage || '';
            
            if (profileName && (profileName !== contact.name || profileAvatar !== contact.avatar)) {
              console.log(`ðŸ› ï¸ Healing student identity for ${email} from profile: ${profileName}`);
              const chatRef = doc(db, 'whatsapp', contact.id);
              await updateDoc(chatRef, { 
                studentName: profileName,
                studentAvatar: profileAvatar
              });
              continue; // Successfully healed
            }
          }
          
          // --- NEW: SECONDARY HEALING FROM BOOKINGS ---
          // If no student profile was found (e.g., they booked but didn't complete full registration)
          // We will forcefully heal their name using their most recent booking record.
          const bQuery = query(collection(db, 'bookings'), where('studentEmail', 'in', variations));
          const bSnap = await getDocs(bQuery);
          if (!bSnap.empty) {
            // Find the most robust booking name
            let bestName = 'Student';
            for (const bDoc of bSnap.docs) {
               const bData = bDoc.data();
               const nameToTest = bData.studentName || bData.name;
               if (nameToTest && nameToTest !== 'Student') {
                 bestName = nameToTest;
                 break;
               }
            }
            if (bestName !== 'Student' && bestName !== contact.name) {
              console.log(`ðŸ› ï¸ Healing student identity for ${email} from booking: ${bestName}`);
              const chatRef = doc(db, 'whatsapp', contact.id);
              await updateDoc(chatRef, { studentName: bestName });
            }
          }
        } catch (err) {
          console.error("Error healing student name for", email, err);
        }
      }
    };

    healNames();
  }, [contacts, profile?.id]);

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
        } as unknown as Message;
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

    if (payload.messageId) {
      // Logic for editing existing message
      const msgRef = doc(db, `whatsapp/${chatId}/messages`, payload.messageId);
      await updateDoc(msgRef, { text: payload.text, edited: true });
    } else {
      await addDoc(msgCol, msg);
    }

    // Get student email correctly for notification status update
    const currentContact = contacts.find(c => c.id === contactId);
    let studentEmail = (currentContact?.studentEmail || '').toLowerCase().trim();
    if (!studentEmail && contactId.includes('_')) {
      const parts = contactId.split('_');
      // If student hub format: emailPart_tutorId
      if (contactId.includes('_at_')) {
        const local = parts[0];
        const rest = parts[1].split('_')[0];
        studentEmail = `${local}@${rest.replace(/_dot_/g, '.')}`.toLowerCase();
      } else {
        studentEmail = contactId.substring(contactId.indexOf('_') + 1).toLowerCase();
      }
    }
      // Heuristic restoration
      if (studentEmail.includes('@') && !studentProfiles[studentEmail]) {
        const p = studentEmail.split('@');
        studentEmail = `${p[0]}@${p[1].replace(/_/g, '.')}`;
      }
    
    // Determine the best name (Profile name > Existing name > Booking name > Fallback)
    let studentName = 'Student';
    // Check local student profiles cache first (populated via background effect)
    const profileFromMap = studentProfiles[studentEmail];
    
    if (profileFromMap?.name && profileFromMap.name !== 'Student') {
      studentName = profileFromMap.name;
    } else {
      // Fallback to existing contact state
      const existingContact = contacts.find(c => c.id === chatId || c.id === contactId);
      if (existingContact?.name && existingContact.name !== 'Student' && !existingContact.name.includes('@')) {
        studentName = existingContact.name;
      } else {
        // Fallback to bookings
        const b = bookings.find(b => b.studentEmail === studentEmail);
        if (b?.name && b.name !== 'Student') {
          studentName = b.name;
        }
        
        // Try fetching directly as a last resort
        try {
          const studentQuery = query(collection(db, 'students'), where('email', '==', studentEmail));
          const studentSnap = await getDocs(studentQuery);
          if (!studentSnap.empty) {
            studentName = studentSnap.docs[0].data().name || studentName;
          }
        } catch (err) {
          console.error("Critical error fetching student profile name:", err);
        }
      }
    }

    // Always keep chat document metadata in sync
    await setDoc(chatRef, {
      lastMessage: payload.text || (payload.type === 'poll' ? 'ðŸ“Š Poll' : 'ðŸ“Ž Attachment'),
      lastMessageTime: now.toISOString(),
      timestamp: serverTimestamp(),
      studentUnreadCount: payload.messageId ? increment(0) : increment(1),
      tutorId: profile.id,
      tutorName: profile.name,
      tutorAvatar: profile.avatar || '',
      studentEmail: studentEmail,
      studentName: studentName
    }, { merge: true });

    // 4. Notify Student of new message
    if (studentEmail && !payload.messageId) {
      await addDoc(collection(db, 'notifications'), {
        studentEmail: studentEmail,
        type: 'message',
        title: `New Message from ${profile.name}`,
        message: payload.text || 'Sent an attachment',
        time: now.toISOString(),
        read: false,
        link: 'chat'
      });
    }
  };

  const handleSendMessage = async (contactId: string, text: string, messageId?: any) => {
    if (!text.trim() || !contactId) return;
    if (messageId) {
      await baseSendMessage(contactId, { text: text.trim(), messageId });
    } else {
      await baseSendMessage(contactId, { text: text.trim() });
    }
  };

  const handleDeleteMessage = async (msgId: string, everyone: boolean) => {
    if (!activeChatId || !profile?.id) return;
    const msgRef = doc(db, `whatsapp/${activeChatId}/messages`, msgId);

    if (everyone) {
      await updateDoc(msgRef, {
        text: 'ðŸš« This message was deleted',
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
    
    // Ensure we have the latest student name from profile if possible
    let studentName = booking.name || (booking as any).studentName || 'Student';
    try {
      const q = query(collection(db, 'students'), where('email', '==', booking.studentEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        studentName = snap.docs[0].data().name || studentName;
      }
    } catch (e) {
      console.error("Error fetching student profile during chat initialization:", e);
    }

    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) {
      const initialMsg = 'Hello! How can I help you today?';
      await setDoc(chatRef, {
        tutorId: profile.id,
        tutorName: profile.name,
        tutorAvatar: profile.avatar || '',
        studentEmail: booking.studentEmail,
        studentName: studentName,
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
  const [openRescheduleFor, setOpenRescheduleFor] = useState<string | number | null>(null);

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


  const socketRef = useRef<any>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // --- Push Notification Registration ---
  useEffect(() => {
    const setupNotifications = async () => {
      if (!messaging || !profile?.id) return;

      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(messaging, { 
            vapidKey: 'BGFS0hv59YGe6BMn5-wcbjlBLu0jw5Gd_zBsVZPPFX-16YOYB92_9qbaIp_SyUE4DeG7HH9-suupaEveV6vIrj4'
          });
          
          if (token) {
            console.log('FCM Token generated for Tutor');
            const tutorRef = doc(db, 'users', profile.id);
            await updateDoc(tutorRef, {
              fcmTokens: arrayUnion(token)
            });
          }
        }
      } catch (error) {
        console.error('Push notification setup failed:', error);
      }
    };

    if (profile && profile.notificationPreferences?.push !== false) {
      setupNotifications();
      const unsubscribe = onMessage(messaging!, (payload) => {
        console.log('Foregound message received:', payload);
      });
      return () => unsubscribe();
    }
  }, [profile]);


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
                  if (data.studentPresent && data.tutorJoined && (data.talkingTime || 0) >= 600 && data.topic) {
                    await updateDoc(bookingRef, { 
                      status: 'completed', 
                      attendance_status: 'attended', 
                      completedAt: serverTimestamp() 
                    });
                  }
              }
            }
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
        if (isCamOn && currentPage === 'live-class' && sessionStatus !== 'disconnected') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: isMicOn });
          streamRef.current = stream;
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
  const [showEndChoiceModal, setShowEndChoiceModal] = useState(false);
  const [pendingEndAction, setPendingEndAction] = useState<'complete' | 'reschedule' | null>(null);

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


    // Socket.IO WebRTC Signaling Setup
    socketRef.current = io('http://localhost:5001');
    socketRef.current.emit('join-room', bookingId);

    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    
    const initPeerConnection = () => {
      const pc = new RTCPeerConnection(configuration);
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('ice-candidate', { candidate: event.candidate, roomId: bookingId });
        }
      };

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current!));
      }

      peerConnectionRef.current = pc;
      return pc;
    };

    socketRef.current.on('user-connected', async () => {
      const pc = initPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit('offer', { offer, roomId: bookingId });
    });

    socketRef.current.on('offer', async (offer: any) => {
      const pc = initPeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('answer', { answer, roomId: bookingId });
    });

    socketRef.current.on('answer', async (answer: any) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socketRef.current.on('ice-candidate', async (candidate: any) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) { console.error("Error adding ice candidate", e); }
      }
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
      // We join the room, but we don't set 'live' status yet if it's the first time
      const bSnap = await getDoc(bookingRef);
      if (bSnap.exists()) {
        const bData = bSnap.data();
        if (bData.startedAt) {
          setSessionStartTime(bData.startedAt.toDate());
          setSessionStatus('live');
        } else {
          setSessionStatus('waiting'); // Wait for tutor to click "Start"
        }
      }
      
      // Start voice detection (always on when in room)
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
    
    // Instead of ending immediately, show the choice modal
    setShowEndChoiceModal(true);
  };

  const finalizeSession = async (action: 'complete' | 'reschedule') => {
    const bookingId = activeMeetingId;
    if (!bookingId) return;

    try {
      const bookingDoc = doc(db, 'bookings', bookingId);
      const snap = await getDoc(bookingDoc);
      if (!snap.exists()) return;
      const bookingData = snap.data() as any;

      const isVoiceSuccess = talkingTimeRef.current >= 600; // 10 mins
      let durationMins = 0;
      if (sessionStartTime) {
        durationMins = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 60000);
      }

      // Check if student was present and stayed for at least 12 mins
      let studentValid = false;
      if (bookingData.isGroup && bookingData.participantData) {
        studentValid = Object.values(bookingData.participantData).some((p: any) => {
          if (!p.joinTime) return false;
          const stay = Math.floor((new Date().getTime() - p.joinTime.toDate().getTime()) / 60000);
          return stay >= 10;
        });
      } else {
        const sJoin = bookingData.studentJoinTime?.toDate();
        const sStay = sJoin ? Math.floor((new Date().getTime() - sJoin.getTime()) / 60000) : 0;
        studentValid = bookingData.studentPresent && sStay >= 10;
      }

      // Validity Criteria: 10+ mins total, 10+ mins talking, student present 10+ mins
      const isValidClass = durationMins >= 10 && isVoiceSuccess && studentValid;

      // Only ask for topic if the class was valid
      if (isValidClass && !showTopicModal && !sessionTopic) {
        setShowTopicModal(true);
        return;
      }

      const finalTopic = sessionTopic.trim() || bookingData.subject || 'Class Session';

      const sessionRef = doc(db, 'live_sessions', bookingId);
      await updateDoc(sessionRef, {
        tutorJoined: false,
        status: 'completed',
        endTime: serverTimestamp()
      });

      const updates: any = { 
        status: 'completed',
        topic: isValidClass ? finalTopic : (bookingData.topic || ''), // Don't overwrite if invalid
        durationConducted: durationMins,
        talkingTime: talkingTimeRef.current,
        completedAt: serverTimestamp(),
        attendance_status: isValidClass ? 'attended' : 'not_attended'
      };

      if (bookingData.isGroup && bookingData.participantData) {
        const updatedParticipantData = { ...bookingData.participantData };
        Object.keys(updatedParticipantData).forEach(emailKey => {
          const p = updatedParticipantData[emailKey];
          if (p.joinTime) {
            const stay = Math.floor((new Date().getTime() - p.joinTime.toDate().getTime()) / 60000);
            updatedParticipantData[emailKey].status = (stay >= 12 && isVoiceSuccess && durationMins >= 14) ? 'attended' : 'not_attended';
          }
        });
        updates.participantData = updatedParticipantData;
      }

      await updateDoc(bookingDoc, updates);
      
      if (action === 'reschedule') {
        // If rescheduling, we don't mark as completed, but prepare for reschedule
        await updateDoc(bookingDoc, { status: 'confirmed' }); // Keep it confirmed for reschedule
        setOpenRescheduleFor(bookingId);
      }
    } catch (e) {
      console.error("Error finalizing class:", e);
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setShowTopicModal(false);
    setShowEndChoiceModal(false);
    setPendingEndAction(null);

    setSessionTopic('');
    setSessionStatus('disconnected');
    setSessionStartTime(null);
    setSessionTimer("00:00:00");
    
    setTimeout(() => {
      setActiveMeetingId(null);
      if (action === 'reschedule') {
        setCurrentPage('bookings'); // Go to bookings to see the reschedule modal
      } else {
        setCurrentPage('dashboard');
      }
    }, 1500);
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

  useEffect(() => {
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
  }, [sessionStatus, sessionStartTime]);


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
      if (profile?.id) {
        // 1. Update Firestore first for persistence
        const bookingRef = doc(db, 'bookings', id.toString());
        await updateDoc(bookingRef, { status });

        // 2. Update local state
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
        
        const booking = bookings.find(b => b.id === id);
        if (booking) {
          if (status === 'confirmed') {
            addNotification({
              type: 'booking',
              title: 'Booking Confirmed',
              description: `${booking.name || 'Student'}'s ${booking.subject || 'Session'} confirmed.`,
            });
          }

          // 3. Notify Student Page
          if (booking.studentEmail) {
            await addDoc(collection(db, 'notifications'), {
              studentEmail: booking.studentEmail,
              type: 'booking',
              title: status === 'confirmed' ? 'Session Confirmed! ✅' : 'Session Cancelled ❌',
              message: status === 'confirmed' 
                ? `${profile?.name || 'Your tutor'} confirmed your ${booking.subject} session for ${booking.date} at ${booking.time}.${booking.amount ? ` (Amount: ₹${booking.amount})` : ''}`
                : `${profile?.name || 'Your tutor'} cancelled your ${booking.subject} session. Contact support for details.`,
              time: new Date().toISOString(),
              read: false,
              link: 'my-bookings'
            });
          }
        }
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      alert("Failed to update status. Please check your connection.");
    }
  };

  const handleAddSlot = (slot: Omit<AvailabilitySlot, 'id'>) => {
    // Extra duplicate check in App.tsx
    const isDuplicate = manualSlots.some(s => 
      s.date === slot.date && s.start === slot.start
    );
    if (isDuplicate) return;

    const newSlot = { ...slot, id: Date.now() + Math.random() };
    const newSlots = [...manualSlots, newSlot];
    setManualSlots(newSlots);
    if (profile?.id) {
      updateDoc(doc(db, 'users', profile.id), { availability: newSlots });
    }
  };

  const handleBatchAddSlots = (slotsToApply: Omit<AvailabilitySlot, 'id'>[]) => {
    const slotsWithIds = slotsToApply.map((s, i) => ({ ...s, id: Date.now() + i + Math.random() }));
    const newSlots = [...manualSlots, ...slotsWithIds];
    setManualSlots(newSlots);
    if (profile?.id) {
      updateDoc(doc(db, 'users', profile.id), { availability: newSlots });
    }
  };

  const handleClearSlots = () => {
    setManualSlots([]);
    if (profile?.id) {
      updateDoc(doc(db, 'users', profile.id), { availability: [] });
    }
  };

  const handleDeleteSlot = (id: number) => {
    const newSlots = manualSlots.filter(s => String(s.id) !== String(id));
    setManualSlots(newSlots);
    if (profile?.id) {
      updateDoc(doc(db, 'users', profile.id), { availability: newSlots });
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

      const booking = bookings.find(b => b.id === id);

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

      // Notify Student of Reschedule
      if (booking && booking.studentEmail) {
        await addDoc(collection(db, 'notifications'), {
          studentEmail: booking.studentEmail,
          type: 'booking',
          title: 'Session Rescheduled ðŸ“…',
          message: `Your ${booking.subject} session with ${profile?.name || 'your tutor'} has been moved to ${date} at ${time}.${booking.amount ? ` (Paid: â‚¹${booking.amount})` : ''}`,
          time: new Date().toISOString(),
          read: false,
          link: 'my-bookings'
        });
      }
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
        
        // Map contacts to always show the freshest mapped identity 
        const liveContacts = contacts.map(c => {
           let email = (c.studentEmail || '').toLowerCase().trim();
           if (!email && c.id.includes('_')) {
             email = c.id.substring(c.id.indexOf('_') + 1).toLowerCase();
           }
           const spr = studentProfiles[email] || studentProfiles[email.replace(/\./g, '_')] || studentProfiles[email.replace(/_/g, '.')];
           
           let bestName = (spr?.name && spr.name !== 'Student') ? spr.name : c.name;
           // Fallback to bookings again just in case during render
           if (bestName === 'Student' || bestName === 'Unknown') {
             const b = bookings.find(bk => (bk.studentEmail || '').toLowerCase().trim() === email);
             if (b && b.name !== 'Student') bestName = b.name;
           }

           return {
             ...c,
             name: bestName,
             avatar: spr?.avatar || spr?.profileImage || c.avatar || '',
             initials: (bestName && bestName !== 'Student' && !bestName.includes('@') ? bestName : 'ST').substring(0, 2).toUpperCase()
           };
        });

        const fullContactList = [
          ...liveContacts,
          ...bookedStudents
            .filter(email => {
              // Only include students who have an ACTIVE (pending/confirmed) booking
              const hasActiveBooking = bookings.some(b => 
                (b.studentEmail || '').toLowerCase().trim() === email && 
                (b.status === 'pending' || b.status === 'confirmed')
              );
              const hasExistingChat = liveContacts.some(c => c.id.includes(email?.replace(/\./g, '_') || ''));
              return hasActiveBooking && !hasExistingChat;
            })
            .map(email => {
              const b = bookings.find(b => b.studentEmail === email);
              const spr = studentProfiles[email];
              return {
                id: `${profile.id}_${email?.replace(/\./g, '_')}`,
                name: spr?.name || b?.studentName || b?.name || 'Student',
                avatar: spr?.avatar || spr?.profileImage || '',
                studentEmail: email,
                initials: (spr?.name || b?.studentName || b?.name || 'ST').substring(0, 2).toUpperCase(),
                online: false,
                unread: 0,
                lastMessage: 'ðŸ‘‹ Start a conversation...',
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
            onBatchAddSlots={handleBatchAddSlots}
            onClearSlots={handleClearSlots}
          />
        );
      case 'pricing':
        return <Pricing experience={experience} tutorId={profile?.id} targetClasses={profile?.targetClasses} />;
      case 'notes':
        return <Notes notes={notes} tutorId={profile?.id} tutorName={profile?.name} />;
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
        const combinedReviews = realReviews.map(r => ({ ...r, name: r.studentName, text: r.comment }));
        return <Reviews reviews={combinedReviews} profile={profile} />;
      case 'kyc':
        return <KYC />;
      case 'settings':
        return <Settings />;
      case 'profile':
        return <Profile user={{...user, ...profile}} onExperienceChange={(val: string) => setExperience(val === 'Fresher' ? 0 : parseInt(val) || 5)} />;
      case 'live-class':
        return null; // Handled by fixed overlay
      default:
        const totalSlotsCount = manualSlots.length;
        // Basic deduction for booked ones
        const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');
        const bookedCount = activeBookings.length; 
        const displaySlots = manualSlots.map(s => ({ ...s, booked: activeBookings.some(b => b.time === s.start && b.date === s.date) }));
        
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

    // 0. ACCOUNT BLOCK CHECK (System Level Enforcement)
    if (profile?.status === 'blocked') {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl text-center border border-slate-100"
          >
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} className="text-rose-500" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-tight mb-4">Account Suspended</h2>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">
              Your tutor account has been suspended by the Eduqra administration. Access to the dashboard is currently restricted.
            </p>
            <div className="space-y-4">
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tutor ID</p>
                 <p className="text-xs font-bold text-slate-600 font-mono">{profile.id}</p>
               </div>
               <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 italic">
                 <p className="text-sm font-bold text-rose-600">
                   "We're sorry, but you are currently unable to access this site."
                 </p>
               </div>
               <button 
                onClick={handleLogout}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl"
              >
                <LogOut size={16} /> Sign Out & Support
              </button>
            </div>
          </motion.div>
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
            Thank you for registering! Our Super Admin team will verify your details and credentials. 
            <span className="block mt-2 text-primary font-black uppercase text-[11px] tracking-widest">You will get a response regarding your approval within 24 hours.</span>
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
          <h2 className="text-4xl font-black mb-4 tracking-tight text-on-surface">Application Status</h2>
          <p className="text-rose-600 font-black uppercase text-[10px] mb-8 bg-rose-50 px-4 py-2 rounded-full border border-rose-100">Verification Update</p>
          
          <div className="max-w-md w-full bg-slate-50 border-l-4 border-rose-500 p-8 rounded-4xl mb-10 text-left">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Feedback from Administration:</p>
            <p className="text-slate-700 font-bold italic text-base leading-relaxed mb-6">"{profile.rejectionReason || 'Please review your uploaded documents and ensure they are clearly legible.'}"</p>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Every expert was once a beginner. We believe in your potential! Please address the feedback above and re-apply to join our global network of educators.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
            <button onClick={handleReapply} className="w-full bg-primary text-white font-black px-8 py-5 rounded-2xl shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center justify-center gap-3">
              <ShieldCheck size={18} /> Update Details & Re-apply
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
                    {sessionStatus === 'waiting' && (
                      <button 
                        onClick={async () => {
                          const now = new Date();
                          setSessionStartTime(now);
                          setSessionStatus('live');
                          if (activeMeetingId) {
                            await updateDoc(doc(db, 'bookings', activeMeetingId), {
                              startedAt: serverTimestamp(),
                              status: 'live'
                            });
                          }
                        }}
                        className="bg-emerald-500 text-white font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <Play size={14} fill="currentColor" /> Start Class
                      </button>
                    )}
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
                                <div className="w-full h-full relative">
                                  <video 
                                    ref={remoteVideoRef} 
                                    autoPlay 
                                    playsInline 
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                    <p className="text-sm font-bold text-white/90">Student</p>
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
                             {['ðŸ‘', 'â¤ï¸', 'ðŸ‘', 'ðŸ’¡', 'ðŸ”¥', 'ðŸŽ‰'].map(emoji => (
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
                      <span className="text-primary text-2xl font-bold">ðŸ“–</span>
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
                    
                    {/* End Class Choice Modal */}
                    <AnimatePresence>
                      {showEndChoiceModal && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            onClick={() => setShowEndChoiceModal(false)}
                          />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 text-center"
                          >
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                              <LogOut size={32} className="text-primary" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Finish Session?</h2>
                            <p className="text-slate-500 font-medium mb-8 text-sm">How would you like to handle this class?</p>
                            
                            <div className="space-y-4">
                              <button 
                                onClick={() => finalizeSession('complete')}
                                className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20"
                              >
                                <Check size={18} /> Class Conducted (Continue)
                              </button>
                              <button 
                                onClick={() => finalizeSession('reschedule')}
                                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl"
                              >
                                <Clock size={18} /> Need to Reschedule
                              </button>
                              <button 
                                onClick={() => setShowEndChoiceModal(false)}
                                className="w-full text-slate-400 font-bold text-xs uppercase tracking-widest py-2 hover:text-slate-600 transition-colors"
                              >
                                Go Back
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>

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
