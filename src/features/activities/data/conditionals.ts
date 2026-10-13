export type ConditionalQuestion = {
  id: string;
  sentence: string;
  explanation: string;
  rule: string;
};

export const conditionalQuestions: ConditionalQuestion[] = [
  {
    id: 'zero-conditional-heat-ice',
    sentence: 'If you heat ice, it melts.',
    explanation: 'This is a zero conditional: it describes a fact that is generally true.',
    rule: 'If + present simple, present simple',
  },
  {
    id: 'first-conditional-rain',
    sentence: 'If it rains, we will stay indoors tomorrow.',
    explanation: 'This is a first conditional: it describes a possible future situation.',
    rule: 'If + present simple, will + base verb',
  },
  {
    id: 'second-conditional-time',
    sentence: 'If I had more time, I would learn Japanese.',
    explanation: 'This is a second conditional: it describes an imagined or unlikely situation.',
    rule: 'If + past simple, would + base verb',
  },
  {
    id: 'third-conditional-exam',
    sentence: 'If she had studied, she would have passed the exam.',
    explanation: 'This is a third conditional: it imagines a different result in the past.',
    rule: 'If + past perfect, would have + past participle',
  },
  {
    id: 'zero-conditional-colors',
    sentence: 'If you mix yellow and blue, you get green.',
    explanation: 'This is a zero conditional because the result is a general fact.',
    rule: 'If + present simple, present simple',
  },
  {
    id: 'first-conditional-call',
    sentence: 'If he calls me, I will tell him the news.',
    explanation: 'This is a first conditional because the call is a real possibility in the future.',
    rule: 'If + present simple, will + base verb',
  },
  {
    id: 'second-conditional-apologize',
    sentence: 'If I were you, I would apologize.',
    explanation: 'This is a second conditional used to give advice about an imagined situation.',
    rule: 'If + past simple, would + base verb',
  },
  {
    id: 'third-conditional-train',
    sentence: 'If they had left earlier, they would have caught the train.',
    explanation: 'This is a third conditional because it imagines a different past result.',
    rule: 'If + past perfect, would have + past participle',
  },
];

export function tokenizeSentence(sentence: string) {
  return sentence.match(/[A-Za-z]+(?:'[A-Za-z]+)?|[,.!?]/g) ?? [];
}
