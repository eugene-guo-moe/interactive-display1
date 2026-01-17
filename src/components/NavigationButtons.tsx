'use client'

interface NavigationButtonsProps {
  onBack?: () => void
  onNext: () => void
  nextDisabled?: boolean
  nextLabel?: string
  showBack?: boolean
}

export default function NavigationButtons({
  onBack,
  onNext,
  nextDisabled = false,
  nextLabel = 'Next',
  showBack = true,
}: NavigationButtonsProps) {
  return (
    <div className="flex gap-3">
      {showBack && onBack && (
        <button
          onClick={onBack}
          className="btn-press flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-white/60 font-semibold text-lg hover:bg-white/10 hover:border-white/20 hover:text-white/80 transition-all duration-300"
        >
          Back
        </button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className={`group btn-press flex-1 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
          nextDisabled
            ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
            : 'bg-gradient-to-r from-primary via-accent to-secondary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02]'
        }`}
      >
        {nextLabel}
        {!nextDisabled && (
          <svg
            className="w-5 h-5 transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        )}
      </button>
    </div>
  )
}
