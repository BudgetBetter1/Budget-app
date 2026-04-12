import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import BucketCard from '@/components/BucketCard'
import TransactionRow from '@/components/TransactionRow'
import DeleteButton from '@/components/DeleteButton'
import { deleteBudget } from '@/lib/actions/budgets'
import { BucketWithStats, TransactionWithBucket } from '@/lib/types'
import { formatMonthYear, formatCurrency, toTitleCase } from '@/utils/format'
import { ArrowLeft, Pencil, PlusCircle } from 'lucide-react'
import AddBucketInline from './AddBucketInline'

interface Props { params: { id: string } }

export default async function BudgetDetailPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch budget
  const { data: budget } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!budget) notFound()

  // Fetch buckets
  const { data: buckets } = await supabase
    .from('buckets')
    .select('*')
    .eq('budget_id', budget.id)
    .order('created_at')

  // Fetch transactions with bucket join
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, bucket:bucket_id(id, name, allocated_amount, budget_id, created_at)')
    .eq('budget_id', budget.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  // Compute spend per bucket
  const spendByBucket = new Map<string, number>()
  const countByBucket = new Map<string, number>()
  for (const tx of transactions ?? []) {
    if (tx.bucket_id) {
      spendByBucket.set(tx.bucket_id, (spendByBucket.get(tx.bucket_id) ?? 0) + Number(tx.amount))
      countByBucket.set(tx.bucket_id, (countByBucket.get(tx.bucket_id) ?? 0) + 1)
    }
  }

  const bucketsWithStats: BucketWithStats[] = (buckets ?? [])
    .map((b) => {
      const spent = spendByBucket.get(b.id) ?? 0
      const allocated = Number(b.allocated_amount)
      return {
        ...b,
        allocated_amount: allocated,
        spent,
        remaining: allocated - spent,
        transaction_count: countByBucket.get(b.id) ?? 0,
      }
    })
    // Sort by highest spend first
    .sort((a, b) => b.spent - a.spent)

  const totalSpent = (transactions ?? []).reduce((s, t) => s + Number(t.amount), 0)
  const remaining  = Number(budget.total_amount) - totalSpent

  const subtitle =
    budget.type === 'monthly' && budget.month && budget.year
      ? formatMonthYear(budget.month, budget.year)
      : budget.start_date
        ? `${budget.start_date}${budget.end_date ? ' → ' + budget.end_date : ''}`
        : ''

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link href="/dashboard" className="mt-1 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 capitalize">{budget.type} budget</span>
            {subtitle && <span className="text-xs text-gray-400">· {subtitle}</span>}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{toTitleCase(budget.name)}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/budgets/${budget.id}/edit`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <Pencil className="w-4 h-4" /> Edit
          </Link>
          <DeleteButton
            action={async () => {
              'use server'
              await deleteBudget(params.id)
            }}
            label="Delete"
            confirm={`Delete "${budget.name}" and all its data?`}
          />
        </div>
      </div>

      {/* Compact stats row */}
      <div className="flex items-center gap-0 bg-white rounded-2xl border border-gray-100 shadow-sm mb-8 overflow-hidden">
        <div className="flex-1 px-5 py-4 text-center border-r border-gray-100">
          <p className="text-xs text-gray-400 mb-0.5">Budget</p>
          <p className="text-lg font-bold tabular-nums text-blue-700">{formatCurrency(budget.total_amount)}</p>
        </div>
        <div className="flex-1 px-5 py-4 text-center border-r border-gray-100">
          <p className="text-xs text-gray-400 mb-0.5">Spent</p>
          <p className="text-lg font-bold tabular-nums text-gray-900">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="flex-1 px-5 py-4 text-center">
          <p className="text-xs text-gray-400 mb-0.5">Remaining</p>
          <p className={`text-lg font-bold tabular-nums ${remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatCurrency(remaining)}
          </p>
        </div>
      </div>

      {/* Buckets */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Categories</h2>
        </div>

        {bucketsWithStats.length === 0 && (
          <p className="text-sm text-gray-400 mb-4">No categories yet. Add one below.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {bucketsWithStats.map((bucket) => (
            <BucketCard key={bucket.id} bucket={bucket} budgetId={budget.id} />
          ))}
        </div>

        <AddBucketInline budgetId={budget.id} />
      </section>

      {/* Transactions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700">
            Transactions
            {transactions && transactions.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">({transactions.length})</span>
            )}
          </h2>
          <Link
            href={`/transactions/new?budget=${budget.id}`}
            className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Add
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {(transactions ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-8 text-center">
              No transactions yet.{' '}
              <Link href={`/transactions/new?budget=${budget.id}`} className="text-blue-600 hover:underline">
                Add one
              </Link>
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {/* Table header */}
              <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-400">
                <div className="w-24">Date</div>
                <div className="flex-1">Vendor</div>
                <div className="hidden sm:block w-32">Category</div>
                <div className="w-8" />
                <div className="w-24 text-right">Amount</div>
                <div className="w-8" />
              </div>
              {(transactions as TransactionWithBucket[]).map((tx) => (
                <TransactionRow key={tx.id} tx={tx} budgetId={budget.id} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
