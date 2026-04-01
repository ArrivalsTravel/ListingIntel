"use client"

import { useState } from "react"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface HeroSectionProps {
  onSearch: (url: string) => void
  isLoading: boolean
}

export function HeroSection({ onSearch, isLoading }: HeroSectionProps) {
  const [url, setUrl] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onSearch(url.trim())
    }
  }

  const handleDemo = () => {
    onSearch("demo")
  }

  return (
    <div className="relative overflow-hidden border-b border-border bg-card py-16">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <Badge variant="secondary" className="mb-4">
          <Sparkles className="mr-1 size-3" />
          Powered by AI
        </Badge>

        <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight md:text-5xl">
          Discover Direct Booking Intelligence
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-pretty text-lg text-muted-foreground">
          Paste any Airbnb or VRBO listing URL to instantly find direct booking websites, PMS
          platforms, and host contact information.
        </p>

        <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Input
              type="url"
              placeholder="https://www.airbnb.com/rooms/12345..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-12 bg-background pr-4 text-base"
              disabled={isLoading}
            />
          </div>
          <Button type="submit" size="lg" className="h-12" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="mr-2 size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Analyzing...
              </>
            ) : (
              <>
                Analyze Listing
                <ArrowRight data-icon="inline-end" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>or</span>
          <Button variant="link" onClick={handleDemo} disabled={isLoading} className="h-auto p-0">
            Try demo mode
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>Detects 30+ platforms:</span>
          <div className="flex flex-wrap justify-center gap-2">
            {["Lodgify", "OwnerRez", "Hostaway", "Guesty", "Hostfully", "Smoobu"].map((name) => (
              <Badge key={name} variant="outline" className="font-normal">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
