import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import StatCard from '@/components/StatCard'
import TransactionRow from '@/components/TransactionRow'
import DeleteButton from '@/components/DeleteButton'
import BucketForm from '@/components/BucketForm'
import { deleteBucket } from '@/lib/actions/buckets'
import { TransactionWithBucket } from '@/lib/types'
import { toTitleCase } from '@/utils/format'
import { ArrowLeft } from 'lucide-react'
import ProgressBar from '@/components/ProgressBar'
import { PlusCircle } from 'lucide-react'

interface Props { params: { id: string; bucketId: string } }

export default async function BucketDetailPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verify budget ownership
  const { data: budget } = await supabase
    .from('budgets')
    .select('id, name')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!budget) notFound()

  const { data: bucket } = await supabase
    .from('buckets')
    .select('*')
    .eq('id', params.bucketId)
    .eq('budget_id', params.id)
    .single()

  if (!bucket) notFound()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, bucket:bucket_id(id, name, allocated_amount, budget_id, created_at)')
    .eq('bucket_id', bucket.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  const spent = (transactions ?? []).reduce((s, t) => s + Number(t.amount), 0)
  const remaining = Number(bucket.allocated_amount) - spent

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link href={`/budgets/${params.id}`} className="mt-1 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400">
            <Link href={`/budgets/${params.id}`} className="hover:text-blue-600">{budget.name}</Link>
            {' · '}Category
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{toTitleCase(bucket.name)}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <DeleteButton
            action={async () => {
              'use server'
              await deleteBucket(params.bucketId, params.id)
            }}
            label="Delete category"
            confirm={`Delete "${bucket.name}"? Transactions will become unassigned.`}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Allocated" amount={bucket.allocated_amount} variant="blue" />
        <StatCard label="Spent"     amount={spent} />
        <StatCard label="Remaining" amount={remaining} variant={remaining < 0 ? 'red' : 'green'} />
      </div>

      <div className="mb-8">
        <ProgressBar spent={spent} total={bucket.allocated_amount} />
      </div>

      {/* Edit bucket inline */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Edit Category</h2>
        <BucketForm budgetId={params.id} bucket={bucket} />
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
            href={`/transactions/new?budget=${params.id}&bucket=${params.bucketId}`}
            className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Add
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {(transactions ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-8 text-center">
              No transactions in this category yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-400">
                <div className="w-24">Date</div>
                <div className="flex-1">Vendor</div>
                <div className="hidden sm:block w-32">Category</div>
                <div className="w-8" />
                <div className="w-24 text-right">Amount</div>
                <div className="w-8" />
              </div>
              {(transactions as TransactionWithBucket[]).map((tx) => (
                <TransactionRow key={tx.id} tx={tx} budgetId={params.id} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
