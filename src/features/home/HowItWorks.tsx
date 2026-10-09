const steps = [
  {
    number: '01',
    title: 'Elige un desafío',
    description: 'Selecciona el tema de Inglés 5 que quieres repasar.',
  },
  {
    number: '02',
    title: 'Completa la actividad',
    description: 'Practica con una actividad interactiva diseñada para el tema.',
  },
  {
    number: '03',
    title: 'Revisa tu progreso',
    description: 'Consulta tu puntaje y tiempo cuando esté disponible la experiencia de resultados.',
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-white px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand-700">
            Así funciona
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Un camino claro para practicar.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.number} className="rounded-3xl border border-slate-200 p-6">
              <span className="text-sm font-extrabold text-brand-700">{step.number}</span>
              <h3 className="mt-8 text-xl font-extrabold text-slate-900">{step.title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
