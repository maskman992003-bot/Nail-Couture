import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from './Sidebar'

const getDateRange = (period) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (period) {
    case 'lastWeek': {
      const start = new Date(today)
      start.setDate(start.getDate() - 14)
      const end = new Date(today)
      end.setDate(end.getDate() - 7)
      return { start: start.toISOString(), end: end.toISOString(), label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` }
    }
    case 'thisWeek': {
      const start = new Date(today)
      start.setDate(start.getDate() - 7)
      const end = new Date(today)
      end.setDate(end.getDate() + 1)
      return { start: start.toISOString(), end: end.toISOString(), label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` }
    }
    case 'lastMonth': {
      const start = new Date(today)
      start.setMonth(start.getMonth() - 2)
      start.setDate(1)
      const end = new Date(today)
      end.setMonth(end.getMonth() - 1)
      end.setDate(0)
      return { start: start.toISOString(), end: end.toISOString(), label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` }
    }
    case 'thisMonth': {
      const start = new Date(today)
      start.setMonth(start.getMonth() - 1)
      start.setDate(1)
      const end = new Date(today)
      end.setDate(end.getDate() + 1)
      return { start: start.toISOString(), end: end.toISOString(), label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` }
    }
    default:
      return { start: today.toISOString(), end: today.toISOString(), label: 'Today' }
  }
}

const getAppointmentsData = async (startDate, endDate) => {
  const { data } = await supabase
    .from('appointments')
    .select(`
      customer_id,
      final_price,
      status,
      services (
        id,
        name,
        price
      )
    `)
    .gte('checked_in_at', startDate)
    .lt('checked_in_at', endDate)
    .not('customer_id', 'is', null)
  
  return data || []
}

const analyzePeriod = async (period) => {
  const range = getDateRange(period)
  const appointments = await getAppointmentsData(range.start, range.end)
  
  if (appointments.length === 0) {
    return { new: 0, regular: 0, total: 0, revenue: 0, serviceCounts: {}, avgServiceTime: 0, cancelled: 0 }
  }

  const profileIds = [...new Set(appointments.map(a => a.customer_id))]
  
  let newCount = 0
  let regularCount = 0
  
  for (const profileId of profileIds) {
    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', profileId)
      .lt('check_in_time', range.end)
    
    if (count <= 1) {
      newCount++
    } else {
      regularCount++
    }
  }

  const serviceCounts = {}
  let totalRevenue = 0
  let totalDuration = 0
  let completedCount = 0
  let cancelledCount = 0
  
  for (const appt of appointments) {
    if (appt.services) {
      serviceCounts[appt.services.name] = (serviceCounts[appt.services.name] || 0) + 1
      const price = appt.final_price || appt.services.price
      totalRevenue += price
      totalDuration += appt.services.duration_minutes || 0
      if (appt.status === 'completed') completedCount++
    }
  }
  
  const { count: cancelledToday } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'cancelled')
    .gte('check_in_time', range.start)
    .lt('check_in_time', range.end)
  
  cancelledCount = cancelledToday || 0
  
  const avgServiceTime = completedCount > 0 ? Math.round(totalDuration / completedCount) : 0
  
  return { 
    new: newCount, 
    regular: regularCount, 
    total: profileIds.length,
    revenue: totalRevenue,
    serviceCounts,
    avgServiceTime,
    cancelled: cancelledCount
  }
}

