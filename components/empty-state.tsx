'use client'

import Link from 'next/link'
import { Search, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function EmptyState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md border-dashed">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              No Listing Selected
            </h2>
            <p className="text-sm text-muted-foreground">
              Paste an Airbnb listing URL in the search bar to analyze where your listing appears across the web.
            </p>
          </div>

          <Link href="/">
            <Button className="gap-2">
              Start a New Search
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
