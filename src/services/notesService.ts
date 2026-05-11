import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { notificationService } from './notificationService';

export const notesService = {
  /**
   * Subscribe to real-time notes for a tutor
   */
  subscribeToNotes(tutorId: string, callback: (notes: any[]) => void) {
    const q = query(collection(db, 'notes'), where('tutorId', '==', tutorId));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      callback(list);
    }, (err) => console.error("Notes Sync Error:", err));
  },

  /**
   * Add a new note and notify students
   */
  async addNote(tutorId: string, tutorName: string, noteData: any) {
    const docRef = await addDoc(collection(db, 'notes'), {
      tutorId,
      tutorName,
      ...noteData,
      createdAt: serverTimestamp()
    });

    // Notify students in the targeted class
    if (noteData.class) {
      const studentsQuery = query(collection(db, 'students'), where('class', '==', noteData.class));
      const studentsSnap = await getDocs(studentsQuery);
      
      const notificationPromises = studentsSnap.docs.map(studentDoc => {
        const studentData = studentDoc.data();
        if (studentData.email) {
          return notificationService.notifyNewNote(studentData.email, tutorName, noteData.subject);
        }
        return Promise.resolve();
      });
      
      await Promise.all(notificationPromises);
    }

    return docRef;
  },

  /**
   * Delete a note
   */
  async deleteNote(noteId: string) {
    return deleteDoc(doc(db, 'notes', noteId));
  }
};
