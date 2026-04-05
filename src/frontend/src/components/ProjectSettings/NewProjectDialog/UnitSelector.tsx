import type { UnitOption } from './types';

interface UnitSelectorProps {
  value: UnitOption;
  onChange: (u: UnitOption) => void;
}

export const UnitSelector = ({ value, onChange }: UnitSelectorProps) => (
  <div className="dialog-section">
    <p className="dialog-hint-white">
      <strong>
        Reference units for export in which all measurements are expressed as:
      </strong>
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
