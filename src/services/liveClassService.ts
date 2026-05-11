import { db } from '../firebase';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  addDoc, 
  collection, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';

export const liveClassService = {
  /**
   * Subscribe to live session state
   */
  subscribeToSession(sessionId: string, callback: (data: any) => void) {
    const sessionRef = doc(db, 'live_sessions', sessionId);
    return onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() });
      } else {
        callback(null);
      }
    });
  },

  /**
   * Update live session metadata (joined status, signals, etc.)
   */
  async updateSession(sessionId: string, updates: any) {
    const sessionRef = doc(db, 'live_sessions', sessionId);
    return updateDoc(sessionRef, {
      ...updates,
      lastUpdate: serverTimestamp()
    });
  },

  /**
   * Send a message in the live class chat
   */
  async sendLiveMessage(sessionId: string, senderId: string, senderName: string, text: string) {
    if (!text.trim() || !sessionId) return;
    
    return addDoc(collection(db, `live_sessions/${sessionId}/messages`), {
      sender: senderName,
      senderId: senderId,
      text: text.trim(),
      timestamp: serverTimestamp()
    });
  },

  /**
   * Subscribe to live class chat messages
   */
  subscribeToLiveMessages(sessionId: string, callback: (messages: any[]) => void) {
    const mQuery = query(
      collection(db, `live_sessions/${sessionId}/messages`), 
      orderBy('timestamp', 'asc')
    );
    
    return onSnapshot(mQuery, (snap) => {
      const msgs = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        time: (d.data().timestamp?.toDate ? d.data().timestamp.toDate() : new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      callback(msgs);
    });
  },

  /**
   * Signal all participants to mute (Tutor utility)
   */
  async muteAll(sessionId: string) {
    const sessionRef = doc(db, 'live_sessions', sessionId);
    return updateDoc(sessionRef, {
      muteAllSignal: Date.now()
    });
  },

  /**
   * Send a reaction in the live class
   */
  async sendReaction(sessionId: string, senderName: string, emoji: string) {
    if (!sessionId) return;
    return addDoc(collection(db, `live_sessions/${sessionId}/reactions`), {
      emoji,
      sender: senderName,
      timestamp: serverTimestamp()
    });
  },

  /**
   * Subscribe to live class reactions
   */
  subscribeToReactions(sessionId: string, callback: (reactions: any[]) => void) {
    const q = query(
      collection(db, `live_sessions/${sessionId}/reactions`), 
      orderBy('timestamp', 'desc')
    );
    
    return onSnapshot(q, (snap) => {
      const reactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(reactions);
    });
  },

  /**
   * Mark a booking as 'live' and set start time
   */
  async startLiveClass(bookingId: string) {
    const bookingRef = doc(db, 'bookings', bookingId);
    return updateDoc(bookingRef, {
      startedAt: serverTimestamp(),
      status: 'live'
    });
  },

  /**
   * Update talking time for a booking
   */
  async updateTalkingTime(bookingId: string, seconds: number) {
    const bookingRef = doc(db, 'bookings', bookingId);
    return updateDoc(bookingRef, { talkingTime: seconds });
  }
};
