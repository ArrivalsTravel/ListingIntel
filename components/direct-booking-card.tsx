'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Globe, ExternalLink, Image as ImageIcon, Search, Server } from 'lucide-react'
import type { DirectBookingSite } from '@/lib/types'

interface DirectBookingCardProps {
  sites: DirectBookingSite[]
}

export function DirectBookingCard({ sites }: DirectBookingCardProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success'
    if (confidence >= 60) return 'warning'
    return 'secondary'
  }

  const getFoundViaIcon = (method: DirectBookingSite['foundVia']) => {
    switch (method) {
      case 'image-match':
        return <ImageIcon className="h-3 w-3" />
      case 'domain-search':
        return <Search className="h-3 w-3" />
      case 'pms-detection':
        return <Server className="h-3 w-3" />
    }
  }

  const getFoundViaLabel = (method: DirectBookingSite['foundVia']) => {
    switch (method) {
      case 'image-match':
        return 'Image Match'
      case 'domain-search':
        return 'Domain Search'
      case 'pms-detection':
        return 'PMS Detection'
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
              <Globe className="h-4 w-4 text-success" />
            </div>
            Direct Booking Sites
          </CardTitle>
          <Badge variant="outline">
            {sites.length} Found
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {sites.length === 0 ? (
          <div className="rounded-lg bg-muted/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No direct booking sites found for this listing.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sites.map((site, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  {/* Platform Icon */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-lg font-bold">
                    {site.platform.charAt(0)}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-foreground">
                      {site.platform}
                    </h4>
                    <p className="truncate font-mono text-sm text-muted-foreground">
                      {site.domain}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                  {/* How it was found */}
                  <Badge variant="secondary" className="gap-1">
                    {getFoundViaIcon(site.foundVia)}
                    {getFoundViaLabel(site.foundVia)}
                  </Badge>
                  
                  {/* Confidence */}
                  <Badge variant={getConfidenceColor(site.confidence)}>
                    {site.confidence}%
                  </Badge>
                  
                  {/* Visit Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    asChild
                  >
                    <a 
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
