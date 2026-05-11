import { db } from '../firebase';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  addDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot
} from 'firebase/firestore';

export const tutorService = {
  /**
   * Register a new tutor profile in Firestore
   */
  async createProfile(uid: string, data: any) {
    const profileData = {
      uid,
      ...data,
      status: data.status || 'pending',
      role: 'tutor',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    return setDoc(doc(db, 'users', uid), profileData, { merge: true });
  },

  /**
   * Update an existing tutor profile
   */
  async updateProfile(uid: string, data: any) {
    const profileRef = doc(db, 'users', uid);
    return updateDoc(profileRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Send a notification to administrators
   */
  async notifyAdmin(tutorId: string, name: string, email: string) {
    return addDoc(collection(db, 'admin_notifications'), {
      type: 'Registration',
      tutorId,
      title: 'New Tutor Registration',
      message: `${name || email} has registered and is awaiting verification.`,
      time: serverTimestamp(),
      read: false
    });
  },

  /**
   * Submit registration to backend API
   */
  async submitRegistration(formData: FormData) {
    const hostname = window.location.hostname;
    const response = await fetch(`http://${hostname}:5001/api/register-tutor`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Database synchronization failed');
    }
    
    return response.json();
  },

  /**
   * Find profile by email and name (for re-apply flow)
   */
  async findProfileByEmailAndName(email: string, name: string) {
    const q = query(
      collection(db, 'users'), 
      where("email", "==", email.toLowerCase()),
      where("name", "==", name.trim())
    );
    
    const snap = await getDocs(q);
    if (!snap.empty) {
      const doc = snap.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  },

  /**
   * Subscribe to real-time notifications for a tutor
   */
  subscribeToTutorNotifications(tutorId: string, preferences: any, callback: (notifications: any[]) => void) {
    const nQuery = query(collection(db, 'tutor_notifications'), where('tutorId', '==', tutorId));
    
    return onSnapshot(nQuery, (snap) => {
      const allNotifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      const filtered = allNotifs.filter(n => {
        if (n.type === 'booking') return preferences.reminders !== false;
        if (n.type === 'message') return preferences.messages !== false;
        return preferences.updates !== false;
      });

      filtered.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      callback(filtered);
    });
  },

  /**
   * Update tutor availability slots
   */
  async updateAvailability(tutorId: string, slots: any[]) {
    const tutorRef = doc(db, 'users', tutorId);
    return updateDoc(tutorRef, { availability: slots });
  },

  /**
   * Fetch a student profile by email
   */
  async fetchStudentProfile(email: string) {
    const variations = Array.from(new Set([
      email.toLowerCase().trim(), 
      email.replace(/\./g, '_').toLowerCase().trim(), 
      email.replace(/_/g, '.').toLowerCase().trim()
    ]));
    const q = query(collection(db, 'students'), where('email', 'in', variations));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data();
    }
    return null;
  },

  /**
   * Subscribe to real-time reviews for a tutor
   */
  subscribeToReviews(tutorId: string, callback: (reviews: any[]) => void) {
    const rQuery = query(collection(db, 'reviews'), where('tutorId', '==', tutorId));
    
    return onSnapshot(rQuery, (snap) => {
      const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      callback(reviews);
    });
  }
};
