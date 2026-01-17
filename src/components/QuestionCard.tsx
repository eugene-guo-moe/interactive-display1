'use client'

import { ReactNode } from 'react'

interface OptionProps {
  emoji: string
  text: string
  selected: boolean
  onClick: () => void
  index: number
  totalOptions: number
}

function Option({ emoji, text, selected, onClick, index, totalOptions }: OptionProps) {
  // For 2 options (question 3), make them full width
  const gridClass = totalOptions === 2 ? 'col-span-2' : ''

  return (
    <button
      onClick={onClick}
      className={`${gridClass} btn-press relative w-full h-full min-h-[120px] md:min-h-[140px] p-4 md:p-5 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-3 ${
        selected
          ? 'bg-gold/10 border-2 border-gold shadow-lg shadow-gold/20 scale-[1.02]'
          : 'bg-white/[0.03] border border-white/10 hover:border-gold/40 hover:bg-white/[0.05] hover:scale-[1.01]'
      }`}
      style={{
        animationDelay: `${index * 0.1}s`,
      }}
    >
      {/* Selection checkmark */}
      {selected && (
        <div className="absolute top-3 right-3 w-7 h-7 bg-gold rounded-full flex items-center justify-center shadow-md shadow-gold/30">
          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Emoji */}
      <span className="text-4xl md:text-5xl">{emoji}</span>

      {/* Text */}
      <span className={`font-medium text-center text-sm md:text-base leading-tight px-1 transition-colors ${
        selected ? 'text-gold-light' : 'text-white/80'
      }`}>
        {text}
      </span>
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
        <div key={i} className="flex items-center">
          {/* Step dot */}
          <div className={`relative w-10 h-10 rounded-full flex items-center justify-center font-display font-semibold text-sm transition-all duration-500 ${
            i + 1 === current
              ? 'bg-gold text-black scale-110 shadow-lg shadow-gold/30'
              : i + 1 < current
                ? 'bg-gold/20 text-gold border border-gold/40'
                : 'bg-white/5 text-white/30 border border-white/10'
          }`}>
            {i + 1 < current ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              i + 1
            )}
            {/* Active subtle glow */}
            {i + 1 === current && (
              <div className="absolute inset-0 rounded-full bg-gold animate-ping opacity-20" />
            )}
          </div>

          {/* Connector line */}
          {i < total - 1 && (
            <div className={`w-8 md:w-12 h-px mx-1 transition-all duration-500 ${
              i + 1 < current
                ? 'bg-gold/50'
                : 'bg-white/10'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

interface QuestionCardProps {
  questionNumber: number
  totalQuestions: number
  question: string
  questionIcon?: string
  options: { label: string; text: string; emoji?: string }[]
  selectedAnswer: string | null
  onSelect: (answer: string) => void
  children?: ReactNode
}

export default function QuestionCard({
  questionNumber,
  totalQuestions,
  question,
  questionIcon,
  options,
  selectedAnswer,
  onSelect,
  children,
}: QuestionCardProps) {
  return (
    <div className="relative flex-1 flex flex-col p-4 md:p-6 page-transition overflow-hidden">
      {/* Subtle background decoration - luxury gold shimmer */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-gold/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-gold/3 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Step indicator */}
      <div className="relative z-10 mb-8">
        <StepIndicator current={questionNumber} total={totalQuestions} />
      </div>

      {/* Question section */}
      <div className="relative z-10 mb-8 text-center">
        {/* Question icon */}
        {questionIcon && (
          <div className="text-4xl mb-4 animate-float opacity-90">
            {questionIcon}
          </div>
        )}

        {/* Question text */}
        <h2 className="font-display text-xl md:text-2xl font-semibold text-white/90 leading-tight max-w-xl mx-auto tracking-tight">
          {question}
        </h2>
      </div>

      {/* Options - 2x2 Grid with stagger animation */}
      <div className="relative z-10 flex-1 grid grid-cols-2 gap-3 md:gap-4 mb-6 max-w-2xl mx-auto w-full stagger-children">
        {options.map((option, index) => (
          <Option
            key={option.label}
            emoji={option.emoji || option.label}
            text={option.text}
            selected={selectedAnswer === option.label}
            onClick={() => onSelect(option.label)}
            index={index}
            totalOptions={options.length}
          />
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="relative z-10 max-w-xl mx-auto w-full">
        {children}
      </div>
    </div>
  )
}
