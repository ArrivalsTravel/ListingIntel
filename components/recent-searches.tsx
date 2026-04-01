"use client"

import { Clock, ExternalLink, Trash2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { SearchResult } from "@/lib/types"

interface RecentSearchesProps {
  searches: SearchResult[]
  onSelect: (search: SearchResult) => void
  onDelete: (index: number) => void
}

export function RecentSearches({ searches, onSelect, onDelete }: RecentSearchesProps) {
  if (searches.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Clock className="mb-3 size-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No recent searches</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Your search history will appear here
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-2">
        {searches.map((search, index) => (
          <div key={index}>
            <button
              onClick={() => onSelect(search)}
              className="group flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {search.is_demo ? "Demo Search" : `Search #${searches.length - index}`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {search.summary.total} pages found
                </p>
                <p className="text-xs text-muted-foreground">
                  {search.summary.direct} direct booking
                  {search.summary.direct !== 1 ? "s" : ""}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {new Date(search.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(index)
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </button>
            {index < searches.length - 1 && <Separator className="my-1" />}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
