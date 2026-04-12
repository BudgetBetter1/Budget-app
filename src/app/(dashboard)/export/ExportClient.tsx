'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@/utils/format'
import { Download, FileText, Archive, CheckCircle2 } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
export interface ExportTransaction {
  id: string
  date: string
  vendor: string
  amount: number
  notes: string | null
  receipt_base64: string | null
  bucket: { id: string; name: string } | null
  budget: { id: string; name: string } | null
}

interface Props {
  transactions: ExportTransaction[]
}

// ── Helpers ────────────────────────────────────────────────────
function escapeCSV(s: string) {
  return `"${s.replace(/"/g, '""')}"`
}

function buildCSV(transactions: ExportTransaction[]): string {
  const headers = ['Date', 'Vendor', 'Amount', 'Budget Name', 'Category Name', 'Notes', 'Has Receipt']
  const rows = transactions.map(tx => [
    tx.date,
    escapeCSV(tx.vendor),
    Number(tx.amount).toFixed(2),
    escapeCSV(tx.budget?.name ?? ''),
    escapeCSV(tx.bucket?.name ?? ''),
    escapeCSV(tx.notes ?? ''),
    tx.receipt_base64 ? 'Yes' : 'No',
  ])
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}

function sanitizeFilename(str: string): string {
  return str.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase().slice(0, 50)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Component ──────────────────────────────────────────────────
export default function ExportClient({ transactions }: Props) {
  const [zipping, setZipping]           = useState(false)
  const [csvDone, setCsvDone]           = useState(false)
  const [zipDone, setZipDone]           = useState(false)

  const receiptCount = transactions.filter(tx => tx.receipt_base64).length
  const today        = new Date().toISOString().split('T')[0]

  function handleCSV() {
    const csv  = buildCSV(transactions)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    triggerDownload(blob, `transactions_${today}.csv`)
    setCsvDone(true)
    setTimeout(() => setCsvDone(false), 3000)
  }

  async function handleZIP() {
    if (zipping) return
    setZipping(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip   = new JSZip()

      for (const tx of transactions) {
        if (!tx.receipt_base64) continue
        const commaIdx = tx.receipt_base64.indexOf(',')
        const header   = tx.receipt_base64.slice(0, commaIdx)
        const data     = tx.receipt_base64.slice(commaIdx + 1)
        const mimeMatch = header.match(/data:([^;]+)/)
        const mime      = mimeMatch?.[1] ?? 'image/jpeg'
        const ext       = mime === 'application/pdf' ? 'pdf' : (mime.split('/')[1] ?? 'jpg')
        const name      = `${tx.date}_${sanitizeFilename(tx.vendor)}_${Number(tx.amount).toFixed(2)}.${ext}`
        zip.file(name, data, { base64: true })
      }

      zip.file('manifest.csv', buildCSV(transactions))

      const blob = await zip.generateAsync({ type: 'blob' })
      triggerDownload(blob, `receipts_${today}.zip`)
      setZipDone(true)
      setTimeout(() => setZipDone(false), 3000)
    } catch (err) {
      console.error('ZIP generation failed:', err)
    }
    setZipping(false)
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Export</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} · {receiptCount} with receipt
        </p>
      </div>

      <div className="space-y-4">
        {/* ── CSV Export ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900">Transactions CSV</h2>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                All transactions exported as a CSV spreadsheet.
              </p>
              <p className="text-xs text-gray-400 mt-1.5 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
                Date, Vendor, Amount, Budget Name, Category Name, Notes, Has Receipt
              </p>
              <p className="text-xs text-gray-400 mt-1">{transactions.length} rows</p>
            </div>
            <button
              onClick={handleCSV}
              disabled={transactions.length === 0}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0"
            >
              {csvDone ? (
                <><CheckCircle2 className="w-4 h-4" /> Done</>
              ) : (
                <><Download className="w-4 h-4" /> Download</>
              )}
            </button>
          </div>
        </div>

        {/* ── ZIP Export ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
              <Archive className="w-5 h-5 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900">Receipts ZIP</h2>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                All receipt images as a ZIP archive with a manifest CSV inside.
              </p>
              <p className="text-xs text-gray-400 mt-1.5 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
                YYYY-MM-DD_vendor_amount.jpg
              </p>
              <p className="text-xs text-gray-400 mt-1">{receiptCount} receipt{receiptCount !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={handleZIP}
              disabled={receiptCount === 0 || zipping}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0"
            >
              {zipDone ? (
                <><CheckCircle2 className="w-4 h-4" /> Done</>
              ) : zipping ? (
                <><Archive className="w-4 h-4 animate-pulse" /> Zipping…</>
              ) : (
                <><Download className="w-4 h-4" /> Download</>
              )}
            </button>
          </div>
        </div>

        {/* ── Preview Table ────────────────────────────────────── */}
        {transactions.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">Preview</h3>
              <p className="text-xs text-gray-400 mt-0.5">First 10 transactions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
                    <th className="px-4 py-2.5 text-left">Date</th>
                    <th className="px-4 py-2.5 text-left">Vendor</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                    <th className="px-4 py-2.5 text-left hidden sm:table-cell">Budget</th>
                    <th className="px-4 py-2.5 text-left hidden sm:table-cell">Category</th>
                    <th className="px-4 py-2.5 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.slice(0, 10).map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[140px] truncate">{tx.vendor}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                        {formatCurrency(Number(tx.amount))}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell max-w-[120px] truncate">
                        {tx.budget?.name ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        {tx.bucket ? (
                          <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-1.5 py-0.5 rounded-full">
                            {tx.bucket.name}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {tx.receipt_base64 ? (
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" title="Has receipt" />
                        ) : (
                          <span className="inline-block w-2 h-2 rounded-full bg-gray-200" title="No receipt" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {transactions.length > 10 && (
              <p className="text-xs text-gray-400 text-center py-3 border-t border-gray-50">
                +{transactions.length - 10} more rows in the export
              </p>
            )}
          </div>
        )}

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">No transactions to export yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
