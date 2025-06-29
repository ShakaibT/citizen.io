import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface DailyReport {
  reportDate: string
  overallStatus: 'healthy' | 'warning' | 'critical'
  summary: {
    totalStates: number
    statesWithLiveData: number
    statesWithFallbackOnly: number
    totalOfficials: number
    totalCounties: number
    lastSyncDate: string
    syncSuccess: boolean
  }
  dataQuality: {
    officialsDataSources: Record<string, number>
    countiesDataSources: Record<string, number>
    statesWithIssues: string[]
    missingData: string[]
  }
  recentSyncLogs: any[]
  stateBreakdown: Array<{
    state: string
    officials: {
      count: number
      source: string
      lastUpdated: string
    }
    counties: {
      count: number
      source: string
      lastUpdated: string
    }
    status: 'good' | 'warning' | 'error'
    issues: string[]
  }>
  recommendations: string[]
}

async function generateDailyReport(date?: string): Promise<DailyReport> {
  const reportDate = date || new Date().toISOString().split('T')[0]
  
  // Get recent sync logs
  const { data: syncLogs } = await supabase
    .from('data_sync_logs')
    .select('*')
    .gte('sync_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('created_at', { ascending: false })
    .limit(50)

  // Get officials data by state
  const { data: officialsData } = await supabase
    .from('officials')
    .select('state, data_source, last_updated')
    .eq('is_active', true)

  // Get counties data by state
  const { data: countiesData } = await supabase
    .from('counties')
    .select('state, data_source, last_updated')

  // Get fallback officials data
  const { data: fallbackOfficials } = await supabase
    .from('fallback_officials')
    .select('state')

  // Get fallback counties data
  const { data: fallbackCounties } = await supabase
    .from('fallback_counties')
    .select('state')

  // Process data by state
  const stateBreakdown: DailyReport['stateBreakdown'] = []
  const allStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
  ]

  const officialsDataSources: Record<string, number> = {}
  const countiesDataSources: Record<string, number> = {}
  const statesWithIssues: string[] = []
  const missingData: string[] = []

  for (const state of allStates) {
    const stateOfficials = officialsData?.filter(o => o.state === state) || []
    const stateCounties = countiesData?.filter(c => c.state === state) || []
    const hasFallbackOfficials = fallbackOfficials?.some(f => f.state === state)
    const hasFallbackCounties = fallbackCounties?.some(f => f.state === state)

    const issues: string[] = []
    let status: 'good' | 'warning' | 'error' = 'good'

    // Check for missing data
    if (stateOfficials.length === 0 && !hasFallbackOfficials) {
      issues.push('No officials data available')
      missingData.push(`${state} - Officials`)
      status = 'error'
    }

    if (stateCounties.length === 0 && !hasFallbackCounties) {
      issues.push('No counties data available')
      missingData.push(`${state} - Counties`)
      status = 'error'
    }

    // Check for outdated data
    const officialsSources = [...new Set(stateOfficials.map(o => o.data_source))]
    const countiesSources = [...new Set(stateCounties.map(c => c.data_source))]

    if (stateOfficials.length > 0 && officialsSources.includes('fallback')) {
      issues.push('Using fallback officials data')
      if (status === 'good') status = 'warning'
    }

    if (stateCounties.length > 0 && countiesSources.includes('fallback')) {
      issues.push('Using fallback counties data')
      if (status === 'good') status = 'warning'
    }

    // Track data sources
    officialsSources.forEach(source => {
      officialsDataSources[source] = (officialsDataSources[source] || 0) + 1
    })
    countiesSources.forEach(source => {
      countiesDataSources[source] = (countiesDataSources[source] || 0) + 1
    })

    if (issues.length > 0) {
      statesWithIssues.push(state)
    }

    stateBreakdown.push({
      state,
      officials: {
        count: stateOfficials.length,
        source: stateOfficials.length > 0 ? stateOfficials[0].data_source : (hasFallbackOfficials ? 'fallback' : 'none'),
        lastUpdated: stateOfficials.length > 0 ? stateOfficials[0].last_updated : 'never'
      },
      counties: {
        count: stateCounties.length,
        source: stateCounties.length > 0 ? stateCounties[0].data_source : (hasFallbackCounties ? 'fallback' : 'none'),
        lastUpdated: stateCounties.length > 0 ? stateCounties[0].last_updated : 'never'
      },
      status,
      issues
    })
  }

  // Calculate summary statistics
  const statesWithLiveData = stateBreakdown.filter(s => 
    s.officials.source === 'congress_api' || s.counties.source === 'census_api'
  ).length

  const statesWithFallbackOnly = stateBreakdown.filter(s => 
    (s.officials.source === 'fallback' || s.officials.source === 'none') &&
    (s.counties.source === 'fallback' || s.counties.source === 'none')
  ).length

  // Get latest sync status
  const latestSync = syncLogs?.[0]
  const syncSuccess = latestSync?.status === 'success'

  // Determine overall status
  let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
  if (missingData.length > 5 || !syncSuccess) {
    overallStatus = 'critical'
  } else if (statesWithIssues.length > 10 || statesWithFallbackOnly > 20) {
    overallStatus = 'warning'
  }

  // Generate recommendations
  const recommendations: string[] = []
  if (!syncSuccess) {
    recommendations.push('Daily sync is failing - check API keys and rate limits')
  }
  if (missingData.length > 0) {
    recommendations.push(`${missingData.length} states missing critical data - review fallback data`)
  }
  if (statesWithFallbackOnly > 20) {
    recommendations.push('Too many states relying on fallback data - check API connectivity')
  }
  if (officialsDataSources['fallback'] > 25) {
    recommendations.push('Congress API may be having issues - many states using fallback officials')
  }
  if (countiesDataSources['fallback'] > 25) {
    recommendations.push('Census API may be having issues - many states using fallback counties')
  }

  return {
    reportDate,
    overallStatus,
    summary: {
      totalStates: allStates.length,
      statesWithLiveData,
      statesWithFallbackOnly,
      totalOfficials: officialsData?.length || 0,
      totalCounties: countiesData?.length || 0,
      lastSyncDate: latestSync?.sync_date || 'never',
      syncSuccess
    },
    dataQuality: {
      officialsDataSources,
      countiesDataSources,
      statesWithIssues,
      missingData
    },
    recentSyncLogs: syncLogs?.slice(0, 10) || [],
    stateBreakdown,
    recommendations
  }
}

