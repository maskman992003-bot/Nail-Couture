import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Sidebar from './Sidebar'
import clsx from 'clsx'
import { fetchGiftCardSummary } from '@nail-couture/shared/utils/giftCards'
import { downloadExportFile } from '../utils/nativeDownload.js'

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

const getPaymentTransactionsData = async (startDate, endDate) => {
  const endExclusive = new Date(endDate)
  endExclusive.setDate(endExclusive.getDate() + 1)

  const { data } = await supabase
    .from('payment_transactions')
    .select(`
      id,
      final_amount,
      amount,
      customer_id,
      created_at,
      status,
      services:service_id ( id, name, price, duration_minutes )
    `)
    .eq('status', 'completed')
    .gte('created_at', startDate)
    .lt('created_at', endExclusive.toISOString())

  return data || []
}

const analyzePeriod = async (period, { preferPayments = false } = {}) => {
  const range = getDateRange(period)
  const appointments = await getAppointmentsData(range.start, range.end)
  const payments = preferPayments ? await getPaymentTransactionsData(range.start, range.end) : []
  
  if (appointments.length === 0 && payments.length === 0) {
    return { new: 0, regular: 0, total: 0, revenue: 0, serviceCounts: {}, avgServiceTime: 0, cancelled: 0, paymentCount: 0 }
  }

  const profileIds = [...new Set(appointments.map(a => a.customer_id))]
  
  let newCount = 0
  let regularCount = 0
  
  for (const profileId of profileIds) {
    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', profileId)
      .lt('checked_in_at', range.end)
    
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
  
  if (preferPayments && payments.length > 0) {
    for (const payment of payments) {
      const svc = payment.services
      if (svc?.name) {
        serviceCounts[svc.name] = (serviceCounts[svc.name] || 0) + 1
        totalDuration += svc.duration_minutes || 0
      }
      totalRevenue += Number(payment.final_amount ?? payment.amount ?? 0)
      completedCount++
    }
  } else {
    for (const appt of appointments) {
      if (appt.services) {
        serviceCounts[appt.services.name] = (serviceCounts[appt.services.name] || 0) + 1
        const price = appt.final_price || appt.services.price
        totalRevenue += price
        totalDuration += appt.services.duration_minutes || 0
        if (appt.status === 'completed') completedCount++
      }
    }
  }
  
  const { count: cancelledToday } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'cancelled')
    .gte('checked_in_at', range.start)
    .lt('checked_in_at', range.end)

  cancelledCount = cancelledToday || 0
  
  const avgServiceTime = completedCount > 0 ? Math.round(totalDuration / completedCount) : 0
  
  return { 
    new: newCount, 
    regular: regularCount, 
    total: profileIds.length,
    revenue: totalRevenue,
    serviceCounts,
    avgServiceTime,
    cancelled: cancelledCount,
    paymentCount: preferPayments ? payments.length : completedCount,
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

  const csvEscape = (value) => {
    const stringValue = String(value || '')
    return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
      ? `"${stringValue.replace(/"/g, '""')}"`
      : stringValue
  }

  for (const profileId of profileIds) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', profileId)
      .single()

    const profileAppointments = appointments.filter(a => a.customer_id === profileId)
    const serviceNames = profileAppointments.flatMap((appt) => {
      const names = []
      if (Array.isArray(appt.services)) {
        names.push(...appt.services.map((service) => service?.name).filter(Boolean))
      } else if (appt.services?.name) {
        names.push(appt.services.name)
      }
      if (appt.add_ons) {
        names.push(...appt.add_ons.split(',').map((name) => name.trim()).filter(Boolean))
      }
      return names
    })

    const uniqueServiceNames = [...new Set(serviceNames)]
    const servicesLabel = uniqueServiceNames.join(', ')

    if (profile) {
      customerData.push({
        Name: profile.full_name || '',
        Email: profile.email || '',
        Phone: profile.phone || '',
        'Total Visits': profileAppointments.length,
        'Services': servicesLabel,
        'Total Spent': `$${profileAppointments.reduce((sum, a) => sum + (a.final_price || a.services?.price || 0), 0)}`
      })
    }
  }

  const csvContent = [
    Object.keys(customerData[0] || {}).map(csvEscape).join(','),
    ...customerData.map((row) => Object.values(row).map(csvEscape).join(','))
  ].join('\n')

  await downloadExportFile(csvContent, `${fileName}.csv`)
}

