export type MatchingPair = {
  id: number;
  leftText: string;
  rightText: string;
  connector: 'because' | 'so that' | 'in order to';
  category: 'Cause & Reason' | 'Purpose';
  explanation: string;
};

export const causeReasonPurposePairs: MatchingPair[] = [
  {
    id: 1,
    leftText: 'I stayed at home',
    rightText: 'because it was raining',
    connector: 'because',
    category: 'Cause & Reason',
    explanation: 'Explains the cause/reason for staying home.',
  },
  {
    id: 2,
    leftText: 'She studies English',
    rightText: 'so that she can communicate with more people.',
    connector: 'so that',
    category: 'Purpose',
    explanation: 'Expresses the purpose or goal of studying English.',
  },
  {
    id: 3,
    leftText: 'He was late',
    rightText: 'because he missed the bus.',
    connector: 'because',
    category: 'Cause & Reason',
    explanation: 'Explains why he was late (the cause).',
  },
  {
    id: 4,
    leftText: 'We wear jackets',
    rightText: 'because it was cold',
    connector: 'because',
    category: 'Cause & Reason',
    explanation: 'Explains the reason for wearing jackets.',
  },
  {
    id: 5,
    leftText: 'They went to the library',
    rightText: 'in order to study for the exam.',
    connector: 'in order to',
    category: 'Purpose',
    explanation: 'States the intended purpose of going to the library.',
  },
  {
    id: 6,
    leftText: 'I turned on the light',
    rightText: 'so that I could see better.',
    connector: 'so that',
    category: 'Purpose',
    explanation: 'Expresses the purpose behind turning on the light.',
  },
  {
    id: 7,
    leftText: "She couldn't go to school",
    rightText: 'because she was sick',
    connector: 'because',
    category: 'Cause & Reason',
    explanation: 'Explains the reason for not being able to attend school.',
  },
  {
    id: 8,
    leftText: 'He saved money',
    rightText: 'in order to buy a new phone.',
    connector: 'in order to',
    category: 'Purpose',
    explanation: 'States the purpose of saving money.',
  },
];

/**
 * Shuffles an array using Fisher-Yates algorithm
 * (Only run in client effects or event handlers)
 */
export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Deterministic initial order for SSR (e.g. reversed order)
 */
export function createDeterministicInitialOrder<T>(items: T[]): T[] {
  return [...items].reverse();
}
