import { useMemo, useState } from 'react';
import { ROLE_LABELS, getInitials } from '../../utils/scheduleUtils';

const ROLE_FILTERS = ['all', 'technician', 'cashier', 'admin'];

function StaffMemberButton({ member, isActive, count, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(member.id)}
      className={`flex items-center gap-3 text-left transition-all shrink-0 ${
        isActive ? 'bg-gold/10 border-gold/30 text-gold' : 'bg-secondary border-light text-primary hover:border-white/20'
      } border rounded-xl px-3 py-2.5 lg:w-full lg:rounded-none lg:border-0 lg:border-l-2 lg:px-4 lg:py-3 ${
        isActive ? 'lg:border-l-gold' : 'lg:border-l-transparent lg:hover:bg-white/[0.03]'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-heading ${
        isActive ? 'bg-gold text-charcoal' : 'bg-gold/10 text-gold border border-gold/20'
      }`}>
        {getInitials(member.full_name)}
      </div>
      <div className="min-w-0 flex-1 lg:block">
        <div className={`text-sm font-medium truncate ${isActive ? 'text-gold' : 'text-primary'}`}>{member.full_name}</div>
        <div className="text-[10px] text-secondary uppercase tracking-wide">{ROLE_LABELS[member.role] || member.role}</div>
      </div>
      <span className="text-[10px] text-muted tabular-nums">{count}</span>
    </button>
  );
}

function RoleFilterBar({ roleFilter, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by role">
      {ROLE_FILTERS.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          aria-pressed={roleFilter === r}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium uppercase tracking-wide transition-all ${
            roleFilter === r ? 'bg-gold/15 text-gold border border-gold/30' : 'text-secondary hover:text-primary border border-transparent'
          }`}
        >
          {r === 'all' ? 'All' : ROLE_LABELS[r]}
        </button>
      ))}
    </div>
  );
}

function TeamSearchInput({ value, onChange, id }) {
  return (
    <label htmlFor={id} className="block">
      <span className="sr-only">Search team members</span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name…"
        className="w-full px-3 py-2 bg-input border border-light rounded-lg text-sm text-primary placeholder:text-muted focus:border-gold focus:outline-none"
      />
    </label>
  );
}

export default function ScheduleTeamPicker({
  filteredStaff,
  selectedStaffId,
  roleFilter,
  shiftCountsByMember,
  onSelectStaff,
  onRoleFilterChange,
  variant = 'sidebar',
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchId = variant === 'mobile' ? 'team-search-mobile' : 'team-search-sidebar';

  const visibleStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredStaff;
    return filteredStaff.filter((member) => member.full_name?.toLowerCase().includes(q));
  }, [filteredStaff, searchQuery]);

  const list = visibleStaff.map((member) => (
    <StaffMemberButton
      key={member.id}
      member={member}
      isActive={member.id === selectedStaffId}
      count={shiftCountsByMember[member.id] || 0}
      onSelect={onSelectStaff}
    />
  ));

  if (variant === 'mobile') {
    return (
      <div className="lg:hidden space-y-3">
        <RoleFilterBar roleFilter={roleFilter} onChange={onRoleFilterChange} />
        <TeamSearchInput id={searchId} value={searchQuery} onChange={setSearchQuery} />
        <div className="-mx-3 sm:-mx-4 px-3 sm:px-4 overflow-x-auto">
          <div className="flex gap-2 pb-1 min-w-min" role="list">
            {list}
            {visibleStaff.length === 0 && (
              <p className="text-sm text-secondary py-2">
                {searchQuery.trim() ? 'No matching team members' : 'No team members'}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside className="hidden lg:block lg:w-56 xl:w-64 shrink-0" aria-label="Team members">
      <div className="rounded-2xl border border-light bg-secondary overflow-hidden">
        <div className="p-4 border-b border-light">
          <h2 className="text-xs font-bold uppercase tracking-widest text-secondary">Team</h2>
        </div>
        <div className="p-3 border-b border-light space-y-3">
          <TeamSearchInput id={searchId} value={searchQuery} onChange={setSearchQuery} />
          <RoleFilterBar roleFilter={roleFilter} onChange={onRoleFilterChange} />
        </div>
        <div className="max-h-[420px] overflow-y-auto divide-y divide-white/5" role="list">
          {list}
          {visibleStaff.length === 0 && (
            <p className="p-4 text-sm text-secondary text-center">
              {searchQuery.trim() ? 'No matching team members' : 'No team members'}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
