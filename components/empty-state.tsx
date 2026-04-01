import { Search, ArrowUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Card className="max-w-md border-dashed">
        <CardContent className="flex flex-col items-center pt-6 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <Search className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No Results Yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Enter an Airbnb or VRBO listing URL above to discover direct booking websites, PMS
            platforms, and host contact information.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowUp className="size-4 animate-bounce" />
            <span>Paste a URL to get started</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
