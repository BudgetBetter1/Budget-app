import { format, parseISO } from 'date-fns'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy')
}

export function formatMonthYear(month: number, year: number): string {
  const date = new Date(year, month - 1)
  return format(date, 'MMMM yyyy')
}

export function pct(spent: number, total: number): number {
  const s = Number(spent)
  const t = Number(total)
  if (!t || t <= 0) return 0
  return Math.min(Math.round((s / t) * 100), 100)
}

export function spendColor(spent: number, allocated: number): string {
  const ratio = Number(allocated) > 0 ? Number(spent) / Number(allocated) : 0
  if (ratio >= 1) return 'text-red-600'
  if (ratio >= 0.8) return 'text-amber-600'
  return 'text-emerald-600'
}

export function barColor(spent: number, allocated: number): string {
  const ratio = Number(allocated) > 0 ? Number(spent) / Number(allocated) : 0
  if (ratio >= 1) return '#ef4444'
  if (ratio >= 0.8) return '#fbbf24'
  return '#3b82f6'
}

export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}
