"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Menu,
  Home,
  Scale,
  Newspaper,
  Vote,
  Megaphone,
  User,
  LogOut,
  MapPin,
  Settings,
  Flag,
  LogIn,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { AuthModal } from "@/components/auth-modal"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/components/auth-provider"
import { useLocation } from "@/components/location-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AuthButtons } from "@/components/auth-buttons"

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Legislation", href: "/legislation", icon: Scale },
  { name: "News", href: "/news", icon: Newspaper },
  { name: "Elections", href: "/elections", icon: Vote },
  { name: "Action Center", href: "/action-center", icon: Megaphone },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin")
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { location, clearLocation } = useLocation()

  // Force white background on the body
  useEffect(() => {
    document.documentElement.style.backgroundColor = "white"
    document.body.style.backgroundColor = "white"

    // Check for dark mode
    const isDarkMode = document.documentElement.classList.contains("dark")
    if (isDarkMode) {
      document.documentElement.style.backgroundColor = "black"
      document.body.style.backgroundColor = "black"
    }

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark")
      document.documentElement.style.backgroundColor = isDark ? "black" : "white"
      document.body.style.backgroundColor = isDark ? "black" : "white"
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  const handleAuth = () => {
    setAuthModalTab("signin")
    setAuthModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Top Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-64 p-0 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                      <Link href="/" className="flex items-center space-x-2">
                        <img src="/logo.png" alt="Citizen Logo" className="h-8 w-auto" />
                        <span className="text-xl font-bold gradient-text">Citizen</span>
                      </Link>
                    </div>
                    <nav className="flex-1 p-4 space-y-2">
                      {navigation.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              isActive
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                            }`}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{item.name}</span>
                          </Link>
                        )
                      })}
                    </nav>

                    {/* Mobile Auth Button */}
                    {!user && (
                      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                        <AuthButtons />
                      </div>
                    )}

                    {/* Mobile Theme Toggle */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>
                        <ThemeToggle />
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Link href="/" className="flex items-center space-x-2 ml-4 lg:ml-0">
                <img src="/logo.png" alt="Citizen Logo" className="h-8 w-auto" />
                <span className="text-xl font-bold gradient-text">Citizen</span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex lg:ml-8 lg:space-x-8">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                          : "text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-b-2 hover:border-blue-300 dark:hover:border-blue-600"
                      }`}
                    >
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {/* Theme Toggle - Desktop */}
              <div className="hidden md:block">
                <ThemeToggle />
              </div>

              {/* Location Display */}
              {location && (
                <Button
                  variant="ghost"
                  onClick={() => setLocationModalOpen(true)}
                  className="hidden md:flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-lg transition-all duration-200"
                >
                  <MapPin className="h-4 w-4 mr-1 text-red-500" />
                  <span>
                    {location.city}, {location.state}
                  </span>
                  <Settings className="h-3 w-3 ml-2 opacity-60" />
                </Button>
              )}

              {/* Auth Buttons */}
              <AuthButtons />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16 bg-white dark:bg-black">{children}</main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center space-x-2">
                <img src="/logo.png" alt="Citizen Logo" className="h-8 w-auto" />
                <span className="text-xl font-bold gradient-text">Citizen</span>
              </Link>
              <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-md">
                Empowering citizens with the tools and information needed to engage meaningfully in democracy.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-wider uppercase">
                Company
              </h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <Link href="/about" className="patriot-link">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="patriot-link">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-wider uppercase">Legal</h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <Link href="/privacy" className="patriot-link">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="patriot-link">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center">© 2025 Citizen. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultTab={authModalTab} />

      {/* Location Change Modal */}
      <Dialog open={locationModalOpen} onOpenChange={setLocationModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Change Location</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Update your location to get relevant civic information for your area.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {location && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Current Location:</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {location.address || `${location.city}, ${location.state}`}
                </p>
              </div>
            )}
            <button
              onClick={() => {
                clearLocation()
                setLocationModalOpen(false)
              }}
              className="bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-md w-full flex items-center justify-center"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Change Location
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              This will take you back to the location setup screen.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
