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

export const projectService = {
  /**
   * Subscribe to real-time projects for a tutor
   */
  subscribeToProjects(tutorId: string, callback: (projects: any[]) => void) {
    const q = query(collection(db, 'projects'), where('tutorId', '==', tutorId));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      callback(list);
    }, (err) => console.error("Projects Sync Error:", err));
  },

  /**
   * Add a new project and notify students
   */
  async addProject(tutorId: string, tutorName: string, projectData: any) {
    const docRef = await addDoc(collection(db, 'projects'), {
      tutorId,
      tutorName,
      ...projectData,
      createdAt: serverTimestamp()
    });

    // Notify students in the targeted class
    if (projectData.class) {
      const studentsQuery = query(collection(db, 'students'), 
        where('class', '==', projectData.class),
        where('subscription.tier', '==', 'premium') // Only notify premium students for projects
      );
      const studentsSnap = await getDocs(studentsQuery);
      
      const notificationPromises = studentsSnap.docs.map(studentDoc => {
        const studentData = studentDoc.data();
        if (studentData.email) {
          // Reusing note notification service for now or can add notifyNewProject
          return notificationService.notifyNewNote(studentData.email, tutorName, `Project: ${projectData.subject}`);
        }
        return Promise.resolve();
      });
      
      await Promise.all(notificationPromises);
    }

    return docRef;
  },

  /**
   * Delete a project
   */
  async deleteProject(projectId: string) {
    return deleteDoc(doc(db, 'projects', projectId));
  }
};
