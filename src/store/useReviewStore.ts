import { create } from 'zustand';
import { Review } from '../types';

interface ReviewState {
  reviews: Review[];
  setReviews: (reviews: Review[]) => void;
}

export const useReviewStore = create<ReviewState>((set) => ({
  reviews: [],
  setReviews: (reviews) => set({ reviews }),
}));
