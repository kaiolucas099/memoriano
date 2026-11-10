import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { memoryCards } from './data';
import { playVictorySound } from './audio';

const featuredIds = ['andrew', 'paqueta', 'zico', 'junior', 'adriano', 'liberta81', 'mundo81'];
const sizes = { easy: 8, medium: 10, hard: 12 };
const formatTime = (value) => String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

function PlayerVisual({ player, card = false }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const className = card
    ? 'portrait-wrap' + (player.historic ? ' historic' : '')
    : 'squad-photo';
  return (
    <span className={className}>
      {player.image && !failed ? (
        <>
          {!loaded && <span className="image-loading" aria-label={`Carregando imagem de ${player.name}`}>⚽</span>}
          <img
            className={(card ? 'player-photo' : '') + (loaded ? ' image-loaded' : ' image-pending')}
            src={player.image}
            alt={`Foto de ${player.name}`}
            loading="eager"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </>
      ) : (
        <span className={card ? 'portrait-fallback' : 'squad-fallback'}>{player.emoji}</span>
      )}
    </span>
  );
}

export default function App({ user, onLogout }) {
  const [difficulty, setDifficulty] = useState('medium');
  const [deck, setDeck] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [won, setWon] = useState(false);
  const [tip, setTip] = useState('Observe os rostos e os nomes. Memorize as posições para encontrar os pares!');
  const [records, setRecords] = useState({ time: null, moves: null });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('memoriano-sound') !== 'off'; } catch { return true; }
  });
  const [anthemPlaying, setAnthemPlaying] = useState(false);
  const [anthemMatchCount, setAnthemMatchCount] = useState(0);
  const [volume, setVolume] = useState(() => {
    try { const saved = Number(localStorage.getItem('memoriano-volume')); return Number.isFinite(saved) && saved > 0 ? Math.min(1, saved) : 0.55; } catch { return 0.55; }
  });
  const lockTimer = useRef(null);
  const count = sizes[difficulty];
  const pairsFound = matched.length / 2;
  const accuracy = moves ? Math.round((pairsFound / moves) * 100) : 100;
  const progress = Math.round((pairsFound / count) * 100);

  const loadRecords = useCallback((level) => {
    try {
      setRecords(JSON.parse(localStorage.getItem('memoriano-' + level)) || { time: null, moves: null });
    } catch {
      setRecords({ time: null, moves: null });
    }
  }, []);

  const reset = useCallback((level = difficulty) => {
    setAnthemPlaying(false);
    setAnthemMatchCount(0);
    if (lockTimer.current) clearTimeout(lockTimer.current);
    const total = sizes[level];
    const featured = featuredIds.map((id) => memoryCards.find((player) => player.id === id)).filter(Boolean);
    const others = shuffle(memoryCards.filter((player) => !featuredIds.includes(player.id))).slice(0, total - featured.length);
    const selected = shuffle([...featured, ...others]);
    setDeck(shuffle([...selected, ...selected].map((player, index) => ({ ...player, cardId: player.id + '-' + index }))));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setSeconds(0);
    setStarted(false);
    setLocked(false);
    setWon(false);
    setTip('Observe os rostos e os nomes. Memorize as posições para encontrar os pares!');
    loadRecords(level);
  }, [difficulty, loadRecords]);

  useEffect(() => {
    reset('medium');
    return () => {
      if (lockTimer.current) clearTimeout(lockTimer.current);
    };
  }, []); // inicializa uma única partida

  useEffect(() => {
    if (!started || won) return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [started, won]);

  useEffect(() => {
    if (matched.length === count * 2 && count > 0) {
      setWon(true);
      const key = 'memoriano-' + difficulty;
      let best = { time: null, moves: null };
      try { best = JSON.parse(localStorage.getItem(key)) || best; } catch { /* storage indisponível */ }
      if (best.time === null || seconds < best.time) best.time = seconds;
      if (best.moves === null || moves < best.moves) best.moves = moves;
      try { localStorage.setItem(key, JSON.stringify(best)); } catch { /* storage indisponível */ }
      setRecords(best);
    }
  }, [matched, count, difficulty, seconds, moves]);

  useEffect(() => {
    if (won && soundEnabled) playVictorySound(volume);
  }, [won, soundEnabled, volume]);

  const toggleSound = () => {
    setSoundEnabled((enabled) => {
      const next = !enabled;
      try { localStorage.setItem('memoriano-sound', next ? 'on' : 'off'); } catch { /* storage indisponível */ }
      return next;
    });
  };

  const changeVolume = (event) => {
    const next = Number(event.target.value);
    setVolume(next);
    try { localStorage.setItem('memoriano-volume', String(next)); } catch { /* storage indisponível */ }
  };

  const chooseDifficulty = (event) => {
    const level = event.target.value;
    setDifficulty(level);
    reset(level);
  };

  const flipCard = (index) => {
    if (locked || won || flipped.includes(index) || matched.includes(index)) return;
    if (!started) setStarted(true);
    if (flipped.length === 0) {
      setFlipped([index]);
      return;
    }
    const firstIndex = flipped[0];
    setMoves((value) => value + 1);
    setFlipped([firstIndex, index]);
    setLocked(true);
    if (deck[firstIndex].id === deck[index].id) {
      if (soundEnabled) setAnthemMatchCount((value) => value + 1);
      setMatched((value) => [...value, firstIndex, index]);
      setFlipped([]);
      setLocked(false);
    } else {
      lockTimer.current = window.setTimeout(() => {
        setFlipped([]);
        setLocked(false);
      }, 850);
    }
  };

  const giveHint = () => {
    if (locked || won) return;
    const hidden = deck.filter((player, index) => !matched.includes(index) && !flipped.includes(index));
    const sample = shuffle(hidden).slice(0, 4).map((player) => player.name);
    setTip(sample.length
      ? 'Dica: tente localizar estas cartas no tabuleiro: ' + sample.join(' • ') + '. A dica não revela os pares!'
      : 'Você já revelou todas as cartas disponíveis. Continue procurando os pares!');
    if (!started) setStarted(true);
  };

  const gallery = useMemo(() => memoryCards, []);

  return (
    <main className="app">
      <header>
        <div className="brand">
          <div className="logo"><img src="/assets/escudo-rubro-negro.svg" alt="Escudo rubro-negro" /></div>
          <div><h1>memoriano</h1><p>treine sua memória, uma carta por vez</p></div>
        </div>
        <div className="top-tag">⚽ DESAFIO RUBRO-NEGRO</div>
      </header>

      <div className="auth-userbar"><span>Olá, {user?.name}</span><button className="btn" type="button" onClick={onLogout}>Sair</button></div>

      <section className="intro">
        <div className="eyebrow">PAIXÃO • RAÇA • MEMÓRIA</div>
        <h2>Mostre que você conhece o Mengão!</h2>
        <p>Vire as cartas, encontre os pares e entre em campo para vencer.</p>
      </section>

      <div className="layout">
        <section className="game-panel" aria-label="Área do jogo">
          <div className="stats">
            <div className="stat"><span>⏱ TEMPO</span><strong>{formatTime(seconds)}</strong></div>
            <div className="stat"><span>↗ JOGADAS</span><strong>{moves}</strong></div>
            <div className="stat"><span>✦ PARES</span><strong>{pairsFound} <small>/ {count}</small></strong></div>
          </div>

          <div className="board" aria-label="Tabuleiro de cartas">
            {deck.map((player, index) => {
              const isFlipped = flipped.includes(index) || matched.includes(index);
              const isMatched = matched.includes(index);
              return (
                <button
                  className={'card' + (isFlipped ? ' flipped' : '') + (isMatched ? ' matched' : '')}
                  type="button"
                  key={player.cardId}
                  aria-label={isFlipped ? 'Carta ' + player.name : 'Carta fechada'}
                  aria-pressed={isFlipped}
                  disabled={isMatched}
                  onClick={() => flipCard(index)}
                >
                  <span className="card-inner">
                    <span className="face front"><span>CRF</span><small>TOQUE PARA VIRAR</small></span>
                    <span className="face back">
                      <PlayerVisual player={player} card />
                      <span className="shirt-number">{player.number || 'CRF'}</span>
                      <span className="player-caption">{player.name}</span>
                      <small className="player-role">{player.role}</small>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="controls">
            <div className="control-group">
              <button className="btn primary" type="button" onClick={() => reset()}>↻ Reiniciar</button>
              <button className="btn" type="button" onClick={giveHint}>☼ Dica</button>
            </div>
            <label className="difficulty">Dificuldade
              <select className="select" value={difficulty} onChange={chooseDifficulty}>
                <option value="easy">Fácil · 8 pares</option>
                <option value="medium">Médio · 10 pares</option>
                <option value="hard">Difícil · 12 pares</option>
              </select>
            </label>
          </div>
          <div className="sound-controls">
            <button className="btn sound-toggle" type="button" onClick={toggleSound} aria-pressed={soundEnabled}>
              {soundEnabled ? '🔊 Som ligado' : '🔇 Som desligado'}
            </button>
            <label className="volume-control">Volume
              <input aria-label="Volume dos efeitos sonoros" type="range" min="0" max="1" step="0.05" value={volume} onChange={changeVolume} disabled={!soundEnabled} />
            </label>
            <span className="sound-caption">Hino do Flamengo a cada par acertado • vinheta na vitória</span>
          </div>
          {soundEnabled && anthemMatchCount > 0 && (
            <div className="match-anthem" aria-live="polite">
              <strong>❤️🖤 Par encontrado! Tocando o Hino do Flamengo</strong>
              <iframe
                key={anthemMatchCount}
                title={'Hino do Flamengo após ' + anthemMatchCount + ' acerto(s)'}
                src="https://www.youtube-nocookie.com/embed/Sx86-18V3m8?autoplay=1&controls=1&rel=0"
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
              <span>O vídeo reinicia a cada novo par. Se a reprodução automática for bloqueada, aperte play.</span>
            </div>
          )}
        </section>

        <aside className="side-panel">
          <h3>Seu progresso</h3>
          <div className="tip"><b>✧ DICA DE MEMÓRIA</b><p aria-live="polite">{tip}</p></div>
          <div className="records">
            <div className="record"><span>Melhor tempo</span><strong>{records.time == null ? '—' : formatTime(records.time)}</strong></div>
            <div className="record"><span>Menos jogadas</span><strong>{records.moves == null ? '—' : records.moves}</strong></div>
            <div className="record"><span>Precisão</span><strong>{accuracy}%</strong></div>
            <div className="record"><span>Cartas encontradas</span><strong>{progress}%</strong></div>
            <div className="progress"><div style={{ width: progress + '%' }} /></div>
          </div>
          <div className="tip history-tip"><b>🏆 MEMÓRIA RUBRO-NEGRA</b><p>Zico, Júnior e Adriano. Libertadores e Mundial de 1981. Uma história gigante dentro e fora de campo.</p></div>
          <p className="side-note">💡 Uma jogada corresponde a virar duas cartas. O baralho mistura atletas e lendas do clube.</p>
        </aside>
      </div>

      <section className="squad-section" aria-label="Elenco do Flamengo">
        <div className="squad-heading">
          <div><div className="eyebrow">NAÇÃO RUBRO-NEGRA</div><h2>Elenco do Mengão</h2><p>Jogadores e lendas cadastrados. As mesmas fotos aparecem nas cartas e na galeria.</p></div>
          <span className="squad-count">{gallery.length} CARTAS</span>
        </div>
        <div className="squad-gallery">
          {gallery.map((player) => (
            <article className="squad-player" key={player.id}>
              <PlayerVisual player={player} />
              <em>{player.number || 'CRF'}</em>
              <strong>{player.name}</strong>
              <small>{player.role}</small>
            </article>
          ))}
        </div>
        <div className="history-strip"><b>🏆 MEMÓRIA DO CLUBE</b><span>1981 • Mundial e Libertadores</span><span>2019 • Libertadores</span><span>2022 • Libertadores</span><span>2025 • Tetracampeonato da América</span><span>👑 Cartas especiais: Zico, Júnior e Adriano</span></div>
      </section>

      <footer>NAÇÃO RUBRO-NEGRA • Boa partida! ❤️🖤</footer>

      {won && (
        <div className="overlay show" role="dialog" aria-modal="true" aria-labelledby="winTitle">
          <div className="modal">
            <div className="trophy">🏆</div><h2 id="winTitle">Mandou muito bem!</h2>
            <p>Você encontrou todos os pares. Que tal tentar superar seu recorde?</p>
            <div className="modal-stats"><div><strong>{formatTime(seconds)}</strong><span>TEMPO</span></div><div><strong>{moves}</strong><span>JOGADAS</span></div></div>
            <div className="anthem-celebration">
              <p>❤️🖤 A vitória é rubro-negra! Comemore ao som do hino.</p>
              {!anthemPlaying ? (
                <button className="btn anthem-button" type="button" onClick={() => { setAnthemPlaying(true); }}>
                  ▶ Tocar Hino do Flamengo
                </button>
              ) : (
                <div className="anthem-player">
                  <iframe
                    title="Hino do Flamengo no YouTube"
                    src="https://www.youtube-nocookie.com/embed/Sx86-18V3m8?autoplay=1&rel=0"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                  <button className="btn" type="button" onClick={() => setAnthemPlaying(false)}>Parar hino</button>
                </div>
              )}
              <a className="anthem-link" href="https://www.youtube.com/watch?v=Sx86-18V3m8" target="_blank" rel="noreferrer">Abrir vídeo no YouTube</a>
            </div>
            <button className="btn primary" type="button" onClick={() => reset()}>Jogar novamente ↗</button>
          </div>
        </div>
      )}
    </main>
  );
}
