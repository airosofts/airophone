// src/app/layout.js
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'SMS Dashboard - Two-Way SMS Management',
  description: 'Manage your two-way SMS conversations with Telnyx integration',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}