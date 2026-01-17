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

const iconModifiers: Record<string, { past: string; future: string }> = {
  A: {
    past: 'with the historic National Library building visible in the background, colonial era architecture',
    future: 'with a reimagined holographic National Library floating in the sky',
  },
  B: {
    past: 'with the original Merlion statue by the Singapore River, 1970s aesthetic',
    future: 'with a giant holographic Merlion projecting from Marina Bay',
  },
  C: {
    past: 'with early Marina Bay development, construction cranes and 1990s Singapore skyline',
    future: 'with a futuristic Marina Bay Sands featuring floating infinity pools and light shows',
  },
  D: {
    past: 'with Changi Airport in its early days, vintage planes and retro terminals',
    future: 'with Jewel Changi transformed into a space-age biodome with alien plants',
  },
}

export function buildPrompt(answers: QuizAnswers): string {
  const timePeriod = answers.q3 === 'A' ? 'past' : 'future'
  const q1Answer = answers.q1 || 'A'
  const q2Answer = answers.q2 || 'A'

  const baseScene = timePeriod === 'past'
    ? pastScenes[q1Answer] || pastScenes.A
    : futureScenes[q1Answer] || futureScenes.A

  const iconDetail = iconModifiers[q2Answer]?.[timePeriod] || iconModifiers.A[timePeriod]

  const style = timePeriod === 'past'
    ? 'warm sepia tones, nostalgic atmosphere, soft golden sunlight, vintage film photography style'
    : 'vibrant neon colors, cyberpunk aesthetic, dramatic lighting, cinematic sci-fi style'

  return `A photorealistic scene of ${baseScene}, ${iconDetail}. Singapore setting. ${style}. High quality, detailed, 8k resolution.`
}

export function getPromptConfig(answers: QuizAnswers): PromptConfig {
  const timePeriod = answers.q3 === 'A' ? 'past' : 'future'
  const q1Answer = answers.q1 || 'A'
  const q2Answer = answers.q2 || 'A'

  return {
    baseScene: timePeriod === 'past'
      ? pastScenes[q1Answer] || pastScenes.A
      : futureScenes[q1Answer] || futureScenes.A,
    aspectDetails: q1Answer,
    iconDetails: iconModifiers[q2Answer]?.[timePeriod] || '',
    style: timePeriod === 'past' ? 'nostalgic' : 'futuristic',
  }
}
