'use client'

import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Bed, Bath, Users, ExternalLink } from 'lucide-react'
import type { ListingData } from '@/lib/types'

interface ListingOverviewProps {
  listing: ListingData
}

export function ListingOverview({ listing }: ListingOverviewProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            Listing Overview
          </CardTitle>
          <a 
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View on Airbnb
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Listing Image */}
        <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
          <Image
            src={listing.thumbnailUrl}
            alt={listing.title}
            fill
            className="object-cover"
          />
        </div>

        {/* Listing Details */}
        <div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {listing.title}
          </h3>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {listing.location}
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-3">
          <Badge variant="secondary" className="gap-1.5">
            <Bed className="h-3.5 w-3.5" />
            {listing.bedrooms} Bedrooms
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <Bath className="h-3.5 w-3.5" />
            {listing.bathrooms} Bathrooms
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {listing.maxGuests} Guests
          </Badge>
        </div>

        {/* Listing ID */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <span className="text-sm text-muted-foreground">Listing ID</span>
          <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
            {listing.id}
          </code>
        </div>
      </CardContent>
    </Card>
  )
}
