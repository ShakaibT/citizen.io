"use client"

import { useState } from "react"
import { MapPin, Search, Edit, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocation } from "@/components/location-provider"
import { useToast } from "@/hooks/use-toast"

interface LocationData {
  address: string
  city: string
  state: string
  zipCode: string
  latitude: number
  longitude: number
  congressionalDistrict?: string
  stateDistrict?: string
}

export function LocationSettings() {
  const { location, setLocation, clearLocation } = useLocation()
  const [isEditing, setIsEditing] = useState(false)
  const [newAddress, setNewAddress] = useState(location?.address || "")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleUpdateLocation = async () => {
    if (!newAddress.trim()) return

    setLoading(true)
    try {
      // Mock geocoding - in production, use Google Maps Geocoding API
      const updatedLocation: LocationData = {
        address: newAddress,
        city: "Updated City",
        state: "Updated State",
        zipCode: "12345",
        latitude: 40.7128,
        longitude: -74.006,
        congressionalDistrict: "NY-01",
        stateDistrict: "NY-01",
      }

      setLocation(updatedLocation)
      setIsEditing(false)
      toast({
        title: "Location updated",
        description: "Your location has been successfully updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update location. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setNewAddress(location?.address || "")
    setIsEditing(false)
  }

  return (
    <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center text-gray-900 dark:text-white">
          <MapPin className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          Location Settings
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">Manage your location for personalized civic information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {location && (
          <div className="space-y-4">
            {/* Current Location Display */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Current Location</p>
                  {isEditing ? (
                    <div className="space-y-3">
                      <Input
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        placeholder="Enter new address"
                        className="text-sm bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                      />
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={handleUpdateLocation}
                          disabled={loading || !newAddress.trim()}
                          className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                        >
                          {loading ? (
                            "Updating..."
                          ) : (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleCancelEdit}
                          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {location.address || `${location.city}, ${location.state}`}
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Congressional District:</span>
                          <br />
                          <span className="text-gray-600 dark:text-gray-400">{location.congressionalDistrict || "N/A"}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">State District:</span>
                          <br />
                          <span className="text-gray-600 dark:text-gray-400">{location.stateDistrict || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setIsEditing(true)}
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => {
                  clearLocation()
                }}
              >
                <Search className="h-4 w-4 mr-2" />
                Choose Different Location
              </Button>
            </div>

            {/* Location Info */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>🔒 Your location is stored locally and used only to provide relevant civic information.</p>
              <p>
                📍 Coordinates: {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
