'use client'

import Link from 'next/link'
import { TransactionWithBucket } from '@/lib/types'
import { formatCurrency, formatDate, toTitleCase } from '@/utils/format'
import { Receipt, Pencil } from 'lucide-react'

interface Props {
  tx: TransactionWithBucket
  budgetId: string
}

export default function TransactionRow({ tx, budgetId }: Props) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors group">
      {/* Date */}
      <div className="w-24 shrink-0">
        <p className="text-xs font-medium text-gray-500">{formatDate(tx.date)}</p>
      </div>

      {/* Vendor & category (mobile) / notes */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate">{tx.vendor}</p>
        {/* Category shown inline on mobile, hidden on sm+ where the column exists */}
        {tx.bucket && (
          <p className="text-xs text-blue-500 font-medium truncate sm:hidden">
            {toTitleCase(tx.bucket.name)}
          </p>
        )}
        {tx.notes && (
          <p className="text-xs text-gray-400 truncate hidden sm:block">
            {tx.notes.length > 40 ? tx.notes.slice(0, 40) + '…' : tx.notes}
          </p>
        )}
      </div>

      {/* Bucket badge — desktop only */}
      <div className="hidden sm:block w-32 shrink-0">
        {tx.bucket ? (
          <span className="inline-block text-xs bg-blue-50 text-blue-600 font-medium rounded-full px-2.5 py-0.5 truncate max-w-full">
            {toTitleCase(tx.bucket.name)}
          </span>
        ) : (
          <span className="text-xs text-gray-300">Unassigned</span>
        )}
      </div>

      {/* Receipt icon */}
      <div className="w-8 shrink-0 flex justify-center">
        {tx.receipt_base64 ? (
          <a
            href={tx.receipt_base64}
            download="receipt"
            onClick={(e) => e.stopPropagation()}
            title="Download receipt"
          >
            <Receipt className="w-4 h-4 text-blue-400 hover:text-blue-600" />
          </a>
        ) : tx.receipt_url ? (
          <a
            href={tx.receipt_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="View receipt"
          >
            <Receipt className="w-4 h-4 text-blue-400 hover:text-blue-600" />
          </a>
        ) : (
          <Receipt className="w-4 h-4 text-gray-200" />
        )}
      </div>

      {/* Amount */}
      <div className="w-24 shrink-0 text-right">
        <p className="font-semibold text-gray-900 tabular-nums">{formatCurrency(tx.amount)}</p>
      </div>

      {/* Edit */}
      <div className="w-8 shrink-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={`/transactions/${tx.id}/edit?budget=${budgetId}`}
          title="Edit transaction"
        >
          <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-600" />
        </Link>
      </div>
    </div>
  )
}
