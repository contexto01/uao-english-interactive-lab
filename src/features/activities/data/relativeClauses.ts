export type RelativeClauseQuestion = {
  id: string;
  sentence: string;
  explanation: string;
  rule: string;
  relativeType: 'defining' | 'non-defining';
  relativeWord: string;
};

export const relativeClausesQuestions: RelativeClauseQuestion[] = [
  {
    id: 'rc-woman-doctor',
    sentence: 'The woman who lives next door is a doctor.',
    explanation:
      "We use the relative pronoun 'who' for people. This is a defining relative clause because it provides essential information to identify which woman we mean.",
    rule: "Defining relative clause: 'who' for people (subject function)",
    relativeType: 'defining',
    relativeWord: 'who',
  },
  {
    id: 'rc-book-recommended',
    sentence: 'I found the book that you recommended yesterday.',
    explanation:
      "We use 'that' (or 'which') to refer to things or objects in defining relative clauses. 'That' directly connects the action to the book without commas.",
    rule: "Defining relative clause: 'that' for things or objects",
    relativeType: 'defining',
    relativeWord: 'that',
  },
  {
    id: 'rc-brother-london',
    sentence: 'My brother, who works in London, is visiting us.',
    explanation:
      "This is a non-defining relative clause: it is enclosed by commas because it adds extra information about the brother. In this type of clause, we always use 'who', never 'that'.",
    rule: "Non-defining relative clause (with commas): 'who' for people",
    relativeType: 'non-defining',
    relativeWord: 'who',
  },
  {
    id: 'rc-cafe-first-met',
    sentence: 'This is the café where we first met.',
    explanation:
      "We use the relative adverb 'where' to refer to a place or establishment ('the café') where an event happened or is located.",
    rule: "Relative adverb: 'where' for places",
    relativeType: 'defining',
    relativeWord: 'where',
  },
  {
    id: 'rc-students-projects',
    sentence: 'The students whose projects won are celebrating today.',
    explanation:
      "We use the pronoun 'whose' to express possession or belonging ('the students' projects'). 'Whose' is immediately followed by the possessed noun.",
    rule: "Possessive relative pronoun: 'whose' + noun",
    relativeType: 'defining',
    relativeWord: 'whose',
  },
  {
    id: 'rc-phone-bought-repair',
    sentence: 'The phone which I bought last month already needs repair.',
    explanation:
      "We use the relative pronoun 'which' for things or objects. It specifies exactly which phone we mean.",
    rule: "Defining relative clause: 'which' for things or objects",
    relativeType: 'defining',
    relativeWord: 'which',
  },
  {
    id: 'rc-teacher-languages',
    sentence: 'Our teacher, who speaks three languages, is from Canada.',
    explanation:
      "Non-defining relative clause with commas: the information that she speaks three languages is extra, interesting information and does not define the teacher's basic identity.",
    rule: "Non-defining relative clause (with commas): 'who' for extra information",
    relativeType: 'non-defining',
    relativeWord: 'who',
  },
  {
    id: 'rc-park-children-play',
    sentence: 'That is the park where the children play after school.',
    explanation:
      "We use 'where' to identify the park as the place where the children usually play after school.",
    rule: "Relative adverb: 'where' for places",
    relativeType: 'defining',
    relativeWord: 'where',
  },
];

export function tokenizeSentence(sentence: string) {
  // Supports accented characters (such as in 'café'), apostrophes, and punctuation
  return sentence.match(/[\p{L}]+(?:'[\p{L}]+)?|[,.!?]/gu) ?? [];
}
