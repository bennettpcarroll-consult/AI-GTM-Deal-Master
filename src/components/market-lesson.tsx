import { Coins, Layers, Lightbulb, Receipt, Swords } from 'lucide-react';
import { FAMILY_COLOR, FAMILY_TINT, LAYER_STYLE } from '@/lib/brand';
import type { Curriculum } from '@/lib/curriculum/load';
import type { Cluster } from '@/lib/curriculum/schema';
import { familyOf } from '@/lib/skills';
import { Glyph, IconTile } from './glyph';

const CARD_ICONS = [Layers, Receipt, Coins, Swords];

/**
 * One market-fundamentals card. Each card pairs its copy with a visual built from the
 * cluster JSON, so the lesson shows where the market sits, what is bought, how the money
 * works and what threatens the deal, instead of a single sentence on an empty screen.
 */
export function MarketLessonCard({ curriculum, cluster, index, eyebrow }: { curriculum: Curriculum; cluster: Cluster; index: number; eyebrow: string }) {
  const card = cluster.lesson.cards[index];
  const style = LAYER_STYLE[cluster.stack_order] ?? LAYER_STYLE[1]!;
  const Icon = CARD_ICONS[index] ?? Lightbulb;
  if (!card) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <IconTile tint={style.tint} color={style.ink}>
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </IconTile>
        <div className="flex flex-col">
          <p className="t-label">{eyebrow}</p>
          <p className="text-[14px] font-semibold" style={{ color: style.ink }}>
            {cluster.display_name}
          </p>
        </div>
      </div>
      <h1 className="t-title">{card.title}</h1>

      {index === 0 && <ValueChain curriculum={curriculum} cluster={cluster} body={card.body} />}

      {index === 1 && (
        <>
          <p className="t-body text-[18px] leading-[1.5]">{card.body}</p>
          <div>
            <p className="t-label mb-2.5">What shows up on the invoice</p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {cluster.pricing_unit.units.map((unit) => (
                <li key={unit} className="flex items-center gap-3 rounded-panel border border-hairline bg-paper p-3.5 sm:flex-col sm:items-start">
                  <IconTile tint={style.tint} color={style.ink} size="sm">
                    <Receipt className="h-4 w-4" strokeWidth={2} />
                  </IconTile>
                  <span className="text-[15px] font-semibold leading-snug">{unit}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Say it once: the card body is the model. The pricing summary already appeared when the learner picked this market. */}
      {index === 2 && (
        <div className="rounded-card p-6" style={{ background: style.tint }}>
          <Coins className="mb-4 h-8 w-8" style={{ color: style.ink }} strokeWidth={1.75} aria-hidden="true" />
          <p className="font-display text-[22px] font-bold leading-[1.3] tracking-[-0.015em]">{card.body}</p>
        </div>
      )}

      {index === 3 && (
        <>
          <ul className="flex flex-col gap-2.5">
            {cluster.core_competitive_threats.map((threat) => (
              <li key={threat} className="flex items-center gap-3 rounded-panel bg-leak-soft p-4">
                <IconTile tint="#ffffff" color="#c92a2a" size="sm">
                  <Swords className="h-4 w-4" strokeWidth={2} />
                </IconTile>
                <span className="text-[15px] font-semibold leading-snug">{threat}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3">
            <p className="t-label">Your edge: the skills that win here</p>
            <ul className="flex flex-col gap-2">
              {cluster.priority_skills.map((id) => {
                const skill = curriculum.skills.find((candidate) => candidate.id === id);
                const familyId = familyOf(curriculum, id);
                const family = curriculum.families.find((candidate) => candidate.id === familyId);
                if (!skill || !family) return null;
                return (
                  <li key={id} className="flex items-center gap-3">
                    <IconTile tint={FAMILY_TINT[familyId] ?? '#f4f5f7'} color={FAMILY_COLOR[familyId] ?? '#5e6672'} size="sm">
                      <Glyph name={family.glyph} className="h-4 w-4" />
                    </IconTile>
                    <span className="t-item">{skill.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function ValueChain({ curriculum, cluster, body }: { curriculum: Curriculum; cluster: Cluster; body: string }) {
  const layers = Object.values(curriculum.clusters).sort((a, b) => b.stack_order - a.stack_order);
  return (
    <>
      <p className="t-body text-[18px] leading-[1.5]">{body}</p>
      <figure className="flex flex-col gap-2" aria-label="The AI value chain">
        <figcaption className="t-label flex justify-between">
          <span>Closer to the customer</span>
        </figcaption>
        <ol className="flex flex-col gap-1.5">
          {layers.map((layer) => {
            const here = layer.id === cluster.id;
            const style = LAYER_STYLE[layer.stack_order] ?? LAYER_STYLE[1]!;
            return (
              <li
                key={layer.id}
                className={`flex items-center gap-3 rounded-panel border-2 px-3 py-2.5 transition ${here ? 'bg-paper shadow-card' : 'border-transparent bg-deep opacity-70'}`}
                style={here ? { borderColor: style.ink } : undefined}
                aria-current={here ? 'true' : undefined}
              >
                <IconTile tint={here ? style.tint : '#ffffff'} color={here ? style.ink : '#5e6672'} size="sm">
                  <Glyph name={layer.glyph} className="h-4 w-4" />
                </IconTile>
                <span className={`flex-1 text-[15px] ${here ? 'font-bold' : 'font-semibold text-slate'}`}>{layer.display_name}</span>
                {here && (
                  <span className="rounded-full px-2.5 py-1 text-[12px] font-bold text-white" style={{ background: style.ink }}>
                    You sell here
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="t-label">Closer to the silicon</p>
      </figure>
      <p className="t-small">
        <span className="font-semibold text-ink">Who plays here:</span> {cluster.archetypal_vendors.join(', ')}
      </p>
    </>
  );
}
