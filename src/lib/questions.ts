export interface Question {
  id: number
  question: string
  icon: string
  backgroundImage: string
  options: { label: string; text: string; emoji: string }[]
  answerKey: 'q1' | 'q2' | 'q3'
}

export const questions: Question[] = [
  {
    id: 1,
    question: 'What aspect of Singapore resonates with you most?',
    icon: '🇸🇬',
    backgroundImage: 'https://images.unsplash.com/photo-1536163713675-42cf53cbd4f5?w=1920&q=80',
    options: [
      { label: 'A', text: 'Kampung spirit and community bonds of the past', emoji: '🏘️' },
      { label: 'B', text: "The multicultural melting pot we've become", emoji: '🎭' },
      { label: 'C', text: "The technological hub we're building", emoji: '💻' },
      { label: 'D', text: 'The green city vision for tomorrow', emoji: '🌿' },
    ],
    answerKey: 'q1',
  },
  {
    id: 2,
    question: 'Which Singapore icon speaks to you?',
    icon: '🏛️',
    backgroundImage: 'https://images.unsplash.com/photo-1506351421178-63b52a2d2562?w=1920&q=80',
    options: [
      { label: 'A', text: 'The old National Library on Stamford Road', emoji: '📚' },
      { label: 'B', text: 'The Merlion', emoji: '🦁' },
      { label: 'C', text: 'Marina Bay Sands', emoji: '🏨' },
      { label: 'D', text: 'Jewel Changi', emoji: '💎' },
    ],
    answerKey: 'q2',
  },
  {
    id: 3,
    question: 'Where does your heart lean?',
    icon: '💫',
    backgroundImage: 'https://images.unsplash.com/photo-1585714778157-3d600c22dcaf?w=1920&q=80',
    options: [
      { label: 'A', text: 'Looking back — learning wisdom from our journey', emoji: '🏛️' },
      { label: 'B', text: 'Right here — celebrating the Singapore of today', emoji: '🇸🇬' },
      { label: 'C', text: 'Looking forward — embracing tomorrow with excitement', emoji: '🚀' },
    ],
    answerKey: 'q3',
  },
]

export function getQuestion(id: number): Question | undefined {
  return questions.find(q => q.id === id)
}
