"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { useSunriseSunsetTheme } from "@/hooks/use-sunrise-sunset-theme"
import { useState } from "react"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { getSunTimes } = useSunriseSunsetTheme()
  const [showTooltip, setShowTooltip] = useState(false)
  
  const sunTimes = getSunTimes()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className="group relative h-10 w-10 rounded-full border-2 border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm transition-all duration-300 hover:border-gray-300/70 dark:hover:border-gray-600/70 hover:bg-white/95 dark:hover:bg-gray-700/95 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {/* Glass reflection effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Sun icon for light mode */}
      <Sun 
        className={`absolute h-5 w-5 transition-all duration-500 ease-in-out ${
          theme === "light" 
            ? "rotate-0 scale-100 opacity-100 text-amber-500" 
            : "rotate-90 scale-0 opacity-0 text-amber-500"
        }`} 
      />
      
      {/* Moon icon for dark mode */}
      <Moon 
        className={`absolute h-5 w-5 transition-all duration-500 ease-in-out ${
          theme === "dark" 
            ? "rotate-0 scale-100 opacity-100 text-patriot-blue-400"
            : "-rotate-90 scale-0 opacity-0 text-patriot-blue-400"
        }`} 
      />

      {/* Tooltip showing automatic theme info */}
      {showTooltip && sunTimes && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-1 rounded-md whitespace-nowrap z-50 pointer-events-none">
          <div className="text-center">
            <div>Auto: {sunTimes.isDaytime ? '☀️ Day' : '🌙 Night'}</div>
            <div className="text-xs opacity-75">
              {sunTimes.sunrise} - {sunTimes.sunset}
            </div>
            <div className="text-xs opacity-60 mt-1">
              {sunTimes.timezone}
            </div>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
        </div>
      )}
    </Button>
  )
}
