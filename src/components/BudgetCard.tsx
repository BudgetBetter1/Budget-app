import Link from 'next/link'
import { BudgetWithStats } from '@/lib/types'
import { formatCurrency, formatMonthYear, pct, barColor } from '@/utils/format'
import { CalendarDays, FolderKanban } from 'lucide-react'

interface Props {
  budget: BudgetWithStats
}

export default function BudgetCard({ budget }: Props) {
  const p = pct(budget.spent, budget.total_amount)
  const bar = barColor(budget.spent, budget.total_amount)

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
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            {budget.type === 'monthly' ? (
              <CalendarDays className="w-4 h-4 text-blue-400" />
            ) : (
              <FolderKanban className="w-4 h-4 text-violet-400" />
            )}
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              {budget.type}
            </span>
          </div>
          <h3 className="mt-1 text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
            {budget.name}
          </h3>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-bold text-gray-900 tabular-nums">
            {formatCurrency(budget.spent)}
          </p>
          <p className="text-xs text-gray-400">of {formatCurrency(budget.total_amount)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${p}%`, backgroundColor: bar }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">{p}% used</span>
          <span className="text-xs text-gray-400">
            {budget.bucket_count} bucket{budget.bucket_count !== 1 ? 's' : ''} ·{' '}
            {budget.transaction_count} transaction{budget.transaction_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </Link>
  )
}
