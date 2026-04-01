'use client'

import { cn } from '@/lib/utils'

interface ConfidenceScoreProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function ConfidenceScore({ score, size = 'md', showLabel = true }: ConfidenceScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success'
    if (score >= 60) return 'text-warning'
    return 'text-destructive'
  }

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-success/10 border-success/30'
    if (score >= 60) return 'bg-warning/10 border-warning/30'
    return 'bg-destructive/10 border-destructive/30'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'High Confidence'
    if (score >= 60) return 'Medium Confidence'
    return 'Low Confidence'
  }

  const sizeClasses = {
    sm: 'h-10 w-10 text-sm',
    md: 'h-14 w-14 text-lg',
    lg: 'h-20 w-20 text-2xl',
  }

  return (
    <div className="flex items-center gap-3">
      <div 
        className={cn(
          'flex items-center justify-center rounded-full border-2 font-bold',
          sizeClasses[size],
          getScoreBackground(score),
          getScoreColor(score)
        )}
      >
        {score}
      </div>
      {showLabel && (
        <div className="text-right">
          <p className={cn('font-semibold', getScoreColor(score))}>
            {getScoreLabel(score)}
          </p>
          <p className="text-xs text-muted-foreground">
            Overall Score
          </p>
        </div>
      )}
    </div>
  )
}
