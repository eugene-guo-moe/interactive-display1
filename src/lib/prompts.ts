import type { QuizAnswers, ProfileType } from '@/types/quiz'

// Scene descriptions for each profile type
// IMPORTANT: Prompts focus on a SINGLE PERSON (the user) to ensure PuLID preserves their face
const profileScenes: Record<ProfileType, string> = {
  // Pure profiles
  guardian: 'a single person standing confidently wearing a plain dark blue police uniform without any text badges or logos, a white and blue police patrol car parked in the background, looking at the camera',

  builder: 'medium close-up portrait of a single person standing warmly under a Singapore HDB void deck with concrete pillars, red plastic chairs and folding tables visible behind, crowd of blurred residents mingling in the background, HDB apartment blocks visible, colorful bunting decorations, warm evening lighting, looking at the camera',

  shaper: 'a single person holding a glowing holographic tablet in futuristic Singapore, smart city architecture and digital displays in the background, autonomous vehicles on elevated roads behind them, looking at the camera',

  // Hybrid profiles - blending elements from both archetypes
  'guardian-builder': 'a single person organizing food supplies at a Singapore community soup kitchen, large pots of soup on stoves and trays of vegetables being prepared by blurred volunteers in the background, warm indoor lighting, looking at the camera',

  'builder-shaper': 'a single person leaning forward demonstrating a smartphone to an elderly person seen from behind with grey hair, pointing at the phone screen with one hand, looking warmly at the elderly person, at a Singapore community centre, warm friendly atmosphere',

  'adaptive-guardian': 'a single person standing at a modern cybersecurity operations centre, multiple screens displaying network monitoring dashboards and security alerts behind them, blue ambient lighting, looking at the camera',
}

// Style descriptions for each profile type
const profileStyles: Record<ProfileType, string> = {
  guardian: 'professional and reassuring atmosphere, organized and structured composition, warm daylight, clean and orderly, modern photography style',

  builder: 'warm and welcoming atmosphere, soft golden hour lighting, heartwarming composition with people connecting, vibrant but gentle colors, documentary photography style',

  shaper: 'dynamic and innovative atmosphere, cool blue and teal tones with accent neon highlights, sleek and modern composition, cinematic futuristic style',

  'guardian-builder': 'balanced atmosphere of security and warmth, organized yet welcoming composition, natural daylight with warm undertones, professional documentary style',

  'builder-shaper': 'optimistic and progressive atmosphere, bright and modern lighting, inclusive composition showing community and technology, contemporary lifestyle photography style',

  'adaptive-guardian': 'confident and forward-looking atmosphere, dramatic lighting with cool modern tones, dynamic composition showing strength and innovation, cinematic style',
}

/**
 * Build prompt based on profile type
 */
export function buildPrompt(profileType: ProfileType): string {
  const scene = profileScenes[profileType]
  const style = profileStyles[profileType]

  return `A photorealistic scene of ${scene}. Singapore setting with recognizable local elements. ${style}. High quality, detailed, 8k resolution. The person should be naturally integrated into the scene.`
}

/**
 * Calculate profile from answers (duplicate of context logic for API use)
 */
export function calculateProfileFromAnswers(answers: QuizAnswers): ProfileType {
  const allAnswers = [answers.q1, answers.q2, answers.q3, answers.q4, answers.q5, answers.q6]
  const futureAnswers = [answers.q4, answers.q5, answers.q6]

  const counts = { A: 0, B: 0, C: 0 }
  const futureCounts = { A: 0, B: 0, C: 0 }

  allAnswers.forEach(answer => {
    if (answer === 'A') counts.A++
    else if (answer === 'B') counts.B++
    else if (answer === 'C') counts.C++
  })

  futureAnswers.forEach(answer => {
    if (answer === 'A') futureCounts.A++
    else if (answer === 'B') futureCounts.B++
    else if (answer === 'C') futureCounts.C++
  })

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]) as [string, number][]
  const [first, second, third] = sorted

  if (first[1] > second[1]) {
    if (first[0] === 'A') return 'guardian'
    if (first[0] === 'B') return 'builder'
    return 'shaper'
  }

  if (first[1] === second[1] && first[1] > third[1]) {
    const tiedLetters = [first[0], second[0]].sort()

    const futureFirst = futureCounts[tiedLetters[0] as keyof typeof futureCounts]
    const futureSecond = futureCounts[tiedLetters[1] as keyof typeof futureCounts]

    let primary: string, secondary: string
    if (futureFirst > futureSecond) {
      primary = tiedLetters[0]
      secondary = tiedLetters[1]
    } else if (futureSecond > futureFirst) {
      primary = tiedLetters[1]
      secondary = tiedLetters[0]
    } else {
      if (answers.q6 === tiedLetters[0]) {
        primary = tiedLetters[0]
        secondary = tiedLetters[1]
      } else if (answers.q6 === tiedLetters[1]) {
        primary = tiedLetters[1]
        secondary = tiedLetters[0]
      } else {
        primary = tiedLetters[0]
        secondary = tiedLetters[1]
      }
    }

    if ((primary === 'A' && secondary === 'B') || (primary === 'B' && secondary === 'A')) {
      return 'guardian-builder'
    }
    if ((primary === 'B' && secondary === 'C') || (primary === 'C' && secondary === 'B')) {
      return 'builder-shaper'
    }
    if ((primary === 'A' && secondary === 'C') || (primary === 'C' && secondary === 'A')) {
      return 'adaptive-guardian'
    }
  }

  const futureSorted = Object.entries(futureCounts).sort((a, b) => b[1] - a[1]) as [string, number][]
  const [futureFirst, futureSecond] = futureSorted

  if (futureFirst[1] > futureSecond[1]) {
    if (futureFirst[0] === 'A') return 'guardian'
    if (futureFirst[0] === 'B') return 'builder'
    return 'shaper'
  }

  if (answers.q6 === 'A') return 'guardian'
  if (answers.q6 === 'B') return 'builder'
  if (answers.q6 === 'C') return 'shaper'

  return 'builder'
}

/**
 * Get prompt config for debugging/display
 */
export function getPromptConfig(profileType: ProfileType) {
  return {
    scene: profileScenes[profileType],
    style: profileStyles[profileType],
    profileType,
  }
}
