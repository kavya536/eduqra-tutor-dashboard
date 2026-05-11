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
  updateDoc,
  getDocs
} from 'firebase/firestore';
import { notificationService } from './notificationService';

export const pollService = {
  /**
   * Subscribe to real-time polls for a tutor
   */
  subscribeToPolls(tutorId: string, callback: (polls: any[]) => void) {
    const q = query(collection(db, 'polls'), where('tutorId', '==', tutorId));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      callback(list);
    });
  },

  /**
   * Create a new poll and notify students
   */
  async createPoll(tutorId: string, tutorName: string, pollData: any) {
    const docRef = await addDoc(collection(db, 'polls'), {
      tutorId,
      tutorName,
      ...pollData,
      createdAt: serverTimestamp()
    });

    // Notify students in the targeted class
    const targetClass = pollData.targetClass?.trim() || 'All';
    const sQuery = targetClass === 'All' 
      ? query(collection(db, 'students'))
      : query(collection(db, 'students'), where('class', '==', targetClass));
    
    const sSnap = await getDocs(sQuery);
    const notificationPromises = sSnap.docs.map(sDoc => {
      const sData = sDoc.data();
      if (sData.email) {
        return notificationService.notifyNewPoll(sData.email, tutorName);
      }
      return Promise.resolve();
    });

    await Promise.all(notificationPromises);
    return docRef;
  },

  /**
   * Vote on a poll
   */
  async vote(pollId: string, voterId: string, optionIdx: number, poll: any) {
    const newOptions = [...poll.options.map((o: any) => ({ ...o, votes: [...o.votes] }))];
    const isAlreadyVoted = newOptions[optionIdx].votes.includes(voterId);
    const userSelections = newOptions.filter(o => o.votes.includes(voterId)).length;

    if (poll.allowMultiple) {
      if (isAlreadyVoted) {
        if (userSelections <= 1) return; 
        newOptions[optionIdx].votes = newOptions[optionIdx].votes.filter((id: string) => id !== voterId);
      } else {
        newOptions[optionIdx].votes.push(voterId);
      }
    } else {
      if (isAlreadyVoted) return; 
      newOptions.forEach(opt => {
        opt.votes = opt.votes.filter((id: string) => id !== voterId);
      });
      newOptions[optionIdx].votes.push(voterId);
    }

    return updateDoc(doc(db, 'polls', pollId), { options: newOptions });
  },

  /**
   * Delete a poll
   */
  async deletePoll(pollId: string) {
    return deleteDoc(doc(db, 'polls', pollId));
  }
};
