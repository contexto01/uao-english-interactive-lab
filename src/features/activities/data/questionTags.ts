export type QuestionTagItem = {
  id: string;
  word: string;
  clue: string;
  example: string;
  tip?: string;
};

export const questionTagsQuestions: QuestionTagItem[] = [
  {
    id: 'qt-1',
    word: 'TAG',
    clue: 'Short question added after a statement to check or confirm information.',
    example: "Example: \"It's a beautiful day, isn't it?\" ('isn't it' is the tag)",
    tip: 'Tags turn statements into quick checks for agreement.',
  },
  {
    id: 'qt-2',
    word: 'AUXILIARY',
    clue: 'Helping verb used to form a question or negative sentence.',
    example: "Example: \"You can drive, can't you?\" ('can' is the auxiliary verb)",
    tip: 'The question tag repeats or mirrors the auxiliary verb from the main clause.',
  },
  {
    id: 'qt-3',
    word: 'SUBJECT',
    clue: 'Person, animal, or thing that performs the action or is described.',
    example: "Example: \"The students studied hard, didn't they?\" ('they' refers to the subject)",
    tip: 'The subject in the tag is converted into an equivalent personal pronoun.',
  },
  {
    id: 'qt-4',
    word: 'NEGATIVE',
    clue: 'Form of a sentence that says something is not true or does not happen.',
    example: "Example: \"You like pizza, don't you?\" (Positive statement + Negative tag)",
    tip: 'A positive statement takes a negative question tag.',
  },
  {
    id: 'qt-5',
    word: 'POSITIVE',
    clue: 'Form of a sentence that states something is true or happens.',
    example: "Example: \"She hasn't called, has she?\" (Negative statement + Positive tag)",
    tip: 'A negative statement takes a positive question tag.',
  },
  {
    id: 'qt-6',
    word: 'INTONATION',
    clue: 'The rise and fall of voice pitch when speaking, used in tags to check or ask.',
    example: 'Example: Rising pitch (↗) means a genuine question; falling pitch (↘) checks agreement.',
    tip: 'Intonation changes the speaker’s intention completely.',
  },
  {
    id: 'qt-7',
    word: 'PRONOUN',
    clue: 'Word used instead of a noun, such as he, she, or they.',
    example: "Example: \"Carlos lives in Cali, doesn't he?\" ('he' is the pronoun replacing Carlos)",
    tip: 'Never use full nouns in a tag; always use pronouns (I, you, he, she, it, we, they).',
  },
  {
    id: 'qt-8',
    word: 'CONTRACTION',
    clue: 'Shortened form made by joining words, often with an apostrophe.',
    example: "Example: \"aren't\", \"isn't\", \"doesn't\", \"won't\"",
    tip: 'Negative tags almost always use contracted forms instead of full words.',
  },
  {
    id: 'qt-9',
    word: 'CONFIRM',
    clue: 'To check that something is true or correct.',
    example: 'Example: We use question tags primarily to confirm facts or invite conversation.',
    tip: 'Question tags are conversational devices rather than formal interrogatives.',
  },
  {
    id: 'qt-10',
    word: 'STATEMENT',
    clue: 'A sentence that gives information rather than asking a question.',
    example: "Example: \"You are Colombian [Statement], aren't you? [Question Tag]\"",
    tip: 'Every question tag relies on an initial declarative statement.',
  },
];

/**
 * Letter tile representation for scrambled pool
 */
export type LetterTile = {
  id: string;
  char: string;
  originalIndex: number;
};

/**
 * Shuffles an array with Fisher-Yates algorithm
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
 * Creates initial deterministic tiles for SSR/prerender without Math.random()
 */
export function createInitialTiles(word: string): LetterTile[] {
  const letters = word.toUpperCase().split('');
  const tiles: LetterTile[] = letters.map((char, index) => ({
    id: `${char}-${index}`,
    char,
    originalIndex: index,
  }));

  if (tiles.length > 1) {
    [tiles[0], tiles[1]] = [tiles[1], tiles[0]];
  }
  return tiles;
}

let tileIdCounter = 0;

/**
 * Creates scrambled tiles for a word, ensuring it's not already spelled correctly
 */
export function createScrambledTiles(word: string): LetterTile[] {
  const letters = word.toUpperCase().split('');
  const tiles: LetterTile[] = letters.map((char, index) => ({
    id: `${char}-${index}-${++tileIdCounter}`,
    char,
    originalIndex: index,
  }));

  // If word length is 1, return as is
  if (tiles.length <= 1) return tiles;

  for (let attempt = 0; attempt < 50; attempt++) {
    const shuffled = shuffleArray(tiles);
    const spelled = shuffled.map((t) => t.char).join('');
    if (spelled !== word.toUpperCase()) {
      return shuffled;
    }
  }

  // Fallback: reverse the tiles if shuffle was identical
  return [...tiles].reverse();
}

