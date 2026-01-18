export interface TriviaQuestion {
  id: number
  question: string
  options: { label: string; text: string }[]
  correctAnswer: string
}

export const triviaQuestions: TriviaQuestion[] = [
  {
    id: 1,
    question: 'Who founded Singapore as a British trading post in 1819?',
    options: [
      { label: 'A', text: 'Sir Thomas Raffles' },
      { label: 'B', text: 'Sir Stamford Raffles' },
      { label: 'C', text: 'Sir William Raffles' },
      { label: 'D', text: 'Sir James Raffles' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 2,
    question: 'When did Singapore gain independence?',
    options: [
      { label: 'A', text: '1959' },
      { label: 'B', text: '1963' },
      { label: 'C', text: '1965' },
      { label: 'D', text: '1967' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 3,
    question: 'In what year was the iconic Merlion statue first unveiled?',
    options: [
      { label: 'A', text: '1964' },
      { label: 'B', text: '1972' },
      { label: 'C', text: '1980' },
      { label: 'D', text: '1985' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 4,
    question: 'Which cinema, opened in 1907, was the first in Singapore to screen "talkies" (films with sound)?',
    options: [
      { label: 'A', text: 'The Capitol' },
      { label: 'B', text: 'The Pavilion' },
      { label: 'C', text: 'The Alhambra' },
      { label: 'D', text: 'The Majestic' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 5,
    question: 'Which area was once home to Malay royalty and is now a heritage district?',
    options: [
      { label: 'A', text: 'Chinatown' },
      { label: 'B', text: 'Little India' },
      { label: 'C', text: 'Kampong Glam' },
      { label: 'D', text: 'Geylang Serai' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 6,
    question: 'When did the old National Library on Stamford Road open?',
    options: [
      { label: 'A', text: '1950' },
      { label: 'B', text: '1955' },
      { label: 'C', text: '1960' },
      { label: 'D', text: '1965' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 7,
    question: 'In what year was Haw Par Villa built?',
    options: [
      { label: 'A', text: '1927' },
      { label: 'B', text: '1937' },
      { label: 'C', text: '1947' },
      { label: 'D', text: '1957' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 8,
    question: 'Approximately how many people live in Singapore today?',
    options: [
      { label: 'A', text: '4.5 million' },
      { label: 'B', text: '5.2 million' },
      { label: 'C', text: '6.1 million' },
      { label: 'D', text: '7.5 million' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 9,
    question: 'How many islands make up Singapore?',
    options: [
      { label: 'A', text: '1' },
      { label: 'B', text: '23' },
      { label: 'C', text: '63' },
      { label: 'D', text: '108' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 10,
    question: 'For how many consecutive years (2013-2020) was Changi Airport voted the world\'s best by Skytrax?',
    options: [
      { label: 'A', text: '5 years' },
      { label: 'B', text: '8 years' },
      { label: 'C', text: '10 years' },
      { label: 'D', text: '12 years' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 11,
    question: 'Approximately how many hawker centres are there in Singapore?',
    options: [
      { label: 'A', text: 'Over 50' },
      { label: 'B', text: 'Over 80' },
      { label: 'C', text: 'Over 110' },
      { label: 'D', text: 'Over 150' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 12,
    question: 'When did the Singapore Botanic Gardens become a UNESCO World Heritage Site?',
    options: [
      { label: 'A', text: '2005' },
      { label: 'B', text: '2010' },
      { label: 'C', text: '2015' },
      { label: 'D', text: '2020' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 13,
    question: 'How many hectares does Gardens by the Bay span?',
    options: [
      { label: 'A', text: '50 hectares' },
      { label: 'B', text: '75 hectares' },
      { label: 'C', text: '101 hectares' },
      { label: 'D', text: '150 hectares' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 14,
    question: 'How many passengers does the MRT system carry daily?',
    options: [
      { label: 'A', text: 'Over 1 million' },
      { label: 'B', text: 'Over 2 million' },
      { label: 'C', text: 'Over 3 million' },
      { label: 'D', text: 'Over 4 million' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 15,
    question: 'In what year was Singapore\'s Smart Nation initiative launched?',
    options: [
      { label: 'A', text: '2010' },
      { label: 'B', text: '2014' },
      { label: 'C', text: '2018' },
      { label: 'D', text: '2020' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 16,
    question: 'What percentage of buildings does Singapore plan to be green-certified by 2030?',
    options: [
      { label: 'A', text: '50%' },
      { label: 'B', text: '65%' },
      { label: 'C', text: '80%' },
      { label: 'D', text: '95%' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 17,
    question: 'By what year does Singapore plan to phase out petrol and diesel vehicles?',
    options: [
      { label: 'A', text: '2030' },
      { label: 'B', text: '2035' },
      { label: 'C', text: '2040' },
      { label: 'D', text: '2050' },
    ],
    correctAnswer: 'C',
  },
  {
    id: 18,
    question: 'What will the Tuas Mega Port be when completed?',
    options: [
      { label: 'A', text: 'World\'s largest cruise terminal' },
      { label: 'B', text: 'World\'s largest fully automated terminal' },
      { label: 'C', text: 'World\'s busiest cargo hub' },
      { label: 'D', text: 'World\'s first floating port' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 19,
    question: 'In what decade was the Singapore River cleanup completed?',
    options: [
      { label: 'A', text: '1970s' },
      { label: 'B', text: '1980s' },
      { label: 'C', text: '1990s' },
      { label: 'D', text: '2000s' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 20,
    question: 'What is Jewel Changi Airport famous for having?',
    options: [
      { label: 'A', text: 'World\'s largest indoor garden' },
      { label: 'B', text: 'World\'s tallest indoor waterfall' },
      { label: 'C', text: 'World\'s longest indoor bridge' },
      { label: 'D', text: 'World\'s biggest indoor playground' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 21,
    question: 'How many statues depicting Chinese folklore are in Haw Par Villa?',
    options: [
      { label: 'A', text: 'Over 500' },
      { label: 'B', text: 'Over 750' },
      { label: 'C', text: 'Over 1,000' },
      { label: 'D', text: 'Over 1,500' },
    ],
    correctAnswer: 'C',
  },
]

// Fisher-Yates shuffle algorithm
export function shuffleQuestions(questions: TriviaQuestion[]): TriviaQuestion[] {
  const shuffled = [...questions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
