'use client'

import { useRouter } from 'next/navigation'
import { useQuiz } from '@/context/QuizContext'
import { useRef, useState, useEffect, useCallback } from 'react'

export default function CameraPage() {
  const router = useRouter()
  const { setPhotoData, answers, isHydrated } = useQuiz()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [showFlash, setShowFlash] = useState(false)

  // Check if all questions are answered (only after context hydration)
  useEffect(() => {
    if (isHydrated && (!answers.q1 || !answers.q2 || !answers.q3)) {
      router.push('/')
    }
  }, [isHydrated, answers, router])

  // Initialize camera
  useEffect(() => {
    async function initCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.onloadedmetadata = () => {
            setIsCameraReady(true)
          }
        }
      } catch (err) {
        console.error('Camera error:', err)
        setError('Unable to access camera. Please allow camera permissions and try again.')
      }
    }

    initCamera()

    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return

    // Flash effect
    setShowFlash(true)
    setTimeout(() => setShowFlash(false), 150)

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Mirror the image (since front camera is mirrored)
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
    context.drawImage(video, 0, 0)

    // Get image data
    const imageData = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedPhoto(imageData)
  }, [isCameraReady])

  const startCountdown = () => {
    setCountdown(3)
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          capturePhoto()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleRetake = () => {
    setCapturedPhoto(null)
    // Re-attach stream to video element after React re-renders it
    setTimeout(() => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream
      }
    }, 0)
  }

  const handleUsePhoto = () => {
    if (capturedPhoto) {
      setPhotoData(capturedPhoto)
      // Stop camera stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      router.push('/loading')
    }
  }

  const handleBack = () => {
    // Stop camera stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    router.push('/question/3')
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 page-transition">
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl p-10 text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-semibold text-white mb-3">Camera Access Required</h2>
          <p className="text-white/50 mb-8">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="btn-press flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-medium hover:bg-white/10 hover:text-white hover:border-white/30 transition-all"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-press flex-1 py-3 rounded-xl bg-white/90 text-[#1e3a5f] font-semibold hover:bg-white transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black page-transition">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-center">
          <h1 className="font-display text-xl font-semibold text-white">
            {capturedPhoto ? 'Looking good!' : 'Strike a pose'}
          </h1>
          <p className="text-white/50 text-sm">
            {capturedPhoto ? 'Happy with this photo?' : 'Solo photo works best'}
          </p>
        </div>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        {capturedPhoto ? (
          // Show captured photo
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedPhoto}
                alt="Captured photo"
                className="max-h-[60vh] w-auto"
              />
              {/* Success badge */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[#1e3a5f] text-sm font-medium">Captured</span>
              </div>
            </div>
          </div>
        ) : (
          // Show live camera
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover camera-video"
            />

            {/* Loading overlay */}
            {!isCameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                    <div className="absolute inset-0 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                    <div className="absolute inset-2 rounded-full bg-white/5 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-white/50 font-medium">Starting camera...</p>
                </div>
              </div>
            )}

            {/* Flash effect */}
            {showFlash && (
              <div className="absolute inset-0 bg-white animate-pulse z-30" />
            )}

            {/* Frame guide with corner brackets */}
            {isCameraReady && countdown === null && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Corner accents */}
                <div className="absolute top-8 left-8 w-8 h-8 border-l border-t border-white/40" />
                <div className="absolute top-8 right-8 w-8 h-8 border-r border-t border-white/40" />
                <div className="absolute bottom-8 left-8 w-8 h-8 border-l border-b border-white/40" />
                <div className="absolute bottom-8 right-8 w-8 h-8 border-r border-b border-white/40" />

                {/* Center focus ring */}
                <div className="w-20 h-20 rounded-full border border-white/20" />
              </div>
            )}

            {/* Countdown overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
                <div className="relative">
                  {/* Outer ring */}
                  <div className="absolute inset-0 w-32 h-32 rounded-full border-2 border-white/30 animate-ping" />
                  {/* Number */}
                  <div className="w-32 h-32 rounded-full backdrop-blur-md bg-white/20 border border-white/30 flex items-center justify-center shadow-2xl">
                    <span className="font-display text-7xl font-bold text-white">{countdown}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="shrink-0 p-6 bg-black">
        {capturedPhoto ? (
          // Photo review controls
          <div className="flex justify-center items-center gap-6">
            <button
              onClick={handleRetake}
              className="btn-press w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={handleUsePhoto}
              className="btn-press w-20 h-20 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
            >
              <svg className="w-8 h-8 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <div className="w-12" />
          </div>
        ) : (
          // Capture controls
          <div className="flex justify-center items-center gap-6">
            <button
              onClick={handleBack}
              className="btn-press w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={startCountdown}
              disabled={!isCameraReady || countdown !== null}
              className="btn-press w-20 h-20 rounded-full bg-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform shadow-lg"
            >
              <div className="w-16 h-16 rounded-full border-4 border-black/10" />
            </button>
            <div className="w-12" />
          </div>
        )}
      </div>
    </div>
  )
}
