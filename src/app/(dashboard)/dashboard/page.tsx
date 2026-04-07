import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BudgetCard from '@/components/BudgetCard'
import StatCard from '@/components/StatCard'
import { BudgetWithStats } from '@/lib/types'
import { PlusCircle } from 'lucide-react'

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

  const spendByBudget = new Map<string, number>()
  const txCountByBudget = new Map<string, number>()
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">All your budgets at a glance</p>
        </div>
        <Link
          href="/budgets/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          New Budget
        </Link>
      </div>

      {budgetsWithStats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Budgeted" amount={totalBudget} variant="blue" />
          <StatCard label="Total Spent"    amount={totalSpent} />
          <StatCard
            label="Total Remaining"
            amount={totalLeft}
            variant={totalLeft < 0 ? 'red' : 'green'}
          />
        </div>
      )}

      {budgetsWithStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgetsWithStats.map((b) => (
            <BudgetCard key={b.id} budget={b} />
          ))}
        </div>
      )}
    </div>
  )
}
