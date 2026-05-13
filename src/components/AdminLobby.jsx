import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core'
import { getServices } from '../services/services'

const TechnicianGridItem = ({ tech, currentCustomer, isBusy, updating, onComplete, canDrop }) => {
  const { isOver, setNodeRef } = useDroppable({ id: tech.id, disabled: isBusy })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl p-5 border-2 transition-all ${
        isOver && !isBusy && canDrop ? 'border-gold bg-gold/20' : isBusy
          ? 'border-gray-600/30 bg-gray-900/30'
          : canDrop ? 'border-offwhite/20 bg-offwhite/5 hover:border-gold/50' : 'border-gray-600/30 bg-gray-900/30'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className={`font-heading text-lg ${isBusy ? 'text-offwhite/50' : 'text-offwhite'}`}>{tech.full_name}</h4>
        <span className={`text-xs px-2 py-1 rounded ${
          isBusy
            ? 'bg-gray-600/30 text-gray-400'
            : 'bg-offwhite/20 text-offwhite/50'
        }`}>
          {isBusy ? 'Busy' : 'Available'}
        </span>
      </div>
      {isBusy ? (
        <div className="text-sm text-gray-500">
          <div className="mb-2">{currentCustomer.customer?.full_name || 'Customer'}</div>
          <div className="text-xs text-gray-600">{currentCustomer.services?.name}</div>
          <button
            onClick={() => onComplete(currentCustomer.id)}
            disabled={updating === currentCustomer.id}
            className="mt-3 w-full py-2 bg-gold text-charcoal font-heading text-sm hover:bg-gold/90 disabled:opacity-50 rounded-lg"
          >
            {updating === currentCustomer.id ? 'Completing...' : 'Mark Completed'}
          </button>
        </div>
      ) : (
        <div className="text-sm text-offwhite/40">
          {canDrop ? 'Drop here to assign' : 'Technician unavailable'}
        </div>
      )}
    </div>
  )
}

