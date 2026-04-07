import { pct, barColor } from '@/utils/format'

interface Props {
  spent: number
  total: number
  showLabel?: boolean
}

export default function ProgressBar({ spent, total, showLabel = true }: Props) {
  const p = pct(spent, total)
  const color = barColor(spent, total)

  return (
    <div className="w-full">
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${p}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-400 mt-1 text-right">{p}% used</p>
      )}
    </div>
  )
}
