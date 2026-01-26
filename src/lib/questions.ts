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
    scenario: 'A coordinated cyberattack has disrupted digital services across Singapore. Fake messages are spreading rapidly, and public confidence in online systems is wavering.',
    icon: '🔒',
    backgroundImage: backgrounds[0],
    backgroundSize: '115%',
    backgroundPosition: '45% center',
    options: [
      { label: 'A', text: 'Lock down affected systems and tighten cybersecurity regulations to restore trust and protect citizens.', emoji: '🛡️' },
      { label: 'B', text: 'Activate community networks and digital literacy groups to help citizens verify information and stay calm.', emoji: '🤝' },
      { label: 'C', text: 'Deploy AI-driven monitoring and adaptive cyber-defence tools to counter threats in real time.', emoji: '🚀' },
    ],
    answerKey: 'q1',
  },
  {
    id: 2,
    question: 'How do you respond?',
    scenario: "A major redevelopment project threatens to erase historic neighbourhoods tied to Singapore's cultural identity. Public backlash is growing.",
    icon: '🏛️',
    backgroundImage: backgrounds[1],
    options: [
      { label: 'A', text: 'Enforce protective zoning laws to safeguard key heritage sites from redevelopment.', emoji: '🛡️' },
      { label: 'B', text: 'Bring residents, cultural groups, and planners together to co-create preservation solutions.', emoji: '🤝' },
      { label: 'C', text: 'Use digital archives, AR experiences, and smart urban design to integrate heritage into new developments.', emoji: '🚀' },
    ],
    answerKey: 'q2',
  },
  {
    id: 3,
    question: 'What should be prioritised moving forward?',
    scenario: "As Singapore's society becomes more diverse and the future of work evolves, policymakers are exploring how meritocracy can continue to support opportunity and social mobility for all.",
    icon: '⚖️',
    backgroundImage: backgrounds[2],
    options: [
      { label: 'A', text: 'Uphold clear standards and structured pathways to maintain trust, fairness, and confidence in the system.', emoji: '🛡️' },
      { label: 'B', text: 'Expand mentoring and community-based support to help individuals realise their potential at every stage of life.', emoji: '🤝' },
      { label: 'C', text: 'Evolve education pathways through personalised learning and innovative approaches to meet changing needs.', emoji: '🚀' },
    ],
    answerKey: 'q3',
  },
  {
    id: 4,
    question: 'What is your priority?',
    scenario: 'As services move online, seniors and vulnerable groups struggle to access essential platforms, risking exclusion.',
    icon: '📱',
    backgroundImage: backgrounds[3],
    options: [
      { label: 'A', text: 'Guarantee baseline access and safeguards so everyone can use essential digital services securely.', emoji: '🛡️' },
      { label: 'B', text: 'Mobilise volunteers and community centres to guide and support less tech-savvy citizens.', emoji: '🤝' },
      { label: 'C', text: 'Develop intuitive, accessible platforms designed for users of all ages and abilities.', emoji: '🚀' },
    ],
    answerKey: 'q4',
  },
  {
    id: 5,
    question: 'How do you respond?',
    scenario: 'Automation and economic shifts are threatening job security for lower-wage workers, increasing anxiety about the future.',
    icon: '💼',
    backgroundImage: backgrounds[4],
    options: [
      { label: 'A', text: 'Strengthen employment protections and wage safeguards to provide stability.', emoji: '🛡️' },
      { label: 'B', text: 'Expand retraining programmes and partnerships between employers and communities.', emoji: '🤝' },
      { label: 'C', text: 'Use technology and upskilling initiatives to open new career pathways.', emoji: '🚀' },
    ],
    answerKey: 'q5',
  },
  {
    id: 6,
    question: 'What action do you take?',
    scenario: "As globalisation continues to shape Singapore's workforce, reports of increasing misunderstandings between locals and foreign workers have prompted calls for timely action to maintain social harmony in shared workplaces and neighbourhoods.",
    icon: '🌏',
    backgroundImage: backgrounds[5],
    options: [
      { label: 'A', text: 'Maintain clear policies to balance national interests and preserve social stability.', emoji: '🛡️' },
      { label: 'B', text: 'Promote intercultural dialogue and shared community spaces to build mutual understanding.', emoji: '🤝' },
      { label: 'C', text: 'Leverage digital platforms to encourage cross-cultural engagement and collaboration.', emoji: '🚀' },
    ],
    answerKey: 'q6',
  },
]

export function getQuestion(id: number): Question | undefined {
  return questions.find(q => q.id === id)
}
