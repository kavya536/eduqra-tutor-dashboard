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
    targetClasses: currentUser?.targetClasses || '',
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
        targetClasses: currentUser.targetClasses || '',
        avatar: '',
        identityProof: '',
        degreeCertificate: '',
        experienceCertificate: '',
        demoVideo: ''
      }));
      if (currentUser.status === 'rejected') {
        setExistingTutorData(currentUser);
      }
    }

  }, [currentUser, initialEmail]);

  useEffect(() => {
    const timer = setTimeout(() => {
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

  const checkEmailForAutofill = async (email: string) => {
    if (!email || email.length < 5 || !email.includes('@') || isCompletingProfile) return;
    
    setIsCheckingEmail(true);
    setError(null);
    
    try {
      const qUsers = query(collection(db, 'users'), where("email", "==", email.toLowerCase()));
      const qTutors = query(collection(db, 'tutors'), where("email", "==", email.toLowerCase()));
      
      const [snapUsers, snapTutors] = await Promise.all([getDocs(qUsers), getDocs(qTutors)]);
      const snap = !snapUsers.empty ? snapUsers : snapTutors;
      
      if (!snap.empty) {
        const docCount = snap.docs[0];
        const data = docCount.data();
        setExistingTutorData({ ...data, id: docCount.id });
        setFormData(prev => ({
          ...prev,
          name: data.name || '',
          phone: data.phone || '',
          qualification: data.qualification || '',
          experience: data.experience || 'Fresher',
          targetClasses: data.targetClasses || '',
          avatar: '',
          identityProof: '',
          degreeCertificate: '',
          experienceCertificate: '',
          demoVideo: ''
        }));
        
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
        setError("🔒 Secure Connection Required: Camera access is only available over HTTPS or Localhost.");
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
    if (!formData.name || !formData.email || !formData.phone || (!formData.password && !existingTutorData)) {
      setError("Please complete all mandatory fields.");
      return;
    }

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
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        uid = userCredential.user.uid;
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

      if (files.profileImage) registerData.append('profileImage', files.profileImage);
      if (files.identityProof) registerData.append('idProof', files.identityProof);
      if (files.degreeCertificate) registerData.append('qualificationDocs', files.degreeCertificate);
      if (files.experienceCertificate) registerData.append('experienceDocs', files.experienceCertificate);
      if (files.demoVideo) registerData.append('demoVideo', files.demoVideo);

      const response = await fetch('http://localhost:5001/api/register-tutor', {
        method: 'POST',
        body: registerData
      });

      if (!response.ok) throw new Error("Sync Failed.");

      setIsSuccess(true);
      setIsSubmitting(false);
      setTimeout(() => onComplete(), 2000);

    } catch (err: any) {
      setError(err.message);
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

            <form onSubmit={handleSubmit} className="space-y-8" autoComplete="off">
              {!isSuccess ? (
                <div className="space-y-8">
                  <div className="flex flex-col items-center mb-10 p-6 bg-slate-50 rounded-4xl border-2 border-dashed border-slate-200 hover:border-primary transition-all relative group cursor-pointer">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 border-2 border-white overflow-hidden relative">
                      {files.profileImage ? ( <img src={URL.createObjectURL(files.profileImage)} className="w-full h-full object-cover" alt="Profile" /> ) : ( <User className="w-8 h-8 text-slate-200" /> )}
                    </div>
                    <label className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-1">Tutor Profile Image</label>
                    <input type="file" accept="image/jpeg, image/png" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'profileImage')} />
                    {files.profileImage && ( <div className="mt-3 flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full"> <Check size={10} className="text-green-600" /> <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">Image Ready</span> </div> )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="label-caps ml-2">Full Name</label>
                      <input name="profile-name-field" type="text" placeholder="Sarah Wilson" className={cn("input-field", submitted && formErrors.name && "border-rose-300")} value={formData.name} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                       <label className="label-caps ml-2 flex items-center justify-between">Email Address {isCheckingEmail && <Clock className="w-3 h-3 animate-spin text-primary" />}</label>
                       <input type="email" name="user-identifier-field" value={formData.email} onChange={handleInputChange} onBlur={(e) => checkEmailForAutofill(e.target.value)} placeholder="tutor@example.com" className={cn("input-field", existingTutorData && "opacity-70")} disabled={isCompletingProfile || !!existingTutorData} required />
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps ml-2">Mobile Number</label>
                      <input name="user-phone-field" type="tel" className="input-field" value={formData.phone} onChange={handleInputChange} required />
                    </div>
                    {!existingTutorData && (
                      <div className="space-y-2">
                        <label className="label-caps ml-2">Password</label>
                        <input name="new-password" type="password" className="input-field" value={formData.password} onChange={handleInputChange} required />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="label-caps ml-2">Highest Qualification</label>
                      <input name="qualification-field" type="text" className="input-field" value={formData.qualification} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps ml-2">Experience</label>
                      <select name="experience" className="input-field" value={formData.experience} onChange={handleInputChange} required>
                        <option value="Fresher">Fresher</option>
                        <option value="1-3 Years">1-3 Years</option>
                        <option value="3-5 Years">3-5 Years</option>
                        <option value="5+ Years">5+ Years</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="label-caps ml-2">Which classes can you teach?</label>
                      <select name="targetClasses" className="input-field" value={formData.targetClasses} onChange={handleInputChange} required>
                        <option value="">Select Level</option>
                         <option value="Nursery to UKG">Nursery to UKG</option>
                         <option value="Primary (1-5)">Primary (1-5)</option>
                         <option value="Middle School (6-10)">Middle School (6-10)</option>
                         <option value="Intermediate (11-12)">Intermediate (11-12)</option>
                         <option value="Graduate (B-Tech, Degree, M-Tech)">Graduate (B-Tech, Degree, M-Tech)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {['identityProof', 'experienceCertificate', 'degreeCertificate'].map((field) => (
                      <div key={field} className={cn("bg-white border-2 border-slate-100 border-dashed p-4 rounded-3xl flex flex-col items-center justify-center text-center relative hover:border-primary h-[160px]", files[field as keyof typeof files] ? "border-green-500" : "border-slate-200")}>
                        <p className="font-black text-[10px] uppercase tracking-widest">{field === 'identityProof' ? 'ID Proof' : field === 'experienceCertificate' ? 'Experience' : 'Degree'}</p>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, field as any)} />
                        {files[field as keyof typeof files] && <CheckCircle size={20} className="text-green-500 mt-2" />}
                      </div>
                    ))}
                    
                    <div id="demo-video-section" className={cn("bg-white border-2 border-slate-100 p-2 rounded-3xl flex flex-col relative h-[160px]", files.demoVideo ? "border-green-500" : "border-slate-100")}>
                      <div className="flex-1 rounded-2xl bg-slate-50 flex flex-col items-center justify-center p-4">
                        <Video className="w-5 h-5 text-slate-500 mb-1" />
                         <h5 className="text-[11px] font-black">{files.demoVideo ? 'Demo Captured' : 'Teaching Demo'}</h5>
                         <button type="button" onClick={openCameraPreview} className="mt-2 text-[9px] font-black bg-rose-600 text-white px-4 py-2 rounded-xl uppercase">
                           {files.demoVideo ? 'Re-record' : 'Start'}
                         </button>
                      </div>
                    </div>
                  </div>

                  {error && <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-600 text-sm font-bold text-center">{error}</div>}

                  <div className="pt-8">
                    <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white text-lg py-5 rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:shadow-primary/40 transition-all">
                      {isSubmitting ? 'Processing...' : 'Complete Registration'}
                    </button>
                    <p className="text-center mt-6 text-sm font-bold text-slate-500">Already have an account? <button type="button" onClick={onSwitchToLogin} className="text-primary hover:underline">Sign In</button></p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
                   <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-xl"> <Check className="text-white w-10 h-10" /> </div>
                   <h2 className="text-3xl font-black text-slate-800">Registration Confirmed!</h2>
                   <p className="text-slate-500 font-bold">Your profile is being synchronized. Redirecting shortly...</p>
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
