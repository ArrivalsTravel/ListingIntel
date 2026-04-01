"use client"

import { useState, useCallback } from "react"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ResultsDashboard } from "@/components/results-dashboard"
import { Sidebar, SidebarTrigger } from "@/components/sidebar"
import { EmptyState } from "@/components/empty-state"
import { LoadingState } from "@/components/loading-state"
import type { SearchResult } from "@/lib/types"

export default function Page() {
  const [isLoading, setIsLoading] = useState(false)
  const [currentResult, setCurrentResult] = useState<SearchResult | null>(null)
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async (url: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const isDemo = url === "demo"
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isDemo ? { demo: true } : { airbnb_url: url }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Search failed")
      }

      const result: SearchResult = await response.json()

      setCurrentResult(result)
      setRecentSearches((prev) => [result, ...prev.slice(0, 9)])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSelectSearch = useCallback((search: SearchResult) => {
    setCurrentResult(search)
    setError(null)
  }, [])

  const handleDeleteSearch = useCallback((index: number) => {
    setRecentSearches((prev) => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <div className="flex flex-1">
        <Sidebar
          searches={recentSearches}
          onSelect={handleSelectSearch}
          onDelete={handleDeleteSearch}
          isOpen={isSidebarOpen}
          onOpenChange={setIsSidebarOpen}
        />

        <main className="flex flex-1 flex-col">
          <HeroSection onSearch={handleSearch} isLoading={isLoading} />

          {error && (
            <div className="mx-6 mt-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {isLoading ? (
            <LoadingState />
          ) : currentResult ? (
            <div className="p-6">
              <ResultsDashboard result={currentResult} />
            </div>
          ) : (
            <EmptyState />
          )}
        </main>
      </div>

      <SidebarTrigger onClick={() => setIsSidebarOpen(true)} count={recentSearches.length} />
    </div>
  )
}
