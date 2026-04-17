import { useState, FormEvent, ChangeEvent, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, BadgeCheck, Video, User, Mail, Phone, Lock, Award, ShieldCheck, Clock, Globe, Wallet, Check, CheckCircle, AlertCircle, Eye, EyeOff, MapPin } from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { cn } from '../lib/utils';

interface RegistrationProps {
  onComplete: () => void;
  onSwitchToLogin: () => void;
  isCompletingProfile?: boolean;
  isDirectReapply?: boolean;
  initialEmail?: string;
  currentUser?: any;
}

const mapAuthError = (code: string) => {
  switch (code) {
    case 'auth/configuration-not-found':
      return "The Authentication service is not enabled for this project. Please enable Email/Password login in the Firebase Console.";
    case 'auth/email-already-in-use':
      return "This email is already registered. Please try logging in instead.";
    case 'auth/weak-password':
      return "Password is too weak. Please use at least 6 characters.";
    case 'auth/invalid-email':
      return "Please enter a valid email address.";
    case 'auth/network-request-failed':
      return "Network connection issue. Please check your internet.";
    default:
      return "An unexpected error occurred. Please try again or contact support.";
  }
};

export function Registration({ 
  onComplete, 
  onSwitchToLogin, 
  isCompletingProfile = false, 
  isDirectReapply = false, 
  initialEmail = '', 
  currentUser = null 
}: RegistrationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [formData, setFormData] = useState<any>({
    name: currentUser?.name || currentUser?.displayName || '',
    email: initialEmail || '',
    phone: currentUser?.phone || '',
    password: '',
    qualification: currentUser?.qualification || '',
    experience: currentUser?.experience || 'Fresher',
    location: null
  });

  const [existingTutorData, setExistingTutorData] = useState<any>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Sync form data
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        name: currentUser.name || '',
        email: initialEmail || '',
        phone: currentUser.phone || '',
        qualification: currentUser.qualification || '',
        experience: currentUser.experience || 'Fresher',
        // PRESERVE PREVIOUS URLS FOR LOGGED IN TUTOR RE-APPLY
        // DO NOT AUTO-FILL SENSITIVE ASSETS FOR RE-APPLY
        avatar: '',
        identityProof: '',
        degreeCertificate: '',
        experienceCertificate: '',
        demoVideo: ''
      }));
      // Ensure badge and specialized logic are active if this is a rejected tutor
      if (currentUser.status === 'rejected') {
        setExistingTutorData(currentUser);
      }
    }

  }, [currentUser, initialEmail]);

  // Handle Typed-in Email Auto-detection (Debounced 600ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Trigger autofill if email is complete but no data is fetched yet
      if (formData.email && 
          formData.email.includes('@') && 
          formData.email.includes('.') && 
          !existingTutorData && 
          !isCompletingProfile) {
        checkEmailForAutofill(formData.email);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [formData.email, existingTutorData]);

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Anti-Cheat: Visibility Tracker
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (isRecording && document.visibilityState === 'hidden') {
        const nextCount = warningCount + 1;
        setWarningCount(nextCount);
        
        if (nextCount <= 3) {
          alert(`🚨 Warning ${nextCount}/3: Do not leave the recording screen. Your session will be reset if you continue.`);
        } else {
          alert("🛑 Session Reset: Screen switching limit exceeded. Please re-record and re-submit.");
          handleResetRecording();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRecording, warningCount]);

  // Auto-Stop Logic (Removed strict 60-min cap to allow any duration)
  useEffect(() => {
    // Limits removed as per user request to allow any duration
  }, [recordingTime, isRecording]);

  // File State
  const [files, setFiles] = useState<{
    profileImage: File | null;
    identityProof: File | null;
    experienceCertificate: File | null;
    degreeCertificate: File | null;
    demoVideo: File | null;
  }>({
    profileImage: null,
    identityProof: null,
    experienceCertificate: null,
    degreeCertificate: null,
    demoVideo: null
  });

  const [fileErrors, setFileErrors] = useState<{
    profileImage?: string | null;
    identityProof?: string | null;
    experienceCertificate?: string | null;
    degreeCertificate?: string | null;
    demoVideo?: string | null;
  }>({});

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    
    // Map custom anti-autofill names back to formData keys
    const nameMap: { [key: string]: string } = {
      'profile-name-field': 'name',
      'profile-email-field': 'email',
      'user-identifier-field': 'email',
      'user-phone-field': 'phone',
      'new-password': 'password',
      'qualification-field': 'qualification'
    };

    const actualName = nameMap[name] || name;

    // Strict Validation for Name - Only alphabets and spaces (No Special Chars, No Numbers)
    if (actualName === 'name') {
      const alphabeticValue = value.replace(/[^A-Za-z\s]/g, '');
      setFormData(prev => ({ ...prev, [actualName]: alphabeticValue }));
      return;
    }

    // Strict Validation for Phone - Only numbers, max 10 digits
    if (actualName === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [actualName]: numericValue }));
      return;
    }

    // Email validation on the fly (basic)
    if (actualName === 'email') {
      // Just set it, but we can check it in handleSubmit
      setFormData(prev => ({ ...prev, [actualName]: value.toLowerCase() }));
      return;
    }

    setFormData(prev => ({ ...prev, [actualName]: value }));
  };

  const toggleFullScreen = () => {
    if (videoPreviewRef.current) {
      if (!document.fullscreenElement) {
        videoPreviewRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  // Immediate Autofill Logic for Re-application
  const checkEmailForAutofill = async (email: string) => {
    if (!email || email.length < 5 || !email.includes('@') || isCompletingProfile) return;
    
    setIsCheckingEmail(true);
    setError(null);
    
    try {
      // Check both unified 'users' and legacy 'tutors' collections
      const qUsers = query(collection(db, 'users'), where("email", "==", email.toLowerCase()));
      const qTutors = query(collection(db, 'tutors'), where("email", "==", email.toLowerCase()));
      
      const [snapUsers, snapTutors] = await Promise.all([getDocs(qUsers), getDocs(qTutors)]);
      const snap = !snapUsers.empty ? snapUsers : snapTutors;
      
      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = doc.data();
        const docs = data.documents || {};
        
        // SYNC ALL FIELDS FROM BOTH SCHEMAS
        setExistingTutorData({ ...data, id: doc.id });
        setFormData(prev => ({
          ...prev,
          name: data.name || '',
          phone: data.phone || '',
          qualification: data.qualification || '',
          experience: data.experience || 'Fresher',
          // DO NOT AUTO-FILL SENSITIVE ASSETS FOR RE-APPLY
          avatar: '',
          identityProof: '',
          degreeCertificate: '',
          experienceCertificate: '',
          demoVideo: ''
        }));
        
        // Ensure files state is cleared (these are only for NEW uploads)
        setFiles({
          profileImage: null,
          identityProof: null,
          experienceCertificate: null,
          degreeCertificate: null,
          demoVideo: null
        });
      } else {
        setExistingTutorData(null);
      }
    } catch (err) {
      console.error("Autofill Check Failed:", err);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, field: keyof typeof files) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Strict PDF validation for certificates
      if (field === 'experienceCertificate' || field === 'degreeCertificate') {
        if (file.type !== 'application/pdf') {
          setFileErrors(prev => ({ 
            ...prev, 
            [field]: `Invalid file type: Must be a PDF document.` 
          }));
          return;
        }
      }
      
      setFiles(prev => ({ ...prev, [field]: file }));
      setFileErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const openCameraPreview = async () => {
    try {
      setError(null);

      // Check for Secure Context (HTTPS/Localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("🔒 Secure Connection Required: Camera access is only available over HTTPS or Localhost. Please ensure you are using a secure connection.");
        return;
      }

      // Simultaneously request Location as requested
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setFormData((prev: any) => ({
              ...prev,
              location: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
              }
            }));
            console.log("📍 Location captured successfully");
          },
          (geoErr) => {
            console.warn("Location access denied:", geoErr.message);
          }
        );
      }

      const userStream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }, 
        audio: true 
      });
      setStream(userStream);
      setIsPreviewing(true);
      
      // Auto-Fullscreen on launch
      try {
        const container = document.getElementById('demo-video-section');
        if (container) await container.requestFullscreen();
      } catch (e) {
        console.warn("Fullscreen request failed or denied:", e);
      }

      // Wait for next tick to ensure ref is bound
      setTimeout(() => {
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = userStream;
          videoPreviewRef.current.play();
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Camera permission denied. Please enable camera in browser settings and reload.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("No camera found. Please connect a webcam to record your demo.");
      } else {
        setError("Camera access blocked. Please check your browser permissions settings.");
      }
    }
  };

  const startRecording = () => {
    if (!stream) return;
    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], `demo_recording_${Date.now()}.webm`, { type: 'video/webm' });
        setFiles(prev => ({ ...prev, demoVideo: file }));
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      };

      mediaRecorder.start(1000);
      setRecorder(mediaRecorder);
      setIsRecording(true);
      setRecordingTime(0);
      setWarningCount(0);

      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      (mediaRecorder as any)._timer = interval;
    } catch (err) {
      console.error("Recording start failed:", err);
    }
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stop();
      clearInterval((recorder as any)._timer);
      setIsRecording(false);
      setIsPreviewing(false);
      setRecorder(null);
      // Auto-exit fullscreen on submission
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.warn("Exit fullscreen failed:", err));
      }
    }
  };

  const handleResetRecording = () => {
    if (recorder) {
      recorder.stop();
      clearInterval((recorder as any)._timer);
    }
    setRecorder(null);
    setStream(null);
    setIsRecording(false);
    setIsPreviewing(false);
    setRecordingTime(0);
    setWarningCount(0);
    setFiles(prev => ({ ...prev, demoVideo: null }));
  };

  const [submissionState, setSubmissionState] = useState<string>('');
  const [backgroundSyncPercent, setBackgroundSyncPercent] = useState(0);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);

  // Prevent accidental tab closure during background upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isBackgroundSyncing) {
        e.preventDefault();
        e.returnValue = 'Your profile documents are still synchronizing. Closing this tab now may result in incomplete verification. Please wait a few more seconds.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isBackgroundSyncing]);

  const uploadFile = async (file: File, path: string) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = 'Full name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    if (!formData.password && !existingTutorData) newErrors.password = 'Password is required';
    if (!formData.qualification) newErrors.qualification = 'Qualification is required';
    
    if (!files.profileImage && !formData.avatar) newErrors.profileImage = 'Profile image is required';
    if (!files.identityProof && !formData.identityProof) newErrors.identityProof = 'Identity proof is required';
    if (!files.degreeCertificate && !formData.degreeCertificate) newErrors.degreeCertificate = 'Degree certificate is required';
    if (!files.demoVideo && !formData.demoVideo) newErrors.demoVideo = 'Demo video is required';

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      setError("Please complete all mandatory fields.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSubmissionState('🛡️ Initializing Fast-Sync...');

      // ⚡ STRICT VALIDATION ⚡
      const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
      if (!emailRegex.test(formData.email)) {
        setError("Please enter a valid academic email address.");
        setIsSubmitting(false);
        return;
      }

      // Name Validation: Alphabets Only
      if (!/^[A-Za-z\s]+$/.test(formData.name)) {
        setError("❌ Correctness Error: Full Name must contain alphabets only.");
        setIsSubmitting(false);
        return;
      }

      // Password Strength: 8+ chars, Number, Special Char, Mixed Case
      // This matches the user's "chars, special char with numbers with min 8" requirement
      const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
      if (!passRegex.test(formData.password)) {
        setError("❌ Security Violation: Password must be min 8 chars and include (A-Z), (a-z), (0-9), and a symbol (@$!%*?&#).");
        setIsSubmitting(false);
        return;
      }

      if (formData.phone.length !== 10) {
        setError("Please enter a valid 10-digit mobile number.");
        setIsSubmitting(false);
        return;
      }

      const hasImage = files.profileImage || formData.avatar;
      const hasIdentity = files.identityProof || formData.identityProof;
      const hasDegree = files.degreeCertificate || formData.degreeCertificate;
      const hasDemoVideo = files.demoVideo || formData.demoVideo;

      if (!hasImage || !hasIdentity || !hasDegree || !hasDemoVideo) {
        setError("⚠️ All mandatory requirements must be provided: Profile Image, ID Proof, Degree Certificate, and Live Demo Video.");
        setIsSubmitting(false);
        return;
      }

      // 2. Identity Resolution (FAST PHASE)
      setSubmissionState('🔍 Securing Identity...');
      let uid = '';
      if (currentUser?.uid) {
        uid = currentUser.uid;
      } else if (existingTutorData?.id) {
        uid = existingTutorData.id;
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        uid = userCredential.user.uid;
      }

      if (!uid) throw new Error("System Error: Identity could not be verified.");

      // 3. Submit to Backend (Multer + Cloudinary)
      setSubmissionState('📤 Uploading to Cloudinary...');
      const registerData = new FormData();
      registerData.append('tutorId', uid);
      registerData.append('name', formData.name);
      registerData.append('email', formData.email);
      registerData.append('phone', formData.phone);
      registerData.append('qualification', formData.qualification);
      registerData.append('experience', formData.experience);
      // location if available
      if (formData.location) {
        registerData.append('location', JSON.stringify(formData.location));
      }

      if (files.profileImage) registerData.append('profileImage', files.profileImage);
      if (files.identityProof) registerData.append('idProof', files.identityProof);
      if (files.degreeCertificate) registerData.append('qualificationDocs', files.degreeCertificate);
      if (files.experienceCertificate) registerData.append('experienceDocs', files.experienceCertificate);
      if (files.demoVideo) registerData.append('demoVideo', files.demoVideo);

      const response = await fetch('http://localhost:5001/api/register-tutor', {
        method: 'POST',
        body: registerData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ Registration Complete:", result);

      // 4. Trigger Success
      setIsSuccess(true);
      setIsSubmitting(false);
      
      // Redirect after a short pause
      setTimeout(() => onComplete(), 2000);

    } catch (err: any) {
      console.error("❌ Registration Failed:", err);
      // Use friendlier mapAuthError if available
      const friendlyMessage = err.code ? mapAuthError(err.code) : err.message;
      setError(friendlyMessage || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-[9999] overflow-y-auto selection:bg-primary/20 font-inter">
      <div className="max-w-4xl mx-auto py-12 md:py-24 px-4 sm:px-6">
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-40 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
        <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-40 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />

        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-10">
          <h1 className="text-5xl font-black text-primary tracking-tighter mb-1 drop-shadow-sm">Eduqra</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 ml-1">Global Academic Atelier</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full bg-white/80 backdrop-blur-3xl p-8 md:p-12 rounded-4xl atelier-card-shadow border border-white/30 relative overflow-hidden">
          <div className="relative z-10">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-on-surface tracking-tight mb-2">{(currentUser?.status === 'rejected' || isDirectReapply) ? 'Profile Correction & Re-application' : 'Tutor Registration'}</h2>
              <p className="text-base text-on-surface-variant font-bold opacity-60">{(currentUser?.status === 'rejected' || isDirectReapply) ? 'Update your details and resubmit for verification. Your account is still active.' : 'Join our specialized teaching network and empower students worldwide.'}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8" autoComplete="off">
              <input type="text" name="dummy-name" style={{ display: 'none' }} aria-hidden="true" />
              <input type="email" name="dummy-email" style={{ display: 'none' }} aria-hidden="true" />
              <input type="password" name="dummy-password" style={{ display: 'none' }} aria-hidden="true" />

              {!isSuccess ? (
                  <div className="space-y-8">
                    <div className="flex flex-col items-center mb-10 p-6 bg-slate-50 rounded-4xl border-2 border-dashed border-slate-200 hover:border-primary transition-all relative group cursor-pointer">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 border-2 border-white overflow-hidden relative">
                        {files.profileImage ? ( <img src={URL.createObjectURL(files.profileImage)} className="w-full h-full object-cover" alt="Profile" /> ) : ( <User className="w-8 h-8 text-slate-200" /> )}
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <User className="text-white w-6 h-6" />
                        </div>
                      </div>
                      <label className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-1">Tutor Profile Image</label>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">Mandatory: JPG or PNG format only</p>
                      <input type="file" accept="image/jpeg, image/png" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'profileImage')} />
                      {files.profileImage && ( <div className="mt-3 flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full"> <Check size={10} className="text-green-600" /> <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">Image Ready</span> </div> )}
                    </div>

                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="label-caps ml-2">Full Name</label>
                          <div className="relative group">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input name="profile-name-field" type="text" placeholder="e.g. Sarah Wilson" className={cn("input-field", submitted && formErrors.name && "border-rose-300")} value={formData.name} onChange={handleInputChange} required />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="label-caps ml-2 flex items-center justify-between">Email Address {isCheckingEmail && <Clock className="w-3 h-3 animate-spin text-primary" />} {existingTutorData && <span className="text-[10px] text-green-600 font-black uppercase bg-green-50 px-3 py-1 rounded-full border border-green-100 flex items-center gap-1.5 shadow-sm animate-in fade-in slide-in-from-top-1"> <Check size={10} /> {isDirectReapply ? 'Account Found: Update Details' : 'Profile Found: Re-apply Mode Active'}</span>}</label>
                          <div className="relative group">
                            <Mail className={cn("absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors", existingTutorData ? "text-primary" : "text-slate-400")} />
                            <input type="email" name="user-identifier-field" value={formData.email} onChange={handleInputChange} onBlur={(e) => checkEmailForAutofill(e.target.value)} placeholder="tutor@example.com" className={cn("input-field pr-24", existingTutorData && "border-primary/30 bg-slate-50 cursor-not-allowed opacity-70", submitted && formErrors.email && "border-rose-300")} autoComplete="off" disabled={isCompletingProfile || !!existingTutorData} required />
                            {!existingTutorData && formData.email.includes('@') && ( <button type="button" onClick={() => checkEmailForAutofill(formData.email)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-all uppercase tracking-widest">Sync</button> )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="label-caps ml-2">Mobile Number (10 Digits)</label>
                          <div className="relative group">
                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input name="user-phone-field" type="tel" placeholder="9876543210" className={cn("input-field", submitted && formErrors.phone && "border-rose-300")} value={formData.phone} onChange={handleInputChange} autoComplete="off" minLength={10} maxLength={10} disabled={isDirectReapply && !!existingTutorData} required />
                          </div>
                        </div>
                        {!isCompletingProfile && !isDirectReapply && !existingTutorData && (
                          <div className="space-y-2">
                            <label className="label-caps ml-2">Password</label>
                            <div className="relative group">
                              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                              <input name="new-password" type={showPassword ? "text" : "password"} placeholder="Create secure password" className="input-field pr-12" value={formData.password} onChange={handleInputChange} autoComplete="new-password" required minLength={8} pattern="^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$" title="Password must be at least 8 characters long and contain at least one letter, one number, and one special symbol." />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors">{showPassword ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="label-caps ml-2">Highest Qualification</label>
                            <div className="relative group">
                              <Award className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                              <input name="qualification-field" type="text" placeholder="e.g. PhD in Physics" className="input-field" value={formData.qualification} onChange={handleInputChange} autoComplete="off" required />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="label-caps ml-2">Experience</label>
                            <select name="experience" className="input-field" value={formData.experience} onChange={handleInputChange} required>
                              <option value="Fresher">Fresher (0 Years)</option>
                              <option value="1-3 Years">1-3 Years</option>
                              <option value="3-5 Years">3-5 Years</option>
                              <option value="5+ Years">5+ Years</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className={cn("bg-white border-2 border-slate-100 border-dashed p-4 rounded-3xl flex flex-col items-center justify-center text-center relative hover:border-primary hover:bg-primary/5 transition-all group cursor-pointer h-[160px]", files.identityProof ? "border-green-500 bg-green-50/10" : "border-slate-200")}>
                            <BadgeCheck className={cn("w-7 h-7 mb-2 group-hover:text-primary transition-all", files.identityProof ? "text-green-500" : "text-slate-400")} />
                            <p className="font-black text-[10px] text-slate-900 mb-0.5 leading-tight uppercase tracking-widest">{files.identityProof ? 'ID Uploaded' : 'ID Proof'}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">(Aadhar / Pancard)</p>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'identityProof')} required />
                          </div>

                          <div className={cn("bg-white border-2 border-slate-100 border-dashed p-4 rounded-3xl flex flex-col items-center justify-center text-center relative hover:border-primary hover:bg-primary/5 transition-all group cursor-pointer h-[160px]", files.experienceCertificate ? "border-green-500 bg-green-50/10" : fileErrors.experienceCertificate ? "border-rose-500 bg-rose-50/50" : "border-slate-200", formData.experience === 'Fresher' && "opacity-50")}>
                            {fileErrors.experienceCertificate ? ( <AlertCircle className="w-7 h-7 mb-2 text-rose-500 animate-bounce" /> ) : ( <Award className={cn("w-7 h-7 mb-2 group-hover:text-primary transition-all", files.experienceCertificate ? "text-green-500" : "text-slate-400")} /> )}
                            <p className={cn("font-black text-[10px] mb-0.5 leading-tight uppercase tracking-widest", fileErrors.experienceCertificate ? "text-rose-600" : "text-slate-900")}>{files.experienceCertificate ? 'Exp Cert' : 'Experience'}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{formData.experience === 'Fresher' ? '(No Cert Required)' : '(Only PDF Accept)'}</p>
                            <input type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'experienceCertificate')} required={formData.experience !== 'Fresher'} disabled={formData.experience === 'Fresher'} />
                          </div>

                          <div className={cn("bg-white border-2 border-slate-100 border-dashed p-4 rounded-3xl flex flex-col items-center justify-center text-center relative hover:border-primary hover:bg-primary/5 transition-all group cursor-pointer h-[160px]", files.degreeCertificate ? "border-green-500 bg-green-50/10" : fileErrors.degreeCertificate ? "border-rose-500 bg-rose-50/50" : "border-slate-200")}>
                            {fileErrors.degreeCertificate ? ( <AlertCircle className="w-7 h-7 mb-2 text-rose-500 animate-bounce" /> ) : ( <GraduationCap className={cn("w-7 h-7 mb-2 group-hover:text-primary transition-all", files.degreeCertificate ? "text-green-500" : "text-slate-400")} /> )}
                            <p className={cn("font-black text-[10px] mb-0.5 leading-tight uppercase tracking-widest", fileErrors.degreeCertificate ? "text-rose-600" : "text-slate-900")}>{files.degreeCertificate ? 'Degree' : 'Education'}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">(Highest Doc PDF)</p>
                            <input type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'degreeCertificate')} required />
                          </div>

                          <div id="demo-video-section" className={cn("bg-white border-2 border-slate-100 p-2 rounded-3xl flex flex-col relative overflow-hidden transition-all h-[160px]", files.demoVideo ? "border-green-500/50" : "border-slate-100 shadow-sm")}>
                            <div className="relative flex-1 rounded-2xl overflow-hidden bg-slate-50 flex flex-col items-center justify-center p-4">
                              {!isPreviewing && !isRecording && !files.demoVideo ? (
                                <div className="text-center">
                                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-1"> <Video className="w-5 h-5 text-slate-500" /> </div>
                                  <h5 className="text-[11px] font-black text-slate-800 mb-1">Teaching Demo Video (Required)</h5>
                                  {submitted && formErrors.demoVideo && <p className="text-[10px] font-black text-rose-500 uppercase mb-2">This field is required</p>}
                                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-3 leading-tight text-center px-4">Min 30-40 minutes recommended (Not enforced)</p>
                                  <div className="flex flex-col gap-2 w-full px-4">
                                    <button type="button" onClick={openCameraPreview} className="bg-rose-600 text-white text-[9px] font-black py-2.5 rounded-xl uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 active:scale-95 outline-none focus:ring-0"> Record Live Class </button>
                                    <div className="relative group overflow-hidden">
                                      <button type="button" className="w-full bg-slate-200 text-slate-600 text-[9px] font-black py-2.5 rounded-xl uppercase tracking-widest hover:bg-slate-300 transition-all active:scale-95"> Upload Class Video </button>
                                      <input type="file" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'demoVideo')} />
                                    </div>
                                    {formData.location && (
                                     <div className="flex items-center justify-center gap-1.5 text-[8px] font-black text-emerald-600 uppercase tracking-widest animate-pulse mt-1">
                                       <MapPin size={10} className="stroke-[3px]" />
                                       <span>Location Secured</span>
                                     </div>
                                   )}
                                  </div>
                                </div>
                              ) : (
                                <div className="absolute inset-0 z-10 bg-black flex flex-col">
                                  <video ref={videoPreviewRef} src={files.demoVideo ? URL.createObjectURL(files.demoVideo) : undefined} autoPlay={!files.demoVideo} muted={!files.demoVideo} controls={!!files.demoVideo} className="w-full h-full object-cover" />
                                  
                                  {isRecording && (
                                    <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
                                      <span className="text-[9px] font-black text-white tabular-nums"> {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')} </span>
                                    </div>
                                  )}

                                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-3">
                                    {isPreviewing && !isRecording && (
                                      <>
                                        <button type="button" onClick={() => { setIsPreviewing(false); setStream(null); setIsRecording(false); }} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-[8px] font-black py-2 rounded-lg uppercase tracking-widest transition-all"> Cancel </button>
                                        <button type="button" onClick={startRecording} className="flex-[2] bg-rose-600 text-white text-[8px] font-black py-2 rounded-lg uppercase tracking-widest hover:bg-rose-700 transition-all"> Start Recording </button>
                                      </>
                                    )}
                                    
                                    {(isRecording || files.demoVideo) && (
                                      <>
                                        <button type="button" onClick={handleResetRecording} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-[8px] font-black py-2 rounded-lg uppercase tracking-widest backdrop-blur-md border border-white/10 transition-all outline-none focus:ring-0"> Re-record </button>
                                        {isRecording ? (
                                          <button type="button" onClick={stopRecording} className="flex-[2] bg-rose-600 text-white text-[8px] font-black py-2 rounded-lg uppercase tracking-widest hover:bg-rose-700 transition-all outline-none focus:ring-0"> Stop & Save </button>
                                        ) : (
                                          <div className="flex-[2] bg-green-500/10 text-green-500 border border-green-500/20 text-[8px] items-center justify-center flex font-black py-2 rounded-lg uppercase tracking-widest"> Captured Successfully </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {error && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-rose-50 border border-rose-200 p-6 rounded-2xl flex flex-col gap-4 text-rose-600">
                            <div className="flex items-center gap-3"> <AlertCircle className="w-5 h-5 shrink-0" /> <p className="text-sm font-bold">{error}</p> </div>
                            {error && error.includes('already registered') && (
                              <div className="pt-4 border-t border-rose-100 flex flex-col gap-3">
                                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest text-center">Already Rejected? Correct Your Profile Now</p>
                                <button type="button" onClick={onSwitchToLogin} className="w-full bg-rose-500 text-white font-black hover:bg-rose-600 transition-all px-6 py-3 rounded-xl shadow-lg shadow-rose-500/20 uppercase tracking-widest text-[10px] outline-none">Re-apply via Login</button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="pt-8">
                        <button type="submit" disabled={isSubmitting} className="w-full btn-primary text-lg py-5 rounded-3xl shadow-2xl shadow-primary/20 hover:shadow-primary/40 tracking-tight disabled:opacity-70 group outline-none focus:ring-0">
                          {isSubmitting ? ( <div className="flex items-center gap-3"> <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}> <Clock className="w-7 h-7" /> </motion.div> <span>{submissionState || (currentUser?.status === 'rejected' ? 'Updating Credentials...' : 'Initializing Workspace...')}</span> </div> ) : ( <span className="group-hover:tracking-[0.1em] transition-all duration-300">{currentUser?.status === 'rejected' ? 'Reapply & Submit Profile' : 'Complete Registration'}</span> )}
                        </button>
                        <div className="text-center mt-8 space-y-6"> <p className="text-sm font-bold text-on-surface-variant">Already have an account? <button type="button" onClick={onSwitchToLogin} className="text-primary font-black hover:underline ml-1 transition-all">Sign In</button></p> </div>
                        <p className="text-center text-[11px] text-on-surface-variant mt-10 font-black uppercase tracking-widest opacity-40 flex items-center justify-center gap-2"> <ShieldCheck className="w-3.5 h-3.5" /> Data handled strictly via Eduqra Privacy Protocols </p>
                      </div>
                    </div>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col items-center justify-center py-12 text-center gap-6">
                  <div className="relative"> <div className="absolute inset-0 bg-amber-400/20 rounded-full animate-ping scale-150" /> <div className="w-28 h-28 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl relative z-10"> <Check className="w-14 h-14 text-white stroke-[3px]" /> </div> </div>
                  <div> 
                    <h2 className="text-3xl font-black text-on-surface tracking-tight mb-3">Registration Confirmed!</h2> 
                    {isBackgroundSyncing ? (
                      <div className="space-y-4 px-4">
                        <div className="flex items-center justify-center gap-3 text-primary font-black text-lg animate-pulse">
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}> <Clock className="w-5 h-5" /> </motion.div>
                          <span>Synchronizing Profile Assets...</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                           <motion.div initial={{ width: 0 }} animate={{ width: `${backgroundSyncPercent}%` }} className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Transmission Progress: {backgroundSyncPercent}% • Secured by Eduqra</p>
                        <p className="text-[11px] text-amber-600 font-bold bg-amber-50 py-2 px-4 rounded-lg inline-block">⚠️ Please keep this tab open for few more seconds</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-primary font-black text-lg mb-1">⏳ Registration Under Review</p> 
                        <p className="text-slate-500 font-bold text-sm max-w-sm leading-relaxed">Thanks for registering! Your profile will undergo a series of quality checks. You will get a response <strong>within 24 hours</strong>.</p> 
                      </>
                    )}
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 max-w-sm w-full text-left space-y-2"> <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-3">What happens next?</p> {['📧 Check your email for a confirmation receipt', '🔍 Our team reviews your submitted documents', '✅ You get an email when your account is approved', '🚀 Log in and start teaching on Eduqra!'].map((step, i) => ( <p key={i} className="text-sm font-bold text-amber-800">{step}</p> ))} </div>
                  {!isBackgroundSyncing && <p className="text-xs text-slate-400 font-bold animate-pulse">Redirecting to login page in a moment...</p>}
                </motion.div>
              )}
            </form>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="w-full bg-primary p-10 md:p-14 rounded-4xl flex flex-col items-center justify-center text-center relative overflow-hidden text-white shadow-2xl" >
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-black/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 w-full"> <h2 className="text-2xl md:text-3xl font-black mb-8 leading-tight tracking-tight">Join our elite network of verified tutors today.</h2> <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> {[ { title: 'Flexible Remote Hours', icon: Clock, desc: 'Set your own schedule and teach from anywhere in the world.' }, { title: 'Transparent Payouts', icon: Wallet, desc: 'Direct, on-time payments with clear earnings tracking.' }, { title: 'Global Audience Reach', icon: Globe, desc: 'Connect with students across continents and cultures.' }, ].map((perk, i) => ( <motion.div key={perk.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-white/10 p-8 rounded-5xl backdrop-blur-xl flex flex-col items-center border border-white/20 hover:-translate-y-2 hover:bg-white/20 transition-all duration-500 cursor-pointer group shadow-xl" > <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all border border-white/5 shadow-inner"> <perk.icon className="w-8 h-8 text-white" /> </div> <h4 className="font-bold text-lg leading-tight mb-2 uppercase tracking-tight">{perk.title}</h4> <p className="text-sm md:text-base font-bold text-white mb-2 leading-relaxed opacity-100">{perk.desc}</p> </motion.div> ))} </div> </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Registration;
