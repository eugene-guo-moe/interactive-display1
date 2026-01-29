import type { QuizAnswers, ProfileType } from '@/types/quiz'

// Scene descriptions for each profile type
// IMPORTANT: Prompts focus on a SINGLE PERSON (the user) to ensure PuLID preserves their face
const profileScenes: Record<ProfileType, string> = {
  // Pure profiles
  guardian: 'medium close-up portrait of a single person standing confidently, wearing a sleek futuristic bionic suit with glowing circuit-like lines and lightweight armour plating, no text, badges, or logos. The background is a futuristic Singapore cityscape with towering holographic displays, neon-lit skyscrapers, numerous flying cars and aerial vehicles streaking across the sky at different altitudes, and the Merlion reimagined as a glowing cybernetic monument near Marina Bay. Looking directly at the camera',

  steward: 'medium close-up portrait of a single person wearing a futuristic smart-fabric outfit with holographic sheen and geometric patterns. The background features a vast glowing interconnected network of nodes and data streams, with luminous connection lines linking people, buildings, and community spaces across a futuristic Singapore skyline. Holographic network pathways radiate outward from the person, symbolising community connectivity. Ambient LED lighting in warm orange and soft purple tones. The person looks toward the camera with a composed, approachable expression',

  shaper: 'a single person holding a glowing holographic tablet, standing on an elevated waterfront promenade overlooking Marina Bay. Marina Bay Sands dominates the background, integrated into a smart city skyline with illuminated data overlays, digital interfaces, and connected infrastructure. Autonomous transport routes and smart urban systems are subtly visualised around the skyline. Cool blue and teal lighting, the person stands confidently and looks directly at the camera',

  // Hybrid profiles - blending elements from both archetypes
  'guardian-steward': 'A photorealistic medium close-up portrait of a single person wearing a plain dark blue uniform-style outfit with no text, badges, or logos, standing in a Singapore HDB courtyard or neighbourhood town centre. The person is positioned slightly elevated or centrally aligned within the frame, creating a sense of oversight and responsibility. Behind them, clear community life is visible: elderly residents seated and chatting, families walking through sheltered walkways, children playing at a distance, and neighbours moving through shared spaces. The environment includes visible but unobtrusive civic security elements—CCTV cameras, lighting, orderly pathways—integrated into the heartland setting. Warm natural daylight, HDB blocks and greenery framing the scene. The person faces the camera with a steady, watchful expression',

  'steward-shaper': 'Medium close-up portrait of a single person standing in an open community innovation space located within a Singapore heartland setting. Behind them, small mixed-age groups of residents are actively interacting—discussing ideas around a table, collaborating over shared screens, or engaging in conversation. Digital tools and displays are present but secondary, naturally embedded into the space (but still must be obvious to show the shaper aspect). Visible community notice boards, flexible seating, greenery, and open layouts reinforce a communal atmosphere. Bright natural lighting. The person faces the camera with a confident, inclusive expression',

  'adaptive-guardian': 'a single person standing in a modern cybersecurity operations centre. Multiple screens display network monitoring dashboards and security alerts. Through glass walls, Changi Airport\'s control infrastructure or runway lighting is visible in the distance. Blue ambient lighting, looking confidently at the camera',
}

// Style descriptions for each profile type
const profileStyles: Record<ProfileType, string> = {
  guardian: 'futuristic and commanding atmosphere, cool blue and neon tones, cyberpunk-inspired Singapore skyline, sleek sci-fi composition, cinematic lighting with dramatic highlights, advanced technology aesthetic',

  steward: 'warm yet futuristic atmosphere, soft neon glow blended with warm amber and purple accent lighting, advanced community setting, vibrant saturated colours with cyan and magenta highlights, cinematic sci-fi photography style',

  shaper: 'dynamic and innovative atmosphere, cool blue and teal tones with subtle neon highlights, Marina Bay Sands-centred futuristic skyline, sleek modern composition, cinematic style grounded in realism',

  'guardian-steward': 'balanced atmosphere of security and warmth, organized yet welcoming composition, public service and community care setting, natural tropical lighting, professional documentary style',

  'steward-shaper': 'optimistic and progressive atmosphere, bright modern tropical lighting, inclusive composition showing people and technology, contemporary lifestyle photography style',

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
