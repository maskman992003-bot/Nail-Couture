const OPTION_STYLE = { backgroundColor: '#1a1a1a', color: '#f5f5f0' };

const baseSelectClass =
  'w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg focus:outline-none focus:border-gold transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export default function RefreshmentSelect({
  value = '',
  onChange,
  refreshments = [],
  loading = false,
  className = '',
  label,
  labelClassName = 'block text-offwhite/50 text-xs uppercase tracking-wider mb-2',
  emptyLabel = 'None / No Preference',
  required = false,
  id,
  showUnavailableNote = false,
  hideWhenEmpty = false,
}) {
  const availableNames = refreshments.map((item) => item.item_name);
  const valueUnavailable = value && !availableNames.includes(value);
  const selectValue = valueUnavailable ? '' : value;

  if (hideWhenEmpty && !loading && refreshments.length === 0) {
    return null;
  }

  return (
    <div>
      {label && (
        <label htmlFor={id} className={labelClassName}>
          {label}
        </label>
      )}
      <select
        id={id}
        value={selectValue}
        onChange={onChange}
        className={`${baseSelectClass} ${className}`.trim()}
        disabled={loading}
        required={required}
      >
        <option value="" style={OPTION_STYLE}>
          {loading ? 'Loading refreshments...' : emptyLabel}
        </option>
        {refreshments.map((item) => (
          <option key={item.item_name} value={item.item_name} style={OPTION_STYLE}>
            {item.item_name}
          </option>
        ))}
      </select>
      {valueUnavailable && showUnavailableNote && (
        <p className="text-amber-400/80 text-xs mt-1.5">
          Your previous choice ({value}) is currently unavailable. Please select another option.
        </p>
      )}
      {!loading && refreshments.length === 0 && (
        <p className="text-offwhite/40 text-xs mt-1.5">No refreshments are available right now.</p>
      )}
    </div>
  );
}
