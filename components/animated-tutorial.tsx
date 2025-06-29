"use client"

import React, { useState, useEffect } from "react"
import { X, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface TutorialStep {
  id: string
  title: string
  description: string
  component: React.ReactNode
  duration: number
}

interface AnimatedTutorialProps {
  isOpen: boolean
  onClose: () => void
}

export function AnimatedTutorial({ isOpen, onClose }: AnimatedTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isMuted, setIsMuted] = useState(false)

  // Auto-start the tutorial when it opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
      setProgress(0)
      setIsPlaying(true)
    }
  }, [isOpen])

  const tutorialSteps: TutorialStep[] = [
    {
      id: "welcome",
      title: "Great! Your Location is Set",
      description: "Now let's show you what you can do with your personalized civic dashboard. This quick tour will help you get started.",
      duration: 4000,
      component: <WelcomeAnimation />
    },
    {
      id: "location",
      title: "Start with Your Location",
      description: "Enter your address to get personalized information about your district, representatives, and local issues.",
      duration: 5000,
      component: <LocationAnimation />
    },
    {
      id: "representatives",
      title: "Meet Your Representatives",
      description: "See who represents you at every level - from city council to Congress. Contact them directly with one click.",
      duration: 6000,
      component: <RepresentativesAnimation />
    },
    {
      id: "legislation",
      title: "Track Important Legislation",
      description: "Stay informed about bills and laws that affect your community. See their status and impact in real-time.",
      duration: 5500,
      component: <LegislationAnimation />
    },
    {
      id: "action",
      title: "Take Action",
      description: "Make your voice heard. Contact representatives, attend meetings, and participate in your democracy.",
      duration: 4500,
      component: <ActionAnimation />
    }
  ]

  const currentTutorialStep = tutorialSteps[currentStep]

  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isPlaying && isOpen) {
      interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (100 / (currentTutorialStep.duration / 100))
          
          if (newProgress >= 100) {
            // Move to next step
            if (currentStep < tutorialSteps.length - 1) {
              setCurrentStep(prev => prev + 1)
              return 0
            } else {
              // Tutorial complete
              setIsPlaying(false)
              return 100
            }
          }
          
          return newProgress
        })
      }, 100)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying, isOpen, currentStep, currentTutorialStep.duration, tutorialSteps.length])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleRestart = () => {
    setCurrentStep(0)
    setProgress(0)
    setIsPlaying(true)
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
      setProgress(0)
    }
  }

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1)
      setProgress(0)
    }
  }

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex)
    setProgress(0)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse delay-100"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse delay-200"></div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Interactive Demo
            </h2>
            <Badge variant="secondary" className="animate-bounce">
              Step {currentStep + 1} of {tutorialSteps.length}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2 bg-gray-50 dark:bg-gray-800">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Navigation */}
        <div className="flex items-center justify-center px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-2">
            {tutorialSteps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => handleStepClick(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? "bg-blue-600 scale-125"
                    : index < currentStep
                    ? "bg-green-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="relative h-96 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            {/* Step Content */}
            <div className="relative z-10 h-full flex items-center justify-center p-8">
              <div className="text-center max-w-4xl">
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  {currentTutorialStep.title}
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                  {currentTutorialStep.description}
                </p>
                
                {/* Animation Component */}
                <div>
                  {currentTutorialStep.component}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentStep === tutorialSteps.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestart}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Restart
            </Button>
            <Button
              onClick={handlePlayPause}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Play
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Animation Components
function WelcomeAnimation() {
  return (
    <div className="relative">
      <div className="flex items-center justify-center mb-6">
        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
          <div className="text-white text-3xl">✓</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
        {[
          { icon: "🏛️", label: "Government" },
          { icon: "📊", label: "Data" },
          { icon: "🗳️", label: "Democracy" }
        ].map((item, i) => (
          <div
            key={i}
            className={`h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl shadow-lg animate-bounce flex flex-col items-center justify-center text-white`}
            style={{ animationDelay: `${i * 200}ms` }}
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="text-sm font-medium">{item.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-center">
        <div className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium animate-pulse">
          🎉 Address Confirmed! Let's explore your dashboard
        </div>
      </div>
    </div>
  )
}

function LocationAnimation() {
  const [step, setStep] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStep(prev => (prev + 1) % 3)
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              📍
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Enter Your Address</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get personalized civic information</p>
            </div>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="123 Main St, City, State"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={step === 0 ? "" : step === 1 ? "123 Main St" : "123 Main St, Manhattan, NY"}
              readOnly
            />
            {step === 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Location Found!</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Manhattan, New York</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RepresentativesAnimation() {
  const representatives = [
    { name: "Chuck Schumer", role: "U.S. Senator", party: "D" },
    { name: "Jerry Nadler", role: "U.S. Representative", party: "D" },
    { name: "Eric Adams", role: "Mayor", party: "D" }
  ]

  return (
    <div className="max-w-lg mx-auto space-y-3">
      {representatives.map((rep, index) => (
        <div
          key={rep.name}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700`}
          style={{ 
            animation: `slideInRight 0.6s ease-out ${index * 300}ms both`
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                {rep.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white">{rep.name}</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">{rep.role}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={rep.party === "D" ? "default" : "secondary"}>
                {rep.party}
              </Badge>
              <Button size="sm" variant="outline" className="animate-pulse">
                Contact
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function LegislationAnimation() {
  const [selectedBill, setSelectedBill] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedBill(prev => (prev + 1) % 3)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const bills = [
    { id: "HR-1234", title: "Infrastructure Investment", status: "Passed", priority: "High" },
    { id: "SB-567", title: "Education Funding", status: "In Committee", priority: "Medium" },
    { id: "AB-890", title: "Housing Reform", status: "Introduced", priority: "High" }
  ]

  return (
    <div className="max-w-lg mx-auto space-y-3">
      {bills.map((bill, index) => (
        <div
          key={bill.id}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border-2 transition-all duration-300 ${
            selectedBill === index
              ? "border-blue-500 scale-105"
              : "border-gray-200 dark:border-gray-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{bill.id}</Badge>
                <Badge variant={bill.status === "Passed" ? "default" : "secondary"}>
                  {bill.status}
                </Badge>
              </div>
              <h5 className="font-semibold text-gray-900 dark:text-white mt-1">{bill.title}</h5>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              bill.priority === "High"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
            }`}>
              {bill.priority}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ActionAnimation() {
  const actions = [
    { icon: "📞", title: "Call Representatives", description: "One-click calling" },
    { icon: "📧", title: "Send Messages", description: "Pre-written templates" },
    { icon: "📅", title: "Attend Meetings", description: "Local events & town halls" }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
      {actions.map((action, index) => (
        <div
          key={action.title}
          className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-center animate-bounce`}
          style={{ animationDelay: `${index * 200}ms` }}
        >
          <div className="text-3xl mb-3">{action.icon}</div>
          <h5 className="font-semibold text-gray-900 dark:text-white mb-1">{action.title}</h5>
          <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
          <Button size="sm" className="mt-3 animate-pulse">
            Try Now
          </Button>
        </div>
      ))}
    </div>
  )
} 