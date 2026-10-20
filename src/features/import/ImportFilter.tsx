import { ClearableInput } from '../../components/ClearableInput';
import { ProfileMenuItemIcon } from '../../components/icons/ProfileMenuItemIcon';

/** Presents a labeled, local-only filter with the shared app clear action. */
export function ImportFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="import-filter">
      <ProfileMenuItemIcon item="search" />
      <ClearableInput
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
