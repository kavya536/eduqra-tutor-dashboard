import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDwXgG11d-FJc1IkRLs9_H7tR6NBIKXDbw",
  authDomain: "tutor-website-c532a.firebaseapp.com",
  projectId: "tutor-website-c532a",
  storageBucket: "tutor-website-c532a.firebasestorage.app",
  messagingSenderId: "925264880105",
  appId: "1:925264880105:web:59a1d97951995179466b78",
  measurementId: "G-1RDPS9RQ76"
};

const app = initializeApp(firebaseConfig);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Connectivity Test
if (typeof window !== "undefined") {
  console.log("🔥 Firebase Initializing for project:", firebaseConfig.projectId);
  try {
    const authStatus = auth ? "Auth OK" : "Auth Failed";
    const dbStatus = db ? "Firestore OK" : "Firestore Failed";
    console.log(`✅ Eduqra Database Handshake: ${authStatus}, ${dbStatus}`);
  } catch (err) {
    console.error("❌ Firebase Connection Error:", err);
  }
}

export { app, analytics, auth, db, storage };
