'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'

interface Props {
  action: () => Promise<void>
  label?: string
  confirm?: string
}

export default function DeleteButton({
  action,
  label = 'Delete',
  confirm = 'Are you sure? This cannot be undone.',
}: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(confirm)) return
    startTransition(async () => {
      await action()
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
      {isPending ? 'Deleting…' : label}
    </button>
  )
}
