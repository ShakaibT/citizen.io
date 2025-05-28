"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Lock, Eye, Database, MapPin, UserCheck } from "lucide-react"

export function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Shield className="h-12 w-12 text-patriot-blue-600 dark:text-patriot-blue-400" />
        </div>
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-black/80 dark:text-white/80">
          Your privacy is our priority. Here's how we protect your data.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Data Collection */}
        <Card className="patriot-card">
          <CardHeader>
            <CardTitle className="flex items-center text-black dark:text-white">
              <Database className="h-5 w-5 mr-2 text-patriot-blue-600 dark:text-patriot-blue-400" />
              What Data We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-black/80 dark:text-white/80">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 mt-0.5 text-green-600 dark:text-green-400" />
                <div>
                  <h4 className="font-semibold text-black dark:text-white">Location Information</h4>
                  <p>Your address is used only to find your representatives and relevant political information. We encrypt and never share this data.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <UserCheck className="h-5 w-5 mt-0.5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h4 className="font-semibold text-black dark:text-white">Account Information</h4>
                  <p>If you create an account, we store your email and preferences to provide personalized civic updates.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Eye className="h-5 w-5 mt-0.5 text-purple-600 dark:text-purple-400" />
                <div>
                  <h4 className="font-semibold text-black dark:text-white">Usage Analytics</h4>
                  <p>We collect anonymous usage data to improve the app. No personal information is included in analytics.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Protection */}
        <Card className="patriot-card">
          <CardHeader>
            <CardTitle className="flex items-center text-black dark:text-white">
              <Lock className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
              How We Protect Your Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-black/80 dark:text-white/80">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-black dark:text-white">🔐 Encryption</h4>
                <p>All data is encrypted in transit and at rest using industry-standard protocols.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-black dark:text-white">🛡️ Secure Storage</h4>
                <p>Data is stored in secure, SOC 2 compliant infrastructure with regular security audits.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-black dark:text-white">🔒 Access Control</h4>
                <p>Strict access controls ensure only authorized systems can access your data.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-black dark:text-white">🗑️ Data Minimization</h4>
                <p>We only collect data necessary for app functionality and delete it when no longer needed.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Third Party Services */}
        <Card className="patriot-card">
          <CardHeader>
            <CardTitle className="text-black dark:text-white">Third-Party Services</CardTitle>
            <CardDescription className="text-black/80 dark:text-white/80">
              We use trusted services to provide app functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-black/80 dark:text-white/80">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-black dark:text-white">🏛️ US Census Bureau API</h4>
                <p>We use the official US Census API for political district and representative data. No personal data is shared.</p>
              </div>
              <div>
                <h4 className="font-semibold text-black dark:text-white">🗺️ Google Maps API (Optional)</h4>
                <p>If configured, used only for address validation. Your address is sent to Google for validation but not stored by them for our app.</p>
              </div>
              <div>
                <h4 className="font-semibold text-black dark:text-white">🔐 Supabase Authentication</h4>
                <p>Secure authentication service that handles login/signup. Only email and encrypted passwords are stored.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="patriot-card">
          <CardHeader>
            <CardTitle className="text-black dark:text-white">Your Rights</CardTitle>
            <CardDescription className="text-black/80 dark:text-white/80">
              You have full control over your data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-black/80 dark:text-white/80">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-black dark:text-white">📥 Access Your Data</h4>
                <p>Request a copy of all data we have about you at any time.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-black dark:text-white">✏️ Correct Your Data</h4>
                <p>Update or correct any inaccurate information in your account.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-black dark:text-white">🗑️ Delete Your Data</h4>
                <p>Request complete deletion of your account and all associated data.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-black dark:text-white">📧 Data Portability</h4>
                <p>Export your data in a machine-readable format to use elsewhere.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="patriot-card">
          <CardHeader>
            <CardTitle className="text-black dark:text-white">Questions or Concerns?</CardTitle>
          </CardHeader>
          <CardContent className="text-black/80 dark:text-white/80">
            <p className="mb-4">
              If you have any questions about this privacy policy or how we handle your data, please contact us:
            </p>
            <div className="bg-patriot-blue-50 dark:bg-patriot-blue-900/20 p-4 rounded-lg border border-patriot-blue-200 dark:border-patriot-blue-800">
              <p className="font-semibold text-black dark:text-white">Privacy Officer</p>
              <p>Email: privacy@citizenapp.com</p>
              <p>Response time: Within 48 hours</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-sm text-black/60 dark:text-white/60">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <p>This privacy policy is effective immediately and applies to all users.</p>
      </div>
    </div>
  )
} 