export interface Match {
  url: string
  domain: string
  platform: string | null
  is_direct: boolean
  is_ota: boolean
  emails: string[]
  phones: string[]
  title: string
  error: string | null
}

export interface SearchSummary {
  total: number
  direct: number
  ota: number
  unknown: number
  emails: string[]
  phones: string[]
}

export interface SearchResult {
  image_url: string
  timestamp: string
  is_demo: boolean
  summary: SearchSummary
  matches: Match[]
}