const exportPeriodData = async (period) => {
  let range, fileName, appointments
  
  if (period === 'custom') {
    // For custom period, we need the dates to be provided by caller
    // This is handled in the component state
    return
  } else if (period === 'thisMonth' || period === 'monthly') {
    range = getDateRange('thisMonth')
    fileName = `monthly_report_${new Date().toISOString().slice(0, 7)}`
  } else if (period === 'thisWeek' || period === 'weekly') {
    range = getDateRange('thisWeek')
    const weekStart = new Date(range.start)
    const weekEnd = new Date(range.end)
    fileName = `weekly_report_${weekStart.toISOString().slice(0, 10)}_to_${weekEnd.toISOString().slice(0, 10)}`
  }

  appointments = await getAppointmentsData(range.start, range.end)
  
  const customerData = []
  const profileIds = [...new Set(appointments.map(a => a.customer_id))]
  
  for (const profileId of profileIds) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', profileId)
      .single()
    
    const profileAppointments = appointments.filter(a => a.customer_id === profileId)
    
    if (profile) {
      customerData.push({
        Name: profile.full_name || '',
        Email: profile.email || '',
        Phone: profile.phone || '',
        'Total Visits': profileAppointments.length,
        'Total Spent': `$${profileAppointments.reduce((sum, a) => sum + (a.final_price || a.services?.price || 0), 0)}`
      })
    }
  }

  const csvContent = [
    Object.keys(customerData[0] || {}).join(','),
    ...customerData.map(row => Object.values(row).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${fileName}.csv`
  link.click()
}

const exportCustomRangeData = async (fromDate, toDate) => {
  const range = {
    start: new Date(fromDate).toISOString(),
    end: new Date(new Date(toDate).getTime() + 86400000).toISOString()
  }
  
  const appointments = await getAppointmentsData(range.start, range.end)
  
  const customerData = []
  const profileIds = [...new Set(appointments.map(a => a.customer_id))]
  
  for (const profileId of profileIds) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', profileId)
      .single()
    
    const profileAppointments = appointments.filter(a => a.customer_id === profileId)
    
    if (profile) {
      customerData.push({
        Name: profile.full_name || '',
        Email: profile.email || '',
        Phone: profile.phone || '',
        'Total Visits': profileAppointments.length,
        'Total Spent': `$${profileAppointments.reduce((sum, a) => sum + (a.final_price || a.services?.price || 0), 0)}`
      })
    }
  }

  const csvContent = [
    Object.keys(customerData[0] || {}).join(','),
    ...customerData.map(row => Object.values(row).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  const fromFormatted = new Date(fromDate).toISOString().slice(0, 10)
  const toFormatted = new Date(toDate).toISOString().slice(0, 10)
  link.download = `custom_report_${fromFormatted}_to_${toFormatted}.csv`
  link.click()
}

const COLORS = {
  new: '#D4D4D4',
  regular: '#C5A059'
}

const DonutChart = ({ data, size = 180 }) => {
  const chartData = [
    { name: 'New', value: data.new },
    { name: 'Regular', value: data.regular }
  ]
  
  if (data.total === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-offwhite/30 text-sm">
        No data
      </div>
    )
  }
  
  return (
    <ResponsiveContainer width="100%" height={size}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={size * 0.25}
          outerRadius={size * 0.4}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.name === 'New' ? COLORS.new : COLORS.regular} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #C5A059' }}
          labelStyle={{ color: '#fff' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

const MetricColumn = ({ label, data, isCurrent, showRevenue }) => {
  const opacity = isCurrent ? 1 : 0.6
  
  return (
    <div className="rounded-3xl border border-gold/20 bg-[#0F0F10] p-6 text-center transition duration-300 hover:-translate-y-0.5">
      <div className="flex flex-col items-center gap-2 pb-4 border-b border-gold/10">
        <span className="font-heading text-base text-gold">{label}</span>
        <span className="text-offwhite/50 text-sm">{data.total || 0} guests</span>
      </div>
      <div className="grid gap-4 py-6 text-left sm:grid-cols-2">
        <div>
          <div className="text-offwhite/40 text-xs uppercase tracking-[0.18em] mb-1">New Customers</div>
          <div className="font-heading text-2xl text-[#D4D4D4]">{data.new}</div>
        </div>
        <div>
          <div className="text-offwhite/40 text-xs uppercase tracking-[0.18em] mb-1">Regular Customers</div>
          <div className="font-heading text-2xl text-gold">{data.regular}</div>
        </div>
        <div>
          <div className="text-offwhite/40 text-xs uppercase tracking-[0.18em] mb-1">Avg Service</div>
          <div className="font-heading text-xl text-offwhite/80">{data.avgServiceTime || 0} min</div>
        </div>
        <div>
          <div className="text-offwhite/40 text-xs uppercase tracking-[0.18em] mb-1">Cancellations</div>
          <div className="font-heading text-xl text-red-400">{data.cancelled || 0}</div>
        </div>
        {showRevenue && (
          <div className="sm:col-span-2">
            <div className="text-offwhite/40 text-xs uppercase tracking-[0.18em] mb-1">Revenue Estimate</div>
            <div className="font-heading text-2xl text-gold">${data.revenue?.toLocaleString() || 0}</div>
          </div>
        )}
      </div>
      <div className="py-2">
        <DonutChart data={data} size={150} />
      </div>
      <div className="mt-2 text-offwhite/50 text-xs">Tap the chart to explore categories in detail</div>
    </div>
  )
}

export default function AdminReports() {
  const { user } = useAuth()
  const isAdmin = ['super_admin', 'owner', 'partner'].includes(user?.role)
  const [activeTab, setActiveTab] = useState('weekly')
  const [loading, setLoading] = useState(true)
  const [periodData, setPeriodData] = useState({
    lastWeek: { new: 0, regular: 0, total: 0, revenue: 0, serviceCounts: {}, avgServiceTime: 0, cancelled: 0 },
    thisWeek: { new: 0, regular: 0, total: 0, revenue: 0, serviceCounts: {}, avgServiceTime: 0, cancelled: 0 },
    lastMonth: { new: 0, regular: 0, total: 0, revenue: 0, serviceCounts: {}, avgServiceTime: 0, cancelled: 0 },
    thisMonth: { new: 0, regular: 0, total: 0, revenue: 0, serviceCounts: {}, avgServiceTime: 0, cancelled: 0 }
  })
  const [customData, setCustomData] = useState({ new: 0, regular: 0, total: 0, revenue: 0, serviceCounts: {}, avgServiceTime: 0, cancelled: 0 })
  const [customFromDate, setCustomFromDate] = useState('')
  const [customToDate, setCustomToDate] = useState('')
  const [exporting, setExporting] = useState(false)

  const fetchInsights = useCallback(async () => {
    const [lastWeek, thisWeek, lastMonth, thisMonth] = await Promise.all([
      analyzePeriod('lastWeek'),
      analyzePeriod('thisWeek'),
      analyzePeriod('lastMonth'),
      analyzePeriod('thisMonth')
    ])
    
    setPeriodData({ lastWeek, thisWeek, lastMonth, thisMonth })
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  const handleExport = async () => {
    setExporting(true)
    try {
      if (activeTab === 'weekly') {
        await exportPeriodData('weekly')
      } else if (activeTab === 'monthly') {
        await exportPeriodData('monthly')
      } else if (activeTab === 'custom') {
        if (!customFromDate || !customToDate) {
          alert('Please select date range before exporting')
          setExporting(false)
          return
        }
        await exportCustomRangeData(customFromDate, customToDate)
      }
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const getExportLabel = () => {
    if (activeTab === 'weekly') return 'Export Weekly Report'
    if (activeTab === 'monthly') return 'Export Monthly Report'
    if (activeTab === 'custom') return 'Export Custom Report'
    return 'Export Report'
  }

  const handleCustomDateChange = async () => {
    if (!customFromDate || !customToDate) {
      alert('Please select both from and to dates')
      return
    }
    
    const fromDate = new Date(customFromDate)
    const toDate = new Date(customToDate)
    
    if (fromDate >= toDate) {
      alert('From date must be before to date')
      return
    }

    const range = {
      start: fromDate.toISOString(),
      end: new Date(toDate.getTime() + 86400000).toISOString() // Add one day to include the to date
    }

    try {
      const appointments = await getAppointmentsData(range.start, range.end)
      
      if (appointments.length === 0) {
        setCustomData({ new: 0, regular: 0, total: 0, revenue: 0, serviceCounts: {}, avgServiceTime: 0, cancelled: 0 })
        return
      }

      const profileIds = [...new Set(appointments.map(a => a.customer_id))]
      
      let newCount = 0
      let regularCount = 0
      
      for (const profileId of profileIds) {
        const { count } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', profileId)
          .lt('check_in_time', range.end)
        
        if (count <= 1) {
          newCount++
        } else {
          regularCount++
        }
      }

      const serviceCounts = {}
      let totalRevenue = 0
      let totalDuration = 0
      let completedCount = 0
      let cancelledCount = 0
      
      for (const appt of appointments) {
        if (appt.services) {
          serviceCounts[appt.services.name] = (serviceCounts[appt.services.name] || 0) + 1
          const price = appt.final_price || appt.services.price
          totalRevenue += price
          totalDuration += appt.services.duration_minutes || 0
          if (appt.status === 'completed') completedCount++
        }
      }
      
      const { count: cancelledToday } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .gte('check_in_time', range.start)
        .lt('check_in_time', range.end)
      
      cancelledCount = cancelledToday || 0
      const avgServiceTime = completedCount > 0 ? Math.round(totalDuration / completedCount) : 0

      setCustomData({
        new: newCount,
        regular: regularCount,
        total: profileIds.length,
        revenue: totalRevenue,
        serviceCounts,
        avgServiceTime,
        cancelled: cancelledCount
      })
    } catch (err) {
      console.error('Error fetching custom data:', err)
      alert('Failed to fetch custom date range data')
    }
  }

  const weekComparisonData = [
    { name: 'New', lastWeek: periodData.lastWeek.new, thisWeek: periodData.thisWeek.new },
    { name: 'Regular', lastWeek: periodData.lastWeek.regular, thisWeek: periodData.thisWeek.regular }
  ]

  const monthComparisonData = [
    { name: 'New', lastMonth: periodData.lastMonth.new, thisMonth: periodData.thisMonth.new },
    { name: 'Regular', lastMonth: periodData.lastMonth.regular, thisMonth: periodData.thisMonth.regular }
  ]

  const thisMonthServiceData = Object.entries(periodData.thisMonth.serviceCounts || {})
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const getTabMetricData = () => {
    if (activeTab === 'weekly') {
      return [
        { label: getDateRange('lastWeek').label, data: periodData.lastWeek, isCurrent: false },
        { label: getDateRange('thisWeek').label, data: periodData.thisWeek, isCurrent: true }
      ]
    } else if (activeTab === 'monthly') {
      return [
        { label: getDateRange('lastMonth').label, data: periodData.lastMonth, isCurrent: false },
        { label: getDateRange('thisMonth').label, data: periodData.thisMonth, isCurrent: true }
      ]
    } else if (activeTab === 'custom') {
      const customLabel = customFromDate && customToDate 
        ? `${new Date(customFromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${new Date(customToDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : 'Custom Range'
      return [
        { label: customLabel, data: customData, isCurrent: true }
      ]
    }
    return []
  }

  const getTabChartData = () => {
    if (activeTab === 'weekly') {
      return { comparisonData: weekComparisonData, serviceData: periodData.thisWeek.serviceCounts, title: 'Week-over-Week' }
    } else if (activeTab === 'monthly') {
      return { comparisonData: monthComparisonData, serviceData: periodData.thisMonth.serviceCounts, title: 'Month-over-Month' }
    } else if (activeTab === 'custom') {
      return { comparisonData: [], serviceData: customData.serviceCounts, title: 'Custom Range' }
    }
    return { comparisonData: [], serviceData: {}, title: '' }
  }

  const tabMetrics = getTabMetricData()
  const tabCharts = getTabChartData()
  const chartServiceData = Object.entries(tabCharts.serviceData || {})
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl text-gold">Reports & Insights</h1>
            <p className="text-offwhite/60 mt-1">Actionable business analytics for bookings, revenue, and team performance.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center justify-center rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-charcoal transition hover:bg-gold/90 disabled:opacity-40"
            >
              {exporting ? 'Exporting...' : getExportLabel()}
            </button>
            <div className="rounded-2xl border border-gold/20 bg-[#111] px-4 py-3 text-sm text-offwhite/50">
              Data refreshed live from recent appointments
            </div>
          </div>
        </div>

        <div className="bg-offwhite/5 border border-gold/20 rounded-2xl p-6 sm:p-8">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <span className="text-sm font-heading text-offwhite/60 uppercase tracking-wider">View Period:</span>
              <div className="flex gap-2" style={{ borderBottom: '1px solid rgba(197, 160, 89, 0.2)' }}>
                {['weekly', 'monthly', 'custom'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition-all duration-300 ${
                      activeTab === tab
                        ? 'text-gold border-b-2 border-gold'
                        : 'text-offwhite/50 border-b-2 border-transparent hover:text-offwhite/70'
                    }`}
                  >
                    {tab === 'weekly' && 'Weekly'}
                    {tab === 'monthly' && 'Monthly'}
                    {tab === 'custom' && 'Custom'}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'custom' && (
              <div className="mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex-1">
                  <label className="block text-xs font-heading text-offwhite/60 uppercase tracking-wider mb-2">From Date</label>
                  <input
                    type="date"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="w-full bg-[#0F0F10] border border-gold/20 rounded-lg px-4 py-2 text-offwhite text-sm focus:outline-none focus:border-gold/50 transition"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-heading text-offwhite/60 uppercase tracking-wider mb-2">To Date</label>
                  <input
                    type="date"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="w-full bg-[#0F0F10] border border-gold/20 rounded-lg px-4 py-2 text-offwhite text-sm focus:outline-none focus:border-gold/50 transition"
                  />
                </div>
                <button
                  onClick={handleCustomDateChange}
                  className="bg-gold hover:bg-gold/90 text-charcoal px-6 py-2 rounded-lg font-semibold text-sm transition"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <div className="animate-fade-in">
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {tabMetrics.map((metric, idx) => (
                <MetricColumn
                  key={idx}
                  label={metric.label}
                  data={metric.data}
                  isCurrent={metric.isCurrent}
                  showRevenue={isAdmin}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {activeTab !== 'custom' ? (
                <div className="bg-[#0F0F10]/50 border border-gold/10 rounded-xl p-4 sm:p-6">
                  <h3 className="font-heading text-lg sm:text-xl text-gold mb-4 sm:mb-6">{tabCharts.title} Comparison</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={tabCharts.comparisonData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                      <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #C5A059', fontSize: 12 }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {activeTab === 'weekly' ? (
                        <>
                          <Bar dataKey="lastWeek" name="Last Week" fill="#666" />
                          <Bar dataKey="thisWeek" name="This Week" fill="#C5A059" />
                        </>
                      ) : (
                        <>
                          <Bar dataKey="lastMonth" name="Last Month" fill="#666" />
                          <Bar dataKey="thisMonth" name="This Month" fill="#C5A059" />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}

              <div className={`bg-[#0F0F10]/50 border border-gold/10 rounded-xl p-4 sm:p-6 ${activeTab === 'custom' ? 'lg:col-span-2' : ''}`}>
                <h3 className="font-heading text-lg sm:text-xl text-gold mb-4 sm:mb-6">Popular Services</h3>
                {chartServiceData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-offwhite/40">
                    No service data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartServiceData} layout="vertical" margin={{ top: 20, right: 10, left: 50, bottom: 5 }}>
                      <XAxis type="number" stroke="#888" tick={{ fill: '#888', fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 10 }} width={40} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #C5A059', fontSize: 12 }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="count" name="Bookings" fill="#C5A059" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}