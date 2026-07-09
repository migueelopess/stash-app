"use client";

/** Select que submete o formulário-pai assim que o valor muda. */
export function SelectAutoSubmit({
  name,
  className,
  defaultValue,
  children,
  ariaLabel,
}: {
  name: string;
  className?: string;
  defaultValue?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      aria-label={ariaLabel}
      className={className}
      onChange={(e) => {
        if (e.currentTarget.value) e.currentTarget.form?.requestSubmit();
      }}
    >
      {children}
    </select>
  );
}
