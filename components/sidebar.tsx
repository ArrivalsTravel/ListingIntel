'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/search-input'
import { formatDate, truncate } from '@/lib/utils'
import type { RecentSearch } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SidebarProps {
  recentSearches: RecentSearch[]
  currentListingId?: string
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ recentSearches, currentListingId, isOpen, onToggle }: SidebarProps) {
  const [searches, setSearches] = useState(recentSearches)

  const handleDelete = (id: string) => {
    setSearches(searches.filter(s => s.id !== id))
  }

  const handleClearAll = () => {
    setSearches([])
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        'fixed left-0 top-14 z-50 flex h-[calc(100vh-3.5rem)] w-80 flex-col border-r border-border bg-background transition-transform lg:static lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Mobile close button */}
        <button 
          onClick={onToggle}
          className="absolute right-4 top-4 rounded-md p-1 hover:bg-muted lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col gap-4 p-4">
          <h2 className="text-sm font-semibold text-muted-foreground">New Search</h2>
          <SearchInput placeholder="Paste Airbnb URL..." />
        </div>

        <div className="flex-1 overflow-y-auto border-t border-border">
          <div className="flex items-center justify-between p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Clock className="h-4 w-4" />
              Recent Searches
            </h2>
            {searches.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearAll}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                Clear All
              </Button>
            )}
          </div>

          {searches.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No recent searches
            </div>
          ) : (
            <div className="flex flex-col gap-1 px-2">
              {searches.map((search) => (
                <Link
                  key={search.id}
                  href={`/search?listing_id=${search.id}`}
                  className={cn(
                    'group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted',
                    currentListingId === search.id && 'bg-muted'
                  )}
                >
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image
                      src={search.thumbnailUrl}
                      alt={search.listingTitle}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-foreground">
                      {truncate(search.listingTitle, 25)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {search.resultsCount} results found
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(search.searchedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      handleDelete(search.id)
                    }}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Toggle button for desktop */}
      <button
        onClick={onToggle}
        className="fixed left-0 top-1/2 z-30 hidden -translate-y-1/2 rounded-r-md border border-l-0 border-border bg-card p-1.5 transition-all hover:bg-muted lg:block"
        style={{ left: isOpen ? '320px' : '0' }}
      >
        {isOpen ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
    </>
  )
}
