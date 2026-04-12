import Link from 'next/link'
import { BucketWithStats } from '@/lib/types'
import { formatCurrency, spendColor, toTitleCase } from '@/utils/format'
import ProgressBar from './ProgressBar'

interface Props {
  bucket: BucketWithStats
  budgetId: string
}

function borderColor(spent: number, allocated: number): string {
  const ratio = Number(allocated) > 0 ? Number(spent) / Number(allocated) : 0
  if (ratio >= 0.9) return '#dc2626'
  if (ratio >= 0.7) return '#d97706'
  return '#16a34a'
}

export default function BucketCard({ bucket, budgetId }: Props) {
  const leftBorder = borderColor(bucket.spent, bucket.allocated_amount)
  return (
    <Link
      href={`/budgets/${budgetId}/buckets/${bucket.id}`}
      style={{ borderLeftColor: leftBorder }}
      className="block bg-white rounded-xl border border-gray-100 border-l-4 shadow-sm hover:shadow-md hover:border-blue-200 hover:border-l-4 transition-all p-4 group"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
            {toTitleCase(bucket.name)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {bucket.transaction_count} transaction{bucket.transaction_count !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-lg font-bold tabular-nums ${spendColor(bucket.spent, bucket.allocated_amount)}`}>
            {formatCurrency(bucket.spent)}
          </p>
          <p className="text-xs text-gray-400">of {formatCurrency(bucket.allocated_amount)}</p>
        </div>
      </div>
      <div className="mt-3">
        <ProgressBar spent={bucket.spent} total={bucket.allocated_amount} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-gray-400">
        <span>Remaining: <span className="font-medium text-gray-600">{formatCurrency(bucket.remaining)}</span></span>
        <span>Allocated: <span className="font-medium text-gray-600">{formatCurrency(bucket.allocated_amount)}</span></span>
      </div>
    </Link>
  )
}
