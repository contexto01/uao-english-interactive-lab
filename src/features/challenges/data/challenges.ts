import type { Challenge } from '../types';

export const challenges: Challenge[] = [
  {
    id: 'conditionals',
    title: 'Conditionals',
    description: 'Practice expressing real, possible and hypothetical situations.',
    activity: { kind: 'internal', status: 'available', gameId: 'conditionals' },
  },
  {
    id: 'relative-clauses',
    title: 'Relative Clauses',
    description: 'Connect ideas and describe people, places and things with precision.',
    activity: { kind: 'internal', status: 'available', gameId: 'relative-clauses' },
  },
  {
    id: 'infinitives-gerunds',
    title: 'Infinitives and Gerunds',
    description: 'Identify when to use infinitives and gerunds in everyday sentences.',
    activity: { kind: 'internal', status: 'available', gameId: 'infinitives-gerunds' },
  },
  {
    id: 'connectors-cause-reason-purpose',
    title: 'Cause, Reason and Purpose',
    description: 'Use connectors to explain why something happens and what it is for.',
    activity: { kind: 'internal', status: 'available', gameId: 'connectors-cause-reason-purpose' },
  },
  {
    id: 'question-tags',
    title: 'Question Tags',
    description: 'Build short confirmation questions with the correct auxiliary verbs.',
    activity: { kind: 'internal', status: 'available', gameId: 'question-tags' },
  },
  {
    id: 'determiners',
    title: 'Determiners',
    description: 'Strengthen your use of articles, quantifiers and other determiners.',
    activity: { kind: 'internal', status: 'available', gameId: 'determiners' },
  },
];

export function getChallengeById(id: string) {
  return challenges.find((challenge) => challenge.id === id);
}
