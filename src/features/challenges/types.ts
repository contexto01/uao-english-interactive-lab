export type ActivityKind = 'internal' | 'embedded' | 'external';

export type ChallengeStatus = 'planned' | 'available';

export type Activity =
  | {
      kind: 'internal';
      status: ChallengeStatus;
      gameId: string;
    }
  | {
      kind: 'embedded';
      status: ChallengeStatus;
      src: string;
      title: string;
    }
  | {
      kind: 'external';
      status: ChallengeStatus;
    };

export type Challenge = {
  id: string;
  title: string;
  description: string;
  activity: Activity;
};
