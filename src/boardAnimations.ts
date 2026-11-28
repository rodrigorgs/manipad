import { useLayoutEffect, useRef } from 'react';
import Konva from 'konva';
import type { BoardObject } from './shared/types';
import { prefersReducedMotion } from './motion';
import { planAnimations, type Point } from './animationPlan';

/**
 * Animations are only a way of showing a change; the board state never waits for them. After each snapshot is drawn,
 * the previous and the new board are compared and the changed Konva nodes (found by object id) are animated towards
 * where React already put them:
 *
 * - moved by someone else (or by undo): glides from where it was shown, instead of jumping;
 * - drawn from a deck (or dealt): flies out of the deck;
 * - card or deck turned over: opens up from edge-on;
 * - deck shuffled (`shuffleNonce`): shakes;
 * - die rolled: see `DieView` in Board.tsx.
 *
 * Nothing animates on the first snapshot, when the person prefers reduced motion, when many things change at once
 * (opening a board, clearing it, a big undo), or when the board is too heavy to animate smoothly on this device: every
 * animation frame redraws the whole layer, so when one redraw takes longer than `DRAW_BUDGET_MS` the changes just appear.
 * The cost is measured from the board's own redraws (Konva's beforeDraw/draw events), not from the number of objects,
 * so a fast computer keeps animating a crowded table and a slow tablet does not.
 */
export const ANIMATION_MS = { move: 200, draw: 250, flip: 180, shuffle: 300, roll: 300 } as const;
export const DRAW_BUDGET_MS = 10;
/** Recent cost of drawing the board's scene, in ms (a moving average over its redraws). */
let sceneDrawMs = 0;
/** Tests that check what animates (not how fast this machine draws) set `window.__manipadDrawBudgetMs`. */
const drawBudget = () => (window as unknown as { __manipadDrawBudgetMs?: number }).__manipadDrawBudgetMs ?? DRAW_BUDGET_MS;
export const boardTooHeavyToAnimate = () => sceneDrawMs > drawBudget();

/** A short record of what animated, for tests and for debugging (`window.__manipadAnimations`). */
export function logAnimation(kind: string, id: string) {
  const w = window as unknown as { __manipadAnimations?: string[] };
  const log = (w.__manipadAnimations ??= []); log.push(`${kind}:${id}`); if (log.length > 200) log.splice(0, log.length - 200);
}

