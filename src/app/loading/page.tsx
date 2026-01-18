'use client'

import { useRouter } from 'next/navigation'
import { useQuiz } from '@/context/QuizContext'
import { useEffect, useState, useRef, useCallback } from 'react'

const loadingSteps = [
  { text: 'Preparing your photo', description: 'Analyzing image quality' },
  { text: 'Creating your scene', description: 'Generating Singapore backdrop' },
  { text: 'Adding your face', description: 'Blending you into the scene' },
  { text: 'Final touches', description: 'Polishing the details' },
]

interface TriviaQuestion {
  question: string
  options: string[]
  correctIndex: number
}

const triviaPast: TriviaQuestion[] = [
  {
    question: 'Who founded Singapore as a British trading post in 1819?',
    options: ['Sir Thomas Raffles', 'Sir Stamford Raffles', 'Sir William Raffles', 'Sir James Raffles'],
    correctIndex: 1,
  },
  {
    question: 'When was the iconic Merlion statue first unveiled?',
    options: ['1965', '1972', '1980', '1959'],
    correctIndex: 1,
  },
  {
    question: 'Which district was once home to Malay royalty?',
    options: ['Chinatown', 'Little India', 'Kampong Glam', 'Orchard'],
    correctIndex: 2,
  },
  {
    question: 'When did the old National Library on Stamford Road open?',
    options: ['1950', '1955', '1960', '1965'],
    correctIndex: 2,
  },
  {
    question: 'What was Singapore\'s first cinema called?',
    options: ['Capitol', 'Alhambra', 'Cathay', 'Rex'],
    correctIndex: 1,
  },
  {
    question: 'When did the 10-year Singapore River clean-up programme take place?',
    options: ['1967-1977', '1977-1987', '1987-1997', '1997-2007'],
    correctIndex: 1,
  },
  {
    question: 'When was Haw Par Villa built?',
    options: ['1927', '1937', '1947', '1957'],
    correctIndex: 1,
  },
]

const triviaPresent: TriviaQuestion[] = [
  {
    question: 'How many islands make up Singapore?',
    options: ['44 islands', '54 islands', '64 islands', '74 islands'],
    correctIndex: 2,
  },
  {
    question: 'From 2013-2020, how many consecutive years was Changi Airport voted world\'s best?',
    options: ['5 years', '6 years', '8 years', '10 years'],
    correctIndex: 2,
  },
  {
    question: 'Approximately how many hawker centres does Singapore have?',
    options: ['Over 80', 'Over 100', 'Over 120', 'Over 150'],
    correctIndex: 2,
  },
  {
    question: 'When did Singapore Botanic Gardens become a UNESCO World Heritage Site?',
    options: ['2010', '2012', '2015', '2018'],
    correctIndex: 2,
  },
  {
    question: 'How large is Gardens by the Bay?',
    options: ['51 hectares', '76 hectares', '101 hectares', '126 hectares'],
    correctIndex: 2,
  },
  {
    question: 'How many MRT lines does Singapore currently have?',
    options: ['4 lines', '5 lines', '6 lines', '7 lines'],
    correctIndex: 2,
  },
  {
    question: 'About how many passengers does the MRT carry daily?',
    options: ['1 million', '2 million', '3 million', '4 million'],
    correctIndex: 2,
  },
]

const triviaFuture: TriviaQuestion[] = [
  {
    question: 'By what year does Singapore aim to become a Smart Nation?',
    options: ['2025', '2030', '2035', '2040'],
    correctIndex: 1,
  },
  {
    question: 'What percentage of buildings does Singapore plan to be green-certified by 2030?',
    options: ['60%', '70%', '80%', '90%'],
    correctIndex: 2,
  },
  {
    question: 'What type of vehicles is Singapore testing for future transport?',
    options: ['Flying cars', 'Autonomous vehicles', 'Hyperloop pods', 'Hover trains'],
    correctIndex: 1,
  },
  {
    question: 'What renewable energy solution is Singapore developing at sea?',
    options: ['Wind turbines', 'Wave generators', 'Floating solar farms', 'Tidal power'],
    correctIndex: 2,
  },
  {
    question: 'What will be special about the Tuas Mega Port?',
    options: ['Largest in Asia', 'Fully automated', 'Underwater docks', 'Solar powered'],
    correctIndex: 1,
  },
  {
    question: 'By when does Singapore plan to phase out petrol and diesel vehicles?',
    options: ['2030', '2035', '2040', '2050'],
    correctIndex: 2,
  },
  {
    question: 'What spaces are being developed underground in Singapore?',
    options: ['Shopping malls', 'Housing', 'Utilities & storage', 'All of the above'],
    correctIndex: 3,
  },
]

