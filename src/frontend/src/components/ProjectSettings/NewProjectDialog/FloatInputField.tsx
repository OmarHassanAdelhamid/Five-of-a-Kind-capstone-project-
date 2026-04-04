const FLOAT_REGEX = /^-?\d*\.?\d*$/;

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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === '' || FLOAT_REGEX.test(v)) {
      onChange(v);
    }
  };

  return (
    <div className="dialog-section">
      <p className="dialog-hint-white">
        <strong>{label}</strong>
      </p>
      <div className="inline-row">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          className={className}
        />
        {!isValid && <p className="dialog-error">{errorMessage}</p>}
      </div>
    </div>
  );
};
