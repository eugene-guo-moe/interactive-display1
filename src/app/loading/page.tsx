'use client'

import { useRouter } from 'next/navigation'
import { useQuiz } from '@/context/QuizContext'
import { useEffect, useState, useRef } from 'react'

const loadingSteps = [
  { text: 'Preparing your photo', icon: '📸', description: 'Analyzing image quality' },
  { text: 'Creating your scene', icon: '🎨', description: 'Generating Singapore backdrop' },
  { text: 'Adding your face', icon: '✨', description: 'Blending you into the scene' },
  { text: 'Final touches', icon: '🎬', description: 'Polishing the details' },
]

const funFactsPast = [
  'Singapore was founded as a British trading post in 1819 by Sir Stamford Raffles.',
  'The iconic Merlion statue was first unveiled in 1972 at the mouth of the Singapore River.',
  'Kampong Glam was once home to the Malay royalty and is now a vibrant heritage district.',
  'The old National Library on Stamford Road opened in 1960 and became a beloved landmark.',
]

const funFactsFuture = [
  'Singapore aims to be a Smart Nation with AI-powered services by 2030.',
  'The city plans to have 80% of buildings be green-certified by 2030.',
  'Autonomous vehicles are being tested on Singapore roads for future transport.',
  'Singapore is developing floating solar farms to boost renewable energy.',
]

const stepDurations = [5000, 15000, 12000, 8000]

