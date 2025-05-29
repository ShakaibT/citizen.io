"use client"

import { useEffect, useState } from "react"

interface PerformanceMetrics {
  mapLoadTime: number
  apiResponseTime: number
  renderTime: number
  interactionLatency: number
}

interface PerformanceMonitorProps {
  onMetricsUpdate?: (metrics: Partial<PerformanceMetrics>) => void
  showDebugInfo?: boolean
}

export function PerformanceMonitor({ onMetricsUpdate, showDebugInfo = false }: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({})
  const [isVisible, setIsVisible] = useState(showDebugInfo)

  useEffect(() => {
    // Monitor performance metrics
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming
          const newMetrics = {
            ...metrics,
            mapLoadTime: navEntry.loadEventEnd - navEntry.loadEventStart,
            renderTime: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart
          }
          setMetrics(newMetrics)
          onMetricsUpdate?.(newMetrics)
        }
        
        if (entry.entryType === 'resource' && entry.name.includes('/api/')) {
          const resourceEntry = entry as PerformanceResourceTiming
          const newMetrics = {
            ...metrics,
            apiResponseTime: resourceEntry.responseEnd - resourceEntry.requestStart
          }
          setMetrics(newMetrics)
          onMetricsUpdate?.(newMetrics)
        }
      })
    })

    observer.observe({ entryTypes: ['navigation', 'resource'] })

    return () => observer.disconnect()
  }, [metrics, onMetricsUpdate])

  // Monitor interaction latency
  useEffect(() => {
    let interactionStart = 0
    
    const handleInteractionStart = () => {
      interactionStart = performance.now()
    }
    
    const handleInteractionEnd = () => {
      if (interactionStart > 0) {
        const latency = performance.now() - interactionStart
        const newMetrics = {
          ...metrics,
          interactionLatency: latency
        }
        setMetrics(newMetrics)
        onMetricsUpdate?.(newMetrics)
        interactionStart = 0
      }
    }

    document.addEventListener('mousedown', handleInteractionStart)
    document.addEventListener('mouseup', handleInteractionEnd)
    document.addEventListener('touchstart', handleInteractionStart)
    document.addEventListener('touchend', handleInteractionEnd)

    return () => {
      document.removeEventListener('mousedown', handleInteractionStart)
      document.removeEventListener('mouseup', handleInteractionEnd)
      document.removeEventListener('touchstart', handleInteractionStart)
      document.removeEventListener('touchend', handleInteractionEnd)
    }
  }, [metrics, onMetricsUpdate])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 z-[2000] bg-black/80 text-white text-xs p-3 rounded-lg font-mono">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold">Performance</span>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      <div className="space-y-1">
        {metrics.mapLoadTime && (
          <div>Map Load: {metrics.mapLoadTime.toFixed(0)}ms</div>
        )}
        {metrics.apiResponseTime && (
          <div>API Response: {metrics.apiResponseTime.toFixed(0)}ms</div>
        )}
        {metrics.renderTime && (
          <div>Render: {metrics.renderTime.toFixed(0)}ms</div>
        )}
        {metrics.interactionLatency && (
          <div>Interaction: {metrics.interactionLatency.toFixed(0)}ms</div>
        )}
      </div>
    </div>
  )
}

// Hook to easily add performance monitoring to any component
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({})
  
  const startTiming = (label: string) => {
    performance.mark(`${label}-start`)
  }
  
  const endTiming = (label: string) => {
    performance.mark(`${label}-end`)
    performance.measure(label, `${label}-start`, `${label}-end`)
    
    const measure = performance.getEntriesByName(label)[0]
    if (measure) {
      console.log(`${label}: ${measure.duration.toFixed(2)}ms`)
      return measure.duration
    }
    return 0
  }
  
  return {
    metrics,
    startTiming,
    endTiming,
    setMetrics
  }
} 