import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient } from '@/lib/plaid'
import { Products, CountryCode } from 'plaid'

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'BudgetApp',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us, CountryCode.Ca],
      language: 'en',
    })

    return NextResponse.json({ link_token: response.data.link_token })
  } catch (err) {
    console.error('create-link-token error:', err)
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 })
  }
}
