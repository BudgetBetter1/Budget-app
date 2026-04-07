'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createBucket(budgetId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const name = (formData.get('name') as string).trim()
  const allocated_amount = parseFloat(formData.get('allocated_amount') as string)

  const { error } = await supabase.from('buckets').insert({
    budget_id: budgetId,
    name,
    allocated_amount,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/budgets/${budgetId}`)
}

export async function updateBucket(bucketId: string, budgetId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const name = (formData.get('name') as string).trim()
  const allocated_amount = parseFloat(formData.get('allocated_amount') as string)

  const { error } = await supabase
    .from('buckets')
    .update({ name, allocated_amount })
    .eq('id', bucketId)

  if (error) throw new Error(error.message)

  revalidatePath(`/budgets/${budgetId}`)
  revalidatePath(`/budgets/${budgetId}/buckets/${bucketId}`)
}

export async function deleteBucket(bucketId: string, budgetId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { error } = await supabase.from('buckets').delete().eq('id', bucketId)

  if (error) throw new Error(error.message)

  revalidatePath(`/budgets/${budgetId}`)
  redirect(`/budgets/${budgetId}`)
}