const DraggableAppointmentCard = ({ appointment, isPriority, onTogglePriority, onEdit, onCancel }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { type: 'appointment', appointment }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-offwhite/5 border rounded-xl p-5 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${isPriority ? 'border-gold shadow-lg shadow-gold/20' : 'border-offwhite/10'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isPriority && (
              <span className="w-2 h-2 bg-gold rounded-full animate-pulse"></span>
            )}
            <h3 className="font-heading text-lg text-offwhite">
              {appointment.customer?.full_name || 'Guest'}
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePriority(appointment.id) }}
              className={`text-lg ${isPriority ? 'text-gold' : 'text-offwhite/30 hover:text-gold'}`}
            >
              ★
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(appointment) }}
              className="text-offwhite/40 hover:text-offwhite text-sm"
            >
              ✎
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(appointment) }}
              className="text-red-400/50 hover:text-red-400 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
        <span className="text-offwhite/50 text-sm">{formatTime(appointment.check_in_time)}</span>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {appointment.services && (
          <span className="text-gold font-heading">{appointment.services.name}</span>
        )}
        {appointment.services?.duration_minutes && (
          <span className="text-offwhite/50">~{appointment.services.duration_minutes} min</span>
        )}
        {appointment.customer?.nail_goal && (
          <span className="text-offwhite/60">{appointment.customer.nail_goal}</span>
        )}
      </div>

      {appointment.discount_amount > 0 && (
        <div className="mt-2 text-sm text-green-400">
          -{appointment.discount_type === 'percent' ? `${appointment.discount_amount}%` : `$${appointment.discount_amount}`} discount
        </div>
      )}
    </div>
  )
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const EditAppointmentModal = ({ appointment, services, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    service_id: appointment.service_id,
    nail_goal: appointment.customer?.nail_goal || '',
    discount_amount: appointment.discount_amount || '',
    discount_type: appointment.discount_type || 'amount',
    discount_reason: appointment.discount_reason || ''
  })
  const [saving, setSaving] = useState(false)

  const selectedService = services.find(s => s.id === formData.service_id)
  const discountedPrice = selectedService 
    ? (formData.discount_type === 'percent' 
        ? selectedService.price * (1 - formData.discount_amount / 100)
        : selectedService.price - (formData.discount_amount || 0)
      ).toFixed(2)
    : selectedService?.price

  const handleSave = async () => {
    setSaving(true)
    await onSave(appointment.id, {
      service_id: formData.service_id,
      discount_amount: formData.discount_amount || null,
      discount_type: formData.discount_type || null,
      discount_reason: formData.discount_reason || null
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
      <div className="bg-charcoal border border-gold/30 rounded-xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading text-2xl text-gold">Edit Appointment</h3>
          <button onClick={onClose} className="text-offwhite/50 hover:text-offwhite">✕</button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-offwhite/80 text-sm mb-2">Service</label>
            <select
              value={formData.service_id || ''}
              onChange={(e) => setFormData({...formData, service_id: e.target.value})}
              className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
            >
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} - ${s.price}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-offwhite/80 text-sm mb-2">Nail Goal</label>
            <select
              value={formData.nail_goal}
              onChange={(e) => setFormData({...formData, nail_goal: e.target.value})}
              className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
            >
              <option value="">Select goal</option>
              <option value="Healthy Natural Nails">Healthy Natural Nails</option>
              <option value="Long Extensions">Long Extensions</option>
              <option value="Intricate Art">Intricate Art</option>
            </select>
          </div>

          <div className="border-t border-offwhite/10 pt-5">
            <h4 className="text-gold font-heading mb-3">Apply Discount</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-offwhite/60 text-sm mb-1">Amount</label>
                <input
                  type="number"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData({...formData, discount_amount: e.target.value})}
                  className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-offwhite/60 text-sm mb-1">Type</label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                  className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
                >
                  <option value="amount">$</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-offwhite/60 text-sm mb-1">Reason</label>
              <input
                type="text"
                value={formData.discount_reason}
                onChange={(e) => setFormData({...formData, discount_reason: e.target.value})}
                className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
                placeholder="Birthday discount, etc."
              />
            </div>
          </div>

          {selectedService && (
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-offwhite/60">Total Price</span>
                <span className="font-heading text-2xl text-gold">${discountedPrice}</span>
              </div>
              {formData.discount_amount > 0 && (
                <div className="text-sm text-green-400 mt-1">
                  Original: ${selectedService.price}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-offwhite/30 text-offwhite/60 hover:text-offwhite rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-gold text-charcoal font-heading hover:bg-gold/90 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminLobby() {
  const [lobbyAppointments, setLobbyAppointments] = useState([])
  const [servingAppointments, setServingAppointments] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [notification, setNotification] = useState(null)
  const [todayTotal, setTodayTotal] = useState(0)
  const [activeId, setActiveId] = useState(null)
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [services, setServices] = useState([])
  const [cancelConfirm, setCancelConfirm] = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  const busyTechnicians = servingAppointments
    .filter(a => a.status === 'serving' && a.technician_id)
    .map(a => a.technician_id)

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchAppointments(), fetchServingAppointments(), fetchTechnicians(), fetchTodayTotal()])
      setLoading(false)
    }
    init()
    getServices().then(setServices).catch(console.error)
    
    const channel = supabase
      .channel('floor-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, async () => {
        await Promise.all([fetchAppointments(), fetchServingAppointments(), fetchTechnicians(), fetchTodayTotal()])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const fetchAppointments = useCallback(async () => {
    console.log('Fetching waiting appointments...')
    const { data, error, status } = await supabase
      .from('appointments')
      .select('*, customer:profiles!appointments_profile_id_fkey(full_name, refreshment_pref, nail_goal), services(name, price, duration_minutes)')
      .eq('status', 'waiting')
      .order('check_in_time', { ascending: true })

    if (error) {
      console.error('Error fetching waiting:', error, 'Status:', status)
    } else {
      console.log('Waiting appointments:', data)
    }
    setLobbyAppointments(data || [])
  }, [])

  const fetchServingAppointments = useCallback(async () => {
    console.log('Fetching serving appointments...')
    const { data, error } = await supabase
      .from('appointments')
      .select('*, customer:profiles!appointments_profile_id_fkey(full_name), technician:profiles!appointments_technician_id_fkey(full_name), services(name)')
      .eq('status', 'serving')
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching serving:', error)
    } else {
      console.log('Serving appointments:', data)
    }
    setServingAppointments(data || [])
  }, [])

  const fetchTechnicians = useCallback(async () => {
    console.log('Fetching technicians...')
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'technician')
      .order('full_name')
    
    if (error) {
      console.error('Error fetching technicians:', error)
      return
    }
    
    console.log('Technicians data:', data)
    setTechnicians(data || [])
  }, [])

  const fetchTodayTotal = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .in('status', ['serving', 'completed'])
      .gte('check_in_time', today.toISOString())
    setTodayTotal(count || 0)
  }, [])

  const togglePriority = async (appointmentId) => {
    const appt = lobbyAppointments.find(a => a.id === appointmentId)
    await supabase
      .from('appointments')
      .update({ is_priority: true })
      .eq('id', appointmentId)
    fetchAppointments()
  }

  const updateStatus = async (appointmentId, status, techId = null) => {
    setUpdating(appointmentId)
    const updates = { status }
    if (techId) updates.technician_id = techId
    if (status === 'serving') updates.start_time = new Date().toISOString()
    if (status === 'completed') {
      updates.end_time = new Date().toISOString()
      const appt = servingAppointments.find(a => a.id === appointmentId)
      setNotification({ message: 'Service Complete!', name: appt?.customer?.full_name })
      setTimeout(() => setNotification(null), 3000)
    }

    await supabase.from('appointments').update(updates).eq('id', appointmentId)
    
    fetchAppointments()
    fetchServingAppointments()
    setUpdating(null)
  }

  const handleEditSave = async (appointmentId, updates) => {
    const { error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', appointmentId)
    
    if (!error && updates.nail_goal) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ nail_goal: updates.nail_goal })
        .eq('id', editingAppointment?.profile_id)
    }
    
    fetchAppointments()
    setEditingAppointment(null)
  }

  const cancelAppointment = async (appointment) => {
    setUpdating(appointment.id)
    await supabase
      .from('appointments')
      .update({ 
        status: 'cancelled',
        end_time: new Date().toISOString(),
        cancel_reason: cancelReason
      })
      .eq('id', appointment.id)
    
    setNotification({ message: `Cancelled: ${cancelReason}`, name: appointment.customer?.full_name })
    setTimeout(() => setNotification(null), 3000)
    
    await Promise.all([fetchAppointments(), fetchServingAppointments(), fetchTodayTotal()])
    setUpdating(null)
    setCancelConfirm(null)
    setCancelReason('')
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const appointmentId = active.id
    const technicianId = over.id

    if (technicianId && technicianId !== 'lobby') {
      if (busyTechnicians.includes(technicianId)) {
        setNotification({ message: 'Technician is currently busy', name: 'Please wait until they finish' })
        setTimeout(() => setNotification(null), 3000)
        return
      }

      setUpdating(appointmentId)
      await supabase
        .from('appointments')
        .update({
          technician_id: technicianId,
          status: 'serving',
          start_time: new Date().toISOString()
        })
        .eq('id', appointmentId)
      await Promise.all([fetchAppointments(), fetchServingAppointments(), fetchTechnicians()])
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-gold animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragStart={({active}) => setActiveId(active.id)} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-charcoal p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="font-heading text-3xl text-gold">Floor Manager</h1>
                <p className="text-offwhite/60 mt-1">Drag customers to assign technicians</p>
              </div>
              <div className="bg-gold/10 border border-gold/30 rounded-lg px-4 py-2">
                <span className="text-offwhite/60 text-sm">Today's Total: </span>
                <span className="font-heading text-xl text-gold">{todayTotal}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/admin/reports" className="px-4 py-2 border border-gold/50 text-gold/70 hover:bg-gold hover:text-charcoal text-sm">View Reports</Link>
              <Link to="/admin" className="px-6 py-2 border-2 border-gold text-gold hover:bg-gold hover:text-charcoal">Reception Home</Link>
            </div>
          </div>

          {notification && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-gold text-charcoal px-8 py-4 rounded-lg shadow-lg z-50">
              <p className="font-heading text-lg">{notification.message}</p>
              <p className="text-sm opacity-80">{notification.name}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <h2 className="font-heading text-xl text-gold mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-gold rounded-full animate-pulse"></span>
                Waiting ({lobbyAppointments.length})
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {lobbyAppointments.map(appointment => (
                  <DraggableAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    isPriority={appointment.is_priority}
                    onTogglePriority={togglePriority}
                    onEdit={setEditingAppointment}
                    onCancel={setCancelConfirm}
                  />
                ))}
                {lobbyAppointments.length === 0 && (
                  <div className="col-span-2 text-center py-16 bg-offwhite/5 border border-offwhite/10 rounded-xl">
                    <p className="text-offwhite/40">No guests waiting</p>
                  </div>
                )}
              </div>

              <h2 className="font-heading text-xl text-gold mt-8 mb-4">Currently Serving ({servingAppointments.length})</h2>
              <div className="grid grid-cols-2 gap-4">
                {servingAppointments.map(appointment => (
                  <div key={appointment.id} className="bg-gold/10 border border-gold/30 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-heading text-lg text-offwhite">{appointment.customer?.full_name || 'Guest'}</h3>
                      <button
                        onClick={() => setCancelConfirm(appointment)}
                        className="text-red-400/50 hover:text-red-400 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm items-center">
                      {appointment.services && <span className="text-gold">{appointment.services.name}</span>}
                      {appointment.technician && (
                        <span className="text-xs text-gold/70 ml-auto">with {appointment.technician.full_name}</span>
                      )}
                    </div>
                    {appointment.start_time && (
                      <div className="text-xs text-offwhite/40 mt-2">
                        Started: {formatTime(appointment.start_time)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-heading text-xl text-gold mb-4">Technician Grid</h2>
              <p className="text-offwhite/40 text-sm mb-4">Drop a customer on a technician to assign</p>
              <div className="space-y-4">
                {technicians.map(tech => {
                  const currentCustomer = servingAppointments.find(a => a.technician_id === tech.id && a.status === 'serving')
                  const isBusy = !!currentCustomer
                  const canDrop = !busyTechnicians.includes(tech.id)
                  
                  return (
                    <TechnicianGridItem
                      key={tech.id}
                      tech={tech}
                      currentCustomer={currentCustomer || {}}
                      isBusy={isBusy}
                      canDrop={canDrop}
                      updating={updating}
                      onComplete={(id) => updateStatus(id, 'completed')}
                    />
                  )
                })}
                {technicians.length === 0 && (
                  <div className="text-center py-8 text-offwhite/40">
                    No technicians found (add role='technician' to profiles)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId && (
          <div className="bg-gold/20 border border-gold rounded-xl p-5 shadow-2xl">
            <p className="text-offwhite font-heading">Moving...</p>
          </div>
        )}
      </DragOverlay>

      {editingAppointment && (
        <EditAppointmentModal
          appointment={editingAppointment}
          services={services}
          onSave={handleEditSave}
          onClose={() => setEditingAppointment(null)}
        />
      )}

      {cancelConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
          <div className="bg-charcoal border border-red-500/30 rounded-xl p-6 w-full max-w-md">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="font-heading text-2xl text-offwhite mb-2">Cancel Appointment?</h3>
              <p className="text-offwhite/60 mb-4">
                Are you sure you want to cancel the appointment for <span className="text-gold">{cancelConfirm.customer?.full_name}</span>?
              </p>
              <div className="mb-6 text-left">
                <label className="block text-offwhite/60 text-sm mb-2">Reason for cancellation</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{ backgroundColor: '#1a1a1a', color: '#ffffff', border: '1px solid #333' }}
                  className="w-full px-4 py-3 border rounded-lg"
                >
                  <option value="">Select a reason...</option>
                  <option value="Wait time too long">Wait time too long</option>
                  <option value="Customer left">Customer left</option>
                  <option value="Mistake check-in">Mistake check-in</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setCancelConfirm(null); setCancelReason('') }}
                  className="flex-1 py-3 border border-offwhite/30 text-offwhite/60 hover:text-offwhite rounded-lg"
                >
                  Keep Appointment
                </button>
                <button
                  onClick={() => cancelAppointment(cancelConfirm)}
                  disabled={!cancelReason || updating === cancelConfirm.id}
                  className="flex-1 py-3 bg-red-500 text-white font-heading hover:bg-red-600 rounded-lg disabled:opacity-50"
                >
                  {updating === cancelConfirm.id ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  )
}