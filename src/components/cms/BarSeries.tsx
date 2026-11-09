export function BarSeries({
  label,
  data,
  height = 'h-40',
}: {
  label: string
  data: Array<{ label: string; value: number }>
  height?: string
}) {
  const peak = Math.max(1, ...data.map((entry) => entry.value))
  return (
    <ol
      aria-label={label}
      className={`flex ${height} items-end gap-2 rounded-xl border bg-card p-4`}
    >
      {data.map((entry) => (
        <li
          key={entry.label}
          title={`${entry.label}: ${entry.value}`}
          className="flex h-full flex-1 flex-col items-center justify-end gap-1"
        >
          <span className="nff-caption text-muted-foreground">{entry.value}</span>
          <div
            className="w-full rounded-t bg-primary"
            style={{ height: `${(entry.value / peak) * 100}%` }}
          />
          <span className="nff-caption text-muted-foreground">{entry.label}</span>
        </li>
      ))}
    </ol>
  )
}
