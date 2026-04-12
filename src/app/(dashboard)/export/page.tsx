import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExportClient, { ExportTransaction } from './ExportClient'

export default async function ExportPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rawTxns } = await supabase
    .from('transactions')
    .select('id, date, vendor, amount, notes, receipt_base64, bucket:bucket_id(id, name), budget:budget_id(id, name)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  const transactions = (rawTxns ?? []) as unknown as ExportTransaction[]

  return <ExportClient transactions={transactions} />
}
