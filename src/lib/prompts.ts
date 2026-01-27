import type { QuizAnswers, ProfileType } from '@/types/quiz'

// Scene descriptions for each profile type
// IMPORTANT: Prompts focus on a SINGLE PERSON (the user) to ensure PuLID preserves their face
const profileScenes: Record<ProfileType, string> = {
  // Pure profiles
  guardian: 'medium close-up portrait of a single person standing confidently, wearing a plain dark blue police uniform with no text, badges, or logos. A white and blue police patrol car is parked behind them. The Merlion is visible in the background near Marina Bay, with the orderly civic skyline beyond. Clean public space, looking directly at the camera',

  steward: 'medium close-up portrait of a single person standing inside a Singapore Community Club. Behind the person, a clearly visible community club activity board displays posters for neighbourhood events, classes, and workshops. Multi-purpose rooms with tables and chairs are visible, and a blurred mix of residents of different ages and backgrounds are engaged in activities. The setting features clean public interiors typical of Singapore community clubs, with warm indoor lighting and an orderly, welcoming atmosphere. The person looks directly at the camera with a composed, approachable expression',

  shaper: 'a single person holding a glowing holographic tablet, standing on an elevated waterfront promenade overlooking Marina Bay. Marina Bay Sands dominates the background, integrated into a smart city skyline with illuminated data overlays, digital interfaces, and connected infrastructure. Autonomous transport routes and smart urban systems are subtly visualised around the skyline. Cool blue and teal lighting, the person stands confidently and looks directly at the camera',

  // Hybrid profiles - blending elements from both archetypes
  'guardian-steward': 'a single person organizing food supplies at a Singapore community soup kitchen located within a public service facility. Large pots of soup and trays of vegetables are in the foreground, with blurred volunteers behind. The environment resembles a neighbourhood polyclinic or community hub, warm indoor lighting, looking at the camera',

  'steward-shaper': 'a single person leaning forward demonstrating a smartphone to an elderly person seen from behind with grey hair. The scene takes place inside Jewel Changi Airport, with indoor greenery, glass architecture, and natural light filtering through. Warm, friendly atmosphere focused on inclusion and learning',

  'adaptive-guardian': 'a single person standing in a modern cybersecurity operations centre. Multiple screens display network monitoring dashboards and security alerts. Through glass walls, Changi Airport\'s control infrastructure or runway lighting is visible in the distance. Blue ambient lighting, looking confidently at the camera',
}

// Style descriptions for each profile type
const profileStyles: Record<ProfileType, string> = {
  guardian: 'professional and reassuring atmosphere, structured composition, warm tropical daylight, clean civic surroundings around Marina Bay, modern Singapore public infrastructure, contemporary photography style',

  steward: 'warm and welcoming atmosphere, soft golden hour tropical lighting, heartland community setting, everyday Singapore life, vibrant but gentle colours, documentary photography style',

  shaper: 'dynamic and innovative atmosphere, cool blue and teal tones with subtle neon highlights, Marina Bay Sands-centred futuristic skyline, sleek modern composition, cinematic style grounded in realism',

  'guardian-steward': 'balanced atmosphere of security and warmth, organized yet welcoming composition, public service and community care setting, natural tropical lighting, professional documentary style',

  'steward-shaper': 'optimistic and progressive atmosphere, bright modern tropical lighting, Jewel Changi\'s greenery and glass architecture, inclusive composition showing people and technology, contemporary lifestyle photography style',

  'adaptive-guardian': 'confident and forward-looking atmosphere, dramatic cool-toned lighting, advanced operations environment linked to Changi Airport infrastructure, dynamic cinematic composition',
}

/**
 * Build prompt based on profile type
 */
export function buildPrompt(profileType: ProfileType): string {
  const scene = profileScenes[profileType]
  const style = profileStyles[profileType]

  return `A photorealistic medium close-up scene of ${scene}. Set in an authentic Singapore environment with curated iconic landmarks or public spaces that symbolically match the profile. Recognisable local architectural details, urban greenery, and everyday Singapore elements are clearly visible. ${style}. High quality, highly detailed, realistic lighting, 8k resolution. The person is naturally integrated into the environment, with no visible text, logos, or branded symbols. Non-touristy, contemporary Singapore realism.`
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
    if (first[0] === 'B') return 'steward'
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
      return 'guardian-steward'
    }
    if ((primary === 'B' && secondary === 'C') || (primary === 'C' && secondary === 'B')) {
      return 'steward-shaper'
    }
    if ((primary === 'A' && secondary === 'C') || (primary === 'C' && secondary === 'A')) {
      return 'adaptive-guardian'
    }
  }

  const futureSorted = Object.entries(futureCounts).sort((a, b) => b[1] - a[1]) as [string, number][]
  const [futureFirst, futureSecond] = futureSorted

  if (futureFirst[1] > futureSecond[1]) {
    if (futureFirst[0] === 'A') return 'guardian'
    if (futureFirst[0] === 'B') return 'steward'
    return 'shaper'
  }

  if (answers.q6 === 'A') return 'guardian'
  if (answers.q6 === 'B') return 'steward'
  if (answers.q6 === 'C') return 'shaper'

  return 'steward'
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
