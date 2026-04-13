import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient } from '@/lib/plaid'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { connection_id, budget_id } = await req.json()
    if (!connection_id || !budget_id) {
      return NextResponse.json({ error: 'Missing connection_id or budget_id' }, { status: 400 })
    }

    // Verify this connection belongs to the authenticated user
    const { data: connection } = await supabase
      .from('plaid_connections')
      .select('access_token')
      .eq('id', connection_id)
      .eq('user_id', user.id)
      .single()

    if (!connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })

    const endDate   = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const response = await plaidClient.transactionsGet({
      access_token: connection.access_token,
      start_date:   startDate,
      end_date:     endDate,
      options:      { count: 250, offset: 0 },
    })

    const plaidTxs = response.data.transactions
    let imported = 0

    for (const tx of plaidTxs) {
      // Skip credits (negative in Plaid = money coming in) and $0 transactions
      if (tx.amount <= 0) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('transactions') as any).insert({
        user_id:              user.id,
        budget_id,
        bucket_id:            null,
        date:                 tx.date,
        vendor:               tx.merchant_name ?? tx.name,
        amount:               tx.amount,
        notes:                null,
        receipt_base64:       null,
        plaid_transaction_id: tx.transaction_id,
      })

      // error.code 23505 = unique_violation (already imported) — skip silently
      if (!error) imported++
    }

    await supabase
      .from('plaid_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connection_id)

    return NextResponse.json({ imported })
  } catch (err) {
    console.error('sync-transactions error:', err)
    return NextResponse.json({ error: 'Failed to sync transactions' }, { status: 500 })
  }
}
