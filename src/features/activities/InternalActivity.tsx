import ConditionalsGame from './ConditionalsGame';

type InternalActivityProps = {
  gameId: string;
};

export default function InternalActivity({ gameId }: InternalActivityProps) {
  if (gameId === 'conditionals') return <ConditionalsGame />;

  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
      Esta actividad interna estará disponible próximamente.
    </div>
  );
}
