
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function inspectNotes() {
    console.log("Checking notes...");
    const snap = await getDocs(collection(db, "notes"));
    console.log(`Found ${snap.size} notes.`);
    snap.forEach(doc => {
        const data = doc.data();
        const length = data.fileData?.length || 0;
        const prefix = data.fileData?.substring(0, 50);
        console.log(`Note ID: ${doc.id}, Name: ${data.fileName}, Type: ${data.fileType}, Size: ${length}, Prefix: ${prefix}`);
    });
    process.exit(0);
}

inspectNotes().catch(err => { console.error(err); process.exit(1); });