const exportCustomRangeData = async (fromDate, toDate) => {
  const range = {
    start: new Date(fromDate).toISOString(),
    end: new Date(new Date(toDate).getTime() + 86400000).toISOString()
  }

  const appointments = await getAppointmentsData(range.start, range.end)

  const customerData = []
  const profileIds = [...new Set(appointments.map(a => a.customer_id))]

  const csvEscape = (value) => {
    const stringValue = String(value || '')
    return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
      ? `"${stringValue.replace(/"/g, '""')}"`
      : stringValue
  }

  for (const profileId of profileIds) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', profileId)
      .single()

    const profileAppointments = appointments.filter(a => a.customer_id === profileId)
    const serviceNames = profileAppointments.flatMap((appt) => {
      const names = []
      if (Array.isArray(appt.services)) {
        names.push(...appt.services.map((service) => service?.name).filter(Boolean))
      } else if (appt.services?.name) {
        names.push(appt.services.name)
      }
      if (appt.add_ons) {
        names.push(...appt.add_ons.split(',').map((name) => name.trim()).filter(Boolean))
      }
      return names
    })

    const uniqueServiceNames = [...new Set(serviceNames)]
    const servicesLabel = uniqueServiceNames.join(', ')

    if (profile) {
      customerData.push({
        Name: profile.full_name || '',
        Email: profile.email || '',
        Phone: profile.phone || '',
        'Total Visits': profileAppointments.length,
        'Services': servicesLabel,
        'Total Spent': `$${profileAppointments.reduce((sum, a) => sum + (a.final_price || a.services?.price || 0), 0)}`
      })
    }
  }

  const csvContent = [
    Object.keys(customerData[0] || {}).map(csvEscape).join(','),
    ...customerData.map((row) => Object.values(row).map(csvEscape).join(','))
  ].join('\n')

  const fromFormatted = new Date(fromDate).toISOString().slice(0, 10)
  const toFormatted = new Date(toDate).toISOString().slice(0, 10)
  await downloadExportFile(
    csvContent,
    `custom_report_${fromFormatted}_to_${toFormatted}.csv`,
  )
}

const COLORS = {
  new: '#D4D4D4',
  regular: '#C5A059'
}

