import { createClient } from "@supabase/supabase-js"

// Access environment variables directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development'

// Check if Supabase is configured - Updated for deployment compatibility
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Create a fallback client or real client
let supabaseClient: any = null

if (isSupabaseConfigured) {
  // Create a single supabase client for interacting with your database
  supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
} else {
  // Create a mock client that returns promises instead of throwing
  supabaseClient = {
    auth: {
      getSession: () => {
        console.warn("Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.")
        return Promise.resolve({ data: { session: null }, error: null })
      },
      signInWithOAuth: () => {
        console.warn("Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.")
        return Promise.reject(new Error("Supabase is not configured"))
      },
      signInWithPassword: () => {
        console.warn("Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.")
        return Promise.reject(new Error("Supabase is not configured"))
      },
      signUp: () => {
        console.warn("Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.")
        return Promise.reject(new Error("Supabase is not configured"))
      },
      signOut: () => {
        console.warn("Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.")
        return Promise.reject(new Error("Supabase is not configured"))
      },
      resetPasswordForEmail: () => {
        console.warn("Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.")
        return Promise.reject(new Error("Supabase is not configured"))
      },
      onAuthStateChange: () => {
        return { data: { subscription: { unsubscribe: () => {} } } }
      }
    }
  }
  
  if (isDevelopment) {
    console.warn("Supabase is not configured. Authentication features will be disabled. Please create a .env.local file with your Supabase credentials.")
  }
}

export const supabase = supabaseClient

// Server-side client
export const createServerClient = () => {
  if (!isSupabaseConfigured) {
    console.warn("Supabase is not configured - server client unavailable")
    return null
  }
  
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    console.warn("Missing env.SUPABASE_SERVICE_ROLE_KEY - falling back to anon key")
    return createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  }
  
  return createClient(supabaseUrl!, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}
