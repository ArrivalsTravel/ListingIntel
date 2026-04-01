'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Server, CheckCircle2, Info } from 'lucide-react'
import type { PMSDetection } from '@/lib/types'

interface PMSDetectionCardProps {
  detection: PMSDetection
}

export function PMSDetectionCard({ detection }: PMSDetectionCardProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success'
    if (confidence >= 60) return 'warning'
    return 'secondary'
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <Server className="h-4 w-4 text-accent" />
            </div>
            PMS Detection
          </CardTitle>
          <Badge variant={getConfidenceColor(detection.confidence)}>
            {detection.confidence}% Confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Detected Platform */}
        <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-2xl font-bold text-primary-foreground">
            {detection.platform.charAt(0)}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-foreground">
              {detection.platform}
            </h4>
            <p className="text-sm text-muted-foreground">
              Property Management System
            </p>
          </div>
        </div>

        {/* Detection Indicators */}
        <div>
          <h5 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Info className="h-4 w-4" />
            Detection Indicators
          </h5>
          <ul className="space-y-2">
            {detection.indicators.map((indicator, index) => (
              <li 
                key={index}
                className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-sm"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                <span className="text-foreground">{indicator}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* What this means */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">What this means:</span>{' '}
            This property is likely managed through {detection.platform}, which means 
            you may find their direct booking site hosted on {detection.platform}&apos;s platform.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
