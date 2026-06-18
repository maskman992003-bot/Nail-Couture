import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  pointerWithin,
  rectIntersection,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { getServices } from '@nail-couture/shared/services/services'
import { isServiceBookable, isAddOnBookable } from '@nail-couture/shared/utils/serviceVisibility'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Sidebar from './Sidebar'
import AppModal, {
  modalLabelClass,
  modalInputClass,
  modalSelectClass,
  modalBtnSecondary,
  modalBtnPrimary,
  modalBtnDanger,
} from './AppModal'
import clsx from 'clsx'
import { MULTI_TECH_VISITS } from '@nail-couture/shared/constants/featureFlags'
import { canManageVisitTechnicians } from '@nail-couture/shared/utils/staffCustomerAccess'
import { getWorkstationStatus, WORKSTATION_ON_BREAK } from '@nail-couture/shared/utils/technicianWorkstation'
import usePullToRefresh from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import VisitTechnicianManager, { MultiTechBadge } from './VisitTechnicianManager'

const LOBBY_DROP_ID = 'lobby'

const stopDragActivation = (e) => { e.stopPropagation() }

const DragHandle = ({ listeners, attributes, compact = false }) => (
  <button
    type="button"
    data-drag-handle
    aria-label="Drag to assign technician"
    className={clsx(
      'touch-none select-none shrink-0 inline-flex items-center justify-center rounded-lg cursor-grab active:cursor-grabbing',
      'text-gold/60 hover:text-gold active:text-gold hover:bg-gold/10 active:bg-gold/15',
      compact ? 'w-9 h-9' : 'w-10 h-10'
    )}
    style={{ touchAction: 'none' }}
    {...listeners}
    {...attributes}
  >
    <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" aria-hidden="true">
      <circle cx="7" cy="5" r="1.5" />
      <circle cx="13" cy="5" r="1.5" />
      <circle cx="7" cy="10" r="1.5" />
      <circle cx="13" cy="10" r="1.5" />
      <circle cx="7" cy="15" r="1.5" />
      <circle cx="13" cy="15" r="1.5" />
    </svg>
  </button>
)

const floorManagerCollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) {
    const technicianCollision = pointerCollisions.find(c => String(c.id) !== LOBBY_DROP_ID)
    if (technicianCollision) return [technicianCollision]
    return pointerCollisions
  }
  return rectIntersection(args)
}

const LobbyWaitingDropZone = ({ children, activeDragId, pendingAppointments }) => {
  const isDraggingPending = pendingAppointments.some(a => String(a.id) === String(activeDragId))
  const { isOver, setNodeRef } = useDroppable({
    id: LOBBY_DROP_ID,
    disabled: !isDraggingPending
  })

  const dropZoneClass = clsx('rounded-xl transition-all', {
    'ring-2 ring-gold bg-gold/10 p-3 -m-3': isDraggingPending && isOver,
    'ring-1 ring-dashed ring-gold/30 p-3 -m-3': isDraggingPending && !isOver
  })

  return (
    <div
      ref={setNodeRef}
      className={dropZoneClass}
    >
      {isDraggingPending && (
        <p className="text-xs text-gold/70 mb-3 text-center">
          {isOver ? 'Release to return to waiting' : 'Drop here to return to waiting'}
        </p>
      )}
      {children}
    </div>
  )
}

const DraggablePendingCustomer = ({ appointment, children }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { type: 'pending-assignment', appointment }
  })

  const style = {
    transform: isDragging ? undefined : CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-start gap-2">
        <DragHandle listeners={listeners} attributes={attributes} compact />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}

