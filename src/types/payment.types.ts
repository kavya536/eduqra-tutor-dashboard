export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: 'created' | 'paid' | 'attempted';
}

export interface PaymentDetails {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface Transaction {
  id: string;
  bookingId: string;
  amount: number;
  status: 'success' | 'failed' | 'pending';
  method: string;
  createdAt: any;
}
