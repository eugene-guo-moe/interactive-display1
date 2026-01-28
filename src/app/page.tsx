'use client'

import { useRouter } from 'next/navigation'
import { useQuiz } from '@/context/QuizContext'
import { useEffect, useState } from 'react'

export default function WelcomePage() {
  const router = useRouter()
  const { resetQuiz } = useQuiz()
  const [phase, setPhase] = useState(0)

  // Reset quiz state when landing on welcome page
  useEffect(() => {
    resetQuiz()
  }, [resetQuiz])

  // Trigger FAL.ai warm-up on mount to reduce cold starts
  // By the time user completes quiz (~90-120s), the model will be warm
  useEffect(() => {
    // Fire-and-forget warm-up request
    fetch('/api/warm-up', { method: 'POST' }).catch(() => {
      // Silent failure - warm-up is best-effort optimization
    })
  }, [])

  // Auto-cycle through phases
  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(p => (p + 1) % 3)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleStart = () => {
    router.push('/question/1')
  }

  const phases = [
    {
      word: 'Remember',
      sub: 'our past',
      color: '#D4A574',
      // Chinatown Singapore - vibrant old buildings by Kush Dwivedi - FREE
      image: 'https://images.unsplash.com/photo-1694270290097-af940b76313e?w=1920&q=80',
      overlay: 'rgba(26, 16, 8, 0.6)'
    },
    {
      word: 'Celebrate',
      sub: 'our present',
      color: '#7DD3C0',
      // Marina Bay Sands aerial sunset - FREE by Hu Chen
      image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1920&q=80',
      overlay: 'rgba(8, 26, 26, 0.5)'
    },
    {
      word: 'Dream',
      sub: 'our future',
      color: '#93C5FD',
      // TRON-style light trails - FREE by kevin laminto
      image: 'https://images.unsplash.com/photo-1519608220182-b0ee9d0f54d6?w=1920&q=80',
      overlay: 'rgba(10, 15, 30, 0.45)'
    }
  ]

  const current = phases[phase]

  return (
    <div
      className="flex-1 flex items-center justify-center overflow-x-hidden relative"
      style={{ backgroundColor: '#050505' }}
    >
      {/* Background images with smooth crossfade only - no zoom */}
      {phases.map((p, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
          style={{
            opacity: i === phase ? 1 : 0
          }}
        >
          {/* Image - static, slightly zoomed to cover edges */}
          <div
            className="absolute inset-[-5%] bg-cover bg-center"
            style={{
              backgroundImage: `url(${p.image})`
            }}
          />
          {/* Dark overlay */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: p.overlay }}
          />
        </div>
      ))}

      {/* Radial glow on top */}
      <div
        className="absolute inset-0 z-10 transition-all duration-1000 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${current.color}20 0%, transparent 60%)`
        }}
      />

      {/* Vignette effect */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.4) 100%)'
        }}
      />

      {/* Main content */}
      <div className="relative z-20 text-center px-6">
        <p
          key={`word-${phase}`}
          className="font-display text-6xl sm:text-7xl md:text-[10rem] lg:text-[12rem] font-bold leading-none animate-breathe drop-shadow-2xl"
          style={{
            color: current.color,
            textShadow: `0 0 80px ${current.color}40`
          }}
        >
          {current.word}
        </p>
        <p
          key={`sub-${phase}`}
          className="text-xl sm:text-2xl md:text-4xl text-white/60 mt-4 animate-fade-up"
        >
          {current.sub}
        </p>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-44 sm:bottom-40 left-1/2 -translate-x-1/2 flex gap-4 z-20">
        {phases.map((p, i) => (
          <button
            key={i}
            onClick={() => setPhase(i)}
            className="w-3 h-3 rounded-full transition-all duration-500 backdrop-blur-sm"
            style={{
              backgroundColor: i === phase ? p.color : 'rgba(255,255,255,0.3)',
              transform: i === phase ? 'scale(1.5)' : 'scale(1)',
              boxShadow: i === phase ? `0 0 20px ${p.color}60` : 'none'
            }}
          />
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={handleStart}
        className="absolute bottom-16 sm:bottom-12 left-1/2 -translate-x-1/2 px-10 py-4 bg-white/95 hover:bg-white text-[#1e3a5f] font-semibold text-lg rounded-full shadow-2xl shadow-white/20 hover:shadow-white/40 hover:scale-105 transition-all z-20"
      >
        Begin Your Journey
      </button>

      {/* School indicator */}
      <p className="absolute top-4 sm:top-8 left-1/2 -translate-x-1/2 text-white/40 text-xs sm:text-sm tracking-widest z-20 text-center px-4">
        RIVERSIDE SECONDARY SCHOOL, SINGAPORE
      </p>

      {/* AI badge - left on mobile, moves to right with time on desktop */}
      <div className="absolute top-4 sm:top-8 left-6 sm:left-auto sm:right-8 flex items-center gap-1.5 text-white/30 text-xs z-20">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        AI
        <span className="hidden sm:inline w-px h-3 bg-white/20 mx-1.5" />
        <span className="hidden sm:flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          5 mins
        </span>
      </div>

      {/* Time badge - right on mobile only */}
      <div className="absolute top-4 right-6 flex sm:hidden items-center gap-1.5 text-white/30 text-xs z-20">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        5 mins
      </div>

      {/* Preload images */}
      {phases.map((p, i) => (
        <link key={`preload-${i}`} rel="preload" as="image" href={p.image} />
      ))}

      <style jsx>{`
        @keyframes breathe {
          0% { opacity: 0; transform: scale(0.95); }
          20% { opacity: 1; transform: scale(1); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.02); }
        }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(10px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-5px); }
        }
        .animate-breathe { animation: breathe 4s ease-in-out; }
        .animate-fade-up { animation: fadeUp 4s ease-in-out; }
      `}</style>
    </div>
  )
}
