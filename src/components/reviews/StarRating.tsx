/**
 * StarRating — purely presentational.
 * Renders 1-5 filled/empty stars with optional numeric label.
 */
interface Props {
  rating:    number   // 1-5, supports decimals for average display
  max?:      number   // default 5
  size?:     'sm' | 'md' | 'lg'
  showValue?: boolean
}

export function StarRating({ rating, max = 5, size = 'md', showValue = false }: Props) {
  const sizeCls = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-6 w-6' }[size]

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = rating >= i + 1
        const half   = !filled && rating >= i + 0.5
        return (
          <svg
            key={i}
            className={sizeCls}
            viewBox="0 0 24 24"
            aria-hidden
          >
            {half ? (
              <>
                <defs>
                  <linearGradient id={`half-${i}`}>
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="50%" stopColor="#E5E7EB" />
                  </linearGradient>
                </defs>
                <path
                  fill={`url(#half-${i})`}
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                />
              </>
            ) : (
              <path
                fill={filled ? '#F59E0B' : '#E5E7EB'}
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              />
            )}
          </svg>
        )
      })}
      {showValue && (
        <span className="ml-1 text-sm font-semibold text-gray-700">{rating.toFixed(1)}</span>
      )}
    </span>
  )
}
