import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEAL_LIMITS } from '../shared/schemas';

/** Asks how many cards each hand gets, and shows who gets them. `onDeal` resolves to true once the server dealt. */
export function DealDialog({ deckSize, hands, onCancel, onDeal }: { deckSize: number; hands: { id: string; name: string; away: boolean }[]; onCancel: () => void; onDeal: (count: number) => Promise<boolean> }) {
  const [count, setCount] = useState(() => Math.max(1, Math.min(5, Math.floor(deckSize / Math.max(1, hands.length)))));
  const [busy, setBusy] = useState(false);
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [busy, onCancel]);
  const clamp = (n: number) => Math.min(DEAL_LIMITS.perHand, Math.max(1, Math.round(n) || 1));
  const needed = count * hands.length;
  async function deal(e: React.FormEvent) { e.preventDefault(); if (busy || !hands.length) return; setBusy(true); if (!(await onDeal(count))) setBusy(false); }
  return createPortal(<div className="dialog-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
    <form className="die-dialog deal-dialog" role="dialog" aria-modal="true" aria-label="Deal cards" onSubmit={deal}>
      <h2>Deal cards</h2>
      {hands.length ? <>
        <div className="die-dialog-row">
          <label htmlFor="deal-count">Cards to each hand</label>
          <div className="deal-stepper"><button type="button" onClick={() => setCount(clamp(count - 1))} aria-label="Fewer cards">−</button>
            <input id="deal-count" type="number" inputMode="numeric" min={1} max={DEAL_LIMITS.perHand} value={count} onChange={(e) => setCount(clamp(Number(e.target.value)))} aria-label="Cards to each hand" autoFocus />
            <button type="button" onClick={() => setCount(clamp(count + 1))} aria-label="More cards">+</button></div>
        </div>
        <p className="deal-to">To {hands.length === 1 ? 'one hand' : `${hands.length} hands`}, one card each per round: {hands.map((h) => `${h.name}${h.away ? ' (away)' : ''}`).join(', ')}.</p>
        {needed > deckSize && <p className="deal-note" role="note">The deck has {deckSize} card{deckSize === 1 ? '' : 's'}: dealing stops when it runs out.</p>}
      </> : <p className="deal-to">There are no hands on the board yet. Each player can add one from <b>Things → My hand</b>.</p>}
      <div className="die-dialog-actions"><button type="button" className="button" onClick={onCancel} disabled={busy}>Cancel</button><button className="button primary" disabled={busy || !hands.length}>{busy ? 'Dealing…' : 'Deal'}</button></div>
    </form>
  </div>, document.body);
}
