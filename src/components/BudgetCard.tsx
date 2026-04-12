import Link from 'next/link'
import { BudgetWithStats } from '@/lib/types'
import { formatCurrency, formatMonthYear, pct, barColor } from '@/utils/format'
import { CalendarDays, FolderKanban, TrendingUp, AlertTriangle } from 'lucide-react'

interface Props {
  budget: BudgetWithStats
}

export default function BudgetCard({ budget }: Props) {
  const p   = pct(budget.spent, budget.total_amount)
  const bar = barColor(budget.spent, budget.total_amount)
  const isOver   = budget.spent > budget.total_amount
  const isNear   = !isOver && p >= 80
  const isOnTrack = !isOver && !isNear

  const subtitle =
    budget.type === 'monthly' && budget.month && budget.year
      ? formatMonthYear(budget.month, budget.year)
      : budget.start_date
        ? `${budget.start_date}${budget.end_date ? ' → ' + budget.end_date : ''}`
        : ''

  return (
    <Link
      href={`/budgets/${budget.id}`}
      className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all p-5 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {budget.type === 'monthly' ? (
              <CalendarDays className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            ) : (
              <FolderKanban className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            )}
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              {budget.type}
            </span>
            {isOver && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> Over
              </span>
            )}
            {isNear && (
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                Near limit
              </span>
            )}
            {isOnTrack && budget.spent > 0 && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" /> On track
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-gray-800 group-hover:text-blue-600 transition-colors truncate">
            {budget.name}
          </h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Spent / Budget */}
        <div className="text-right shrink-0">
          <p className="text-xl font-bold text-gray-900 tabular-nums">
            {formatCurrency(budget.spent)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">of {formatCurrency(budget.total_amount)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${p}%`, backgroundColor: bar }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tabular-nums" style={{ color: bar }}>
          {p}% used
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold tabular-nums ${isOver ? 'text-red-600' : 'text-emerald-600'}`}>
            {isOver ? '−' : ''}{formatCurrency(Math.abs(budget.remaining))} left
          </span>
          <span className="text-gray-200">·</span>
          <span className="text-xs text-gray-400">
            {budget.bucket_count} {budget.bucket_count === 1 ? 'category' : 'categories'} · {budget.transaction_count}tx
          </span>
        </div>
      </div>
    </Link>
  )
}
