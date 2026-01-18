'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import type { QuizAnswers } from '@/types/quiz'

export type { QuizAnswers }

export type GenerationMethod = 'v1' | 'v2'

interface QuizContextType {
  answers: QuizAnswers
  setAnswer: (question: keyof QuizAnswers, answer: string) => void
  photoData: string | null
  setPhotoData: (data: string | null) => void
  resultImageUrl: string | null
  setResultImageUrl: (url: string | null) => void
  resetQuiz: () => void
  getTimePeriod: () => 'past' | 'present' | 'future'
  generationMethod: GenerationMethod
  setGenerationMethod: (method: GenerationMethod) => void
  isHydrated: boolean
}

const initialAnswers: QuizAnswers = {
  q1: null,
  q2: null,
  q3: null,
}

const STORAGE_KEY = 'quiz-answers'

const QuizContext = createContext<QuizContextType | undefined>(undefined)

export function QuizProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<QuizAnswers>(initialAnswers)
  const [photoData, setPhotoData] = useState<string | null>(null)
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null)
  const [generationMethod, setGenerationMethod] = useState<GenerationMethod>('v1')
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setAnswers(parsed)
      }
    } catch (e) {
      // Ignore storage errors
    }
    setIsHydrated(true)
  }, [])

  const setAnswer = useCallback((question: keyof QuizAnswers, answer: string) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [question]: answer }
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newAnswers))
      } catch (e) {
        // Ignore storage errors
      }
      return newAnswers
    })
  }, [])

  const resetQuiz = useCallback(() => {
    setAnswers(initialAnswers)
    setPhotoData(null)
    setResultImageUrl(null)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      // Ignore storage errors
    }
  }, [])

  const getTimePeriod = useCallback((): 'past' | 'present' | 'future' => {
    return answers.q3 === 'A' ? 'past' : answers.q3 === 'B' ? 'present' : 'future'
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
        generationMethod,
        setGenerationMethod,
        isHydrated,
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
