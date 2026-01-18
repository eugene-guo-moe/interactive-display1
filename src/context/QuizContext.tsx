'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
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
  qrUrl: string | null
  setQrUrl: (url: string | null) => void
  r2Path: string | null
  setR2Path: (path: string | null) => void
  resetQuiz: () => void
  getTimePeriod: () => 'past' | 'present' | 'future'
  generationMethod: GenerationMethod
  setGenerationMethod: (method: GenerationMethod) => void
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
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [r2Path, setR2Path] = useState<string | null>(null)
  const [generationMethod, setGenerationMethod] = useState<GenerationMethod>('v1')

  const setAnswer = useCallback((question: keyof QuizAnswers, answer: string) => {
    setAnswers(prev => ({ ...prev, [question]: answer }))
  }, [])

  const resetQuiz = useCallback(() => {
    setAnswers(initialAnswers)
    setPhotoData(null)
    setResultImageUrl(null)
    setQrUrl(null)
    setR2Path(null)
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
        qrUrl,
        setQrUrl,
        r2Path,
        setR2Path,
        resetQuiz,
        getTimePeriod,
        generationMethod,
        setGenerationMethod,
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
