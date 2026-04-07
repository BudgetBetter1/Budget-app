import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import BudgetForm from '@/components/BudgetForm'
import { ArrowLeft } from 'lucide-react'

interface Props { params: { id: string } }

export default async function EditBudgetPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: budget } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!budget) notFound()

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href={`/budgets/${budget.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Budget
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Edit Budget</h1>
        <p className="text-sm text-gray-400 mb-6">{budget.name}</p>
        <BudgetForm budget={budget} />
      </div>
    </div>
  )
}
