import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ProjectFlow',
  description: 'Team Project Tracking System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
