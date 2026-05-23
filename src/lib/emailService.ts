/**
 * Email service — sends via the `send-email` Supabase Edge Function,
 * which uses Google SMTP (nodemailer) server-side.
 *
 * SMTP secrets live in Supabase (not in the frontend bundle):
 *   supabase secrets set SMTP_USER=you@gmail.com SMTP_PASS=<app-password> SMTP_FROM="Kâjon Music <you@gmail.com>"
 *
 * Gmail App Password (not your regular password):
 *   Google Account → Security → 2-Step Verification → App passwords
 */

import { supabase } from './supabase'

// ── Payload types ──────────────────────────────────────────────────────────────

type EmailType = 'payment_notification' | 'invoice'

interface EmailPayload {
  type:         EmailType
  to_name:      string
  to_email:     string
  booking_id:   string
  band_name:    string
  session_type: string
  booking_date: string
  start_time:   string
  end_time:     string
  amount:       string
  gcash_number?: string
  gcash_name?:   string
  qr_code_url?:  string
}

// ── Core send ──────────────────────────────────────────────────────────────────

async function send(payload: EmailPayload): Promise<boolean> {
  const { error } = await supabase.functions.invoke('send-email', { body: payload })
  if (error) {
    console.error('[emailService] Edge function error:', error.message)
    return false
  }
  return true
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface PaymentNotificationParams {
  toName:       string
  toEmail:      string
  bookingId:    number
  bandName:     string
  sessionType:  string
  bookingDate:  string
  startTime:    string
  endTime:      string
  amount:       number
  gcashNumber:  string
  gcashName:    string
  qrCodeUrl:    string
}

export async function sendPaymentNotification(p: PaymentNotificationParams): Promise<boolean> {
  return send({
    type:         'payment_notification',
    to_name:      p.toName,
    to_email:     p.toEmail,
    booking_id:   String(p.bookingId),
    band_name:    p.bandName,
    session_type: p.sessionType,
    booking_date: p.bookingDate,
    start_time:   p.startTime,
    end_time:     p.endTime,
    amount:       `₱${p.amount.toLocaleString()}`,
    gcash_number: p.gcashNumber,
    gcash_name:   p.gcashName,
    qr_code_url:  p.qrCodeUrl,
  })
}

export interface InvoiceParams {
  toName:      string
  toEmail:     string
  bookingId:   number
  bandName:    string
  sessionType: string
  bookingDate: string
  startTime:   string
  endTime:     string
  amount:      number
}

export async function sendInvoiceEmail(p: InvoiceParams): Promise<boolean> {
  return send({
    type:         'invoice',
    to_name:      p.toName,
    to_email:     p.toEmail,
    booking_id:   String(p.bookingId),
    band_name:    p.bandName,
    session_type: p.sessionType,
    booking_date: p.bookingDate,
    start_time:   p.startTime,
    end_time:     p.endTime,
    amount:       `₱${p.amount.toLocaleString()}`,
  })
}
