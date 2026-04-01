'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { ListingOverview } from '@/components/listing-overview'
import { PMSDetectionCard } from '@/components/pms-detection'
import { DirectBookingCard } from '@/components/direct-booking-card'
import { ContactInfoCard } from '@/components/contact-info'
import { ImageMatchesCard } from '@/components/image-matches'
import { ConfidenceScore } from '@/components/confidence-score'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { mockSearchResult, mockRecentSearches } from '@/lib/mock-data'
import type { SearchResult } from '@/lib/types'

function SearchContent() {
  const searchParams = useSearchParams()
  const listingId = searchParams.get('listing_id')
  
  const [isLoading, setIsLoading] = useState(true)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    // Simulate API call
    const fetchResults = async () => {
      setIsLoading(true)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      if (listingId) {
        setResult(mockSearchResult)
      } else {
        setResult(null)
      }
      setIsLoading(false)
    }

    fetchResults()
  }, [listingId])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex">
        <Sidebar 
          recentSearches={mockRecentSearches}
          currentListingId={listingId || undefined}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className={`flex-1 transition-all ${sidebarOpen ? 'lg:ml-0' : ''}`}>
          {/* Mobile sidebar toggle */}
          <div className="sticky top-14 z-20 flex items-center gap-2 border-b border-border bg-background p-4 lg:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {result ? result.listing.title : 'Search Results'}
            </span>
          </div>

          <div className="mx-auto max-w-6xl p-4 md:p-6 lg:p-8">
            {isLoading ? (
              <LoadingState />
            ) : !result ? (
              <EmptyState />
            ) : (
              <div className="space-y-6">
                {/* Header with confidence */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">
                      Analysis Results
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Found {result.directBookingSites.length} direct booking sites and {result.imageMatches.length} image matches
                    </p>
                  </div>
                  <ConfidenceScore score={result.overallConfidence} />
                </div>

                {/* Main grid */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Listing Overview - Full width on mobile, half on desktop */}
                  <ListingOverview listing={result.listing} />
                  
                  {/* PMS Detection */}
                  {result.pmsDetection && (
                    <PMSDetectionCard detection={result.pmsDetection} />
                  )}
                </div>

                {/* Direct Booking Sites - Full width */}
                <DirectBookingCard sites={result.directBookingSites} />

                {/* Contact Info and Image Matches side by side */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {result.contactInfo && (
                    <ContactInfoCard contact={result.contactInfo} />
                  )}
                  <ImageMatchesCard matches={result.imageMatches} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SearchContent />
    </Suspense>
  )
}
