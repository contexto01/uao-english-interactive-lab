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
      "Usamos el pronombre relativo 'who' para referirnos a personas. Esta es una oración relativa explicativa/definitoria (defining relative clause) porque proporciona información indispensable para saber de qué mujer se trata.",
    rule: "Defining relative clause: 'who' para personas (función de sujeto)",
    relativeType: 'defining',
    relativeWord: 'who',
  },
  {
    id: 'rc-book-recommended',
    sentence: 'I found the book that you recommended yesterday.',
    explanation:
      "Usamos 'that' (o 'which') para hacer referencia a cosas u objetos en oraciones relativas definitorias. 'That' conecta directamente la acción con el libro sin necesidad de comas.",
    rule: "Defining relative clause: 'that' para cosas u objetos",
    relativeType: 'defining',
    relativeWord: 'that',
  },
  {
    id: 'rc-brother-london',
    sentence: 'My brother, who works in London, is visiting us.',
    explanation:
      "Esta es una non-defining relative clause: va encerrada entre comas porque aporta información adicional sobre el hermano (ya sabemos de quién se habla). En este tipo de cláusulas siempre usamos 'who' y nunca 'that'.",
    rule: "Non-defining relative clause (con comas): 'who' para personas",
    relativeType: 'non-defining',
    relativeWord: 'who',
  },
  {
    id: 'rc-cafe-first-met',
    sentence: 'This is the café where we first met.',
    explanation:
      "Usamos el adverbio relativo 'where' para referirnos a un lugar o establecimiento ('the café') donde ocurrió o se sitúa un acontecimiento.",
    rule: "Relative adverb: 'where' para lugares",
    relativeType: 'defining',
    relativeWord: 'where',
  },
  {
    id: 'rc-students-projects',
    sentence: 'The students whose projects won are celebrating today.',
    explanation:
      "Usamos el pronombre 'whose' para expresar posesión o pertenencia ('los proyectos de los estudiantes'). 'Whose' va inmediatamente seguido del sustantivo poseído.",
    rule: "Relative pronoun de posesión: 'whose' + sustantivo",
    relativeType: 'defining',
    relativeWord: 'whose',
  },
  {
    id: 'rc-phone-bought-repair',
    sentence: 'The phone which I bought last month already needs repair.',
    explanation:
      "Usamos el pronombre relativo 'which' para cosas u objetos. Especifica con precisión a cuál teléfono se hace referencia.",
    rule: "Defining relative clause: 'which' para cosas u objetos",
    relativeType: 'defining',
    relativeWord: 'which',
  },
  {
    id: 'rc-teacher-languages',
    sentence: 'Our teacher, who speaks three languages, is from Canada.',
    explanation:
      "Non-defining relative clause con comas: la información de que habla tres idiomas es un dato complementario e interesante, no define la identidad básica de la docente.",
    rule: "Non-defining relative clause (con comas): 'who' para información extra",
    relativeType: 'non-defining',
    relativeWord: 'who',
  },
  {
    id: 'rc-park-children-play',
    sentence: 'That is the park where the children play after school.',
    explanation:
      "Usamos 'where' para señalar el parque como la ubicación espacial donde los niños juegan habitualmente después de clase.",
    rule: "Relative adverb: 'where' para lugares",
    relativeType: 'defining',
    relativeWord: 'where',
  },
];

export function tokenizeSentence(sentence: string) {
  // Soporta caracteres acentuados (como en 'café'), apóstrofes y signos de puntuación
  return sentence.match(/[\p{L}]+(?:'[\p{L}]+)?|[,.!?]/gu) ?? [];
}
