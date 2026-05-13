import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function Lobby() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    fetchLobby()
  }, [])

  const fetchLobby = async () => {
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
      setAppointments(data || [])
    } catch (err) {
      console.error('Error fetching lobby:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStartService = async (appointment) => {
    console.log('Starting service for:', appointment.id, appointment.status)
    setUpdating(appointment.id)
    try {
      const result = await supabase
        .from('appointments')
        .update({ 
          status: 'In-Progress',
          start_time: new Date().toISOString()
        })
        .eq('id', appointment.id)

      console.log('Update result:', result)
      if (result.error) {
        console.error('Supabase error:', result.error)
        alert('Error: ' + result.error.message)
      } else {
        fetchLobby()
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Failed: ' + err.message)
    } finally {
      setUpdating(null)
    }
  }

  const lobbyAppointments = appointments.filter(a => a.status === 'Checked-In')
  const servingAppointments = appointments.filter(a => a.status === 'In-Progress')

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-gold animate-pulse">Loading lobby...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-charcoal p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl text-gold">Staff Dashboard</h1>
            <p className="text-offwhite/60 mt-1">Manage today's appointments</p>
          </div>
          <Link
            to="/admin"
            className="px-4 py-2 border border-offwhite/30 text-offwhite/60 hover:border-offwhite/60 hover:text-offwhite transition-all"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="font-heading text-xl text-gold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-gold rounded-full"></span>
              Lobby ({lobbyAppointments.length})
            </h2>
            {lobbyAppointments.length === 0 ? (
              <div className="text-center py-12 bg-offwhite/5 border border-offwhite/10 rounded-xl">
                <p className="text-offwhite/40">No guests waiting</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lobbyAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="bg-offwhite/5 border border-offwhite/10 rounded-xl p-6 animate-fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <h3 className="font-heading text-xl text-offwhite">
                            {appointment.profiles?.full_name || 'Guest'}
                          </h3>
                          <span className="text-offwhite/40 text-sm">
                            {formatTime(appointment.check_in_time)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm">
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
                        onClick={() => handleStartService(appointment)}
                        disabled={updating === appointment.id}
                        className="px-6 py-2 bg-gold text-charcoal font-heading tracking-wider hover:bg-gold/90 transition-all disabled:opacity-50"
                      >
                        {updating === appointment.id ? '...' : 'Start'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-heading text-xl text-gold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              Currently Serving ({servingAppointments.length})
            </h2>
            {servingAppointments.length === 0 ? (
              <div className="text-center py-12 bg-offwhite/5 border border-offwhite/10 rounded-xl">
                <p className="text-offwhite/40">No active services</p>
              </div>
            ) : (
              <div className="space-y-4">
                {servingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 animate-fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <h3 className="font-heading text-xl text-offwhite">
                            {appointment.profiles?.full_name || 'Guest'}
                          </h3>
                          <span className="text-green-400 text-sm">
                            Started {formatTime(appointment.start_time)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm">
                          {appointment.profiles?.nail_goal && (
                            <span className="text-gold">{appointment.profiles.nail_goal}</span>
                          )}
                        </div>
                      </div>
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