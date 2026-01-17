import type { QuizAnswers } from '@/context/QuizContext'

interface PromptConfig {
  baseScene: string
  aspectDetails: string
  iconDetails: string
  style: string
}

const pastScenes: Record<string, string> = {
  A: 'a warm kampung village scene with wooden houses on stilts, coconut trees, and community gathering',
  B: 'a vibrant 1960s Singapore street scene with diverse cultures, traditional shophouses, and street vendors',
  C: 'a vintage Singapore port scene with colonial architecture and early technological innovations',
  D: 'a lush tropical garden setting with old Singapore botanic gardens and traditional greenery',
}

const futureScenes: Record<string, string> = {
  A: 'a futuristic community hub with holographic displays and connected smart homes',
  B: 'a cyberpunk multicultural festival with neon lights and diverse cultural holograms',
  C: 'a high-tech Singapore skyline with flying vehicles, AI assistants, and smart infrastructure',
  D: 'a green futuristic city with vertical gardens, solar panels, and sustainable architecture',
}

const presentScenes: Record<string, string> = {
  A: 'a modern HDB heartland scene with community centers, hawker centers, and neighborhood vibes',
  B: 'a vibrant Chinatown or Little India street scene with modern Singapore multiculturalism',
  C: 'the iconic Marina Bay skyline at golden hour with Gardens by the Bay and the Supertrees',
  D: 'Gardens by the Bay with the Cloud Forest and Flower Dome, lush greenery and modern architecture',
}

const iconModifiers: Record<string, { past: string; present: string; future: string }> = {
  A: {
    past: 'with the historic National Library building visible in the background, colonial era architecture',
    present: 'with the modern National Library at Victoria Street, contemporary Singapore',
    future: 'with a reimagined holographic National Library floating in the sky',
  },
  B: {
    past: 'with the original Merlion statue by the Singapore River, 1970s aesthetic',
    present: 'with the iconic Merlion at Marina Bay, present day Singapore',
    future: 'with a giant holographic Merlion projecting from Marina Bay',
  },
  C: {
    past: 'with early Marina Bay development, construction cranes and 1990s Singapore skyline',
    present: 'with Marina Bay Sands and the ArtScience Museum, modern Singapore skyline',
    future: 'with a futuristic Marina Bay Sands featuring floating infinity pools and light shows',
  },
  D: {
    past: 'with Changi Airport in its early days, vintage planes and retro terminals',
    present: 'with Jewel Changi Airport and the HSBC Rain Vortex waterfall',
    future: 'with Jewel Changi transformed into a space-age biodome with alien plants',
  },
}

export function buildPrompt(answers: QuizAnswers): string {
  const timePeriod = answers.q3 === 'A' ? 'past' : answers.q3 === 'B' ? 'present' : 'future'
  const q1Answer = answers.q1 || 'A'
  const q2Answer = answers.q2 || 'A'

  const baseScene = timePeriod === 'past'
    ? pastScenes[q1Answer] || pastScenes.A
    : timePeriod === 'present'
      ? presentScenes[q1Answer] || presentScenes.A
      : futureScenes[q1Answer] || futureScenes.A

  const iconDetail = iconModifiers[q2Answer]?.[timePeriod] || iconModifiers.A[timePeriod]

  const style = timePeriod === 'past'
    ? 'warm sepia tones, nostalgic atmosphere, soft golden sunlight, vintage film photography style'
    : timePeriod === 'present'
      ? 'vibrant colors, golden hour lighting, modern photography style, clean and contemporary'
      : 'vibrant neon colors, cyberpunk aesthetic, dramatic lighting, cinematic sci-fi style'

  return `A photorealistic scene of ${baseScene}, ${iconDetail}. Singapore setting. ${style}. High quality, detailed, 8k resolution.`
}

export function getPromptConfig(answers: QuizAnswers): PromptConfig {
  const timePeriod = answers.q3 === 'A' ? 'past' : answers.q3 === 'B' ? 'present' : 'future'
  const q1Answer = answers.q1 || 'A'
  const q2Answer = answers.q2 || 'A'

  return {
    baseScene: timePeriod === 'past'
      ? pastScenes[q1Answer] || pastScenes.A
      : timePeriod === 'present'
        ? presentScenes[q1Answer] || presentScenes.A
        : futureScenes[q1Answer] || futureScenes.A,
    aspectDetails: q1Answer,
    iconDetails: iconModifiers[q2Answer]?.[timePeriod] || '',
    style: timePeriod === 'past' ? 'nostalgic' : timePeriod === 'present' ? 'contemporary' : 'futuristic',
  }
}