const DonutChart = ({ data, size = 180, theme }) => {
  const chartData = [
    { name: 'New', value: data.new },
    { name: 'Regular', value: data.regular }
  ]
  
  if (data.total === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-secondary text-sm">
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
          contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid #C5A059', color: 'var(--text-primary)' }}
          labelStyle={{ color: 'var(--text-primary)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

const MetricColumn = ({ label, data, isCurrent, showRevenue, paymentBasedRevenue, theme }) => {
  const opacity = isCurrent ? 1 : 0.6
  
  return (
    <div className="rounded-3xl border border-card bg-secondary p-6 text-center transition duration-300 hover:-translate-y-0.5" style={{ opacity: opacity }}>
      <div className="flex flex-col items-center gap-2 pb-4 border-b border-light">
        <span className="font-heading text-base text-gold">{label}</span>
        <span className="text-secondary text-sm">{data.total || 0} guests</span>
      </div>
      <div className="grid gap-4 py-6 text-left sm:grid-cols-2">
        <div>
          <div className="text-secondary text-xs uppercase tracking-[0.18em] mb-1">New Customers</div>
          <div className="font-heading text-2xl" style={{ color: '#D4D4D4' }}>{data.new}</div>
        </div>
        <div>
          <div className="text-secondary text-xs uppercase tracking-[0.18em] mb-1">Regular Customers</div>
          <div className="font-heading text-2xl text-gold">{data.regular}</div>
        </div>
        <div>
          <div className="text-secondary text-xs uppercase tracking-[0.18em] mb-1">Avg Service</div>
          <div className="font-heading text-xl text-primary">{data.avgServiceTime || 0} min</div>
        </div>
        <div>
          <div className="text-secondary text-xs uppercase tracking-[0.18em] mb-1">Cancellations</div>
          <div className="font-heading text-xl text-red-400">{data.cancelled || 0}</div>
        </div>
        {showRevenue && (
          <div className="sm:col-span-2">
            <div className="text-secondary text-xs uppercase tracking-[0.18em] mb-1">
              {paymentBasedRevenue ? 'Revenue (Payments)' : 'Revenue Estimate'}
            </div>
            <div className="font-heading text-2xl text-gold">${data.revenue?.toLocaleString() || 0}</div>
          </div>
        )}
      </div>
      <div className="py-2">
        <DonutChart data={data} size={150} theme={theme} />
      </div>
    </div>
  )
}

export default function AdminReports() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const location = useLocation()
  const isCashierView = user?.role === 'cashier' || location.pathname.startsWith('/cashier/reports')
  const preferPayments = isCashierView
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
  const [giftCardSummary, setGiftCardSummary] = useState(null)

  const fetchInsights = useCallback(async () => {
    const opts = { preferPayments }
    const [lastWeek, thisWeek, lastMonth, thisMonth, giftSummary] = await Promise.all([
      analyzePeriod('lastWeek', opts),
      analyzePeriod('thisWeek', opts),
      analyzePeriod('lastMonth', opts),
      analyzePeriod('thisMonth', opts),
      fetchGiftCardSummary().catch(() => null),
    ])
    
    setPeriodData({ lastWeek, thisWeek, lastMonth, thisMonth })
    setGiftCardSummary(giftSummary)
    setLoading(false)
  }, [preferPayments])

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
      alert('Report exported successfully')
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
      const payments = preferPayments ? await getPaymentTransactionsData(range.start, range.end) : []
      
      if (appointments.length === 0 && payments.length === 0) {
        setCustomData({ new: 0, regular: 0, total: 0, revenue: 0, serviceCounts: {}, avgServiceTime: 0, cancelled: 0, paymentCount: 0 })
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
          .lt('checked_in_at', range.end)
        
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
          totalDuration += appt.services.duration_minutes || 0
          if (appt.status === 'completed') completedCount++
        }
      }

      if (preferPayments && payments.length > 0) {
        totalRevenue = 0
        completedCount = 0
        Object.keys(serviceCounts).forEach((k) => { serviceCounts[k] = 0 })
        for (const payment of payments) {
          const svc = payment.services
          if (svc?.name) {
            serviceCounts[svc.name] = (serviceCounts[svc.name] || 0) + 1
            totalDuration += svc.duration_minutes || 0
          }
          totalRevenue += Number(payment.final_amount ?? payment.amount ?? 0)
          completedCount++
        }
      } else {
        for (const appt of appointments) {
          if (appt.services) {
            const price = appt.final_price || appt.services.price
            totalRevenue += price
          }
        }
      }
      
      const { count: cancelledToday } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .gte('checked_in_at', range.start)
        .lt('checked_in_at', range.end)
      
      cancelledCount = cancelledToday || 0
      const avgServiceTime = completedCount > 0 ? Math.round(totalDuration / completedCount) : 0

      setCustomData({
        new: newCount,
        regular: regularCount,
        total: profileIds.length,
        revenue: totalRevenue,
        serviceCounts,
        avgServiceTime,
        cancelled: cancelledCount,
        paymentCount: preferPayments ? payments.length : completedCount,
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
      <div className="min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 bg-primary text-primary">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 bg-primary text-primary">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 mobile-page">
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl text-gold">
              {isCashierView ? 'Daily Reports' : 'Reports & Insights'}
            </h1>
            <p className="text-primary/80 mt-1">
              {isCashierView
                ? 'Salon-wide payment totals and transaction summaries from checkout.'
                : 'Actionable business analytics for bookings, revenue, and team performance.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center justify-center rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-charcoal transition hover:bg-gold/90 disabled:opacity-40"
            >
              {exporting ? 'Exporting...' : getExportLabel()}
            </button>
          </div>
        </div>

        <div className="bg-secondary border border-card rounded-2xl p-6 sm:p-8">
          {giftCardSummary && (
            <div className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-secondary/50 border border-card rounded-xl p-4 text-center">
                <div className="text-xs uppercase tracking-wider text-secondary mb-1">Gift Card Sales</div>
                <div className="font-heading text-2xl text-gold">${giftCardSummary.totalSales.toLocaleString()}</div>
              </div>
              <div className="bg-secondary/50 border border-card rounded-xl p-4 text-center">
                <div className="text-xs uppercase tracking-wider text-secondary mb-1">Outstanding Liability</div>
                <div className="font-heading text-2xl text-gold">${giftCardSummary.outstandingLiability.toLocaleString()}</div>
              </div>
              <div className="bg-secondary/50 border border-card rounded-xl p-4 text-center">
                <div className="text-xs uppercase tracking-wider text-secondary mb-1">Total Redeemed</div>
                <div className="font-heading text-2xl text-gold">${giftCardSummary.totalRedeemed.toLocaleString()}</div>
              </div>
              <div className="bg-secondary/50 border border-card rounded-xl p-4 text-center">
                <div className="text-xs uppercase tracking-wider text-secondary mb-1">Active Cards</div>
                <div className="font-heading text-2xl text-gold">{giftCardSummary.activeCardCount}</div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <span className="text-sm font-heading text-secondary uppercase tracking-wider">View Period:</span>
              <div className="flex gap-2 border-b border-light">
                {['weekly', 'monthly', 'custom'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={clsx(
                      "px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition-all duration-300",
                      activeTab === tab
                        ? 'text-gold border-b-2 border-gold'
                        : 'text-secondary border-b-2 border-transparent hover:text-primary'
                    )}
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
                  <label className="block text-xs font-heading text-secondary uppercase tracking-wider mb-2">From Date</label>
                  <input
                    type="date"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="w-full bg-input border border-input rounded-lg px-4 py-2 text-primary text-sm focus:outline-none focus:border-gold/50 transition"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-heading text-secondary uppercase tracking-wider mb-2">To Date</label>
                  <input
                    type="date"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="w-full bg-input border border-input rounded-lg px-4 py-2 text-primary text-sm focus:outline-none focus:border-gold/50 transition"
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
                  showRevenue={isAdmin || isCashierView}
                  paymentBasedRevenue={preferPayments}
                  theme={theme}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {activeTab !== 'custom' ? (
                <div className="bg-secondary/50 border border-card rounded-xl p-4 sm:p-6">
                  <h3 className="font-heading text-lg sm:text-xl text-gold mb-4 sm:mb-6">{tabCharts.title} Comparison</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={tabCharts.comparisonData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid #C5A059', fontSize: 12 }}
                        labelStyle={{ color: 'var(--text-primary)' }}
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

              <div className={clsx(
                "bg-secondary/50 border border-card rounded-xl p-4 sm:p-6",
                activeTab === 'custom' ? 'lg:col-span-2' : ''
              )}
              >
                <h3 className="font-heading text-lg sm:text-xl text-gold mb-4 sm:mb-6">Popular Services</h3>
                {chartServiceData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-secondary">No service data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartServiceData} layout="vertical" margin={{ top: 20, right: 10, left: 50, bottom: 5 }}>
                      <XAxis type="number" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} width={40} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid #C5A059', fontSize: 12 }}
                        labelStyle={{ color: 'var(--text-primary)' }}
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
