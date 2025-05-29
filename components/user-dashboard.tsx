"use client"

import { Star, TrendingUp, MessageSquare, Calendar, Bell, Vote, Scale, Newspaper, Megaphone, AlertCircle, CheckCircle, Clock, ArrowRight, ExternalLink, Users, MapPin, Target, Activity, Zap, Eye, Heart, Award, ChevronRight, Filter, Search, BarChart3, PieChart, Globe, Building, UserCheck, Bookmark } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/components/auth-provider"
import { useLocation } from "@/components/location-provider"
import { LocationSettings } from "@/components/location-settings"

const mockStats = {
  trackedBills: 5,
  messagesSent: 12,
  articlesRead: 28,
  campaignsJoined: 3,
  upcomingElections: 2,
  actionItemsCompleted: 8,
  impactScore: 85,
  weeklyGoal: 10,
  weeklyProgress: 7
}

const mockActionItems = [
  {
    id: 1,
    type: "urgent",
    title: "Vote on Proposition 15",
    description: "Local ballot measure on education funding - voting ends in 3 days",
    deadline: "2024-03-15",
    category: "Election",
    icon: Vote,
    action: "Vote Now",
    priority: "high",
    source: "elections",
    estimatedTime: "5 min",
    impact: "High"
  },
  {
    id: 2,
    type: "bill",
    title: "Contact Rep. About Climate Bill",
    description: "HR-2847 Climate Action Act needs your voice - committee vote next week",
    deadline: "2024-03-20",
    category: "Legislation",
    icon: Scale,
    action: "Send Message",
    priority: "high",
    source: "legislation",
    estimatedTime: "3 min",
    impact: "High"
  },
  {
    id: 3,
    type: "meeting",
    title: "Town Hall: Infrastructure Plan",
    description: "Mayor hosting public meeting on new infrastructure investments",
    deadline: "2024-03-18",
    category: "Local Government",
    icon: Users,
    action: "RSVP",
    priority: "medium",
    source: "action-center",
    estimatedTime: "2 min",
    impact: "Medium"
  },
  {
    id: 4,
    type: "news",
    title: "Read: New Housing Policy Impact",
    description: "Important analysis on how new housing policies affect your district",
    deadline: "2024-03-25",
    category: "Local News",
    icon: Newspaper,
    action: "Read Article",
    priority: "medium",
    source: "news",
    estimatedTime: "8 min",
    impact: "Medium"
  }
]

const mockRecentActivity = [
  {
    type: "bill_update",
    title: "Clean Energy Infrastructure Act",
    description: "Status changed to 'Passed Committee' - now heading to full vote",
    timestamp: "2 hours ago",
    status: "positive",
    icon: Scale,
    source: "legislation"
  },
  {
    type: "message_sent",
    title: "Message to Sen. Jane Smith",
    description: "Regarding Healthcare Access Expansion Act - received confirmation",
    timestamp: "1 day ago",
    status: "completed",
    icon: MessageSquare,
    source: "action-center"
  },
  {
    type: "election_reminder",
    title: "Voter Registration Deadline",
    description: "Reminder: Register to vote by March 20th for upcoming primary",
    timestamp: "2 days ago",
    status: "warning",
    icon: Vote,
    source: "elections"
  },
  {
    type: "article_saved",
    title: "New Climate Report Released",
    description: "EPA releases comprehensive climate impact assessment",
    timestamp: "3 days ago",
    status: "neutral",
    icon: Newspaper,
    source: "news"
  }
]

const mockUpcomingElections = [
  {
    position: "Governor",
    date: "2024-11-05",
    daysUntil: 280,
    type: "General Election",
    status: "registered"
  },
  {
    position: "Mayor",
    date: "2024-06-15",
    daysUntil: 137,
    type: "Primary Election",
    status: "not_registered"
  },
  {
    position: "School Board",
    date: "2024-04-20",
    daysUntil: 45,
    type: "Local Election",
    status: "registered"
  }
]

const mockTrackedBills = [
  {
    id: "HR-2847",
    title: "Climate Action and Jobs Act",
    status: "In Committee",
    lastUpdate: "2024-03-10",
    yourPosition: "Support",
    urgency: "high",
    progress: 65
  },
  {
    id: "SB-156",
    title: "Healthcare Access Expansion",
    status: "Passed Senate",
    lastUpdate: "2024-03-08",
    yourPosition: "Support",
    urgency: "medium",
    progress: 80
  },
  {
    id: "HR-1234",
    title: "Infrastructure Investment Act",
    status: "In House",
    lastUpdate: "2024-03-05",
    yourPosition: "Neutral",
    urgency: "low",
    progress: 35
  }
]

