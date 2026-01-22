export interface QuizAnswers {
  q1: string | null  // Singapore's Past - early years
  q2: string | null  // Singapore's Past - lessons
  q3: string | null  // Singapore's Past - challenges
  q4: string | null  // Future - what Singapore known for
  q5: string | null  // Future - what matters in crisis
  q6: string | null  // Future - your role
}

export type ProfileType =
  | 'guardian'        // 🛡️ The Steady Guardian
  | 'builder'         // 🤝 The Community Builder
  | 'shaper'          // 🚀 The Future Shaper
  | 'guardian-builder' // 🛡️🤝 Guardian–Builder
  | 'builder-shaper'  // 🤝🚀 Builder–Shaper
  | 'adaptive-guardian' // 🛡️🚀 Adaptive Guardian

export interface Profile {
  type: ProfileType
  emoji: string
  icon: string  // Path to icon image
  title: string
  tagline: string
  description: string
  strength: string
}

export const profiles: Record<ProfileType, Profile> = {
  guardian: {
    type: 'guardian',
    emoji: '🛡️',
    icon: '/icons/shield.svg',
    title: 'The Steady Guardian',
    tagline: 'You believe that Singapore stays strong when we are prepared.',
    description: "You understand that Singapore's survival has never been guaranteed. From learning the lessons of the past to preparing for future challenges, you value stability, security, and readiness. In times of uncertainty, people like you will act with integrity, and stay calm, informed, and dependable.",
    strength: 'You help ensure Singapore remains safe and resilient, no matter what comes our way.',
  },
  builder: {
    type: 'builder',
    emoji: '🤝',
    icon: '/icons/handshake.svg',
    title: 'The Community Builder',
    tagline: 'You believe Singapore is strongest when its people stand together.',
    description: "You see unity as Singapore's greatest asset — in the past, present, and future. You value empathy, cooperation, and looking out for others, especially in times of crisis. You understand that Total Defence is not just about strong systems, but about people.",
    strength: 'You help keep Singapore cohesive, caring, and united.',
  },
  shaper: {
    type: 'shaper',
    emoji: '🚀',
    icon: '/icons/rocket.svg',
    title: 'The Future Shaper',
    tagline: 'You believe Singapore must keep evolving to stay relevant.',
    description: 'You are inspired by how Singapore adapted against the odds and believe that the future demands the same courage to change. You embrace learning, innovation, and new ideas. When challenges arise, you step up to contribute and to help Singapore move forward.',
    strength: 'You help Singapore stay agile, innovative, and future-ready.',
  },
  'guardian-builder': {
    type: 'guardian-builder',
    emoji: '🛡️🤝',
    icon: '/icons/shield.svg',
    title: 'Guardian–Builder',
    tagline: 'You believe security and unity go hand in hand.',
    description: 'You understand that strong systems alone are not enough—people must also trust and support one another. You value preparedness and responsibility, while also recognising the importance of care and unity within society. In crises, you help keep Singapore both steady and united.',
    strength: 'Keeping Singapore safe while strengthening social bonds.',
  },
  'builder-shaper': {
    type: 'builder-shaper',
    emoji: '🤝🚀',
    icon: '/icons/handshake.svg',
    title: 'Builder–Shaper',
    tagline: 'You believe progress works best when it brings people along.',
    description: "You care deeply about communities and relationships, while also embracing change and new ideas. You believe Singapore's future depends on innovation that strengthens social unity. You support growth that is inclusive and forward-looking.",
    strength: 'Driving change while keeping society inclusive and united.',
  },
  'adaptive-guardian': {
    type: 'adaptive-guardian',
    emoji: '🛡️🚀',
    icon: '/icons/shield.svg',
    title: 'Adaptive Guardian',
    tagline: 'You believe Singapore must be secure, but never stagnant.',
    description: 'You value preparedness, resilience, and strong foundations, while recognising that new challenges require innovative solutions. You believe Singapore can stay safe by being adaptable and forward-thinking, without losing what has kept it strong.',
    strength: 'Helping Singapore remain resilient and secure in a changing world.',
  },
}
