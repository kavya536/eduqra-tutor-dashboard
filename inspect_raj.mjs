import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";

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
const db = getFirestore(app);

async function inspectRaj() {
    const snap = await getDocs(collection(db, "users"));
    for (const d of snap.docs) {
        const data = d.data();
        if ((data.name || '').toLowerCase().includes('raj')) {
            console.log("\n--- RAJ DATA INSPECTION ---");
            console.log(JSON.stringify(data, null, 2));
            console.log("---------------------------\n");
        }
    }
}

inspectRaj().catch(console.error);
