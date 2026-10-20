import ConditionalsGame from './ConditionalsGame';
import InfinitivesandGerundsGame from './InfinitivesandGerundsGame';
import RelativeClausesGame from './RelativeClausesGame';

type InternalActivityProps = {
  gameId: string;
};

export default function InternalActivity({ gameId }: InternalActivityProps) {
  if (gameId === 'conditionals') return <ConditionalsGame />;
  if (gameId === 'relative-clauses') return <RelativeClausesGame />;
  if (gameId === 'infinitives-gerunds') return <InfinitivesandGerundsGame />;

  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
      Esta actividad interna estará disponible próximamente.
    </div>
  );
}
