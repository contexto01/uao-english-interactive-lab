export type ActivityKind = 'internal' | 'embedded' | 'external';

export type ChallengeStatus = 'planned' | 'available';

export type Challenge = {
  id: string;
  title: string;
  description: string;
  activity: {
    kind: ActivityKind;
    status: ChallengeStatus;
  };
};
