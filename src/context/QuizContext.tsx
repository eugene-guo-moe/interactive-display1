'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { QuizAnswers } from '@/types/quiz'

export type { QuizAnswers }

interface QuizContextType {
  answers: QuizAnswers
  setAnswer: (question: keyof QuizAnswers, answer: string) => void
  photoData: string | null
  setPhotoData: (data: string | null) => void
  resultImageUrl: string | null
  setResultImageUrl: (url: string | null) => void
  resetQuiz: () => void
  getTimePeriod: () => 'past' | 'future'
}

const initialAnswers: QuizAnswers = {
  q1: null,
  q2: null,
  q3: null,
}

const QuizContext = createContext<QuizContextType | undefined>(undefined)

export function QuizProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<QuizAnswers>(initialAnswers)
  const [photoData, setPhotoData] = useState<string | null>(null)
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null)

  const setAnswer = useCallback((question: keyof QuizAnswers, answer: string) => {
    setAnswers(prev => ({ ...prev, [question]: answer }))
  }, [])

  const resetQuiz = useCallback(() => {
    setAnswers(initialAnswers)
    setPhotoData(null)
    setResultImageUrl(null)
  }, [])

  const getTimePeriod = useCallback((): 'past' | 'future' => {
    return answers.q3 === 'A' ? 'past' : 'future'
  }, [answers.q3])

  return (
    <QuizContext.Provider
      value={{
        answers,
        setAnswer,
        photoData,
        setPhotoData,
        resultImageUrl,
        setResultImageUrl,
        resetQuiz,
        getTimePeriod,
      }}
    >
      {children}
    </QuizContext.Provider>
  )
}

export function useQuiz() {
  const context = useContext(QuizContext)
  if (context === undefined) {
    throw new Error('useQuiz must be used within a QuizProvider')
  }
  return context
}