export function UserDashboard() {
  const { user } = useAuth()
  const { location } = useLocation()

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-black dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserCheck className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Welcome to Your Civic Dashboard</h3>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto">
              Sign in to access your personalized civic engagement hub and start making a difference in your community.
            </p>
            <Button className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
              Get Started
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-gradient-to-r from-red-500 to-pink-500 text-white"
      case "medium": return "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
      case "low": return "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
      default: return "bg-gradient-to-r from-gray-500 to-slate-500 text-white"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "positive": return "text-green-600 dark:text-green-400"
      case "warning": return "text-yellow-600 dark:text-yellow-400"
      case "completed": return "text-patriot-blue-600 dark:text-patriot-blue-400"
      default: return "text-gray-600 dark:text-gray-400"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-black dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl mb-8">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative px-8 py-12">
            <div className="flex flex-col lg:flex-row items-center justify-between">
              <div className="text-white mb-6 lg:mb-0">
                <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                  Welcome back, <span className="text-yellow-300">{user.email?.split('@')[0] || 'User'}</span>
                </h1>
                <p className="text-xl text-patriot-blue-100 mb-4">
                  Your civic engagement is making a real difference
                </p>
                {location && (
                  <div className="flex items-center text-patriot-blue-200">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span className="text-lg">{location.city}, {location.state}</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">{mockStats.impactScore}</div>
                      <div className="text-sm text-patriot-blue-200">Impact Score</div>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Award className="h-4 w-4 text-yellow-800" />
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <div className="text-white/80 text-sm">This Week's Goal</div>
                  <Progress value={(mockStats.weeklyProgress / mockStats.weeklyGoal) * 100} className="w-24 mt-1" />
                  <div className="text-white/80 text-xs mt-1">{mockStats.weeklyProgress}/{mockStats.weeklyGoal} actions</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {[
            { icon: Scale, label: "Bills Tracked", value: mockStats.trackedBills, color: "from-blue-500 to-cyan-500", change: "+2" },
            { icon: MessageSquare, label: "Messages Sent", value: mockStats.messagesSent, color: "from-green-500 to-emerald-500", change: "+4" },
            { icon: Newspaper, label: "Articles Read", value: mockStats.articlesRead, color: "from-purple-500 to-pink-500", change: "+12" },
            { icon: Vote, label: "Elections", value: mockStats.upcomingElections, color: "from-red-500 to-orange-500", change: "upcoming" },
            { icon: Megaphone, label: "Campaigns", value: mockStats.campaignsJoined, color: "from-yellow-500 to-amber-500", change: "+1" },
            { icon: CheckCircle, label: "Actions", value: mockStats.actionItemsCompleted, color: "from-teal-500 to-cyan-500", change: "completed" }
          ].map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`}></div>
                <CardContent className="p-4 relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <Badge variant="secondary" className="text-xs bg-white/80 text-gray-700">
                      {stat.change}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">{stat.label}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Priority Actions Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Priority Actions</h2>
                <p className="text-gray-600 dark:text-gray-400">Take action on the most important items</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1">
                {mockActionItems.filter(item => item.priority === "high").length} Urgent
              </Badge>
            </div>
          </div>
          
          <div className="grid gap-4">
            {mockActionItems.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.id} className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 opacity-50"></div>
                  <CardContent className="p-6 relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{item.title}</h3>
                            <Badge className={`${getPriorityColor(item.priority)} px-3 py-1 text-xs font-semibold`}>
                              {item.priority.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-white/80 text-gray-600 border-gray-200">
                              {item.source === "legislation" && "📜 Legislation"}
                              {item.source === "elections" && "🗳️ Elections"}
                              {item.source === "news" && "📰 News"}
                              {item.source === "action-center" && "📢 Action Center"}
                            </Badge>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">{item.description}</p>
                          <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>Due: {new Date(item.deadline).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center">
                              <Activity className="h-4 w-4 mr-1" />
                              <span>{item.estimatedTime}</span>
                            </div>
                            <div className="flex items-center">
                              <TrendingUp className="h-4 w-4 mr-1" />
                              <span>{item.impact} Impact</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                        {item.action}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Tracked Bills */}
          <Card className="lg:col-span-2 border-0 shadow-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900"></div>
            <CardHeader className="relative">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Scale className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900 dark:text-white">Tracked Legislation</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">Bills you're following</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-4">
                {mockTrackedBills.map((bill) => (
                  <div key={bill.id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-bold text-gray-900 dark:text-white">{bill.id}</h4>
                          <Badge className={getPriorityColor(bill.urgency)}>
                            {bill.urgency}
                          </Badge>
                          <Badge variant="outline" className="bg-white/80 text-gray-600">
                            {bill.yourPosition}
                          </Badge>
                        </div>
                        <p className="text-gray-900 dark:text-white font-medium mb-2">{bill.title}</p>
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <span>Status: {bill.status}</span>
                          <span>Updated: {new Date(bill.lastUpdate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Progress value={bill.progress} className="flex-1 h-2" />
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{bill.progress}%</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm hover:bg-white">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-6 bg-white/80 backdrop-blur-sm hover:bg-white border-gray-200 text-gray-900 font-medium py-3 rounded-xl">
                View All Bills
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900"></div>
            <CardHeader className="relative">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900 dark:text-white">Recent Activity</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">Your latest actions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-4">
                {mockRecentActivity.map((activity, index) => {
                  const Icon = activity.icon
                  return (
                    <div key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 dark:border-gray-700/50 shadow-md hover:shadow-lg transition-all duration-300">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg">
                          <Icon className={`h-4 w-4 ${getStatusColor(activity.status)}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{activity.title}</h4>
                            <Badge variant="outline" className="text-xs bg-white/80 text-gray-600">
                              {activity.source === "legislation" && "📜"}
                              {activity.source === "elections" && "🗳️"}
                              {activity.source === "news" && "📰"}
                              {activity.source === "action-center" && "📢"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{activity.description}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{activity.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming Elections */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-900"></div>
            <CardHeader className="relative">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Vote className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900 dark:text-white">Upcoming Elections</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">Elections in your area</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-4">
                {mockUpcomingElections.map((election, index) => (
                  <div key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 dark:border-gray-700/50 shadow-md hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-bold text-gray-900 dark:text-white">{election.position}</h4>
                          {election.status === "not_registered" && (
                            <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white">
                              Not Registered
                            </Badge>
                          )}
                          {election.status === "registered" && (
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                              Registered ✓
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{election.type}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(election.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{election.daysUntil}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">days</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-6 bg-white/80 backdrop-blur-sm hover:bg-white border-gray-200 text-gray-900 font-medium py-3 rounded-xl">
                View All Elections
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Location Settings */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl"></div>
            <div className="relative">
              <LocationSettings />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
