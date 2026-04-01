export interface ListingData {
  id: string
  title: string
  url: string
  location: string
  bedrooms: number
  bathrooms: number
  maxGuests: number
  thumbnailUrl: string
  images: string[]
}

export interface PMSDetection {
  platform: string
  confidence: number
  indicators: string[]
  logoUrl?: string
}

export interface DirectBookingSite {
  url: string
  domain: string
  platform: string
  confidence: number
  foundVia: 'image-match' | 'domain-search' | 'pms-detection'
}

export interface ContactInfo {
  emails: string[]
  phones: string[]
  socialLinks: {
    platform: string
    url: string
  }[]
  source: string
}

export interface ImageMatch {
  imageUrl: string
  foundOnUrl: string
  platform: string
  similarity: number
}

export interface SearchResult {
  listing: ListingData
  pmsDetection: PMSDetection | null
  directBookingSites: DirectBookingSite[]
  contactInfo: ContactInfo | null
  imageMatches: ImageMatch[]
  overallConfidence: number
  searchedAt: Date
}

export interface RecentSearch {
  id: string
  listingUrl: string
  listingTitle: string
  thumbnailUrl: string
  searchedAt: Date
  resultsCount: number
}
