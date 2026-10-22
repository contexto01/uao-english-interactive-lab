const steps = [
  {
    number: '01',
    title: 'Choose a challenge',
    description: 'Select the English 5 topic you want to review.',
  },
  {
    number: '02',
    title: 'Complete the activity',
    description: 'Practice with an interactive activity designed for the topic.',
  },
  {
    number: '03',
    title: 'Review your progress',
    description: 'Check your score and time when the results experience becomes available.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand-700">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            A clear path to practice.
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
