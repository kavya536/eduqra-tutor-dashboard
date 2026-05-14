import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useBookingStore } from '../store/useBookingStore';
import { useChatStore } from '../store/useChatStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { authService } from '../services/authService';
import { tutorService } from '../services/tutorService';
import { chatService } from '../services/chatService';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { AvailabilitySlot, TutorNotification } from '../types';

export function useAppInitialization() {
  const { 
    user, profile, setUser, setProfile, setLoading, setProfileLoading, setIsReapplying, setPrefilledEmail 
  } = useAuthStore();

  const { 
    view, setView, currentPage, showToast 
  } = useUIStore();

  const { 
    bookings, manualSlots, setManualSlots 
  } = useBookingStore();

  const { 
    contacts, studentProfiles, setContacts, setStudentProfiles 
  } = useChatStore();

  const { notifications, setNotifications } = useNotificationStore();

  useEffect(() => {
    // 1. Handle query parameters for re-application flow
    const urlParams = new URLSearchParams(window.location.search);
    const reapplyFlag = urlParams.get('reapply');
    if (reapplyFlag === 'true') {
      setIsReapplying(true);
      setPrefilledEmail('');
      setView('register');
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (urlParams.get('view') === 'login') {
      auth.signOut().then(() => {
        window.history.replaceState({}, '', window.location.pathname);
        setView('login');
      });
    }

    let unsubProfile: (() => void) | null = null;

    // 2. Auth & Profile Subscription
    const unsubscribe = authService.subscribeToAuth(async (firebaseUser) => {
      // Cleanup previous profile listener if it exists
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setLoading(true);
      
      if (firebaseUser) {
        setUser(firebaseUser);
        setProfileLoading(true);
        
        unsubProfile = authService.subscribeToProfile(firebaseUser.uid, async (data) => {
          if (data) {
            // Enforcement: If account is blocked, immediately redirect to login logic
            if (data.status === 'blocked') {
              setProfile(data);
              setView('login'); 
              setProfileLoading(false);
              setLoading(false);
              return;
            }

            setProfile(data);

            // Sync First Login State
            if (data.email_verified && data.first_login_completed === false && data.status === 'approved') {
              authService.markFirstLoginCompleted(firebaseUser.uid);
            }

            setView('app');
            setProfileLoading(false);
            setLoading(false);
          } else {
            // Legacy Migration Bridge (with safety timeout)
            try {
              console.log("🔍 Profile missing in 'users', checking legacy collections...");
              const migrationPromise = authService.migrateLegacyUser(firebaseUser);
              const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Migration Timeout")), 5000));
              
              const migratedData = await Promise.race([migrationPromise, timeoutPromise]) as any;
              
              if (migratedData) {
                setProfile(migratedData);
                setView('app');
              } else {
                setProfile(null);
                // If no profile found at all, they need to register
                if (view !== 'register' && view !== 'app' && view !== 'login') setView('register');
              }
            } catch (err) {
              console.error("Linker check failed or timed out:", err);
            } finally {
              setProfileLoading(false);
              setLoading(false);
            }
          }
        });
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
        setProfileLoading(false);
        setView('login');
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // 3. Availability Normalization
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
      .filter((slot: AvailabilitySlot | null): slot is AvailabilitySlot => !!slot && !!slot.day && !!slot.start && !!slot.end);

    const isSame = JSON.stringify(normalizedSlots.map(s => ({...s, id: null}))) === 
                   JSON.stringify(manualSlots.map(s => ({...s, id: null})));
    
    if (!isSame || manualSlots.length === 0) {
      setManualSlots(normalizedSlots);
    }
  }, [profile?.availability]);

  // 4. Real-time Notification Sync
  useEffect(() => {
    if (!profile?.id) return;
    const unsubNotifs = tutorService.subscribeToTutorNotifications(profile.id, profile.notificationPreferences || {}, (filtered) => {
      setNotifications(filtered);
    });
    return () => unsubNotifs();
  }, [profile?.id]);

  // 5. System Profile Guard Notification
  useEffect(() => {
    if (!profile?.id) return;
    const isIncomplete = !profile.upiId || !Array.isArray(profile.subjects) || profile.subjects.length === 0;
    if (isIncomplete) {
      const hasSetupNotif = notifications.some(n => n.id === 'system-setup-warning');
      if (!hasSetupNotif) {
        const setupNotif: TutorNotification = {
          id: 'system-setup-warning',
          type: 'booking',
          title: 'PROFILE HIDDEN: SETUP REQUIRED',
          description: 'Students cannot see or book you until you update your Subjects and UPI ID in Profile section.',
          time: 'Now',
          read: false
        };
        setNotifications(prev => {
          // Check again inside setter to prevent race condition duplicates
          if (prev.some(n => n.id === 'system-setup-warning')) return prev;
          return [setupNotif, ...prev];
        });
      }
    }
  }, [profile?.id, notifications.length]);

  // 6. Identity Cache & Healing
  useEffect(() => {
    const emailsToFetch = Array.from(new Set([
      ...bookings.map(b => b.studentEmail),
      ...contacts.map(c => c.studentEmail)
    ])).map(e => (e || '').toLowerCase().trim()).filter((e): e is string => !!e && e.includes('@') && !studentProfiles[e]);

    if (emailsToFetch.length === 0) return;

    emailsToFetch.forEach(async (email) => {
      try {
        const variations = [email, email.replace(/\./g, '_'), email.replace(/_/g, '.')];
        const q = query(collection(db, 'students'), where('email', 'in', Array.from(new Set(variations))));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setStudentProfiles(prev => {
            const next = { ...prev };
            variations.forEach(v => { next[v.toLowerCase()] = data; });
            return next;
          });
        }
      } catch (err) {
        console.error("Error fetching student profile for", email, err);
      }
    });
  }, [bookings, contacts]);

  useEffect(() => {
    if (!profile?.id || contacts.length === 0) return;
    const listToFix = contacts.filter(c => !c.name || c.name === 'Student' || c.name === 'Unknown' || c.name.includes('@'));
    if (listToFix.length === 0) return;
    const healNames = async () => {
      for (const contact of listToFix) {
        await chatService.healStudentIdentity(contact.id, contact.studentEmail || '');
      }
    };
    healNames();
  }, [contacts, profile?.id]);

  return { 
    user, 
    profile,
    loading: useAuthStore.getState().loading,
    profileLoading: useAuthStore.getState().profileLoading,
    isReapplying: useAuthStore.getState().isReapplying,
    prefilledEmail: useAuthStore.getState().prefilledEmail,
    setIsReapplying,
    setPrefilledEmail
  };
}
