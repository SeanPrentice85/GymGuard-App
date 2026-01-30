import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Membership Monitor',
  description: 'GymGuard High-Risk Watchlist',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <nav className="flex items-center justify-between p-4 bg-white shadow-sm border-b">
          <div className="flex gap-6 italic font-bold text-blue-600">
            GymGuard AI
          </div>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-blue-500 font-medium">Dashboard</Link>
            <Link href="/members" className="hover:text-blue-500 font-medium">Members</Link>
            <Link href="/admin" className="hover:text-blue-500 font-medium">Admin</Link>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto p-4">
          {children}
        </main>
      </body>
    </html>
  )
}