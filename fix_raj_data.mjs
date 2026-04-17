import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

// Using project's actual config structure
const firebaseConfig = {
    projectId: "eduqra-tutor-95e2d",
};

const app = initializeApp({
    projectId: "eduqra-tutor-95e2d",
});
const db = getFirestore(app);

async function repairData() {
    console.log("🔍 Starting Data Repair for Tutors...");
    const snap = await getDocs(collection(db, "users"));
    
    for (const d of snap.docs) {
        const data = d.data();
        if (data.role === 'tutor' || (data.name && data.name.toLowerCase().includes('raj'))) {
            console.log(`🛠️ Repairing record for: ${data.name || d.id}`);
            
            const updates = {};
            const docs = data.documents || {};
            
            // Flatten files to root for Admin App visibility
            if (docs.identityProof) { updates.identityProof = docs.identityProof; updates.identityURL = docs.identityProof; }
            if (docs.degreeCertificate) { updates.degreeCertificate = docs.degreeCertificate; updates.degreeURL = docs.degreeCertificate; }
            if (docs.experienceCertificate) { updates.experienceCertificate = docs.experienceCertificate; updates.certURL = docs.experienceCertificate; }
            if (docs.demoVideo) { updates.demoVideo = docs.demoVideo; updates.videoURL = docs.demoVideo; }
            if (docs.profileImage) { updates.avatar = docs.profileImage; }
            
            if (Object.keys(updates).length > 0) {
                await updateDoc(doc(db, "users", d.id), updates);
                console.log("✅ Fixed URLs.");
            } else {
                console.log("⚠️ No documents found to repair in nested object.");
            }
        }
    }
    console.log("🏁 Repair Complete.");
}

repairData().catch(console.error);
