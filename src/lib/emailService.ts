/**
 * Email service via EmailJS REST API.
 * No package install required — uses fetch directly.
 *
 * Setup (one-time, in EmailJS dashboard):
 *  1. Create two templates:
 *     - VITE_EMAILJS_TEMPLATE_PAYMENT  (payment notification)
 *     - VITE_EMAILJS_TEMPLATE_INVOICE  (booking invoice)
 *  2. Add template variables listed below.
 *  3. Paste Service ID, Public Key in .env.local.
 *
 * Payment template variables:
 *   {{to_name}}, {{to_email}}, {{booking_id}}, {{band_name}},
 *   {{session_type}}, {{booking_date}}, {{start_time}}, {{end_time}},
 *   {{amount}}, {{gcash_number}}, {{gcash_name}}, {{qr_code_url}}
 *
 * Invoice template variables:
 *   {{to_name}}, {{to_email}}, {{booking_id}}, {{band_name}},
 *   {{session_type}}, {{booking_date}}, {{start_time}}, {{end_time}}, {{amount}}
 */

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  as string | undefined
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  as string | undefined
const TMPL_PAYMENT = import.meta.env.VITE_EMAILJS_TEMPLATE_PAYMENT as string | undefined
const TMPL_INVOICE = import.meta.env.VITE_EMAILJS_TEMPLATE_INVOICE as string | undefined

async function send(templateId: string, params: Record<string, string>): Promise<boolean> {
  if (!SERVICE_ID || !PUBLIC_KEY || !templateId) {
    console.warn('[emailService] Not configured — skipping email send.')
    return false
  }
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:      SERVICE_ID,
        template_id:     templateId,
        user_id:         PUBLIC_KEY,
        template_params: params,
      }),
    })
    return res.ok
  } catch (err) {
    console.error('[emailService] fetch error:', err)
    return false
  }
}

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
  return send(TMPL_PAYMENT ?? '', {
    to_name:       p.toName,
    to_email:      p.toEmail,
    booking_id:    String(p.bookingId),
    band_name:     p.bandName,
    session_type:  p.sessionType,
    booking_date:  p.bookingDate,
    start_time:    p.startTime,
    end_time:      p.endTime,
    amount:        `₱${p.amount.toLocaleString()}`,
    gcash_number:  p.gcashNumber,
    gcash_name:    p.gcashName,
    qr_code_url:   p.qrCodeUrl,
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
  return send(TMPL_INVOICE ?? '', {
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
