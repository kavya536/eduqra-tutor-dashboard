import { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

import { AppRoutes } from './routes/AppRoutes';
import { StatusGate } from './components/StatusGate';
import { Registration } from './components/Registration';
import { Login } from './components/Login';
import { Booking, BookingStatus, ChatContact, AvailabilitySlot, Review, PageId, TutorNotification, Message } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { GraduationCap, LogOut, X, User, Camera, Mic, MicOff, XCircle, Send, MessageSquare, Smile, Clock, Monitor, ShieldCheck, AlertCircle, Check, Play, CheckCircle } from 'lucide-react';
import { authService } from './services/authService';
import { bookingService } from './services/bookingService';
import { notificationService } from './services/notificationService';
import { chatService } from './services/chatService';
import { tutorService } from './services/tutorService';
import { liveClassService } from './services/liveClassService';
import { notesService } from './services/notesService';
import { pollService } from './services/pollService';
import { useAuthStore } from './store/useAuthStore';
import { useUIStore } from './store/useUIStore';
import { useBookingStore } from './store/useBookingStore';
import { useChatStore } from './store/useChatStore';
import { useNotificationStore } from './store/useNotificationStore';
import { useLiveClassStore } from './store/useLiveClassStore';
import { useNotesStore } from './store/useNotesStore';
import { usePollStore } from './store/usePollStore';
import { useReviewStore } from './store/useReviewStore';
import { useAppInitialization } from './hooks/useAppInitialization';

import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp, 
  addDoc, 
  setDoc, 
  orderBy, 
  increment, 
  arrayUnion 
} from 'firebase/firestore';
import { auth, db, messaging } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';

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

  // 1. Initialize App (Auth, Profile, Global Listeners)
  const { 
    user, profile, loading, profileLoading, isReapplying, prefilledEmail,
    setIsReapplying, setPrefilledEmail 
  } = useAppInitialization();

  const handleReapply = async () => {
    if (!user) return;
    setIsReapplying(true);
    setView('register');
    console.log("🔄 Redirecting rejected tutor to registration for correction.");
  };

  const { 
    view, setView, currentPage, setCurrentPage, isSidebarOpen, setIsSidebarOpen, 
    toast, showToast, showLogoutConfirm, setShowLogoutConfirm,
    searchTerm, setSearchTerm
  } = useUIStore();

  const {
    sessionStartTime, setSessionStartTime,
    sessionTimer, setSessionTimer,
    isMicOn, setIsMicOn,
    isCamOn, setIsCamOn,
    isLiveChatOpen, setIsLiveChatOpen,
    sessionStatus, setSessionStatus,
    liveMessages, setLiveMessages,
    isScreenSharing, setIsScreenSharing,
    activeMeetingId, setActiveMeetingId,
    sessionTopic, setSessionTopic,
    showTopicModal, setShowTopicModal,
    showEndChoiceModal, setShowEndChoiceModal,
    pendingEndAction, setPendingEndAction,
    talkingTime, setTalkingTime
  } = useLiveClassStore();

  const handleResendVerification = async () => {
    const profile = useAuthStore.getState().profile;
    const user = useAuthStore.getState().user;
    if (!user || !profile) return;
    try {
      await authService.resendVerification(user.uid, user.email!, profile.name);
      showToast("Verification email sent! Please check your inbox.");
    } catch (err: any) {
      console.error("Resend error:", err);
      showToast(err.message || "Failed to resend verification.", "error");
    }
  };

  // Persist active page across refreshes
  useEffect(() => {
    localStorage.setItem('tutor_current_page', currentPage);
  }, [currentPage]);

  // Scroll to top when page changes
  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      const mainElement = document.querySelector('main') || document.querySelector('.main-content') || document.body;
      if (mainElement) mainElement.scrollTop = 0;
    }, 100);
  }, [currentPage]);
  
  // --- REAL-TIME DATA STATE (UI Sync only) ---
  const { 
    bookings, manualSlots, setManualSlots, setOpenRescheduleFor 
  } = useBookingStore();

  const { 
    contacts, activeChatId, chatMessages, studentProfiles, 
    setContacts, setActiveChatId, setChatMessages, setStudentProfiles 
  } = useChatStore();

  const { notifications, setNotifications, addNotification } = useNotificationStore();
  const { setReviews } = useReviewStore();

  // 4. Sync Active Chat Messages (Keep in App for Live Class Overlay access)
  useEffect(() => {
    if (!activeChatId || !profile?.id) return;

    const unsubMsgs = chatService.subscribeToMessages(activeChatId, profile.id, (msgs) => {
      setContacts(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: msgs } : c));
    });

    return () => unsubMsgs();
  }, [activeChatId, profile?.id]);
  
  // --- Real-time Handlers ---
  const baseSendMessage = async (contactId: string, payload: any) => {
    if (!profile?.id) return;
    await chatService.sendMessage(
      contactId,
      payload.text || '',
      profile.id,
      profile.name,
      { ...payload }
    );
    const contact = contacts.find(c => c.id === contactId);
    const studentEmail = contact?.studentEmail || chatService.extractEmailFromChatId(contactId);
    if (studentEmail && !payload.messageId) {
      await notificationService.notifyNewMessage(studentEmail, profile.name, payload.text);
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
    await chatService.deleteMessage(activeChatId, msgId, everyone);
  };
  
  const handleVote = async (messageId: string, optionIndex: number) => {
    if (!profile?.id || !activeChatId) return;
    const msg = chatMessages.find(m => m.id === messageId);
    if (!msg || !msg.pollData) return;

    const votes = { ...(msg.pollData.votes || {}) };
    const emailKey = profile.id.replace(/\./g, '_');
    let userVotes = votes[emailKey] || [];
    
    if (msg.pollData.allowMultiple) {
      if (userVotes.includes(optionIndex)) {
        userVotes = userVotes.filter((v: number) => v !== optionIndex);
      } else {
        userVotes.push(optionIndex);
      }
    } else {
      userVotes = [optionIndex];
    }
    
    votes[emailKey] = userVotes;
    await chatService.voteOnChatPoll(activeChatId, messageId, votes);
  };

  const handleOpenChat = async (booking: Booking) => {
    if (!profile?.id || !booking.studentEmail) return;
    
    const chatId = `${profile.id}_${booking.studentEmail.replace(/\./g, '_')}`;
    const studentName = booking.name || (booking as any).studentName || 'Student';
    
    await chatService.initializeChat(chatId, profile.id, profile.name, profile.avatar || '', booking.studentEmail, studentName);

    setActiveChatId(chatId);
    setCurrentPage('chat');
  };

  // --- Live Class WebRTC & Session Refs ---

  // WebRTC & Session Refs
  const socketRef = useRef<any>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<{socketId: string, stream: MediaStream, userId: string, userName?: string}[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<any>(null);
  const talkingTimeRef = useRef(0);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // --- Push Notification Registration ---
  useEffect(() => {
    const setupNotifications = async () => {
      if (!messaging || !profile?.id) return;

      // SECURITY: Push notifications require a secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        console.warn('âš ï¸ [SECURITY] Push notifications are disabled on insecure origins (HTTP IP). Use localhost or HTTPS.');
        return;
      }

      try {
        if (!('Notification' in window)) return;
        
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
              addNotification({
                type: 'booking',
                title: 'Class Starts in 10m!',
                description: `Your session with ${booking.name} starts soon. Please prepare to join.`,
              });
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


  useEffect(() => {
    let currentStream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        if (isCamOn && currentPage === 'live-class' && sessionStatus !== 'disconnected') {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("Camera API not available in this browser/context.");
            return;
          }
          currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: isMicOn });
          streamRef.current = currentStream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = currentStream;
          }
        } else {
          if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
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
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCamOn, isMicOn, currentPage, sessionStatus]);

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      if (localStreamRef.current) {
        // Stop screen tracks
        localStreamRef.current.getTracks().forEach(track => {
          if (track.label.includes('screen') || track.kind === 'video') {
             // We'll reset to camera later
          }
        });
      }
      setIsScreenSharing(false);
      // Restart camera logic will trigger via useEffect [isCamOn]
    } else {
      try {
        if (!navigator.mediaDevices || !(navigator.mediaDevices as any).getDisplayMedia) {
          showToast("Screen sharing is blocked on insecure connections. Please use HTTPS.", "error");
          return;
        }
        const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Replace track for all peers
        peersRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        setIsScreenSharing(true);

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          // Camera restart will be handled by useEffect
        };
      } catch (err) {
        console.error("Error sharing screen:", err);
      }
    }
  };

  const startSession = async (bookingId: string) => {
    setCurrentPage('live-class');
    setSessionStatus('connecting');
    setActiveMeetingId(bookingId);

    // 1. Track tutor joined in booking
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, { 
      tutorJoined: true, 
      tutorPresent: true,
      status: 'live',
      startedAt: serverTimestamp()
    });

    // 2. Initialize/Update Live Session in Firestore
    const sessionRef = doc(db, 'live_sessions', bookingId);
    await setDoc(sessionRef, {
      tutorId: profile.id,
      tutorName: profile.name,
      tutorJoined: true,
      status: 'live',
      startTime: serverTimestamp(),
      lastUpdate: serverTimestamp()
    }, { merge: true });

    // 3. Setup Listeners
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

    // 4. Initialize Local Media
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      
      // Start voice detection for talking time
      startVoiceDetection(stream);
    } catch (err) {
      console.error("Media Access Denied:", err);
    }

    // 5. Socket.IO Signaling Setup
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    socketRef.current = io(`${protocol}//${hostname}:5001`);
    socketRef.current.emit('join-room', { 
      roomId: bookingId, 
      userId: profile.id, 
      userName: profile.name,
      role: 'tutor' 
    });

    socketRef.current.on('all-users', (users: any[]) => {
      users.forEach(user => {
        const pc = createPeerConnection(user.socketId, bookingId);
        peersRef.current.set(user.socketId, pc);
        pc.createOffer().then(offer => {
          pc.setLocalDescription(offer);
          socketRef.current.emit('signal', { to: user.socketId, signal: offer });
        });
      });
    });

    socketRef.current.on('signal', async ({ from, signal }: any) => {
      let pc = peersRef.current.get(from);
      if (signal.type === 'offer') {
        if (!pc) {
          pc = createPeerConnection(from, bookingId);
          peersRef.current.set(from, pc);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current.emit('signal', { to: from, signal: answer });
      } else if (signal.type === 'answer') {
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.candidate) {
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    });

    socketRef.current.on('user-joined', ({ socketId, userName, role }: any) => {
      console.log(`ðŸ‘¤ ${role === 'tutor' ? 'Tutor' : 'Student'} Joined:`, userName);
      setSessionStatus('live');
    });

    socketRef.current.on('user-media-toggled', ({ socketId, type, enabled }: any) => {
      console.log(`ðŸŽ¥ Media Toggled by ${socketId}: ${type} is now ${enabled}`);
    });

    socketRef.current.on('user-left', ({ socketId }: any) => {
      const pc = peersRef.current.get(socketId);
      if (pc) pc.close();
      peersRef.current.delete(socketId);
      setRemoteStreams(prev => prev.filter(s => s.socketId !== socketId));
    });

    socketRef.current.on('receive-message', (data: any) => {
      setLiveMessages(prev => [...prev, data]);
    });

    // Store unsubs for cleanup in endSession if needed, but here we just let them run
    // until the component unmounts or endSession is called.
    (window as any)._sessionUnsub = () => { unsub(); msgUnsub(); };
  };

  // Sync Media Status to Room (Dynamic UI)
  useEffect(() => {
    if (socketRef.current && sessionStatus === 'live' && activeMeetingId) {
      socketRef.current.emit('toggle-media', {
        roomId: activeMeetingId,
        type: 'audio',
        enabled: isMicOn
      });
      socketRef.current.emit('toggle-media', {
        roomId: activeMeetingId,
        type: 'camera',
        enabled: isCamOn
      });
    }
  }, [isMicOn, isCamOn, sessionStatus, activeMeetingId]);

  // ðŸ›‘ AUTO-CLEANUP WHEN NAVIGATING AWAY ðŸ›‘
  useEffect(() => {
    // If we were in a live class and moved to another page (not just minimized)
    if (currentPage !== 'live-class' && activeMeetingId && sessionStatus !== 'disconnected') {
      console.log("ðŸ›‘ Navigated away from Live Class - Cleaning up local resources...");
      
      // Stop media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      
      // Close WebRTC peers
      peersRef.current.forEach(pc => pc.close());
      peersRef.current.clear();
      
      // Disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      setRemoteStreams([]);
      // We keep activeMeetingId so we can rejoin, but status is reset
      setSessionStatus('disconnected'); 
    }
  }, [currentPage]);

  const createPeerConnection = (socketId: string, roomId: string) => {
    const pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ] 
    });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit('signal', { to: socketId, signal: { candidate: e.candidate } });
      }
    };
    pc.ontrack = (e) => {
      setRemoteStreams(prev => {
        if (prev.find(s => s.socketId === socketId)) return prev;
        return [...prev, { socketId, stream: e.streams[0], userId: 'student' }];
      });
      setSessionStatus('live');
    };
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }
    return pc;
  };

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
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;
        
        if (average > 15) { // Threshold for talking
          talkingTimeRef.current += 1;
          setTalkingTime(talkingTimeRef.current);
          
          if (talkingTimeRef.current % 30 === 0 && activeMeetingId) {
             liveClassService.updateTalkingTime(activeMeetingId, talkingTimeRef.current);
          }
        }
      }, 1000);
    } catch (e) {
      console.error("Audio detection error:", e);
    }
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

      // Attendance Status Logic based on who joined
      let studentValid = false;
      if (bookingData.isGroup && bookingData.participantData) {
        studentValid = Object.values(bookingData.participantData).some((p: any) => p.joinTime != null);
      } else {
        studentValid = bookingData.studentPresent;
      }

      const tutorValid = true; // Tutor is explicitly ending the session

      let attendance_status = 'not_conducted';
      if (tutorValid && studentValid) {
        attendance_status = 'attended';
      } else if (tutorValid || studentValid) {
        attendance_status = 'not_attended';
      }

      // Only ask for topic if both tutor and student were in the room
      const isValidClass = attendance_status === 'attended';

      // Only ask for topic if the class was attended
      if (isValidClass && !showTopicModal && !sessionTopic) {
        setShowTopicModal(true);
        return;
      }

      const finalTopic = sessionTopic.trim() || bookingData.subject || 'Class Session';

      await liveClassService.updateSession(bookingId, {
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
        attendance_status: attendance_status
      };

      // ðŸ›‘ WebRTC & Listener CLEANUP ðŸ›‘
      if ((window as any)._sessionUnsub) {
        (window as any)._sessionUnsub();
        delete (window as any)._sessionUnsub;
      }
      if (socketRef.current) socketRef.current.disconnect();
      peersRef.current.forEach(pc => pc.close());
      peersRef.current.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      setRemoteStreams([]);
      setSessionStatus('disconnected');

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

      await bookingService.finalizeSession(bookingId, updates);
      
      if (action === 'reschedule') {
        // If rescheduling, we don't mark as completed, but prepare for reschedule
        await bookingService.updateStatus(bookingId, 'confirmed', profile?.name || 'Tutor', bookingData); 
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
    await liveClassService.muteAll(activeMeetingId);
  };

  const handleSendLiveMessage = async (text: string) => {
    if (!activeMeetingId || !profile?.id) return;
    await liveClassService.sendLiveMessage(activeMeetingId, profile.id, profile.name, text);
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



  const handleStatusChange = async (id: any, status: BookingStatus) => {
    try {
      if (profile?.id) {
        const booking = bookings.find(b => b.id === id);
        if (!booking) return;

        await bookingService.updateStatus(id.toString(), status, profile.name, booking);
        
        if (status === 'confirmed') {
          addNotification({
            type: 'booking',
            title: 'Booking Confirmed',
            description: `${booking.name || 'Student'}'s ${booking.subject || 'Session'} confirmed.`,
          });
        }
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      showToast("Failed to update status. Check your connection.", "error");
    }
  };

  const handleAddSlot = (slot: Omit<AvailabilitySlot, 'id'>) => {
    const isDuplicate = manualSlots.some(s => 
      s.date === slot.date && s.start === slot.start
    );
    if (isDuplicate) return;

    const newSlot = { ...slot, id: Date.now() + Math.random() };
    const newSlots = [...manualSlots, newSlot];
    setManualSlots(newSlots);
    if (profile?.id) {
      tutorService.updateAvailability(profile.id, newSlots);
    }
  };

  const handleBatchAddSlots = (slotsToApply: Omit<AvailabilitySlot, 'id'>[]) => {
    const slotsWithIds = slotsToApply.map((s, i) => ({ ...s, id: Date.now() + i + Math.random() }));
    const newSlots = [...manualSlots, ...slotsWithIds];
    setManualSlots(newSlots);
    if (profile?.id) {
      tutorService.updateAvailability(profile.id, newSlots);
    }
  };

  const handleClearSlots = () => {
    setManualSlots([]);
    if (profile?.id) {
      tutorService.updateAvailability(profile.id, []);
    }
  };

  const handleDeleteSlot = (id: number) => {
    const newSlots = manualSlots.filter(s => String(s.id) !== String(id));
    setManualSlots(newSlots);
    if (profile?.id) {
      tutorService.updateAvailability(profile.id, newSlots);
    }
  };

  const handleEditSlot = (id: number, updatedSlot: Partial<AvailabilitySlot>) => {
    const newSlots = manualSlots.map(s => s.id === id ? { ...s, ...updatedSlot } : s);
    setManualSlots(newSlots);
    if (profile?.id) {
      tutorService.updateAvailability(profile.id, newSlots);
    }
  };

  const handleReschedule = async (id: any, date: string, time: string, tutorMessage?: string) => {
    try {
      const booking = bookings.find(b => b.id === id);
      if (!booking) return;

      await bookingService.reschedule(id.toString(), date, time, profile?.name || 'Tutor', booking);

      addNotification({
        type: 'booking',
        title: 'Session Rescheduled',
        description: `You've successfully rescheduled the session. Student has been notified.`,
      });
    } catch (e) {
      console.error("Reschedule error:", e);
      showToast("Failed to reschedule session.", "error");
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage('bookings');
  };

  const handleLogout = () => {
    if (!user) {
      setView('login');
      setIsReapplying(false);
      setPrefilledEmail('');
      setCurrentPage('dashboard');
      return;
    }
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await authService.signOut();
    setView('login');
    setIsReapplying(false);
    setPrefilledEmail('');
    setCurrentPage('dashboard');
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // --- CENTRALIZED CONTENT ROUTER: STATUS-FIRST ---
  const renderAppContent = () => {
    // 1. HARD LOADING STATE (Firebase Auth Initialization)
    if (loading) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="label-caps opacity-40 animate-pulse tracking-widest font-black uppercase text-xs">Authenticating Profile...</p>
        </div>
      );
    }

    // 2. BLOCKED STATUS (Immediate Gate)
    if (profile?.status === 'blocked') {
      return (
        <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 shadow-xl">
            <XCircle size={40} />
          </div>
          <h1 className="text-3xl font-black text-rose-900 mb-2">Account Restricted</h1>
          <p className="text-rose-700 font-bold max-w-md mb-8">This tutor account has been restricted by the administration. If you believe this is an error, please contact support.</p>
          <button onClick={handleLogout} className="btn-primary bg-rose-600 hover:bg-rose-700">Return to Login</button>
        </div>
      );
    }

    // 3. RE-APPLYING / REGISTRATION OVERRIDE
    if (isReapplying || view === 'register') {
      return (
        <Registration 
          onComplete={() => { setIsReapplying(false); setView('app'); }} 
          onSwitchToLogin={() => { setIsReapplying(false); setView('login'); }}
          isDirectReapply={isReapplying}
          currentUser={user}
          initialEmail={prefilledEmail || user?.email || ''}
        />
      );
    }

    // 4. UNAUTHENTICATED STATE
    if (!user || view === 'login') {
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
            setPrefilledEmail(email || '');
            setView('register');
          }}
        />
      );
    }

    // 5. PROFILE FETCHING STATE
    if (profileLoading) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 mx-auto"></div>
          <p className="label-caps opacity-40 animate-pulse tracking-widest font-black uppercase text-xs">Fetching your verification status...</p>
        </div>
      );
    }

    // 6. MISSING PROFILE FALLBACK
    if (!profile) {
      if (view === 'app') {
        return (
          <Registration 
            onComplete={() => setView('app')} 
            onSwitchToLogin={() => setView('login')}
            isCompletingProfile={true}
            currentUser={user}
          />
        );
      }
      return (
        <Login 
          onLogin={() => setView('app')} 
          onSwitchToRegister={() => setView('register')}
          onReapply={() => {
            setIsReapplying(true);
            setView('register');
          }}
        />
      );
    }

    // 7. STATUS GATES
    if (profile.status === 'pending' || (profile.status !== 'approved' && profile.status !== 'rejected')) {
      return <StatusGate status="pending" profile={profile} onLogout={handleLogout} />;
    }

    if (profile.status === 'rejected') {
      return <StatusGate status="rejected" profile={profile} onLogout={handleLogout} onReapply={handleReapply} />;
    }

    if (profile.status === 'approved' && profile.activated === false) {
      return <StatusGate status="verify" user={user} onLogout={handleLogout} onResendVerification={handleResendVerification} />;
    }

    // 8. APPROVED (DASHBOARD)
    if (profile.status === 'approved') {
      return (
        <div className="flex min-h-screen bg-[#F8FAFC] w-full">
          <div className="flex-1">
            <AppRoutes />
          </div>

          {/* Live Class Overlay */}
          <AnimatePresence>
            {currentPage === 'live-class' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-[#0A0A0B] text-white flex flex-col font-sans overflow-hidden"
              >
                {/* Live Class Header */}
                <div className="h-20 px-6 flex items-center justify-between border-b border-white/5 bg-[#121214]/80 backdrop-blur-md">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                      <GraduationCap className="text-primary" size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold tracking-tight">Live Session</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${sessionStatus === 'live' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/20'}`}></span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                          {sessionStatus === 'live' ? 'Live' : 'Connecting...'}
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
                            await liveClassService.startLiveClass(activeMeetingId);
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
                    <div className="w-full h-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-stretch">
                      {/* Self Participant */}
                      <div className="relative bg-[#1A1A1E] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center">
                        {isCamOn ? (
                          <div className="w-full h-full relative group">
                            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale-[0.2]" />
                            <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                              <p className="text-xs md:text-sm font-bold text-white/90">{profile.name} (You)</p>
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
                            <MicOff size={16} />
                          </div>
                        )}
                      </div>

                      {/* Remote Participants */}
                      <div className={cn("grid gap-4", remoteStreams.length <= 1 ? "grid-cols-1" : "grid-cols-2")}>
                        {remoteStreams.map((rs) => (
                          <div key={rs.socketId} className="relative bg-[#1A1A1E] rounded-3xl overflow-hidden border border-white/5">
                            <video ref={(el) => { if (el) el.srcObject = rs.stream; }} autoPlay playsInline className="w-full h-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                              <p className="text-xs font-bold text-white">{rs.userName || 'Student'}</p>
                            </div>
                          </div>
                        ))}
                        {remoteStreams.length === 0 && (
                          <div className="relative bg-[#1A1A1E] rounded-3xl flex items-center justify-center border border-white/5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Waiting for Students...</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-4 bg-[#121214]/60 backdrop-blur-2xl p-4 rounded-[2.5rem] border border-white/10 shadow-2xl z-20">
                      <button onClick={() => setIsMicOn(!isMicOn)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-white/5 text-white' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'}`}>
                        {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                      </button>
                      <button onClick={() => setIsCamOn(!isCamOn)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCamOn ? 'bg-white/5 text-white' : 'bg-white text-black shadow-lg'}`}>
                        <Camera size={20} />
                      </button>
                      <button onClick={handleScreenShare} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? 'bg-primary text-white' : 'bg-white/5 text-white'}`}>
                        <Monitor size={20} />
                      </button>
                      <button onClick={() => setIsLiveChatOpen(!isLiveChatOpen)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isLiveChatOpen ? 'bg-primary text-white' : 'bg-white/5 text-white'}`}>
                        <MessageSquare size={20} />
                      </button>
                      <div className="w-px h-8 bg-white/10 mx-2" />
                      <button onClick={endSession} className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center hover:scale-110 transition-all shadow-xl shadow-rose-500/40">
                        <LogOut size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Live Chat Panel */}
                  <AnimatePresence>
                    {isLiveChatOpen && (
                      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="absolute right-0 top-0 bottom-0 w-[400px] bg-[#121214] border-l border-white/5 flex flex-col shadow-2xl z-[210]">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                          <h3 className="font-bold text-white">Class Chat</h3>
                          <button onClick={() => setIsLiveChatOpen(false)} className="text-white/20 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                          {liveMessages.map(msg => (
                            <div key={msg.id} className="flex flex-col gap-1 items-end">
                              <div className="bg-primary px-4 py-2 rounded-2xl rounded-tr-none text-sm text-white">{msg.text}</div>
                              <span className="text-[9px] text-white/20 uppercase">{msg.time}</span>
                            </div>
                          ))}
                        </div>
                        <div className="p-6 bg-[#0A0A0B] border-t border-white/5">
                          <input 
                            placeholder="Type a message..." 
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSendLiveMessage(e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 outline-none text-white text-sm"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Topic entry modal */}
          <AnimatePresence>
            {showTopicModal && (
              <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl">
                  <h3 className="text-2xl font-bold text-slate-800 text-center mb-8">Class Conducted</h3>
                  <div className="space-y-6">
                    <input 
                      autoFocus 
                      placeholder="e.g. Introduction to Derivatives" 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-800 font-bold outline-none" 
                      value={sessionTopic} 
                      onChange={(e) => setSessionTopic(e.target.value)} 
                    />
                    <button onClick={() => finalizeSession('complete')} className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl uppercase text-xs tracking-widest">Complete Session</button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* End Class Choice Modal */}
          <AnimatePresence>
            {showEndChoiceModal && (
              <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl text-center">
                  <h2 className="text-2xl font-black text-slate-800 mb-8">Finish Session?</h2>
                  <div className="space-y-4">
                    <button onClick={() => finalizeSession('complete')} className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3"><Check size={18} /> Class Conducted</button>
                    <button onClick={() => finalizeSession('reschedule')} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3"><Clock size={18} /> Reschedule Needed</button>
                    <button onClick={() => setShowEndChoiceModal(false)} className="w-full text-slate-400 font-bold text-xs uppercase py-2">Go Back</button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="app-container">
      {renderAppContent()}
      
      {/* Global Modals & Toasts */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl text-center">
              <h3 className="text-2xl font-bold text-slate-800 mb-8">End Session?</h3>
              <div className="space-y-4">
                <button onClick={confirmLogout} className="w-full bg-rose-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase text-xs tracking-widest">Yes, Logout</button>
                <button onClick={cancelLogout} className="w-full bg-slate-100 text-slate-600 font-black py-5 rounded-2xl uppercase text-xs tracking-widest">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-full shadow-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 border", toast.type === 'error' ? "bg-rose-500 text-white border-rose-400" : "bg-primary text-white border-blue-400")}>
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Build Trigger: 2026-04-30 20:16:18
