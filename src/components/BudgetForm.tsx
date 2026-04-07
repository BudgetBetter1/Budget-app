'use client'

import { useState, useTransition } from 'react'
import { createBudget, updateBudget } from '@/lib/actions/budgets'
import { Budget } from '@/lib/types'

interface Props {
  budget?: Budget
}

export default function BudgetForm({ budget }: Props) {
  const [type, setType] = useState<'monthly' | 'project'>(budget?.type ?? 'monthly')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const now = new Date()
  const currentMonth = String(now.getMonth() + 1)
  const currentYear = String(now.getFullYear())

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (budget) {
          await updateBudget(budget.id, formData)
        } else {
          await createBudget(formData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="type" value={type} />

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Budget Name</label>
        <input
          name="name"
          required
          defaultValue={budget?.name}
          placeholder="e.g. April 2026 or Website Redesign"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Type toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Budget Type</label>
        <div className="flex gap-2">
          {(['monthly', 'project'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                type === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly fields */}
      {type === 'monthly' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              name="month"
              defaultValue={budget?.month ?? currentMonth}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              name="year"
              type="number"
              min="2000"
              max="2100"
              defaultValue={budget?.year ?? currentYear}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Project fields */}
      {type === 'project' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              name="start_date"
              type="date"
              required
              defaultValue={budget?.start_date ?? ''}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date <span className="text-gray-400">(optional)</span></label>
            <input
              name="end_date"
              type="date"
              defaultValue={budget?.end_date ?? ''}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Total amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Total Budget ($)</label>
        <input
          name="total_amount"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={budget?.total_amount}
          placeholder="0.00"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        {isPending ? 'Saving…' : budget ? 'Save Changes' : 'Create Budget'}
      </button>
    </form>
  )
}
