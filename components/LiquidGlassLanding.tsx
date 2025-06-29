import React, { useState } from 'react';
import { Globe2, TrendingUp, Users, UserPlus, Shield, ChevronRight, MapPin, Bell, Vote } from 'lucide-react';
import { useLocation } from './location-provider';
import { AuthModal } from './auth-modal';

export default function LiquidGlassLanding() {
  const { setShowLocationSetup } = useLocation();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signup');

  const handleGetStarted = () => {
    setShowLocationSetup(true);
  };

  const handleSignUp = () => {
    setAuthModalTab('signup');
    setAuthModalOpen(true);
  };

  const handleLogin = () => {
    setAuthModalTab('signin');
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"></div>
        
        {/* Main Content */}
        <div className="relative px-4 py-16 mx-auto max-w-7xl sm:px-6 lg:px-8 lg:py-24">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <img 
                  src="/logo.png" 
                  alt="Citizen Logo" 
                  className="h-20 w-20 rounded-2xl shadow-lg object-cover"
                />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-sm animate-pulse"></div>
              </div>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Citizen
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="mt-6 text-xl leading-8 text-gray-600 max-w-3xl mx-auto">
              Your personalized gateway to American democracy. Stay informed, get engaged, and make your voice heard in your community.
            </p>

            {/* Main CTA Button */}
            <div className="mt-10 flex justify-center">
              <button 
                onClick={handleGetStarted}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <MapPin className="w-5 h-5 mr-2" />
                Get Started with Your Address
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>

            {/* Secondary Actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={handleSignUp}
                className="inline-flex items-center px-6 py-3 text-base font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Sign Up
              </button>
              <button 
                onClick={handleLogin}
                className="inline-flex items-center px-6 py-3 text-base font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200"
              >
                <Shield className="w-4 h-4 mr-2" />
                Login
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything you need to stay civically engaged
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Discover how Citizen makes democracy accessible and actionable for everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Globe2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Location-Based Insights</h3>
              <p className="text-gray-600 leading-relaxed">
                Get personalized information about legislation, elections, and civic opportunities specific to your address and voting district.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Real-Time Updates</h3>
              <p className="text-gray-600 leading-relaxed">
                Stay informed with live updates on bills, voting schedules, and breaking political news that affects your community.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Vote className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Take Action</h3>
              <p className="text-gray-600 leading-relaxed">
                Connect directly with your representatives, join local campaigns, and participate in the democratic process with confidence.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">50+</div>
              <div className="text-lg text-gray-600">States Covered</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">10k+</div>
              <div className="text-lg text-gray-600">Active Citizens</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">24/7</div>
              <div className="text-lg text-gray-600">Real-Time Updates</div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to make your voice heard?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of Americans who are staying informed and engaged with their local democracy.
          </p>
          <button 
            onClick={handleGetStarted}
            className="inline-flex items-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white rounded-xl shadow-lg hover:bg-gray-50 transition-all duration-200 transform hover:scale-105"
          >
            <MapPin className="w-5 h-5 mr-2" />
            Start with Your Address
            <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab={authModalTab}
      />
    </div>
  );
} 