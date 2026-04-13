import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BudgetCard from '@/components/BudgetCard'
import PlaidSection from '@/components/PlaidSection'
import { BudgetWithStats } from '@/lib/types'
import { formatCurrency } from '@/utils/format'
import { PlusCircle, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: budgets } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: transactions } = await supabase
    .from('transactions')
    .select('budget_id, amount')
    .eq('user_id', user.id)

  const { data: buckets } = await supabase
    .from('buckets')
    .select('id, budget_id')
    .in('budget_id', (budgets ?? []).map((b) => b.id))

  const { data: plaidConnections } = await supabase
    .from('plaid_connections')
    .select('id, institution_name, last_synced_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const spendByBudget    = new Map<string, number>()
  const txCountByBudget  = new Map<string, number>()
  for (const tx of transactions ?? []) {
    spendByBudget.set(tx.budget_id, (spendByBudget.get(tx.budget_id) ?? 0) + Number(tx.amount))
    txCountByBudget.set(tx.budget_id, (txCountByBudget.get(tx.budget_id) ?? 0) + 1)
  }

  const bucketCountByBudget = new Map<string, number>()
  for (const b of buckets ?? []) {
    bucketCountByBudget.set(b.budget_id, (bucketCountByBudget.get(b.budget_id) ?? 0) + 1)
  }

  const budgetsWithStats: BudgetWithStats[] = (budgets ?? []).map((b) => {
    const spent = spendByBudget.get(b.id) ?? 0
    const total = Number(b.total_amount)
    return {
      ...b,
      total_amount: total,
      spent,
      remaining: total - spent,
      bucket_count: bucketCountByBudget.get(b.id) ?? 0,
      transaction_count: txCountByBudget.get(b.id) ?? 0,
    }
  })

  const totalBudget = budgetsWithStats.reduce((s, b) => s + b.total_amount, 0)
  const totalSpent  = budgetsWithStats.reduce((s, b) => s + b.spent, 0)
  const totalLeft   = totalBudget - totalSpent
  const pctUsed     = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0

  const overBudget  = budgetsWithStats.filter(b => b.spent > b.total_amount).length
  const nearLimit   = budgetsWithStats.filter(b => {
    const ratio = b.total_amount > 0 ? b.spent / b.total_amount : 0
    return ratio >= 0.8 && ratio < 1
  }).length

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-6 mb-8 shadow-lg">
        {/* Background decoration */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/5 rounded-full" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-300" />
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-300">
                  Overall Budget Health
                </span>
              </div>
              <h1 className="text-3xl font-bold">
                {formatCurrency(totalSpent)}
                <span className="text-lg font-normal text-blue-200 ml-1">
                  of {formatCurrency(totalBudget)}
                </span>
              </h1>
            </div>
            <Link
              href="/budgets/new"
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0 border border-white/20"
            >
              <PlusCircle className="w-4 h-4" />
              New Budget
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-200 uppercase tracking-wide font-medium">Budgeted</p>
              <p className="text-xl font-bold mt-0.5 tabular-nums">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-200 uppercase tracking-wide font-medium">Spent</p>
              <p className="text-xl font-bold mt-0.5 tabular-nums">{formatCurrency(totalSpent)}</p>
            </div>
            <div className={`rounded-xl p-3 ${totalLeft < 0 ? 'bg-red-500/30' : 'bg-emerald-500/20'}`}>
              <p className="text-xs text-blue-200 uppercase tracking-wide font-medium">Remaining</p>
              <p className={`text-xl font-bold mt-0.5 tabular-nums ${totalLeft < 0 ? 'text-red-200' : 'text-emerald-300'}`}>
                {formatCurrency(totalLeft)}
              </p>
            </div>
          </div>

          {/* Large progress bar */}
          <div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pctUsed}%`,
                  backgroundColor: pctUsed >= 100 ? '#f87171' : pctUsed >= 80 ? '#fbbf24' : '#86efac',
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-blue-200">{pctUsed}% used</span>
              <div className="flex items-center gap-3">
                {overBudget > 0 && (
                  <span className="text-xs text-red-300 font-medium">
                    {overBudget} over budget
                  </span>
                )}
                {nearLimit > 0 && (
                  <span className="text-xs text-amber-300 font-medium">
                    {nearLimit} near limit
                  </span>
                )}
                <span className="text-xs text-blue-200">
                  {budgetsWithStats.length} budget{budgetsWithStats.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Connected Banks ────────────────────────────────────── */}
      <PlaidSection
        connections={plaidConnections ?? []}
        budgets={(budgets ?? []).map(b => ({ id: b.id, name: b.name }))}
      />

      {/* ── Budget Grid ────────────────────────────────────────── */}
      {budgetsWithStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
            <PlusCircle className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700">No budgets yet</h2>
          <p className="text-sm text-gray-400 mt-1 mb-6">Create your first budget to get started.</p>
          <Link
            href="/budgets/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
          >
            Create Budget
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">Your Budgets</h2>
            <span className="text-xs text-gray-400">{budgetsWithStats.length} total</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {budgetsWithStats.map((b) => (
              <BudgetCard key={b.id} budget={b} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
