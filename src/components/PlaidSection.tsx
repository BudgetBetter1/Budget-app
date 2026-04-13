'use client'

import { useState, useEffect } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { useRouter } from 'next/navigation'
import { Building2, RefreshCw, Plus, CheckCircle, AlertCircle } from 'lucide-react'
import { formatDate } from '@/utils/format'

export interface PlaidConnection {
  id: string
  institution_name: string
  last_synced_at: string | null
  created_at: string
}

interface Budget {
  id: string
  name: string
}

interface Props {
  connections: PlaidConnection[]
  budgets: Budget[]
}

export default function PlaidSection({ connections, budgets }: Props) {
  const router = useRouter()

  const [linkToken, setLinkToken]           = useState<string | null>(null)
  const [tokenError, setTokenError]         = useState(false)
  const [exchanging, setExchanging]         = useState(false)
  const [syncing, setSyncing]               = useState<string | null>(null)
  const [syncResult, setSyncResult]         = useState<Record<string, number>>({})
  const [selectedBudget, setSelectedBudget] = useState<string>(budgets[0]?.id ?? '')

  // Pre-fetch link token on mount so open() can be called synchronously on click
  useEffect(() => {
    fetch('/api/plaid/create-link-token', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.link_token) {
          setLinkToken(d.link_token)
        } else {
          setTokenError(true)
        }
      })
      .catch(() => setTokenError(true))
  }, [])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      setExchanging(true)
      await fetch('/api/plaid/exchange-token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          public_token:     publicToken,
          institution_name: metadata.institution?.name ?? 'Unknown Bank',
        }),
      })
      setExchanging(false)
      // Refresh token so next connect works
      fetch('/api/plaid/create-link-token', { method: 'POST' })
        .then(r => r.json())
        .then(d => setLinkToken(d.link_token ?? null))
        .catch(() => {})
      router.refresh()
    },
    onExit: () => {
      // Token is single-use — refresh it for next time
      fetch('/api/plaid/create-link-token', { method: 'POST' })
        .then(r => r.json())
        .then(d => setLinkToken(d.link_token ?? null))
        .catch(() => {})
    },
  })

  async function handleSync(connectionId: string) {
    if (!selectedBudget) return
    setSyncing(connectionId)
    setSyncResult(prev => { const n = { ...prev }; delete n[connectionId]; return n })
    try {
      const res  = await fetch('/api/plaid/sync-transactions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ connection_id: connectionId, budget_id: selectedBudget }),
      })
      const data = await res.json()
      setSyncResult(prev => ({ ...prev, [connectionId]: data.imported ?? 0 }))
      router.refresh()
    } catch { /* silent */ }
    setSyncing(null)
  }

  const buttonLabel = exchanging ? 'Connecting…' : !ready ? 'Loading…' : 'Connect Bank'

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-800">Connected Banks</h2>
        <button
          onClick={() => open()}
          disabled={!ready || exchanging}
          className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {buttonLabel}
        </button>
      </div>

      {tokenError && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">
            Could not connect to Plaid. Check that PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV are set in Vercel environment variables.
          </p>
        </div>
      )}

      {connections.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No banks connected yet.</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Connect a bank to automatically import transactions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 shrink-0">Import into:</label>
              <select
                value={selectedBudget}
                onChange={e => setSelectedBudget(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {budgets.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {connections.map(conn => (
            <div
              key={conn.id}
              className="flex items-center justify-between gap-4 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{conn.institution_name}</p>
                  <p className="text-xs text-gray-400">
                    {conn.last_synced_at
                      ? `Last synced ${formatDate(conn.last_synced_at.split('T')[0])}`
                      : 'Never synced'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {syncResult[conn.id] !== undefined && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium whitespace-nowrap">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {syncResult[conn.id]} imported
                  </span>
                )}
                <button
                  onClick={() => handleSync(conn.id)}
                  disabled={syncing === conn.id || !selectedBudget}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing === conn.id ? 'animate-spin' : ''}`} />
                  {syncing === conn.id ? 'Syncing…' : 'Sync'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
