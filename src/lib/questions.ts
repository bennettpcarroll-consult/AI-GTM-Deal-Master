import type { FlowQuestion } from '@/components/question-flow';
import type { Lesson } from './curriculum/schema';
import type { RepQuestion } from './skills';

/** A skill rep as a flow question: the buyer line, three replies, and why the strong one works. */
export function repToQuestion(rep: RepQuestion, familyLabel: string): FlowQuestion {
  return {
    id: rep.skill.id,
    kicker: `${rep.skill.code} · ${rep.skill.label} · ${familyLabel}`,
    prompt: rep.prompt,
    speaker: 'The buyer',
    options: rep.options,
    answer: rep.answer,
    why: `${rep.skill.talk_track.move} What counts as proof: ${rep.skill.talk_track.proof.charAt(0).toLowerCase()}${rep.skill.talk_track.proof.slice(1)}.`
  };
}

export function lessonQuizQuestions(lesson: Lesson, clusterName: string): FlowQuestion[] {
  return lesson.quiz.map((item, index) => ({
    id: `quiz-${index}`,
    kicker: `${clusterName} · check ${index + 1} of ${lesson.quiz.length}`,
    prompt: item.prompt,
    options: item.options,
    answer: item.answer,
    why: item.why
  }));
}
