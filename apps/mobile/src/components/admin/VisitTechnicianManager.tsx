import { useCallback, useEffect, useRef, useState } from 'react';

import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { getWorkstationStatus, WORKSTATION_ON_BREAK } from '@nail-couture/shared/utils/technicianWorkstation.js';

import {

  fetchVisitTechnicianData,

  addVisitCoTechnician,

  handoffVisitTechnician,

  removeVisitTechnician,

  MAX_CO_TECHNICIANS,

  countCoTechnicians,

} from '@nail-couture/shared/utils/visitTechnicians.js';

import { ScrollSelect } from '../forms/ScrollSelect';

import { useThemeStyles } from '../../theme/useThemeStyles';



type TechnicianRecord = { id: string; full_name?: string; preferences?: Record<string, unknown> };

type AppointmentRecord = { id: string; technician_id?: string };



type VisitTechRow = {

  technician_id: string;

  full_name?: string;

  participation_type?: string;

  is_primary?: boolean;

};



type VisitTechData = {

  technicians?: VisitTechRow[];

  primary_technician_id?: string | null;

};



type Props = {

  appointment: AppointmentRecord;

  callerPhone: string;

  technicians: TechnicianRecord[];

  onUpdated?: (data: VisitTechData) => void;

};



export function VisitTechnicianManager({ appointment, callerPhone, technicians, onUpdated }: Props) {

  const styles = useThemeStyles();

  const [data, setData] = useState<VisitTechData>({ technicians: [], primary_technician_id: null });

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState<string | null>(null);

  const [error, setError] = useState('');

  const [addTechId, setAddTechId] = useState('');

  const [handoffTechId, setHandoffTechId] = useState('');



  const onUpdatedRef = useRef(onUpdated);

  onUpdatedRef.current = onUpdated;



  const reload = useCallback(async (notifyParent = false) => {

    if (!appointment?.id || !callerPhone) return;

    setLoading(true);

    setError('');

    try {

      const result = await fetchVisitTechnicianData(callerPhone, appointment.id);

      setData(result);

      if (notifyParent) onUpdatedRef.current?.(result);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to load');

    } finally {

      setLoading(false);

    }

  }, [appointment?.id, callerPhone]);



  useEffect(() => {

    reload(false);

  }, [appointment?.id, callerPhone, reload]);



  const primaryTechnicianId = data.primary_technician_id ?? appointment?.technician_id ?? null;



  const participatingIds = new Set((data.technicians || []).map((t) => t.technician_id));

  const availableToAdd = technicians.filter(

    (t) => !participatingIds.has(t.id)

      && getWorkstationStatus(t.preferences) !== WORKSTATION_ON_BREAK,

  );



  const coTechCount = countCoTechnicians(data.technicians, primaryTechnicianId);

  const canAddMore = coTechCount < MAX_CO_TECHNICIANS;

  const addLabel = coTechCount === 0 ? 'Add co-technician' : 'Add another co-technician';



  const handoffCandidates = [

    ...(data.technicians || []).filter((t) => t.technician_id !== primaryTechnicianId),

    ...technicians

      .filter((t) => t.id !== primaryTechnicianId && !participatingIds.has(t.id)

        && getWorkstationStatus(t.preferences) !== WORKSTATION_ON_BREAK)

      .map((t) => ({ technician_id: t.id, full_name: t.full_name })),

  ].filter((t, i, arr) => arr.findIndex((x) => x.technician_id === t.technician_id) === i);



  const runAction = async (key: string, fn: () => Promise<unknown>) => {

    setBusy(key);

    setError('');

    try {

      await fn();

      await reload(true);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Action failed');

    } finally {

      setBusy(null);

    }

  };



  if (loading) {

    return <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginVertical: 12 }} />;

  }



  return (

    <View style={{ gap: 12 }}>

      {(data.technicians || []).length > 0 && (

        <View>

          <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 6 }]}>Participating</Text>

          {(data.technicians || []).map((t) => {

            const isPrimary = t.is_primary || t.technician_id === primaryTechnicianId;

            return (

              <View key={t.technician_id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>

                <Text style={styles.textPrimary}>

                  {t.full_name || 'Technician'}

                  {isPrimary ? ' (primary)' : ' (co-tech)'}

                </Text>

                {!isPrimary && (

                  <Pressable

                    onPress={() => runAction(`remove-${t.technician_id}`, () =>

                      removeVisitTechnician(callerPhone, appointment.id, t.technician_id))}

                    disabled={busy === `remove-${t.technician_id}`}

                  >

                    <Text style={{ color: '#f87171', fontSize: 12 }}>Remove</Text>

                  </Pressable>

                )}

              </View>

            );

          })}

        </View>

      )}



      {canAddMore ? (

        <View>

          <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 4 }]}>{addLabel}</Text>

          <ScrollSelect

            value={addTechId}

            onChange={setAddTechId}

            options={[

              { value: '', label: 'Select…' },

              ...availableToAdd.map((t) => ({ value: t.id, label: t.full_name || 'Tech' })),

            ]}

          />

          <Pressable

            onPress={() => runAction('add', () =>

              addVisitCoTechnician(callerPhone, appointment.id, addTechId).then(() => setAddTechId('')))}

            disabled={!addTechId || busy === 'add'}

            style={[styles.buttonSecondary, { marginTop: 8 }]}

          >

            <Text style={styles.buttonSecondaryText}>{busy === 'add' ? 'Adding…' : 'Add'}</Text>

          </Pressable>

        </View>

      ) : (

        <Text style={[styles.textSecondary, { fontSize: 12 }]}>

          Maximum of {MAX_CO_TECHNICIANS} co-technicians reached.

        </Text>

      )}



      <View>

        <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 4 }]}>Handoff primary to</Text>

        <ScrollSelect

          value={handoffTechId}

          onChange={setHandoffTechId}

          options={[

            { value: '', label: 'Select…' },

            ...handoffCandidates.map((t) => ({

              value: t.technician_id,

              label: `${t.full_name || 'Technician'}${participatingIds.has(t.technician_id) ? ' (on visit)' : ''}`,

            })),

          ]}

        />

        <Pressable

          onPress={() => runAction('handoff', () =>

            handoffVisitTechnician(callerPhone, appointment.id, handoffTechId).then(() => setHandoffTechId('')))}

          disabled={!handoffTechId || busy === 'handoff'}

          style={[styles.buttonSecondary, { marginTop: 8 }]}

        >

          <Text style={styles.buttonSecondaryText}>{busy === 'handoff' ? 'Handing off…' : 'Handoff'}</Text>

        </Pressable>

      </View>



      {error ? <Text style={{ color: '#f87171', fontSize: 12 }}>{error}</Text> : null}

    </View>

  );

}


