import { describe, it, expect } from 'vitest'
import { parsePlaceToLead } from '../scraper/google-places'

describe('parsePlaceToLead', () => {
  it('transforme un résultat Places API en données de lead', () => {
    const place = {
      displayName: { text: 'Boulangerie Dupont' },
      formattedAddress: '12 rue du Port, 64100 Bayonne',
      nationalPhoneNumber: '05 59 12 34 56',
      websiteUri: 'https://boulangerie-dupont.fr',
      googleMapsUri: 'https://maps.google.com/?cid=12345',
      rating: 4.5,
      userRatingCount: 120,
    }
    const lead = parsePlaceToLead(place, 'Bayonne', 'boulangerie')
    expect(lead.company_name).toBe('Boulangerie Dupont')
    expect(lead.phone).toBe('05 59 12 34 56')
    expect(lead.website_url).toBe('https://boulangerie-dupont.fr')
    expect(lead.google_rating).toBe(4.5)
    expect(lead.google_reviews_count).toBe(120)
    expect(lead.city).toBe('Bayonne')
    expect(lead.sector).toBe('boulangerie')
  })

  it('gère les champs manquants', () => {
    const place = {
      displayName: { text: 'Test' },
      formattedAddress: 'Bayonne',
      googleMapsUri: 'https://maps.google.com/?cid=1',
    }
    const lead = parsePlaceToLead(place, 'Bayonne', 'test')
    expect(lead.website_url).toBeNull()
    expect(lead.phone).toBeNull()
    expect(lead.google_rating).toBeNull()
    expect(lead.google_reviews_count).toBe(0)
  })
})
