import { collection } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Firestore Collection References
 * These serve as our "Tables"
 */

// Students Table
export const studentsCollection = collection(db, 'students');

// Tutors Table
export const tutorsCollection = collection(db, 'tutors');

/**
 * Field Rules Summary:
 * 
 * STUDENT UI:
 * - name: Mandatory
 * - email: Unique & Mandatory
 * - phone: Unique & Mandatory
 * - password: Mandatory
 * - class: Mandatory
 * - board: Mandatory
 * 
 * TUTOR UI:
 * - name: Mandatory
 * - email: Unique & Mandatory
 * - phone: Unique & Mandatory
 * - password: Mandatory
 * - qualification: Mandatory
 * - experience: Mandatory
 * - identityProof: Mandatory
 * - certificate: Mandatory if experience >= 1
 */
