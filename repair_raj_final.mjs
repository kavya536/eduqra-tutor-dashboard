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

async function findAndFixRaj() {
    console.log("🔍 Searching for Raj across all collections...");
    
    const collections = ['users', 'tutors', 'rejectedProfiles'];
    
    for (const colName of collections) {
        console.log(`\nChecking collection: ${colName}`);
        const snap = await getDocs(collection(db, colName));
        
        for (const d of snap.docs) {
            const data = d.data();
            const lowerName = (data.name || '').toLowerCase();
            const lowerEmail = (data.email || '').toLowerCase();
            
            if (lowerName.includes('raj') || lowerEmail.includes('raj')) {
                console.log(`🎯 FOUND MATCH: ${data.name} (${data.email}) in ${colName}`);
                console.log("Current structure:", JSON.stringify(data.documents || "No docs object", null, 2));
                
                const updates = {};
                const docs = data.documents || {};
                
                // FLATTEN everything for Admin Hub
                if (docs.identityProof) { updates.identityProof = docs.identityProof; updates.identityURL = docs.identityProof; }
                if (docs.degreeCertificate) { updates.degreeCertificate = docs.degreeCertificate; updates.degreeURL = docs.degreeCertificate; }
                if (docs.experienceCertificate) { updates.experienceCertificate = docs.experienceCertificate; updates.certURL = docs.experienceCertificate; }
                if (docs.demoVideo) { updates.demoVideo = docs.demoVideo; updates.videoURL = docs.demoVideo; }
                if (docs.profileImage) { updates.avatar = docs.profileImage; }

                // Even if not in documents, if they are in root, map them anyway to be safe
                if (data.identityURL && !data.identityProof) updates.identityProof = data.identityURL;
                if (data.degreeURL && !data.degreeCertificate) updates.degreeCertificate = data.degreeURL;
                if (data.videoURL && !data.demoVideo) updates.demoVideo = data.videoURL;
                
                if (Object.keys(updates).length > 0) {
                    await updateDoc(doc(db, colName, d.id), updates);
                    console.log("✅ Data Repaired and Flattened.");
                } else {
                    console.log("❌ No hidden document URLs found for this record.");
                }
            }
        }
    }
    console.log("\n🏁 Search & Repair Complete.");
}

findAndFixRaj().catch(err => {
    console.error("💥 SCRIPT FAILED:", err);
    process.exit(1);
});
