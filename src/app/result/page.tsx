'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useQuiz, ProfileType } from '@/context/QuizContext'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { toPng } from 'html-to-image'

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

type CardStatus = 'generating' | 'uploading' | 'ready' | 'error'

// Test mode profiles for testing different profile types
const testProfiles: Record<string, ProfileType> = {
  guardian: 'guardian',
  builder: 'builder',
  shaper: 'shaper',
  'guardian-builder': 'guardian-builder',
  'builder-shaper': 'builder-shaper',
  'adaptive-guardian': 'adaptive-guardian',
}

function ResultPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { resultImageUrl, qrUrl, setQrUrl, r2Path, getProfile, getProfileType, resetQuiz, photoData } = useQuiz()
  const [showContent, setShowContent] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [cardStatus, setCardStatus] = useState<CardStatus>('generating')
  const [cardUrl, setCardUrl] = useState<string | null>(null)
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const hasStartedCardGeneration = useRef(false)

  // Test mode: allow passing image URL and profile via query params
  // Usage: /result?testImage=https://...&testProfile=builder
  const testImage = searchParams.get('testImage')
  const testProfile = searchParams.get('testProfile') as ProfileType | null
  const isTestMode = !!testImage

  const profile = isTestMode && testProfile && testProfiles[testProfile]
    ? require('@/types/quiz').profiles[testProfile]
    : getProfile()
  const profileType = isTestMode && testProfile && testProfiles[testProfile]
    ? testProfile
    : getProfileType()
  const currentStyle = profileStyles[profileType] || profileStyles.builder

  // Use FAL.ai URL for display (fast CDN), or test image in test mode
  const displayImageUrl = isTestMode ? testImage : (resultImageUrl || photoData)

  // QR code shows card URL when ready, otherwise placeholder
  const qrValue = cardUrl || 'https://riversidesec.pages.dev'

  useEffect(() => {
    // Skip redirect in test mode
    if (isTestMode) {
      const timer = setTimeout(() => setShowContent(true), 500)
      return () => clearTimeout(timer)
    }

    // If no result image and no photo, redirect to start
    if (!resultImageUrl && !photoData) {
      router.push('/')
      return
    }

    // Show content after a delay
    const timer = setTimeout(() => setShowContent(true), 500)
    return () => clearTimeout(timer)
  }, [resultImageUrl, photoData, router, isTestMode])

  // Convert image URL to base64 to avoid CORS issues with html-to-image
  const convertImageToBase64 = useCallback(async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      const timeout = setTimeout(() => {
        reject(new Error('Image load timeout'))
      }, 15000) // 15 second timeout

      img.onload = () => {
        clearTimeout(timeout)
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }
          ctx.drawImage(img, 0, 0)
          const dataUrl = canvas.toDataURL('image/png')
          console.log('Image converted to base64 successfully, size:', Math.round(dataUrl.length / 1024), 'KB')
          resolve(dataUrl)
        } catch (err) {
          console.error('Canvas conversion error:', err)
          reject(err)
        }
      }
      img.onerror = (e) => {
        clearTimeout(timeout)
        console.error('Image load error for URL:', url, e)
        reject(new Error('Failed to load image: ' + url))
      }
      img.src = url
    })
  }, [])

  // Generate card and upload to R2 when image is loaded
  const generateAndUploadCard = useCallback(async () => {
    console.log('generateAndUploadCard called', {
      hasCardRef: !!cardRef.current,
      displayImageUrl: displayImageUrl?.substring(0, 50) + '...',
      hasStarted: hasStartedCardGeneration.current
    })

    if (!cardRef.current || !displayImageUrl || hasStartedCardGeneration.current) return
    hasStartedCardGeneration.current = true

    setCardStatus('generating')
    console.log('Card generation started')

    try {
      // Convert external image to base64 first to avoid CORS issues
      let base64Img = imageBase64
      if (!base64Img && displayImageUrl && !displayImageUrl.startsWith('data:')) {
        console.log('Converting image to base64...')
        try {
          base64Img = await convertImageToBase64(displayImageUrl)
          setImageBase64(base64Img)
          console.log('Base64 conversion successful')
          // Wait longer for React to re-render with new state
          await new Promise(resolve => setTimeout(resolve, 1500))
        } catch (convErr) {
          console.warn('Could not convert image to base64:', convErr)
          console.warn('Trying direct capture instead')
        }
      } else {
        // Still wait for any pending renders
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Generate card image
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
      })

      setCardDataUrl(dataUrl)
      setCardStatus('uploading')

      // Extract base64 data for upload
      const base64Data = dataUrl.split(',')[1]
      const cardPath = `cards/${profileType}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`

      // Upload to R2 via worker
      const uploadResponse = await fetch(`${WORKER_URL}/upload-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardData: base64Data,
          cardPath: cardPath,
          profileType: profileType,
        }),
      })

      if (uploadResponse.ok) {
        const data = await uploadResponse.json()
        setCardUrl(data.cardUrl)
        setQrUrl(data.cardUrl)
        setCardStatus('ready')
      } else {
        throw new Error('Upload failed')
      }
    } catch (err) {
      console.error('Card generation error:', err)
      // Log more details
      if (err instanceof Error) {
        console.error('Error name:', err.name)
        console.error('Error message:', err.message)
        console.error('Error stack:', err.stack)
      }
      setCardStatus('error')
    }
  }, [displayImageUrl, profileType, setQrUrl, imageBase64, convertImageToBase64])

  // Start card generation when image is loaded
  useEffect(() => {
    if (imageLoaded && displayImageUrl) {
      generateAndUploadCard()
    }
  }, [imageLoaded, displayImageUrl, generateAndUploadCard])

  const handleStartOver = () => {
    resetQuiz()
    router.push('/')
  }

  const handleDownload = () => {
    if (cardDataUrl) {
      const link = document.createElement('a')
      link.download = `riverside-${profileType}-${Date.now()}.png`
      link.href = cardDataUrl
      link.click()
    } else if (cardUrl) {
      window.open(cardUrl, '_blank')
    }
  }

  const handleRetryCard = () => {
    hasStartedCardGeneration.current = false
    setCardStatus('generating')
    generateAndUploadCard()
  }

  // Render QR section based on card status
  const renderQRSection = () => {
    if (cardStatus === 'generating' || cardStatus === 'uploading') {
      return (
        <div className="flex items-center gap-5 mb-5 max-w-md mx-auto">
          <div
            className="flex-shrink-0 p-2.5 rounded-xl"
            style={{
              backgroundColor: `${currentStyle.color}15`,
              outline: `1px solid ${currentStyle.color}25`
            }}
          >
            <div className="bg-white/10 p-2 rounded-lg w-[96px] h-[96px] flex items-center justify-center">
              <div
                className="w-8 h-8 border-2 border-white/20 rounded-full animate-spin"
                style={{ borderTopColor: currentStyle.color }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <svg style={{ color: currentStyle.color }} className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <p className="text-white/90 font-medium">
                {cardStatus === 'generating' ? 'Creating your card...' : 'Uploading...'}
              </p>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              Please wait while we prepare your shareable card
            </p>
          </div>
        </div>
      )
    }

    if (cardStatus === 'error') {
      return (
        <div className="flex items-center gap-5 mb-5 max-w-md mx-auto">
          <div
            className="flex-shrink-0 p-2.5 rounded-xl"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              outline: '1px solid rgba(239, 68, 68, 0.25)'
            }}
          >
            <div className="bg-white/10 p-2 rounded-lg w-[96px] h-[96px] flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-white/90 font-medium mb-1">Card generation failed</p>
            <button
              onClick={handleRetryCard}
              className="text-sm font-medium hover:underline"
              style={{ color: currentStyle.color }}
            >
              Tap to try again
            </button>
          </div>
        </div>
      )
    }

    // Card is ready
    return (
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
              value={qrValue}
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
            Scan the QR code with your phone camera to save your card
          </p>
        </div>
      </div>
    )
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
          {/* QR Code section - dynamic based on card status */}
          {renderQRSection()}

          {/* Action buttons */}
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
              disabled={cardStatus !== 'ready' && cardStatus !== 'error'}
              className="btn-press flex-1 py-3.5 rounded-full bg-white/95 hover:bg-white text-[#1e3a5f] font-semibold shadow-2xl shadow-white/20 hover:shadow-white/40 hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {cardStatus === 'generating' || cardStatus === 'uploading' ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#1e3a5f]/30 border-t-[#1e3a5f] rounded-full animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </>
              )}
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

      {/* Hidden card for generation - visible but behind everything for proper rendering */}
      <div
        ref={cardRef}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '540px',
          height: '960px',
          backgroundColor: '#0a0a0a',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          zIndex: -1,
          opacity: 0.01, // Nearly invisible but still renders
          pointerEvents: 'none',
        }}
      >
        {/* Card content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '24px',
        }}>
          {/* School logo */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/school-logo.png"
              alt="Riverside Secondary School"
              style={{ height: '60px', margin: '0 auto' }}
            />
          </div>

          {/* Generated image - use base64 version to avoid CORS issues */}
          <div style={{
            flex: '0 0 auto',
            borderRadius: '16px',
            overflow: 'hidden',
            border: `3px solid ${currentStyle.color}`,
            boxShadow: `0 8px 32px ${currentStyle.color}40`,
            maxHeight: '450px',
          }}>
            {(imageBase64 || displayImageUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageBase64 || displayImageUrl || ''}
                alt="Your Singapore moment"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                crossOrigin="anonymous"
              />
            )}
          </div>

          {/* Profile info */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '20px 0',
          }}>
            {/* Emoji and title */}
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>{profile.emoji}</div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 700,
              color: currentStyle.color,
              marginBottom: '8px',
              textShadow: `0 0 30px ${currentStyle.color}60`,
            }}>
              {profile.title}
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.7)',
              fontStyle: 'italic',
              marginBottom: '16px',
              padding: '0 16px',
            }}>
              &ldquo;{profile.tagline}&rdquo;
            </p>

            {/* Description */}
            <p style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.6,
              marginBottom: '12px',
              padding: '0 8px',
            }}>
              {profile.description}
            </p>

            {/* Strength */}
            <p style={{
              fontSize: '14px',
              fontWeight: 600,
              color: currentStyle.color,
              padding: '0 8px',
            }}>
              Your strength: {profile.strength}
            </p>
          </div>

          {/* Footer */}
          <div style={{
            textAlign: 'center',
            borderTop: `1px solid ${currentStyle.color}30`,
            paddingTop: '16px',
          }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
              RIVERSIDE SECONDARY SCHOOL, SINGAPORE
            </p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
              Powered by AI
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Wrap in Suspense for useSearchParams
export default function ResultPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[#050505]">
      <div className="w-10 h-10 border-2 border-white/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>}>
      <ResultPageContent />
    </Suspense>
  )
}
