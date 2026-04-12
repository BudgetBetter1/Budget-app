'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBulkBuckets } from '@/lib/actions/buckets'
import { Check, Plus, X } from 'lucide-react'

const SUGGESTIONS = [
  'Groceries',
  'Dining Out',
  'Transportation',
  'Utilities',
  'Subscriptions',
  'Health',
  'Entertainment',
  'Clothing',
  'Home & Auto',
  'Savings',
]

interface Props {
  budgetId: string
}

export default function OnboardingClient({ budgetId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [custom, setCustom] = useState('')
  const [extras, setExtras] = useState<string[]>([])

  function toggle(name: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function addCustom() {
    const trimmed = custom.trim()
    if (!trimmed || extras.includes(trimmed) || SUGGESTIONS.includes(trimmed)) return
    setExtras(prev => [...prev, trimmed])
    setSelected(prev => new Set([...Array.from(prev), trimmed]))
    setCustom('')
  }

  function removeExtra(name: string) {
    setExtras(prev => prev.filter(e => e !== name))
    setSelected(prev => { const next = new Set(prev); next.delete(name); return next })
  }

  function handleSkip() {
    router.push(`/budgets/${budgetId}`)
  }

  function handleCreate() {
    const names = Array.from(selected)
    startTransition(async () => {
      if (names.length > 0) {
        await createBulkBuckets(budgetId, names)
      }
      router.push(`/budgets/${budgetId}`)
    })
  }

  const allOptions = [...SUGGESTIONS, ...extras]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">
        Pick categories to track
      </h2>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {allOptions.map(name => {
          const on = selected.has(name)
          const isExtra = extras.includes(name)
          return (
            <button
              key={name}
              onClick={() => toggle(name)}
              className={`flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-full border font-medium transition-all ${
                on
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {on && <Check className="w-3.5 h-3.5" />}
              {name}
              {isExtra && !on && (
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); removeExtra(name) }}
                  className="ml-1 text-gray-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Custom category input */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          placeholder="Add your own…"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addCustom}
          disabled={!custom.trim()}
          className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleSkip}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip for now
        </button>
        <button
          onClick={handleCreate}
          disabled={isPending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          {isPending ? 'Creating…' : `Create ${selected.size > 0 ? selected.size + ' ' : ''}categor${selected.size === 1 ? 'y' : 'ies'}`}
        </button>
      </div>
    </div>
  )
}
