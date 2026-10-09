import { challenges } from '@/features/challenges/data/challenges';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';

export default function ChallengesSection() {
  return (
    <section id="desafios" className="bg-slate-50 px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand-700">
            Tablero de desafíos
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Elige un tema y comienza a practicar.
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Explora los seis temas seleccionados para esta experiencia de Inglés 5. Las actividades
            se agregarán progresivamente.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {challenges.map((challenge, index) => (
            <article
              key={challenge.id}
              className="flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-100 hover:shadow-lg"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-extrabold text-brand-700">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Badge tone="brand">
                  {challenge.activity.status === 'available' ? 'Disponible' : 'Próximamente'}
                </Badge>
              </div>
              <h3 className="mt-8 text-xl font-extrabold text-slate-900">{challenge.title}</h3>
              <p className="mt-3 flex-1 leading-7 text-slate-600">{challenge.description}</p>
              <ButtonLink href={`/desafios/${challenge.id}`} variant="secondary" className="mt-6 w-full">
                {challenge.activity.status === 'available' ? 'Abrir desafío' : 'Ver desafío'}
              </ButtonLink>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