const stepDurations = [12000, 35000, 30000, 13000] // Total: 90 seconds

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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)

  const timePeriod = getTimePeriod()
  // Combine all 21 questions to avoid repeats during the 90-second loading
  const allTriviaQuestions = [...triviaPast, ...triviaPresent, ...triviaFuture]
  const currentQuestion = allTriviaQuestions[currentQuestionIndex]

  // Shuffle options for variety (memoized)
  const shuffledQuestion = useRef<{ options: string[]; correctIndex: number } | null>(null)

  const getShuffledQuestion = useCallback(() => {
    if (!currentQuestion) return null

    // Create shuffled version
    const indices = [0, 1, 2, 3]
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }

    const shuffledOptions = indices.map(i => currentQuestion.options[i])
    const newCorrectIndex = indices.indexOf(currentQuestion.correctIndex)

    return { options: shuffledOptions, correctIndex: newCorrectIndex }
  }, [currentQuestion])

  // Initialize shuffled question when question changes
  useEffect(() => {
    if (!isAnswered) {
      shuffledQuestion.current = getShuffledQuestion()
    }
  }, [currentQuestionIndex, isAnswered, getShuffledQuestion])

  const handleAnswerSelect = (index: number) => {
    if (isAnswered || !shuffledQuestion.current) return

    setSelectedAnswer(index)
    setIsAnswered(true)
    setQuestionsAnswered(prev => prev + 1)

    if (index === shuffledQuestion.current.correctIndex) {
      setScore(prev => prev + 1)
    }

    // Move to next question after delay
    setTimeout(() => {
      setSelectedAnswer(null)
      setIsAnswered(false)
      setCurrentQuestionIndex(prev => (prev + 1) % allTriviaQuestions.length)
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

    // Start slow progress animation (runs for 85 seconds to ~90%)
    const totalDuration = 85000
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
  const circleRadius = 50
  const circumference = 2 * Math.PI * circleRadius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const backgroundImage = backgroundImages[timePeriod as keyof typeof backgroundImages] || backgroundImages.present

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

  const displayQuestion = shuffledQuestion.current || { options: currentQuestion?.options || [], correctIndex: currentQuestion?.correctIndex || 0 }

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center p-4 page-transition overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      {/* Top section: Progress ring + status */}
      <div className="relative z-10 flex items-center gap-4 mb-6">
        {/* Smaller progress ring */}
        <div className="relative">
          <svg width="120" height="120" className="-rotate-90">
            <circle
              cx="60"
              cy="60"
              r={circleRadius}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="3"
            />
            <circle
              cx="60"
              cy="60"
              r={circleRadius}
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-semibold text-white">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Status text */}
        <div className="text-left">
          <h2 className="font-display text-lg font-medium text-white mb-1">
            Creating your moment
          </h2>
          <p className="text-white/40 text-sm">{loadingSteps[currentStep].text}</p>
          {/* Step dots */}
          <div className="flex gap-2 mt-2">
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
        </div>
      </div>

      {/* Trivia section */}
      <div className="relative z-10 max-w-sm w-full">
        {/* Score display */}
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[11px] text-white/40 tracking-widest uppercase">
            Test your Singapore knowledge!
          </p>
          <div className="flex items-center gap-1.5 text-white/60 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>{score}/{questionsAnswered}</span>
          </div>
        </div>

        {/* Question card */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm overflow-hidden">
          {/* Question */}
          <div className="p-4 border-b border-white/[0.06]">
            <p className="text-white/90 text-sm leading-relaxed font-medium">
              {currentQuestion?.question}
            </p>
          </div>

          {/* Options */}
          <div className="p-3 space-y-2">
            {displayQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index
              const isCorrect = index === displayQuestion.correctIndex
              const showResult = isAnswered

              let bgColor = 'bg-white/[0.03] hover:bg-white/[0.08]'
              let borderColor = 'border-white/10'
              let textColor = 'text-white/70'

              if (showResult) {
                if (isCorrect) {
                  bgColor = 'bg-green-500/20'
                  borderColor = 'border-green-500/50'
                  textColor = 'text-green-300'
                } else if (isSelected && !isCorrect) {
                  bgColor = 'bg-red-500/20'
                  borderColor = 'border-red-500/50'
                  textColor = 'text-red-300'
                } else {
                  bgColor = 'bg-white/[0.02]'
                  textColor = 'text-white/30'
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={isAnswered}
                  className={`w-full p-3 rounded-xl border ${borderColor} ${bgColor} ${textColor} text-left text-sm transition-all duration-200 flex items-center gap-3 ${!isAnswered ? 'active:scale-[0.98]' : ''}`}
                >
                  <span className={`w-6 h-6 rounded-full border ${borderColor} flex items-center justify-center text-xs font-medium shrink-0 ${showResult && isCorrect ? 'bg-green-500/30' : ''} ${showResult && isSelected && !isCorrect ? 'bg-red-500/30' : ''}`}>
                    {showResult && isCorrect ? '✓' : showResult && isSelected ? '✗' : String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Question progress */}
        <div className="flex justify-center gap-1 mt-4">
          {allTriviaQuestions.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentQuestionIndex
                  ? 'w-4 bg-white/60'
                  : index < currentQuestionIndex || (questionsAnswered > 0 && index < questionsAnswered % allTriviaQuestions.length)
                    ? 'w-1.5 bg-white/40'
                    : 'w-1.5 bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
