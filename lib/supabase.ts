import { createClient } from "@supabase/supabase-js"

// Access environment variables directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development'

if (!supabaseUrl) {
  const error = "Missing env.NEXT_PUBLIC_SUPABASE_URL"
  console.error(error)
  if (isDevelopment) {
    console.warn("Please create a .env.local file with your Supabase URL")
  }
  throw new Error(error)
}

if (!supabaseAnonKey) {
  const error = "Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY"
  console.error(error)
  if (isDevelopment) {
    console.warn("Please create a .env.local file with your Supabase anon key")
  }
  throw new Error(error)
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Server-side client
export const createServerClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    console.warn("Missing env.SUPABASE_SERVICE_ROLE_KEY - falling back to anon key")
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}
