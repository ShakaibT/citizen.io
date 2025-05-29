"use client"

import React from "react"
import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { User, CheckCircle, XCircle, AlertCircle } from "lucide-react"

export function AuthDebug() {
  const { user, loading, error, isConfigured, signOut } = useAuth()

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-white/95 backdrop-blur-sm border shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Auth Debug
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Supabase:</span>
          {isConfigured ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Configured
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              Not Configured
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Status:</span>
          {loading ? (
            <Badge variant="secondary">
              <AlertCircle className="h-3 w-3 mr-1" />
              Loading...
            </Badge>
          ) : user ? (
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Authenticated
            </Badge>
          ) : (
            <Badge variant="outline">
              <XCircle className="h-3 w-3 mr-1" />
              Not Authenticated
            </Badge>
          )}
        </div>

        {user && (
          <div className="space-y-2">
            <div className="text-xs">
              <span className="font-medium">Email:</span> {user.email}
            </div>
            <div className="text-xs">
              <span className="font-medium">ID:</span> {user.id.slice(0, 8)}...
            </div>
            <div className="text-xs">
              <span className="font-medium">Provider:</span> {user.app_metadata?.provider || 'email'}
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={signOut}
              className="w-full text-xs"
            >
              Sign Out
            </Button>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            <span className="font-medium">Error:</span> {error.message}
          </div>
        )}

        <div className="text-xs text-gray-500 border-t pt-2">
          This debug panel only appears in development mode.
        </div>
      </CardContent>
    </Card>
  )
} 