import type { Challenge } from '../types';

export const challenges: Challenge[] = [
  {
    id: 'conditionals',
    title: 'Conditionals',
    description: 'Practice expressing real, possible and hypothetical situations.',
    activity: { kind: 'external', status: 'planned' },
  },
  {
    id: 'relative-clauses',
    title: 'Relative Clauses',
    description: 'Connect ideas and describe people, places and things with precision.',
    activity: { kind: 'external', status: 'planned' },
  },
  {
    id: 'infinitives-gerunds',
    title: 'Infinitives and Gerunds',
    description: 'Identify when to use infinitives and gerunds in everyday sentences.',
    activity: {
      kind: 'embedded',
      status: 'available',
      src: 'https://es.educaplay.com/juego/30653017-infinitives_gerunds_challenge.html',
      title: 'Infinitives and Gerunds Challenge',
    },
  },
  {
    id: 'connectors-cause-reason-purpose',
    title: 'Cause, Reason and Purpose',
    description: 'Use connectors to explain why something happens and what it is for.',
    activity: { kind: 'external', status: 'planned' },
  },
  {
    id: 'question-tags',
    title: 'Question Tags',
    description: 'Build short confirmation questions with the correct auxiliary verbs.',
    activity: { kind: 'external', status: 'planned' },
  },
  {
    id: 'determiners',
    title: 'Determiners',
    description: 'Strengthen your use of articles, quantifiers and other determiners.',
    activity: { kind: 'external', status: 'planned' },
  },
];

export function getChallengeById(id: string) {
  return challenges.find((challenge) => challenge.id === id);
}
