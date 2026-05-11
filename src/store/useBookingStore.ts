import { create } from 'zustand';
import { Booking, AvailabilitySlot } from '../types';

interface BookingState {
  bookings: Booking[];
  manualSlots: AvailabilitySlot[];
  openRescheduleFor: string | number | null;
  setBookings: (bookings: Booking[] | ((prev: Booking[]) => Booking[])) => void;
  setManualSlots: (slots: AvailabilitySlot[] | ((prev: AvailabilitySlot[]) => AvailabilitySlot[])) => void;
  setOpenRescheduleFor: (id: string | number | null) => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  bookings: [],
  manualSlots: [],
  openRescheduleFor: null,
  setBookings: (bookings) => set((state) => ({ 
    bookings: typeof bookings === 'function' ? bookings(state.bookings) : bookings 
  })),
  setManualSlots: (manualSlots) => set((state) => ({ 
    manualSlots: typeof manualSlots === 'function' ? manualSlots(state.manualSlots) : manualSlots 
  })),
  setOpenRescheduleFor: (openRescheduleFor) => set({ openRescheduleFor }),
}));
