'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/utils/format'
import { findReceiptMatch, linkReceipt, ReceiptMatchResult } from '@/lib/actions/ai'
import { X, Search, Receipt, CheckCircle2 } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface BucketRef { id: string; name: string }
interface BudgetRef { id: string; name: string }

export interface TxWithReceipt {
  id: string
  vendor: string
  amount: number
  date: string
  notes: string | null
  receipt_base64: string
  bucket: BucketRef | null
  budget: BudgetRef | null
}

export interface TxWithoutReceipt {
  id: string
  vendor: string
  amount: number
  date: string
  notes: string | null
  bucket: BucketRef | null
  budget: BudgetRef | null
}

interface Props {
  withReceipt:    TxWithReceipt[]
  withoutReceipt: TxWithoutReceipt[]
}

// ── Main Component ─────────────────────────────────────────────
export default function ReceiptsClient({ withReceipt, withoutReceipt }: Props) {
  const router = useRouter()

  const [search, setSearch]           = useState('')
  const [modalTx, setModalTx]         = useState<TxWithReceipt | null>(null)
  const [suggestions, setSuggestions] = useState<Record<string, ReceiptMatchResult | null | 'loading'>>({})
  const [accepting, setAccepting]     = useState<string | null>(null)

  const q = search.toLowerCase()

  const filteredWithReceipt = withReceipt.filter(tx =>
    !q || tx.vendor.toLowerCase().includes(q) || tx.date.includes(q)
  )
  const filteredWithoutReceipt = withoutReceipt.filter(tx =>
    !q || tx.vendor.toLowerCase().includes(q) || tx.date.includes(q)
  )

  async function handleFindMatch(txId: string) {
    setSuggestions(prev => ({ ...prev, [txId]: 'loading' }))
    try {
      const result = await findReceiptMatch(txId)
      setSuggestions(prev => ({ ...prev, [txId]: result }))
    } catch {
      setSuggestions(prev => ({ ...prev, [txId]: null }))
    }
  }

  async function handleAccept(targetTxId: string, sourceTxId: string) {
    setAccepting(targetTxId)
    try {
      await linkReceipt(targetTxId, sourceTxId)
      setSuggestions(prev => { const n = { ...prev }; delete n[targetTxId]; return n })
      router.refresh()
    } catch { /* silent */ }
    setAccepting(null)
  }

  function handleDismiss(txId: string) {
    setSuggestions(prev => { const n = { ...prev }; delete n[txId]; return n })
  }

  const totalCount = withReceipt.length + withoutReceipt.length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {withReceipt.length} linked · {withoutReceipt.length} missing
          </p>
        </div>
        {/* Mini summary pills */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {withReceipt.length} linked
          </span>
          {withoutReceipt.length > 0 && (
            <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-100">
              {withoutReceipt.length} missing
            </span>
          )}
        </div>
      </div>

      {/* Search */}
      {totalCount > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by vendor or date…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      )}

      {/* ── Receipts Grid ─────────────────────────────────────── */}
      {filteredWithReceipt.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            Receipts
            <span className="ml-2 text-xs font-normal text-gray-400">({filteredWithReceipt.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredWithReceipt.map(tx => (
              <ReceiptCard key={tx.id} tx={tx} onClick={() => setModalTx(tx)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Missing Receipts ──────────────────────────────────── */}
      {filteredWithoutReceipt.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            Missing Receipt
            <span className="ml-2 text-xs font-normal text-gray-400">({filteredWithoutReceipt.length})</span>
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {filteredWithoutReceipt.map(tx => {
              const suggestion = suggestions[tx.id]
              const isLoading  = suggestion === 'loading'
              const isSearched = tx.id in suggestions && suggestion !== 'loading'

              return (
                <div key={tx.id} className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    {/* Placeholder icon */}
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5 text-gray-300" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{tx.vendor}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(tx.date)}
                        {tx.bucket && <> · <span className="text-blue-500">{tx.bucket.name}</span></>}
                        {tx.budget && <> · {tx.budget.name}</>}
                      </p>
                    </div>

                    {/* Amount */}
                    <p className="font-semibold text-gray-900 tabular-nums shrink-0">
                      {formatCurrency(Number(tx.amount))}
                    </p>

                    {/* Find Match button */}
                    <button
                      onClick={() => handleFindMatch(tx.id)}
                      disabled={isLoading || isSearched}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                    >
                      {isLoading ? 'Searching…' : 'Find Match'}
                    </button>
                  </div>

                  {/* Suggestion banner */}
                  {isSearched && (
                    <div className="mt-2.5 ml-13">
                      {suggestion === null ? (
                        <p className="text-xs text-gray-400 ml-[52px]">No matching receipt found.</p>
                      ) : (
                        <div className="flex items-center gap-3 ml-[52px] px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                          <p className="flex-1 text-xs text-blue-700">
                            <span className="font-semibold">Possible match:</span>{' '}
                            {suggestion.vendor} · {formatCurrency(suggestion.amount)} · {formatDate(suggestion.date)}
                          </p>
                          <button
                            onClick={() => handleAccept(tx.id, suggestion.sourceTxId)}
                            disabled={accepting === tx.id}
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded transition-colors disabled:opacity-50 shrink-0"
                          >
                            {accepting === tx.id ? 'Linking…' : 'Accept'}
                          </button>
                          <button
                            onClick={() => handleDismiss(tx.id)}
                            className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {totalCount === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 text-gray-200" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700">No transactions yet</h2>
          <p className="text-sm text-gray-400 mt-1">Add transactions and upload receipts to see them here.</p>
        </div>
      )}

      {/* ── Full-size Image Modal ──────────────────────────────── */}
      {modalTx && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setModalTx(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{modalTx.vendor}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDate(modalTx.date)} · {formatCurrency(Number(modalTx.amount))}
                  {modalTx.bucket && <> · {modalTx.bucket.name}</>}
                </p>
              </div>
              <button
                onClick={() => setModalTx(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors ml-4 shrink-0"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="max-h-[75vh] overflow-auto p-4">
              {modalTx.receipt_base64.startsWith('data:application/pdf') ? (
                <div className="text-center py-10">
                  <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-4">PDF receipt</p>
                  <a
                    href={modalTx.receipt_base64}
                    download={`receipt_${modalTx.vendor}_${modalTx.date}.pdf`}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    Download PDF
                  </a>
                </div>
              ) : (
                <img
                  src={modalTx.receipt_base64}
                  alt={`Receipt for ${modalTx.vendor}`}
                  className="w-full rounded-lg object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Receipt Card ───────────────────────────────────────────────
function ReceiptCard({ tx, onClick }: { tx: TxWithReceipt; onClick: () => void }) {
  const isPdf = tx.receipt_base64.startsWith('data:application/pdf')

  return (
    <button
      onClick={onClick}
      className="group block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all overflow-hidden text-left w-full"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
        {isPdf ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <Receipt className="w-10 h-10 text-gray-200" />
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">PDF</span>
          </div>
        ) : (
          <img
            src={tx.receipt_base64}
            alt={tx.vendor}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        )}
        {/* Linked badge */}
        <span className="absolute top-2 left-2 flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          <CheckCircle2 className="w-2.5 h-2.5" /> Linked
        </span>
      </div>

      {/* Card body */}
      <div className="p-3">
        <p className="font-semibold text-gray-800 text-sm truncate">{tx.vendor}</p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.date)}</p>
        <div className="flex items-center justify-between mt-2 gap-1">
          <span className="text-sm font-bold text-gray-900 tabular-nums">
            {formatCurrency(Number(tx.amount))}
          </span>
          {tx.bucket && (
            <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full truncate max-w-[80px]">
              {tx.bucket.name}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
