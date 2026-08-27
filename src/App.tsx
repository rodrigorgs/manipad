import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { BoardCommand, BoardObject, ClientToServerEvents, Participant, RoomSnapshot, ServerToClientEvents, Tool } from './shared/types';
import { Board } from './components/Board';

const COLORS = ['#3974e8','#e85c62','#24a47a','#9a62db','#e29332','#188ca5'];
const id = () => crypto.randomUUID();
const profile = () => {
  const saved = localStorage.getItem('manipad-profile'); if (saved) return JSON.parse(saved) as { id:string; name:string; color:string };
  const next = { id: id(), name: '', color: COLORS[Math.floor(Math.random()*COLORS.length)] }; localStorage.setItem('manipad-profile', JSON.stringify(next)); return next;
};

export function App() {
  const roomId = location.pathname.startsWith('/room/') ? decodeURIComponent(location.pathname.slice(6)).toLowerCase() : '';
  return roomId ? <Room roomId={roomId} /> : <Landing />;
}

function Brand({ small = false }: { small?: boolean }) {
  return <div className={`brand ${small ? 'brand--small' : ''}`}><span className="brand-mark"><i/><i/><i/></span><span>ManiPad</span></div>;
}

function Landing() {
  const [joinCode, setJoinCode] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function createRoom() {
    setBusy(true); setError('');
    try { const res = await fetch('/api/rooms', { method: 'POST' }); if (!res.ok) throw new Error(); const data = await res.json(); localStorage.setItem(`manipad-tutor-${data.roomId}`, data.tutorToken); location.href = `/room/${data.roomId}`; }
    catch { setError('Could not create a room. Is the server running?'); setBusy(false); }
  }
  function joinRoom(e: React.FormEvent) { e.preventDefault(); const code = joinCode.trim().toLowerCase().replace(/^.*\/room\//,''); if (code) location.href = `/room/${encodeURIComponent(code)}`; }
  return <main className="landing">
    <nav className="landing-nav"><Brand/><span className="eyebrow">A shared space for curious minds</span></nav>
    <section className="hero">
      <div className="hero-copy"><span className="pill">Made for live tutoring</span><h1>Explain it.<br/><span>Move it.</span> Make it click.</h1><p>A playful shared canvas where ideas become things you can draw, stack, count, shuffle, and explore—together.</p>
        <div className="hero-actions"><button className="button primary" onClick={createRoom} disabled={busy}>{busy ? 'Creating…' : 'Start a new room'} <b>→</b></button><span>No sign-up needed</span></div>{error && <p className="form-error">{error}</p>}
      </div>
      <div className="hero-demo" aria-hidden="true">
        <div className="demo-toolbar"><i>↖</i><i>✎</i><i>□</i></div><div className="demo-note">What is ¾ of 12?</div>
        <div className="fraction-demo"><span/><span/><span/><span className="empty"/></div>
        <div className="counter-demo">{Array.from({length:12},(_,i)=><i className={i>8?'muted':''} key={i}/>)}</div>
        <div className="demo-cursor"><span>Sam</span></div><div className="demo-die">4</div><div className="demo-card">7<span>♥</span></div>
      </div>
    </section>
    <section className="join-strip"><div><strong>Already have a room?</strong><span>Enter the code your tutor shared.</span></div><form onSubmit={joinRoom}><input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="e.g. bright-otter-42" aria-label="Room code"/><button className="button dark">Join room</button></form></section>
    <footer><span>Draw freely</span><span>Math manipulatives</span><span>Cards & dice</span><span>Live together</span></footer>
  </main>;
}

function Room({ roomId }: { roomId:string }) {
  const initial = useMemo(profile, []); const [name,setName] = useState(initial.name); const [draftName,setDraftName] = useState(initial.name); const [snapshot,setSnapshot] = useState<RoomSnapshot>(); const [status,setStatus] = useState<'connecting'|'connected'|'offline'|'error'>('connecting'); const [error,setError] = useState('');
  const [reaction,setReaction] = useState<{emoji:string;name:string;nonce:number}>(); const socketRef = useRef<Socket<ServerToClientEvents,ClientToServerEvents>|undefined>(undefined);
  const tutorToken = localStorage.getItem(`manipad-tutor-${roomId}`) || undefined;
  useEffect(() => {
    if (!name) return;
    const socket: Socket<ServerToClientEvents,ClientToServerEvents> = io({ auth: { roomId, participantId: initial.id, name, color: initial.color, tutorToken, version: 1 } }); socketRef.current = socket;
    socket.on('connect',()=>setStatus('connected')); socket.on('disconnect',()=>setStatus('offline')); socket.on('connect_error',(e)=>{setError(e.message);setStatus('error')}); socket.on('snapshot',setSnapshot); socket.on('presence',(participants)=>setSnapshot(s=>s?{...s,participants}:s));
    socket.on('cursor',({participantId,cursor,selection})=>setSnapshot(s=>s?{...s,participants:s.participants.map(p=>p.id===participantId?{...p,cursor,selection}:p)}:s));
    socket.on('reaction',({participantId,emoji,nonce})=>setSnapshot(s=>{ const p=s?.participants.find(x=>x.id===participantId); setReaction({emoji,name:p?.name||'Someone',nonce}); return s; }));
    socket.on('view:reset',()=>window.dispatchEvent(new Event('manipad-reset-view')));
    socket.on('error',e=>setError(e.message)); return ()=>{socket.disconnect();};
  },[name,roomId]);
  if (!name) return <JoinDialog roomId={roomId} value={draftName} onChange={setDraftName} error={error} onJoin={async()=>{ const clean=draftName.trim(); if(!clean)return; try{const res=await fetch(`/api/rooms/${roomId}`);const data=await res.json();if(!data.exists){setError('That room has expired or does not exist.');return;}}catch{setError('Could not reach the room server.');return;} const next={...initial,name:clean};localStorage.setItem('manipad-profile',JSON.stringify(next));setName(clean);}}/>;
  if (status==='error' && !snapshot) return <JoinDialog roomId={roomId} value={name} onChange={setName} error={error} onJoin={()=>location.reload()}/>;
  const me = snapshot?.participants.find(p=>p.id===initial.id);
  const emit = (command:BoardCommand)=>socketRef.current?.emit('command',command,(result)=>{if(!result.ok)setError(result.message||'Action unavailable');});
  return <div className="room-shell">
    <header className="room-bar"><a href="/" className="room-brand"><Brand small/></a><div className="room-code"><span>ROOM</span><strong>{roomId}</strong><button title="Copy room link" onClick={()=>navigator.clipboard?.writeText(location.href)}>⧉</button></div><div className="room-spacer"/><div className="presence">{snapshot?.participants.slice(0,5).map(p=><span key={p.id} title={`${p.name}${p.isTutor?' · Tutor':''}`} style={{background:p.color}}>{p.name.slice(0,1).toUpperCase()}</span>)}</div><span className={`connection ${status}`}><i/>{status==='connected'?'Live':status}</span></header>
    {snapshot ? <Board snapshot={snapshot} me={me!} emit={emit} sendCursor={(cursor,selection)=>socketRef.current?.volatile.emit('cursor',{cursor,selection})} react={emoji=>socketRef.current?.emit('reaction',emoji)} control={action=>socketRef.current?.emit('control',{action})} onError={setError}/> : <div className="loading"><div className="spinner"/><p>Opening your room…</p></div>}
    {error && <button className="toast error-toast" onClick={()=>setError('')}>{error}<span>×</span></button>}
    {reaction && <div key={reaction.nonce} className="reaction-pop"><b>{reaction.emoji}</b><span>{reaction.name}</span></div>}
  </div>;
}

function JoinDialog({roomId,value,onChange,onJoin,error}:{roomId:string;value:string;onChange:(v:string)=>void;onJoin:()=>void;error:string}) {
  return <main className="join-page"><div className="join-card"><Brand/><div className="room-badge">Room · {roomId}</div><h1>Welcome to the board</h1><p>What should everyone call you?</p><form onSubmit={e=>{e.preventDefault();onJoin();}}><input autoFocus maxLength={28} value={value} onChange={e=>onChange(e.target.value)} placeholder="Your first name" aria-label="Your name"/><button className="button primary">Enter room <b>→</b></button></form>{error&&<p className="form-error">{error}</p>}<a href="/">← Back to ManiPad</a></div></main>;
}
