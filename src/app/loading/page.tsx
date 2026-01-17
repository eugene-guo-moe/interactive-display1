'use client'

import { useRouter } from 'next/navigation'
import { useQuiz } from '@/context/QuizContext'
import { useEffect, useState, useRef } from 'react'

const loadingSteps = [
  { text: 'Preparing your photo', description: 'Analyzing image quality' },
  { text: 'Creating your scene', description: 'Generating Singapore backdrop' },
  { text: 'Adding your face', description: 'Blending you into the scene' },
  { text: 'Final touches', description: 'Polishing the details' },
]

const funFactsPast = [
  'Singapore was founded as a British trading post in 1819 by Sir Stamford Raffles.',
  'The iconic Merlion statue was first unveiled in 1972 at the mouth of the Singapore River.',
  'Kampong Glam was once home to the Malay royalty and is now a vibrant heritage district.',
  'The old National Library on Stamford Road opened in 1960 and became a beloved landmark.',
]

const funFactsPresent = [
  'Singapore is home to over 5.6 million people across 63 islands.',
  'Changi Airport has been voted the world\'s best airport for 12 consecutive years.',
  'Singapore has over 80 hawker centres serving affordable local food.',
  'The Singapore Botanic Gardens is a UNESCO World Heritage Site since 2015.',
]

const funFactsFuture = [
  'Singapore aims to be a Smart Nation with AI-powered services by 2030.',
  'The city plans to have 80% of buildings be green-certified by 2030.',
  'Autonomous vehicles are being tested on Singapore roads for future transport.',
  'Singapore is developing floating solar farms to boost renewable energy.',
]

const stepDurations = [5000, 15000, 12000, 8000]

const backgroundImages = {
  past: 'https://images.unsplash.com/photo-1694270290097-af940b76313e?w=1920&q=80', // Chinatown Singapore
  present: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1920&q=80', // Marina Bay Sands
  future: 'https://images.unsplash.com/photo-1519608220182-b0ee9d0f54d6?w=1920&q=80', // TRON-style light trails
}

export default function LoadingPage() {
  const router = useRouter()
  const { photoData, answers, setResultImageUrl, getTimePeriod, generationMethod } = useQuiz()
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [currentFact, setCurrentFact] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const hasStarted = useRef(false)
  const isComplete = useRef(false)

  const timePeriod = getTimePeriod()
  const funFacts = timePeriod === 'past' ? funFactsPast : timePeriod === 'present' ? funFactsPresent : funFactsFuture

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
            generationMethod: generationMethod,
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
  }, [photoData, answers, router, setResultImageUrl, generationMethod])

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

  // Calculate circle properties for minimal ring
  const circleRadius = 70
  const circumference = 2 * Math.PI * circleRadius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const backgroundImage = backgroundImages[timePeriod as keyof typeof backgroundImages] || backgroundImages.present

  if (error) {
    return (
      <div className="relative flex-1 flex flex-col items-center justify-center p-8 page-transition">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
        <div className="relative z-10 rounded-2xl p-10 text-center max-w-md bg-white/[0.03] border border-white/10 backdrop-blur-sm">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-semibold text-white mb-3">Something went wrong</h2>
          <p className="text-white/40 mb-8">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={handleStartOver}
              className="btn-press flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-medium hover:bg-white/10 hover:border-white/20 transition-all"
            >
              Start Over
            </button>
            <button
              onClick={handleRetry}
              className="btn-press flex-1 py-3 rounded-xl bg-white text-[#0a0a0a] font-semibold hover:bg-white/90 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center p-6 page-transition">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      {/* Circular progress - Minimal Ring */}
      <div className="relative z-10 mb-8">
        <svg width="180" height="180" className="-rotate-90">
          {/* Background circle */}
          <circle
            cx="90"
            cy="90"
            r={circleRadius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="2"
          />
          {/* Progress circle */}
          <circle
            cx="90"
            cy="90"
            r={circleRadius}
            fill="none"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-semibold text-white">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Title */}
      <h2 className="relative z-10 font-display text-xl font-medium text-white mb-2 text-center">
        Creating your moment
      </h2>
      <p className="relative z-10 text-white/40 text-sm mb-8">{loadingSteps[currentStep].text}</p>

      {/* Step dots - minimal */}
      <div className="relative z-10 flex gap-3 mb-10">
        {loadingSteps.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i <= currentStep
                ? 'w-2 h-2 bg-white/90'
                : 'w-1.5 h-1.5 bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Fun fact card - minimal */}
      <div className="relative z-10 max-w-sm w-full p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm">
        <p className="text-[11px] text-white/30 mb-2 tracking-widest uppercase">Did you know?</p>
        <p className="text-sm text-white/50 leading-relaxed transition-opacity duration-500">
          {funFacts[currentFact]}
        </p>
        {/* Fact indicators */}
        <div className="flex justify-center gap-1.5 mt-4">
          {funFacts.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentFact
                  ? 'w-5 bg-white/60'
                  : 'w-1.5 bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
