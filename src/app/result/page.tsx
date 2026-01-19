'use client'

import { useRouter } from 'next/navigation'
import { useQuiz, ProfileType } from '@/context/QuizContext'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'

// Profile styling configuration
const profileStyles: Record<ProfileType, { image: string; color: string }> = {
  guardian: {
    image: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=1920&q=80',
    color: '#F59E0B', // Amber
  },
  builder: {
    image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1920&q=80',
    color: '#10B981', // Emerald
  },
  shaper: {
    image: 'https://images.unsplash.com/photo-1519608220182-b0ee9d0f54d6?w=1920&q=80',
    color: '#6366F1', // Indigo
  },
  'guardian-builder': {
    image: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=1920&q=80',
    color: '#F59E0B', // Amber
  },
  'builder-shaper': {
    image: 'https://images.unsplash.com/photo-1508964942454-1a56651d54ac?w=1920&q=80',
    color: '#14B8A6', // Teal
  },
  'adaptive-guardian': {
    image: 'https://images.unsplash.com/photo-1519608220182-b0ee9d0f54d6?w=1920&q=80',
    color: '#8B5CF6', // Violet
  },
}

// Worker URL for R2 upload
const WORKER_URL = 'https://riversidesec.eugene-ff3.workers.dev'

export default function ResultPage() {
  const router = useRouter()
  const { resultImageUrl, qrUrl, setQrUrl, r2Path, getProfile, getProfileType, resetQuiz, photoData } = useQuiz()
  const [showContent, setShowContent] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [r2Url, setR2Url] = useState<string | null>(null)
  const [uploadingToR2, setUploadingToR2] = useState(false)

  const profile = getProfile()
  const profileType = getProfileType()
  const currentStyle = profileStyles[profileType] || profileStyles.builder

  // Use FAL.ai URL for display (fast CDN)
  const displayImageUrl = resultImageUrl || photoData

  // Use R2 URL for download/QR if available, otherwise FAL.ai URL
  const downloadUrl = r2Url || qrUrl || resultImageUrl || ''

  useEffect(() => {
    // If no result image and no photo, redirect to start
    if (!resultImageUrl && !photoData) {
      router.push('/')
      return
    }

    // Show content after a delay
    const timer = setTimeout(() => setShowContent(true), 500)
    return () => clearTimeout(timer)
  }, [resultImageUrl, photoData, router])

  // Upload to R2 in background when page loads
  useEffect(() => {
    if (!resultImageUrl || !r2Path || r2Url || uploadingToR2) return

    const uploadToR2 = async () => {
      setUploadingToR2(true)
      try {
        const response = await fetch(`${WORKER_URL}/upload-to-r2`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            falUrl: resultImageUrl,
            r2Path: r2Path,
            timePeriod: 'present', // Worker expects 'past'|'present'|'future'
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setR2Url(data.r2Url)
          setQrUrl(data.r2Url)
        }
      } catch {
        // Silently fail - FAL.ai URL still works for display
      } finally {
        setUploadingToR2(false)
      }
    }

    uploadToR2()
  }, [resultImageUrl, r2Path, r2Url, uploadingToR2, setQrUrl])

  const handleStartOver = () => {
    resetQuiz()
    router.push('/')
  }

  const handleDownload = async () => {
    if (!downloadUrl) return

    try {
      // Open in new tab for download
      window.open(downloadUrl, '_blank')
    } catch (err) {
      console.error('Download error:', err)
    }
  }

  return (
    <div className="relative flex-1 flex flex-col page-transition overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch', backgroundColor: '#050505' }}>
      {/* Background - generated image, heavily blurred */}
      {displayImageUrl && (
        <div
          className="fixed inset-[-10%] bg-cover bg-center pointer-events-none"
          style={{
            backgroundImage: `url(${displayImageUrl})`,
            filter: 'blur(40px)',
            transform: 'scale(1.1)',
          }}
        />
      )}
      {/* Fallback to profile image if no generated image */}
      {!displayImageUrl && (
        <div
          className="fixed inset-[-5%] bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url(${currentStyle.image})` }}
        />
      )}
      {/* Dark overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      />
      {/* Radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${currentStyle.color}25 0%, transparent 60%)`
        }}
      />
      {/* Vignette effect */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.4) 100%)'
        }}
      />

      {/* School indicator */}
      <p className="relative z-10 text-white/40 text-xs sm:text-sm tracking-widest text-center pt-3 sm:pt-4 px-4">
        RIVERSIDE SECONDARY SCHOOL, SINGAPORE
      </p>

      {/* Profile Header */}
      <div className="relative z-10 px-4 md:px-5 pt-4 sm:pt-2 pb-2 text-center shrink-0">
        <div className="text-3xl sm:text-4xl mb-2">{profile.emoji}</div>
        <h1
          className="font-display text-2xl md:text-3xl font-semibold mb-2"
          style={{
            color: currentStyle.color,
            textShadow: `0 0 40px ${currentStyle.color}40`
          }}
        >
          {profile.title}
        </h1>
        <p className="text-white/70 text-sm md:text-base max-w-md mx-auto italic">
          &ldquo;{profile.tagline}&rdquo;
        </p>
      </div>

      {/* Generated image */}
      <div className="relative z-10 flex items-center justify-center px-3 pt-2 sm:pt-0 shrink-0">
        <div className="relative w-[85vw] max-w-sm md:max-w-md">
          {/* Decorative frame corners */}
          <div
            className="absolute -top-2 -left-2 w-8 h-8 border-l-2 border-t-2 rounded-tl-lg"
            style={{ borderColor: `${currentStyle.color}B0` }}
          />
          <div
            className="absolute -top-2 -right-2 w-8 h-8 border-r-2 border-t-2 rounded-tr-lg"
            style={{ borderColor: `${currentStyle.color}B0` }}
          />
          <div
            className="absolute -bottom-2 -left-2 w-8 h-8 border-l-2 border-b-2 rounded-bl-lg"
            style={{ borderColor: `${currentStyle.color}B0` }}
          />
          <div
            className="absolute -bottom-2 -right-2 w-8 h-8 border-r-2 border-b-2 rounded-br-lg"
            style={{ borderColor: `${currentStyle.color}B0` }}
          />

          {/* Image container */}
          <div
            className="relative rounded-xl overflow-hidden shadow-2xl"
            style={{
              boxShadow: `0 25px 50px -12px ${currentStyle.color}40`,
              outline: `1px solid ${currentStyle.color}30`
            }}
          >
            {displayImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayImageUrl}
                  alt="Your Singapore moment"
                  className={`w-full h-auto max-h-[35vh] sm:max-h-[40vh] object-contain transition-opacity duration-500 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
                    <div
                      className="w-10 h-10 border-2 border-white/10 rounded-full animate-spin"
                      style={{ borderTopColor: currentStyle.color }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="w-full aspect-[3/4] bg-white/5 flex items-center justify-center">
                <p className="text-white/20">Image not available</p>
              </div>
            )}

            {/* Success badge */}
            {imageLoaded && (
              <div
                className="absolute top-3 left-3 px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5"
                style={{ backgroundColor: `${currentStyle.color}E6` }}
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span className="text-white text-xs font-medium">AI Generated</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Description */}
      {showContent && (
        <div className="relative z-10 px-4 pt-4 text-center max-w-md mx-auto">
          <p className="text-white/60 text-sm leading-relaxed mb-2">
            {profile.description}
          </p>
          <p className="text-sm font-medium" style={{ color: currentStyle.color }}>
            Your strength: {profile.strength}
          </p>
        </div>
      )}

      {/* Bottom section */}
      {showContent && (
        <div
          className="relative z-10 pt-4 px-4 md:px-5 pb-6 rounded-t-3xl slide-up shrink-0 mt-auto backdrop-blur-sm"
          style={{
            paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderTop: `1px solid ${currentStyle.color}15`
          }}
        >
          {/* QR Code and info */}
          <div className="flex items-center gap-5 mb-5 max-w-md mx-auto">
            <div
              className="flex-shrink-0 p-2.5 rounded-xl"
              style={{
                backgroundColor: `${currentStyle.color}15`,
                outline: `1px solid ${currentStyle.color}25`
              }}
            >
              <div className="bg-white p-2 rounded-lg">
                <QRCodeSVG
                  value={downloadUrl}
                  size={80}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <svg style={{ color: currentStyle.color }} className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-white/90 font-medium">Scan to Download</p>
              </div>
              <p className="text-white/50 text-sm leading-relaxed">
                Scan the QR code with your phone camera to save your result
              </p>
            </div>
          </div>

          {/* Action buttons - matching homepage CTA style */}
          <div className="flex gap-3 max-w-md mx-auto">
            <button
              onClick={handleStartOver}
              className="btn-press flex-1 py-3.5 rounded-full bg-white/10 border border-white/20 text-white/70 font-medium hover:bg-white/15 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Start Over
            </button>
            <button
              onClick={handleDownload}
              className="btn-press flex-1 py-3.5 rounded-full bg-white/95 hover:bg-white text-[#1e3a5f] font-semibold shadow-2xl shadow-white/20 hover:shadow-white/40 hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>

          {/* Footer text */}
          <p className="text-center text-white/30 text-xs mt-4 tracking-wide">
            Powered by AI • Made with love in Singapore
          </p>
        </div>
      )}

      {/* Loading placeholder */}
      {!showContent && (
        <div className="relative z-10 p-4 md:p-5 glass-card rounded-t-3xl shrink-0 mt-auto">
          <div className="flex items-center gap-5 mb-5 max-w-md mx-auto">
            <div className="w-[104px] h-[104px] bg-white/10 rounded-xl shimmer" />
            <div className="flex-1">
              <div className="w-32 h-5 bg-white/10 rounded mb-2 shimmer" />
              <div className="w-full h-4 bg-white/10 rounded shimmer" />
              <div className="w-2/3 h-4 bg-white/10 rounded mt-1 shimmer" />
            </div>
          </div>
          <div className="flex gap-3 max-w-md mx-auto">
            <div className="flex-1 h-12 bg-white/10 rounded-xl shimmer" />
            <div className="flex-1 h-12 bg-white/10 rounded-xl shimmer" />
          </div>
        </div>
      )}
    </div>
  )
}
