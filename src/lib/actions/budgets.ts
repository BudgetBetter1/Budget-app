'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createBudget(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const name = (formData.get('name') as string).trim()
  const type = formData.get('type') as 'monthly' | 'project'
  const total_amount = parseFloat(formData.get('total_amount') as string)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = { user_id: user.id, name, type, total_amount }

  if (type === 'monthly') {
    payload.month = parseInt(formData.get('month') as string)
    payload.year = parseInt(formData.get('year') as string)
  } else {
    payload.start_date = formData.get('start_date') as string
    const end = formData.get('end_date') as string
    payload.end_date = end || null
  }

  const { data, error } = await supabase
    .from('budgets')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  redirect(`/budgets/${data.id}/setup`)
}

export async function updateBudget(id: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const name = (formData.get('name') as string).trim()
  const total_amount = parseFloat(formData.get('total_amount') as string)
  const type = formData.get('type') as 'monthly' | 'project'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = { name, total_amount, type }

  if (type === 'monthly') {
    payload.month = parseInt(formData.get('month') as string)
    payload.year = parseInt(formData.get('year') as string)
    payload.start_date = null
    payload.end_date = null
  } else {
    payload.start_date = formData.get('start_date') as string
    const end = formData.get('end_date') as string
    payload.end_date = end || null
    payload.month = null
    payload.year = null
  }

  const { error } = await supabase
    .from('budgets')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath(`/budgets/${id}`)
  redirect(`/budgets/${id}`)
}

export async function deleteBudget(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
