"use client"

import React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase, isSupabaseConfigured } from "../lib/supabase"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  loading: boolean
  error: Error | null
  isConfigured: boolean
  signInWithGoogle: () => Promise<void>
  signInWithGitHub: () => Promise<void>
  signInWithDiscord: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Check if Supabase is properly configured
        if (mounted) {
          setIsConfigured(isSupabaseConfigured)
        }

        if (!isSupabaseConfigured) {
          console.warn('Supabase is not properly configured. Authentication features will be disabled.')
          if (mounted) {
            setLoading(false)
          }
          return
        }

        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        if (mounted) {
          setUser(session?.user ?? null)
          setLoading(false)
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (mounted) {
            setUser(session?.user ?? null)
            setLoading(false)
          }
        })

        return () => {
          mounted = false
          subscription.unsubscribe()
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize auth'))
          setLoading(false)
        }
      }
    }

    initializeAuth()
  }, [])

  const handleAuthError = (err: unknown) => {
    console.error('Auth error:', err)
    setError(err instanceof Error ? err : new Error('Authentication failed'))
    throw err
  }

  const signInWithGoogle = async () => {
    if (!isConfigured) {
      throw new Error('Authentication is not configured')
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err) {
      handleAuthError(err)
    }
  }

  const signInWithGitHub = async () => {
    if (!isConfigured) {
      throw new Error('Authentication is not configured')
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err) {
      handleAuthError(err)
    }
  }

  const signInWithDiscord = async () => {
    if (!isConfigured) {
      throw new Error('Authentication is not configured')
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err) {
      handleAuthError(err)
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    if (!isConfigured) {
      throw new Error('Authentication is not configured')
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (err) {
      handleAuthError(err)
    }
  }

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    if (!isConfigured) {
      throw new Error('Authentication is not configured')
    }
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      if (error) throw error
    } catch (err) {
      handleAuthError(err)
    }
  }

  const resetPassword = async (email: string) => {
    if (!isConfigured) {
      throw new Error('Authentication is not configured')
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
    } catch (err) {
      handleAuthError(err)
    }
  }

  const signOut = async () => {
    if (!isConfigured) {
      throw new Error('Authentication is not configured')
    }
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err) {
      handleAuthError(err)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isConfigured,
        signInWithGoogle,
        signInWithGitHub,
        signInWithDiscord,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
