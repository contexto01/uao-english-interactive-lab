import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-brand-700">404</p>
      <p className="mt-2 text-slate-600">No encontramos esta página.</p>
      <ButtonLink href="/" className="mt-6">Ir al inicio</ButtonLink>
    </div>
  );
}