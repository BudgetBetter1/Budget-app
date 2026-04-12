import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReceiptsClient, { TxWithReceipt, TxWithoutReceipt } from './ReceiptsClient'

export default async function ReceiptsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Transactions that HAVE a receipt
  const { data: rawWith } = await supabase
    .from('transactions')
    .select('id, vendor, amount, date, notes, receipt_base64, bucket:bucket_id(id, name), budget:budget_id(id, name)')
    .eq('user_id', user.id)
    .not('receipt_base64', 'is', null)
    .order('date', { ascending: false })

  // Transactions that are MISSING a receipt
  const { data: rawWithout } = await supabase
    .from('transactions')
    .select('id, vendor, amount, date, notes, bucket:bucket_id(id, name), budget:budget_id(id, name)')
    .eq('user_id', user.id)
    .is('receipt_base64', null)
    .order('date', { ascending: false })

  const withReceipt    = (rawWith    ?? []) as unknown as TxWithReceipt[]
  const withoutReceipt = (rawWithout ?? []) as unknown as TxWithoutReceipt[]

  return <ReceiptsClient withReceipt={withReceipt} withoutReceipt={withoutReceipt} />
}