export function useBoardAnimations(stage: React.RefObject<Konva.Stage | null>, objects: BoardObject[]) {
  const previous = useRef<Map<string, BoardObject> | undefined>(undefined);
  /** Where each node was last shown; a node dragged here ends where it was dropped, so its own move does not replay. */
  const shown = useRef(new Map<string, Point>());
  const running = useRef(new Map<string, Konva.Tween[]>());
  /** Dealt cards waiting on the deck for their turn to fly. */
  const waiting = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  /** Decks this person just drew from by dragging: the card appears under their finger, it does not fly. */
  const localDraws = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const node = stage.current; if (!node) return;
    const remember = (e: Konva.KonvaEventObject<DragEvent>) => { const id = e.target.id(); if (id) shown.current.set(id, { x: e.target.x(), y: e.target.y() }); };
    node.on('dragend.animations', remember);
    let started = 0;
    const layers = node.getLayers();
    for (const layer of layers) {
      layer.on('beforeDraw.animations', () => { started = performance.now(); });
      layer.on('draw.animations', () => { const ms = performance.now() - started; sceneDrawMs = sceneDrawMs ? sceneDrawMs * 0.6 + ms * 0.4 : ms; });
    }
    return () => { node.off('dragend.animations'); for (const layer of layers) layer.off('beforeDraw.animations draw.animations'); };
  }, [stage]);

  useLayoutEffect(() => {
    const before = previous.current, current = new Map(objects.map((o) => [o.id, o]));
    previous.current = current;
    const root = stage.current, where = shown.current;
    const nodes = new Map<string, Konva.Node>();
    for (const layer of root?.getLayers() ?? []) for (const child of layer.getChildren()) { const id = child.id(); if (id) nodes.set(id, child); }
    // Afterwards, remember what each node shows: its target when it is animating, else where it is (a node dragged by this
    // person stays where it was dropped until the server's answer arrives).
    const rememberShown = () => { shown.current = new Map(objects.map((o) => { const node = nodes.get(o.id); return [o.id, running.current.get(o.id)?.length || !node ? { x: o.x, y: o.y } : { x: node.x(), y: node.y() }]; })); };
    if (!before || !root || prefersReducedMotion()) { rememberShown(); return; }

    const now = Date.now(), quiet = new Set([...localDraws.current].filter(([, until]) => until > now).map(([deck]) => deck));
    const plans = planAnimations(before, objects, where, quiet);
    if (!plans.length) { rememberShown(); return; }
    if (boardTooHeavyToAnimate()) { logAnimation('skip-heavy', `${plans.length}@${sceneDrawMs.toFixed(1)}ms`); rememberShown(); return; }

    // Several cards drawn at once (dealing) leave the deck one after another; the whole deal stays under ~0.6 s.
    const draws = plans.filter((p) => p.kind === 'draw').length, stagger = draws > 1 ? Math.min(45, 600 / (draws - 1)) : 0;
    let drawIndex = 0;
    const restarted = new Set<string>();
    for (const plan of plans) {
      const target = nodes.get(plan.id), object = current.get(plan.id);
      if (!target || !object || target.isDragging()) continue;
      // An object can move and turn over in the same change: older animations of it end once, then the new ones start.
      if (!restarted.has(plan.id)) { restarted.add(plan.id); clearTimeout(waiting.current.get(plan.id)); for (const tween of running.current.get(plan.id) ?? []) tween.finish(); running.current.set(plan.id, []); }
      const delay = plan.kind === 'draw' ? drawIndex++ * stagger : 0;
      const tweens: Konva.Tween[] = [];
      if ((plan.kind === 'move' || plan.kind === 'draw') && plan.from) {
        target.position(plan.from);
        tweens.push(new Konva.Tween({ node: target, duration: (plan.kind === 'draw' ? ANIMATION_MS.draw : ANIMATION_MS.move) / 1000, x: object.x, y: object.y, easing: Konva.Easings.EaseOut }));
      } else if (plan.kind === 'flip') {
        target.scaleX(object.scaleX * 0.05);
        tweens.push(new Konva.Tween({ node: target, duration: ANIMATION_MS.flip / 1000, scaleX: object.scaleX, easing: Konva.Easings.EaseOut }));
      } else if (plan.kind === 'shuffle') {
        shake(target, object.rotation);
      }
      for (const tween of tweens) tween.onFinish = () => { running.current.set(plan.id, (running.current.get(plan.id) ?? []).filter((t) => t !== tween)); tween.destroy(); };
      const play = () => { waiting.current.delete(plan.id); for (const tween of tweens) tween.play(); };
      if (delay) waiting.current.set(plan.id, setTimeout(play, delay)); else play();
      running.current.set(plan.id, [...(running.current.get(plan.id) ?? []), ...tweens]);
      logAnimation(plan.kind, plan.id);
    }
    rememberShown();
  }, [objects, stage]);

  return { noteLocalDraw: (deckId: string) => localDraws.current.set(deckId, Date.now() + 1500) };
}

/** A quick side-to-side wobble that ends exactly at `rotation`. */
function shake(node: Konva.Node, rotation: number) {
  const started = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - started) / ANIMATION_MS.shuffle);
    node.rotation(rotation + Math.sin(t * Math.PI * 4) * 7 * (1 - t)); node.getLayer()?.batchDraw();
    if (t < 1) requestAnimationFrame(step); else { node.rotation(rotation); node.getLayer()?.batchDraw(); }
  };
  requestAnimationFrame(step);
}
