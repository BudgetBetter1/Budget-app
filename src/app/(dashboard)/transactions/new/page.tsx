import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TransactionForm from '@/components/TransactionForm'
import { ArrowLeft } from 'lucide-react'

interface Props {
  searchParams: { budget?: string; bucket?: string }
}

export default async function NewTransactionPage({ searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Load all budgets so user can pick one if not pre-selected
  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const budgetId = searchParams.budget ?? budgets?.[0]?.id ?? ''

  // Load buckets for the selected budget
  const { data: buckets } = await supabase
    .from('buckets')
    .select('*')
    .eq('budget_id', budgetId)
    .order('name')

  const backHref = budgetId ? `/budgets/${budgetId}` : '/'

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">New Transaction</h1>
        <p className="text-sm text-gray-400 mb-6">Record a manual expense.</p>
        <TransactionForm budgetId={budgetId} buckets={buckets ?? []} />
      </div>
    </div>
  )
}
