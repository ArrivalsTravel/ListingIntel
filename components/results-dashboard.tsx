"use client"

import {
  Building2,
  Mail,
  Phone,
  Globe,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
  Shield,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import type { SearchResult, Match } from "@/lib/types"

interface ResultsDashboardProps {
  result: SearchResult
}

function ConfidenceScore({ result }: { result: SearchResult }) {
  const { summary } = result
  const hasContacts = summary.emails.length > 0 || summary.phones.length > 0
  const hasDirectBooking = summary.direct > 0
  const hasPlatformDetection = result.matches.some((m) => m.platform !== null)

  let score = 0
  if (summary.total > 0) score += 20
  if (hasDirectBooking) score += 30
  if (hasPlatformDetection) score += 25
  if (hasContacts) score += 25

  const getScoreColor = () => {
    if (score >= 80) return "text-success"
    if (score >= 50) return "text-warning"
    return "text-muted-foreground"
  }

  const getScoreLabel = () => {
    if (score >= 80) return "High"
    if (score >= 50) return "Medium"
    return "Low"
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="size-4" />
          Confidence Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <span className={`text-4xl font-bold ${getScoreColor()}`}>{score}%</span>
          <Badge variant="outline" className="mb-1">
            {getScoreLabel()}
          </Badge>
        </div>
        <Progress value={score} className="mt-3 h-2" />
        <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {summary.total > 0 ? (
              <CheckCircle2 className="size-3 text-success" />
            ) : (
              <AlertCircle className="size-3" />
            )}
            Pages found
          </div>
          <div className="flex items-center gap-2">
            {hasDirectBooking ? (
              <CheckCircle2 className="size-3 text-success" />
            ) : (
              <AlertCircle className="size-3" />
            )}
            Direct booking detected
          </div>
          <div className="flex items-center gap-2">
            {hasPlatformDetection ? (
              <CheckCircle2 className="size-3 text-success" />
            ) : (
              <AlertCircle className="size-3" />
            )}
            Platform identified
          </div>
          <div className="flex items-center gap-2">
            {hasContacts ? (
              <CheckCircle2 className="size-3 text-success" />
            ) : (
              <AlertCircle className="size-3" />
            )}
            Contact info found
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryCards({ result }: { result: SearchResult }) {
  const { summary } = result

  const stats = [
    {
      label: "Total Pages",
      value: summary.total,
      icon: Globe,
      description: "Pages with matching images",
    },
    {
      label: "Direct Booking",
      value: summary.direct,
      icon: CheckCircle2,
      description: "PMS/direct booking sites",
      highlight: true,
    },
    { label: "OTA Listings", value: summary.ota, icon: Building2, description: "Third-party OTAs" },
    { label: "Unknown", value: summary.unknown, icon: HelpCircle, description: "Unidentified sites" },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className={stat.highlight ? "border-success/30 bg-success/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
            <stat.icon
              className={`size-4 ${stat.highlight ? "text-success" : "text-muted-foreground"}`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ContactFindings({ result }: { result: SearchResult }) {
  const { summary } = result

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="size-4" />
          Contact Information
        </CardTitle>
        <CardDescription>Emails and phone numbers found on direct booking sites</CardDescription>
      </CardHeader>
      <CardContent>
        {summary.emails.length === 0 && summary.phones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="mb-2 size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No contact information found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {summary.emails.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Emails
                </p>
                <div className="flex flex-wrap gap-2">
                  {summary.emails.map((email) => (
                    <a
                      key={email}
                      href={`mailto:${email}`}
                      className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm transition-colors hover:bg-accent/80"
                    >
                      <Mail className="size-3" />
                      {email}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {summary.phones.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Phone Numbers
                </p>
                <div className="flex flex-wrap gap-2">
                  {summary.phones.map((phone) => (
                    <a
                      key={phone}
                      href={`tel:${phone}`}
                      className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm transition-colors hover:bg-accent/80"
                    >
                      <Phone className="size-3" />
                      {phone}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PlatformDetection({ matches }: { matches: Match[] }) {
  const directMatches = matches.filter((m) => m.is_direct && m.platform)
  const otaMatches = matches.filter((m) => m.is_ota)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="size-4" />
          Platform Detection
        </CardTitle>
        <CardDescription>PMS and booking engine identification</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {directMatches.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Direct Booking Platforms
              </p>
              <div className="flex flex-wrap gap-2">
                {directMatches.map((match) => (
                  <Badge key={match.url} variant="default" className="gap-1.5">
                    <CheckCircle2 className="size-3" />
                    {match.platform}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {otaMatches.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                OTA Platforms
              </p>
              <div className="flex flex-wrap gap-2">
                {otaMatches.map((match) => (
                  <Badge key={match.url} variant="secondary" className="gap-1.5">
                    <Globe className="size-3" />
                    {match.platform}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {directMatches.length === 0 && otaMatches.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <AlertCircle className="mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No platforms detected</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function MatchesList({ matches }: { matches: Match[] }) {
  const directMatches = matches.filter((m) => m.is_direct)
  const otaMatches = matches.filter((m) => m.is_ota)
  const unknownMatches = matches.filter((m) => !m.platform && !m.is_ota)

  const MatchItem = ({ match }: { match: Match }) => (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
      <div
        className={`mt-0.5 flex size-8 flex-shrink-0 items-center justify-center rounded-full ${
          match.is_direct && match.platform
            ? "bg-success/10 text-success"
            : match.is_ota
              ? "bg-secondary text-secondary-foreground"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {match.is_direct && match.platform ? (
          <CheckCircle2 className="size-4" />
        ) : match.is_ota ? (
          <Globe className="size-4" />
        ) : (
          <HelpCircle className="size-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{match.title || match.domain}</p>
            <p className="truncate text-sm text-muted-foreground">{match.domain}</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0" asChild>
                <a href={match.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open in new tab</TooltipContent>
          </Tooltip>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {match.platform && (
            <Badge variant={match.is_direct ? "default" : "secondary"}>{match.platform}</Badge>
          )}
          {match.emails.length > 0 && (
            <Badge variant="outline" className="gap-1">
              <Mail className="size-3" />
              {match.emails.length} email{match.emails.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {match.phones.length > 0 && (
            <Badge variant="outline" className="gap-1">
              <Phone className="size-3" />
              {match.phones.length} phone{match.phones.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {match.error && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="size-3" />
              Error
            </Badge>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="size-4" />
          All Discovered Pages
        </CardTitle>
        <CardDescription>
          {matches.length} page{matches.length !== 1 ? "s" : ""} found with matching images
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({matches.length})</TabsTrigger>
            <TabsTrigger value="direct">Direct ({directMatches.length})</TabsTrigger>
            <TabsTrigger value="ota">OTA ({otaMatches.length})</TabsTrigger>
            <TabsTrigger value="unknown">Unknown ({unknownMatches.length})</TabsTrigger>
          </TabsList>
          <ScrollArea className="mt-4 h-[400px]">
            <TabsContent value="all" className="m-0 flex flex-col gap-3">
              {matches.map((match, i) => (
                <MatchItem key={i} match={match} />
              ))}
            </TabsContent>
            <TabsContent value="direct" className="m-0 flex flex-col gap-3">
              {directMatches.length > 0 ? (
                directMatches.map((match, i) => <MatchItem key={i} match={match} />)
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No direct booking sites found
                </p>
              )}
            </TabsContent>
            <TabsContent value="ota" className="m-0 flex flex-col gap-3">
              {otaMatches.length > 0 ? (
                otaMatches.map((match, i) => <MatchItem key={i} match={match} />)
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No OTA listings found
                </p>
              )}
            </TabsContent>
            <TabsContent value="unknown" className="m-0 flex flex-col gap-3">
              {unknownMatches.length > 0 ? (
                unknownMatches.map((match, i) => <MatchItem key={i} match={match} />)
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No unknown pages found
                </p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function ImagePreview({ imageUrl }: { imageUrl: string }) {
  if (!imageUrl || imageUrl === "demo") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="size-4" />
            Listing Image
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
            <ImageIcon className="size-12 text-muted-foreground/30" />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">Demo mode - no image</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="size-4" />
          Listing Image
        </CardTitle>
        <CardDescription>Hero image used for reverse search</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg">
          <img
            src={imageUrl}
            alt="Listing hero image"
            className="aspect-video w-full object-cover"
          />
        </div>
        <Button variant="outline" className="mt-3 w-full" asChild>
          <a href={imageUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink data-icon="inline-start" />
            View Full Image
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}

export function ResultsDashboard({ result }: ResultsDashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analysis Results</h2>
          <p className="text-sm text-muted-foreground">
            {result.is_demo ? "Demo results" : `Searched at ${new Date(result.timestamp).toLocaleString()}`}
          </p>
        </div>
        {result.is_demo && (
          <Badge variant="secondary">Demo Mode</Badge>
        )}
      </div>

      <SummaryCards result={result} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MatchesList matches={result.matches} />
        </div>
        <div className="flex flex-col gap-6">
          <ConfidenceScore result={result} />
          <ContactFindings result={result} />
          <PlatformDetection matches={result.matches} />
          <ImagePreview imageUrl={result.image_url} />
        </div>
      </div>
    </div>
  )
}
