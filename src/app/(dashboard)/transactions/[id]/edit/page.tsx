import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import TransactionForm from '@/components/TransactionForm'
import DeleteButton from '@/components/DeleteButton'
import { deleteTransaction } from '@/lib/actions/transactions'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: { id: string }
  searchParams: { budget?: string }
}

export default async function EditTransactionPage({ params, searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!tx) notFound()

  const budgetId = searchParams.budget ?? tx.budget_id

  // Fetch all budgets so user can reassign to a different budget
  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch buckets for the budget this transaction currently belongs to
  const { data: buckets } = await supabase
    .from('buckets')
    .select('*')
    .eq('budget_id', tx.budget_id)
    .order('name')

  const backHref = `/budgets/${budgetId}`

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Budget
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Edit Transaction</h1>
            <p className="text-sm text-gray-400">{tx.vendor}</p>
          </div>
          <DeleteButton
            action={async () => {
              'use server'
              await deleteTransaction(params.id, budgetId)
            }}
            label="Delete"
            confirm="Delete this transaction permanently?"
          />
        </div>
        <TransactionForm budgetId={tx.budget_id} buckets={buckets ?? []} transaction={tx} />
      </div>
    </div>
  )
}
