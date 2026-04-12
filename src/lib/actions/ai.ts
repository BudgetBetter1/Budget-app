'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

// ── AI Category Suggestion ────────────────────────────────────
export type CategorySuggestion =
  | { type: 'existing'; name: string }   // matched an existing category
  | { type: 'new';      name: string }   // suggests creating a new one

export async function suggestCategory(
  vendor: string,
  categoryNames: string[],
): Promise<CategorySuggestion | null> {
  if (!vendor.trim()) return null

  const hasExisting = categoryNames.length > 0

  const system = hasExisting
    ? `You are a budget categorization assistant. Given a vendor name and existing categories, respond with ONLY one of:
- The exact name of the best matching category if it is a good fit
- NEW: [Category Name] to suggest a new category if none fit well
Keep suggested names short (1-3 words). Examples: Groceries, Dining Out, Home & Auto, Health, Subscriptions.`
    : `You are a budget categorization assistant. Given a vendor name, suggest a short budget category (1-3 words). Respond with ONLY the category name.`

  const userMsg = hasExisting
    ? `Vendor: ${vendor}. Existing categories: ${categoryNames.join(', ')}`
    : `Vendor: ${vendor}`

  const text = await callClaude(system, userMsg)
  if (!text || text.toUpperCase() === 'NONE') return null

  // Parse "NEW: Category Name"
  if (text.startsWith('NEW:')) {
    const newName = text.slice(4).trim()
    return newName ? { type: 'new', name: newName } : null
  }

  // Try case-insensitive match against existing
  if (hasExisting) {
    const match = categoryNames.find(n => n.toLowerCase() === text.toLowerCase())
    if (match) return { type: 'existing', name: match }
  }

  // AI returned something that doesn't match — treat as new suggestion
  return { type: 'new', name: text }
}

// ── Create a suggested category (allocated $0, editable later) ─
export async function createSuggestedCategory(
  budgetId: string,
  name: string,
): Promise<{ id: string; name: string; allocated_amount: number; budget_id: string; created_at: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('buckets')
    .insert({ budget_id: budgetId, name: name.trim(), allocated_amount: 0 })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/budgets/${budgetId}`)
  return data
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
