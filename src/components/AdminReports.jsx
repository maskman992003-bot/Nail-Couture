import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import Navbar from './Navbar'
import StaffNav from './StaffNav'

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
      profile_id,
      final_price,
      status,
      services (
        id,
        name,
        price
      )
    `)
    .gte('check_in_time', startDate)
    .lt('check_in_time', endDate)
    .not('profile_id', 'is', null)
  
  return data || []
}

const analyzePeriod = async (period) => {
  const range = getDateRange(period)
  const appointments = await getAppointmentsData(range.start, range.end)
  
  if (appointments.length === 0) {
    return { new: 0, regular: 0, total: 0, revenue: 0, serviceCounts: {}, avgServiceTime: 0, cancelled: 0 }
  }

  const profileIds = [...new Set(appointments.map(a => a.profile_id))]
  
  let newCount = 0
  let regularCount = 0
  
  for (const profileId of profileIds) {
    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
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

const exportMonthlyData = async () => {
  const range = getDateRange('thisMonth')
  const appointments = await getAppointmentsData(range.start, range.end)
  
  const customerData = []
  const profileIds = [...new Set(appointments.map(a => a.profile_id))]
  
  for (const profileId of profileIds) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone_number')
      .eq('id', profileId)
      .single()
    
    const profileAppointments = appointments.filter(a => a.profile_id === profileId)
    
    if (profile) {
      customerData.push({
        Name: profile.full_name || '',
        Email: profile.email || '',
        Phone: profile.phone_number || '',
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
  link.download = `monthly_customers_${new Date().toISOString().slice(0, 7)}.csv`
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
    <div className="flex flex-col text-center" style={{ opacity }}>
      <div className="py-4 border-b border-gold/20">
        <span className="font-heading text-gold text-base">{label}</span>
      </div>
      
      <div className="py-6 border-b border-gold/10">
        <div className="text-offwhite/40 text-sm mb-2">New Customers</div>
        <div className="font-heading text-4xl text-[#D4D4D4]">{data.new}</div>
      </div>
      <div className="py-6 border-b border-gold/10">
        <div className="text-offwhite/40 text-sm mb-2">Regular Customers</div>
        <div className="font-heading text-4xl text-gold">{data.regular}</div>
      </div>
      <div className="py-6 border-b border-gold/10">
        <div className="text-offwhite/40 text-sm mb-1">Total Guests</div>
        <div className="font-heading text-3xl text-offwhite">{data.total}</div>
      </div>
      
      {showRevenue && (
        <div className="py-4 border-b border-gold/10">
          <div className="text-offwhite/40 text-sm mb-2">Revenue Estimate</div>
          <div className="font-heading text-2xl text-gold">${data.revenue?.toLocaleString() || 0}</div>
        </div>
      )}
      
      <div className="py-4 min-h-[80px]">
        <div className="text-offwhite/40 text-sm mb-2">Avg Service Time</div>
        <div className="font-heading text-xl text-offwhite/80">{data.avgServiceTime || 0} min</div>
      </div>
      
      <div className="py-4 min-h-[80px]">
        <div className="text-offwhite/40 text-sm mb-2">Cancellations</div>
        <div className="font-heading text-xl text-red-400">{data.cancelled || 0}</div>
      </div>
      
      <div className="py-4 flex-1 min-h-[200px] flex items-center justify-center">
        <DonutChart data={data} size={160} />
      </div>
    </div>
  )
}

export default function AdminReports() {
  const { user } = useAuth()
  const isAdmin = ['super_admin', 'owner', 'partner'].includes(user?.role)
  const [loading, setLoading] = useState(true)
  const [periodData, setPeriodData] = useState({
    lastWeek: { new: 0, regular: 0, total: 0, revenue: 0, serviceCounts: {}, avgServiceTime: 0, cancelled: 0 },
    thisWeek: { new: 0, regular: 0, total: 0, revenue: 0, serviceCounts: {}, avgServiceTime: 0, cancelled: 0 },
    lastMonth: { new: 0, regular: 0, total: 0, revenue: 0, serviceCounts: {}, avgServiceTime: 0, cancelled: 0 },
    thisMonth: { new: 0, regular: 0, total: 0, revenue: 0, serviceCounts: {}, avgServiceTime: 0, cancelled: 0 }
  })
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
      await exportMonthlyData()
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export data')
    } finally {
      setExporting(false)
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

  if (loading) {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}>
        <StaffNav />
        <div className="flex-1 overflow-x-hidden">
          <Navbar currentPage="admin" onNavigate={() => {}} />
          <div className="flex items-center justify-center py-20 px-6">
            <div className="text-gold animate-pulse">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}>
      <StaffNav />
      <div className="flex-1 overflow-x-hidden">
        <Navbar currentPage="admin" onNavigate={() => {}} />
        <div className="w-full max-w-[1400px] mx-auto px-6 py-8 pb-24 lg:pb-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="font-heading text-2xl sm:text-3xl text-gold">Reports & Insights</h1>
            <p className="text-offwhite/60 mt-1">Comprehensive business analytics</p>
          </div>

          <div className="mb-8 sm:mb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border border-gold/30 rounded-xl overflow-hidden bg-charcoal/50">
              <MetricColumn 
                label={getDateRange('lastWeek').label} 
                data={periodData.lastWeek}
                isCurrent={false}
                showRevenue={isAdmin}
              />
              <MetricColumn 
                label={getDateRange('thisWeek').label} 
                data={periodData.thisWeek}
                isCurrent={true}
                showRevenue={isAdmin}
              />
              <MetricColumn 
                label={getDateRange('lastMonth').label} 
                data={periodData.lastMonth}
                isCurrent={false}
                showRevenue={isAdmin}
              />
              <MetricColumn 
                label={getDateRange('thisMonth').label} 
                data={periodData.thisMonth}
                isCurrent={true}
                showRevenue={isAdmin}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="bg-offwhite/5 border border-gold/20 rounded-xl p-4 sm:p-8">
              <h3 className="font-heading text-lg sm:text-xl text-gold mb-4 sm:mb-6 text-center">Week-over-Week Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weekComparisonData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                  <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #C5A059', fontSize: 12 }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="lastWeek" name="Last Week" fill="#666" />
                  <Bar dataKey="thisWeek" name="This Week" fill="#C5A059" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-offwhite/5 border border-gold/20 rounded-xl p-4 sm:p-8">
              <h3 className="font-heading text-lg sm:text-xl text-gold mb-4 sm:mb-6 text-center">Month-over-Month Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthComparisonData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                  <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #C5A059', fontSize: 12 }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="lastMonth" name="Last Month" fill="#666" />
                  <Bar dataKey="thisMonth" name="This Month" fill="#C5A059" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-offwhite/5 border border-gold/20 rounded-xl p-4 sm:p-8">
              <h3 className="font-heading text-lg sm:text-xl text-gold mb-4 sm:mb-6 text-center">Popular Services (This Month)</h3>
              {thisMonthServiceData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-offwhite/40">
                  No service data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={thisMonthServiceData} layout="vertical" margin={{ top: 20, right: 10, left: 50, bottom: 5 }}>
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
  )
}