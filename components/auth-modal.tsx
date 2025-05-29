"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle } from "lucide-react"

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: "signin" | "signup"
  title?: string
  description?: string
}

export function AuthModal({ open, onOpenChange, defaultTab = "signin", title, description }: AuthModalProps) {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "reset">(defaultTab)

  // Update active tab when defaultTab changes or modal opens
  React.useEffect(() => {
    if (open) {
      setActiveTab(defaultTab)
    }
  }, [defaultTab, open])

  // Form states
  const [signInEmail, setSignInEmail] = useState("")
  const [signInPassword, setSignInPassword] = useState("")
  const [signUpEmail, setSignUpEmail] = useState("")
  const [signUpPassword, setSignUpPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [resetEmail, setResetEmail] = useState("")

  const { signInWithGoogle, signInWithGitHub, signInWithDiscord, signInWithEmail, signUpWithEmail, resetPassword } =
    useAuth()
  const { toast } = useToast()

  const clearForm = () => {
    setSignInEmail("")
    setSignInPassword("")
    setSignUpEmail("")
    setSignUpPassword("")
    setConfirmPassword("")
    setFullName("")
    setResetEmail("")
    setError(null)
    setSuccess(null)
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const handleClose = () => {
    clearForm()
    setActiveTab(defaultTab) // Reset to default tab when closing
    onOpenChange(false)
  }

  const handleOAuthSignIn = async (provider: "google" | "github" | "discord" | "facebook") => {
    setLoading(true)
    setError(null)
    try {
      if (provider === "google") {
        await signInWithGoogle()
      } else if (provider === "github") {
        await signInWithGitHub()
      } else if (provider === "discord") {
        await signInWithDiscord()
      } else if (provider === "facebook") {
        // For now, show a message that Facebook auth is coming soon
        toast({
          title: "Coming Soon",
          description: "Facebook authentication will be available soon!",
        })
        return
      }
      toast({
        title: "Redirecting...",
        description: `Redirecting to ${provider} for authentication.`,
      })
    } catch (error: any) {
      console.error(`${provider} auth error:`, error)
      if (error.message?.includes('OAuth') || error.message?.includes('provider')) {
        setError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} authentication is not configured yet. Please contact support.`)
      } else {
        setError(error.message || `Failed to sign in with ${provider}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signInEmail || !signInPassword) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError(null)
    try {
      await signInWithEmail(signInEmail, signInPassword)
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      })
      handleClose()
    } catch (error: any) {
      setError(error.message || "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !signUpEmail || !signUpPassword || !confirmPassword) {
      setError("Please fill in all fields")
      return
    }

    if (signUpPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (signUpPassword.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setLoading(true)
    setError(null)
    try {
      await signUpWithEmail(signUpEmail, signUpPassword, fullName)
      setSuccess("Account created! Please check your email to verify your account.")
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      })
    } catch (error: any) {
      setError(error.message || "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail) {
      setError("Please enter your email address")
      return
    }

    setLoading(true)
    setError(null)
    try {
      await resetPassword(resetEmail)
      setSuccess("Password reset email sent! Check your inbox.")
      toast({
        title: "Reset email sent",
        description: "Check your email for password reset instructions.",
      })
    } catch (error: any) {
      setError(error.message || "Failed to send reset email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-patriot-gray-900 border border-black/10 dark:border-white/20 shadow-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pt-4 pb-6">
          <DialogTitle className="text-black dark:text-white text-2xl font-bold">{title || "Join Citizen"}</DialogTitle>
          <DialogDescription className="text-black/70 dark:text-white/70 text-base">
            Join thousands of engaged citizens staying informed about their democracy.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "signin" | "signup" | "reset")}>
          <TabsList className="grid w-full grid-cols-2 bg-patriot-gray-100 dark:bg-patriot-gray-800">
            <TabsTrigger value="signin" className="text-black dark:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-patriot-gray-700 data-[state=active]:text-black dark:data-[state=active]:text-white">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="text-black dark:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-patriot-gray-700 data-[state=active]:text-black dark:data-[state=active]:text-white">Sign Up</TabsTrigger>
          </TabsList>

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="signin" className="space-y-4">
            {/* OAuth Providers */}
            <div className="space-y-3">
              <Button
                onClick={() => handleOAuthSignIn("google")}
                className="w-full bg-white dark:bg-patriot-gray-800 border border-black/20 dark:border-white/20 text-black dark:text-white hover:bg-patriot-gray-50 dark:hover:bg-patriot-gray-700 hover:text-black dark:hover:text-white transition-colors"
                variant="outline"
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <Button
                onClick={() => handleOAuthSignIn("facebook")}
                className="w-full bg-white dark:bg-patriot-gray-800 border border-black/20 dark:border-white/20 text-black dark:text-white hover:bg-patriot-gray-50 dark:hover:bg-patriot-gray-700 hover:text-black dark:hover:text-white transition-colors"
                variant="outline"
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Continue with Facebook
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full bg-black/20 dark:bg-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-patriot-gray-900 px-2 text-black/60 dark:text-white/60">Or continue with email</span>
              </div>
            </div>

            {/* Email Sign In Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-black dark:text-white">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/40 dark:text-white/40 h-4 w-4" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="pl-10 bg-white dark:bg-patriot-gray-800 border border-black/20 dark:border-white/20 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:border-patriot-blue-500 dark:focus:border-patriot-blue-400 focus:ring-1 focus:ring-patriot-blue-500 dark:focus:ring-patriot-blue-400"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-black dark:text-white">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/40 dark:text-white/40 h-4 w-4" />
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white dark:bg-patriot-gray-800 border border-black/20 dark:border-white/20 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:border-patriot-blue-500 dark:focus:border-patriot-blue-400 focus:ring-1 focus:ring-patriot-blue-500 dark:focus:ring-patriot-blue-400"
                    disabled={loading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full text-white" style={{backgroundColor: '#002868'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#001a4d'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#002868'} disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="text-center">
              <Button
                variant="link"
                className="text-sm text-patriot-blue-600 hover:text-patriot-blue-700 dark:text-patriot-blue-400 dark:hover:text-patriot-blue-300"
                onClick={() => setActiveTab("reset")}
              >
                Forgot your password?
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            {/* OAuth Providers */}
            <div className="space-y-3">
              <Button
                onClick={() => handleOAuthSignIn("google")}
                className="w-full bg-white dark:bg-patriot-gray-800 border border-black/20 dark:border-white/20 text-black dark:text-white hover:bg-patriot-gray-50 dark:hover:bg-patriot-gray-700 hover:text-black dark:hover:text-white transition-colors"
                variant="outline"
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign up with Google
              </Button>

              <Button
                onClick={() => handleOAuthSignIn("facebook")}
                className="w-full bg-white dark:bg-patriot-gray-800 border border-black/20 dark:border-white/20 text-black dark:text-white hover:bg-patriot-gray-50 dark:hover:bg-patriot-gray-700 hover:text-black dark:hover:text-white transition-colors"
                variant="outline"
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Sign up with Facebook
              </Button>
            </div>

                          <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full bg-black/20 dark:bg-white/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-patriot-gray-900 px-2 text-black/60 dark:text-white/60">Or create account with email</span>
                </div>
              </div>

            {/* Email Sign Up Form */}
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-black dark:text-white">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/40 dark:text-white/40 h-4 w-4" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 bg-white dark:bg-patriot-gray-800 border border-black/20 dark:border-white/20 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:border-patriot-blue-500 dark:focus:border-patriot-blue-400 focus:ring-1 focus:ring-patriot-blue-500 dark:focus:ring-patriot-blue-400"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-black dark:text-white">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/40 dark:text-white/40 h-4 w-4" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    className="pl-10 bg-white dark:bg-patriot-gray-800 border border-black/20 dark:border-white/20 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:border-patriot-blue-500 dark:focus:border-patriot-blue-400 focus:ring-1 focus:ring-patriot-blue-500 dark:focus:ring-patriot-blue-400"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-black dark:text-white">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/40 dark:text-white/40 h-4 w-4" />
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white dark:bg-patriot-gray-800 border border-black/20 dark:border-white/20 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:border-patriot-blue-500 dark:focus:border-patriot-blue-400 focus:ring-1 focus:ring-patriot-blue-500 dark:focus:ring-patriot-blue-400"
                    disabled={loading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-black/60 dark:text-white/60">Password must be at least 6 characters long</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-black dark:text-white">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/40 dark:text-white/40 h-4 w-4" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white dark:bg-patriot-gray-800 border border-black/20 dark:border-white/20 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:border-patriot-blue-500 dark:focus:border-patriot-blue-400 focus:ring-1 focus:ring-patriot-blue-500 dark:focus:ring-patriot-blue-400"
                    disabled={loading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full text-white" style={{backgroundColor: '#002868'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#001a4d'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#002868'} disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>

          {/* Password Reset Tab */}
          {activeTab === "reset" && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-black dark:text-white">Reset Password</h3>
                <p className="text-sm text-black/60 dark:text-white/60">Enter your email to receive a password reset link</p>
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-black dark:text-white">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/40 dark:text-white/40 h-4 w-4" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-10 bg-white dark:bg-patriot-gray-800 border border-black/20 dark:border-white/20 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:border-patriot-blue-500 dark:focus:border-patriot-blue-400 focus:ring-1 focus:ring-patriot-blue-500 dark:focus:ring-patriot-blue-400"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full text-white" style={{backgroundColor: '#002868'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#001a4d'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#002868'} disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>

              <div className="text-center">
                <Button
                  variant="link"
                  className="text-sm text-patriot-blue-600 hover:text-patriot-blue-700 dark:text-patriot-blue-400 dark:hover:text-patriot-blue-300"
                  onClick={() => setActiveTab("signin")}
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          )}
        </Tabs>

        <div className="text-xs text-black/60 dark:text-white/60 text-center">
          By signing in, you agree to our{" "}
          <a href="/terms" className="text-patriot-blue-600 hover:underline dark:text-patriot-blue-400">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-patriot-blue-600 hover:underline dark:text-patriot-blue-400">
            Privacy Policy
          </a>
          .
        </div>
      </DialogContent>
    </Dialog>
  )
}
