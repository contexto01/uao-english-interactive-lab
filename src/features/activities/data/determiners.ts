export type DeterminerQuestion = {
  id: number;
  statement: string;
  isTrue: boolean;
  category: 'Articles' | 'Demonstratives' | 'Possessives' | 'Quantifiers';
  explanation: string;
};

export const determinersQuestions: DeterminerQuestion[] = [
  {
    id: 1,
    statement: '“The” is an indefinite article.',
    isTrue: false,
    category: 'Articles',
    explanation: '“The” is the definite article. “A” and “an” are the indefinite articles.',
  },
  {
    id: 2,
    statement: 'In English, articles are a type of determiner.',
    isTrue: true,
    category: 'Articles',
    explanation: 'Articles (a, an, the) are a fundamental category of determiners in English grammar.',
  },
  {
    id: 3,
    statement: '“Our” is a demonstrative determiner.',
    isTrue: false,
    category: 'Possessives',
    explanation: '“Our” is a possessive determiner. Demonstrative determiners are this, that, these, and those.',
  },
  {
    id: 4,
    statement: '“Those” refers to something near the speaker.',
    isTrue: false,
    category: 'Demonstratives',
    explanation: '“Those” refers to plural items far/distant from the speaker. “These” refers to items near.',
  },
  {
    id: 5,
    statement: '“The” is the definite article.',
    isTrue: true,
    category: 'Articles',
    explanation: '“The” is used to specify a particular item known to the listener or speaker.',
  },
  {
    id: 6,
    statement: '“Many” is used only with uncountable nouns.',
    isTrue: false,
    category: 'Quantifiers',
    explanation: '“Many” is used with plural countable nouns (e.g., many books). “Much” is used with uncountable nouns.',
  },
  {
    id: 7,
    statement: '“A” is used before plural nouns.',
    isTrue: false,
    category: 'Articles',
    explanation: '“A” (and “an”) can only be used with singular countable nouns, never with plural nouns.',
  },
  {
    id: 8,
    statement: '“A” and “an” are indefinite articles.',
    isTrue: true,
    category: 'Articles',
    explanation: '“A” and “an” refer to general, non-specific singular countable nouns.',
  },
  {
    id: 9,
    statement: '“My,” “your” and “their” can be possessive determiners.',
    isTrue: true,
    category: 'Possessives',
    explanation: 'These words precede nouns to indicate ownership or connection (e.g., “my bag”, “their team”).',
  },
  {
    id: 10,
    statement: '“This” and “these” are demonstrative determiners.',
    isTrue: true,
    category: 'Demonstratives',
    explanation: 'Both point to items close to the speaker (“this” for singular, “these” for plural).',
  },
];

/**
 * Shuffles an array with Fisher-Yates algorithm
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
