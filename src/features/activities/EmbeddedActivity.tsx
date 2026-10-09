type EmbeddedActivityProps = {
  src: string;
  title: string;
};

export default function EmbeddedActivity({ src, title }: EmbeddedActivityProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <p className="text-sm font-bold text-brand-700">Actividad interactiva</p>
          <p className="mt-1 text-sm text-slate-500">Completa el desafío dentro de la actividad.</p>
        </div>
        <span className="hidden rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 sm:inline-flex">
          Embebida
        </span>
      </div>
      <iframe
        title={title}
        src={src}
        className="h-[690px] w-full border-0"
        allow="fullscreen; autoplay; allow-top-navigation-by-user-activation"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
