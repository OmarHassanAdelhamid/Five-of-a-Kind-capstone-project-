// This component is used to display the unit selector (µm, mm, cm)
import type { UnitOption } from './types';

// Props for the UnitSelector component
interface UnitSelectorProps {
  value: UnitOption;
  onChange: (u: UnitOption) => void;
}

export const UnitSelector = ({ value, onChange }: UnitSelectorProps) => (
  <div className="dialog-section">
    <p className="dialog-section-title">
      Reference units for export (measurements expressed as)
    </p>
    <div className="radio-row">
      {(['µm', 'mm', 'cm'] as UnitOption[]).map((u) => (
        <label key={u} className="radio-pill">
          <input
            type="radio"
            name="modelUnits"
            value={u}
            checked={value === u}
            onChange={() => onChange(u)}
          />
          <span>{u}</span>
        </label>
      ))}
    </div>
  </div>
);
