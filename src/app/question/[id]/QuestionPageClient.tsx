'use client'

import { useRouter } from 'next/navigation'
import { useQuiz } from '@/context/QuizContext'
import { getQuestion, questions } from '@/lib/questions'
import QuestionCard from '@/components/QuestionCard'
import { useEffect, useState, useRef } from 'react'

export default function QuestionPageClient({ id }: { id: string }) {
  const router = useRouter()
  const { answers, setAnswer } = useQuiz()
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const isNavigating = useRef(false)

  const questionId = parseInt(id, 10)
  const question = getQuestion(questionId)
  const totalQuestions = questions.length

  // Sync selected answer with context (only on mount, not after selection)
  useEffect(() => {
    if (question && !isNavigating.current) {
      setSelectedAnswer(answers[question.answerKey])
    }
  }, [question, answers])

  // Handle invalid question ID
  if (!question) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">Question not found</p>
      </div>
    )
  }

  const handleSelect = (answer: string) => {
    if (isNavigating.current) return // Prevent double-tap

    setSelectedAnswer(answer)
    setAnswer(question.answerKey, answer)
    isNavigating.current = true

    // Auto-advance after a brief delay to show selection
    setTimeout(() => {
      if (questionId === totalQuestions) {
        router.push('/camera')
      } else {
        router.push(`/question/${questionId + 1}`)
      }
    }, 400)
  }

  const handleBack = () => {
    if (questionId === 1) {
      router.push('/')
    } else {
      router.push(`/question/${questionId - 1}`)
    }
  }

  return (
    <QuestionCard
      questionNumber={questionId}
      totalQuestions={totalQuestions}
      question={question.question}
      scenario={question.scenario}
      questionIcon={question.icon}
      backgroundImage={question.backgroundImage}
      backgroundPosition={question.backgroundPosition}
      backgroundSize={question.backgroundSize}
      options={question.options}
      selectedAnswer={selectedAnswer}
      onSelect={handleSelect}
    >
      {/* Back button */}
      <button
        onClick={handleBack}
        className="btn-press w-auto mx-auto px-6 py-2 md:py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm md:text-base font-medium hover:bg-white/10 hover:text-white hover:border-primary/30 transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
    </QuestionCard>
  )
}
