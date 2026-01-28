import type { Metadata, Viewport } from 'next'
import './globals.css'
import { QuizProvider } from '@/context/QuizContext'

export const metadata: Metadata = {
  title: 'Past, Present, Future - Riverside Secondary\'s Interactive Experience',
  description: 'An interactive booth experience exploring Singapore\'s past, present and future',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Past, Present, Future',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans kiosk-container">
        {/* Landscape orientation overlay for phones */}
        <div className="landscape-overlay">
          <div className="rotate-phone-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2" />
            </svg>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', fontWeight: 500, textAlign: 'center' }}>
            Please rotate your device
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'center' }}>
            This experience is best viewed in portrait mode
          </p>
        </div>
        <QuizProvider>
          <main className="min-h-screen min-h-dvh flex flex-col overflow-x-hidden">
            {children}
          </main>
        </QuizProvider>
      </body>
    </html>
  )
}
