/** Campo con etiqueta visible (asociada al control), para no depender solo del placeholder. */
export function LabeledField({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-0.5 block text-[11px] font-medium text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
