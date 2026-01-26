'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import type { QuizAnswers, ProfileType, Profile } from '@/types/quiz'
import { profiles } from '@/types/quiz'

export type { QuizAnswers, ProfileType, Profile }
export { profiles }

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
  getProfile: () => Profile
  getProfileType: () => ProfileType
  generationMethod: GenerationMethod
  setGenerationMethod: (method: GenerationMethod) => void
  hydrated: boolean
}

const initialAnswers: QuizAnswers = {
  q1: null,
  q2: null,
  q3: null,
  q4: null,
  q5: null,
  q6: null,
}

const QuizContext = createContext<QuizContextType | undefined>(undefined)

/**
 * Calculate profile based on answer distribution
 * A = Guardian (security, preparedness)
 * B = Steward (community, unity)
 * C = Shaper (innovation, adaptability)
 */
function calculateProfile(answers: QuizAnswers): ProfileType {
  const allAnswers = [answers.q1, answers.q2, answers.q3, answers.q4, answers.q5, answers.q6]
  const futureAnswers = [answers.q4, answers.q5, answers.q6] // Q4-6 used for tiebreaker

  // Count occurrences
  const counts = { A: 0, B: 0, C: 0 }
  const futureCounts = { A: 0, B: 0, C: 0 }

  allAnswers.forEach(answer => {
    if (answer === 'A') counts.A++
    else if (answer === 'B') counts.B++
    else if (answer === 'C') counts.C++
  })

  futureAnswers.forEach(answer => {
    if (answer === 'A') futureCounts.A++
    else if (answer === 'B') futureCounts.B++
    else if (answer === 'C') futureCounts.C++
  })

  // Sort by count descending
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]) as [string, number][]
  const [first, second, third] = sorted

  // If clear dominant (first > second)
  if (first[1] > second[1]) {
    // Pure profile
    if (first[0] === 'A') return 'guardian'
    if (first[0] === 'B') return 'steward'
    return 'shaper'
  }

  // Two-way tie for dominant - use future questions as tiebreaker
  if (first[1] === second[1] && first[1] > third[1]) {
    const tiedLetters = [first[0], second[0]].sort() // alphabetical: ['A','B'], ['A','C'], or ['B','C']

    // Determine primary using future questions
    const futureFirst = futureCounts[tiedLetters[0] as keyof typeof futureCounts]
    const futureSecond = futureCounts[tiedLetters[1] as keyof typeof futureCounts]

    let primary: string, secondary: string
    if (futureFirst > futureSecond) {
      primary = tiedLetters[0]
      secondary = tiedLetters[1]
    } else if (futureSecond > futureFirst) {
      primary = tiedLetters[1]
      secondary = tiedLetters[0]
    } else {
      // Still tied - use Q6 as final tiebreaker
      if (answers.q6 === tiedLetters[0]) {
        primary = tiedLetters[0]
        secondary = tiedLetters[1]
      } else if (answers.q6 === tiedLetters[1]) {
        primary = tiedLetters[1]
        secondary = tiedLetters[0]
      } else {
        // Default to alphabetical order
        primary = tiedLetters[0]
        secondary = tiedLetters[1]
      }
    }

    // Return hybrid profile based on primary/secondary
    if ((primary === 'A' && secondary === 'B') || (primary === 'B' && secondary === 'A')) {
      return 'guardian-steward'
    }
    if ((primary === 'B' && secondary === 'C') || (primary === 'C' && secondary === 'B')) {
      return 'steward-shaper'
    }
    if ((primary === 'A' && secondary === 'C') || (primary === 'C' && secondary === 'A')) {
      return 'adaptive-guardian'
    }
  }

  // Three-way tie (2-2-2) - use future questions only
  const futureSorted = Object.entries(futureCounts).sort((a, b) => b[1] - a[1]) as [string, number][]
  const [futureFirst, futureSecond] = futureSorted

  if (futureFirst[1] > futureSecond[1]) {
    // Clear winner in future questions
    if (futureFirst[0] === 'A') return 'guardian'
    if (futureFirst[0] === 'B') return 'steward'
    return 'shaper'
  }

  // Use Q6 as final tiebreaker
  if (answers.q6 === 'A') return 'guardian'
  if (answers.q6 === 'B') return 'steward'
  if (answers.q6 === 'C') return 'shaper'

  // Default fallback
  return 'steward'
}

const STORAGE_KEY = 'quiz-state'

function loadFromSession(): { answers?: QuizAnswers; resultImageUrl?: string; qrUrl?: string; r2Path?: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch { return null }
}

function saveToSession(data: { answers: QuizAnswers; resultImageUrl: string | null; qrUrl: string | null; r2Path: string | null }) {
  if (typeof window === 'undefined') return
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

export function QuizProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<QuizAnswers>(initialAnswers)
  const [photoData, setPhotoData] = useState<string | null>(null)
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [r2Path, setR2Path] = useState<string | null>(null)
  const [generationMethod, setGenerationMethod] = useState<GenerationMethod>('v1')
  const [hydrated, setHydrated] = useState(false)

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const saved = loadFromSession()
    if (saved) {
      if (saved.answers) setAnswers(saved.answers)
      if (saved.resultImageUrl) setResultImageUrl(saved.resultImageUrl)
      if (saved.qrUrl) setQrUrl(saved.qrUrl)
      if (saved.r2Path) setR2Path(saved.r2Path)
    }
    setHydrated(true)
  }, [])

  // Persist key state to sessionStorage after hydration
  useEffect(() => {
    if (!hydrated) return
    saveToSession({ answers, resultImageUrl, qrUrl, r2Path })
  }, [answers, resultImageUrl, qrUrl, r2Path, hydrated])

  const setAnswer = useCallback((question: keyof QuizAnswers, answer: string) => {
    setAnswers(prev => ({ ...prev, [question]: answer }))
  }, [])

  const resetQuiz = useCallback(() => {
    setAnswers(initialAnswers)
    setPhotoData(null)
    setResultImageUrl(null)
    setQrUrl(null)
    setR2Path(null)
    if (typeof window !== 'undefined') {
      try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
    }
  }, [])

  const getProfileType = useCallback((): ProfileType => {
    return calculateProfile(answers)
  }, [answers])

  const getProfile = useCallback((): Profile => {
    const profileType = calculateProfile(answers)
    return profiles[profileType]
  }, [answers])

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
        getProfile,
        getProfileType,
        generationMethod,
        setGenerationMethod,
        hydrated,
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
