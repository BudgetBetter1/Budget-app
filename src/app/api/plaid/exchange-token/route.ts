import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient } from '@/lib/plaid'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { public_token, institution_name } = await req.json()
    if (!public_token) return NextResponse.json({ error: 'Missing public_token' }, { status: 400 })

    const response = await plaidClient.itemPublicTokenExchange({ public_token })
    const { access_token, item_id } = response.data

    const { error } = await supabase.from('plaid_connections').insert({
      user_id:          user.id,
      access_token,
      item_id,
      institution_name: institution_name ?? 'Unknown Bank',
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('exchange-token error:', err)
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 })
  }
}
