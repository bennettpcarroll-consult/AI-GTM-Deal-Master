import type { FlowQuestion } from '@/components/question-flow';
import type { ArcBeat, ArcPillar, Lesson } from './curriculum/schema';
import type { RepQuestion } from './skills';

/** A skill rep as a flow question: the buyer line, three replies, and why the strong one works. */
export function repToQuestion(rep: RepQuestion, familyLabel: string): FlowQuestion {
  return {
    id: rep.skill.id,
    kicker: `${rep.skill.label} · ${familyLabel}`,
    prompt: rep.prompt,
    speaker: 'The buyer',
    options: rep.options,
    answer: rep.answer,
    why: `${rep.skill.talk_track.move} What counts as proof: ${rep.skill.talk_track.proof.charAt(0).toLowerCase()}${rep.skill.talk_track.proof.slice(1)}.`
  };
}

/**
 * The briefing check. The right answer moves to a different slot on each question, from a stable
 * seed, so it is never always first (authors tend to write it first) and a reload keeps the order.
 */
export function lessonQuizQuestions(lesson: Lesson, clusterName: string): FlowQuestion[] {
  return lesson.quiz.map((item, index) => {
    const right = item.options[item.answer]!;
    const others = item.options.filter((_, optionIndex) => optionIndex !== item.answer);
    const slot = (seedHash(clusterName) + index) % item.options.length;
    return {
      id: `quiz-${index}`,
      kicker: clusterName,
      prompt: item.prompt,
      options: [...others.slice(0, slot), right, ...others.slice(slot)],
      answer: slot,
      why: item.why,
      kind: 'fact' as const
    };
  });
}

/** A missed move from the deal room, asked again in daily reps: same buyer line, options reshuffled. */
export function sharpenQuestion(found: { beat: ArcBeat; pillar: ArcPillar; scene: string }, seed: string, lesson?: string): FlowQuestion {
  const { beat, pillar, scene } = found;
  const order = beat.options.map((_, index) => index).sort((a, b) => seedHash(`${seed}:${beat.id}:${a}`) - seedHash(`${seed}:${beat.id}:${b}`));
  const speaker = pillar.cast.find((member) => member.id === beat.speaker);
  return {
    id: `beat:${beat.id}`,
    kicker: `Sharpen · ${scene}`,
    prompt: beat.line,
    speaker: speaker ? `${speaker.name}, ${speaker.role}` : 'The buyer',
    options: order.map((index) => beat.options[index]!.text),
    answer: order.indexOf(beat.options.findIndex((option) => option.kind === 'elite')),
    why: lesson ? `${beat.why} Last time: ${lesson}` : beat.why
  };
}

function seedHash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
