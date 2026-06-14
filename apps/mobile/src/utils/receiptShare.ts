import { Alert, Share } from 'react-native';
import {
  buildReceiptFromBooking,
  fetchVisitPayment,
  formatReceiptContent,
} from '@nail-couture/shared/utils/customerStats.js';

type ReceiptBooking = Parameters<typeof buildReceiptFromBooking>[0];

export async function shareVisitReceipt(booking: ReceiptBooking) {
  let payment = null;
  try {
    payment = await fetchVisitPayment(booking.id);
  } catch (paymentErr) {
    console.warn('Payment lookup failed, generating receipt without payment details:', paymentErr);
  }

  const receipt = buildReceiptFromBooking(booking, payment);
  const content = formatReceiptContent(receipt);
  if (!content.trim()) {
    throw new Error('Receipt content is empty');
  }

  await Share.share({
    message: content,
    title: 'Nail Couture Receipt',
  });
}

export async function shareVisitReceiptWithAlert(booking: ReceiptBooking) {
  try {
    await shareVisitReceipt(booking);
  } catch (err) {
    console.error('Receipt share error:', err);
    Alert.alert('Receipt unavailable', 'Unable to prepare receipt. Please try again.');
  }
}
