'use client'

import { ReactNode, useState, useEffect, useLayoutEffect, useRef } from 'react'

interface OptionProps {
  label: string
  text: string
  selected: boolean
  onClick: () => void
  visible: boolean
  setRef?: (el: HTMLButtonElement | null) => void
  equalHeight?: number | null
}

function Option({ label, text, selected, onClick, visible, setRef, equalHeight }: OptionProps) {
  return (
    <button
      ref={setRef}
      onClick={onClick}
      style={equalHeight ? { height: `${equalHeight}px` } : undefined}
      className={`p-5 md:p-8 lg:p-10 rounded-2xl backdrop-blur-md border transition-all duration-300 min-h-[88px] md:min-h-[120px] ${
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      } ${
        selected
          ? 'bg-white/95 text-[#1e3a5f] border-white shadow-xl'
          : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40'
      }`}
    >
      <span className={`inline-block px-2.5 py-1 rounded text-xs md:text-sm font-bold mb-2 md:mb-4 ${
        selected
          ? 'bg-[#1e3a5f] text-white'
          : 'bg-white/20 text-white/80'
      }`}>
        {label}
      </span>
      <span className="font-medium text-sm md:text-base lg:text-lg leading-relaxed block">{text}</span>
    </button>
  )
}

interface StepIndicatorProps {
  current: number
  total: number
}

function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${
          i + 1 === current
            ? 'bg-white scale-125'
            : i + 1 < current
              ? 'bg-white/60'
              : 'bg-white/30'
        }`} />
      ))}
    </div>
  )
}

interface QuestionCardProps {
  questionNumber: number
  totalQuestions: number
  question: string
  questionIcon?: string
  backgroundImage?: string
  options: { label: string; text: string; emoji?: string }[]
  selectedAnswer: string | null
  onSelect: (answer: string) => void
  children?: ReactNode
}

export default function QuestionCard({
  questionNumber,
  totalQuestions,
  question,
  backgroundImage,
  options,
  selectedAnswer,
  onSelect,
  children,
}: QuestionCardProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [showOptions, setShowOptions] = useState<number[]>([])
  const [typingComplete, setTypingComplete] = useState(false)
  const [showBackButton, setShowBackButton] = useState(false)
  const [equalHeight, setEqualHeight] = useState<number | null>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const gridRef = useRef<HTMLDivElement | null>(null)

  // Measure and set equal heights immediately on mount (before options animate in)
  const measureHeights = () => {
    const grid = gridRef.current
    if (!grid) return

    // Temporarily set grid to not stretch items so we can measure natural heights
    grid.style.alignItems = 'start'

    // Force a reflow to apply the style
    grid.offsetHeight

    const heights = optionRefs.current
      .filter(ref => ref !== null)
      .map(ref => ref!.offsetHeight)

    if (heights.length === options.length && heights.length > 0) {
      const maxHeight = Math.max(...heights)
      setEqualHeight(maxHeight)
    }

    // Restore grid alignment
    grid.style.alignItems = ''
  }

  // Use useLayoutEffect to measure before browser paints
  useLayoutEffect(() => {
    setEqualHeight(null)
    optionRefs.current = []

    // Small delay to ensure refs are set after render
    const timer = setTimeout(measureHeights, 10)
    return () => clearTimeout(timer)
  }, [questionNumber, options.length])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setEqualHeight(null)
      requestAnimationFrame(() => {
        measureHeights()
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [options.length])

  // Typewriter effect
  useEffect(() => {
    setDisplayedText('')
    setShowOptions([])
    setTypingComplete(false)
    setShowBackButton(false)

    let i = 0
    const typeInterval = setInterval(() => {
      if (i < question.length) {
        setDisplayedText(question.slice(0, i + 1))
        i++
      } else {
        clearInterval(typeInterval)
        setTypingComplete(true)
        // Show options after typing completes (slower stagger)
        options.forEach((_, idx) => {
          setTimeout(() => setShowOptions(prev => [...prev, idx]), 500 + idx * 350)
        })
        // Show back button after all options
        setTimeout(() => setShowBackButton(true), 500 + options.length * 350 + 300)
      }
    }, 30)

    return () => clearInterval(typeInterval)
  }, [questionNumber, question, options])

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none transition-opacity duration-500"
        style={{ backgroundImage: `url(${backgroundImage || 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1920&q=80'})` }}
      />
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col p-4 md:p-6">
        {/* Step indicator */}
        <div className="mb-6 pt-2">
          <StepIndicator current={questionNumber} total={totalQuestions} />
        </div>

        {/* Question section with typewriter */}
        <div className="mb-8 text-center px-4">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-white leading-relaxed max-w-2xl mx-auto drop-shadow-lg">
            {displayedText}
            {!typingComplete && (
              <span className="inline-block w-[3px] h-[1em] bg-white/80 ml-1 animate-pulse" />
            )}
          </h2>
        </div>

        {/* Options - Dynamic layout based on count */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-8 lg:px-12">
          <div
            ref={gridRef}
            className={`grid gap-4 md:gap-6 lg:gap-8 w-full ${
              options.length === 3
                ? 'grid-cols-1 max-w-lg'
                : 'grid-cols-2 max-w-xl lg:max-w-3xl'
            }`}
          >
            {options.map((option, index) => (
              <Option
                key={option.label}
                label={option.label}
                text={option.text}
                selected={selectedAnswer === option.label}
                onClick={() => onSelect(option.label)}
                visible={showOptions.includes(index)}
                setRef={(el) => { optionRefs.current[index] = el }}
                equalHeight={equalHeight}
              />
            ))}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className={`mt-8 max-w-xl mx-auto w-full px-4 pb-4 transition-all duration-300 ${
          showBackButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}>
          {children}
        </div>
      </div>
    </div>
  )
}
