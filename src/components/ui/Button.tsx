import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link, { type LinkProps } from 'next/link';

export type Variant = 'primary' | 'secondary' | 'ghost';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-800',
  secondary: 'bg-white text-brand-700 ring-1 ring-inset ring-brand-100 hover:bg-brand-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
};

export const buttonClasses = (variant: Variant = 'primary', extra = '') =>
  `${base} ${variants[variant]} ${extra}`;

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  children,
  ...props
}: LinkProps & { variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link className={buttonClasses(variant, className)} {...props}>
      {children}
    </Link>
  );
}