function generateEmailReport(report: DailyReport): string {
  const statusEmoji = {
    'healthy': '✅',
    'warning': '⚠️',
    'critical': '🚨'
  }

  return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .status-healthy { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-critical { color: #dc3545; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .summary-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .summary-number { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .issues-list { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .recommendations { background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .state-good { color: #28a745; }
        .state-warning { color: #ffc107; }
        .state-error { color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${statusEmoji[report.overallStatus]} Citizen Engagement App - Daily Data Report</h1>
        <p><strong>Report Date:</strong> ${report.reportDate}</p>
        <p><strong>Overall Status:</strong> <span class="status-${report.overallStatus}">${report.overallStatus.toUpperCase()}</span></p>
    </div>

    <div class="summary-grid">
        <div class="summary-card">
            <div class="summary-number">${report.summary.totalStates}</div>
            <div>Total States</div>
        </div>
        <div class="summary-card">
            <div class="summary-number">${report.summary.statesWithLiveData}</div>
            <div>States with Live Data</div>
        </div>
        <div class="summary-card">
            <div class="summary-number">${report.summary.totalOfficials}</div>
            <div>Total Officials</div>
        </div>
        <div class="summary-card">
            <div class="summary-number">${report.summary.totalCounties}</div>
            <div>Total Counties</div>
        </div>
    </div>

    <h2>Data Sources Summary</h2>
    <p><strong>Officials Data Sources:</strong></p>
    <ul>
        ${Object.entries(report.dataQuality.officialsDataSources).map(([source, count]) => 
          `<li>${source}: ${count} states</li>`
        ).join('')}
    </ul>
    
    <p><strong>Counties Data Sources:</strong></p>
    <ul>
        ${Object.entries(report.dataQuality.countiesDataSources).map(([source, count]) => 
          `<li>${source}: ${count} states</li>`
        ).join('')}
    </ul>

    ${report.dataQuality.missingData.length > 0 ? `
    <div class="issues-list">
        <h3>🚨 Missing Data Issues</h3>
        <ul>
            ${report.dataQuality.missingData.map(issue => `<li>${issue}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${report.recommendations.length > 0 ? `
    <div class="recommendations">
        <h3>💡 Recommendations</h3>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    <h2>State-by-State Breakdown</h2>
    <table>
        <thead>
            <tr>
                <th>State</th>
                <th>Status</th>
                <th>Officials</th>
                <th>Counties</th>
                <th>Issues</th>
            </tr>
        </thead>
        <tbody>
            ${report.stateBreakdown.map(state => `
                <tr>
                    <td>${state.state}</td>
                    <td class="state-${state.status}">${state.status.toUpperCase()}</td>
                    <td>${state.officials.count} (${state.officials.source})</td>
                    <td>${state.counties.count} (${state.counties.source})</td>
                    <td>${state.issues.join(', ') || 'None'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <h2>Recent Sync Activity</h2>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Type</th>
                <th>State</th>
                <th>Status</th>
                <th>Records</th>
                <th>Errors</th>
            </tr>
        </thead>
        <tbody>
            ${report.recentSyncLogs.map(log => `
                <tr>
                    <td>${log.sync_date}</td>
                    <td>${log.sync_type}</td>
                    <td>${log.state || 'All'}</td>
                    <td>${log.status}</td>
                    <td>${log.records_updated}/${log.records_processed}</td>
                    <td>${log.api_errors}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <hr>
    <p><small>Generated by Citizen Engagement App Data Monitoring System</small></p>
</body>
</html>
  `
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const format = searchParams.get('format') || 'json'

    const report = await generateDailyReport(date || undefined)

    if (format === 'html') {
      const htmlReport = generateEmailReport(report)
      return new NextResponse(htmlReport, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    return NextResponse.json({
      success: true,
      report
    })

  } catch (error) {
    console.error('Error generating daily report:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate report',
      details: String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, date } = await request.json()
    
    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email address required'
      }, { status: 400 })
    }

    const report = await generateDailyReport(date)
    const htmlReport = generateEmailReport(report)

    // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
    // For now, we'll just return the HTML content
    console.log(`📧 Daily report generated for ${email}`)
    
    // Log the report generation
    await supabase.rpc('log_sync_operation', {
      p_sync_type: 'daily_report',
      p_state: null,
      p_status: 'success',
      p_records_processed: report.summary.totalStates,
      p_records_updated: 0,
      p_records_failed: 0,
      p_api_calls: 0,
      p_api_errors: 0,
      p_error_details: { recipient: email, overall_status: report.overallStatus },
      p_execution_time: 0,
      p_data_source: 'report_generator'
    })

    return NextResponse.json({
      success: true,
      message: 'Report generated successfully',
      report: {
        overallStatus: report.overallStatus,
        summary: report.summary,
        recommendations: report.recommendations
      },
      htmlContent: htmlReport
    })

  } catch (error) {
    console.error('Error sending daily report:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send report',
      details: String(error)
    }, { status: 500 })
  }
} 