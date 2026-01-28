export interface Question {
  id: number
  question: string
  scenario: string
  icon: string
  backgroundImage: string
  backgroundPosition?: string
  backgroundSize?: string
  options: { label: string; text: string; emoji: string }[]
  answerKey: 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6'
}

// Background images (reusing existing Unsplash images)
const backgrounds = [
  'https://images.unsplash.com/photo-1589848014453-f5371e76d4ed?w=1920&q=80', // Chinatown shophouse
  'https://images.unsplash.com/photo-1750608454572-8bcf7c580986?w=1920&q=80', // Buddha Tooth Relic Temple
  'https://images.unsplash.com/photo-1634024309115-2966435f0815?w=1920&q=80', // Bumboat at Pulau Ubin
  'https://images.unsplash.com/photo-1698513924628-4f6e0e4c00f6?w=1920&q=80', // Supertrees at night
  'https://images.unsplash.com/photo-1556803816-febf2fe0d10b?w=1920&q=80', // Jewel Changi Airport
  'https://images.unsplash.com/photo-1747583286685-ee48d3e599f9?w=1920&q=80', // Marina Bay Sands at night
]

export const questions: Question[] = [
  {
    id: 1,
    question: 'What is your immediate response?',
    scenario: 'A major cyberattack disrupts digital services and spreads misinformation.',
    icon: '🔒',
    backgroundImage: backgrounds[0],
    backgroundSize: '115%',
    backgroundPosition: '45% center',
    options: [
      { label: 'A', text: 'Lock down systems and strengthen cybersecurity laws.', emoji: '🛡️' },
      { label: 'B', text: 'Mobilise communities to verify information and stay calm.', emoji: '🤝' },
      { label: 'C', text: 'Deploy AI-driven real-time cyber defence tools.', emoji: '🚀' },
    ],
    answerKey: 'q1',
  },
  {
    id: 2,
    question: 'How do you respond?',
    scenario: 'Redevelopment threatens historic neighbourhoods, sparking public backlash.',
    icon: '🏛️',
    backgroundImage: backgrounds[1],
    options: [
      { label: 'A', text: 'Protect key heritage sites through zoning laws.', emoji: '🛡️' },
      { label: 'B', text: 'Co-create solutions with residents and cultural groups.', emoji: '🤝' },
      { label: 'C', text: 'Integrate heritage using AR, digital archives, and smart design.', emoji: '🚀' },
    ],
    answerKey: 'q2',
  },
  {
    id: 3,
    question: 'What should be prioritised?',
    scenario: 'Meritocracy must evolve in a changing, diverse society like ours.',
    icon: '⚖️',
    backgroundImage: backgrounds[2],
    options: [
      { label: 'A', text: 'Clear standards and structured pathways.', emoji: '🛡️' },
      { label: 'B', text: 'Mentoring and community-based support.', emoji: '🤝' },
      { label: 'C', text: 'Personalised and innovative education pathways.', emoji: '🚀' },
    ],
    answerKey: 'q3',
  },
  {
    id: 4,
    question: 'What is your priority?',
    scenario: 'Seniors and vulnerable groups risk exclusion as services go digital.',
    icon: '📱',
    backgroundImage: backgrounds[3],
    options: [
      { label: 'A', text: 'Ensure baseline access and strong safeguards.', emoji: '🛡️' },
      { label: 'B', text: 'Community-led guidance and digital support.', emoji: '🤝' },
      { label: 'C', text: 'Design intuitive, accessible digital platforms.', emoji: '🚀' },
    ],
    answerKey: 'q4',
  },
  {
    id: 5,
    question: 'How do you respond?',
    scenario: 'Automation threatens job security for lower-wage workers.',
    icon: '💼',
    backgroundImage: backgrounds[4],
    options: [
      { label: 'A', text: 'Strengthen job and wage protections.', emoji: '🛡️' },
      { label: 'B', text: 'Expand retraining with employers and communities.', emoji: '🤝' },
      { label: 'C', text: 'Use tech-enabled upskilling to create new pathways.', emoji: '🚀' },
    ],
    answerKey: 'q5',
  },
  {
    id: 6,
    question: 'What action do you take?',
    scenario: 'Tensions between locals and foreign workers are rising.',
    icon: '🌏',
    backgroundImage: backgrounds[5],
    options: [
      { label: 'A', text: 'Maintain clear policies to preserve stability.', emoji: '🛡️' },
      { label: 'B', text: 'Promote intercultural dialogue and shared spaces.', emoji: '🤝' },
      { label: 'C', text: 'Use digital platforms for cross-cultural engagement.', emoji: '🚀' },
    ],
    answerKey: 'q6',
  },
]

export function getQuestion(id: number): Question | undefined {
  return questions.find(q => q.id === id)
}
