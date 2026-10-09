import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-brand-100 bg-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
        <div>
          <Badge tone="brand">Inglés 5 · UAO</Badge>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            Aprende a través de
            <span className="block text-brand-700">nuevos desafíos.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Un espacio para fortalecer tu inglés mediante actividades interactivas enfocadas en los
            temas de Inglés 5.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#desafios">Explorar desafíos</ButtonLink>
            <ButtonLink href="#como-funciona" variant="secondary">
              Cómo funciona
            </ButtonLink>
          </div>
          <div className="mt-10 flex items-center gap-3 text-sm font-semibold text-slate-500">
            <span className="flex -space-x-2" aria-hidden="true">
              <span className="h-8 w-8 rounded-full border-2 border-white bg-brand-100" />
              <span className="h-8 w-8 rounded-full border-2 border-white bg-brand-500" />
              <span className="h-8 w-8 rounded-full border-2 border-white bg-brand-700" />
            </span>
            <span>Seis temas. Un solo lugar para practicar.</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-brand-100" />
          <div className="absolute -bottom-7 -left-7 h-32 w-32 rounded-full border-8 border-brand-50" />
          <div className="relative rounded-[2rem] bg-brand-700 p-6 text-white shadow-xl shadow-brand-700/20 sm:p-8">
            <div className="flex items-center justify-between text-sm font-bold text-brand-100">
              <span>TU RUTA DE APRENDIZAJE</span>
              <span>01 / 06</span>
            </div>
            <div className="mt-10 rounded-3xl bg-white p-6 text-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-brand-700">Desafío 01</p>
                  <h2 className="mt-2 text-2xl font-extrabold">Conditionals</h2>
                </div>
                <span className="rounded-2xl bg-brand-50 px-3 py-2 text-2xl" aria-hidden="true">
                  ?
                </span>
              </div>
              <div className="mt-8 space-y-3">
                <div className="h-3 rounded-full bg-slate-100" />
                <div className="h-3 w-4/5 rounded-full bg-slate-100" />
                <div className="h-3 w-3/5 rounded-full bg-brand-100" />
              </div>
              <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5 text-sm font-bold text-slate-500">
                <span>Actividad interactiva</span>
                <span className="text-brand-700">Próximamente</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
