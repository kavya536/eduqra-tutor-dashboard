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
  notice?: string | null;
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
  currentUser = null,
  notice = null
}: RegistrationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [activeNotice, setActiveNotice] = useState<string | null>(notice);

  useEffect(() => {
    if (notice) setActiveNotice(notice);
  }, [notice]);

  // Form State
  const [formData, setFormData] = useState<any>({
    name: '',
    email: '',
    phone: '',
    password: '',
    qualification: '',
    experience: 'Fresher',
    targetClasses: '',
    location: null
  });

  const [existingTutorData, setExistingTutorData] = useState<any>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // When completing profile (already authenticated), we do NOT autofill from currentUser.
  // The form must always start empty for security and privacy.
  // The only exception is the explicit Re-apply flow (isDirectReapply) where name+email lookup is used.


  useEffect(() => {
    // Autofill ONLY triggers during the explicit Re-apply flow (isDirectReapply),
    // NOT during profile completion. This ensures fresh registrations are always blank.
    const timer = setTimeout(() => {
      if (formData.email && 
          formData.email.includes('@') && 
          formData.name && 
          formData.name.length > 2 &&
          !existingTutorData && 
          isDirectReapply) {
        checkEmailForAutofill(formData.email, formData.name);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData.email, formData.name, existingTutorData, isDirectReapply]);

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingWarning, setRecordingWarning] = useState<string | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (isRecording && document.visibilityState === 'hidden') {
        const nextCount = warningCount + 1;
        setWarningCount(nextCount);
        
        if (nextCount <= 3) {
          setRecordingWarning(`🚨 Warning ${nextCount}/3: Do not leave the recording screen.`);
          setTimeout(() => setRecordingWarning(null), 5000);
        } else {
          setRecordingWarning("🛑 Session Reset: Screen switching limit exceeded.");
          handleResetRecording();
          setTimeout(() => setRecordingWarning(null), 5000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRecording, warningCount]);

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
    
    const nameMap: { [key: string]: string } = {
      'profile-name-field': 'name',
      'profile-email-field': 'email',
      'user-identifier-field': 'email',
      'user-phone-field': 'phone',
      'new-password': 'password',
      'qualification-field': 'qualification'
    };

    const actualName = nameMap[name] || name;

    if (actualName === 'name') {
      const alphabeticValue = value.replace(/[^A-Za-z\s]/g, '');
      setFormData(prev => ({ ...prev, [actualName]: alphabeticValue }));
      return;
    }

    if (actualName === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [actualName]: numericValue }));
      return;
    }

    if (actualName === 'email') {
      setFormData(prev => ({ ...prev, [actualName]: value.toLowerCase() }));
      return;
    }

    setFormData(prev => ({ ...prev, [actualName]: value }));
  };

  const checkEmailForAutofill = async (email: string, name: string) => {
    if (!email || !name || isCompletingProfile) return;
    
    setIsCheckingEmail(true);
    setError(null);
    
    try {
      // Find previously rejected or existing profiles matching both name and email
      const qUsers = query(
        collection(db, 'users'), 
        where("email", "==", email.toLowerCase()),
        where("name", "==", name.trim())
      );
      
      const snap = await getDocs(qUsers);
      
      if (!snap.empty) {
        const docCount = snap.docs[0];
        const data = docCount.data();
        
        // Silently autofill text fields when a matching profile is found
        setExistingTutorData({ ...data, id: docCount.id });
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          phone: data.phone || '',
          qualification: data.qualification || '',
          experience: data.experience || 'Fresher',
          targetClasses: data.targetClasses || '',
        }));
        
        // Documents are NEVER autofilled — tutor must upload manually
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

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const currentOrigin = window.location.origin;
        setError(`🔒 Secure Connection Required: Camera access is blocked on insecure origins.\n\nRecommended Fix:\nUse HTTPS (e.g. ${currentOrigin.replace('http:', 'https:')}) instead of HTTP.\n\nLegacy Workaround for Chrome:\n1. Go to chrome://flags/#unsafely-treat-insecure-origin-as-secure\n2. Add '${currentOrigin}' to the list\n3. Enable and Relaunch Chrome.`);
        return;
      }

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
      
      setTimeout(() => {
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = userStream;
          videoPreviewRef.current.play();
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setError("Camera access blocked. Please check your browser permissions settings.");
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
      setRecorder(null);
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
    setIsPreviewing(true);
    setRecordingTime(0);
    setWarningCount(0);
    setFiles(prev => ({ ...prev, demoVideo: null }));
    openCameraPreview();
  };

  const [submissionState, setSubmissionState] = useState<string>('');
  const [backgroundSyncPercent, setBackgroundSyncPercent] = useState(0);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isBackgroundSyncing) {
        e.preventDefault();
        e.returnValue = 'Transmission Progress: Secured by Eduqra';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isBackgroundSyncing]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    
    // Robust Validation Check
    const errors: Record<string, string> = {};
    if (!formData.name) errors.name = "Full Name is required";
    if (!formData.email) errors.email = "Email is required";
    if (!formData.phone) errors.phone = "Phone number is required";
    if (formData.phone && formData.phone.length < 10) errors.phone = "Enter a valid 10-digit phone number";
    if (!existingTutorData && !formData.password) errors.password = "Password is required";
    if (!formData.qualification) errors.qualification = "Qualification is required";
    if (!formData.targetClasses) errors.targetClasses = "Target classes are required";
    
    // File validation — always required, even during Re-apply
    if (!files.profileImage) errors.profileImage = "Profile image is required";
    if (!files.identityProof) errors.identityProof = "ID proof is required";
    if (!files.degreeCertificate) errors.degreeCertificate = "Degree certificate is required";
    if (!files.demoVideo) errors.demoVideo = "Teaching demo video is required";
    
    // Experience doc mandatory ONLY if not Fresher
    if (formData.experience !== 'Fresher' && !files.experienceCertificate) {
      errors.experienceCertificate = "Experience certificate is required";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      // Removed global error message as requested
      
      // Focus first error or scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setFormErrors({});

    try {
      setIsSubmitting(true);
      setError(null);
      setSubmissionState('🛡️ Initializing Fast-Sync...');

      let uid = '';
      if (currentUser?.uid) {
        uid = currentUser.uid;
      } else if (existingTutorData?.id) {
        uid = existingTutorData.id;
      } else {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          uid = userCredential.user.uid;
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            // AUTO-REPAIR: User exists in Auth but maybe missing from Firestore
            // Try to sign in and proceed with backend sync to "repair" the database record
            try {
              const signinCred = await signInWithEmailAndPassword(auth, formData.email, formData.password);
              uid = signinCred.user.uid;
              setSubmissionState('🔄 Syncing existing account...');
            } catch (loginErr: any) {
              // If sign-in also fails (e.g. wrong password), show the original error
              throw authErr;
            }
          } else {
            throw authErr;
          }
        }
      }

      setSubmissionState('📤 Finalizing Registration...');
      const registerData = new FormData();
      registerData.append('tutorId', uid);
      registerData.append('name', formData.name);
      registerData.append('email', formData.email);
      registerData.append('phone', formData.phone);
      registerData.append('qualification', formData.qualification);
      registerData.append('experience', formData.experience);
      registerData.append('targetClasses', formData.targetClasses);
      if (formData.location) registerData.append('location', JSON.stringify(formData.location));

      // Compatibility: Append both possible field names for certificates
      if (files.profileImage) registerData.append('profileImage', files.profileImage);
      if (files.identityProof) registerData.append('idProof', files.identityProof);
      if (files.degreeCertificate) {
        registerData.append('qualificationDocs', files.degreeCertificate);
        registerData.append('degreeCertificate', files.degreeCertificate);
      }
      if (files.experienceCertificate) {
        registerData.append('experienceDocs', files.experienceCertificate);
        registerData.append('experienceCertificate', files.experienceCertificate);
      }
      if (files.demoVideo) registerData.append('demoVideo', files.demoVideo);

      // DIRECT FIRESTORE WRITE (Frontend): Ensure the document exists even if backend has rules/sync lag
      const directTutorData = {
        uid: uid,
        name: formData.name,
        email: formData.email.toLowerCase(),
        phone: formData.phone,
        qualification: formData.qualification,
        experience: formData.experience,
        targetClasses: formData.targetClasses,
        status: 'pending',
        role: 'tutor',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      try {
        await setDoc(doc(db, 'users', uid), directTutorData, { merge: true });
        console.log("✅ Frontend Firestore Write Success");
        
        // DIRECT NOTIFICATION: Ensure admin gets an alert even if backend sync is slow
        await addDoc(collection(db, 'admin_notifications'), {
          type: 'Registration',
          tutorId: uid,
          title: 'New Tutor Registration',
          message: `${formData.name || formData.email} has registered and is awaiting verification.`,
          time: serverTimestamp(),
          read: false
        });
        console.log("✅ Frontend Admin Notification Sent");
      } catch (fsErr) {
        console.error("❌ Frontend Firestore/Notification Write Failed:", fsErr);
        // We continue anyway as the backend might still work
      }

      const hostname = window.location.hostname;
      const response = await fetch(`http://${hostname}:5001/api/register-tutor`, {
        method: 'POST',
        body: registerData
      });
      
      const responseData = await response.json().catch(() => ({}));
      console.log("Registration API Response:", responseData);

      if (!response.ok) {
        throw new Error(responseData.message || "Database synchronization failed. Please try again.");
      }

      setIsSuccess(true);
      setIsSubmitting(false);
      setTimeout(() => onComplete(), 2000);

    } catch (err: any) {
      setError(mapAuthError(err.code) || err.message);
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
              <h2 className="text-2xl font-black text-on-surface tracking-tight mb-2">{(currentUser?.status === 'rejected' || isDirectReapply) ? 'Profile Correction' : 'Tutor Registration'}</h2>
              <p className="text-base text-on-surface-variant font-bold opacity-60">Join our specialized teaching network.</p>
            </div>

            {isCompletingProfile && !existingTutorData && !isCheckingEmail && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-8 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                <AlertCircle className="text-amber-500 shrink-0" size={20} />
                <p className="text-amber-800 text-[11px] font-bold leading-relaxed">
                  Welcome back! It looks like your profile registration isn't complete yet. Please fill in the details below to finish setting up your tutor account.
                </p>
              </div>
            )}

            <AnimatePresence>
              {activeNotice && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-primary/10 border border-primary/20 p-5 rounded-3xl flex items-start gap-4 mb-8"
                >
                  <ShieldCheck className="text-primary mt-1" size={24} />
                  <div>
                    <p className="text-sm font-black text-primary uppercase tracking-tight">System Notice</p>
                    <p className="text-xs text-primary/70 font-bold mt-1 leading-relaxed">
                      {activeNotice}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-8" autoComplete="off">
              {!isSuccess ? (
                <div className="space-y-8">
                  <div className={cn("flex flex-col items-center mb-10 p-6 bg-slate-50 rounded-4xl border-2 border-dashed transition-all relative group cursor-pointer", submitted && formErrors.profileImage ? "border-rose-300" : "border-slate-200 hover:border-primary")}>
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 border-2 border-white overflow-hidden relative">
                      {files.profileImage ? ( <img src={URL.createObjectURL(files.profileImage)} className="w-full h-full object-cover" alt="Profile" /> ) : ( <User className="w-8 h-8 text-slate-200" /> )}
                    </div>
                    <label className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-1">Tutor Profile Image <span className="text-rose-500">*</span></label>
                    <input type="file" accept="image/jpeg, image/png" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'profileImage')} />
                    {files.profileImage ? ( 
                      <div className="mt-3 flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full"> <Check size={10} className="text-green-600" /> <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">Image Ready</span> </div> 
                    ) : (
                      submitted && formErrors.profileImage && <p className="text-[9px] text-rose-500 font-bold mt-2">{formErrors.profileImage}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="label-caps ml-2">Full Name <span className="text-rose-500">*</span></label>
                      <input name="profile-name-field" type="text" placeholder="Sarah Wilson" className={cn("input-field", submitted && formErrors.name && "border-rose-300")} value={formData.name} onChange={handleInputChange} autoComplete="off" required />
                      {submitted && formErrors.name && <p className="text-[10px] text-rose-500 font-bold ml-2">{formErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                       <label className="label-caps ml-2 flex items-center justify-between">Email Address <span className="text-rose-500">*</span> {isCheckingEmail && <Clock className="w-3 h-3 animate-spin text-primary" />}</label>
                       <input type="email" name="user-identifier-field" value={formData.email} onChange={handleInputChange} onBlur={(e) => { if (isDirectReapply || isCompletingProfile) checkEmailForAutofill(e.target.value, formData.name); }} placeholder="tutor@example.com" className={cn("input-field", existingTutorData && "opacity-70", submitted && formErrors.email && "border-rose-300")} disabled={isCompletingProfile || !!existingTutorData} autoComplete="off" required />
                       {submitted && formErrors.email && <p className="text-[10px] text-rose-500 font-bold ml-2">{formErrors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps ml-2">Mobile Number <span className="text-rose-500">*</span></label>
                      <input name="user-phone-field" type="tel" className={cn("input-field", submitted && formErrors.phone && "border-rose-300")} value={formData.phone} onChange={handleInputChange} autoComplete="off" required />
                      {submitted && formErrors.phone && <p className="text-[10px] text-rose-500 font-bold ml-2">{formErrors.phone}</p>}
                    </div>
                    {!existingTutorData && (
                      <div className="space-y-2">
                        <label className="label-caps ml-2">Password</label>
                        <div className="relative">
                          <input 
                            name="new-password" 
                            type={showPassword ? "text" : "password"} 
                            className={cn("input-field pr-12", submitted && formErrors.password && "border-rose-300")} 
                            value={formData.password} 
                            onChange={handleInputChange}
                            autoComplete="new-password"
                            required 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                          >
                            {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                          </button>
                        </div>
                        {submitted && formErrors.password && <p className="text-[10px] text-rose-500 font-bold ml-2">{formErrors.password}</p>}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="label-caps ml-2">Highest Qualification <span className="text-rose-500">*</span></label>
                      <input name="qualification-field" type="text" placeholder="e.g. B-Tech, M-Tech, PhD, Degree etc." className={cn("input-field", submitted && formErrors.qualification && "border-rose-300")} value={formData.qualification} onChange={handleInputChange} autoComplete="off" required />
                      {submitted && formErrors.qualification && <p className="text-[10px] text-rose-500 font-bold ml-2">{formErrors.qualification}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps ml-2">Experience <span className="text-rose-500">*</span></label>
                      <select name="experience" className="input-field" value={formData.experience} onChange={handleInputChange} required>
                        <option value="Fresher">Fresher</option>
                        <option value="1-3 Years">1-3 Years</option>
                        <option value="3-5 Years">3-5 Years</option>
                        <option value="5+ Years">5+ Years</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="label-caps ml-2">Which classes can you teach? <span className="text-rose-500">*</span></label>
                      <select name="targetClasses" className={cn("input-field", submitted && formErrors.targetClasses && "border-rose-300")} value={formData.targetClasses} onChange={handleInputChange} required>
                        <option value="">Select Level</option>
                         <option value="Nursery to UKG">Nursery to UKG</option>
                         <option value="Primary (1-5)">Primary (1-5)</option>
                         <option value="Middle School (6-10)">Middle School (6-10)</option>
                         <option value="Intermediate (11-12)">Intermediate (11-12)</option>
                         <option value="Graduate (B-Tech, Degree, M-Tech)">Graduate (B-Tech, Degree, M-Tech)</option>
                      </select>
                      {submitted && formErrors.targetClasses && <p className="text-[10px] text-rose-500 font-bold ml-2">{formErrors.targetClasses}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {['identityProof', 'experienceCertificate', 'degreeCertificate'].map((field) => {
                      const isMandatory = field !== 'experienceCertificate' || formData.experience !== 'Fresher';
                      return (
                        <div key={field} className="space-y-1">
                          <div className={cn("bg-white border-2 border-slate-100 border-dashed p-4 rounded-3xl flex flex-col items-center justify-center text-center relative hover:border-primary h-[160px]", files[field as keyof typeof files] ? "border-green-500" : (submitted && formErrors[field] ? "border-rose-300" : "border-slate-200"))}>
                            <p className="font-black text-[10px] uppercase tracking-widest">
                              {field === 'identityProof' ? 'ID Proof' : field === 'experienceCertificate' ? 'Experience' : 'Degree'} 
                              {isMandatory && <span className="text-rose-500"> *</span>}
                            </p>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, field as any)} />
                            {files[field as keyof typeof files] && <CheckCircle size={20} className="text-green-500 mt-2" />}
                          </div>
                          {submitted && formErrors[field] && <p className="text-[9px] text-rose-500 font-bold text-center">{formErrors[field]}</p>}
                        </div>
                      );
                    })}
                    
                    <div id="demo-video-section" className="space-y-1">
                      <div className={cn("bg-white border-2 border-slate-100 p-2 rounded-3xl flex flex-col relative h-[160px]", files.demoVideo ? "border-green-500" : (submitted && formErrors.demoVideo ? "border-rose-300" : "border-slate-100"))}>
                        <div className="flex-1 rounded-2xl bg-slate-50 flex flex-col items-center justify-center p-4">
                          <Video className="w-5 h-5 text-slate-500 mb-1" />
                           <h5 className="text-[11px] font-black">{files.demoVideo ? 'Demo Captured' : 'Teaching Demo'} <span className="text-rose-500">*</span></h5>
                           <button type="button" onClick={openCameraPreview} className="mt-2 text-[9px] font-black bg-rose-600 text-white px-4 py-2 rounded-xl uppercase">
                             {files.demoVideo ? 'Re-record' : 'Start'}
                           </button>
                        </div>
                      </div>
                      {submitted && formErrors.demoVideo && <p className="text-[9px] text-rose-500 font-bold text-center">{formErrors.demoVideo}</p>}
                    </div>
                  </div>

                  {error && <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-600 text-sm font-bold text-center">{error}</div>}

                  <div className="pt-8">
                    <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white text-lg py-5 rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:shadow-primary/40 transition-all">
                      {isSubmitting ? 'Processing...' : 'Complete Registration'}
                    </button>
                    <p className="text-center mt-6 text-sm font-bold text-slate-500">Already have an account? <button type="button" onClick={onSwitchToLogin} className="text-primary hover:underline cursor-pointer">Sign In</button></p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
                   <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-xl"> <Check className="text-white w-10 h-10" /> </div>
                   <h2 className="text-3xl font-black text-slate-800">Application Submitted!</h2>
                   <p className="text-slate-500 font-bold text-center max-w-sm">Your profile has been received and is now under review by our administration. Redirecting to your status dashboard...</p>
                </div>
              )}
            </form>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {(isPreviewing || isRecording) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100001] bg-black flex flex-col">
            <video ref={videoPreviewRef} src={files.demoVideo ? URL.createObjectURL(files.demoVideo) : undefined} autoPlay={!files.demoVideo} muted={!files.demoVideo} controls={!!files.demoVideo} className="w-full h-full object-cover" />
            {isRecording && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-rose-500 text-white px-3 py-1 rounded-full text-[10px] font-black animate-pulse uppercase tracking-widest z-10 shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full" />
                Recording Live
              </div>
            )}
            
            <AnimatePresence>
              {recordingWarning && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 z-[20] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm rounded-[2rem]"
                >
                  <div className="bg-white p-6 rounded-[1.5rem] shadow-2xl text-center max-w-xs border-2 border-rose-100">
                    <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                    <p className="text-xs font-black text-slate-800 leading-relaxed uppercase tracking-tight">
                      {recordingWarning}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isRecording && (
              <div className="absolute top-10 left-1/2 -translate-x-1/2 px-6 py-2 bg-rose-600 rounded-full flex items-center gap-3">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                <span className="text-white font-black">{Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
              </div>
            )}
            <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-5 px-8 max-w-2xl mx-auto">
              {!isRecording && !files.demoVideo && (
                <>
                  <button type="button" onClick={() => { setIsPreviewing(false); setStream(null); }} className="flex-1 bg-white/10 text-white font-black py-4 rounded-3xl">Close</button>
                  <button type="button" onClick={startRecording} className="flex-[2] bg-rose-600 text-white font-black py-4 rounded-3xl">Start Recording</button>
                </>
              )}
              {isRecording && (
                <button type="button" onClick={stopRecording} className="w-full bg-rose-600 text-white font-black py-4 rounded-3xl border-4 border-white/20">Stop Recording</button>
              )}
              {files.demoVideo && !isRecording && (
                <>
                  <button type="button" onClick={handleResetRecording} className="flex-1 bg-white/10 text-white font-black py-4 rounded-3xl">Re-record</button>
                  <button type="button" onClick={() => setIsPreviewing(false)} className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-3xl">Done & Submit</button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Registration;
