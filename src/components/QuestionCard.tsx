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
      className={`py-4 md:py-5 lg:py-6 xl:py-7 2xl:py-8 px-5 md:px-6 lg:px-7 xl:px-8 2xl:px-10 rounded-2xl backdrop-blur-md border transition-all duration-300 flex flex-col items-center justify-center ${
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      } ${
        selected
          ? 'bg-white/95 text-[#1e3a5f] border-white shadow-xl'
          : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40'
      }`}
    >
      <span className={`inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 xl:w-8 xl:h-8 rounded text-xs md:text-sm font-bold mb-2 md:mb-3 ${
        selected
          ? 'bg-[#1e3a5f] text-white'
          : 'bg-white/20 text-white/80'
      }`}>
        {label}
      </span>
      <span className="font-medium text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl leading-snug block text-center">{text}</span>
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
      <div className="relative z-10 flex-1 flex flex-col p-4 md:p-6 lg:p-8 xl:p-10 2xl:p-12 overflow-y-auto">
        {/* Step indicator */}
        <div className="mb-4 md:mb-5 lg:mb-6 pt-2 flex-shrink-0">
          <StepIndicator current={questionNumber} total={totalQuestions} />
        </div>

        {/* Question section with typewriter */}
        <div className="mb-4 md:mb-6 lg:mb-8 text-center px-4 flex-shrink-0">
          <h2 className="font-display text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-semibold text-white leading-relaxed max-w-2xl xl:max-w-3xl 2xl:max-w-4xl mx-auto drop-shadow-lg">
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
            className={`grid w-full gap-3 md:gap-4 lg:gap-5 ${
              options.length === 3
                ? 'grid-cols-1 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl 2xl:max-w-3xl'
                : 'grid-cols-2 max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl'
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
        <div className={`mt-4 md:mt-6 lg:mt-8 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto w-full px-4 pb-4 md:pb-6 flex-shrink-0 transition-all duration-300 ${
          showBackButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}>
          {children}
        </div>
      </div>
    </div>
  )
}
