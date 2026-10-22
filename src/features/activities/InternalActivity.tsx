import CauseReasonandPurposeGame from './CauseReasonandPurposeGame';
import ConditionalsGame from './ConditionalsGame';
import DeterminersGame from './DeterminersGame';
import InfinitivesandGerundsGame from './InfinitivesandGerundsGame';
import QuestionTagsGame from './QuestionTagsGame';
import RelativeClausesGame from './RelativeClausesGame';

type InternalActivityProps = {
  gameId: string;
};

export default function InternalActivity({ gameId }: InternalActivityProps) {
  if (gameId === 'conditionals') return <ConditionalsGame />;
  if (gameId === 'relative-clauses') return <RelativeClausesGame />;
  if (gameId === 'infinitives-gerunds') return <InfinitivesandGerundsGame />;
  if (gameId === 'question-tags') return <QuestionTagsGame />;
  if (gameId === 'connectors-cause-reason-purpose') return <CauseReasonandPurposeGame />;
  if (gameId === 'determiners') return <DeterminersGame />;

  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
      This internal activity will be available soon.
    </div>
  );
}
