import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import OnboardingClient from './OnboardingClient'
import { toTitleCase } from '@/utils/format'

interface Props { params: { id: string } }

export default async function SetupPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: budget } = await supabase
    .from('budgets')
    .select('id, name, total_amount')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!budget) notFound()

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-4">
          <span className="text-2xl">🎉</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Budget created!</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add some categories to <span className="font-semibold">{toTitleCase(budget.name)}</span> to get started.
        </p>
      </div>
      <OnboardingClient budgetId={params.id} />
    </div>
  )
}
