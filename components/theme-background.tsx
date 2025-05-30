"use client"

import { useEffect } from "react"
import { useTheme } from "@/components/theme-provider"

export function ThemeBackground() {
  const { theme } = useTheme()

  useEffect(() => {
    // Create a style element for consistent theming
    const style = document.createElement("style")
    style.id = "theme-background-styles"

    // Remove any existing theme background styles
    const existingStyle = document.getElementById("theme-background-styles")
    if (existingStyle) {
      existingStyle.remove()
    }

    style.textContent = `
      /* Consistent background theming - NO TRANSITIONS */
      html, body, #__next, main {
        background-color: ${theme === 'dark' ? 'rgb(3, 7, 18)' : 'white'} !important;
        color: ${theme === 'dark' ? 'rgb(248, 250, 252)' : 'rgb(17, 24, 39)'} !important;
        transition: none !important;
      }
      
      /* Header and navigation theming - NO TRANSITIONS */
      header, nav, .header, .navbar {
        background-color: ${theme === 'dark' ? 'rgb(15, 23, 42)' : 'white'} !important;
        border-color: ${theme === 'dark' ? 'rgb(51, 65, 85)' : 'rgb(229, 231, 235)'} !important;
        color: ${theme === 'dark' ? 'rgb(248, 250, 252)' : 'rgb(17, 24, 39)'} !important;
        transition: none !important;
      }
      
      /* Improve text readability in dark mode */
      .dark h1, .dark h2, .dark h3, .dark h4, .dark h5, .dark h6 {
        color: rgb(248, 250, 252) !important;
      }
      
      .dark p, .dark span, .dark div {
        color: rgb(203, 213, 225) !important;
      }
      
      .dark .text-black {
        color: rgb(248, 250, 252) !important;
      }
      
      .dark .text-black\/80 {
        color: rgb(203, 213, 225) !important;
      }
      
      .dark .text-black\/60 {
        color: rgb(148, 163, 184) !important;
      }
      
      /* Fix login button visibility in dark mode */
      ${theme === 'dark' ? `
      button[class*="bg-white"] {
        background-color: rgb(51, 65, 85) !important;
        color: rgb(248, 250, 252) !important;
        border-color: rgb(71, 85, 105) !important;
      }
      
      button[class*="bg-white"]:hover {
        background-color: rgb(71, 85, 105) !important;
        color: rgb(248, 250, 252) !important;
      }
      ` : ''}
      
      /* Prevent unwanted background colors */
      [style*="background-color: yellow"],
      [style*="background-color:#ffff00"],
      [class*="yellow"] {
        background-color: transparent !important;
      }
      
      /* Remove all transitions for instant theme switching */
      *, *::before, *::after {
        transition: none !important;
      }
    `

    document.head.appendChild(style)

    return () => {
      const styleToRemove = document.getElementById("theme-background-styles")
      if (styleToRemove) {
        styleToRemove.remove()
      }
    }
  }, [theme])

  return null
} 