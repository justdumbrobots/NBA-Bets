/**
 * GradeTag — small badge for pick grades.
 * Variants: PENDING, W, L, PUSH
 */
export default function GradeTag({ grade, size = 'sm' }) {
  const config = {
    PENDING: {
      label: 'Pending',
      classes: 'bg-gray-700 text-gray-300 border-gray-600',
    },
    W: {
      label: 'Win',
      classes: 'bg-green-900/60 text-green-400 border-green-700',
    },
    L: {
      label: 'Loss',
      classes: 'bg-red-900/60 text-red-400 border-red-700',
    },
    PUSH: {
      label: 'Push',
      classes: 'bg-yellow-900/60 text-yellow-400 border-yellow-700',
    },
  }

  const { label, classes } = config[grade] || config.PENDING

  const sizeClasses = size === 'xs'
    ? 'text-xs px-1.5 py-0.5'
    : 'text-xs px-2 py-0.5 font-semibold'

  return (
    <span className={`inline-flex items-center rounded border ${sizeClasses} ${classes} uppercase tracking-wide`}>
      {label}
    </span>
  )
}
