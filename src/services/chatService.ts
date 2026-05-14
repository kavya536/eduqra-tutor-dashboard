import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp, 
  orderBy,
  arrayUnion,
  getDocs,
  getDoc,
  setDoc
} from 'firebase/firestore';

import { ChatContact, Message, StudentProfile } from '../types';

export const chatService = {
  /**
   * Extract student email from chat ID
   */
  extractEmailFromChatId(chatId: string, data?: Partial<ChatContact>) {
    let sEmail = (data?.studentEmail || '').toLowerCase().trim();
    if (!sEmail) {
      if (chatId.includes('_at_')) {
         const parts = chatId.split('_at_');
         const local = parts[0]; 
         const rest = parts[1].split('_').filter(p => p.includes('com') || p.includes('dot'))[0] || parts[1].split('_')[0];
         sEmail = `${local}@${rest.replace(/_dot_/g, '.')}`.toLowerCase();
      } else {
         sEmail = chatId.substring(chatId.indexOf('_') + 1).toLowerCase();
      }
    }
    return sEmail;
  },

  /**
   * Smart date logic for chat previews
   */
  getSmartDate(dateVal: any) {
    if (!dateVal) return 'Now';
    let d: Date;
    if (dateVal.seconds) d = new Date(dateVal.seconds * 1000);
    else d = new Date(dateVal);

    if (isNaN(d.getTime())) return 'Now';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffTime = today.getTime() - msgDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // 1. Today: Show Time
    if (msgDate.getTime() === today.getTime()) {
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    
    // 2. Yesterday: Show 'Yesterday'
    if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
    
    // 3. Within This Week (e.g. Monday to Sunday): Show Day Name
    if (diffDays > 0 && diffDays < 7) {
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return weekdays[d.getDay()];
    }
    
    // 4. Older: Show Full Date & Time (e.g., May 12, 04:03 PM)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  },

  /**
   * Subscribe to chat list
   */
  subscribeToChats(profile: any, studentProfiles: Record<string, StudentProfile>, callback: (chats: ChatContact[]) => void) {
    // Broader query to include legacy chats that might be missing tutorId field
    // We'll filter by tutorId field OR document ID containing the tutorId
    const cQuery = query(collection(db, 'whatsapp'));
    
    return onSnapshot(cQuery, (snap) => {
      const chatList = snap.docs
        .filter(d => {
          const data = d.data();
          const dId = d.id;
          
          // Profile identifiers
          const tId = (profile?.id || '').toLowerCase();
          const tUid = (profile?.uid || '').toLowerCase();
          const tEmail = (profile?.email || '').toLowerCase();
          const tName = (profile?.name || '').toLowerCase();
          
          const tIdNorm = tId.replace(/\./g, '_');
          const tEmailNorm = tEmail.replace(/\./g, '_');

          // Check fields
          const fieldMatch = 
            (data.tutorId && data.tutorId.toLowerCase() === tId) ||
            (data.tutorId && data.tutorId.toLowerCase() === tUid) ||
            (data.tutorEmail && data.tutorEmail.toLowerCase() === tEmail) ||
            (data.tutorName && data.tutorName.toLowerCase() === tName);

          // Check document ID
          const idMatch = 
            dId.toLowerCase().includes(tIdNorm) || 
            dId.toLowerCase().includes(tEmailNorm) ||
            dId.toLowerCase().includes(tId) ||
            dId.toLowerCase().includes(tName.replace(/\s+/g, '_'));

          return fieldMatch || idMatch;
        })
        .map(d => {
        const data = d.data();
        const dId = d.id;
        const sEmail = this.extractEmailFromChatId(dId, data);
        
        const lookup = (email: string) => {
          if (!email) return null;
          const norm = email.toLowerCase().trim();
          return studentProfiles[norm] || 
                 studentProfiles[norm.replace(/\./g, '_')] || 
                 studentProfiles[norm.replace(/_/g, '.')];
        };

        const spr = lookup(sEmail);
        const resolvedName = (spr?.name && spr.name !== 'Student') ? spr.name : (data.studentName || data.name || "Student");
        const resolvedAvatar = spr?.avatar || data.studentAvatar || data.avatar || '';

        return {
          id: d.id,
          studentEmail: sEmail,
          name: resolvedName,
          avatar: resolvedAvatar,
          initials: (resolvedName && resolvedName !== 'Student' && !resolvedName.includes('@') ? resolvedName : 'ST').substring(0, 2).toUpperCase(),
          online: true,
          unread: data.tutorUnreadCount || 0,
          studentUnreadCount: data.studentUnreadCount || 0,
          messages: [],
          timestamp: data.timestamp,
          lastMessage: data.lastMessage || 'No messages yet',
          lastMessageTime: data.lastMessageTime
        } as any;
      });

      chatList.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      callback(chatList);
    });
  },

  /**
   * Subscribe to messages for a specific chat
   */
  subscribeToMessages(chatId: string, tutorId: string, callback: (messages: Message[]) => void) {
    const syncMessages = async () => {
      // Extract studentEmail from chatId
      // chatId is usually tutorId_studentEmailKey OR studentEmailKey_tutorId
      const parts = chatId.split('_');
      let studentEmailKey = '';
      if (parts[0] === tutorId) studentEmailKey = parts.slice(1).join('_');
      else studentEmailKey = parts.slice(0, -1).join('_');

      const id1 = `${tutorId}_${studentEmailKey}`;
      const id2 = `${studentEmailKey}_${tutorId}`;

      // Check which one has messages
      const q1 = query(collection(db, `whatsapp/${id1}/messages`));
      const snap1 = await getDocs(q1);
      
      let foundId = id1;
      if (snap1.empty) {
        const q2 = query(collection(db, `whatsapp/${id2}/messages`));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) foundId = id2;
      }

      // Mark as read
      const chatRef = doc(db, 'whatsapp', chatId);
      updateDoc(chatRef, { tutorUnreadCount: 0 }).catch(() => {});

      // Subscribe to the correct one
      const unsub = onSnapshot(query(collection(db, `whatsapp/${foundId}/messages`)), (snap) => {
        const msgs = snap.docs.map(d => {
          const data = d.data();
          return { 
            id: d.id, 
            ...data,
            sender: data.senderId === tutorId ? 'me' : 'student' 
          } as Message;
        }).sort((a: any, b: any) => {
          const timeA = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || 0;
          const timeB = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || 0;
          return timeA - timeB;
        });
        callback(msgs);
      });

      return unsub;
    };

    let unsubPromise = syncMessages();
    return () => {
      unsubPromise.then(unsub => unsub?.());
    };
  },

  /**
   * Send a message
   */
  async sendMessage(contactId: string, text: string, tutorId: string, tutorName: string, options: { messageId?: any, type?: string, pollData?: any, fileUrl?: any, fileName?: any, fileSize?: any } = {}) {
    // ID Normalization: Ensure we have a valid tutor_email format
    const chatId = contactId.includes('_') ? contactId : `${tutorId}_${contactId.replace(/\./g, '_')}`;
    
    const chatRef = doc(db, 'whatsapp', chatId);
    const msgCol = collection(chatRef, 'messages');
    const now = new Date();

    const msg = {
      senderId: tutorId,
      text: text,
      timestamp: serverTimestamp(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: now.toDateString(),
      type: options.type || 'text',
      pollData: options.pollData || null,
      fileUrl: options.fileUrl || null,
      fileName: options.fileName || null,
      fileSize: options.fileSize || null,
      deletedBy: []
    };

    if (options.messageId) {
      const msgRef = doc(db, `whatsapp/${chatId}/messages`, options.messageId.toString());
      await updateDoc(msgRef, { text: text, edited: true });
    } else {
      await addDoc(msgCol, msg);
    }

    return setDoc(chatRef, {
      lastMessage: text || (options.type === 'poll' ? '📊 Poll' : '📎 Attachment'),
      lastMessageTime: now.toISOString(),
      timestamp: serverTimestamp(),
      studentUnreadCount: options.messageId ? 0 : 1, 
      tutorId: tutorId,
      tutorName: tutorName
    }, { merge: true });
  },

  /**
   * Delete a message (WhatsApp style)
   */
  async deleteMessage(chatId: string, messageId: string | number, everyone: boolean) {
    const msgRef = doc(db, `whatsapp/${chatId}/messages`, messageId.toString());
    if (everyone) {
      const deletedLabel = '🚫 This message was deleted';
      await updateDoc(msgRef, { 
        text: deletedLabel, 
        type: 'deleted', 
        deletedForEveryone: true 
      });
      // Sync parent preview and timestamp
      return updateDoc(doc(db, 'whatsapp', chatId), {
        lastMessage: deletedLabel,
        timestamp: serverTimestamp()
      });
    } else {
      return updateDoc(msgRef, { 
        deletedBy: arrayUnion('tutor') 
      });
    }
  },

  /**
   * Vote on a poll within a chat
   */
  async voteOnChatPoll(chatId: string, messageId: string | number, votes: Record<string, number[]>) {
    const msgRef = doc(db, `whatsapp/${chatId}/messages`, messageId.toString());
    return updateDoc(msgRef, { 'pollData.votes': votes });
  },

  /**
   * Heal student identity in chat
   */
  async healStudentIdentity(chatId: string, email: string) {
    const variations = Array.from(new Set([email, email.replace(/\./g, '_'), email.replace(/_/g, '.')]));
    const q = query(collection(db, 'students'), where('email', 'in', variations));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const profileData = snap.docs[0].data();
      const profileName = profileData.name;
      const profileAvatar = profileData.avatar || profileData.profileImage || '';
      
      if (profileName) {
        const chatRef = doc(db, 'whatsapp', chatId);
        await updateDoc(chatRef, { 
          studentName: profileName,
          studentAvatar: profileAvatar
        });
        return true;
      }
    }
    return false;
  },

  /**
   * Initialize a new chat thread if it doesn't exist
   */
  async initializeChat(chatId: string, tutorId: string, tutorName: string, tutorAvatar: string, studentEmail: string, fallbackName: string) {
    const chatRef = doc(db, 'whatsapp', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (chatSnap.exists()) return;

    // Try to get actual student name from their profile
    let studentName = fallbackName;
    try {
      const q = query(collection(db, 'students'), where('email', '==', studentEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        studentName = snap.docs[0].data().name || studentName;
      }
    } catch (e) {
      console.error("Profile lookup error during chat init:", e);
    }

    await setDoc(chatRef, {
      tutorId,
      tutorName,
      tutorAvatar,
      studentEmail,
      studentName,
      lastMessage: 'Chat initialized',
      lastMessageTime: new Date().toISOString(),
      timestamp: serverTimestamp(),
      tutorUnreadCount: 0,
      studentUnreadCount: 0
    });

    return;
  }
};
