'use client'

import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ImageIcon, ExternalLink } from 'lucide-react'
import type { ImageMatch } from '@/lib/types'
import { extractDomain } from '@/lib/utils'

interface ImageMatchesCardProps {
  matches: ImageMatch[]
}

export function ImageMatchesCard({ matches }: ImageMatchesCardProps) {
  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 95) return 'success'
    if (similarity >= 80) return 'warning'
    return 'secondary'
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
              <ImageIcon className="h-4 w-4 text-warning" />
            </div>
            Image Matches
          </CardTitle>
          <Badge variant="outline">
            {matches.length} Found
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <div className="rounded-lg bg-muted/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No image matches found across other platforms.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match, index) => (
              <div
                key={index}
                className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center"
              >
                {/* Matched Image Thumbnail */}
                <div className="relative h-20 w-32 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image
                    src={match.imageUrl}
                    alt={`Match on ${match.platform}`}
                    fill
                    className="object-cover"
                  />
                </div>
                
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h4 className="font-medium text-foreground">
                      {match.platform}
                    </h4>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {extractDomain(match.foundOnUrl)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={getSimilarityColor(match.similarity)}>
                      {match.similarity}% Match
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      asChild
                    >
                      <a 
                        href={match.foundOnUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
