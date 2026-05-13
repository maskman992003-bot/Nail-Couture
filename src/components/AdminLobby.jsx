import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function AdminLobby() {
  const [lobbyAppointments, setLobbyAppointments] = useState([])
  const [servingAppointments, setServingAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    fetchAppointments()
    
    const channel = supabase
      .channel('appointments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
        console.log('Real-time update:', payload)
        fetchAppointments()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          status,
          check_in_time,
          start_time,
          refreshment_choice,
          profiles (
            full_name,
            nail_goal,
            refreshment_pref
          )
        `)
        .in('status', ['Checked-In', 'In-Progress'])
        .order('check_in_time', { ascending: true })

      if (error) throw error
      
      const lobby = (data || []).filter(a => a.status === 'Checked-In')
      const serving = (data || []).filter(a => a.status === 'In-Progress')
      
      setLobbyAppointments(lobby)
      setServingAppointments(serving)
    } catch (err) {
      console.error('Error fetching appointments:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (appointment, newStatus) => {
    setUpdating(appointment.id)
    try {
      const updates = { status: newStatus }
      if (newStatus === 'In-Progress') {
        updates.start_time = new Date().toISOString()
      } else if (newStatus === 'Completed') {
        updates.end_time = new Date().toISOString()
      }

      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointment.id)

      if (error) throw error
      
      if (newStatus === 'Completed') {
        setNotification({ message: 'Service Finished', name: appointment.profiles?.full_name || 'Guest' })
        setTimeout(() => setNotification(null), 2000)
      }
      
      fetchAppointments()
    } catch (err) {
      console.error('Error updating status:', err)
      alert('Error: ' + err.message)
    } finally {
      setUpdating(null)
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-gold animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-charcoal p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl text-gold">The Atelier Lobby</h1>
            <p className="text-offwhite/60 mt-1">Real-time appointment management</p>
          </div>
          <Link
            to="/admin"
            className="px-6 py-2 border-2 border-gold text-gold hover:bg-gold hover:text-charcoal transition-all"
          >
            Reception Home
          </Link>
        </div>

        {notification && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-gold text-charcoal px-8 py-4 rounded-lg shadow-lg animate-fade-in z-50">
            <p className="font-heading text-lg">{notification.message}</p>
            <p className="text-sm opacity-80">{notification.name}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="font-heading text-xl text-gold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-gold rounded-full animate-pulse"></span>
              The Lobby ({lobbyAppointments.length})
            </h2>
            {lobbyAppointments.length === 0 ? (
              <div className="text-center py-16 bg-offwhite/5 border border-offwhite/10 rounded-xl">
                <p className="text-offwhite/40">No guests waiting</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lobbyAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="bg-offwhite/5 border border-offwhite/10 rounded-xl p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-heading text-xl text-offwhite mb-2">
                          {appointment.profiles?.full_name || 'Guest'}
                        </h3>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="text-offwhite/50">{formatTime(appointment.check_in_time)}</span>
                          {appointment.profiles?.nail_goal && (
                            <span className="text-gold">{appointment.profiles.nail_goal}</span>
                          )}
                          {(appointment.refreshment_choice || appointment.profiles?.refreshment_pref) && (
                            <span className="text-offwhite/60">
                              {appointment.refreshment_choice || appointment.profiles?.refreshment_pref}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => updateStatus(appointment, 'In-Progress')}
                        disabled={updating === appointment.id}
                        className="px-6 py-3 bg-gold text-charcoal font-heading tracking-wider hover:bg-gold/90 transition-all disabled:opacity-50"
                      >
                        Start Service
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-heading text-xl text-gold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-gold rounded-full"></span>
              Currently Serving ({servingAppointments.length})
            </h2>
            {servingAppointments.length === 0 ? (
              <div className="text-center py-16 bg-offwhite/5 border border-offwhite/10 rounded-xl">
                <p className="text-offwhite/40">No active services</p>
              </div>
            ) : (
              <div className="space-y-4">
                {servingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="bg-gold/10 border border-gold/30 rounded-xl p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-heading text-xl text-offwhite mb-2">
                          {appointment.profiles?.full_name || 'Guest'}
                        </h3>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="text-gold">Started {formatTime(appointment.start_time)}</span>
                          {appointment.profiles?.nail_goal && (
                            <span className="text-offwhite/60">{appointment.profiles.nail_goal}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => updateStatus(appointment, 'Completed')}
                        disabled={updating === appointment.id}
                        className="px-6 py-3 bg-gold text-charcoal font-heading tracking-wider hover:bg-gold/90 transition-all disabled:opacity-50"
                      >
                        Complete Service
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}