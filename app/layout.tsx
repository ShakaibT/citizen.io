import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "leaflet/dist/leaflet.css"
import { AuthProvider } from "../components/auth-provider"
import { LocationProvider } from "../components/location-provider"
import { ThemeProvider } from "../components/theme-provider"
import { ThemeBackground } from "../components/theme-background"
import { Toaster } from "../components/ui/toaster"
import { AuthDebug } from "../components/auth-debug"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Citizen - Your Voice in American Democracy",
  description: "Stay informed, engaged, and empowered with personalized civic information tailored to your location.",
  icons: {
    icon: [
      {
        url: "/logo.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon.ico",
        sizes: "32x32",
        type: "image/x-icon",
      },
    ],
    apple: [
      {
        url: "/logo.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <ThemeBackground />
          <AuthProvider>
            <LocationProvider>
              {children}
              <Toaster />
              <AuthDebug />
            </LocationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
