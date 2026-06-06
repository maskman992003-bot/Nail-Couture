import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function CustomerWaiverHistory({ profileId, customerPhone }) {
  const [waivers, setWaivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedWaiverId, setExpandedWaiverId] = useState(null);

  const fetchWaivers = async () => {
    setLoading(true);
    try {
      let allWaivers = [];
      const seenIds = new Set();

      const cleanCustomerPhone = customerPhone ? customerPhone.replace(/\D/g, '') : null;

      if (profileId) {
        const { data: profileWaivers, error: profileError } = await supabase
          .from('customer_waivers')
          .select('*')
          .eq('profile_id', profileId)
          .order('signed_at', { ascending: false });
        
        if (profileError) {
          console.error("Error fetching by profile_id:", profileError);
        } else if (profileWaivers) {
          profileWaivers.forEach(waiver => {
            if (!seenIds.has(waiver.id)) {
              seenIds.add(waiver.id);
              allWaivers.push(waiver);
            }
          });
        }
      }

      if (cleanCustomerPhone) {
        const { data: phoneWaivers, error: phoneError } = await supabase
          .from('customer_waivers')
          .select('*')
          .eq('customer_phone', cleanCustomerPhone)
          .order('signed_at', { ascending: false });
        
        if (phoneError) {
          console.error("Error fetching by customer_phone:", phoneError);
        } else if (phoneWaivers) {
          phoneWaivers.forEach(waiver => {
            if (!seenIds.has(waiver.id)) {
              seenIds.add(waiver.id);
              allWaivers.push(waiver);
            }
          });
        }
      }

      if (!profileId && !customerPhone) {
        setWaivers([]);
        setLoading(false);
        return;
      }

      allWaivers.sort((a, b) => new Date(b.signed_at) - new Date(a.signed_at));

      setWaivers(allWaivers);
    } catch (err) {
      console.error("Error fetching customer waivers:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileId || customerPhone) {
      fetchWaivers();
    }
  }, [profileId, customerPhone]);

  const toggleExpansion = (id) => {
    setExpandedWaiverId(expandedWaiverId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="py-6 text-center">
        <p className="text-secondary">Loading waiver history...</p>
      </div>
    );
  }

  if (waivers.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-secondary">No waiver history available for this customer</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-4">
        <div className="text-primary font-heading text-lg">Waiver & Agreement History</div>
      </div>

      <div className="space-y-3">
        {waivers.map((waiver) => (
          <div
            key={waiver.id}
            className="border border-card bg-secondary rounded-xl overflow-hidden"
          >
            <div
              className="p-4 cursor-pointer hover:bg-gold/10 transition-colors flex items-center justify-between"
              onClick={() => toggleExpansion(waiver.id)}
            >
              <div>
                <p className="text-sm font-heading text-primary">Signed Waiver Agreement</p>
                <p className="text-xs text-secondary">
                  {new Date(waiver.signed_at).toLocaleDateString()} at {new Date(waiver.signed_at).toLocaleTimeString()}
                </p>
              </div>

              <div>
                {expandedWaiverId === waiver.id ? (
                  <svg className="w-4 h-4 text-gold-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </div>

            {expandedWaiverId === waiver.id && (
              <div className="border-t border-light p-4">
                <div className="bg-white p-3 border border-light rounded-lg flex items-center justify-center">
                  <img
                    src={waiver.signature_image}
                    alt="Customer Signature"
                    className="w-full h-32 object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
