"use client"

import { useEffect, useState, useCallback } from 'react'
import { useTheme } from '@/components/theme-provider'

interface SunriseSunsetData {
  sunrise: string
  sunset: string
  timezone: string
}

interface LocationData {
  lat: number
  lng: number
  timezone: string
}

// Approximate coordinates for major timezones (non-intrusive fallbacks)
const TIMEZONE_COORDINATES: Record<string, [number, number]> = {
  // US Timezones
  'America/New_York': [40.7128, -74.0060], // NYC
  'America/Chicago': [41.8781, -87.6298], // Chicago
  'America/Denver': [39.7392, -104.9903], // Denver
  'America/Los_Angeles': [34.0522, -118.2437], // LA
  'America/Anchorage': [61.2181, -149.9003], // Anchorage
  'Pacific/Honolulu': [21.3099, -157.8581], // Honolulu
  
  // Major world timezones
  'Europe/London': [51.5074, -0.1278], // London
  'Europe/Paris': [48.8566, 2.3522], // Paris
  'Europe/Berlin': [52.5200, 13.4050], // Berlin
  'Europe/Rome': [41.9028, 12.4964], // Rome
  'Asia/Tokyo': [35.6762, 139.6503], // Tokyo
  'Asia/Shanghai': [31.2304, 121.4737], // Shanghai
  'Asia/Kolkata': [28.7041, 77.1025], // Delhi
  'Australia/Sydney': [-33.8688, 151.2093], // Sydney
  'America/Toronto': [43.6532, -79.3832], // Toronto
  'America/Mexico_City': [19.4326, -99.1332], // Mexico City
  'America/Sao_Paulo': [-23.5505, -46.6333], // São Paulo
  'Africa/Cairo': [30.0444, 31.2357], // Cairo
  
  // Default fallback
  'UTC': [39.8283, -98.5795] // Center of US
}

export function useSunriseSunsetTheme() {
  const { theme, setTheme } = useTheme()
  const [sunData, setSunData] = useState<SunriseSunsetData | null>(null)
  const [location, setLocation] = useState<LocationData | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Get approximate location based on browser timezone (non-intrusive)
  const getLocationFromTimezone = useCallback((): LocationData => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const coordinates = TIMEZONE_COORDINATES[timezone] || TIMEZONE_COORDINATES['UTC']
    
    return {
      lat: coordinates[0],
      lng: coordinates[1],
      timezone: timezone
    }
  }, [])

  // Get sunrise/sunset data
  const getSunriseSunsetData = useCallback(async (lat: number, lng: number): Promise<SunriseSunsetData | null> => {
    try {
      const response = await fetch(
        `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.status === 'OK') {
          return {
            sunrise: data.results.sunrise,
            sunset: data.results.sunset,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('Error fetching sunrise/sunset data:', error)
      return null
    }
  }, [])

  // Check if it's currently daytime
  const isDaytime = useCallback((sunData: SunriseSunsetData): boolean => {
    const now = new Date()
    const sunrise = new Date(sunData.sunrise)
    const sunset = new Date(sunData.sunset)
    
    return now >= sunrise && now <= sunset
  }, [])

  // Update theme based on time of day
  const updateThemeBasedOnTime = useCallback(() => {
    if (!sunData || !isInitialized) return
    
    const daytime = isDaytime(sunData)
    const newTheme = daytime ? 'light' : 'dark'
    
    if (theme !== newTheme) {
      setTheme(newTheme)
      console.log(`🌅 Auto theme switched to ${newTheme} mode based on ${daytime ? 'sunrise' : 'sunset'} in ${location?.timezone}`)
    }
  }, [sunData, theme, setTheme, isDaytime, isInitialized, location?.timezone])

  // Initialize location and sun data automatically (non-intrusive)
  useEffect(() => {
    const initializeAutoTheme = async () => {
      try {
        // Use timezone-based location (no permission required)
        const timezoneLocation = getLocationFromTimezone()
        setLocation(timezoneLocation)
        
        console.log(`🌍 Using timezone-based location: ${timezoneLocation.timezone}`)
        
        // Get sunrise/sunset data
        const sunriseSunsetData = await getSunriseSunsetData(timezoneLocation.lat, timezoneLocation.lng)
        if (sunriseSunsetData) {
          setSunData(sunriseSunsetData)
          setIsInitialized(true)
          console.log(`🌅 Sunrise/sunset data loaded for ${timezoneLocation.timezone}`)
        } else {
          console.warn('Could not get sunrise/sunset data, defaulting to light mode')
          setTheme('light')
          setIsInitialized(true)
        }
      } catch (error) {
        console.error('Error initializing auto theme:', error)
        setTheme('light')
        setIsInitialized(true)
      }
    }
    
    initializeAutoTheme()
  }, [getLocationFromTimezone, getSunriseSunsetData, setTheme])

  // Update theme when sun data changes
  useEffect(() => {
    updateThemeBasedOnTime()
  }, [updateThemeBasedOnTime])

  // Set up interval to check time every minute
  useEffect(() => {
    if (!isInitialized) return
    
    const interval = setInterval(() => {
      updateThemeBasedOnTime()
    }, 60000) // Check every minute
    
    return () => clearInterval(interval)
  }, [isInitialized, updateThemeBasedOnTime])

  // Refresh sun data daily
  useEffect(() => {
    if (!isInitialized || !location) return
    
    const refreshSunData = async () => {
      const newSunData = await getSunriseSunsetData(location.lat, location.lng)
      if (newSunData) {
        setSunData(newSunData)
      }
    }
    
    // Refresh at midnight every day
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime()
    
    const timeoutId = setTimeout(() => {
      refreshSunData()
      // Set up daily interval
      const dailyInterval = setInterval(refreshSunData, 24 * 60 * 60 * 1000)
      return () => clearInterval(dailyInterval)
    }, timeUntilMidnight)
    
    return () => clearTimeout(timeoutId)
  }, [isInitialized, location, getSunriseSunsetData])

  // Get current sun times for display
  const getSunTimes = useCallback(() => {
    if (!sunData) return null
    
    const sunrise = new Date(sunData.sunrise)
    const sunset = new Date(sunData.sunset)
    
    return {
      sunrise: sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sunset: sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isDaytime: isDaytime(sunData),
      timezone: location?.timezone || 'Unknown'
    }
  }, [sunData, isDaytime, location?.timezone])

  return {
    sunData,
    location,
    getSunTimes,
    isInitialized
  }
} 