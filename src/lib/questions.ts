export interface Question {
  id: number
  question: string
  icon: string
  backgroundImage: string
  options: { label: string; text: string; emoji: string }[]
  answerKey: 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6'
  section: 'past' | 'future'
}

// Vintage/sepia backgrounds for Past questions (Q1-3)
const pastBackgrounds = [
  'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=1920&q=80', // Old Singapore shophouses
  'https://images.unsplash.com/photo-1694270290097-af940b76313e?w=1920&q=80', // Heritage building
  'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1920&q=80', // Historical Singapore
]

// Modern/bright backgrounds for Future questions (Q4-6)
const futureBackgrounds = [
  'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1920&q=80', // Modern Singapore skyline
  'https://images.unsplash.com/photo-1508964942454-1a56651d54ac?w=1920&q=80', // Marina Bay Sands
  'https://images.unsplash.com/photo-1519608220182-b0ee9d0f54d6?w=1920&q=80', // Futuristic cityscape
]

export const questions: Question[] = [
  // SECTION 1: Singapore's Past — "How do we understand where we came from?"
  {
    id: 1,
    question: "When you think about Singapore's early years, what stands out most to you?",
    icon: '🏛️',
    backgroundImage: pastBackgrounds[0],
    options: [
      { label: 'A', text: 'How Singapore survived despite having almost no natural resources', emoji: '💪' },
      { label: 'B', text: 'How leaders made tough decisions to ensure stability and security', emoji: '🛡️' },
      { label: 'C', text: 'How ordinary people worked together to build our nation', emoji: '🤝' },
    ],
    answerKey: 'q1',
    section: 'past',
  },
  {
    id: 2,
    question: "Which lesson from Singapore's past feels most relevant today?",
    icon: '📜',
    backgroundImage: pastBackgrounds[1],
    options: [
      { label: 'A', text: 'We cannot take peace and security for granted', emoji: '🕊️' },
      { label: 'B', text: 'Strong leadership matters most during crises', emoji: '🎯' },
      { label: 'C', text: 'Unity is our greatest strength', emoji: '💪' },
    ],
    answerKey: 'q2',
    section: 'past',
  },
  {
    id: 3,
    question: 'If you were living in early Singapore, what would you have found most challenging?',
    icon: '⏳',
    backgroundImage: pastBackgrounds[2],
    options: [
      { label: 'A', text: "The uncertainty about Singapore's future", emoji: '❓' },
      { label: 'B', text: 'The need to work with people very different from yourself', emoji: '🌏' },
      { label: 'C', text: 'Having to adapt to a changing world with limited resources', emoji: '🔄' },
    ],
    answerKey: 'q3',
    section: 'past',
  },
  // SECTION 2: Aspirations for Singapore's Future — "What kind of Singapore should we build?"
  {
    id: 4,
    question: "In 10 years' time, what do you hope Singapore will be best known for?",
    icon: '🔮',
    backgroundImage: futureBackgrounds[0],
    options: [
      { label: 'A', text: 'Being safe, secure, and well-prepared for crises', emoji: '🛡️' },
      { label: 'B', text: 'Being a caring, inclusive, and united society', emoji: '❤️' },
      { label: 'C', text: 'Being innovative, adaptable, and future-ready', emoji: '🚀' },
    ],
    answerKey: 'q4',
    section: 'future',
  },
  {
    id: 5,
    question: 'If Singapore faces a serious crisis in the future, what should matter most?',
    icon: '⚡',
    backgroundImage: futureBackgrounds[1],
    options: [
      { label: 'A', text: 'Clear plans and strong national systems, including capable leaders', emoji: '📋' },
      { label: 'B', text: 'Citizens who look out for one another', emoji: '🤗' },
      { label: 'C', text: 'People who can adapt quickly and find new solutions', emoji: '💡' },
    ],
    answerKey: 'q5',
    section: 'future',
  },
  {
    id: 6,
    question: 'As a Singaporean, how do you see your role in our future?',
    icon: '🌟',
    backgroundImage: futureBackgrounds[2],
    options: [
      { label: 'A', text: 'Acting with integrity and responsibility to keep Singapore united and strong', emoji: '🏆' },
      { label: 'B', text: 'Contributing positively to build my community and those around me', emoji: '🌱' },
      { label: 'C', text: 'Being innovative and embracing change to help Singapore navigate the future', emoji: '🔥' },
    ],
    answerKey: 'q6',
    section: 'future',
  },
]

export function getQuestion(id: number): Question | undefined {
  return questions.find(q => q.id === id)
}
