"use client"

import { useState, useEffect } from "react"
import { Search, ExternalLink, Clock, Filter, Bookmark, BookmarkCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/components/auth-provider"
import { useLocation } from "@/components/location-provider"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface NewsArticle {
  id: string
  title: string
  description: string
  url: string
  source: string
  author: string
  published_at: string
  image_url: string
  category: string
  tags: string[]
  political_leaning: "left" | "center" | "right"
  credibility: "high" | "medium" | "low"
  saved?: boolean
}

const leaningColors = {
  left: "bg-blue-100 text-blue-800",
  center: "bg-gray-100 text-gray-800",
  right: "bg-red-100 text-red-800",
}

const credibilityColors = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
}

export function NewsAggregator() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [leaningFilter, setLeaningFilter] = useState("all")
  const [topicFilter, setTopicFilter] = useState("all")
  const [credibilityFilter, setCredibilityFilter] = useState("all")
  const { user } = useAuth()
  const { location } = useLocation()
  const { toast } = useToast()

  useEffect(() => {
    fetchNews()
  }, [location])

  const fetchNews = async () => {
    setLoading(true)
    try {
      // Fetch cached articles from Supabase
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(50)

      if (error) throw error

      // If no cached articles, use mock data
      if (!data || data.length === 0) {
        const mockArticles: NewsArticle[] = [
          {
            id: "1",
            title: "Senate Passes Bipartisan Infrastructure Bill",
            description:
              "The Senate approved a $1.2 trillion infrastructure package with bipartisan support, focusing on roads, bridges, and broadband expansion.",
            url: "#",
            source: "Associated Press",
            author: "John Reporter",
            published_at: "2025-01-30T14:30:00Z",
            image_url: "/placeholder.svg?height=200&width=400",
            category: "Politics",
            tags: ["infrastructure", "economy", "bipartisan"],
            political_leaning: "center",
            credibility: "high",
          },
          {
            id: "2",
            title: "New Climate Change Report Shows Accelerating Trends",
            description:
              "Scientists release comprehensive data showing climate change impacts are occurring faster than previously predicted.",
            url: "#",
            source: "Reuters",
            author: "Climate Desk",
            published_at: "2025-01-30T12:15:00Z",
            image_url: "/placeholder.svg?height=200&width=400",
            category: "Environment",
            tags: ["climate", "environment", "science"],
            political_leaning: "center",
            credibility: "high",
          },
        ]
        setArticles(mockArticles)
      } else {
        setArticles(data)
      }
    } catch (error) {
      console.error("Error fetching news:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLeaning = leaningFilter === "all" || article.political_leaning === leaningFilter
    const matchesTopic = topicFilter === "all" || article.tags.includes(topicFilter)
    const matchesCredibility = credibilityFilter === "all" || article.credibility === credibilityFilter

    return matchesSearch && matchesLeaning && matchesTopic && matchesCredibility
  })

  const toggleSave = async (articleId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save articles.",
        variant: "destructive",
      })
      return
    }

    const article = articles.find((a) => a.id === articleId)
    if (!article) return

    try {
      if (article.saved) {
        await supabase.from("user_saved_articles").delete().eq("user_id", user.id).eq("article_id", articleId)
      } else {
        await supabase.from("user_saved_articles").insert({
          user_id: user.id,
          article_id: articleId,
        })
      }

      setArticles(articles.map((a) => (a.id === articleId ? { ...a, saved: !a.saved } : a)))

      toast({
        title: article.saved ? "Article removed" : "Article saved",
        description: article.saved ? "Article removed from your saved list." : "Article saved to your reading list.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update save status.",
        variant: "destructive",
      })
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">News Aggregator</h1>
        <p className="text-gray-600">Stay informed with curated political and civic news</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search news articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <Select value={leaningFilter} onValueChange={setLeaningFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Political leaning" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leanings</SelectItem>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>

          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              <SelectItem value="economy">Economy</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="climate">Climate</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="infrastructure">Infrastructure</SelectItem>
            </SelectContent>
          </Select>

          <Select value={credibilityFilter} onValueChange={setCredibilityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Source credibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="high">High Credibility</SelectItem>
              <SelectItem value="medium">Medium Credibility</SelectItem>
              <SelectItem value="low">Low Credibility</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* News Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredArticles.map((article) => (
          <Card key={article.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <CardTitle className="text-lg leading-tight flex-1">{article.title}</CardTitle>
                <div className="flex items-center space-x-2 ml-2">
                  <Button variant="ghost" size="icon" onClick={() => toggleSave(article.id)}>
                    {article.saved ? (
                      <BookmarkCheck className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
              <CardDescription className="text-sm text-gray-600">{article.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={leaningColors[article.political_leaning]}>{article.political_leaning}</Badge>
                    <Badge className={credibilityColors[article.credibility]}>{article.credibility} credibility</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="font-medium">{article.source}</span>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{formatTimeAgo(article.published_at)}</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full" asChild>
                  <a href={article.url} target="_blank" rel="noopener noreferrer">
                    Read More
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className="text-center py-12">
          <Filter className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No articles found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  )
}
