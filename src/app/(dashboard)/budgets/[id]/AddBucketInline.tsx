'use client'

import { useState } from 'react'
import BucketForm from '@/components/BucketForm'
import { PlusCircle } from 'lucide-react'

export default function AddBucketInline({ budgetId }: { budgetId: string }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        <PlusCircle className="w-4 h-4" /> Add Category
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">New Category</h3>
      <BucketForm budgetId={budgetId} onDone={() => setOpen(false)} />
      <button
        onClick={() => setOpen(false)}
        className="mt-2 text-xs text-gray-400 hover:text-gray-600"
      >
        Cancel
      </button>
    </div>
  )
}
