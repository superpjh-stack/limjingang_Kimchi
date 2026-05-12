import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: '임진강김치 MES',
  description: '임진강김치 제조실행시스템 (MES)',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              fontSize: '14px',
              borderRadius: '10px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: {
                primary: '#34A853',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EA4335',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
