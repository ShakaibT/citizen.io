import { NextResponse } from 'next/server'
import { updateAllStatesOfficials } from '@/lib/officials-api'

export async function POST(request: Request) {
  try {
    // Verify this is coming from a cron job or authorized source
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Starting daily officials update...')
    await updateAllStatesOfficials()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Officials data updated successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in daily officials update:', error)
    return NextResponse.json(
      { error: 'Failed to update officials data' },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing
export async function GET() {
  try {
    console.log('Manual officials update triggered...')
    await updateAllStatesOfficials()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Officials data updated successfully (manual)',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in manual officials update:', error)
    return NextResponse.json(
      { error: 'Failed to update officials data' },
      { status: 500 }
    )
  }
} 