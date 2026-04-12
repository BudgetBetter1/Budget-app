'use server'

import { createClient } from '@/lib/supabase/server'

// ── Shared Anthropic fetch helper ──────────────────────────────
async function callClaude(system: string, userMessage: string): Promise<string | null> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return null

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        system,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    return (data.content?.[0]?.text as string | undefined)?.trim() ?? null
  } catch {
    return null
  }
}

// ── AI Bucket Suggestion ───────────────────────────────────────
export async function suggestBucket(vendor: string, bucketNames: string[]): Promise<string | null> {
  if (!vendor.trim() || bucketNames.length === 0) return null

  const text = await callClaude(
    'You are a budget categorization assistant. Given a vendor name and a list of budget buckets, respond with ONLY the bucket name that best matches. If none match well, respond with NONE.',
    `Vendor: ${vendor}. Available buckets: ${bucketNames.join(', ')}`
  )

  if (!text || text.toUpperCase() === 'NONE') return null
  // Case-insensitive match so minor capitalisation differences don't silently fail
  const match = bucketNames.find(n => n.toLowerCase() === text.toLowerCase())
  return match ?? null
}

// ── AI / String Receipt Match ──────────────────────────────────
export interface ReceiptMatchResult {
  sourceTxId: string
  vendor: string
  amount: number
  date: string
}

export async function findReceiptMatch(transactionId: string): Promise<ReceiptMatchResult | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Fetch the target (missing-receipt) transaction
    const { data: target } = await supabase
      .from('transactions')
      .select('id, vendor, amount, date')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single()

    if (!target) return null

    // Fetch all receipted transactions for this user (excluding itself)
    const { data: receipted } = await supabase
      .from('transactions')
      .select('id, vendor, amount, date')
      .eq('user_id', user.id)
      .not('receipt_base64', 'is', null)
      .neq('id', transactionId)

    if (!receipted || receipted.length === 0) return null

    // 1. Substring string match (case-insensitive) — fast path
    const vendorLower = target.vendor.toLowerCase()
    const stringMatch = receipted.find(
      tx =>
        tx.vendor.toLowerCase().includes(vendorLower) ||
        vendorLower.includes(tx.vendor.toLowerCase())
    )

    if (stringMatch) {
      return {
        sourceTxId: stringMatch.id,
        vendor:     stringMatch.vendor,
        amount:     Number(stringMatch.amount),
        date:       stringMatch.date,
      }
    }

    // 2. AI match fallback
    const receiptList = receipted
      .slice(0, 20)
      .map(tx => `ID: ${tx.id}, Vendor: ${tx.vendor}, Amount: $${Number(tx.amount).toFixed(2)}, Date: ${tx.date}`)
      .join('\n')

    const text = await callClaude(
      'You are a receipt matching assistant. Given a transaction missing a receipt and a list of transactions that have receipts, respond with ONLY the ID of the best matching transaction. If none seem like a good match, respond with NONE.',
      `Missing receipt: Vendor=${target.vendor}, Amount=$${Number(target.amount).toFixed(2)}, Date=${target.date}\n\nAvailable receipts:\n${receiptList}`
    )

    if (!text || text === 'NONE') return null
    const matched = receipted.find(tx => tx.id === text)
    if (!matched) return null

    return {
      sourceTxId: matched.id,
      vendor:     matched.vendor,
      amount:     Number(matched.amount),
      date:       matched.date,
    }
  } catch {
    return null
  }
}

// ── Link receipt: copy receipt_base64 from one tx to another ───
export async function linkReceipt(targetTxId: string, sourceTxId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: source } = await supabase
    .from('transactions')
    .select('receipt_base64')
    .eq('id', sourceTxId)
    .eq('user_id', user.id)
    .single()

  if (!source?.receipt_base64) throw new Error('Source receipt not found')

  const { error } = await supabase
    .from('transactions')
    .update({ receipt_base64: source.receipt_base64 })
    .eq('id', targetTxId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
}
