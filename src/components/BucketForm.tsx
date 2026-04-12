'use client'

import { useState, useTransition } from 'react'
import { createBucket, updateBucket } from '@/lib/actions/buckets'
import { Bucket } from '@/lib/types'

interface Props {
  budgetId: string
  bucket?: Bucket
  onDone?: () => void
}

export default function BucketForm({ budgetId, bucket, onDone }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (bucket) {
          await updateBucket(bucket.id, budgetId, formData)
        } else {
          await createBucket(budgetId, formData)
        }
        onDone?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
        <input
          name="name"
          required
          defaultValue={bucket?.name}
          placeholder="e.g. Groceries, Rent, Marketing"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Allocated Amount ($)</label>
        <input
          name="allocated_amount"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={bucket?.allocated_amount}
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
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
      >
        {isPending ? 'Saving…' : bucket ? 'Save Changes' : 'Add Category'}
      </button>
    </form>
  )
}
