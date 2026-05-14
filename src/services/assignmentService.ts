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

export const assignmentService = {
  /**
   * Subscribe to real-time assignments for a tutor
   */
  subscribeToAssignments(tutorId: string, callback: (assignments: any[]) => void) {
    const q = query(collection(db, 'assignments'), where('tutorId', '==', tutorId));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      callback(list);
    }, (err) => console.error("Assignments Sync Error:", err));
  },

  /**
   * Add a new assignment and notify students
   */
  async addAssignment(tutorId: string, tutorName: string, assignmentData: any) {
    const docRef = await addDoc(collection(db, 'assignments'), {
      tutorId,
      tutorName,
      ...assignmentData,
      createdAt: serverTimestamp()
    });

    // Notify students in the targeted class
    if (assignmentData.class) {
      const studentsQuery = query(collection(db, 'students'), where('class', '==', assignmentData.class));
      const studentsSnap = await getDocs(studentsQuery);
      
      const notificationPromises = studentsSnap.docs.map(studentDoc => {
        const studentData = studentDoc.data();
        if (studentData.email) {
          return notificationService.notifyNewAssignment(studentData.email, tutorName, assignmentData.subject);
        }
        return Promise.resolve();
      });
      
      await Promise.all(notificationPromises);
    }

    return docRef;
  },

  /**
   * Delete an assignment
   */
  async deleteAssignment(assignmentId: string) {
    return deleteDoc(doc(db, 'assignments', assignmentId));
  }
};