export default function LoadingPage() {
  const router = useRouter()
  const { photoData, answers, setResultImageUrl, getTimePeriod } = useQuiz()
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [currentFact, setCurrentFact] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const hasStarted = useRef(false)
  const isComplete = useRef(false)

  const timePeriod = getTimePeriod()
  const funFacts = timePeriod === 'past' ? funFactsPast : funFactsFuture

  // Rotate fun facts
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact(prev => (prev + 1) % funFacts.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [funFacts.length])

  useEffect(() => {
    // Redirect if no photo data
    if (!photoData || !answers.q1 || !answers.q2 || !answers.q3) {
      router.push('/')
      return
    }

    // Prevent double execution
    if (hasStarted.current) return
    hasStarted.current = true

    // Start slow progress animation (runs for 40 seconds to ~90%)
    const totalDuration = 40000 // 40 seconds
    const maxProgress = 90 // Only go to 90% until done
    const startTime = Date.now()

    const animateProgress = () => {
      if (isComplete.current) return

      const elapsed = Date.now() - startTime
      const progressPercent = Math.min((elapsed / totalDuration) * maxProgress, maxProgress)

      // Calculate which step we're on
      let stepTime = 0
      for (let i = 0; i < stepDurations.length; i++) {
        stepTime += stepDurations[i]
        if (elapsed < stepTime) {
          setCurrentStep(i)
          break
        }
      }

      setProgress(progressPercent)

      if (elapsed < totalDuration && !isComplete.current) {
        requestAnimationFrame(animateProgress)
      }
    }

    requestAnimationFrame(animateProgress)

    // Start the image generation process
    async function generateImage() {
      try {
        // Call the actual API
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photo: photoData,
            answers: answers,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.details || 'Failed to generate image')
        }

        const data = await response.json()

        // Mark as complete and jump to 100%
        isComplete.current = true
        setResultImageUrl(data.imageUrl)
        setProgress(100)
        setCurrentStep(loadingSteps.length - 1)

        // Navigate to result
        setTimeout(() => {
          router.push('/result')
        }, 500)
      } catch (err) {
        console.error('Generation error:', err)
        isComplete.current = true
        setError('Something went wrong. Please try again.')
      }
    }

    generateImage()
  }, [photoData, answers, router, setResultImageUrl])

  const handleRetry = () => {
    hasStarted.current = false
    setError(null)
    setProgress(0)
    setCurrentStep(0)
    window.location.reload()
  }

  const handleStartOver = () => {
    router.push('/')
  }

  // Calculate circle properties
  const circleRadius = 80
  const circumference = 2 * Math.PI * circleRadius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 page-transition">
        <div className="glass-card rounded-2xl p-10 text-center max-w-md border border-gold/10">
          <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-gold/20">
            <svg className="w-10 h-10 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-semibold text-white/90 mb-3">Something went wrong</h2>
          <p className="text-white/40 mb-8">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={handleStartOver}
              className="btn-press flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-medium hover:bg-white/10 hover:border-gold/30 transition-all"
            >
              Start Over
            </button>
            <button
              onClick={handleRetry}
              className="btn-glow flex-1 py-3 rounded-xl bg-gold text-black font-semibold hover:bg-gold-light transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 page-transition overflow-hidden">
      {/* Background decorations - subtle gold shimmer */}
      <div className={`absolute top-1/4 -left-32 w-64 h-64 rounded-full blur-3xl opacity-10 ${
        timePeriod === 'past' ? 'bg-gold' : 'bg-silver'
      }`} />
      <div className={`absolute bottom-1/4 -right-32 w-64 h-64 rounded-full blur-3xl opacity-10 ${
        timePeriod === 'past' ? 'bg-gold-light' : 'bg-silver-light'
      }`} />

      {/* Circular progress */}
      <div className="relative mb-8">
        {/* SVG Circle */}
        <svg className="w-48 h-48 -rotate-90" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r={circleRadius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="4"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r={circleRadius}
            fill="none"
            stroke={`url(#gradient-${timePeriod})`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
          />
          {/* Gradient definition - luxury gold/silver */}
          <defs>
            <linearGradient id="gradient-past" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#F7E7CE" />
            </linearGradient>
            <linearGradient id="gradient-future" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E5E4E2" />
              <stop offset="100%" stopColor="#C0C0C0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display text-4xl font-bold ${
            timePeriod === 'past' ? 'text-gold' : 'text-silver'
          }`}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Title */}
      <h2 className={`font-display text-2xl md:text-3xl font-semibold mb-2 text-center ${
        timePeriod === 'past' ? 'gradient-text-past' : 'gradient-text-future'
      }`}>
        {timePeriod === 'past' ? 'Traveling Back in Time' : 'Jumping to the Future'}
      </h2>
      <p className="text-white/30 text-sm mb-8">Creating your Singapore moment</p>

      {/* Step timeline - luxury styling */}
      <div className="w-full max-w-sm mb-8">
        <div className="flex justify-between relative">
          {/* Connecting line */}
          <div className="absolute top-4 left-0 right-0 h-px bg-white/10" />
          <div
            className={`absolute top-4 left-0 h-px transition-all duration-500 ${
              timePeriod === 'past' ? 'bg-gold' : 'bg-silver'
            }`}
            style={{ width: `${(currentStep / (loadingSteps.length - 1)) * 100}%` }}
          />

          {loadingSteps.map((step, index) => (
            <div key={index} className="relative flex flex-col items-center z-10">
              {/* Step circle */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${
                index < currentStep
                  ? timePeriod === 'past'
                    ? 'bg-gold text-black'
                    : 'bg-silver text-black'
                  : index === currentStep
                    ? timePeriod === 'past'
                      ? 'bg-gold/20 ring-1 ring-gold'
                      : 'bg-silver/20 ring-1 ring-silver'
                    : 'bg-white/5 border border-white/10'
              }`}>
                {index < currentStep ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className={index === currentStep ? '' : 'opacity-30'}>{step.icon}</span>
                )}
              </div>

              {/* Step label (only for current) */}
              {index === currentStep && (
                <div className="absolute top-12 whitespace-nowrap text-center">
                  <p className={`text-sm font-medium ${
                    timePeriod === 'past' ? 'text-gold' : 'text-silver'
                  }`}>
                    {step.text}
                  </p>
                  <p className="text-xs text-white/30">{step.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Spacer for step label */}
      <div className="h-12" />

      {/* Fun fact card - luxury styling */}
      <div className="glass-card rounded-xl p-5 max-w-md w-full border border-gold/10">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
            timePeriod === 'past' ? 'bg-gold/10 ring-1 ring-gold/20' : 'bg-silver/10 ring-1 ring-silver/20'
          }`}>
            <svg className={`w-5 h-5 ${timePeriod === 'past' ? 'text-gold' : 'text-silver'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
          </div>
          <div className="flex-1 min-h-[3rem]">
            <p className="text-xs text-white/30 mb-1 tracking-wide uppercase">Did you know?</p>
            <p className="text-sm text-white/60 leading-relaxed transition-opacity duration-500">
              {funFacts[currentFact]}
            </p>
          </div>
        </div>
        {/* Fact indicators */}
        <div className="flex justify-center gap-1.5 mt-4">
          {funFacts.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentFact
                  ? `w-6 ${timePeriod === 'past' ? 'bg-gold' : 'bg-silver'}`
                  : 'w-1.5 bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