const TechnicianGridItem = ({ tech, pendingCustomer, activeCustomer, isBusy, isPending, isOnBreak, updating, onAccept, onSendToCheckout, onManageTechs, showManageTechs, wiggle, activeDragId, theme }) => {
  const isDraggingThisPending = activeDragId && pendingCustomer && String(pendingCustomer.id) === String(activeDragId)
  const dropDisabled = isBusy || isPending || isOnBreak || isDraggingThisPending
  const { isOver, setNodeRef } = useDroppable({
    id: tech.id,
    disabled: dropDisabled
  })

  const showAcceptButton = !!pendingCustomer
  const dropHighlight = isOver && !isBusy && !isOnBreak

  const gridItemClass = clsx(
    'rounded-xl p-5 border-2 transition-all',
    {
      'border-gold border-4 bg-gold/20 scale-105': dropHighlight,
      'border-red-500/50 bg-red-900/10': isBusy && !dropHighlight,
      'border-yellow-500/40 bg-yellow-900/10': isOnBreak && !isBusy && !dropHighlight,
      'animate-wiggle': wiggle
    },
    !dropHighlight && !isBusy && !isOnBreak && (
      theme === 'dark' ? 'border-offwhite/20 bg-offwhite/5 hover:border-gold/50' : 'border-charcoal/20 bg-charcoal/5 hover:border-gold/50'
    )
  )

  const techNameClass = clsx('font-heading text-lg', {
    'text-red-400': isBusy,
    'text-yellow-400': isOnBreak && !isBusy,
    [theme === 'dark' ? 'text-offwhite' : 'text-charcoal']: !isBusy && !isOnBreak
  })

  const statusBadgeClass = clsx('text-xs px-2 py-1 rounded', {
    'bg-red-500/30 text-red-400': isBusy,
    'bg-yellow-500/30 text-yellow-400': isOnBreak && !isBusy,
    'bg-amber-500/30 text-amber-400': showAcceptButton && !isBusy && !isOnBreak
  }, !isBusy && !isOnBreak && !showAcceptButton && (
    theme === 'dark' ? 'bg-offwhite/20 text-offwhite/50' : 'bg-charcoal/20 text-charcoal/50'
  ))

  const activeCustomerTextClass = clsx('text-sm', theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60')
  const activeCustomerDetailClass = clsx('text-xs', theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40')
  const pendingCustomerTextClass = clsx('text-sm', theme === 'dark' ? 'text-offwhite/70' : 'text-charcoal/70')
  const pendingCustomerDetailClass = clsx('text-xs', theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50')
  const dropHintTextClass = clsx('text-sm', theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40')

  return (
    <div
      ref={setNodeRef}
      className={gridItemClass}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className={techNameClass}>{tech.full_name}</h4>
        <span className={statusBadgeClass}>
          {isBusy ? 'Busy' : isOnBreak ? 'On Break' : showAcceptButton ? 'Pending' : 'Available'}
        </span>
      </div>
      {isBusy ? (
        <div className={activeCustomerTextClass}>
          <div className="mb-2">{activeCustomer.customer?.full_name || 'Customer'}</div>
          <div className={activeCustomerDetailClass}>{activeCustomer.add_ons || activeCustomer.services?.name}</div>
          <button
            onClick={() => onSendToCheckout(activeCustomer.id)}
            disabled={updating === activeCustomer.id}
            className="mt-3 w-full py-2 bg-gold text-charcoal font-heading text-sm hover:bg-gold/90 disabled:opacity-50 rounded-lg"
          >
            {updating === activeCustomer.id ? 'Sending...' : 'Send to Checkout'}
          </button>
        </div>
      ) : showAcceptButton ? (
        <DraggablePendingCustomer appointment={pendingCustomer}>
          <div className={pendingCustomerTextClass}>
            <div className="mb-2">{pendingCustomer.customer?.full_name || 'Customer'}</div>
            <div className={pendingCustomerDetailClass}>{pendingCustomer.add_ons || pendingCustomer.services?.name}</div>
            <p className="text-[10px] text-gold/60 mt-1">Hold grip and drag to reassign or return to waiting</p>
            {showManageTechs && (
              <button
                type="button"
                onPointerDown={stopDragActivation}
                onTouchStart={stopDragActivation}
                onClick={() => onManageTechs(pendingCustomer)}
                className="mt-2 text-xs text-gold hover:text-gold/80"
              >
                Manage techs
              </button>
            )}
            <button
              onPointerDown={stopDragActivation}
              onTouchStart={stopDragActivation}
              onClick={() => onAccept(pendingCustomer.id, tech.id)}
              disabled={updating === pendingCustomer.id}
              className="mt-3 w-full py-2 bg-green-500 text-white font-heading text-sm hover:bg-green-600 disabled:opacity-50 rounded-lg"
            >
              {updating === pendingCustomer.id ? 'Starting...' : '✓ Confirm Start'}
            </button>
          </div>
        </DraggablePendingCustomer>
      ) : isOnBreak ? (
        <div className="text-sm text-yellow-400/80">
          On break — cannot assign
        </div>
      ) : (
        <div className={dropHintTextClass}>
          {dropHighlight ? 'Release to assign' : 'Drop here to assign'}
        </div>
      )}
    </div>
  )
}

const ManageTechButton = ({ appointment, onManage, theme }) => (
  <button
    type="button"
    onPointerDown={stopDragActivation}
    onTouchStart={stopDragActivation}
    onClick={(e) => { e.stopPropagation(); onManage(appointment) }}
    className={clsx('text-xs text-gold hover:text-gold/80', theme === 'dark' ? '' : '')}
  >
    Manage techs
  </button>
)

const DraggableAppointmentCard = ({ appointment, onEdit, onCancel, onManageTechs, showManageTechs, theme }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { type: 'appointment', appointment }
  })

  const style = {
    transform: isDragging ? undefined : CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    maxWidth: '100%',
    overflow: 'hidden'
  }

  const cardClass = clsx('border rounded-xl p-4 sm:p-5 transition-all',
    theme === 'dark' ? 'bg-offwhite/5 border-offwhite/10' : 'bg-charcoal/5 border-charcoal/10'
  )

  const customerNameClass = clsx('font-heading text-lg truncate', 
    theme === 'dark' ? 'text-offwhite' : 'text-charcoal'
  )

  const customerDetailClass = clsx('flex flex-wrap gap-x-2 gap-y-0.5 text-xs mt-0.5', 
    theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'
  )

  const timeTextClass = clsx('text-xs whitespace-nowrap', 
    theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'
  )

  const editBtnClass = clsx('text-sm', 
    theme === 'dark' ? 'text-offwhite/40 hover:text-offwhite' : 'text-charcoal/40 hover:text-charcoal'
  )

  const lineThroughPriceClass = clsx('line-through text-xs', 
    theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'
  )

  const durationClass = clsx('', 
    theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'
  )

  const nailGoalClass = clsx('text-xs', 
    theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60'
  )

  const addOnClass = clsx('text-xs', 
    theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClass}
    >
      <div className="flex items-start gap-2 mb-2">
        <DragHandle listeners={listeners} attributes={attributes} />
        <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={customerNameClass}>
                {appointment.customer?.full_name || 'Guest'}
              </h3>
              {appointment.booking_type === 'walk_in' ? (
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded shrink-0">Walk-in</span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded shrink-0">Online</span>
              )}
            </div>
            <div className={customerDetailClass}>
              {appointment.customer?.phone && <span>📞 {appointment.customer.phone}</span>}
              {appointment.customer?.refreshment_pref && <span>☕ {appointment.customer.refreshment_pref}</span>}
            </div>
          </div>
          <div className="flex items-start gap-2 shrink-0">
            <span className={timeTextClass}>{formatTime(appointment.checked_in_at)}</span>
            <div className="flex items-center gap-1">
              {showManageTechs && <ManageTechButton appointment={appointment} onManage={onManageTechs} theme={theme} />}
              <button onPointerDown={stopDragActivation} onTouchStart={stopDragActivation} onClick={(e) => { e.stopPropagation(); onEdit(appointment) }} className={editBtnClass}>✎</button>
              <button onPointerDown={stopDragActivation} onTouchStart={stopDragActivation} onClick={(e) => { e.stopPropagation(); onCancel(appointment) }} className="text-red-400/50 hover:text-red-400 text-sm">✕</button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {appointment.services && (
          <span className="text-gold font-heading">{appointment.services.name}</span>
        )}
        {appointment.final_price != null && appointment.final_price < (appointment.services?.price || 0) ? (
          <>
            <span className="text-green-400 font-medium">${appointment.final_price.toFixed(2)}</span>
            <span className={lineThroughPriceClass}>${appointment.services?.price}</span>
          </>
        ) : appointment.services?.price > 0 ? (
          <span className="text-green-400 font-medium">${appointment.services.price}</span>
        ) : null}
        {appointment.services?.duration_minutes && (
          <span className={durationClass}>{appointment.services.duration_minutes}min</span>
        )}
        {appointment.customer?.nail_goal && (
          <span className={nailGoalClass}>{appointment.customer.nail_goal}</span>
        )}
        {appointment.add_ons && (
          <span className={addOnClass}>+{appointment.add_ons}</span>
        )}
      </div>
    </div>
  )
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const getAppointmentTotalPrice = (appointment, availableServices = []) => {
  if (appointment.total_price != null) {
    return Number(appointment.total_price) || 0
  }

  const basePrice = appointment.services?.price || 0
  const addOnNames = appointment.add_ons
    ? appointment.add_ons.split(',').map(n => n.trim()).filter(Boolean)
    : []

  const addonTotal = addOnNames.reduce((sum, name) => {
    const addon = availableServices.find(s => s.name === name && s.is_addon)
    return sum + (addon?.price || 0)
  }, 0)

  return basePrice + addonTotal
}

const EditAppointmentModal = ({ appointment, services, onSave, onClose }) => {
  const mainServices = services.filter(isServiceBookable)
  const addOnServices = services.filter(isAddOnBookable)
  const currentAddOns = appointment.add_ons ? appointment.add_ons.split(',').map(n => n.trim()).filter(Boolean) : []

  const initialMainId = appointment.service_id
  const initialMainServices = initialMainId ? mainServices.filter(s => s.id === Number(initialMainId)) : []
  const initialAddOnServiceNames = currentAddOns.filter(name => addOnServices.some(s => s.name === name))
  const initialMainServiceNames = currentAddOns.filter(name => mainServices.some(s => s.name === name))

  const [formData, setFormData] = useState({
    selected_services: initialMainServices.length > 0 ? initialMainServices : (initialMainServiceNames.map(name => mainServices.find(s => s.name === name)).filter(Boolean)),
    selected_addons: initialAddOnServiceNames,
    nail_goal: appointment.customer?.nail_goal || '',
    discount_amount: '',
    discount_type: 'amount',
  })
  const [saving, setSaving] = useState(false)

  const addOnPrice = formData.selected_addons.reduce((sum, name) => {
    const svc = addOnServices.find(s => s.name === name)
    return sum + (svc?.price || 0)
  }, 0)
  const mainPrice = formData.selected_services.reduce((sum, s) => sum + (s.price || 0), 0)
  const basePrice = mainPrice + addOnPrice
  const totalAfterDiscount = formData.discount_amount > 0
    ? (formData.discount_type === 'percent'
        ? basePrice * (1 - formData.discount_amount / 100)
        : basePrice - (formData.discount_amount || 0)
      )
    : basePrice
  const finalDisplayPrice = Math.max(0, totalAfterDiscount).toFixed(2)

  const toggleMainService = (service) => {
    setFormData(prev => ({
      ...prev,
      selected_services: prev.selected_services.some(s => s.id === service.id)
        ? prev.selected_services.filter(s => s.id !== service.id)
        : [...prev.selected_services, service]
    }))
  }

  const toggleAddOn = (name) => {
    setFormData(prev => ({
      ...prev,
      selected_addons: prev.selected_addons.includes(name)
        ? prev.selected_addons.filter(n => n !== name)
        : [...prev.selected_addons, name]
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    const serviceNames = formData.selected_services.map((s) => s.name).filter(Boolean)
    const addOnNames = formData.selected_addons.filter(Boolean)
    const updates = {
      service_id: formData.selected_services[0]?.id || null,
      selected_service_names: serviceNames.length ? serviceNames.join(', ') : null,
      add_ons: addOnNames.length ? addOnNames.join(', ') : null,
      final_price: parseFloat(finalDisplayPrice),
      nail_goal: formData.nail_goal || null,
    }
    await onSave(appointment.id, updates)
    setSaving(false)
    onClose()
  }

  return (
    <AppModal
      open
      onClose={onClose}
      title="Edit Appointment"
      scrollBody
      maxWidth="max-w-lg"
      zIndex="z-[200]"
      footer={
        <>
          <button type="button" onClick={onClose} className={modalBtnSecondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || formData.selected_services.length === 0}
            className={modalBtnPrimary}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={`${modalLabelClass} normal-case tracking-normal text-sm`}>Services</label>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {mainServices.map((s) => {
              const isSelected = formData.selected_services.some((sv) => sv.id === s.id)
              return (
                <label
                  key={s.id}
                  className="flex items-center gap-3 p-2 bg-secondary border border-light rounded-lg cursor-pointer hover:bg-gold/10"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMainService(s)}
                    className="accent-gold"
                  />
                  <span className="text-primary text-sm flex-1">{s.name}</span>
                  <span className="text-green-600 text-sm font-medium">${s.price}</span>
                </label>
              )
            })}
          </div>
        </div>

        {addOnServices.length > 0 && (
          <div>
            <label className={`${modalLabelClass} normal-case tracking-normal text-sm`}>Add-on Services</label>
            <div className="space-y-2">
              {addOnServices.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-3 p-2 bg-secondary border border-light rounded-lg cursor-pointer hover:bg-gold/10"
                >
                  <input
                    type="checkbox"
                    checked={formData.selected_addons.includes(s.name)}
                    onChange={() => toggleAddOn(s.name)}
                    className="accent-gold"
                  />
                  <span className="text-primary text-sm flex-1">{s.name}</span>
                  <span className="text-green-600 text-sm font-medium">+${s.price}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={`${modalLabelClass} normal-case tracking-normal text-sm`}>Nail Goal</label>
          <select
            value={formData.nail_goal}
            onChange={(e) => setFormData({ ...formData, nail_goal: e.target.value })}
            className={modalSelectClass}
          >
            <option value="">Select goal</option>
            <option value="Healthy Natural Nails">Healthy Natural Nails</option>
            <option value="Long Extensions">Long Extensions</option>
            <option value="Intricate Art">Intricate Art</option>
          </select>
        </div>

        <div className="border-t border-light pt-4">
          <h4 className="text-gold font-heading mb-3">Apply Discount</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`${modalLabelClass} normal-case tracking-normal text-sm`}>Amount</label>
              <input
                type="number"
                value={formData.discount_amount}
                onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                className={modalInputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className={`${modalLabelClass} normal-case tracking-normal text-sm`}>Type</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                className={modalSelectClass}
              >
                <option value="amount">$</option>
                <option value="percent">%</option>
              </select>
            </div>
          </div>
        </div>

        {formData.selected_services.length > 0 && (
          <div className="bg-gold/10 border border-gold/30 rounded-lg p-4">
            <div className="space-y-1">
              {formData.selected_services.map((s) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span className="text-secondary">{s.name}</span>
                  <span className="text-primary">${s.price.toFixed(2)}</span>
                </div>
              ))}
              {formData.selected_addons.map((name) => {
                const svc = addOnServices.find((s) => s.name === name)
                return svc ? (
                  <div key={name} className="flex justify-between text-sm">
                    <span className="text-secondary">{svc.name} (add-on)</span>
                    <span className="text-primary">+${svc.price.toFixed(2)}</span>
                  </div>
                ) : null
              })}
              {formData.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-${(basePrice - parseFloat(finalDisplayPrice)).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gold/20">
              <span className="text-secondary">Total</span>
              <span className="font-heading text-2xl text-gold-strong">${finalDisplayPrice}</span>
            </div>
          </div>
        )}
      </div>
    </AppModal>
  )
}

export default function AdminLobby() {
  const [lobbyAppointments, setLobbyAppointments] = useState([])
  const [servingAppointments, setServingAppointments] = useState([])
  const [checkoutReadyAppointments, setCheckoutReadyAppointments] = useState([])
  const [pendingAppointments, setPendingAppointments] = useState([])
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
  const [wiggleTechId, setWiggleTechId] = useState(null)
  const [managingTechsFor, setManagingTechsFor] = useState(null)
  const { user } = useAuth()
  const showManageTechs = MULTI_TECH_VISITS && canManageVisitTechnicians(user?.role)
  const { theme } = useTheme()
  const navigate = useNavigate()

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
  )

  const busyTechnicians = servingAppointments
    .filter(a => a.status === 'serving' && a.technician_id)
    .map(a => a.technician_id)

  const pendingTechnicians = pendingAppointments
    .filter(a => a.status === 'assigned_pending' && a.technician_id)
    .map(a => a.technician_id)

  const allBusyTechnicians = [...busyTechnicians, ...pendingTechnicians]

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchAppointments(), fetchServingAppointments(), fetchCheckoutReadyAppointments(), fetchPendingAppointments(), fetchTechnicians(), fetchTodayTotal()])
      setLoading(false)
    }
    init()
    getServices().then(setServices).catch(err => { if (process.env.NODE_ENV === 'development') console.error(err); })
    
    const channel = supabase
      .channel('floor-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, async () => {
        await Promise.all([fetchAppointments(), fetchServingAppointments(), fetchCheckoutReadyAppointments(), fetchPendingAppointments(), fetchTechnicians(), fetchTodayTotal()])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, async () => {
        await fetchTechnicians()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const getCallerPhone = () => {
    const d = localStorage.getItem('salon_user_data');
    return d ? JSON.parse(d).phone : '';
  };

  const fetchAppointments = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') console.log('Fetching waiting appointments...')
    const { data, error } = await supabase
      .rpc('get_appointments', { caller_phone: getCallerPhone(), status_filter: 'waiting', order_asc: true })

    if (error) {
      if (process.env.NODE_ENV === 'development') console.error('Error fetching waiting:', error)
    } else {
      setLobbyAppointments(data || [])
    }
  }, [])

  const fetchServingAppointments = useCallback(async () => {
    const { data, error } = await supabase
      .rpc('get_appointments', { caller_phone: getCallerPhone(), status_filter: 'serving', order_asc: true })

    if (!error) setServingAppointments(data || [])
  }, [])

  const fetchCheckoutReadyAppointments = useCallback(async () => {
    const { data, error } = await supabase
      .rpc('get_appointments', { caller_phone: getCallerPhone(), status_filter: 'ready_for_checkout', order_asc: true })

    if (!error) setCheckoutReadyAppointments(data || [])
  }, [])

  const fetchPendingAppointments = useCallback(async () => {
    const { data, error } = await supabase
      .rpc('get_appointments', { caller_phone: getCallerPhone(), status_filter: 'assigned_pending', order_asc: true })

    if (!error) setPendingAppointments(data || [])
  }, [])

  const fetchTechnicians = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'technician')
      .order('full_name')
    
    if (!error) setTechnicians(data || [])
  }, [])

  const fetchTodayTotal = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .rpc('get_appointments_count', {
        caller_phone: getCallerPhone(),
        status_filter: 'completed',
        date_from: today.toISOString(),
      })
    setTodayTotal(data || 0)
  }, [])

  const refreshFloorManager = useCallback(async () => {
    await Promise.all([
      fetchAppointments(),
      fetchServingAppointments(),
      fetchCheckoutReadyAppointments(),
      fetchPendingAppointments(),
      fetchTechnicians(),
      fetchTodayTotal(),
    ])
  }, [
    fetchAppointments,
    fetchServingAppointments,
    fetchCheckoutReadyAppointments,
    fetchPendingAppointments,
    fetchTechnicians,
    fetchTodayTotal,
  ])

  const { pullDistance, isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: refreshFloorManager,
    disabled: Boolean(activeId),
  })

  const decrementRefreshmentInventory = async (refreshmentName) => {
    try {
      const { data: inventoryItems, error: fetchError } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('item_name', refreshmentName)
        .eq('category', 'refreshment')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') return;

      if (inventoryItems && inventoryItems.quantity > 0) {
        const newQuantity = inventoryItems.quantity - 1;
        await supabase
          .from('inventory')
          .update({ quantity: newQuantity })
          .eq('id', inventoryItems.id);

        if (newQuantity <= 0) {
          setNotification({ message: `Low stock: ${refreshmentName}`, name: 'Inventory Alert' });
          setTimeout(() => setNotification(null), 3000);
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error(err);
    }
  };

  const updateStatus = async (appointmentId, status, techId = null) => {
    setUpdating(appointmentId)
    const updates = { status }
    if (techId) updates.technician_id = techId
    if (status === 'serving') updates.start_time = new Date().toISOString()
    
    await supabase.rpc('update_appointment', {
      caller_phone: user?.phone,
      appointment_id: appointmentId,
      p_status: updates.status || null,
      p_technician_id: updates.technician_id || null,
      p_start_time: updates.start_time || null,
      p_final_price: updates.final_price || null,
    })
    await Promise.all([fetchAppointments(), fetchServingAppointments(), fetchCheckoutReadyAppointments(), fetchTodayTotal()])
    setUpdating(null)
  }

  const sendToCheckout = async (appointmentId) => {
    setUpdating(appointmentId)
    const appt = servingAppointments.find(a => a.id === appointmentId)
    const estimatedPrice = appt?.final_price ?? appt?.services?.price ?? null

    const { error } = await supabase.rpc('send_to_checkout', {
      caller_phone: user?.phone,
      appointment_id: appointmentId,
      p_final_price: estimatedPrice,
    })

    if (error) {
      if (process.env.NODE_ENV === 'development') console.error('send_to_checkout:', error)
      setUpdating(null)
      return
    }

    setNotification({ message: 'Sent to Checkout', name: appt?.customer?.full_name })
    setTimeout(() => setNotification(null), 3000)

    await Promise.all([fetchServingAppointments(), fetchCheckoutReadyAppointments(), fetchTechnicians()])
    setUpdating(null)
  }

  const handleEditSave = async (appointmentId, updates) => {
    const { nail_goal, ...apptUpdates } = updates
    await supabase.rpc('update_appointment', {
      caller_phone: user?.phone,
      appointment_id: appointmentId,
      p_service_id: apptUpdates.service_id || null,
      p_add_ons: apptUpdates.add_ons || null,
      p_selected_service_names: apptUpdates.selected_service_names || null,
      p_final_price: apptUpdates.final_price || null,
      p_refreshment_pref: apptUpdates.refreshment_pref || null,
      p_technician_id: apptUpdates.technician_id || null,
      p_status: apptUpdates.status || null,
      p_notes: apptUpdates.notes || null,
    })
    
    if (nail_goal && editingAppointment?.customer_id) {
      await supabase.rpc('update_profile_field', {
        caller_phone: user?.phone,
        profile_id: editingAppointment.customer_id,
        field_name: 'nail_goal',
        field_value: nail_goal,
      })
    }
    
    await Promise.all([fetchAppointments(), fetchServingAppointments()])
    setEditingAppointment(null)
  }

  const cancelAppointment = async (appointment) => {
    setUpdating(appointment.id)
    await supabase.rpc('cancel_appointment', { caller_phone: user?.phone, appointment_id: appointment.id })
    
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
    const dropTargetId = String(over.id)
    const pendingAppointment = pendingAppointments.find(a => String(a.id) === String(appointmentId))
    const isReallocation = !!pendingAppointment

    if (dropTargetId === LOBBY_DROP_ID && isReallocation) {
      setUpdating(appointmentId)
      await supabase.rpc('update_appointment', {
        caller_phone: user?.phone,
        appointment_id: appointmentId,
        p_status: 'waiting',
        p_technician_id: null,
      })

      setNotification({ message: 'Returned to waiting', name: pendingAppointment.customer?.full_name })
      setTimeout(() => setNotification(null), 3000)

      await Promise.all([fetchAppointments(), fetchPendingAppointments(), fetchTechnicians()])
      setUpdating(null)
      return
    }

    if (dropTargetId === LOBBY_DROP_ID) return

    const technicianId = dropTargetId

    if (isReallocation && String(pendingAppointment.technician_id) === technicianId) return

    const targetHasOtherAssignment = pendingAppointments.some(
      a => String(a.technician_id) === technicianId && String(a.id) !== String(appointmentId)
    )
    const targetIsServing = servingAppointments.some(
      a => String(a.technician_id) === technicianId && a.status === 'serving'
    )

    const targetTech = technicians.find((t) => String(t.id) === technicianId)
    const targetOnBreak = targetTech && getWorkstationStatus(targetTech.preferences) === WORKSTATION_ON_BREAK

    if (targetOnBreak) {
      setWiggleTechId(technicianId)
      setTimeout(() => setWiggleTechId(null), 500)
      setNotification({ message: 'Technician is on break', name: targetTech?.full_name || 'Cannot assign' })
      setTimeout(() => setNotification(null), 3000)
      return
    }

    if (targetIsServing || targetHasOtherAssignment) {
      setWiggleTechId(technicianId)
      setTimeout(() => setWiggleTechId(null), 500)
      setNotification({ message: 'Technician is busy', name: 'Cannot assign right now' })
      setTimeout(() => setNotification(null), 3000)
      return
    }

    if (!isReallocation && allBusyTechnicians.map(String).includes(technicianId)) {
      setWiggleTechId(technicianId)
      setTimeout(() => setWiggleTechId(null), 500)
      setNotification({ message: 'Technician is busy', name: 'Cannot assign right now' })
      setTimeout(() => setNotification(null), 3000)
      return
    }

    setUpdating(appointmentId)
    const { error } = await supabase.rpc('update_appointment', {
      caller_phone: user?.phone,
      appointment_id: appointmentId,
      p_technician_id: technicianId,
      p_status: 'assigned_pending',
    })

    if (error) {
      setNotification({ message: 'Assignment failed', name: error.message })
      setTimeout(() => setNotification(null), 3000)
      setUpdating(null)
      return
    }

    if (isReallocation) {
      const techName = technicians.find(t => String(t.id) === technicianId)?.full_name || 'technician'
      setNotification({ message: `Reassigned to ${techName}`, name: pendingAppointment.customer?.full_name })
      setTimeout(() => setNotification(null), 3000)
    }

    await Promise.all([fetchAppointments(), fetchPendingAppointments(), fetchTechnicians()])
    setUpdating(null)
  }

  const acceptAssignment = async (appointmentId, techId) => {
    setUpdating(appointmentId)
    const { error } = await supabase.rpc('update_appointment', {
      caller_phone: user?.phone,
      appointment_id: appointmentId,
      p_status: 'serving',
      p_start_time: new Date().toISOString(),
    })
    
    if (error) {
      setUpdating(null)
      return
    }
    
    await Promise.all([fetchAppointments(), fetchServingAppointments(), fetchCheckoutReadyAppointments(), fetchPendingAppointments(), fetchTechnicians()])
    setUpdating(null)
  }

  if (loading) {
    return (
      <div className={`min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 ${theme === 'dark' ? 'bg-primary text-primary' : 'bg-white text-charcoal'}`}>
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={floorManagerCollisionDetection}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className={`min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 ${theme === 'dark' ? 'bg-primary text-primary' : 'bg-white text-charcoal'}`}>
        <Sidebar />
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          pullProgress={pullProgress}
        />
        <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
            <div className="mb-6">
              <h1 className="font-heading text-2xl sm:text-3xl text-gold">Floor Manager</h1>
              <p className={`mt-1 ${theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60'}`}>Hold the grip handle and drag to assign, reassign, or return customers to waiting. Pull down to refresh on mobile.</p>
            </div>

            {notification && (
              <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-gold text-charcoal px-4 sm:px-8 py-4 rounded-lg shadow-lg z-50 max-w-[90vw]">
                <p className="font-heading text-base sm:text-lg">{notification.message}</p>
                <p className="text-sm opacity-80">{notification.name}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <LobbyWaitingDropZone activeDragId={activeId} pendingAppointments={pendingAppointments}>
                  <h2 className="font-heading text-xl text-gold mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-gold rounded-full animate-pulse"></span>
                    Waiting ({lobbyAppointments.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {lobbyAppointments.map(appointment => (
                      <DraggableAppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onEdit={setEditingAppointment}
                        onCancel={setCancelConfirm}
                        onManageTechs={setManagingTechsFor}
                        showManageTechs={showManageTechs}
                        theme={theme}
                      />
                    ))}
                    {lobbyAppointments.length === 0 && (
                      <div className={`col-span-1 sm:col-span-2 text-center py-16 border rounded-xl ${theme === 'dark' ? 'bg-offwhite/5 border-offwhite/10' : 'bg-charcoal/5 border-charcoal/10'}`}>
                        <p className={`${theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'}`}>No guests waiting</p>
                      </div>
                    )}
                  </div>
                </LobbyWaitingDropZone>

                <h2 className="font-heading text-xl text-gold mt-8 mb-4">Currently Serving ({servingAppointments.length})</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {servingAppointments.map(appointment => (
                    <div key={appointment.id} className="bg-gold/10 border border-gold/30 rounded-xl p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className={`font-heading text-lg ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>{appointment.customer?.full_name || 'Guest'}</h3>
                          {appointment.customer?.phone && (
                            <span className={`text-xs ${theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'}`}>📞 {appointment.customer.phone}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {showManageTechs && (
                            <button type="button" onClick={() => setManagingTechsFor(appointment)} className="text-xs text-gold hover:text-gold/80">Manage techs</button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setEditingAppointment(appointment) }} className={`text-sm ${theme === 'dark' ? 'text-offwhite/40 hover:text-offwhite' : 'text-charcoal/40 hover:text-charcoal'}`}>✎</button>
                          <button onClick={() => setCancelConfirm(appointment)} className="text-red-400/50 hover:text-red-400 text-sm">✕</button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm items-center">
                        {appointment.services && <span className="text-gold font-heading">{appointment.services.name}</span>}
                        <span className="text-green-400 font-medium">
                          ${getAppointmentTotalPrice(appointment, services).toFixed(2)}
                        </span>
                        {appointment.technician && (
                          <span className="text-xs text-gold/70 ml-auto">with {appointment.technician.full_name}</span>
                        )}
                        {showManageTechs && <MultiTechBadge appointment={appointment} theme={theme} />}
                      </div>
                      {appointment.add_ons && (
                        <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'}`}>+ {appointment.add_ons}</div>
                      )}
                      {appointment.start_time && (
                        <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'}`}>
                          Started: {formatTime(appointment.start_time)}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => sendToCheckout(appointment.id)}
                        disabled={updating === appointment.id}
                        className="mt-3 w-full py-2 bg-gold text-charcoal font-heading text-sm hover:bg-gold/90 disabled:opacity-50 rounded-lg"
                      >
                        {updating === appointment.id ? 'Sending...' : 'Send to Checkout'}
                      </button>
                    </div>
                  ))}
                </div>

                <h2 className="font-heading text-xl text-gold mt-8 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-amber-400 rounded-full"></span>
                  Ready for Checkout ({checkoutReadyAppointments.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {checkoutReadyAppointments.map(appointment => (
                    <div key={appointment.id} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className={`font-heading text-lg ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>{appointment.customer?.full_name || 'Guest'}</h3>
                          {appointment.technician && (
                            <span className={`text-xs ${theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'}`}>with {appointment.technician.full_name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {showManageTechs && (
                            <button type="button" onClick={() => setManagingTechsFor(appointment)} className="text-xs text-gold hover:text-gold/80">Manage techs</button>
                          )}
                          <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400">Awaiting payment</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm items-center">
                        {appointment.services && <span className="text-gold font-heading">{appointment.services.name}</span>}
                        <span className="text-amber-400 font-medium">
                          ${getAppointmentTotalPrice(appointment, services).toFixed(2)}
                        </span>
                      </div>
                      {appointment.checkout_ready_at && (
                        <div className={`text-xs mt-2 ${theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'}`}>
                          Ready since: {formatTime(appointment.checkout_ready_at)}
                        </div>
                      )}
                    </div>
                  ))}
                  {checkoutReadyAppointments.length === 0 && (
                    <div className={`col-span-1 sm:col-span-2 text-center py-8 border rounded-xl ${theme === 'dark' ? 'bg-offwhite/5 border-offwhite/10' : 'bg-charcoal/5 border-charcoal/10'}`}>
                      <p className={`${theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'}`}>No clients waiting at checkout</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="font-heading text-xl text-gold mb-4">Technician Grid</h2>
                <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'}`}>Hold grip on a waiting customer, then drop on a technician to assign or reassign</p>
                <div className="space-y-4">
                  {technicians.map(tech => {
                    const activeCustomer = servingAppointments.find(a => a.technician_id === tech.id && a.status === 'serving')
                    const pendingCustomer = pendingAppointments.find(a => a.technician_id === tech.id && a.status === 'assigned_pending')
                    const isBusy = !!activeCustomer
                    const isPending = !!pendingCustomer
                    const isOnBreak = getWorkstationStatus(tech.preferences) === WORKSTATION_ON_BREAK
                    
                    return (
                      <TechnicianGridItem
                        key={tech.id}
                        tech={tech}
                        activeCustomer={activeCustomer || {}}
                        pendingCustomer={pendingCustomer}
                        isBusy={isBusy}
                        isPending={isPending}
                        isOnBreak={isOnBreak}
                        wiggle={String(wiggleTechId) === String(tech.id)}
                        updating={updating}
                        onAccept={acceptAssignment}
                        onSendToCheckout={sendToCheckout}
                        onManageTechs={setManagingTechsFor}
                        showManageTechs={showManageTechs}
                        activeDragId={activeId}
                        theme={theme}
                      />
                    )
                  })}
                  {technicians.length === 0 && (
                    <div className={`text-center py-8 ${theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'}`}>
                      No technicians found (add role='technician' to profiles)
                    </div>
                  )}
                </div>
              </div>
            </div>
        </div>
      </div>

      <DragOverlay>
        {activeId && (() => {
          const waitingAppt = lobbyAppointments.find(a => a.id === activeId)
          const pendingAppt = pendingAppointments.find(a => a.id === activeId)
          const appointment = waitingAppt || pendingAppt
          if (!appointment) return null
          return (
            <div className="bg-gold/10 border-2 border-gold rounded-xl p-4 sm:p-5 shadow-2xl max-w-[90vw] pointer-events-none w-72">
              <p className={`font-heading truncate ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>
                {appointment.customer?.full_name || 'Customer'}
              </p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60'}`}>
                {pendingAppt ? 'Drop to reassign or return to waiting' : 'Drop to assign'}
              </p>
            </div>
          )
        })()}
      </DragOverlay>

      {editingAppointment && (
        <EditAppointmentModal
          appointment={editingAppointment}
          services={services}
          onSave={handleEditSave}
          onClose={() => setEditingAppointment(null)}
          theme={theme}
        />
      )}

      {cancelConfirm && (
        <AppModal
          open
          onClose={() => { setCancelConfirm(null); setCancelReason('') }}
          title="Cancel Appointment?"
          maxWidth="max-w-md"
          zIndex="z-[200]"
          headerExtra={<div className="text-3xl mt-1" aria-hidden>⚠️</div>}
          footer={
            <>
              <button
                type="button"
                onClick={() => { setCancelConfirm(null); setCancelReason('') }}
                className={modalBtnSecondary}
              >
                Keep Appointment
              </button>
              <button
                type="button"
                onClick={() => cancelAppointment(cancelConfirm)}
                disabled={!cancelReason || updating === cancelConfirm.id}
                className={modalBtnDanger}
              >
                {updating === cancelConfirm.id ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </>
          }
        >
          <p className="text-primary text-sm mb-4 text-center">
            Are you sure you want to cancel the appointment for{' '}
            <span className="text-gold-strong font-medium">{cancelConfirm.customer?.full_name}</span>?
          </p>
          <div>
            <label className={modalLabelClass}>Reason for cancellation</label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className={modalSelectClass}
            >
              <option value="">Select a reason...</option>
              <option value="Wait time too long">Wait time too long</option>
              <option value="Customer left">Customer left</option>
              <option value="Mistake check-in">Mistake check-in</option>
            </select>
          </div>
        </AppModal>
      )}

      {managingTechsFor && (
        <AppModal
          open
          onClose={() => setManagingTechsFor(null)}
          title={`Technicians — ${managingTechsFor.customer?.full_name || 'Guest'}`}
          maxWidth="max-w-lg"
          zIndex="z-[200]"
          scrollBody
          footer={
            <button
              type="button"
              onClick={() => setManagingTechsFor(null)}
              className={modalBtnSecondary}
            >
              Done
            </button>
          }
        >
          <VisitTechnicianManager
            appointment={managingTechsFor}
            callerPhone={getCallerPhone()}
            technicians={technicians}
            theme={theme}
            onUpdated={(result) => {
              if (result?.primary_technician_id) {
                setManagingTechsFor((prev) => prev
                  ? { ...prev, technician_id: result.primary_technician_id }
                  : prev);
              }
              Promise.all([
                fetchAppointments(),
                fetchServingAppointments(),
                fetchCheckoutReadyAppointments(),
                fetchPendingAppointments(),
              ]).catch(() => {});
            }}
          />
        </AppModal>
      )}
    </DndContext>
  )
}