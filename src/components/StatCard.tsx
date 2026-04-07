import { formatCurrency } from '@/utils/format'

interface Props {
  label: string
  amount: number
  sub?: string
  variant?: 'default' | 'green' | 'red' | 'blue'
}

const variantStyles = {
  default: 'bg-white border border-gray-100',
  green:   'bg-emerald-50 border border-emerald-100',
  red:     'bg-red-50 border border-red-100',
  blue:    'bg-blue-50 border border-blue-100',
}

const amountStyles = {
  default: 'text-gray-900',
  green:   'text-emerald-700',
  red:     'text-red-700',
  blue:    'text-blue-700',
}

export default function StatCard({ label, amount, sub, variant = 'default' }: Props) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm ${variantStyles[variant]}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${amountStyles[variant]}`}>
        {formatCurrency(amount)}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
