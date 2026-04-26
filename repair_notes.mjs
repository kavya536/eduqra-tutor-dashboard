
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

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

async function repairNotes() {
    console.log("Starting DB Cleanup...");
    const snap = await getDocs(collection(db, "notes"));
    let deletedCount = 0;
    
    for (const d of snap.docs) {
        const data = d.data();
        const length = data.fileData?.length || 0;
        if (length <= 30) {
            console.log(`🗑️ Deleting corrupted note: ${data.fileName} (ID: ${d.id})`);
            await deleteDoc(doc(db, "notes", d.id));
            deletedCount++;
        }
    }
    
    console.log(`Cleanup complete. Deleted ${deletedCount} corrupted records.`);
    process.exit(0);
}

repairNotes().catch(err => { console.error(err); process.exit(1); });
