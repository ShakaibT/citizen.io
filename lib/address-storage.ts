import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

interface AddressData {
  formatted_address: string
  street_number?: string
  route?: string
  locality?: string
  administrative_area_level_2?: string
  administrative_area_level_1?: string
  country?: string
  postal_code?: string
  latitude: number
  longitude: number
  place_id: string
  address_components: any[]
}

interface StoredAddress extends AddressData {
  id: string
  user_id: string
  raw_input: string
  congressional_district?: string
  state_district?: string
  is_primary: boolean
  created_at: string
  updated_at: string
}

export async function storeValidatedAddress(
  user: User,
  rawInput: string,
  validatedData: AddressData,
): Promise<{ success: boolean; address?: StoredAddress; error?: string }> {
  try {
    // First, set all existing addresses for this user to non-primary
    await supabase.from("addresses").update({ is_primary: false }).eq("user_id", user.id)

    // Insert the new address as primary
    const { data, error } = await supabase
      .from("addresses")
      .insert({
        user_id: user.id,
        raw_input: rawInput,
        formatted_address: validatedData.formatted_address,
        street_number: validatedData.street_number,
        route: validatedData.route,
        locality: validatedData.locality,
        administrative_area_level_2: validatedData.administrative_area_level_2,
        administrative_area_level_1: validatedData.administrative_area_level_1,
        country: validatedData.country,
        postal_code: validatedData.postal_code,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        place_id: validatedData.place_id,
        address_components: validatedData.address_components,
        congressional_district: await getCongressionalDistrict(validatedData.latitude, validatedData.longitude),
        state_district: await getStateDistrict(validatedData.latitude, validatedData.longitude),
        is_primary: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error storing address:", error)
      return { success: false, error: "Failed to save address" }
    }

    return { success: true, address: data }
  } catch (error) {
    console.error("Error in storeValidatedAddress:", error)
    return { success: false, error: "Failed to save address" }
  }
}

export async function getUserPrimaryAddress(userId: string): Promise<StoredAddress | null> {
  try {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .single()

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error("Error fetching user address:", error)
    return null
  }
}

export async function getUserAddresses(userId: string): Promise<StoredAddress[]> {
  try {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching user addresses:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getUserAddresses:", error)
    return []
  }
}

export async function logAddressValidation(
  userId: string | null,
  rawInput: string,
  status: "success" | "partial" | "failed",
  errorMessage?: string,
  suggestions?: string[],
  apiResponse?: any,
): Promise<void> {
  try {
    await supabase.from("address_validation_logs").insert({
      user_id: userId,
      raw_input: rawInput,
      validation_status: status,
      error_message: errorMessage,
      suggestions: suggestions,
      api_response: apiResponse,
    })
  } catch (error) {
    console.error("Error logging address validation:", error)
  }
}

// Mock functions for congressional and state districts
// In production, you'd use actual APIs like the US Census Geocoder
async function getCongressionalDistrict(lat: number, lng: number): Promise<string | null> {
  // Mock implementation - in production use Census API
  const stateFromCoords = getStateFromCoordinates(lat, lng)
  if (stateFromCoords) {
    // Generate a mock district number
    const districtNum = Math.floor(Math.random() * 10) + 1
    return `${stateFromCoords}-${districtNum.toString().padStart(2, "0")}`
  }
  return null
}

async function getStateDistrict(lat: number, lng: number): Promise<string | null> {
  // Mock implementation - in production use state-specific APIs
  const stateFromCoords = getStateFromCoordinates(lat, lng)
  if (stateFromCoords) {
    const districtNum = Math.floor(Math.random() * 20) + 1
    return `${stateFromCoords}-SD-${districtNum.toString().padStart(2, "0")}`
  }
  return null
}

function getStateFromCoordinates(lat: number, lng: number): string | null {
  // Very simplified state detection based on coordinates
  // In production, use proper reverse geocoding
  if (lat >= 25.8 && lat <= 30.9 && lng >= -97.8 && lng <= -93.5) return "TX"
  if (lat >= 32.0 && lat <= 42.0 && lng >= -124.4 && lng <= -114.1) return "CA"
  if (lat >= 40.5 && lat <= 45.0 && lng >= -79.8 && lng <= -71.8) return "NY"
  if (lat >= 25.1 && lat <= 31.0 && lng >= -87.6 && lng <= -80.0) return "FL"
  // Add more state boundaries as needed
  return null
}
