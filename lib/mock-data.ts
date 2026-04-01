import type { SearchResult, RecentSearch } from './types'

export const mockSearchResult: SearchResult = {
  listing: {
    id: '12345678',
    title: 'Stunning Oceanfront Villa with Infinity Pool',
    url: 'https://www.airbnb.com/rooms/12345678',
    location: 'Malibu, California, United States',
    bedrooms: 4,
    bathrooms: 3,
    maxGuests: 8,
    thumbnailUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
    ],
  },
  pmsDetection: {
    platform: 'Lodgify',
    confidence: 87,
    indicators: [
      'Lodgify booking widget detected',
      'Calendar sync patterns match Lodgify API',
      'Meta tags contain Lodgify references',
    ],
  },
  directBookingSites: [
    {
      url: 'https://malibu-oceanfront-villa.lodgify.com',
      domain: 'malibu-oceanfront-villa.lodgify.com',
      platform: 'Lodgify',
      confidence: 92,
      foundVia: 'pms-detection',
    },
    {
      url: 'https://www.vrbo.com/1234567',
      domain: 'vrbo.com',
      platform: 'VRBO',
      confidence: 88,
      foundVia: 'image-match',
    },
    {
      url: 'https://www.booking.com/hotel/us/malibu-oceanfront.html',
      domain: 'booking.com',
      platform: 'Booking.com',
      confidence: 76,
      foundVia: 'image-match',
    },
  ],
  contactInfo: {
    emails: ['reservations@malibuoceanfront.com', 'host@example.com'],
    phones: ['+1 (310) 555-0123', '+1 (310) 555-0456'],
    socialLinks: [
      { platform: 'Instagram', url: 'https://instagram.com/malibuoceanfront' },
      { platform: 'Facebook', url: 'https://facebook.com/malibuoceanfrontvilla' },
    ],
    source: 'Direct booking site contact page',
  },
  imageMatches: [
    {
      imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
      foundOnUrl: 'https://www.vrbo.com/1234567',
      platform: 'VRBO',
      similarity: 98,
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
      foundOnUrl: 'https://www.booking.com/hotel/us/malibu-oceanfront.html',
      platform: 'Booking.com',
      similarity: 94,
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
      foundOnUrl: 'https://malibu-oceanfront-villa.lodgify.com',
      platform: 'Lodgify',
      similarity: 99,
    },
  ],
  overallConfidence: 89,
  searchedAt: new Date(),
}

export const mockRecentSearches: RecentSearch[] = [
  {
    id: '1',
    listingUrl: 'https://www.airbnb.com/rooms/12345678',
    listingTitle: 'Stunning Oceanfront Villa',
    thumbnailUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=200&q=80',
    searchedAt: new Date(Date.now() - 1000 * 60 * 5),
    resultsCount: 3,
  },
  {
    id: '2',
    listingUrl: 'https://www.airbnb.com/rooms/87654321',
    listingTitle: 'Downtown Loft with City Views',
    thumbnailUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&q=80',
    searchedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    resultsCount: 5,
  },
  {
    id: '3',
    listingUrl: 'https://www.airbnb.com/rooms/11223344',
    listingTitle: 'Cozy Mountain Cabin Retreat',
    thumbnailUrl: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=200&q=80',
    searchedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    resultsCount: 2,
  },
  {
    id: '4',
    listingUrl: 'https://www.airbnb.com/rooms/99887766',
    listingTitle: 'Beachside Bungalow Paradise',
    thumbnailUrl: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=200&q=80',
    searchedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    resultsCount: 4,
  },
]

export const platformLogos: Record<string, string> = {
  'Lodgify': 'L',
  'OwnerRez': 'O',
  'Guesty': 'G',
  'Hostaway': 'H',
  'VRBO': 'V',
  'Booking.com': 'B',
  'Expedia': 'E',
}

export function getEmptySearchResult(): SearchResult {
  return {
    listing: {
      id: '',
      title: 'No listing found',
      url: '',
      location: '',
      bedrooms: 0,
      bathrooms: 0,
      maxGuests: 0,
      thumbnailUrl: '',
      images: [],
    },
    pmsDetection: null,
    directBookingSites: [],
    contactInfo: null,
    imageMatches: [],
    overallConfidence: 0,
    searchedAt: new Date(),
  }
}
