export type QuestionOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type InfinitiveGerundQuestion = {
  id: number;
  question: string;
  category: string;
  explanation: string;
  options: {
    letter: 'A' | 'B' | 'C';
    text: string;
    isCorrect: boolean;
  }[];
};

export const rawQuestions: Omit<InfinitiveGerundQuestion, 'id'>[] = [
  {
    question: 'Which sentence is correct?',
    category: 'Verbs of liking (Enjoy)',
    explanation:
      "Verbs of preference like 'enjoy' are always followed by a gerund (-ing form): 'I enjoy swimming.'",
    options: [
      { letter: 'A', text: 'I enjoy swam.', isCorrect: false },
      { letter: 'B', text: 'I enjoy to swim.', isCorrect: false },
      { letter: 'C', text: 'I enjoy swimming.', isCorrect: true },
    ],
  },
  {
    question: "Which is the correct form after 'decide'?",
    category: 'Decision verbs (Decide)',
    explanation:
      "'Decide' is followed by a to-infinitive: 'I decided to go to the cinema.'",
    options: [
      { letter: 'A', text: 'I decided went to the cinema.', isCorrect: false },
      { letter: 'B', text: 'I decided to go to the cinema.', isCorrect: true },
      { letter: 'C', text: 'I decided going to the cinema.', isCorrect: false },
    ],
  },
  {
    question: 'Which sentence uses a gerund after the verb?',
    category: 'Suggestion verbs (Suggest)',
    explanation:
      "'Suggest' is followed by a gerund: 'They suggested going to the concert.'",
    options: [
      { letter: 'A', text: 'They suggested to go to the concert.', isCorrect: false },
      { letter: 'B', text: 'They suggested going to the concert.', isCorrect: true },
      { letter: 'C', text: 'They suggested went to the concert.', isCorrect: false },
    ],
  },
  {
    question: "After verbs like 'enjoy', which form is correct?",
    category: 'Verbs of liking (Enjoy)',
    explanation:
      "'Enjoy' always takes a gerund: 'I enjoy reading books.'",
    options: [
      { letter: 'A', text: 'I enjoy reading books.', isCorrect: true },
      { letter: 'B', text: 'I enjoy to read books.', isCorrect: false },
      { letter: 'C', text: 'I enjoy read books.', isCorrect: false },
    ],
  },
  {
    question: 'Which sentence means he paused, not quit?',
    category: 'Meaning change (Stop to do vs. Stop doing)',
    explanation:
      "'Stop + to-infinitive' means pausing in order to do something else: 'He stopped to check the map.' In contrast, 'stopped checking' means he ceased doing it.",
    options: [
      { letter: 'A', text: 'He stopped to checking the map.', isCorrect: false },
      { letter: 'B', text: 'He stopped checking the map.', isCorrect: false },
      { letter: 'C', text: 'He stopped to check the map.', isCorrect: true },
    ],
  },
  {
    question: "Which example shows 'remember' with a future action / duty?",
    category: 'Meaning change (Remember to do vs. Remember doing)',
    explanation:
      "'Remember + to-infinitive' means remembering an obligation or action to perform: 'I remembered to call her yesterday.'",
    options: [
      { letter: 'A', text: 'I remembered call her yesterday.', isCorrect: false },
      { letter: 'B', text: 'I remembered calling her yesterday.', isCorrect: false },
      { letter: 'C', text: 'I remembered to call her yesterday.', isCorrect: true },
    ],
  },
  {
    question: "Which sentence uses a correct infinitive after 'promise'?",
    category: 'Commitment verbs (Promise)',
    explanation:
      "'Promise' is followed by a to-infinitive: 'She promised to help us.'",
    options: [
      { letter: 'A', text: 'She promised to help us.', isCorrect: true },
      { letter: 'B', text: 'She promised helping us.', isCorrect: false },
      { letter: 'C', text: 'She promised helps us.', isCorrect: false },
    ],
  },
  {
    question: 'Which sentence means he quit smoking?',
    category: 'Meaning change (Stop doing)',
    explanation:
      "'Stop + gerund' means to permanently quit or cease an activity: 'He stopped smoking.'",
    options: [
      { letter: 'A', text: 'He stops smoking.', isCorrect: false },
      { letter: 'B', text: 'He stopped to smoke.', isCorrect: false },
      { letter: 'C', text: 'He stopped smoking.', isCorrect: true },
    ],
  },
  {
    question: 'Which sentence correctly uses a preposition with a gerund?',
    category: 'Prepositions + Gerunds',
    explanation:
      "When a verb directly follows a preposition ('at', 'in', 'of', 'about', etc.), it must be in the -ing gerund form: 'I'm good at swimming.'",
    options: [
      { letter: 'A', text: "I'm good at swim.", isCorrect: false },
      { letter: 'B', text: "I'm good at swimming.", isCorrect: true },
      { letter: 'C', text: "I'm good at to swim.", isCorrect: false },
    ],
  },
  {
    question: "Which is correct for casual politeness: 'It's nice to meet you' or 'It's nice meeting you'?",
    category: 'Adjective + To-Infinitive',
    explanation:
      "When introducing oneself, the standard polite phrase uses 'nice + to-infinitive': 'It's nice to meet you.'",
    options: [
      { letter: 'A', text: "It's nice meeting you.", isCorrect: false },
      { letter: 'B', text: "It's nice to meet yous.", isCorrect: false },
      { letter: 'C', text: "It's nice to meet you.", isCorrect: true },
    ],
  },
];

/**
 * Fisher-Yates shuffle
 */
export function shuffleArray<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Generates a randomized set of questions and randomly shuffled options with assigned A, B, C letters.
 */
export function generateRandomizedQuiz(): InfinitiveGerundQuestion[] {
  const letters: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
  const shuffledRaw = shuffleArray(rawQuestions);

  return shuffledRaw.map((q, idx) => {
    // Shuffle the 3 options for each question
    const shuffledOptions = shuffleArray(q.options).map((opt, optIdx) => ({
      letter: letters[optIdx],
      text: opt.text,
      isCorrect: opt.isCorrect,
    }));

    return {
      id: idx + 1,
      question: q.question,
      category: q.category,
      explanation: q.explanation,
      options: shuffledOptions,
    };
  });
}
