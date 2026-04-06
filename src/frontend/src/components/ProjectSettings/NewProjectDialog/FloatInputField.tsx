/**
 * Numeric text input with validation styling for dialog forms.
 *
 * @author Khalid Farag, Olivia Reich
 * @lastModified 2026/04/05
 */
const FLOAT_REGEX = /^-?\d*\.?\d*$/;

// Props for the FloatInputField component
interface FloatInputFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  isValid: boolean;
  errorMessage: string;
  className?: string;
}

export const FloatInputField = ({
  id,
  label,
  value,
  onChange,
  isValid,
  errorMessage,
  className,
}: FloatInputFieldProps) => {
  // Handles the change event on the input field
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === '' || FLOAT_REGEX.test(v)) {
      onChange(v);
    }
  };

  return (
    <div className="dialog-section">
      <p className="dialog-section-title">{label}</p>
      <div className="inline-row">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          className={['dialog-input', className].filter(Boolean).join(' ')}
        />
        {!isValid && <p className="dialog-error">{errorMessage}</p>}
      </div>
    </div>
  );
};
