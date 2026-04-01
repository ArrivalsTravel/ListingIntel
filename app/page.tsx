import { Header } from '@/components/header'
import { SearchInput } from '@/components/search-input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Mail, 
  Globe, 
  ImageIcon, 
  Shield, 
  Zap,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6">
              Trusted by 1,000+ Property Managers
            </Badge>
            
            <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Find Your Listing{' '}
              <span className="text-primary">Everywhere</span>
            </h1>
            
            <p className="mb-8 text-pretty text-lg text-muted-foreground md:text-xl">
              Discover where your Airbnb listing appears across the web. Extract direct contact information from property managers using reverse image search technology.
            </p>
            
            {/* Search Input */}
            <div className="mx-auto max-w-2xl">
              <SearchInput size="large" />
              <p className="mt-3 text-sm text-muted-foreground">
                Paste an Airbnb listing URL to get started. Example:{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  airbnb.com/rooms/12345678
                </code>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="border-t border-border bg-card/50 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Powerful Intelligence Features
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Our platform analyzes listings across multiple dimensions to give you comprehensive insights.
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard 
              icon={ImageIcon}
              title="Reverse Image Search"
              description="Find where your listing photos appear across the web, including VRBO, Booking.com, and direct booking sites."
            />
            <FeatureCard 
              icon={Globe}
              title="PMS Detection"
              description="Automatically detect which Property Management System (Lodgify, OwnerRez, Guesty) hosts use."
            />
            <FeatureCard 
              icon={Mail}
              title="Contact Extraction"
              description="Extract email addresses, phone numbers, and social media links from discovered direct booking sites."
            />
            <FeatureCard 
              icon={Shield}
              title="Confidence Scoring"
              description="Each finding includes a confidence score so you know how reliable the information is."
            />
            <FeatureCard 
              icon={Zap}
              title="Fast Analysis"
              description="Get results in seconds, not hours. Our optimized pipeline processes listings quickly."
            />
            <FeatureCard 
              icon={Search}
              title="Multi-Platform Search"
              description="Search across 50+ booking platforms and vacation rental sites simultaneously."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              How It Works
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Three simple steps to discover direct booking opportunities.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            <StepCard 
              step={1}
              title="Paste Listing URL"
              description="Copy any Airbnb listing URL and paste it into our search bar."
            />
            <StepCard 
              step={2}
              title="We Analyze"
              description="Our AI-powered system scans the web for matching images and platform signatures."
            />
            <StepCard 
              step={3}
              title="Get Results"
              description="Receive a detailed report with direct booking sites, contact info, and confidence scores."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-card/50 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="flex flex-col items-center gap-6 p-8 text-center md:p-12">
              <h2 className="text-3xl font-bold text-foreground">
                Ready to Find Direct Contacts?
              </h2>
              <p className="max-w-xl text-muted-foreground">
                Start discovering where your listings appear and extract valuable contact information today.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link href="/search?listing_id=demo">
                  <Button size="lg" className="gap-2">
                    Try Demo Search
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg">
                  View Pricing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <Search className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">ListingIntel</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for property managers. Powered by reverse image search.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { 
  icon: React.ComponentType<{ className?: string }>, 
  title: string, 
  description: string 
}) {
  return (
    <Card className="border-border/50 bg-card transition-colors hover:border-border">
      <CardContent className="p-6">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function StepCard({ step, title, description }: { 
  step: number, 
  title: string, 
  description: string 
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
        {step}
      </div>
      <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
