import { NextRequest, NextResponse } from "next/server"

// Demo results for testing without API keys
function getDemoResults() {
  return {
    image_url: "demo",
    timestamp: new Date().toISOString(),
    is_demo: true,
    summary: {
      total: 7,
      direct: 3,
      ota: 3,
      unknown: 1,
      emails: ["host@bluewavecottage.com", "reservations@bluewavecottage.com"],
      phones: ["+1 (850) 555-1234"],
    },
    matches: [
      {
        url: "https://bluewavecottage.lodgify.com/",
        domain: "bluewavecottage.lodgify.com",
        platform: "Lodgify",
        is_direct: true,
        is_ota: false,
        emails: ["host@bluewavecottage.com"],
        phones: ["+1 (850) 555-1234"],
        title: "Blue Wave Cottage — Book Direct",
        error: null,
      },
      {
        url: "https://book.ownerrez.com/ro/bluewavecottage",
        domain: "book.ownerrez.com",
        platform: "OwnerRez",
        is_direct: true,
        is_ota: false,
        emails: ["reservations@bluewavecottage.com"],
        phones: [],
        title: "Blue Wave Cottage | OwnerRez",
        error: null,
      },
      {
        url: "https://www.vrbo.com/1234567",
        domain: "vrbo.com",
        platform: "VRBO",
        is_direct: false,
        is_ota: true,
        emails: [],
        phones: [],
        title: "Blue Wave Cottage | VRBO",
        error: null,
      },
      {
        url: "https://www.booking.com/hotel/us/blue-wave-cottage.html",
        domain: "booking.com",
        platform: "Booking.com",
        is_direct: false,
        is_ota: true,
        emails: [],
        phones: [],
        title: "Blue Wave Cottage | Booking.com",
        error: null,
      },
      {
        url: "https://bluewavecottage.com/book",
        domain: "bluewavecottage.com",
        platform: null,
        is_direct: true,
        is_ota: false,
        emails: ["host@bluewavecottage.com"],
        phones: ["+1 (850) 555-1234"],
        title: "Blue Wave Cottage — Direct Booking",
        error: null,
      },
      {
        url: "https://www.tripadvisor.com/VacationRentalReview-d12345",
        domain: "tripadvisor.com",
        platform: "TripAdvisor",
        is_direct: false,
        is_ota: true,
        emails: [],
        phones: [],
        title: "Blue Wave Cottage | TripAdvisor",
        error: null,
      },
      {
        url: "https://bluewavecottage.hostaway.com/",
        domain: "bluewavecottage.hostaway.com",
        platform: "Hostaway",
        is_direct: true,
        is_ota: false,
        emails: [],
        phones: [],
        title: "Blue Wave Cottage | Hostaway",
        error: null,
      },
    ],
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { airbnb_url, image_url, demo } = body

    // Demo mode
    if (demo) {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500))
      return NextResponse.json(getDemoResults())
    }

    // For production with Python API, forward the request
    // In development, we'll use the demo results for now
    if (!airbnb_url && !image_url) {
      return NextResponse.json({ error: "Provide airbnb_url or image_url" }, { status: 400 })
    }

    // Try to forward to Python API if available
    const apiUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/py/search`
      : "http://localhost:5000/api/search"

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
    } catch {
      // Python API not available, fall back to demo
    }

    // Fallback: return demo results with a note
    const result = getDemoResults()
    result.is_demo = true
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Use POST to search",
  })
}
