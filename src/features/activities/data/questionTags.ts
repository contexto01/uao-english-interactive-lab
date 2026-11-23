export type QuestionTagOption = {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
  isCorrect: boolean;
};

export type QuestionTagQuestion = {
  id: number;
  prompt: string;
  statementPart: string;
  answer: string;
  category: string;
  explanation: string;
  options: QuestionTagOption[];
};

type RawQuestionTag = {
  id: number;
  prompt: string;
  statementPart: string;
  answer: string;
  distractors: [string, string, string];
  category: string;
  explanation: string;
};

export const rawQuestionTagsQuestions: RawQuestionTag[] = [
  {
    id: 1,
    prompt: 'You are from London, ___?',
    statementPart: 'You are from London,',
    answer: "aren't you",
    distractors: ['are you', "don't you", "weren't you"],
    category: 'Verb Be (Affirmative → Negative)',
    explanation:
      "The statement is affirmative and uses be (are), so the tag is negative: aren't you.",
  },
  {
    id: 2,
    prompt: "She isn't coming today, ___?",
    statementPart: "She isn't coming today,",
    answer: 'is she',
    distractors: ["isn't she", 'does she', 'was she'],
    category: 'Present Continuous (Negative → Affirmative)',
    explanation:
      'A negative statement takes an affirmative tag. The auxiliary is is, so use is she.',
  },
  {
    id: 3,
    prompt: 'They live near the station, ___?',
    statementPart: 'They live near the station,',
    answer: "don't they",
    distractors: ['do they', "aren't they", "didn't they"],
    category: 'Present Simple (do)',
    explanation:
      'In the present simple, use do in the tag when the main verb is live. The statement is positive, so the tag is negative.',
  },
  {
    id: 4,
    prompt: 'Mark plays the guitar, ___?',
    statementPart: 'Mark plays the guitar,',
    answer: "doesn't he",
    distractors: ["don't he", 'does he', "isn't he"],
    category: 'Present Simple 3rd Person (does)',
    explanation:
      'With he and a present-simple verb, use does. A positive statement takes a negative tag.',
  },
  {
    id: 5,
    prompt: 'We went to the museum, ___?',
    statementPart: 'We went to the museum,',
    answer: "didn't we",
    distractors: ["don't we", 'did we', "weren't we"],
    category: 'Past Simple (Affirmative → Negative)',
    explanation:
      'The past-simple statement uses did in its tag. Because the statement is affirmative, the tag is negative.',
  },
  {
    id: 6,
    prompt: "You didn't call me, ___?",
    statementPart: "You didn't call me,",
    answer: 'did you',
    distractors: ["didn't you", 'do you', 'have you'],
    category: 'Past Simple (Negative → Affirmative)',
    explanation:
      'The statement is negative and in the past simple, so its tag is affirmative: did you.',
  },
  {
    id: 7,
    prompt: 'Tom can swim very well, ___?',
    statementPart: 'Tom can swim very well,',
    answer: "can't he",
    distractors: ['can he', "doesn't he", "isn't he"],
    category: 'Modal Verbs (can)',
    explanation:
      "Repeat the modal can in the tag and change its polarity: the affirmative statement takes can't he.",
  },
  {
    id: 8,
    prompt: "I shouldn't be late, ___?",
    statementPart: "I shouldn't be late,",
    answer: 'should I',
    distractors: ["shouldn't I", 'do I', 'am I'],
    category: 'Modal Verbs (should)',
    explanation:
      'The negative modal statement takes an affirmative tag, using the same modal: should I.',
  },
  {
    id: 9,
    prompt: 'Your parents have finished dinner, ___?',
    statementPart: 'Your parents have finished dinner,',
    answer: "haven't they",
    distractors: ["don't they", 'have they', "hadn't they"],
    category: 'Present Perfect (have)',
    explanation:
      "Here have is the auxiliary in the present perfect. The affirmative statement takes the negative tag haven't they.",
  },
  {
    id: 10,
    prompt: 'The children are playing outside, ___?',
    statementPart: 'The children are playing outside,',
    answer: "aren't they",
    distractors: ['are they', "don't they", "isn't it"],
    category: 'Present Continuous (are)',
    explanation:
      "The present continuous uses are as its auxiliary. A positive statement takes the negative tag aren't they.",
  },
];

export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const OPTION_LETTERS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

export function createInitialQuestionTagsQuiz(): QuestionTagQuestion[] {
  return rawQuestionTagsQuestions.map((q) => {
    const rawOptions = [
      { text: q.answer, isCorrect: true },
      ...q.distractors.map((d) => ({ text: d, isCorrect: false })),
    ];
    return {
      id: q.id,
      prompt: q.prompt,
      statementPart: q.statementPart,
      answer: q.answer,
      category: q.category,
      explanation: q.explanation,
      options: rawOptions.map((opt, idx) => ({
        letter: OPTION_LETTERS[idx],
        text: opt.text,
        isCorrect: opt.isCorrect,
      })),
    };
  });
}

export function generateRandomizedQuestionTagsQuiz(): QuestionTagQuestion[] {
  const shuffledQuestions = shuffleArray(rawQuestionTagsQuestions);
  return shuffledQuestions.map((q) => {
    const rawOptions = shuffleArray([
      { text: q.answer, isCorrect: true },
      ...q.distractors.map((d) => ({ text: d, isCorrect: false })),
    ]);
    return {
      id: q.id,
      prompt: q.prompt,
      statementPart: q.statementPart,
      answer: q.answer,
      category: q.category,
      explanation: q.explanation,
      options: rawOptions.map((opt, idx) => ({
        letter: OPTION_LETTERS[idx],
        text: opt.text,
        isCorrect: opt.isCorrect,
      })),
    };
  });
}
