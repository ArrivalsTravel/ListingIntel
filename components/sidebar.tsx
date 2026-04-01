"use client"

import { History, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { RecentSearches } from "@/components/recent-searches"
import type { SearchResult } from "@/lib/types"

interface SidebarProps {
  searches: SearchResult[]
  onSelect: (search: SearchResult) => void
  onDelete: (index: number) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function Sidebar({ searches, onSelect, onDelete, isOpen, onOpenChange }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-72 flex-shrink-0 border-r border-border bg-sidebar lg:block">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-sidebar-border p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
              <History className="size-4" />
              Recent Searches
            </h2>
            {searches.length > 0 && (
              <span className="rounded-full bg-sidebar-accent px-2 py-0.5 text-xs text-sidebar-accent-foreground">
                {searches.length}
              </span>
            )}
          </div>
          <RecentSearches searches={searches} onSelect={onSelect} onDelete={onDelete} />
        </div>
      </aside>

      {/* Mobile sheet */}
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <History className="size-4" />
              Recent Searches
              {searches.length > 0 && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs">{searches.length}</span>
              )}
            </SheetTitle>
          </SheetHeader>
          <RecentSearches
            searches={searches}
            onSelect={(search) => {
              onSelect(search)
              onOpenChange(false)
            }}
            onDelete={onDelete}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

interface SidebarTriggerProps {
  onClick: () => void
  count: number
}

export function SidebarTrigger({ onClick, count }: SidebarTriggerProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed bottom-4 left-4 z-40 lg:hidden"
      onClick={onClick}
    >
      <History className="size-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
          {count}
        </span>
      )}
    </Button>
  )
}
