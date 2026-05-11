import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut, 
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  collection, 
  where, 
  getDocs 
} from 'firebase/firestore';

import { TutorProfile, AvailabilitySlot } from '../types';

export const authService = {
  /**
   * Subscribe to Firebase Auth state changes
   */
  subscribeToAuth(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Subscribe to Tutor Profile in Firestore
   */
  subscribeToProfile(uid: string, callback: (data: TutorProfile | null) => void) {
    const profileRef = doc(db, 'users', uid);
    return onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as TutorProfile);
      } else {
        callback(null);
      }
    });
  },

  /**
   * Create new user with email and password
   */
  async signUp(email: string, pass: string) {
    return createUserWithEmailAndPassword(auth, email, pass);
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, pass: string) {
    return signInWithEmailAndPassword(auth, email, pass);
  },

  /**
   * Sign out
   */
  async signOut() {
    return firebaseSignOut(auth);
  },

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string) {
    return firebaseSendPasswordResetEmail(auth, email.toLowerCase());
  },

  /**
   * Mark first login as completed
   */
  async markFirstLoginCompleted(uid: string) {
    const userRef = doc(db, 'users', uid);
    return updateDoc(userRef, { first_login_completed: true });
  },

  /**
   * Resend verification email via backend API
   */
  async resendVerification(uid: string, email: string, name: string) {
    const hostname = window.location.hostname;
    // Note: In production this should be a managed environment variable
    const response = await fetch(`http://${hostname}:5001/api/auth/send-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: uid,
        email: email,
        name: name,
        role: 'tutor'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Server error during verification resend');
    }
    
    return response.json();
  },

  /**
   * Legacy user migration bridge
   * Checks 'tutors' and 'rejectedProfiles' collections if 'users' doc is missing
   */
  async migrateLegacyUser(firebaseUser: User) {
    try {
      let legacyDoc = null;
      const tutorSnap = await getDoc(doc(db, 'tutors', firebaseUser.uid));
      const rejSnap = !tutorSnap.exists() ? await getDoc(doc(db, 'rejectedProfiles', firebaseUser.uid)) : null;
      
      if (tutorSnap.exists() || (rejSnap?.exists())) {
        legacyDoc = tutorSnap.exists() ? tutorSnap : rejSnap;
      } else {
        // Secondary check: By Email
        const qUsers = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
        const userLegacySnap = await getDocs(qUsers);
        
        if (!userLegacySnap.empty) {
           const userDoc = userLegacySnap.docs[0];
           const userData = userDoc.data();
           const migratedData = { 
             ...userData, 
             id: firebaseUser.uid,
             role: 'tutor' 
           };
           await setDoc(doc(db, 'users', firebaseUser.uid), migratedData, { merge: true });
           return migratedData;
        }
      }

      if (legacyDoc) {
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
        return migratedProfile;
      }
      
      return null;
    } catch (err) {
      console.error("Migration error:", err);
      throw err;
    }
  },

  /**
   * Update generic profile fields
   */
  async updateProfile(uid: string, data: Partial<TutorProfile>) {
    const userRef = doc(db, 'users', uid);
    return updateDoc(userRef, data as any); // Firebase updateDoc is loosely typed but we protect it here
  },

  /**
   * Update tutor availability slots
   */
  async updateAvailability(uid: string, slots: AvailabilitySlot[]) {
    const userRef = doc(db, 'users', uid);
    return updateDoc(userRef, { availability: slots });
  },

  /**
   * Update user password with re-authentication
   */
  async updatePasswordWithReauth(email: string, currentPass: string, newPass: string) {
    if (!auth.currentUser) throw new Error("No user authenticated");
    const credential = EmailAuthProvider.credential(email, currentPass);
    await reauthenticateWithCredential(auth.currentUser, credential);
    return firebaseUpdatePassword(auth.currentUser, newPass);
  }
};
