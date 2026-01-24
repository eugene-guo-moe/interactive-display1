'use client'

import { useState } from 'react'

const profiles = {
  builder: {
    title: 'The Community Builder',
    tagline: 'You believe Singapore is strongest when its people stand together.',
    description: 'You see unity as Singapore\'s greatest asset — in the past, present, and future. You value empathy, cooperation, and looking out for others, especially in times of crisis.',
    strength: 'You help keep Singapore cohesive, caring, and united.',
    color: '#10B981',
  },
  shaper: {
    title: 'The Future Shaper',
    tagline: 'You believe Singapore must keep evolving to stay relevant.',
    description: 'You are inspired by how Singapore adapted against the odds and believe that the future demands the same courage to change.',
    strength: 'You help Singapore stay agile, innovative, and future-ready.',
    color: '#6366F1',
  },
  guardian: {
    title: 'The Steady Guardian',
    tagline: 'You believe that Singapore stays strong when we are prepared.',
    description: 'You understand that Singapore\'s survival has never been guaranteed. You value stability, security, and readiness.',
    strength: 'Keeping Singapore safe while strengthening social bonds.',
    color: '#F59E0B',
  },
}

type FontOption = 'current' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | 'optionE'

const fontOptions: Record<FontOption, {
  label: string
  description: string
  titleFont: string
  taglineFont: string
  bodyFont: string
  titleWeight: number
  titleSize: string
  taglineItalic: boolean
}> = {
  current: {
    label: 'Current',
    description: 'Clash Display + Satoshi',
    titleFont: "'Clash Display', system-ui, sans-serif",
    taglineFont: "'Satoshi', system-ui, sans-serif",
    bodyFont: "'Satoshi', system-ui, sans-serif",
    titleWeight: 600,
    titleSize: '2rem',
    taglineItalic: true,
  },
  optionA: {
    label: 'Option A',
    description: 'Syne (bold artistic) + Instrument Serif tagline',
    titleFont: "'Syne', system-ui, sans-serif",
    taglineFont: "'Instrument Serif', Georgia, serif",
    bodyFont: "'Satoshi', system-ui, sans-serif",
    titleWeight: 800,
    titleSize: '2.25rem',
    taglineItalic: true,
  },
  optionB: {
    label: 'Option B',
    description: 'Bebas Neue (condensed all-caps) + Playfair Display tagline',
    titleFont: "'Bebas Neue', system-ui, sans-serif",
    taglineFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Satoshi', system-ui, sans-serif",
    titleWeight: 400,
    titleSize: '2.75rem',
    taglineItalic: true,
  },
  optionC: {
    label: 'Option C',
    description: 'Unbounded (rounded bold) + Satoshi body',
    titleFont: "'Unbounded', system-ui, sans-serif",
    taglineFont: "'Satoshi', system-ui, sans-serif",
    bodyFont: "'Satoshi', system-ui, sans-serif",
    titleWeight: 700,
    titleSize: '1.75rem',
    taglineItalic: true,
  },
  optionD: {
    label: 'Option D',
    description: 'Space Grotesk (techy) + Instrument Serif tagline',
    titleFont: "'Space Grotesk', system-ui, sans-serif",
    taglineFont: "'Instrument Serif', Georgia, serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    titleWeight: 700,
    titleSize: '2.25rem',
    taglineItalic: true,
  },
  optionE: {
    label: 'Option E',
    description: 'Archivo Black (ultra bold) + Cormorant Garamond tagline',
    titleFont: "'Archivo Black', system-ui, sans-serif",
    taglineFont: "'Cormorant Garamond', Georgia, serif",
    bodyFont: "'Satoshi', system-ui, sans-serif",
    titleWeight: 400,
    titleSize: '2rem',
    taglineItalic: true,
  },
}

function ProfileCard({ profile, font }: { profile: typeof profiles.builder; font: typeof fontOptions.current }) {
  return (
    <div className="rounded-2xl p-6 border border-white/[0.08] bg-white/[0.03]">
      <p className="text-white/40 text-xs mb-1 font-mono font-bold">{font.label}</p>
      <p className="text-white/30 text-xs mb-5">{font.description}</p>
      <h2
        style={{
          fontFamily: font.titleFont,
          fontWeight: font.titleWeight,
          fontSize: font.titleSize,
          color: profile.color,
          textShadow: `0 0 40px ${profile.color}40`,
          marginBottom: '0.5rem',
          lineHeight: 1.2,
        }}
      >
        {profile.title}
      </h2>
      <p
        style={{
          fontFamily: font.taglineFont,
          fontStyle: font.taglineItalic ? 'italic' : 'normal',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '1.05rem',
          marginBottom: '1rem',
          lineHeight: 1.4,
        }}
      >
        &ldquo;{profile.tagline}&rdquo;
      </p>
      <p style={{ fontFamily: font.bodyFont, color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
        {profile.description}
      </p>
      <p style={{ fontFamily: font.bodyFont, color: profile.color, fontSize: '0.85rem', fontWeight: 600 }}>
        Your strength: {profile.strength}
      </p>
    </div>
  )
}

export default function TestPreview() {
  const [selectedProfile, setSelectedProfile] = useState<keyof typeof profiles>('builder')
  const profile = profiles[selectedProfile]

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@600;700;800&family=Unbounded:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Archivo+Black&family=Instrument+Serif:ital@0;1&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Cormorant+Garamond:ital,wght@0,400;1,400;1,500&family=Inter:wght@400;500;700&display=swap" />

      <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10">
        <h1 className="font-display text-2xl font-semibold mb-2">Font Preview</h1>
        <p className="text-white/50 text-sm mb-6">Compare font options for the result page. Switch profiles to see different colors.</p>

        {/* Profile switcher */}
        <div className="flex gap-2 mb-8">
          {(Object.keys(profiles) as Array<keyof typeof profiles>).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedProfile(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedProfile === key ? 'text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
              style={selectedProfile === key ? { backgroundColor: profiles[key].color } : {}}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>

        {/* Font options grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {(Object.keys(fontOptions) as FontOption[]).map((key) => (
            <ProfileCard
              key={key}
              profile={profile}
              font={fontOptions[key]}
            />
          ))}
        </div>
      </div>
    </>
  )
}
