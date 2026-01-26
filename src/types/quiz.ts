export interface QuizAnswers {
  q1: string | null  // Securing Our Smart Nation
  q2: string | null  // Stewarding Our Heritage
  q3: string | null  // Meritocracy in Society
  q4: string | null  // Tech for All
  q5: string | null  // Uplifting Lower-Wage Workers
  q6: string | null  // Integrating Foreign Workers
}

export type ProfileType =
  | 'guardian'         // 🛡️ The Steady Guardian
  | 'steward'          // 🤝 The Community Steward
  | 'shaper'           // 🚀 The Future Shaper
  | 'guardian-steward' // 🛡️🤝 Guardian–Steward
  | 'steward-shaper'   // 🤝🚀 Steward–Shaper
  | 'adaptive-guardian' // 🛡️🚀 Adaptive Guardian

export interface Profile {
  type: ProfileType
  icon: string
  title: string
  tagline: string
  description: string
  strength: string
}

export const profiles: Record<ProfileType, Profile> = {
  guardian: {
    type: 'guardian',
    icon: '/icon-guardian.png',
    title: 'The Steady Guardian',
    tagline: 'You believe Singapore stays strong when we are prepared.',
    description: "You understand that Singapore's security has never been guaranteed. You value stability, vigilance, and learning from the past to prepare for future challenges. In moments of uncertainty, you act with integrity, staying calm, informed, and dependable.",
    strength: 'Ensuring Singapore remains safe, steady, and resilient—no matter what lies ahead.',
  },
  steward: {
    type: 'steward',
    icon: '/icon-builder.png',
    title: 'The Community Steward',
    tagline: 'You believe Singapore is strongest when its people stand together.',
    description: "You see unity as Singapore's greatest asset. You value empathy, cooperation, and shared responsibility, especially in times of uncertainty. You understand that resilience is built not only through systems, but through trust and care between people.",
    strength: 'Keeping Singapore cohesive, caring, and united across generations and communities.',
  },
  shaper: {
    type: 'shaper',
    icon: '/icon-shaper.png',
    title: 'The Future Shaper',
    tagline: 'You believe Singapore must keep evolving to stay relevant.',
    description: 'You are inspired by how Singapore has adapted against the odds and believe the future demands the same courage to change. You embrace learning, innovation, and fresh ideas, stepping forward when challenges call for new thinking.',
    strength: 'Helping Singapore remain agile, innovative, and future-ready.',
  },
  'guardian-steward': {
    type: 'guardian-steward',
    icon: '/icon-guardian-builder.png',
    title: 'The Guardian–Steward',
    tagline: 'You believe security and unity go hand in hand.',
    description: 'You recognise that strong safeguards matter, but trust and social cohesion matter just as much. You value preparedness alongside compassion, and understand that stability is strongest when people feel protected and supported.',
    strength: 'Safeguarding Singapore while strengthening the bonds that hold society together.',
  },
  'steward-shaper': {
    type: 'steward-shaper',
    icon: '/icon-builder-shaper.png',
    title: 'The Steward–Shaper',
    tagline: 'You believe progress works best when it brings people along.',
    description: "You care deeply about communities while embracing innovation and change. You believe Singapore's growth should be inclusive, ensuring that new ideas and technologies uplift society as a whole.",
    strength: 'Driving forward-looking change that strengthens unity and inclusion.',
  },
  'adaptive-guardian': {
    type: 'adaptive-guardian',
    icon: '/icon-adaptive-guardian.png',
    title: 'The Adaptive Guardian',
    tagline: 'You believe Singapore must be secure, but never stagnant.',
    description: 'You value strong foundations and preparedness, while recognising that new challenges demand adaptability and innovation. You believe Singapore stays resilient by evolving thoughtfully, without losing what has kept it strong.',
    strength: 'Helping Singapore remain secure, resilient, and adaptable in a changing world.',
  },
}
