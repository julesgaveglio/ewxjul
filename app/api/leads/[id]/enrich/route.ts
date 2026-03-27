import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { scrapeBrand } from '@/lib/scraper/brand-scraper'
import { findOwnerName } from '@/lib/scraper/owner-finder'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const db = createServiceClient()
  const { data: lead, error } = await db.from('leads').select('*').eq('id', params.id).single()
  if (error || !lead) return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 })

  await db.from('leads').update({ demo_status: 'scraping' }).eq('id', params.id)

  runEnrich(db, params.id, lead).catch(console.error)
  return NextResponse.json({ status: 'started' })
}

async function runEnrich(db: any, leadId: string, lead: any) {
  try {
    const [brandData, ownerName] = await Promise.all([
      scrapeBrand(lead.company_name, lead.website_url, lead.google_maps_url, lead.phone, lead.address, lead.sector),
      findOwnerName(lead.company_name, lead.city, lead.siret ?? null),
    ])

    await db.from('leads').update({
      demo_status: 'idle',
      brand_data: brandData,
      owner_name: ownerName,
    }).eq('id', leadId)

  } catch (err: any) {
    await db.from('leads').update({
      demo_status: 'idle',
      demo_error_message: err.message?.slice(0, 500),
    }).eq('id', leadId)
  }
}
