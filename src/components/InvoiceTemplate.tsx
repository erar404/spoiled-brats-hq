import { closeOutline, printOutline } from 'ionicons/icons'
import { IonButton, IonIcon } from '@ionic/react'
import { VENUE_ADDRESS, VENUE_EMAIL } from '../lib/venueInfo'
import './InvoiceTemplate.css'

export interface InvoiceLineItem {
  description: string
  subDescription?: string
  hours: number
  rate: number
  amount: number
}

export interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  terms?: string
  clientName: string
  clientEmail?: string
  items: InvoiceLineItem[]
}

interface Props {
  data: InvoiceData
  onClose?: () => void
}

export default function InvoiceTemplate({ data, onClose }: Props) {
  const subTotal = data.items.reduce((sum, i) => sum + i.amount, 0)
  const total    = subTotal
  const balance  = total

  const php = (n: number) =>
    `PHP${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const num = (n: number) =>
    n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="inv-wrapper">
      {/* Controls — hidden in print */}
      <div className="inv-controls no-print">
        {onClose && (
          <IonButton fill="clear" size="small" onClick={onClose}>
            <IonIcon slot="start" icon={closeOutline} />
            Close
          </IonButton>
        )}
        <IonButton size="small" color="dark" onClick={() => window.print()}>
          <IonIcon slot="start" icon={printOutline} />
          Print / Save PDF
        </IonButton>
      </div>

      {/* ── Printable document ── */}
      <div className="inv-doc" id="invoice-print-area">

        {/* Header row */}
        <div className="inv-header">
          <div className="inv-from">
            <img src="/studio-logo-transparent.png" alt="Kâjon Music" className="inv-logo" />
            <p className="inv-biz-name">Kâjon Music</p>
            <p className="inv-biz-line">{VENUE_ADDRESS}</p>
            <p className="inv-biz-line">Philippines</p>
            <p className="inv-biz-line">{VENUE_EMAIL}</p>
          </div>
          <div className="inv-title-col">
            <h1 className="inv-title">Invoice</h1>
            <p className="inv-number"># {data.invoiceNumber}</p>
            <div className="inv-balance-block">
              <p className="inv-balance-label">Balance Due</p>
              <p className="inv-balance-amount">{php(balance)}</p>
            </div>
          </div>
        </div>

        {/* Bill-to + dates */}
        <div className="inv-meta">
          <div className="inv-bill-to">
            <p className="inv-client-name">{data.clientName}</p>
            {data.clientEmail && <p className="inv-client-line">{data.clientEmail}</p>}
          </div>
          <div className="inv-dates">
            <div className="inv-date-row">
              <span className="inv-date-label">Invoice Date :</span>
              <span className="inv-date-val">{data.invoiceDate}</span>
            </div>
            <div className="inv-date-row">
              <span className="inv-date-label">Terms :</span>
              <span className="inv-date-val">{data.terms ?? 'Custom'}</span>
            </div>
            <div className="inv-date-row">
              <span className="inv-date-label">Due Date :</span>
              <span className="inv-date-val">{data.dueDate}</span>
            </div>
          </div>
        </div>

        {/* Line-items table */}
        <table className="inv-table">
          <thead>
            <tr>
              <th className="inv-th inv-col-num">#</th>
              <th className="inv-th inv-col-desc">Description</th>
              <th className="inv-th inv-col-r">Hours</th>
              <th className="inv-th inv-col-r">Rate</th>
              <th className="inv-th inv-col-r">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx} className="inv-tr">
                <td className="inv-td inv-td-dim">{idx + 1}</td>
                <td className="inv-td">
                  <p className="inv-item-name">{item.description}</p>
                  {item.subDescription && (
                    <p className="inv-item-sub">{item.subDescription}</p>
                  )}
                </td>
                <td className="inv-td inv-td-r">{item.hours.toFixed(2)}</td>
                <td className="inv-td inv-td-r">{item.rate.toFixed(2)}</td>
                <td className="inv-td inv-td-r">{num(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="inv-totals">
          <div className="inv-total-row">
            <span className="inv-total-label">Sub Total</span>
            <span className="inv-total-val">{num(subTotal)}</span>
          </div>
          <div className="inv-total-row inv-total-row--bold">
            <span className="inv-total-label">Total</span>
            <span className="inv-total-val">{php(total)}</span>
          </div>
          <div className="inv-total-row inv-total-row--balance">
            <span className="inv-total-label">Balance Due</span>
            <span className="inv-total-val">{php(balance)}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
