'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createTransaction, updateTransaction } from '@/lib/actions/transactions'
import { suggestBucket } from '@/lib/actions/ai'
import { Bucket, Transaction } from '@/lib/types'
import { Upload, X, Sparkles, FileText, Camera } from 'lucide-react'

interface Props {
  budgetId: string
  buckets: Bucket[]
  transaction?: Transaction
}

// Resize + convert to JPEG base64. Works on mobile Safari and Chrome:
// - Uses an Image element (not ImageBitmap) for broadest compatibility
// - Defers object URL revocation until after drawImage, not in onload
async function fileToBase64(file: File): Promise<string> {
  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const img       = new window.Image()
      const objectUrl = URL.createObjectURL(file)

      img.onload = () => {
        try {
          const MAX_W  = 1200
          const scale  = Math.min(1, MAX_W / img.naturalWidth)
          const canvas = document.createElement('canvas')
          canvas.width  = Math.round(img.naturalWidth  * scale)
          canvas.height = Math.round(img.naturalHeight * scale)
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Canvas context unavailable')
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          // Revoke only after drawing is done
          URL.revokeObjectURL(objectUrl)
          resolve(canvas.toDataURL('image/jpeg', 0.75))
        } catch (err) {
          URL.revokeObjectURL(objectUrl)
          reject(err)
        }
      }
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Image failed to load'))
      }
      // Set crossOrigin before src to avoid tainted-canvas issues
      img.crossOrigin = 'anonymous'
      img.src = objectUrl
    })
  }

  // PDF or other binary: raw FileReader base64
  return new Promise((resolve, reject) => {
    const reader   = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

export default function TransactionForm({ budgetId, buckets, transaction }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]            = useState<string | null>(null)
  const [clearReceipt, setClearReceipt] = useState(false)
  const fileRef   = useRef<HTMLInputElement>(null)
  const vendorRef = useRef<HTMLInputElement>(null)

  // Selected-file preview state
  const [selectedFile, setSelectedFile]   = useState<File | null>(null)
  const [previewUrl,   setPreviewUrl]     = useState<string | null>(null)

  // AI suggestion state
  const [selectedBucketId, setSelectedBucketId] = useState<string>(transaction?.bucket_id ?? '')
  const [aiSuggestion, setAiSuggestion]         = useState<string | null>(null)
  const [isSuggesting, setIsSuggesting]         = useState(false)

  // Clean up object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const today           = new Date().toISOString().split('T')[0]
  const existingReceipt = transaction?.receipt_base64 ?? transaction?.receipt_url ?? null

  // Which receipt panel to show:
  // 1. newFilePreview — user just picked a file (takes priority)
  // 2. existingPanel  — saved receipt on an existing transaction
  // 3. dropzone       — nothing selected yet
  const showNewPreview = selectedFile !== null
  const showExisting   = !showNewPreview && !!existingReceipt && !clearReceipt
  const showDropzone   = !showNewPreview && !showExisting

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    // Revoke any previous preview URL
    if (previewUrl) URL.revokeObjectURL(previewUrl)

    if (!file) {
      setSelectedFile(null)
      setPreviewUrl(null)
      return
    }

    setSelectedFile(file)
    // Create object URL immediately for instant preview — no async needed
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null) // PDF: show icon instead
    }
  }

  function clearSelectedFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    // Reset the file input so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSuggestBucket() {
    const vendor = vendorRef.current?.value?.trim()
    if (!vendor || buckets.length === 0) return
    setIsSuggesting(true)
    setAiSuggestion(null)
    try {
      const suggestion = await suggestBucket(vendor, buckets.map(b => b.name))
      if (suggestion) {
        const matched = buckets.find(b => b.name === suggestion)
        if (matched) {
          setAiSuggestion(suggestion)
          setSelectedBucketId(matched.id)
        }
      }
    } catch { /* silent — do not break the form */ }
    setIsSuggesting(false)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.delete('receipt') // remove the raw file input; we'll send base64 instead

    startTransition(async () => {
      try {
        if (selectedFile && selectedFile.size > 0) {
          const base64 = await fileToBase64(selectedFile)
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

      {/* Vendor with AI suggest */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Vendor / Payee</label>
        <div className="flex gap-2">
          <input
            ref={vendorRef}
            name="vendor"
            required
            defaultValue={transaction?.vendor}
            placeholder="e.g. Whole Foods, AWS, Landlord"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {buckets.length > 0 && (
            <button
              type="button"
              onClick={handleSuggestBucket}
              disabled={isSuggesting}
              title="AI-suggest a category based on vendor name"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors disabled:opacity-50 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isSuggesting ? 'Thinking…' : 'Suggest Category'}
            </button>
          )}
        </div>
      </div>

      {/* AI suggestion banner */}
      {aiSuggestion && (
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700 truncate">
              <span className="font-semibold">AI suggested:</span> {aiSuggestion}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAiSuggestion(null)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded transition-colors"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => { setAiSuggestion(null); setSelectedBucketId('') }}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded transition-colors"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Bucket select — controlled so AI can pre-select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          name="bucket_id"
          value={selectedBucketId}
          onChange={e => { setSelectedBucketId(e.target.value); setAiSuggestion(null) }}
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

      {/* ── Receipt Upload ─────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Receipt <span className="text-gray-400">(optional, image or PDF)</span>
        </label>

        {/* Hidden file input — always in the DOM so ref stays valid */}
        <input
          ref={fileRef}
          name="receipt"
          type="file"
          accept="image/*,.pdf"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Panel 1: newly selected file preview */}
        {showNewPreview && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
            {previewUrl ? (
              /* Image preview */
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="w-full max-h-64 object-contain bg-white"
                />
                {/* Overlay badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                  <Camera className="w-3 h-3" />
                  Receipt selected
                </div>
              </div>
            ) : (
              /* PDF or unsupported: icon + name */
              <div className="flex items-center gap-3 px-4 py-5">
                <div className="w-12 h-12 bg-white rounded-lg border border-emerald-200 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-800 truncate">{selectedFile?.name}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">PDF receipt selected</p>
                </div>
              </div>
            )}

            {/* Footer: filename + retake button */}
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-t border-emerald-200 bg-emerald-50">
              <p className="text-xs text-emerald-700 font-medium truncate">
                {selectedFile?.name}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Panel 2: existing saved receipt */}
        {showExisting && (
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            {transaction?.receipt_base64 ? (
              <img
                src={transaction.receipt_base64}
                alt="Saved receipt"
                className="h-20 rounded-lg object-contain border border-gray-200 bg-white shrink-0"
              />
            ) : (
              <a
                href={existingReceipt!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex-1 truncate"
              >
                View current receipt
              </a>
            )}
            <div className="flex flex-col items-end gap-2 ml-auto shrink-0">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => setClearReceipt(true)}
                className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          </div>
        )}

        {/* Panel 3: dropzone — no file selected */}
        {showDropzone && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Upload className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Tap to take photo or upload</p>
              <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, PDF up to 4 MB</p>
            </div>
          </button>
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
