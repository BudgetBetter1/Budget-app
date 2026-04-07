'use client'

import { useState, useTransition, useRef } from 'react'
import { createTransaction, updateTransaction } from '@/lib/actions/transactions'
import { Bucket, Transaction } from '@/lib/types'
import { Upload, X } from 'lucide-react'

interface Props {
  budgetId: string
  buckets: Bucket[]
  transaction?: Transaction
}

async function fileToBase64(file: File): Promise<string> {
  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const MAX_W = 1200
        const scale = Math.min(1, MAX_W / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.onerror = reject
      img.src = objectUrl
    })
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function TransactionForm({ budgetId, buckets, transaction }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [clearReceipt, setClearReceipt] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().split('T')[0]
  const existingReceipt = transaction?.receipt_base64 ?? transaction?.receipt_url ?? null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const receiptFile = fileRef.current?.files?.[0] ?? null
    formData.delete('receipt')

    startTransition(async () => {
      try {
        if (receiptFile && receiptFile.size > 0) {
          const base64 = await fileToBase64(receiptFile)
          formData.set('receipt_base64', base64)
        }

        if (clearReceipt) formData.set('clear_receipt', '1')

        if (transaction) {
          await updateTransaction(transaction.id, formData)
        } else {
          await createTransaction(formData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="budget_id" value={budgetId} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={transaction?.date ?? today}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={transaction?.amount}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Vendor / Payee</label>
        <input
          name="vendor"
          required
          defaultValue={transaction?.vendor}
          placeholder="e.g. Whole Foods, AWS, Landlord"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bucket / Category</label>
        <select
          name="bucket_id"
          defaultValue={transaction?.bucket_id ?? ''}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Unassigned —</option>
          {buckets.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={transaction?.notes ?? ''}
          placeholder="Any details…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Receipt <span className="text-gray-400">(optional, image or PDF)</span>
        </label>

        {existingReceipt && !clearReceipt ? (
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            {transaction?.receipt_base64 ? (
              <img
                src={transaction.receipt_base64}
                alt="Receipt"
                className="h-20 rounded object-contain border border-gray-200 bg-white"
              />
            ) : (
              <a
                href={existingReceipt}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex-1 truncate"
              >
                View current receipt
              </a>
            )}
            <button
              type="button"
              onClick={() => setClearReceipt(true)}
              className="ml-auto text-xs text-red-500 hover:text-red-700 flex items-center gap-1 shrink-0"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Upload className="w-5 h-5 text-gray-400" />
            <p className="text-sm text-gray-500">
              {fileName ?? 'Click to upload receipt'}
            </p>
            <p className="text-xs text-gray-400">PNG, JPG, PDF up to 4MB</p>
            <input
              ref={fileRef}
              name="receipt"
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        {isPending ? 'Saving…' : transaction ? 'Save Changes' : 'Add Transaction'}
      </button>
    </form>
  )
}
