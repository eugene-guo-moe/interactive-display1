'use client'

import { useRouter } from 'next/navigation'
import { useQuiz } from '@/context/QuizContext'
import { useEffect, useState, useRef, useMemo } from 'react'
import { triviaQuestions, shuffleQuestions, TriviaQuestion } from '@/lib/triviaQuestions'

const loadingSteps = [
  { text: 'Preparing your photo', description: 'Analyzing image quality' },
  { text: 'Creating your scene', description: 'Generating Singapore backdrop' },
  { text: 'Adding your face', description: 'Blending you into the scene' },
  { text: 'Final touches', description: 'Polishing the details' },
]

const stepDurations = [4000, 12000, 10000, 4000] // Total: 30 seconds

const backgroundImages = {
  past: 'https://images.unsplash.com/photo-1694270290097-af940b76313e?w=1920&q=80',
  present: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1920&q=80',
  future: 'https://images.unsplash.com/photo-1519608220182-b0ee9d0f54d6?w=1920&q=80',
}

export default function LoadingPage() {
  const router = useRouter()
  const { photoData, answers, setResultImageUrl, getTimePeriod, generationMethod } = useQuiz()
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const hasStarted = useRef(false)
  const isComplete = useRef(false)

  // Trivia state
  const [shuffledQuestions, setShuffledQuestions] = useState<TriviaQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [showFeedback, setShowFeedback] = useState(false)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)

  const timePeriod = getTimePeriod()
  const backgroundImage = backgroundImages[timePeriod as keyof typeof backgroundImages] || backgroundImages.present

  // Shuffle questions on mount
  useEffect(() => {
    setShuffledQuestions(shuffleQuestions(triviaQuestions))
  }, [])

  const currentQuestion = shuffledQuestions[currentQuestionIndex]

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return // Prevent multiple selections

    setSelectedAnswer(answer)
    setShowFeedback(true)

    const isCorrect = answer === currentQuestion.correctAnswer
    if (isCorrect) {
      setScore(prev => prev + 1)
    }
    setQuestionsAnswered(prev => prev + 1)

    // Auto-advance to next question after delay
    setTimeout(() => {
      setSelectedAnswer(null)
      setShowFeedback(false)
      setCurrentQuestionIndex(prev => (prev + 1) % shuffledQuestions.length)
    }, 1500)
  }

  useEffect(() => {
    // Redirect if no photo data
    if (!photoData || !answers.q1 || !answers.q2 || !answers.q3) {
      router.push('/')
      return
    }

    // Prevent double execution
    if (hasStarted.current) return
    hasStarted.current = true

    // Start slow progress animation (runs for 28 seconds to ~90%)
    const totalDuration = 28000
    const maxProgress = 90
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

  if (error) {
    return (
      <div className="relative flex-1 flex flex-col items-center justify-center p-8 page-transition">
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
      <div className="relative z-10 mb-6">
        <svg width="140" height="140" className="-rotate-90">
          <circle
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="2"
          />
          <circle
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 60}
            strokeDashoffset={2 * Math.PI * 60 - (progress / 100) * 2 * Math.PI * 60}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-semibold text-white">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Title */}
      <h2 className="relative z-10 font-display text-lg font-medium text-white mb-1 text-center">
        Creating your moment
      </h2>
      <p className="relative z-10 text-white/40 text-sm mb-6">{loadingSteps[currentStep].text}</p>

      {/* Step dots */}
      <div className="relative z-10 flex gap-3 mb-6">
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

      {/* Trivia Quiz Section */}
      {currentQuestion && (
        <div className="relative z-10 max-w-sm w-full">
          {/* Section Header */}
          <h3 className="text-center text-white/70 text-sm font-medium mb-3">
            Test your Singapore knowledge while waiting!
          </h3>

          {/* Quiz Card */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm">
            {/* Score */}
            <div className="flex items-center justify-end mb-3">
              <p className="text-sm font-medium text-white/60">
                Score: {score}/{questionsAnswered}
              </p>
            </div>

            {/* Question */}
            <p className="text-sm text-white/80 font-medium mb-4 leading-relaxed">
              {currentQuestion.question}
            </p>

            {/* Options */}
            <div className="space-y-2">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswer === option.label
                const isCorrect = option.label === currentQuestion.correctAnswer
                const showCorrect = showFeedback && isCorrect
                const showWrong = showFeedback && isSelected && !isCorrect

                return (
                  <button
                    key={option.label}
                    onClick={() => handleAnswerSelect(option.label)}
                    disabled={showFeedback}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                      showCorrect
                        ? 'bg-green-500/20 border-green-500/50 text-green-300'
                        : showWrong
                        ? 'bg-red-500/20 border-red-500/50 text-red-300'
                        : isSelected
                        ? 'bg-white/10 border-white/30 text-white'
                        : 'bg-white/[0.02] border-white/[0.06] text-white/60 hover:bg-white/[0.05] hover:border-white/10'
                    } ${showFeedback ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                        showCorrect
                          ? 'bg-green-500/30 text-green-300'
                          : showWrong
                          ? 'bg-red-500/30 text-red-300'
                          : 'bg-white/10 text-white/60'
                      }`}>
                        {option.label}
                      </span>
                      <span className="text-sm">{option.text}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Question Progress Dots */}
            <div className="flex justify-center gap-1 mt-4 flex-wrap max-w-[280px] mx-auto">
              {shuffledQuestions.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                    i === currentQuestionIndex
                      ? 'bg-white/90 scale-125'
                      : i < currentQuestionIndex
                      ? 'bg-white/40'
                      : 'bg-white/15'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
