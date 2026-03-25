interface PlaceResult {
  displayName?: { text: string }
  formattedAddress?: string
  nationalPhoneNumber?: string
  websiteUri?: string
  googleMapsUri?: string
  rating?: number
  userRatingCount?: number
  primaryTypeDisplayName?: { text: string }
}

interface LeadInsertData {
  company_name: string
  sector: string
  city: string
  address: string | null
  phone: string | null
  website_url: string | null
  google_maps_url: string | null
  google_rating: number | null
  google_reviews_count: number
}

export function parsePlaceToLead(place: PlaceResult, city: string, sector: string): LeadInsertData {
  return {
    company_name: place.displayName?.text ?? 'Inconnu',
    sector,
    city,
    address: place.formattedAddress ?? null,
    phone: place.nationalPhoneNumber ?? null,
    website_url: place.websiteUri ?? null,
    google_maps_url: place.googleMapsUri ?? null,
    google_rating: place.rating ?? null,
    google_reviews_count: place.userRatingCount ?? 0,
  }
}

export async function searchPlaces(city: string, sector: string): Promise<PlaceResult[]> {
  const allResults: PlaceResult[] = []
  const query = `${sector} à ${city}`

  const fieldMask = [
    'places.displayName', 'places.formattedAddress', 'places.nationalPhoneNumber',
    'places.websiteUri', 'places.googleMapsUri', 'places.rating',
    'places.userRatingCount', 'places.primaryTypeDisplayName',
  ].join(',')

  let pageToken: string | undefined

  do {
    const body: Record<string, unknown> = { textQuery: query, languageCode: 'fr' }
    if (pageToken) body.pageToken = pageToken

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY!,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    if (data.places) allResults.push(...data.places)
    pageToken = data.nextPageToken
  } while (pageToken && allResults.length < 60)

  return allResults
}
