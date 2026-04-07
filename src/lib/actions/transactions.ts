'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTransaction(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const budgetId = formData.get('budget_id') as string
  const bucketId = formData.get('bucket_id') as string
  const date = formData.get('date') as string
  const vendor = (formData.get('vendor') as string).trim()
  const amount = parseFloat(formData.get('amount') as string)
  const notes = (formData.get('notes') as string).trim() || null
  const receipt_base64 = (formData.get('receipt_base64') as string) || null

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    budget_id: budgetId,
    bucket_id: bucketId || null,
    date,
    vendor,
    amount,
    notes,
    receipt_base64,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath(`/budgets/${budgetId}`)
  redirect(`/budgets/${budgetId}`)
}

export async function updateTransaction(txId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const budgetId = formData.get('budget_id') as string
  const bucketId = formData.get('bucket_id') as string
  const date = formData.get('date') as string
  const vendor = (formData.get('vendor') as string).trim()
  const amount = parseFloat(formData.get('amount') as string)
  const notes = (formData.get('notes') as string).trim() || null

  const { data: existing } = await supabase
    .from('transactions')
    .select('receipt_base64')
    .eq('id', txId)
    .single()

  let receipt_base64: string | null = existing?.receipt_base64 ?? null

  const uploaded = (formData.get('receipt_base64') as string) || null
  if (uploaded) receipt_base64 = uploaded

  const clearReceipt = formData.get('clear_receipt') === '1'
  if (clearReceipt) receipt_base64 = null

  const { error } = await supabase
    .from('transactions')
    .update({
      budget_id: budgetId,
      bucket_id: bucketId || null,
      date,
      vendor,
      amount,
      notes,
      receipt_base64,
    })
    .eq('id', txId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath(`/budgets/${budgetId}`)
  redirect(`/budgets/${budgetId}`)
}

export async function deleteTransaction(txId: string, budgetId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', txId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath(`/budgets/${budgetId}`)
  redirect(`/budgets/${budgetId}`)
}
