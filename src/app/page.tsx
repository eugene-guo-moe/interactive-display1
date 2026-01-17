'use client'

import { useRouter } from 'next/navigation'
import { useQuiz } from '@/context/QuizContext'
import { useEffect } from 'react'

export default function WelcomePage() {
  const router = useRouter()
  const { resetQuiz } = useQuiz()

  // Reset quiz state when landing on welcome page
  useEffect(() => {
    resetQuiz()
  }, [resetQuiz])

  const handleStart = () => {
    router.push('/question/1')
  }

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center p-4 md:p-8 page-transition overflow-x-hidden">
      {/* Decorative gradient line at top - gold */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      {/* Main content */}
      <div className="relative z-10 text-center w-full max-w-2xl mx-auto px-2">
        {/* Elegant badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/20 bg-gold/5 mb-8 md:mb-10">
          <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          <span className="text-gold/80 text-xs md:text-sm font-medium tracking-widest uppercase">SG60 Experience</span>
        </div>

        {/* Title with elegant glow */}
        <h1 className="font-display text-4xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
          <span className="gradient-text-past text-glow">History</span>
          <span className="text-white/40 mx-2 md:mx-3 font-light italic">vs</span>
          <span className="gradient-text-future text-glow">Future</span>
        </h1>

        {/* Subtitle with elegant styling */}
        <div className="glass-card-light rounded-xl px-6 md:px-10 py-3 md:py-4 mb-8 md:mb-10 inline-block">
          <p className="text-lg md:text-2xl font-display font-medium text-white/80 tracking-wide">
            A Singapore Story
          </p>
        </div>

        {/* Description */}
        <p className="text-white/50 mb-10 md:mb-14 text-base md:text-lg leading-relaxed max-w-md mx-auto px-2">
          Journey through time — from kampung days to smart nation.
          <br className="hidden md:block" />
          <span className="text-white/70">Create your own Singapore moment.</span>
        </p>

        {/* CTA Button - Elegant gold */}
        <button
          onClick={handleStart}
          className="btn-glow btn-pulse bg-gold hover:bg-gold-light text-black font-bold text-lg md:text-xl px-10 md:px-16 py-4 md:py-5 rounded-xl shadow-2xl shadow-gold/20 hover:shadow-gold/40 transition-all duration-400 hover:scale-[1.02]"
        >
          Begin Experience
        </button>

        {/* Footer info */}
        <div className="mt-10 md:mt-12 flex items-center justify-center gap-4 md:gap-8 text-white/30 text-xs md:text-sm">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            2 min
          </span>
          <span className="w-px h-3 bg-white/20" />
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            AI Generated
          </span>
        </div>
      </div>

      {/* Decorative gradient line at bottom - gold */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
    </div>
  )
}
