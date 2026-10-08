import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { User, Swords, Sparkles, DollarSign, Heart, ArrowDown, ArrowUp, RotateCcw, Star, ArrowLeft, Settings, Home, Trash2, Trophy, BookOpen } from "lucide-react";
import { IMG } from "./images.js";

/* =========================================================================
   VINTERMARK — A Peasant's Tale
   Gothic bordeaux swipe-card roleplay game.
   ========================================================================= */

const PAL = {
  bg: "#0b0607", header: "#170b10", card: "#2c1219", text: "#eee2c8",
  gold: "#c9a24a", wine: "#7a1f34", wineDeep: "#4a1220",
  good: "#8aa07c", bad: "#c0453f", cream: "#efe4c4", stone: "#3a3a3a",
};

const STAT_META = {
  folk: { label: "PEOPLE", icon: User },
  haer: { label: "MIGHT", icon: Swords },
  magi: { label: "MAGIC", icon: Sparkles },
  skat: { label: "COIN", icon: DollarSign },
  health: { label: "HEALTH", icon: Heart },
};
const STAT_ORDER = ["folk", "haer", "magi", "skat", "health"];
const clamp = (n) => Math.max(0, Math.min(100, n));

function shade(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + Math.round(2.55 * percent);
  let g = ((num >> 8) & 0x00ff) + Math.round(2.55 * percent);
  let b = (num & 0x0000ff) + Math.round(2.55 * percent);
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

function getRank(turn) {
  if (turn < 5) return "The Child";
  if (turn < 8) return "The Farmhand";
  if (turn < 11) return "Militia Recruit";
  if (turn < 15) return "The Freeman";
  if (turn < 19) return "The Retainer";
  if (turn < 23) return "Sworn Sword";
  if (turn < 27) return "The Claimant";
  if (turn < 45) return "The Steady Hand";
  if (turn < 53) return "The Respected";
  if (turn < 68) return "Greybeard";
  if (turn < 83) return "Elder of Vintermark";
  return "Ancient One";
}

// Health drains a little just from living, and that drain speeds up with age.
// 60 -> drains 20% faster, 61 -> 21% faster, ... 100 -> 60% faster (capped).
function ageHealthDecay(age) {
  if (age < 20) return 0;
  let base = Math.min(3, Math.floor((age - 20) / 15));
  if (age >= 60) {
    const fasterPct = Math.min(60, age - 40);
    base = 3 * (1 + fasterPct / 100);
  }
  return Math.round(base);
}

/* ------------------------------ Characters --------------------------------
   Each has their own starting stat bias, a short bio, and a personality
   sheet — not just a name and a goal. */
const CHARACTERS = [
  {
    id: "robin", name: "Robin", title: "The Farmhand",
    teaser: "Dreams of wearing a crown.",
    goalText: "Rise from farmhand to ruler of Vintermark.",
    bio: "Orphaned young, raised by the whole village rather than any one family. Robin talked his way out of chores more than once — and into people's good graces even more.",
    personality: "Warm, stubborn, a little naive",
    fear: "Being forgotten",
    quirk: "Talks to the farm animals like they understand him",
    strongStat: "People",
    startStats: { folk: 58, haer: 46, magi: 42, skat: 54 },
    destinyFlag: "destined_crown",
    destinyCard: {
      speaker: "Old Soldier at the Tavern", portrait: { archetype: "soldier", tint: "#7a5030" },
      text: "\"The old king's dying — no heir,\" the soldier says. You've never wanted to see the capital more.",
      effects: { folk: 4 },
    },
    goalCheck: (end, st) => !!st.flags.crowned,
  },
  {
    id: "mira", name: "Mira", title: "The Witch's Ward",
    teaser: "Magic already knows her name.",
    goalText: "Become the leader of a coven.",
    bio: "Her mother vanished into the woods one winter and never came back. Mira was taken in by the village but has always felt half a step outside the world everyone else lives in.",
    personality: "Watchful, private, fiercely loyal",
    fear: "Becoming what her mother became",
    quirk: "Collects feathers, convinced each one means something",
    strongStat: "Magic",
    startStats: { folk: 40, haer: 34, magi: 66, skat: 40 },
    destinyFlag: "destined_mage",
    destinyCard: {
      speaker: "A Shape in the Tree Line", portrait: { archetype: "mystic", tint: "#5a3d73" }, sound: "witch",
      text: "Old Ysolde mutters to something unseen in the trees. She catches you watching — and smiles.",
      effects: { magi: 4 },
    },
    goalCheck: (end, st) => !!st.flags.coven_leader,
  },
  {
    id: "torin", name: "Torin", title: "The Smith's Son",
    teaser: "Wants to be feared in battle.",
    goalText: "Track down a dragon and beat it.",
    bio: "Son of the village blacksmith, built like the anvils he grew up around. Torin's spent his whole life being told he's strong. He wants, once, to be told he's feared.",
    personality: "Blunt, proud, loyal to a fault",
    fear: "Dying unremembered, like just another farmhand",
    quirk: "Names every weapon he's ever held",
    strongStat: "Might",
    startStats: { folk: 38, haer: 66, magi: 34, skat: 42 },
    destinyFlag: "destined_warrior",
    destinyCard: {
      speaker: "The Tournament Grounds", portrait: { archetype: "soldier", tint: "#8a2a2a" }, sound: "sword",
      text: "A tournament passes near the village. You watch all day. You've never wanted anything this much.",
      effects: { haer: 4 },
    },
    goalCheck: (end, st) => !!st.flags.dragon_slain,
  },
  {
    id: "wren", name: "Wren", title: "The Trader's Niece",
    teaser: "Started with nothing. Won't stay that way.",
    goalText: "Build a trading company of her own.",
    bio: "Her uncle ran the only trading stall worth trusting in three villages, until the fever took him too. Wren inherited his ledger, his debts, and his instinct for a deal.",
    personality: "Sharp-tongued, practical, secretly generous",
    fear: "Ending up as poor as she started",
    quirk: "Counts everything — steps, coins, days — without meaning to",
    strongStat: "Coin",
    startStats: { folk: 44, haer: 36, magi: 36, skat: 64 },
    destinyFlag: "destined_merchant",
    destinyCard: {
      speaker: "The Market Row", portrait: { archetype: "merchant", tint: "#9a6a2f" }, sound: "coin",
      text: "A trader turns one coin into three before lunch. You understand it instantly.",
      effects: { skat: 4 },
    },
    goalCheck: (end, st) => !!st.flags.guild_master,
  },
];

/* --------------------------- Tutorial (2 cards) ---------------------------
   Clearly labeled as a tutorial, in two parts: how to play, then what the
   story actually is and what you're trying to do. */
const TUTORIAL_CARD = {
  id: "tutorial", tutorial: true, speaker: "Elder Runa — How To Play", portrait: { archetype: "elder", tint: "#cbb98a" },
  text: "This is a short tutorial. Swipe left or right on each card to choose. Watch the five bars above: People, Might, Magic, Coin, Health. If Health runs out, your story ends. If any other bar runs completely empty or completely full, a different, worse fate finds you early.",
  left: { label: "Got it", effects: { folk: 2 } },
  right: { label: "Got it", effects: { haer: 2 } },
};
const TUTORIAL_CARD2 = {
  id: "tutorial2", tutorial: true, speaker: "Elder Runa — The Point of It", portrait: { archetype: "elder", tint: "#cbb98a" },
  text: "You're an orphan. One card is one year of your life. Every choice is remembered — it shapes who you become, and quietly closes some doors while opening others. Your character has one true goal, and reaching it takes a real string of right choices, not luck.",
  left: { label: "I'm ready", effects: { magi: 2 } },
  right: { label: "I'm ready", effects: { skat: 2 } },
};

const CHORES_CARD = {
  speaker: "Elder Runa", portrait: { archetype: "elder", tint: "#cbb98a" },
  text: "Letters, or the fields? Pick how you'll spend your afternoons.",
  left: { label: "Study", effects: { magi: 4 }, trait: "cunning" },
  right: { label: "Work the fields", effects: { haer: 4, health: 2 } },
};

/* ------------------------------ Audio engine -----------------------------
   Melody runs in D Dorian — four short phrases (32 notes total) instead of
   one repeating loop, with varied note lengths and a plucked accompaniment
   under an open-fifth drone, for a more medieval, less repetitive feel. */
function useAudioEngine() {
  const ctxRef = useRef(null);
  const musicTimer = useRef(null);
  const musicNodes = useRef([]);
  const musicStopped = useRef(true);

  const getCtx = () => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  const tone = (freq, dur, type = "square", vol = 0.05, delay = 0, slideTo = null) => {
    const ctx = getCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  };

  const sfx = useMemo(() => ({
    whoosh: (dir) => tone(dir > 0 ? 950 : 320, 0.22, "sawtooth", 0.06, 0, dir > 0 ? 220 : 1050),
    statUp: (i = 0) => tone(620 + i * 12, 0.14, "square", 0.045, i * 0.05, 900),
    statDown: (i = 0) => tone(300 - i * 12, 0.16, "square", 0.045, i * 0.05, 120),
    chime: () => { tone(660, 0.12, "triangle", 0.05, 0); tone(880, 0.16, "triangle", 0.05, 0.1); },
    fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, "square", 0.05, i * 0.13)),
    doom: () => [400, 320, 240, 160].forEach((f, i) => tone(f, 0.3, "sawtooth", 0.05, i * 0.15)),
    star: () => [784, 988, 1319].forEach((f, i) => tone(f, 0.25, "triangle", 0.05, i * 0.1)),
    click: () => tone(500, 0.06, "square", 0.04),
    correct: () => [659.25, 987.77].forEach((f, i) => tone(f, 0.2, "triangle", 0.06, i * 0.1)),
    wrong: () => [220, 164.81].forEach((f, i) => tone(f, 0.28, "sawtooth", 0.05, i * 0.1)),
    goalFanfare: () => {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.32, "triangle", 0.07, i * 0.11));
      [783.99, 987.77, 1174.66].forEach((f) => tone(f, 1.0, "sine", 0.045, 0.46));
    },
    witch: () => {
      const ctx = getCtx(); if (!ctx) return;
      const t0 = ctx.currentTime;
      [660, 792, 990].forEach((f, idx) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, t0);
        osc.frequency.exponentialRampToValueAtTime(f * 0.55, t0 + 1.0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(0.045, t0 + 0.08 + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.0);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0); osc.stop(t0 + 1.05);
      });
    },
    horse: () => {
      const ctx = getCtx(); if (!ctx) return;
      const t0 = ctx.currentTime;
      [0, 0.16].forEach((d) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(140, t0 + d);
        osc.frequency.exponentialRampToValueAtTime(60, t0 + d + 0.09);
        gain.gain.setValueAtTime(0.08, t0 + d);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0 + d); osc.stop(t0 + d + 0.11);
      });
      const tw = t0 + 0.38;
      const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(300, tw);
      osc2.frequency.linearRampToValueAtTime(560, tw + 0.14);
      osc2.frequency.linearRampToValueAtTime(320, tw + 0.36);
      gain2.gain.setValueAtTime(0.045, tw);
      gain2.gain.exponentialRampToValueAtTime(0.0001, tw + 0.4);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(tw); osc2.stop(tw + 0.42);
    },
    dragon: () => {
      const ctx = getCtx(); if (!ctx) return;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(90, t0);
      osc.frequency.linearRampToValueAtTime(60, t0 + 0.5);
      osc.frequency.linearRampToValueAtTime(140, t0 + 0.75);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.07, t0 + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0); osc.stop(t0 + 0.95);
    },
    sword: () => {
      const ctx = getCtx(); if (!ctx) return;
      const t0 = ctx.currentTime;
      [0, 0.09].forEach((d, idx) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(1400 - idx * 200, t0 + d);
        osc.frequency.exponentialRampToValueAtTime(500, t0 + d + 0.12);
        gain.gain.setValueAtTime(0.05, t0 + d);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.13);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0 + d); osc.stop(t0 + d + 0.14);
      });
    },
    coin: () => { [880, 1175, 1568].forEach((f, i) => tone(f, 0.15, "triangle", 0.045, i * 0.07)); },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const MELODY = [
    293.66, 349.23, 392.00, 440.00, 392.00, 349.23, 329.63, 293.66,
    293.66, 329.63, 349.23, 392.00, 440.00, 523.25, 493.88, 440.00,
    440.00, 392.00, 349.23, 293.66, 349.23, 329.63, 293.66, 293.66,
    293.66, 440.00, 587.33, 523.25, 493.88, 440.00, 392.00, 349.23,
  ];
  const DURATIONS = [
    0.40, 0.40, 0.40, 0.55, 0.40, 0.40, 0.40, 0.55,
    0.40, 0.40, 0.40, 0.40, 0.40, 0.55, 0.40, 0.55,
    0.55, 0.40, 0.40, 0.70, 0.40, 0.40, 0.55, 0.70,
    0.30, 0.30, 0.30, 0.30, 0.40, 0.40, 0.40, 0.60,
  ];

  const startMusic = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    musicStopped.current = false;
    const drone = ctx.createOscillator();
    const droneGain = ctx.createGain();
    drone.type = "sine"; drone.frequency.value = 146.83;
    droneGain.gain.value = 0.013;
    drone.connect(droneGain).connect(ctx.destination);
    drone.start();
    const drone2 = ctx.createOscillator();
    const drone2Gain = ctx.createGain();
    drone2.type = "sine"; drone2.frequency.value = 220.0;
    drone2Gain.gain.value = 0.008;
    drone2.connect(drone2Gain).connect(ctx.destination);
    drone2.start();
    musicNodes.current = [drone, drone2];

    let i = 0;
    const playNext = () => {
      if (musicStopped.current) return;
      const ctx2 = getCtx();
      if (!ctx2) return;
      const t0 = ctx2.currentTime;
      const freq = MELODY[i % MELODY.length];
      const dur = DURATIONS[i % DURATIONS.length];
      const osc = ctx2.createOscillator();
      const gain = ctx2.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.032, t0 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ctx2.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
      if (i % 2 === 0) {
        const pOsc = ctx2.createOscillator();
        const pGain = ctx2.createGain();
        pOsc.type = "triangle";
        pOsc.frequency.setValueAtTime(146.83, t0);
        pGain.gain.setValueAtTime(0.02, t0);
        pGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        pOsc.connect(pGain).connect(ctx2.destination);
        pOsc.start(t0); pOsc.stop(t0 + 0.2);
      }
      i++;
      musicTimer.current = setTimeout(playNext, dur * 1000 * 0.92);
    };
    playNext();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopMusic = useCallback(() => {
    musicStopped.current = true;
    if (musicTimer.current) clearTimeout(musicTimer.current);
    musicNodes.current.forEach((n) => { try { n.stop(); } catch (e) {} });
    musicNodes.current = [];
  }, []);

  return { sfx, startMusic, stopMusic };
}

/* ---------------------------- Pixel-art icons ------------------------------ */
const PIXEL_ICONS = {
  dragon: {
    rows: [
      ".k......k.",
      ".kk....kk.",
      "kggggggggk",
      "kggggggggk",
      "kgyggggygk",
      "kg.nn.gggk",
      "kggggggggk",
      ".kggggggk.",
      "..kkkkkk..",
      "..........",
    ],
    palette: { k: "#0d1a0d", g: "#3d7a3d", y: "#e8c250", n: "#12210f" },
  },
  troll: {
    rows: [
      "..........",
      "kttttttttk",
      "kttttttttk",
      "ktyttttytk",
      "kttttttttk",
      "kt.tttt.tk",
      ".ku.tt.uk.",
      "..u....u..",
      "..........",
      "..........",
    ],
    palette: { k: "#161c10", t: "#5f6b4a", y: "#d9b23a", u: "#e9dfc4" },
  },
  horse: {
    rows: [
      ".k......k.",
      ".kk....kk.",
      "khhhhhhhhk",
      "khhhbbhhhk",
      "khyhbbhyhk",
      "khhhbbhhhk",
      "khhhbbhhhk",
      "khh.nn.hhk",
      ".khhhhhhk.",
      "..kkkkkk..",
    ],
    palette: { k: "#2a1a10", h: "#6b4423", b: "#e8d9b8", y: "#1a1410", n: "#1a1410" },
  },
  sprite: {
    rows: [
      "...kk.....",
      "..kccck...",
      ".kccccck..",
      "kffffffffk",
      "kfyffffyfk",
      "kffffffffk",
      ".kgggggk..",
      "..kggggk..",
      "...kkkk...",
      "..........",
    ],
    palette: { k: "#1a120a", c: "#3a2a10", f: "#e8c9a0", y: "#f5e8b8", g: "#4a7a3a" },
  },
  moon: {
    rows: [
      "s...mm...s",
      "..lmmmmm..",
      ".lmmmmmmm.",
      "mmmmmmmmmm",
      "mmmmmmmmmm",
      "mmmmmmmmmm",
      ".mmmmmmmm.",
      "..mmmmmm..",
      "...mmmm...",
      "s........s",
    ].map((r) => r.slice(0, 10)),
    palette: { m: "#c9a24a", l: "#eddca0", s: "#f5efe0" },
  },
  eye: {
    rows: [
      "..k....k..",
      ".kkkkkkkk.",
      "kppppppppk",
      "kp.eeee.pk",
      "kp.eDDe.pk",
      "kp.eeee.pk",
      "kppppppppk",
      ".kkkkkkkk.",
      "..........",
      "..........",
    ],
    palette: { k: "#1a1410", p: "#efe4c4", e: "#8a5fbf", D: "#0a0806" },
  },
  scroll: {
    rows: [
      ".kdddddk..",
      ".kppppppk.",
      "kppppppppk",
      "kp.llll.pk",
      "kp.llll.pk",
      "kp..ss..pk",
      "kppppppppk",
      ".kppppppk.",
      ".kdddddk..",
      "..........",
    ],
    palette: { k: "#2a2016", d: "#5a3a1e", p: "#e8dcc0", l: "#3a2f1c", s: "#8a2a2a" },
  },
  candle: {
    rows: [
      "....y.....",
      "...yyy....",
      "..yYYy....",
      "....o.....",
      ".kwwwwk...",
      ".kwwdwwk..",
      ".kwwwwwk..",
      ".kwwwwwk..",
      ".kkkkkkk..",
      "..........",
    ],
    palette: { y: "#e8842a", Y: "#f5d878", o: "#2a1a10", w: "#efe0c0", d: "#c9a24a", k: "#3a2a10" },
  },
  map: {
    rows: [
      ".kkkkkkkk.",
      "kppppppppk",
      "kp.o....pk",
      "kp..o...pk",
      "kp...x..pk",
      "kppppppppk",
      "kpccccccpk",
      "kppppppppk",
      ".kppppppk.",
      ".kkkkkkk..",
    ],
    palette: { k: "#5a4a2a", p: "#e8dcc0", o: "#8a6a1f", x: "#8a2a2a", c: "#c9b896" },
  },
  swirl: {
    rows: [
      "..kssssk..",
      ".ks....sk.",
      "ks..gg..sk",
      "s..g..g..s",
      "s.g....g.s",
      "s.g....g.s",
      "s..g..g..s",
      "ks..gg..sk",
      ".ks....sk.",
      "..kssssk..",
    ],
    palette: { s: "#8a5fbf", k: "#2a1a3a", g: "#c9a8e8" },
  },
};

function PixelIcon({ type }) {
  const def = PIXEL_ICONS[type];
  if (!def) return null;
  const n = def.rows.length;
  const cell = 20 / n;
  return (
    <>
      {def.rows.map((row, y) => row.split("").map((ch, x) => {
        const color = def.palette[ch];
        if (!color) return null;
        return <rect key={x + "-" + y} x={x * cell} y={y * cell} width={cell + 0.15} height={cell + 0.15} fill={color} />;
      }))}
    </>
  );
}

/* --------------------------- Artifact / inventory icons --------------------------- */
function ArtifactIcon({ type }) {
  const box = { width: "100%", height: "100%", viewBox: "0 0 24 24" };
  if (type === "sword") return (
    <svg {...box}>
      <line x1="4" y1="21" x2="18" y2="7" stroke="#dfe6ea" strokeWidth="3" strokeLinecap="round" />
      <line x1="14" y1="4" x2="20" y2="10" stroke="#dfe6ea" strokeWidth="3" strokeLinecap="round" />
      <line x1="3" y1="16" x2="8" y2="21" stroke="#8a6a1f" strokeWidth="3" strokeLinecap="round" />
      <circle cx="4" cy="21" r="2" fill="#c9a24a" />
    </svg>
  );
  if (type === "grimoire_page") return (
    <svg {...box}>
      <rect x="4" y="3" width="16" height="18" rx="1" fill="#3a2a1a" stroke="#c9a24a" strokeWidth="1" />
      <line x1="7" y1="8" x2="17" y2="8" stroke="#c9a24a" strokeWidth="1" />
      <line x1="7" y1="12" x2="17" y2="12" stroke="#c9a24a" strokeWidth="1" />
      <line x1="7" y1="16" x2="13" y2="16" stroke="#c9a24a" strokeWidth="1" />
    </svg>
  );
  if (type === "warhorse") return (
    <svg {...box}>
      <path d="M6 19 a6 6 0 0 1 12 0" fill="none" stroke="#c9a24a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="6" cy="19" r="1.6" fill="#c9a24a" />
      <circle cx="18" cy="19" r="1.6" fill="#c9a24a" />
    </svg>
  );
  if (type === "dragon_scale") return (
    <svg {...box}>
      <path d="M12 2 C18 8 18 16 12 22 C6 16 6 8 12 2 Z" fill="#3a6b3a" stroke="#e8c250" strokeWidth="1" />
      <path d="M12 6 C15 10 15 14 12 18" fill="none" stroke="#e8c250" strokeWidth="0.8" opacity="0.7" />
    </svg>
  );
  if (type === "trade_ledger") return (
    <svg {...box}>
      <rect x="4" y="4" width="16" height="16" rx="1" fill="#5a3a12" stroke="#e8dcc0" strokeWidth="1" />
      <line x1="7" y1="9" x2="17" y2="9" stroke="#e8dcc0" strokeWidth="1" />
      <line x1="7" y1="13" x2="17" y2="13" stroke="#e8dcc0" strokeWidth="1" />
      <line x1="7" y1="17" x2="13" y2="17" stroke="#e8dcc0" strokeWidth="1" />
    </svg>
  );
  if (type === "ancient_coin") return (
    <svg {...box}>
      <circle cx="12" cy="12" r="9" fill="#c9a24a" stroke="#5a3a12" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="#5a3a12" strokeWidth="1" />
    </svg>
  );
  if (type === "torn_ledger") return (
    <svg {...box}>
      <path d="M4 4 L20 4 L20 13 L16 20 L12 13 L8 20 L4 13 Z" fill="#8a6a1f" stroke="#3a2f1c" strokeWidth="1" />
      <line x1="7" y1="9" x2="17" y2="9" stroke="#3a2f1c" strokeWidth="0.8" />
    </svg>
  );
  return null;
}
const ARTIFACT_LABEL = { sword: "Sword", grimoire_page: "Old Spellbook Page", warhorse: "Warhorse", dragon_scale: "Dragon Scale", trade_ledger: "Trade Ledger", ancient_coin: "Ancient Coin", torn_ledger: "Torn Ledger Page" };

/* ------------------------------- Portraits --------------------------------
   Flat-vector "Reigns" portraits (see IMG at the bottom of the file). Every
   speaker has an image by name; anyone without one falls back to a role image;
   the few non-human extras (troll, sprite, inner voice) keep their pixel icon. */
const SPEAKER_IMG = {"A Dead Man's Coat": "b13", "A Frightened Girl": "c1", "A Masked Figure": "b23", "A Shadow Overhead": "b12", "A Shape in the Tree Line": "b31", "A Small Child": "c3", "A Stranger in Grey": "a33", "A Wanderer": "a65", "A Wild Horse": "b11", "An Old Rival": "a43", "An Older Witch": "b22", "Bard Ansel": "a44", "Bathhouse Keeper": "a34", "Blacksmith Orin": "a41", "Brother Aldwin": "a84", "Captain Draga": "a51", "Captain of the Guard": "a52", "Castellan Rurik": "a14", "Collector Vance": "a74", "Court Jester Pim": "a24", "Debt Collector": "a63", "Eager Youth": "c3", "Elder Runa": "a85", "Farmer Wyck": "a31", "Farmhand Elin": "a53", "Farmhand Joric": "a31", "Guard Bram": "a52", "Hearth Sprite Knurre": "c1", "Hermit Thane": "a33", "Hunter Rolf": "a32", "Lady Isolt": "b42", "Lost Traveler": "b32", "Magistrate Wren": "a45", "Merchant Cass": "a62", "Messenger Aske": "a64", "Neighbor Agna": "a73", "Old Garrick": "a14", "Old Soldier at the Tavern": "b33", "Old Woodsman": "a32", "Old Ysolde": "a35", "Orphan Sela": "c1", "Pickpocket Finn": "a23", "Priestess Elva": "a15", "Ringmaster Voss": "a55", "Rival Edmund": "a11", "Royal Herald": "a43", "Royal Steward": "a55", "Scholar Bess": "a71", "Scout Vell": "b43", "Ser Aldric": "a14", "Shady Piet": "b23", "Steward Corliss": "a64", "Steward Hendrick": "a55", "Tax Collector": "a74", "The Bridge Troll": "c2", "The Chronicler": "a45", "The Coven": "b21", "The Crossroads Beggar": "a73", "The Eldest Witch": "b22", "The King's Doctor": "a13", "The Market Row": "a62", "The Night Watch": "a72", "The Royal Council": "a22", "The Shrine Keeper": "a15", "The Tournament Grounds": "a14", "The Village Healer": "a21", "Tinker Odger": "a82", "Tournament Herald": "a43", "Traveling Healer": "a54", "Vermithrax": "b12", "Village Elders": "a61", "Village Scribe": "a45", "Villager Toma": "a31", "Wanderer Sylvaine": "a54", "Well Keeper Sif": "a75", "Whispering Courtier": "a43", "Widow Mercy": "a61", "Your Grandchild": "c3"};
const ROLE_IMG = {"soldier": "a14", "noble": "a43", "elder": "a85", "mystic": "a35", "rogue": "a23", "merchant": "a62", "steward": "a55", "entertainer": "a24", "commoner": "a31"};
const HERO_IMG = {"robin": "a42", "mira": "a25", "torin": "b33", "wren": "a12"};

function portraitSrc(speaker, archetype, pixel) {
  if (speaker && String(speaker).indexOf("hero:") === 0) return IMG[HERO_IMG[String(speaker).slice(5)]];
  const name = speaker ? String(speaker).split(" \u2014 ")[0] : null;
  const id = (name && SPEAKER_IMG[name]) || (!pixel ? ROLE_IMG[archetype] : null);
  return id ? IMG[id] : null;
}

const imgStyle = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 0%", pointerEvents: "none", userSelect: "none", display: "block" };

function Portrait({ speaker = null, archetype = "commoner", pixel = null, plate = "#241a12", greyed = false }) {
  const src = portraitSrc(speaker, archetype, pixel);
  const content = src ? (
    <img src={src} alt="" draggable={false} style={imgStyle} />
  ) : (
    <div style={{ position: "absolute", inset: 0, background: plate, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="58%" height="58%" viewBox="0 0 20 20" shapeRendering="crispEdges"><PixelIcon type={pixel || "swirl"} /></svg>
    </div>
  );
  if (!greyed) return content;
  return (
    <div style={{ position: "absolute", inset: 0, filter: "grayscale(1) brightness(0.35)", opacity: 0.7 }}>
      {content}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="vm-title" style={{ fontSize: 22, color: "#8a8a8a" }}>?</span>
      </div>
    </div>
  );
}

function CharacterArt({ id }) {
  return <img src={IMG[HERO_IMG[id]]} alt="" draggable={false} style={imgStyle} />;
}

function Logo() {
  return (
    <svg width="108" height="126" viewBox="0 0 120 140">
      <polygon points="60,4 108,24 108,74 60,136 12,74 12,24" fill="#2c1219" stroke={PAL.gold} strokeWidth="3" />
      <polygon points="60,14 100,30 100,70 60,122 20,70 20,30" fill="none" stroke={PAL.wine} strokeWidth="2" />
      <path d="M 26 32 Q 60 12 94 32" stroke={PAL.gold} strokeWidth="1.5" fill="none" opacity="0.55" />
      <text x="60" y="86" textAnchor="middle" fontFamily="'Space Mono', monospace" fontWeight="700" fontSize="50" fill={PAL.gold}>V</text>
      <path d="M 26 108 Q 60 128 94 108" stroke={PAL.gold} strokeWidth="1.5" fill="none" opacity="0.55" />
    </svg>
  );
}

function StatGauge({ Icon, value, danger }) {
  const pct = clamp(value);
  return (
    <div style={{ position: "relative", width: 22, height: 22 }}>
      <Icon size={22} strokeWidth={2} color="rgba(238,226,200,0.16)" style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", clipPath: "inset(" + (100 - pct) + "% 0 0 0)", transition: "clip-path 0.5s ease" }}>
        <Icon size={22} strokeWidth={2} color={danger ? "#e0776f" : PAL.gold} style={{ position: "absolute", inset: 0 }} />
      </div>
    </div>
  );
}

/* --------------------------- Home screen ornamentation --------------------------- */
function CastleBackdrop() {
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" style={{ position: "fixed", left: 0, right: 0, bottom: 0, width: "100%", height: "34vh", zIndex: 0, opacity: 0.6, pointerEvents: "none" }}>
      <rect x="0" y="150" width="400" height="70" fill="#160a0d" />
      <rect x="30" y="96" width="36" height="54" fill="#160a0d" />
      <rect x="26" y="84" width="8" height="14" fill="#160a0d" /><rect x="44" y="84" width="8" height="14" fill="#160a0d" /><rect x="60" y="84" width="8" height="14" fill="#160a0d" />
      <rect x="95" y="66" width="46" height="84" fill="#160a0d" />
      <polygon points="95,66 118,34 141,66" fill="#160a0d" />
      <rect x="116" y="22" width="4" height="16" fill="#160a0d" />
      <polygon points="120,22 120,30 132,26" fill="#2a1216" />
      <rect x="90" y="54" width="8" height="14" fill="#160a0d" /><rect x="106" y="54" width="8" height="14" fill="#160a0d" /><rect x="122" y="54" width="8" height="14" fill="#160a0d" /><rect x="138" y="54" width="8" height="14" fill="#160a0d" />
      <rect x="178" y="106" width="34" height="44" fill="#160a0d" />
      <rect x="174" y="94" width="8" height="14" fill="#160a0d" /><rect x="190" y="94" width="8" height="14" fill="#160a0d" /><rect x="206" y="94" width="8" height="14" fill="#160a0d" />
      <rect x="248" y="78" width="42" height="72" fill="#160a0d" />
      <rect x="244" y="66" width="8" height="14" fill="#160a0d" /><rect x="260" y="66" width="8" height="14" fill="#160a0d" /><rect x="276" y="66" width="8" height="14" fill="#160a0d" /><rect x="286" y="66" width="8" height="14" fill="#160a0d" />
      <rect x="322" y="100" width="34" height="50" fill="#160a0d" />
      <rect x="318" y="88" width="8" height="14" fill="#160a0d" /><rect x="334" y="88" width="8" height="14" fill="#160a0d" /><rect x="350" y="88" width="8" height="14" fill="#160a0d" />
    </svg>
  );
}

function CornerFlourish({ corner }) {
  const pos = {
    tl: { top: 10, left: 10, transform: "rotate(0deg)" },
    tr: { top: 10, right: 10, transform: "rotate(90deg)" },
    br: { bottom: 10, right: 10, transform: "rotate(180deg)" },
    bl: { bottom: 10, left: 10, transform: "rotate(270deg)" },
  }[corner];
  return (
    <svg width="46" height="46" viewBox="0 0 46 46" style={{ position: "fixed", ...pos, zIndex: 2, opacity: 0.5, pointerEvents: "none" }}>
      <path d="M3 3 Q3 24 24 24 Q3 24 3 43" stroke={PAL.gold} strokeWidth="1.2" fill="none" />
      <path d="M3 3 Q17 3 17 17" stroke={PAL.gold} strokeWidth="1" fill="none" opacity="0.7" />
      <circle cx="3" cy="3" r="2.2" fill={PAL.gold} />
    </svg>
  );
}

function Pennant({ flip }) {
  return (
    <svg width="26" height="64" viewBox="0 0 26 64" style={{ opacity: 0.85, transform: flip ? "scaleX(-1)" : undefined }}>
      <line x1="3" y1="0" x2="3" y2="64" stroke="#5a3a12" strokeWidth="2" />
      <polygon points="3,5 25,14 3,24" fill={PAL.wine} stroke={PAL.gold} strokeWidth="1" />
    </svg>
  );
}

/* --------------------------------- Cards --------------------------------
   Every choice either sets a flag/artifact that unlocks something later,
   or builds a reputation (kind / ruthless / cunning) that unlocks its own
   cards. The six "healing" cards near the end show up more when health
   is low. */
const CARDS = [
  { id: "old_farmer", speaker: "Farmer Wyck", portrait: { archetype: "commoner", tint: "#6b4a2f" },
    text: "The harvest failed. Half the village goes hungry unless someone shares.",
    left: { label: "Share your grain", effects: { folk: 12, skat: -10 }, trait: "kind", consequence: { speaker: "Elder Runa", portrait: { archetype: "elder", tint: "#cbb98a" }, text: "The village sleeps easier tonight." } },
    right: { label: "Keep it", effects: { skat: 8, folk: -12 }, trait: "ruthless", consequence: { speaker: "Farmer Wyck", portrait: { archetype: "commoner", tint: "#6b4a2f" }, text: "Wyck's kids go to bed hungry. He won't forget." } } },
  { id: "town_guard", speaker: "Guard Bram", portrait: { archetype: "soldier", tint: "#5a5f66" }, condition: (s) => s.turn >= 4,
    text: "The guard needs more people. Better pay than farm work.",
    left: { label: "Join the guard", effects: { haer: 12, folk: -4, health: -2 }, flag: "militia_recruit" },
    right: { label: "Stay on the farm", effects: { folk: 4, haer: -4 } } },
  { id: "hedge_witch", speaker: "Old Ysolde", portrait: { archetype: "mystic", tint: "#5a3d73" }, sound: "witch",
    text: "\"You've got a gift, kid.\" She holds out a strange drink.",
    left: { label: "Drink it", effects: { magi: 14, folk: -6 }, flag: "met_ysolde", consequence: { speaker: "You", pixel: "swirl", plate: "#2a1a33", text: "The world looks sharper now. Stranger." } },
    right: { label: "Refuse", effects: { magi: -8, folk: 4 }, trait: "cunning" } },
  { id: "market_thief", speaker: "Pickpocket Finn", portrait: { archetype: "rogue", tint: "#3a3530" }, condition: (s) => s.turn >= 5,
    text: "\"Help me rob a few purses? Easy money, split three ways.\"",
    left: { label: "Help him", effects: { skat: 10, folk: -8 }, trait: "ruthless", consequence: { speaker: "You", pixel: "eye", plate: "#241a12", text: "A merchant got a good look at your face." } },
    right: { label: "Turn him in", effects: { folk: 6, skat: -2 }, trait: "kind" } },
  { id: "dragon_shadow", speaker: "A Shadow Overhead", portrait: { pixel: "dragon", plate: "#2a1010" }, sound: "dragon",
    text: "A dragon flies over the fields. The village runs for cover.",
    left: { label: "Hunt it", effects: { haer: -8, folk: 8, health: -4 }, flag: "dragon_hunted" },
    right: { label: "Let it go", effects: { magi: 6, haer: -4 }, flag: "ignored_dragon", consequence: { speaker: "You", pixel: "moon", plate: "#1a1a2e", text: "You dream of fire. Something remembers your face." } } },
  { id: "troll_toll", speaker: "The Bridge Troll", portrait: { pixel: "troll", plate: "#1e2e18" },
    text: "A troll blocks the bridge. Pay up, or find another way.",
    left: { label: "Fight it", effects: { haer: 8, skat: -6, health: -6 }, sound: "sword" },
    right: { label: "Pay the toll", effects: { skat: -8, folk: 6 } } },
  { id: "orphan_girl", speaker: "Orphan Sela", portrait: { archetype: "commoner", tint: "#a68a5b", small: true },
    text: "A fever took her family. Nowhere to go, no one to ask.",
    left: { label: "Take her in", effects: { folk: 10, skat: -4 }, trait: "kind" },
    right: { label: "Send her to the monastery", effects: { magi: 4, folk: -2 } } },
  { id: "elf_trader", speaker: "Wanderer Sylvaine", portrait: { archetype: "commoner", tint: "#3d6b4a", pointedEars: true },
    text: "\"Hunt our woods freely — but never cut an old tree.\"",
    left: { label: "Take the deal", effects: { magi: 8, haer: -4 }, flag: "elf_pact" },
    right: { label: "Turn it down", effects: { haer: 6, magi: -8 } } },
  { id: "debased_coin", speaker: "Tinker Odger", portrait: { archetype: "merchant", tint: "#8a6a1f" }, sound: "coin",
    text: "\"Shave a little metal off every coin. No one checks.\"",
    left: { label: "Do it", effects: { skat: 14, folk: -10 }, trait: "cunning" },
    right: { label: "Keep coins honest", effects: { skat: -8, folk: 6 }, trait: "kind" } },
  { id: "haunted_barn", speaker: "Steward Hendrick", portrait: { archetype: "steward", tint: "#2e3a52" },
    text: "They say the old barn's haunted. Nobody will collect the harvest.",
    left: { label: "Bless it", effects: { magi: -6, folk: 6 } },
    right: { label: "Take it anyway", effects: { skat: 8, folk: -8, health: -4 }, trait: "ruthless" } },
  { id: "fever_spreads", speaker: "Messenger Aske", portrait: { archetype: "commoner", tint: "#7a3030" },
    text: "Sickness is spreading. Should we close the gates?",
    left: { label: "Close the gates", effects: { folk: -8, haer: 6, health: 4 }, flag: "sealed_gates" },
    right: { label: "Leave them open", effects: { folk: 6, skat: -6, health: -3 } } },
  { id: "village_fair", speaker: "Elder Runa", portrait: { archetype: "elder", tint: "#cbb98a" },
    text: "The village wants a fair in your honor — if you'll pay.",
    left: { label: "Pay for it", effects: { folk: 12, skat: -10, health: 2 } },
    right: { label: "Too pricey", effects: { folk: -8, skat: 6 } } },
  { id: "border_spy", speaker: "Scout Vell", portrait: { archetype: "rogue", tint: "#3d4a30" }, condition: (s) => s.turn >= 5,
    text: "Soldiers scouting the border. This could mean war.",
    left: { label: "Take up arms", effects: { haer: 12, skat: -10, health: -3 } },
    right: { label: "Build shelters", effects: { folk: 6, skat: -6 }, trait: "kind" } },
  { id: "shrine_donation", speaker: "The Shrine Keeper", portrait: { archetype: "mystic", tint: "#d8cdb0", halo: true },
    text: "The roadside shrine is falling apart. A few coins would help.",
    left: { label: "Give what you can", effects: { magi: 8, folk: 4, skat: -10 } },
    right: { label: "Not your concern", effects: { skat: 6, magi: -6 } } },
  { id: "house_spirit", speaker: "Hearth Sprite Knurre", portrait: { pixel: "sprite", plate: "#2a2410" },
    text: "\"Leave out food each night. I'll keep bad luck away.\"",
    left: { label: "Leave the bowl out", effects: { skat: -2, folk: 4 }, flag: "nisse_friend" },
    right: { label: "Superstition", effects: { folk: -2 }, trait: "cunning" } },
  { id: "crippled_soldier", speaker: "Old Garrick", portrait: { archetype: "soldier", tint: "#7a5030" }, condition: (s) => s.turn >= 5,
    text: "\"Lost my arm fighting. Nobody remembers my name now.\"",
    left: { label: "Give him work", effects: { skat: -10, haer: 8 }, trait: "kind", consequence: { speaker: "Old Garrick", portrait: { archetype: "soldier", tint: "#7a5030" }, text: "Garrick won't forget this." } },
    right: { label: "Can't help everyone", effects: { haer: -10, folk: -6 } } },
  { id: "black_market", speaker: "Shady Piet", portrait: { archetype: "rogue", tint: "#2a2035" }, condition: (s) => s.turn >= 5,
    text: "\"Goods nobody should ask about. Good prices, though.\"",
    left: { label: "Buy from him", effects: { skat: 12, folk: -8 }, trait: "ruthless" },
    right: { label: "Report him", effects: { folk: 6, skat: -4 }, trait: "kind" } },
  { id: "harvest_festival", speaker: "Elder Runa", portrait: { archetype: "elder", tint: "#cbb98a" },
    text: "Winter's coming hard. Open the food stores, or save them?",
    left: { label: "Open the stores", effects: { folk: 10, skat: -8, health: 2 }, trait: "kind" },
    right: { label: "Save them", effects: { skat: 8, folk: -6 } } },
  { id: "forbidden_book", speaker: "Hermit Thane", portrait: { archetype: "commoner", tint: "#4a3a28", glasses: true },
    text: "\"A banned spellbook. If the priests find out, I'm finished.\"",
    left: { label: "Keep his secret", effects: { magi: 10, folk: -4 }, artifact: "grimoire_page", trait: "cunning", consequence: { speaker: "Hermit Thane", portrait: { archetype: "commoner", tint: "#4a3a28", glasses: true }, text: "He hands you a torn page." } },
    right: { label: "Report him", effects: { magi: -10, folk: 4 }, trait: "ruthless", consequence: { speaker: "The Chronicler", pixel: "scroll", plate: "#3a2f1c", text: "They drag him away at dawn." } } },
  { id: "mercenary_band", speaker: "Captain Draga", portrait: { archetype: "soldier", tint: "#6b1f1f" }, sound: "sword", condition: (s) => s.turn >= 6,
    text: "\"My company fights for whoever pays. You're worth backing.\"",
    left: { label: "Hire them", effects: { haer: 14, skat: -12 } },
    right: { label: "Send them away", effects: { haer: -4 } } },
  { id: "noble_daughter", speaker: "Lady Isolt", portrait: { archetype: "noble", tint: "#8a4a5a", crown: true }, condition: (s) => s.turn >= 10,
    text: "\"Father says marrying a farmhand wouldn't be so scandalous now.\"",
    left: { label: "Marry her", effects: { skat: 14, haer: -6 }, flag: "married", consequence: { speaker: "The Chronicler", pixel: "scroll", plate: "#3a2f1c", text: "You're not just a farmhand anymore." } },
    right: { label: "Go your own way", effects: { folk: 8, skat: -6 }, consequence: { speaker: "Lady Isolt", portrait: { archetype: "noble", tint: "#8a4a5a", crown: true }, text: "Her smile turns cold." } } },
  { id: "poisoned_well", speaker: "Well Keeper Sif", portrait: { archetype: "commoner", tint: "#2e5266" },
    text: "The village well has gone bad. Cursed, people say.",
    left: { label: "Hire a witch", effects: { magi: 8, skat: -6 }, sound: "witch" },
    right: { label: "Dig a new well", effects: { skat: -10, folk: 6 } } },
  { id: "old_beggar", speaker: "The Crossroads Beggar", portrait: { archetype: "commoner", tint: "#5a5548", patch: true },
    text: "\"I used to be somebody. Spare a farmhand a meal?\"",
    left: { label: "Share your food", effects: { folk: 8, health: 1 }, trait: "kind" },
    right: { label: "Move him along", effects: { folk: -8, haer: 2 } } },
  { id: "cattle_raid", speaker: "Farmhand Joric", portrait: { archetype: "commoner", tint: "#6b4a2f" },
    text: "The next village says we stole their cattle. We didn't.",
    left: { label: "Raid them back", effects: { haer: 8, folk: -6, health: -3 }, trait: "ruthless" },
    right: { label: "Pay them off", effects: { folk: 8, skat: -6 } } },
  { id: "plague_doctor", speaker: "Traveling Healer", portrait: { archetype: "commoner", tint: "#1c1c1c", patch: true },
    text: "\"Fresh from the capital — a cure for anything!\" Maybe.",
    left: { label: "Buy it", effects: { skat: -8, folk: 6, health: 3 } },
    right: { label: "Save your coin", effects: { skat: 4, folk: -8 } } },
  { id: "traveling_bard", speaker: "Bard Ansel", portrait: { archetype: "entertainer", tint: "#a05a8a" },
    text: "\"Pay me, and I'll turn your name into a tavern song.\"",
    left: { label: "Pay for the song", effects: { folk: 8, skat: -4 } },
    right: { label: "Save the coin", effects: { skat: 4, folk: -4 } } },
  { id: "wolf_pack", speaker: "Hunter Rolf", portrait: { archetype: "commoner", tint: "#4a3020" },
    text: "Wolves are killing sheep every night. Someone has to hunt them.",
    left: { label: "Hunt them", effects: { haer: 6, skat: -4, health: -3 } },
    right: { label: "Let it be", effects: { magi: 6, folk: -4 } } },
  { id: "tax_collector", speaker: "Collector Vance", portrait: { archetype: "steward", tint: "#4a4a2a" },
    text: "The king's tax doubled. Pay, or he takes your grain.",
    left: { label: "Refuse", effects: { folk: 8, haer: -6 }, trait: "ruthless" },
    right: { label: "Pay it", effects: { skat: -10, folk: -8 } } },
  { id: "knight_challenge", speaker: "Ser Aldric", portrait: { archetype: "soldier", tint: "#5a5f66" }, sound: "sword", condition: (s) => s.turn >= 5,
    text: "\"A farmhand who thinks he's tough? Prove it. Right here.\"",
    left: { label: "Accept", effects: {}, forceNext: "duel_parry" },
    right: { label: "Nothing to prove", effects: { folk: -6, haer: -4 } } },
  { id: "widow_land", speaker: "Widow Mercy", portrait: { archetype: "commoner", tint: "#6a5a48" }, condition: (s) => s.turn >= 6,
    text: "Her husband's brother claims the land. She says it's hers.",
    left: { label: "Side with the widow", effects: { folk: 8, skat: -4 }, trait: "kind" },
    right: { label: "Side with the brother", effects: { skat: 8, folk: -8 } } },
  { id: "traveling_merchant", speaker: "Merchant Cass", portrait: { archetype: "merchant", tint: "#9a6a2f" },
    text: "\"Invest now, I'll pay you back three times over.\"",
    left: { label: "Invest", effects: { skat: -10 }, flag: "merchant_invest" },
    right: { label: "Too risky", effects: { skat: 2 } } },
  { id: "merchant_return", speaker: "Merchant Cass", portrait: { archetype: "merchant", tint: "#9a6a2f" }, sound: "coin",
    condition: (s) => s.flags.merchant_invest && !s.flags.merchant_paid && s.turn >= 8,
    text: "\"Told you I was good for it!\" Three times your coin, as promised.",
    left: { label: "Take the money", effects: { skat: 20 }, flag: "merchant_paid", artifact: "trade_ledger" },
    right: { label: "Take the money", effects: { skat: 20 }, flag: "merchant_paid", artifact: "trade_ledger" } },
  { id: "cursed_forest", speaker: "Old Woodsman", portrait: { archetype: "commoner", tint: "#2e3d22", patch: true },
    text: "\"A grove past the ridge isn't right. I wouldn't go in.\"",
    left: { label: "Go in anyway", effects: { magi: 10, haer: -6, health: -4 }, flag: "forest_seen" },
    right: { label: "Heed the warning", effects: { haer: 2 } } },
  { id: "river_flood", speaker: "Villager Toma", portrait: { archetype: "commoner", tint: "#5a4a38" },
    text: "The river flooded half the fields. Families sleep outside tonight.",
    left: { label: "Help rebuild", effects: { skat: -8, folk: 8 }, trait: "kind" },
    right: { label: "Not your problem", effects: { folk: -8 } } },
  { id: "traveling_monk", speaker: "Brother Aldwin", portrait: { archetype: "mystic", tint: "#3a3a3a", halo: true },
    text: "\"Just a roof and a fire for the night. That's all.\"",
    left: { label: "Let him stay", effects: { magi: 6, folk: 4 } },
    right: { label: "Turn him away", effects: { folk: -6 } } },
  { id: "rival_claimant", speaker: "Rival Edmund", portrait: { archetype: "noble", tint: "#4a2a2a", crown: true }, sound: "sword", condition: (s) => s.turn >= 14,
    text: "\"The farmhand everyone's talking about. I've got a claim too.\"",
    left: { label: "Stand up to him", effects: { haer: 10, folk: -6, health: -3 } },
    right: { label: "Offer a deal", effects: { skat: -10, haer: 4 }, flag: "rival_ally" } },
  { id: "rival_pressure", speaker: "Rival Edmund", portrait: { archetype: "noble", tint: "#4a2a2a", crown: true },
    condition: (s) => s.flags.rival_ally && !s.flags.rival_resolved && s.turn >= 18, once: true,
    text: "\"Our deal needs topping up. Price of my silence.\"",
    left: { label: "Pay him again", effects: { skat: -14 }, flag: "rival_resolved" },
    right: { label: "Cut him off", effects: { haer: -8, folk: 6 }, flag: "rival_resolved" } },
  { id: "execution_request", speaker: "Magistrate Wren", portrait: { archetype: "steward", tint: "#3a3a4a" }, condition: (s) => s.turn >= 6,
    text: "A boy stole bread for his sister. The law says lose a hand.",
    left: { label: "Show mercy", effects: { folk: 8, skat: -4 }, trait: "kind" },
    right: { label: "The law is the law", effects: { haer: 6, folk: -6 }, trait: "ruthless" } },
  { id: "spy_caught", speaker: "Captain of the Guard", portrait: { archetype: "soldier", tint: "#5a5f66" }, condition: (s) => s.turn >= 6,
    text: "Someone's been spying on you. Question them, or watch who they run to.",
    left: { label: "Question them hard", effects: { haer: 6, magi: -4, health: -2 }, trait: "ruthless" },
    right: { label: "Let them go", effects: { folk: 6, haer: -4 }, trait: "cunning" } },
  { id: "royal_summons", speaker: "Royal Herald", portrait: { archetype: "noble", tint: "#d8cdb0", crown: true }, condition: (s) => s.turn >= 16,
    text: "The royal court has heard your name. You're summoned.",
    left: { label: "Go to the capital", effects: { haer: 6, skat: -6 }, flag: "summoned_by_king" },
    right: { label: "Ignore it", effects: { folk: -10, haer: -6 } } },
  { id: "harvest_blessing", speaker: "Priestess Elva", portrait: { archetype: "mystic", tint: "#8a6a9a", halo: true }, sound: "witch",
    text: "A quick blessing over the fields before winter.",
    left: { label: "Join the ritual", effects: { magi: 6, folk: 4, skat: -4 } },
    right: { label: "Skip it", effects: { skat: 4 } } },
  { id: "duel_of_words", speaker: "Court Jester Pim", portrait: { archetype: "entertainer", tint: "#8a3a5a" },
    text: "\"A battle of wits. Lose, and you're the season's joke.\"",
    left: { label: "Take him on", effects: {}, forceNext: "poetry_slam" },
    right: { label: "Not worth it", effects: { skat: 2 } } },
  { id: "lost_traveler", speaker: "Lost Traveler", portrait: { archetype: "commoner", tint: "#7a6a5a", patch: true },
    text: "\"Robbed on the road. Spare a coin, point the way?\"",
    left: { label: "Help him", effects: { folk: 6, skat: -2 }, trait: "kind" },
    right: { label: "Your own problems first", effects: { skat: 2, folk: -4 } } },
  { id: "siege_prep", speaker: "Castellan Rurik", portrait: { archetype: "soldier", tint: "#5a5f66" }, sound: "sword", condition: (s) => s.turn >= 18,
    text: "Ormstad's army is a day away. Fortify, or run.",
    left: { label: "Fortify the walls", effects: { haer: 10, skat: -10, health: -3 } },
    right: { label: "Get people out", effects: { folk: 10, haer: -6 }, trait: "kind" } },
  { id: "coronation_rumor", speaker: "Whispering Courtier", portrait: { archetype: "noble", tint: "#6a5a48" }, condition: (s) => s.turn >= 20,
    text: "People are saying your name next to the crown now.",
    left: { label: "Stay humble", effects: { folk: 6 } },
    right: { label: "Act the part", effects: { haer: 6, skat: -4 } } },
  { id: "wild_horse", speaker: "A Wild Horse", portrait: { pixel: "horse", plate: "#3a2a15" }, sound: "horse",
    text: "A horse bolts loose into your field, wild-eyed.",
    left: { label: "Try to tame it", effects: { haer: 8, magi: 2, health: -2 }, flag: "horse_tamed" },
    right: { label: "Let it run free", effects: { folk: 4 } } },
  { id: "cavalry_gift", speaker: "Ser Aldric", portrait: { archetype: "soldier", tint: "#5a5f66" }, sound: "horse",
    condition: (s) => s.flags.duel_won && !s.flags.horse_gifted && s.turn >= 8, once: true,
    text: "\"You fought well. Take my warhorse — she's a firm hand's only.\"",
    left: { label: "Take the warhorse", effects: { haer: 6, skat: 4 }, flag: "horse_gifted", artifact: "warhorse" },
    right: { label: "Too generous", effects: { folk: 6 }, flag: "horse_gifted" } },
  { id: "moonlit_coven", speaker: "The Coven", portrait: { pixel: "candle", plate: "#2a1a33" }, sound: "witch", condition: (s) => s.turn >= 8,
    text: "Hooded figures gather at the crossroads. One waves you over.",
    left: { label: "Join the circle", effects: { magi: 10, folk: -4 }, flag: "coven_member" },
    right: { label: "Walk past", effects: { haer: 2 } } },
  { id: "dragon_hoard", speaker: "Vermithrax", portrait: { pixel: "dragon", plate: "#2a1010" }, sound: "dragon",
    condition: (s) => s.flags.dragon_ally && !s.flags.hoard_seen && s.turn >= 12, once: true,
    text: "\"We're bound now. Come see centuries of treasure.\"",
    left: { label: "Take one coin", effects: { skat: 14 }, flag: "hoard_seen", artifact: "dragon_scale" },
    right: { label: "Take nothing", effects: { magi: 6 }, flag: "hoard_seen", trait: "kind" } },
  { id: "blacksmith_sword", speaker: "Blacksmith Orin", portrait: { archetype: "merchant", tint: "#4a3a2a" }, sound: "sword",
    text: "Your sword is finished. Feel the weight — worth every coin.",
    left: { label: "Buy the sword", effects: { haer: 10, skat: -8 }, artifact: "sword" },
    right: { label: "Can't afford it", effects: { skat: 2 } } },
  { id: "tournament_melee", speaker: "Tournament Herald", portrait: { archetype: "noble", tint: "#8a2a2a" }, sound: "sword",
    text: "This year's melee is open to commoners — if you dare.",
    left: { label: "Enter the fight", effects: { haer: 10, folk: 4, skat: -4, health: -4 } },
    right: { label: "Just watch", effects: { folk: -2 } } },
  { id: "traveling_circus", speaker: "Ringmaster Voss", portrait: { archetype: "entertainer", tint: "#a05a2a" },
    text: "A traveling show passes through, needing a barn for the night.",
    left: { label: "Let them stay", effects: { folk: 8, skat: -4 } },
    right: { label: "No room", effects: { skat: 2, folk: -2 } } },
  { id: "abandoned_shrine_map", speaker: "A Dead Man's Coat", portrait: { pixel: "map", plate: "#12302c" },
    text: "A map sewn into a dead traveler's coat — to a shrine on no chart.",
    left: { label: "Follow the map", effects: { magi: 2 }, forceNext: "map_investigate" },
    right: { label: "Burn it", effects: { haer: 2 } } },
  { id: "royal_physician", speaker: "The King's Doctor", portrait: { archetype: "commoner", tint: "#2a4a4a", glasses: true },
    text: "Passing through — real medicine, for a price.",
    left: { label: "Pay for it", effects: { folk: 8, skat: -8, health: 4 } },
    right: { label: "Not your problem", effects: { skat: 4 } } },
  { id: "night_watch", speaker: "The Night Watch", portrait: { archetype: "soldier", tint: "#2a2a3a" },
    text: "Someone has to walk the wall after dark.",
    left: { label: "Take the watch", effects: { haer: 6, folk: 4, skat: -2, health: -2 } },
    right: { label: "Pay someone else", effects: { skat: -6, haer: -2 } } },
  { id: "traveling_scholar", speaker: "Scholar Bess", portrait: { archetype: "commoner", tint: "#6a4a8a", glasses: true },
    text: "\"Your story might be worth a page — told straight.\"",
    left: { label: "Tell it straight", effects: { folk: 6 } },
    right: { label: "Embellish it", effects: { folk: 10, magi: -4 }, trait: "cunning" } },
  { id: "meet_elin", speaker: "Farmhand Elin", portrait: { archetype: "commoner", tint: "#a68a5b" }, condition: (s) => s.turn >= 8,
    text: "Elin laughs at something you said. You forget this life for a second.",
    left: { label: "Spend time with her", effects: { folk: 4 }, flag: "courting_elin" },
    right: { label: "Keep your head down", effects: { haer: 2 } } },
  { id: "strange_letter", speaker: "A Stranger in Grey", portrait: { archetype: "rogue", tint: "#3a3a3a" }, condition: (s) => s.turn >= 6, once: true,
    text: "\"Your father's death wasn't the fever.\" A sealed letter changes hands.",
    left: { label: "Open the letter", effects: { magi: 4 }, flag: "mystery_started" },
    right: { label: "Burn it unread", effects: { haer: 2 } } },
  { id: "hot_meal", speaker: "Neighbor Agna", portrait: { archetype: "commoner", tint: "#8a6a4a" }, condition: (s) => s.turn >= 2,
    text: "Agna's got stew going, more than she can finish.",
    left: { label: "Join her", effects: { health: 8, folk: 2 } },
    right: { label: "No time", effects: { skat: 2 } } },
  { id: "rest_day", speaker: "Elder Runa", portrait: { archetype: "elder", tint: "#cbb98a" }, condition: (s) => s.turn >= 2,
    text: "\"You look worn out. Take a day off, before you collapse.\"",
    left: { label: "Rest", effects: { health: 10, skat: -2 } },
    right: { label: "Keep working", effects: { health: -4, skat: 4 } } },
  { id: "village_healer_checkup", speaker: "The Village Healer", portrait: { archetype: "commoner", tint: "#2e5a4a" }, condition: (s) => s.turn >= 2,
    text: "Free check-ups this week. Worth a look.",
    left: { label: "Get checked out", effects: { health: 12 } },
    right: { label: "You feel fine", effects: { health: -2 } } },
  { id: "bathhouse", speaker: "Bathhouse Keeper", portrait: { archetype: "merchant", tint: "#3a5a6a" }, condition: (s) => s.turn >= 3,
    text: "Hot water, clean towels, a little peace. Worth a coin.",
    left: { label: "Take a soak", effects: { health: 8, skat: -3 } },
    right: { label: "Save the coin", effects: { skat: 3 } } },
  { id: "herbal_remedy", speaker: "Old Ysolde", portrait: { archetype: "mystic", tint: "#5a3d73" }, condition: (s) => s.turn >= 3, sound: "witch",
    text: "\"Drink. You'll thank me.\" It smells awful.",
    left: { label: "Drink it", effects: { health: 10, magi: 2 } },
    right: { label: "Decline", effects: { magi: -2 } } },
  { id: "morning_exercise", speaker: "Hunter Rolf", portrait: { archetype: "commoner", tint: "#4a3020" }, condition: (s) => s.turn >= 3,
    text: "\"A hard morning run beats any potion.\"",
    left: { label: "Train with him", effects: { health: 6, haer: 3 } },
    right: { label: "Sleep in", effects: { health: -2 } } },
];
const HEALING_CARD_IDS = ["hot_meal", "rest_day", "village_healer_checkup", "bathhouse", "herbal_remedy", "morning_exercise", "warm_broth", "healer_poultice", "slow_walk", "sunlit_bench", "herbalist_visit", "good_sleep"];

/* --------------------------------- Rare cards -----------------------------
   Each character's life goal now needs TWO correct checkpoints, not one:
   an early commitment, a "prove you've actually prepared" checkpoint (new),
   then the final trial — gated on stats AND on that checkpoint flag. Picking
   the tempting-but-wrong option at the checkpoint doesn't lock you out
   forever; the card just keeps reappearing until you pick correctly. */
const RARE_CARDS = [
  { id: "dragon_offer", speaker: "Vermithrax", portrait: { pixel: "dragon", plate: "#2a1010" }, sound: "dragon",
    text: "\"You spared my flock. Pledge loyalty, and I'll protect you.\"",
    condition: (s) => s.flags.ignored_dragon && !s.flags.dragon_ally && s.turn >= 6,
    left: { label: "Pledge loyalty", effects: { magi: 10, haer: -6 }, flag: "dragon_ally" },
    right: { label: "No crown's worth that", effects: { haer: 8, magi: -6 } } },
  { id: "ysolde_return", speaker: "Old Ysolde", portrait: { archetype: "mystic", tint: "#5a3d73" }, sound: "witch",
    text: "\"Bind yourself to me, and I'll fill your pockets with gold.\"",
    condition: (s) => s.flags.met_ysolde && !s.flags.witch_pact && s.turn >= 7,
    left: { label: "Make the deal", effects: { skat: 12, folk: -8 }, flag: "witch_pact" },
    right: { label: "Too costly", effects: { folk: 6 } } },
  { id: "knurre_gift", speaker: "Hearth Sprite Knurre", portrait: { pixel: "sprite", plate: "#2a2410" }, sound: "coin",
    text: "\"For your kindness — an old coin, forgotten for years.\"",
    condition: (s) => s.flags.nisse_friend && s.turn >= 5, once: true,
    left: { label: "Follow him", effects: { skat: 16, magi: 4 } },
    right: { label: "Let it stay buried", effects: { magi: 6 } } },
  { id: "elf_heir", speaker: "Wanderer Sylvaine", portrait: { archetype: "commoner", tint: "#3d6b4a", pointedEars: true },
    text: "\"An abandoned fae child. Raise her, and our worlds will remember.\"",
    condition: (s) => s.flags.elf_pact && s.turn >= 8, once: true,
    left: { label: "Take her in", effects: { magi: 10, folk: 6 }, flag: "shadow_heir" },
    right: { label: "Not your responsibility", effects: { haer: 4 } } },

  /* ---- Torin: dragon_hunted -> sword -> TRAIN (new) -> dragon_lair -> confront ---- */
  { id: "sword_training", speaker: "Blacksmith Orin", portrait: { archetype: "merchant", tint: "#4a3a2a" }, sound: "sword",
    condition: (s) => s.artifacts.sword && s.flags.dragon_hunted && !s.flags.trained_fighter && s.turn >= 9,
    text: "\"That sword's no good if you don't know how to swing it. Let me show you.\"",
    left: { label: "Train properly", effects: { haer: 8, health: -2 }, flag: "trained_fighter" },
    right: { label: "I know enough already", effects: { haer: 2 } } },
  { id: "dragon_lair", speaker: "Vermithrax", portrait: { pixel: "dragon", plate: "#2a1010" }, sound: "dragon",
    condition: (s) => s.artifacts.sword && s.flags.dragon_hunted && s.flags.trained_fighter && s.haer >= 55 && !s.flags.dragon_ally && !s.flags.dragon_slain && s.turn >= 12,
    text: "You find its lair in the Sortfjeld caves. It wakes, hungry.",
    left: { label: "Draw your sword", effects: {}, forceNext: "dragon_confront" },
    right: { label: "Not ready yet", effects: { haer: -2 } } },

  /* ---- Mira: coven_member -> STUDY (new) -> coven_trial -> ritual test ---- */
  { id: "coven_lore", speaker: "An Older Witch", portrait: { archetype: "mystic", tint: "#6a4a7a" },
    condition: (s) => s.flags.coven_member && !s.flags.knows_the_rite && s.turn >= 10,
    text: "\"Joining the circle isn't enough. Learn the old words, or the rite means nothing.\"",
    left: { label: "Study the old tongue", effects: { magi: 8 }, flag: "knows_the_rite" },
    right: { label: "I'll pick it up as I go", effects: { magi: 2 } } },
  { id: "coven_trial", speaker: "The Coven", portrait: { pixel: "candle", plate: "#2a1a33" }, sound: "witch",
    condition: (s) => s.flags.coven_member && s.flags.knows_the_rite && s.magi >= 55 && !s.flags.coven_leader && s.turn >= 14,
    text: "The elders set a test: recite the old rite under the full moon.",
    left: { label: "Recite it", effects: {}, forceNext: "coven_trial_test" },
    right: { label: "Not ready yet", effects: { magi: -4 } } },

  /* ---- Wren: trade_ledger -> STUDY MARKET (new) -> guild_charter ---- */
  { id: "shrewd_trade", speaker: "Merchant Cass", portrait: { archetype: "merchant", tint: "#9a6a2f" }, sound: "coin",
    condition: (s) => s.artifacts.trade_ledger && !s.flags.savvy_trader && s.turn >= 11,
    text: "\"Anyone can hold coin. Fewer can read a market before it turns.\"",
    left: { label: "Study the market", effects: { skat: 8 }, flag: "savvy_trader" },
    right: { label: "Trust your gut instead", effects: { skat: 2 } } },
  { id: "guild_charter", speaker: "Merchant Cass", portrait: { archetype: "merchant", tint: "#9a6a2f" }, sound: "coin",
    condition: (s) => s.artifacts.trade_ledger && s.flags.savvy_trader && s.skat >= 55 && !s.flags.guild_master && s.turn >= 16,
    text: "\"Start your own company. Put your name on the charter.\"",
    left: { label: "Start the company", effects: { skat: -10 }, flag: "guild_master" },
    right: { label: "Too risky yet", effects: { skat: 6 } } },

  { id: "elin_letter", speaker: "Farmhand Elin", portrait: { archetype: "commoner", tint: "#a68a5b" },
    condition: (s) => s.flags.courting_elin && !s.flags.married && s.turn >= 11, once: true,
    text: "A note: \"Meet me by the mill at sunset.\"",
    left: { label: "Go meet her", effects: { folk: 6 } },
    right: { label: "Too busy", effects: { folk: -4 } } },
  { id: "elin_proposal", speaker: "Farmhand Elin", portrait: { archetype: "commoner", tint: "#a68a5b" },
    condition: (s) => s.flags.courting_elin && !s.flags.married && s.turn >= 14, once: true,
    text: "\"Farmhand or king, I don't care. Marry me?\"",
    left: { label: "Marry her", effects: { folk: 10, health: 3 }, flag: "married" },
    right: { label: "Not ready to settle down", effects: { folk: -6 } } },
  { id: "sword_worthy", speaker: "Blacksmith Orin", portrait: { archetype: "merchant", tint: "#4a3a2a" }, sound: "sword",
    condition: (s) => s.artifacts.sword && s.turn >= 9, once: true,
    text: "\"Still treating you well? I'll sharpen it, fair price.\"",
    left: { label: "Get it sharpened", effects: { haer: 6, skat: -4 } },
    right: { label: "It's sharp enough", effects: { haer: 2 } } },
  { id: "grimoire_insight", speaker: "Hermit Thane", portrait: { archetype: "commoner", tint: "#4a3a28", glasses: true },
    condition: (s) => s.artifacts.grimoire_page && s.magi >= 40 && s.turn >= 9,
    text: "That page you kept isn't a spell — it's a riddle in numbers.",
    left: { label: "Work it out", effects: {}, forceNext: "grimoire_math" },
    right: { label: "Leave it unsolved", effects: { magi: 2 } } },
  { id: "militia_promotion", speaker: "Guard Bram", portrait: { archetype: "soldier", tint: "#5a5f66" }, sound: "sword",
    condition: (s) => s.flags.militia_recruit && !s.flags.soldier && s.turn >= 8, once: true,
    text: "\"You've earned a real spot in the guard, soldier.\"",
    left: { label: "Accept", effects: { haer: 8 }, flag: "soldier" },
    right: { label: "Stay where you are", effects: { folk: 4 } } },
  { id: "captain_promotion", speaker: "Castellan Rurik", portrait: { archetype: "soldier", tint: "#5a5f66" }, sound: "sword",
    condition: (s) => s.flags.soldier && !s.flags.captain && s.turn >= 14, once: true,
    text: "\"The garrison needs a captain. I pick you.\"",
    left: { label: "Accept command", effects: { haer: 10, folk: 4 }, flag: "captain" },
    right: { label: "Not for you", effects: { haer: -4 } } },
  { id: "mystery_clue", speaker: "You", portrait: { archetype: "commoner", tint: "#2a2a2a" },
    condition: (s) => s.flags.mystery_started && !s.flags.mystery_clue_found && s.turn >= 10, once: true,
    text: "A half-burned ledger names a steward — paid the week your father died.",
    left: { label: "Keep the page", effects: { magi: 4 }, flag: "mystery_clue_found", artifact: "torn_ledger" },
    right: { label: "Let it go", effects: { folk: 2 } } },
  { id: "mystery_reveal", speaker: "Steward Corliss", portrait: { archetype: "steward", tint: "#2e2e2e" },
    condition: (s) => s.artifacts.torn_ledger && !s.flags.mystery_resolved && s.turn >= 16, once: true,
    text: "\"Your father's land had good water. Nothing personal.\" He shrugs.",
    left: { label: "Expose him", effects: { folk: 10, haer: 4 }, flag: "mystery_resolved", trait: "kind" },
    right: { label: "Deal with him quietly", effects: { haer: 10, health: -3 }, flag: "mystery_resolved", flag2: "avenged_family", trait: "ruthless" } },

  /* ---- Robin: summoned -> WIN TRUST (new) -> throne_trial -> council ---- */
  { id: "court_intrigue", speaker: "Whispering Courtier", portrait: { archetype: "noble", tint: "#6a5a48" },
    condition: (s) => s.flags.summoned_by_king && !s.flags.court_favor && s.turn >= 17,
    text: "\"The court doesn't crown the strongest hand. It crowns the hand it trusts.\"",
    left: { label: "Win their trust carefully", effects: { folk: 8 }, flag: "court_favor" },
    right: { label: "Impress them with bravado", effects: { folk: 2, haer: 2 } } },
  { id: "throne_trial", speaker: "Royal Herald", portrait: { archetype: "noble", tint: "#d8cdb0", crown: true },
    condition: (s) => s.flags.summoned_by_king && s.flags.court_favor && !s.flags.crowned && s.folk >= 60 && s.haer >= 30 && s.turn >= 20,
    text: "The council wants proof you're worth the crown. This is it.",
    left: { label: "Prove yourself", effects: {}, forceNext: "throne_confront" },
    right: { label: "Too risky", effects: { folk: -6 } } },

  { id: "reputation_kind", speaker: "Elder Runa", portrait: { archetype: "elder", tint: "#cbb98a" },
    condition: (s) => s.traits.kind >= 5 && s.turn >= 10, once: true,
    text: "People noticed how you treat folks. The village wants to honor you.",
    left: { label: "Accept the honor", effects: { folk: 10 }, flag: "known_as_kind" },
    right: { label: "Stay humble", effects: { folk: 4, magi: 2 }, flag: "known_as_kind" } },
  { id: "reputation_ruthless", speaker: "A Masked Figure", portrait: { archetype: "rogue", tint: "#2a2035" },
    condition: (s) => s.traits.ruthless >= 5 && s.turn >= 10, once: true,
    text: "\"Not someone to cross, they say.\" Someone's testing that now.",
    left: { label: "Fight them off", effects: { haer: 10, health: -6 }, flag: "known_as_ruthless" },
    right: { label: "Pay them off", effects: { skat: -10 }, flag: "known_as_ruthless" } },
  { id: "reputation_cunning", speaker: "Merchant Cass", portrait: { archetype: "merchant", tint: "#9a6a2f" },
    condition: (s) => s.traits.cunning >= 5 && s.turn >= 10, once: true,
    text: "\"Sharp mind, they say. I've got a plan that needs one.\"",
    left: { label: "Help with the plan", effects: { skat: 16, health: -2 }, flag: "known_as_cunning" },
    right: { label: "Sounds like trouble", effects: { folk: 4 }, flag: "known_as_cunning" } },
];

/* ------------------------------ Minigames ---------------------------------
   duel_parry, map cards, dragon_confront and throne_confront stay as
   authored two-option moments. poetry_slam, grimoire_math and the coven
   ritual are now REAL puzzles with one actually-correct answer — content
   and left/right placement are both generated fresh each time, so you
   can't just memorize "always swipe left." */
const MINIGAME_CARDS = [
  { id: "duel_parry", hidden: true, speaker: "Ser Aldric", portrait: { archetype: "soldier", tint: "#5a5f66" }, sound: "sword",
    text: "No time to think. Only to react.",
    left: { label: "Block and strike", effects: { haer: 10, health: -3 }, flag: "duel_won" },
    right: { label: "Dodge aside", effects: { haer: 6, magi: 2 } } },
  { id: "map_investigate", hidden: true, speaker: "A Dead Man's Coat", portrait: { pixel: "map", plate: "#12302c" },
    text: "A collapsed shrine. Something glints under the rubble.",
    left: { label: "Dig through it", effects: { magi: 4, health: -2 }, forceNext: "map_treasure" },
    right: { label: "Check the altar", effects: { haer: 2 }, forceNext: "map_treasure" } },
  { id: "map_treasure", hidden: true, speaker: "A Dead Man's Coat", portrait: { pixel: "map", plate: "#12302c" },
    text: "A chest of old coins, untouched for a century.",
    left: { label: "Take it", effects: { skat: 16 }, artifact: "ancient_coin", flag: "map_treasure_found" },
    right: { label: "Take it", effects: { skat: 16 }, artifact: "ancient_coin", flag: "map_treasure_found" } },
  { id: "dragon_confront", hidden: true, speaker: "Vermithrax", portrait: { pixel: "dragon", plate: "#2a1010" }, sound: "dragon",
    text: "Fire and claws, all at once. This is it.",
    left: { label: "Strike for the heart", effects: { haer: 14, health: -12 }, flag: "dragon_slain" },
    right: { label: "Dive for cover", effects: { haer: -14, health: -8 } } },
  { id: "throne_confront", hidden: true, speaker: "The Royal Council", portrait: { archetype: "noble", tint: "#d8cdb0", crown: true },
    text: "The whole council is watching. This decides it.",
    left: { label: "Speak from the heart", effects: { folk: 14 }, flag: "crowned" },
    right: { label: "Boast about your strength", effects: { haer: 6, folk: -6 } } },
];

// Swap left/right 50% of the time for any hidden minigame card, so the
// winning side is never a memorizable position.
function shuffleLR(cardObj) {
  if (Math.random() < 0.5) return cardObj;
  return { ...cardObj, left: cardObj.right, right: cardObj.left };
}

// Real rhyme puzzle: only one of the two closing words actually rhymes.
function buildPoetryPuzzle() {
  const pool = [
    { setup: "Her hair was gold, her eyes were bright, she danced alone into the", correct: "night", wrong: "farm" },
    { setup: "The dragon's wings cut through the sky, no man alive has flown so", correct: "high", wrong: "slow" },
    { setup: "A beggar's purse is thin and bare, he counts his coins with silent", correct: "care", wrong: "pride" },
    { setup: "The soldiers march with swords held tight, prepared to give their final", correct: "fight", wrong: "song" },
    { setup: "The old king died without a son, the crown now waits for anyone", correct: "bold", wrong: "fed" },
    { setup: "The river rose and took the mill, the miller's debts are standing", correct: "still", wrong: "paid" },
  ];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const base = {
    id: "poetry_slam", hidden: true, speaker: "Court Jester Pim", portrait: { archetype: "entertainer", tint: "#8a3a5a" },
    text: "Pim challenges you to finish the verse: \"" + pick.setup + " ___\"",
    left: { label: pick.correct, effects: { folk: 10 }, trait: "cunning" },
    right: { label: pick.wrong, effects: { folk: -6 } },
  };
  return shuffleLR(base);
}

// Real arithmetic puzzle, numbers rolled fresh each time.
function buildMathPuzzle() {
  const a = 2 + Math.floor(Math.random() * 7);
  const b = 2 + Math.floor(Math.random() * 7);
  const product = a * b;
  const off = 1 + Math.floor(Math.random() * 4);
  const wrong = Math.random() < 0.5 ? product + off : Math.max(1, product - off);
  const base = {
    id: "grimoire_math", hidden: true, speaker: "Hermit Thane", portrait: { archetype: "commoner", tint: "#4a3a28", glasses: true },
    text: "The margin reads: \"" + a + " ravens, each carrying " + b + " coins. The total?\"",
    left: { label: String(product), effects: { magi: 10, folk: 2 } },
    right: { label: String(wrong), effects: { magi: -8 } },
  };
  return shuffleLR(base);
}

// Real "pick the authentic ritual phrase" puzzle for the coven trial.
function buildRitualPuzzle() {
  const pool = [
    { correct: "Ash to root, root to flame", wrong: "Root to ash, flame to sky" },
    { correct: "By moon's old debt, the circle holds", wrong: "By sun's new light, the circle breaks" },
    { correct: "What the wood remembers, the blood repeats", wrong: "What the blood forgets, the wood forgives" },
    { correct: "Three knots bind what one alone cannot", wrong: "One knot frees what three cannot hold" },
  ];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const base = {
    id: "coven_trial_test", hidden: true, speaker: "The Coven", portrait: { pixel: "candle", plate: "#2a1a33" }, sound: "witch",
    text: "Two half-remembered lines surface. Only one is the true rite.",
    left: { label: pick.correct, effects: { magi: 12 }, flag: "coven_leader" },
    right: { label: pick.wrong, effects: { magi: -10 } },
  };
  return shuffleLR(base);
}


/* ------------------------- Part B: new chain steps -------------------------
   Steps 3-5 of every life-goal chain that needed more rungs. These belong to
   one character's chain only (ownerOnly) and are handed out by the scheduler. */
const ELDER = { archetype: "elder", tint: "#cbb98a" };
const NEW_CHAIN_CARDS = [
  { id: "dragon_tracks", ownerOnly: true, speaker: "Hunter Rolf", portrait: { archetype: "commoner", tint: "#4a3020" }, sound: "dragon",
    text: "Burnt trees. Huge claw marks. Rolf says the dragon still lives.",
    left: { label: "Follow the tracks", effects: { haer: 6, health: -3 }, flag: "dragon_tracked", consequence: { speaker: "You", pixel: "dragon", plate: "#2a1010", text: "The trail leads north, toward the Sortfjeld." } },
    right: { label: "Stay home", effects: { health: 2 } } },
  { id: "dragon_climb", ownerOnly: true, speaker: "Hunter Rolf", portrait: { archetype: "commoner", tint: "#4a3020" },
    text: "It sleeps high in the Sortfjeld. The climb kills the unfit.",
    left: { label: "Prepare for the climb", effects: { haer: 4, health: 4 }, flag: "climb_ready", consequence: { speaker: "Hunter Rolf", portrait: { archetype: "commoner", tint: "#4a3020" }, text: "Your legs burn. Your breath is steady. You're ready." } },
    right: { label: "Go as I am", effects: { haer: -2, health: -4 } } },
  { id: "coven_vigil", ownerOnly: true, speaker: "The Coven", portrait: { pixel: "candle", plate: "#2a1a33" }, sound: "witch",
    text: "Three nights at the standing stones, no sleep. The coven watches.",
    left: { label: "Keep the vigil", effects: { magi: 8, health: -4 }, flag: "kept_vigil", consequence: { speaker: "The Coven", portrait: { pixel: "candle", plate: "#2a1a33" }, text: "At dawn, the elders nod. You stayed." } },
    right: { label: "Go home to bed", effects: { health: 4 } } },
  { id: "coven_apprentice", ownerOnly: true, speaker: "A Frightened Girl", portrait: { archetype: "commoner", tint: "#7a5a4a", small: true },
    text: "\"Teach me? The village says I'm cursed.\"",
    left: { label: "Take her on", effects: { folk: 4, magi: 4 }, flag: "has_apprentice", consequence: { speaker: "You", pixel: "swirl", plate: "#2a1a33", text: "She learns fast. The coven notices who taught her." } },
    right: { label: "Not my problem", effects: { magi: 2 } } },
  { id: "coven_heir", ownerOnly: true, speaker: "The Eldest Witch", portrait: { archetype: "mystic", tint: "#6a4a7a" }, sound: "witch",
    text: "\"I am dying. The coven needs someone to carry it.\"",
    left: { label: "I will carry it", effects: { magi: 6, folk: 2 }, flag: "coven_heir", consequence: { speaker: "The Eldest Witch", portrait: { archetype: "mystic", tint: "#6a4a7a" }, text: "She smiles. \"When the time comes, you'll be ready.\"" } },
    right: { label: "Not me", effects: { magi: -2 } } },
  { id: "trade_route", ownerOnly: true, speaker: "Merchant Cass", portrait: { archetype: "merchant", tint: "#9a6a2f" }, sound: "coin",
    text: "\"A new road opens east. Fund your own wagons?\"",
    left: { label: "Fund two wagons", effects: { skat: -12, folk: 4 }, flag: "trade_route_open", consequence: { speaker: "Merchant Cass", portrait: { archetype: "merchant", tint: "#9a6a2f" }, text: "The wagons roll east. Your name rolls with them." } },
    right: { label: "Play it safe", effects: { skat: 4 } } },
  { id: "guild_partner", ownerOnly: true, speaker: "Merchant Cass", portrait: { archetype: "merchant", tint: "#9a6a2f" }, sound: "coin",
    text: "\"A rival house offers a deal. Join them, or fight them?\"",
    left: { label: "Partner up", effects: { skat: 6, folk: 4 }, flag: "has_partner", consequence: { speaker: "You", pixel: "scroll", plate: "#3a2f1c", text: "Two houses, one seal. Your charter is close." } },
    right: { label: "Go alone", effects: { skat: 2, folk: -4 } } },
  { id: "court_service", ownerOnly: true, speaker: "Royal Steward", portrait: { archetype: "steward", tint: "#2e2e2e" },
    text: "\"Two lords fight over a border. The king wants it settled fairly.\"",
    left: { label: "Settle it fairly", effects: { folk: 8 }, flag: "border_settled", consequence: { speaker: "Royal Steward", portrait: { archetype: "steward", tint: "#2e2e2e" }, text: "Both lords grumble. Both lords obey. The court takes note." } },
    right: { label: "Favor the rich lord", effects: { skat: 8, folk: -8 } } },
  { id: "king_fails", ownerOnly: true, speaker: "Whispering Courtier", portrait: { archetype: "noble", tint: "#6a5a48" },
    text: "\"The king is failing. The court splits in two. Pick a side?\"",
    left: { label: "Stay loyal to the king", effects: { folk: 6 }, flag: "loyal_to_king", consequence: { speaker: "Whispering Courtier", portrait: { archetype: "noble", tint: "#6a5a48" }, text: "\"Loyal, in this court? Rare. People will remember.\"" } },
    right: { label: "Pick a side early", effects: { haer: 6, folk: -6 } } },
  { id: "people_petition", ownerOnly: true, speaker: "Village Elders", portrait: { archetype: "elder", tint: "#cbb98a" },
    text: "\"The people beg you to speak for them before the council.\"",
    left: { label: "Speak for them", effects: { folk: 10 }, flag: "peoples_voice", consequence: { speaker: "Village Elders", portrait: { archetype: "elder", tint: "#cbb98a" }, text: "The whole hall hears you. So does the whole kingdom." } },
    right: { label: "Stay out of it", effects: { folk: -6 } } },
];

/* --------------------- Part B: late-life filler cards ----------------------
   So a 70-year life never runs dry. Ages 55+, plain words, both sides matter. */
const ELDER_CARDS = [
  { id: "old_friend_funeral", ageMin: 55, speaker: "Elder Runa", portrait: ELDER,
    text: "An old friend has died. The burial is far, the road is cold.",
    left: { label: "Go to the burial", effects: { folk: 8, health: -4 }, flag: "mourned_friend" },
    right: { label: "Stay home", effects: { health: 3, folk: -4 } } },
  { id: "grandchild_visit", ageMin: 58, speaker: "A Small Child", portrait: { archetype: "commoner", tint: "#8a6a4a", small: true },
    text: "A child climbs onto your knee. \"Tell me a story?\"",
    left: { label: "Tell a story", effects: { folk: 6, magi: 3 }, flag: "has_grandchild" },
    right: { label: "Send them off", effects: { folk: -4 } } },
  { id: "grandchild_grown", ageMin: 66, once: true, condition: (s) => s.flags.has_grandchild, speaker: "Your Grandchild", portrait: { archetype: "commoner", tint: "#8a6a4a" },
    text: "The child is grown now. They ask for your blessing.",
    left: { label: "Give it gladly", effects: { folk: 8, health: 4 } },
    right: { label: "Tell them to earn it", effects: { haer: 3, folk: -3 } } },
  { id: "legacy_letter", ageMin: 60, speaker: "Village Scribe", portrait: { archetype: "steward", tint: "#4a3a28", glasses: true },
    text: "\"Shall I write down your life? For the ones who come after.\"",
    left: { label: "Write it down", effects: { magi: 5, skat: -3 }, flag: "memoir_written" },
    right: { label: "Let it fade", effects: { skat: 2 } } },
  { id: "memoir_reader", ageMin: 62, once: true, condition: (s) => s.flags.memoir_written, speaker: "Village Scribe", portrait: { archetype: "steward", tint: "#4a3a28", glasses: true },
    text: "Someone read your story aloud in the square. People wept.",
    left: { label: "Listen quietly", effects: { folk: 10 } },
    right: { label: "Slip away", effects: { folk: 4, magi: 2 } } },
  { id: "old_debt_collector", ageMin: 55, speaker: "Debt Collector", portrait: { archetype: "rogue", tint: "#3a3530" },
    text: "An old debt, long forgotten. He has not forgotten it.",
    left: { label: "Pay it", effects: { skat: -8, folk: 4 } },
    right: { label: "Refuse", effects: { skat: 4, folk: -6 } } },
  { id: "young_apprentice_asks", ageMin: 56, speaker: "Eager Youth", portrait: { archetype: "commoner", tint: "#5a6a3a", small: true },
    text: "\"You've done so much. Teach me what you know?\"",
    left: { label: "Teach them", effects: { folk: 6, skat: -2 }, flag: "taught_apprentice", trait: "kind" },
    right: { label: "Too old for it", effects: { health: 2 } } },
  { id: "apprentice_returns", ageMin: 64, once: true, condition: (s) => s.flags.taught_apprentice, speaker: "Eager Youth", portrait: { archetype: "commoner", tint: "#5a6a3a" },
    text: "Your old student is back, doing well. They bring a gift.",
    left: { label: "Accept it", effects: { skat: 8, folk: 4 } },
    right: { label: "Refuse, proudly", effects: { folk: 6 } } },
  { id: "harvest_feast_elder", ageMin: 55, speaker: "Neighbor Agna", portrait: { archetype: "commoner", tint: "#8a6a4a" },
    text: "The village feast. They saved the head seat for you.",
    left: { label: "Take the seat", effects: { folk: 8, health: 3 } },
    right: { label: "Stay home", effects: { health: -2 } } },
  { id: "bad_winter", ageMin: 55, speaker: "Hunter Rolf", portrait: { archetype: "commoner", tint: "#4a3020" },
    text: "A brutal winter. Rolf's family is out of firewood.",
    left: { label: "Share yours", effects: { folk: 8, skat: -6 }, trait: "kind" },
    right: { label: "Keep it", effects: { skat: 5, folk: -8 }, trait: "ruthless" } },
  { id: "tax_collector_old", ageMin: 55, speaker: "Tax Collector", portrait: { archetype: "steward", tint: "#3a3a3a" },
    text: "\"The crown wants more this year.\" He doesn't look happy either.",
    left: { label: "Pay quietly", effects: { skat: -7 } },
    right: { label: "Argue it out", effects: { haer: -3, health: -3, folk: 3 } } },
  { id: "sell_the_farm", ageMin: 58, speaker: "Merchant Cass", portrait: { archetype: "merchant", tint: "#9a6a2f" },
    text: "\"Good price for your land. Your knees would thank you.\"",
    left: { label: "Sell", effects: { skat: 12, folk: -6 } },
    right: { label: "Keep it", effects: { folk: 4, skat: -3 } } },
  { id: "stone_memorial", ageMin: 60, speaker: "Elder Runa", portrait: ELDER,
    text: "The village wants a memorial for those lost. They ask for coin.",
    left: { label: "Give coin", effects: { folk: 8, skat: -6 } },
    right: { label: "Not this time", effects: { skat: 3, folk: -4 } } },
  { id: "bandits_again", ageMin: 55, speaker: "Guard Bram", portrait: { archetype: "soldier", tint: "#5a5f66" }, sound: "sword",
    text: "Bandits on the road again. They want your purse.",
    left: { label: "Fight them off", effects: { haer: 5, health: -6 } },
    right: { label: "Hand it over", effects: { skat: -7 } } },
  { id: "old_rival_visit", ageMin: 60, speaker: "An Old Rival", portrait: { archetype: "noble", tint: "#5a4a40" },
    text: "A grey-haired face at your door. The one you fought for years.",
    left: { label: "Let them in", effects: { folk: 6, health: 2 }, flag: "forgave_rival" },
    right: { label: "Shut the door", effects: { haer: 3, folk: -3 } } },
  { id: "rival_gift", ageMin: 66, once: true, condition: (s) => s.flags.forgave_rival, speaker: "An Old Rival", portrait: { archetype: "noble", tint: "#5a4a40" },
    text: "Your old rival left something on your step. A peace offering.",
    left: { label: "Keep it", effects: { skat: 8, folk: 3 } },
    right: { label: "Return it, kindly", effects: { folk: 7 } } },
  { id: "wise_hermit", ageMin: 58, speaker: "Hermit Thane", portrait: { archetype: "commoner", tint: "#4a3a28", glasses: true },
    text: "A hermit offers one piece of advice for free.",
    left: { label: "Listen", effects: { magi: 6 } },
    right: { label: "Mock him", effects: { haer: 2, folk: -3 }, trait: "cunning" } },
  { id: "last_journey", ageMin: 62, speaker: "A Wanderer", portrait: { archetype: "commoner", tint: "#3d6b4a" },
    text: "A wanderer is headed to the coast. \"Come along, once more.\"",
    left: { label: "Join them", effects: { folk: 6, health: -5, magi: 3 } },
    right: { label: "Stay by the fire", effects: { health: 4 } } },
  { id: "old_dog", ageMin: 56, speaker: "Neighbor Agna", portrait: { archetype: "commoner", tint: "#8a6a4a" },
    text: "A stray old dog follows you home. It looks tired too.",
    left: { label: "Keep the dog", effects: { folk: 4, health: 5 } },
    right: { label: "Shoo it away", effects: { folk: -3 } } },
  { id: "lullaby_night", ageMin: 58, speaker: "A Small Child", portrait: { archetype: "commoner", tint: "#8a6a4a", small: true },
    text: "A little one can't sleep. The whole house is waiting on you.",
    left: { label: "Sing to them", effects: { health: 5, folk: 4 } },
    right: { label: "Pass them along", effects: { health: -2 } } },
];

/* Six more ways to look after yourself once you're past forty. */
const ELDER_HEALING_CARDS = [
  { id: "warm_broth", ageMin: 40, speaker: "Neighbor Agna", portrait: { archetype: "commoner", tint: "#8a6a4a" },
    text: "Agna drops off warm broth. \"You're too thin.\"",
    left: { label: "Eat it all", effects: { health: 10, folk: 2 } },
    right: { label: "Work through it", effects: { health: -3, skat: 3 } } },
  { id: "healer_poultice", ageMin: 40, speaker: "The Village Healer", portrait: { archetype: "commoner", tint: "#2e5a4a" },
    text: "\"Your back again? Let me put a poultice on it.\"",
    left: { label: "Let her", effects: { health: 12, skat: -2 } },
    right: { label: "Tough it out", effects: { health: -3, haer: 2 } } },
  { id: "slow_walk", ageMin: 40, speaker: "Hunter Rolf", portrait: { archetype: "commoner", tint: "#4a3020" },
    text: "\"A slow walk by the river. Nothing more.\"",
    left: { label: "Go along", effects: { health: 9, folk: 2 } },
    right: { label: "Too busy", effects: { skat: 3, health: -2 } } },
  { id: "sunlit_bench", ageMin: 40, speaker: "Elder Runa", portrait: ELDER,
    text: "A warm day. A bench in the sun. Runa pats the seat.",
    left: { label: "Sit with her", effects: { health: 8, folk: 3 } },
    right: { label: "Keep moving", effects: { health: -2 } } },
  { id: "herbalist_visit", ageMin: 40, speaker: "Old Ysolde", portrait: { archetype: "mystic", tint: "#5a3d73" }, sound: "witch",
    text: "\"Chew this root. Don't ask what it is.\"",
    left: { label: "Chew it", effects: { health: 12, magi: 2 } },
    right: { label: "No thanks", effects: { magi: -2 } } },
  { id: "good_sleep", ageMin: 40, speaker: "Bathhouse Keeper", portrait: { archetype: "merchant", tint: "#3a5a6a" },
    text: "A quiet room, a soft bed, one coin. Sleep is cheap today.",
    left: { label: "Pay and sleep", effects: { health: 11, skat: -3 } },
    right: { label: "Save the coin", effects: { skat: 3, health: -2 } } },
];

const ALL_CARDS = [...CARDS, ...RARE_CARDS, ...MINIGAME_CARDS, ...NEW_CHAIN_CARDS, ...ELDER_CARDS, ...ELDER_HEALING_CARDS];

/* ---------------------------- NPC registry -------------------------------- */
function buildNpcRegistry() {
  const seen = {};
  const list = [];
  [...CARDS, ...RARE_CARDS, ...NEW_CHAIN_CARDS, ...ELDER_CARDS, ...ELDER_HEALING_CARDS].forEach((c) => {
    if (!c.speaker || c.speaker === "You" || seen[c.speaker]) return;
    seen[c.speaker] = true;
    list.push({ name: c.speaker, portrait: c.portrait });
  });
  return list;
}
const NPC_REGISTRY = buildNpcRegistry();

/* ------------------------------ Achievements ------------------------------ */
const ACHIEVEMENTS = [
  { id: "met_dragon", title: "Here Be Dragons", desc: "You ran into Vermithrax, the last dragon around.", icon: "\u{1F409}", check: (s) => s.flags.ignored_dragon || s.flags.dragon_hunted || s.flags.dragon_ally },
  { id: "dragon_slain", title: "Dragonslayer", desc: "You beat a dragon in a fight.", icon: "\u2694", check: (s) => s.flags.dragon_slain },
  { id: "dragon_ally", title: "Rider of the Wind", desc: "You teamed up with a dragon instead of fighting it.", icon: "\u{1F432}", check: (s) => s.flags.dragon_ally },
  { id: "witch_pact", title: "Moonlight Bargain", desc: "You made a deal with Old Ysolde.", icon: "\u{1F9D9}", check: (s) => s.flags.witch_pact },
  { id: "coven_member", title: "The Circle", desc: "You joined a coven under the full moon.", icon: "\u{1F56F}", check: (s) => s.flags.coven_member },
  { id: "coven_leader", title: "Head of the Coven", desc: "You became the leader of a coven.", icon: "\u{1F52E}", check: (s) => s.flags.coven_leader },
  { id: "nisse_friend", title: "Little Guardian", desc: "You made friends with a hearth sprite.", icon: "\u{1F3A9}", check: (s) => s.flags.nisse_friend },
  { id: "shadow_heir", title: "Between Worlds", desc: "You raised a fae-blooded child as your own.", icon: "\u{1F343}", check: (s) => s.flags.shadow_heir },
  { id: "married", title: "For Better or Worse", desc: "You got married, for love or for gain.", icon: "\u{1F48D}", check: (s) => s.flags.married },
  { id: "guild_master", title: "Guild Master", desc: "You started your own trading company.", icon: "\u{1F3DB}", check: (s) => s.flags.guild_master },
  { id: "map_treasure_found", title: "X Marks The Spot", desc: "You followed a dead man's map to buried treasure.", icon: "\u{1F5FA}", check: (s) => s.flags.map_treasure_found },
  { id: "horse_gifted", title: "Bonded Steed", desc: "You tamed or were given a horse of your own.", icon: "\u{1F434}", check: (s) => s.flags.horse_gifted || s.flags.horse_tamed },
  { id: "rival_resolved", title: "Old Rivalries", desc: "You settled things with a rival, one way or another.", icon: "\u{1F3AD}", check: (s) => s.flags.rival_resolved },
  { id: "crowned", title: "The Crown", desc: "You rose from nothing to rule Vintermark.", icon: "\u{1F451}", check: (s) => s.flags.crowned },
  { id: "soldier", title: "Sworn to Service", desc: "You earned a real spot in the guard.", icon: "\u{1F6E1}", check: (s) => s.flags.soldier },
  { id: "captain", title: "Captain of the Guard", desc: "You rose to command the whole garrison.", icon: "\u2694", check: (s) => s.flags.captain },
  { id: "avenged_family", title: "Truth and Blood", desc: "You learned the truth about your father's death, and did something about it.", icon: "\u{1F5E1}", check: (s) => s.flags.avenged_family },
  { id: "known_as_kind", title: "A Good Name", desc: "Your kindness became something people talk about.", icon: "\u2764", check: (s) => s.flags.known_as_kind },
  { id: "known_as_ruthless", title: "Feared", desc: "People learned not to cross you.", icon: "\u{1F5E1}", check: (s) => s.flags.known_as_ruthless },
  { id: "known_as_cunning", title: "Sharp Mind", desc: "People noticed how clever you are.", icon: "\u{1F9E0}", check: (s) => s.flags.known_as_cunning },
  { id: "trained_fighter", title: "Properly Trained", desc: "You learned to actually use that sword.", icon: "\u{1F930}", check: (s) => s.flags.trained_fighter },
  { id: "knows_the_rite", title: "Old Words", desc: "You learned the coven's old tongue.", icon: "\u{1F4D6}", check: (s) => s.flags.knows_the_rite },
  { id: "savvy_trader", title: "Reads the Market", desc: "You learned to read a market before it turns.", icon: "\u{1F4C8}", check: (s) => s.flags.savvy_trader },
  { id: "court_favor", title: "Trusted Hand", desc: "You won the court's trust, not just its attention.", icon: "\u{1F91D}", check: (s) => s.flags.court_favor },
];

/* -------------------------------- Endings --------------------------------
   The story truly ends when health hits 0 — the only ending that closes the
   book on its own. The other four bars still kill you if they run dry or
   overflow, each with its own twist. Reaching your life goal never ends
   things by itself — it's remembered at whichever ending you get. */
function resolveEnding(state, name, characterId) {
  const folk = state.folk, haer = state.haer, magi = state.magi, skat = state.skat, health = state.health, flags = state.flags;
  const n = name || "the farmhand";

  if (folk <= 0) return { title: "CAST OUT", emoji: "\u{1F525}", good: false, text: n + "'s own village turns on them. They leave with nothing but the boots they started with." };
  if (folk >= 100) return { title: "LOVED TO DEATH", emoji: "\u{1F494}", good: false, text: "Everyone wants to be " + n + "'s favorite. One of them decides that if they can't, nobody will." };
  if (haer <= 0) return { title: "CUT DOWN", emoji: "\u{1F480}", good: false, text: n + " is killed on a quiet road. The village barely notices." };
  if (haer >= 100) {
    if (flags.rival_ally && flags.rival_resolved) return { title: "THE POWER BEHIND THE THRONE", emoji: "\u{1F3AD}", secret: true, good: true, text: "Edmund wears the crown. Everyone knows whose muscle keeps it there." };
    return { title: "THE WARLORD", emoji: "\u{1FA93}", good: false, text: n + " ruled by force, not love — and the soldiers who put them there take it back." };
  }
  if (magi <= 0) return { title: "THE UNSEEING", emoji: "\u{1F33E}", good: false, text: n + " stopped believing in anything unseen. Real danger came, and they never saw it coming." };
  if (magi >= 100) {
    if (flags.dragon_ally && flags.witch_pact) return { title: "THE SHADOW SOVEREIGN", emoji: "\u{1F311}", secret: true, good: true, text: "A dragon's fire and a witch's magic behind them — Vintermark kneels to a legend." };
    if (flags.shadow_heir) return { title: "THE FAE-BLESSED REGENT", emoji: "\u{1F343}", secret: true, good: true, text: "The child " + n + " raised grows up bridging two worlds." };
    return { title: "BEYOND THE VEIL", emoji: "\u2728", good: false, text: n + " went too deep into magic. One night, they don't come back." };
  }
  if (skat <= 0) return { title: "BROKE", emoji: "\u26B0", good: false, text: n + " dies owing more than they ever owned." };
  if (skat >= 100) return { title: "THE HOARDER", emoji: "\u{1FA99}", good: false, text: "Envy finds a knife, one quiet night among the gold." };

  if (health <= 0) return { title: "THE LONG REST", emoji: "\u{1F56F}", good: true, old: true, text: "Age catches up at last. " + n + " goes out on their own terms." };

  return null;
}

/* ====================== Part B: THE LONG ROAD (pacing) ======================
   Life goals are six steps, roughly a decade apart. The ORDER of everything is
   random; the steps just can't come before their minimum age, can't come
   closer than 8 years apart, and a declined step must cool off for years. */
const SOFT_HI = 80, SOFT_LO = 20;   // soft walls (see advance)
const CHAIN_MIN_GAP = 8;        // turns (= years) after the last completed step
const CHAIN_SPACING = 4;        // never two chain cards within this many turns
const CHAINS = {
  torin: [
    { cardId: "dragon_shadow", minAge: 18, requires: () => true, done: (s) => !!s.flags.dragon_hunted },
    { cardId: "blacksmith_sword", minAge: 28, requires: (s) => !!s.flags.dragon_hunted, done: (s) => !!s.artifacts.sword },
    { cardId: "sword_training", minAge: 38, requires: (s) => !!s.artifacts.sword, done: (s) => !!s.flags.trained_fighter },
    { cardId: "dragon_tracks", minAge: 48, requires: (s) => !!s.flags.trained_fighter, done: (s) => !!s.flags.dragon_tracked },
    { cardId: "dragon_climb", minAge: 58, requires: (s) => !!s.flags.dragon_tracked, done: (s) => !!s.flags.climb_ready },
    { cardId: "dragon_lair", finaleId: "dragon_confront", final: true, minAge: 68, gates: [["haer", 50]],
      requires: (s) => !!s.flags.climb_ready && !s.flags.dragon_ally, done: (s) => !!s.flags.dragon_slain },
  ],
  mira: [
    { cardId: "moonlit_coven", minAge: 18, requires: () => true, done: (s) => !!s.flags.coven_member },
    { cardId: "coven_lore", minAge: 28, requires: (s) => !!s.flags.coven_member, done: (s) => !!s.flags.knows_the_rite },
    { cardId: "coven_vigil", minAge: 38, requires: (s) => !!s.flags.knows_the_rite, done: (s) => !!s.flags.kept_vigil },
    { cardId: "coven_apprentice", minAge: 48, requires: (s) => !!s.flags.kept_vigil, done: (s) => !!s.flags.has_apprentice },
    { cardId: "coven_heir", minAge: 58, requires: (s) => !!s.flags.has_apprentice, done: (s) => !!s.flags.coven_heir },
    { cardId: "coven_trial", finaleId: "coven_trial_test", final: true, minAge: 68, gates: [["magi", 50]],
      requires: (s) => !!s.flags.coven_heir, done: (s) => !!s.flags.coven_leader },
  ],
  wren: [
    { cardId: "traveling_merchant", minAge: 18, requires: () => true, done: (s) => !!s.flags.merchant_invest },
    { cardId: "merchant_return", minAge: 28, requires: (s) => !!s.flags.merchant_invest && !s.flags.merchant_paid, done: (s) => !!s.artifacts.trade_ledger },
    { cardId: "shrewd_trade", minAge: 38, requires: (s) => !!s.artifacts.trade_ledger, done: (s) => !!s.flags.savvy_trader },
    { cardId: "trade_route", minAge: 48, requires: (s) => !!s.flags.savvy_trader, done: (s) => !!s.flags.trade_route_open },
    { cardId: "guild_partner", minAge: 58, requires: (s) => !!s.flags.trade_route_open, done: (s) => !!s.flags.has_partner },
    { cardId: "guild_charter", final: true, minAge: 68, gates: [["skat", 50]],
      requires: (s) => !!s.flags.has_partner, done: (s) => !!s.flags.guild_master },
  ],
  robin: [
    { cardId: "royal_summons", minAge: 18, requires: () => true, done: (s) => !!s.flags.summoned_by_king },
    { cardId: "court_intrigue", minAge: 28, requires: (s) => !!s.flags.summoned_by_king, done: (s) => !!s.flags.court_favor },
    { cardId: "court_service", minAge: 38, requires: (s) => !!s.flags.court_favor, done: (s) => !!s.flags.border_settled },
    { cardId: "king_fails", minAge: 48, requires: (s) => !!s.flags.border_settled, done: (s) => !!s.flags.loyal_to_king },
    { cardId: "people_petition", minAge: 58, requires: (s) => !!s.flags.loyal_to_king, done: (s) => !!s.flags.peoples_voice },
    { cardId: "throne_trial", finaleId: "throne_confront", final: true, minAge: 68, gates: [["folk", 55], ["haer", 30]],
      requires: (s) => !!s.flags.peoples_voice, done: (s) => !!s.flags.crowned },
  ],
};
const CHAIN_OWNER = {};
Object.keys(CHAINS).forEach((cid) => CHAINS[cid].forEach((st) => {
  CHAIN_OWNER[st.cardId] = cid;
  if (st.finaleId) CHAIN_OWNER[st.finaleId] = cid;
}));

// Age bands (age = 7 + turn). Anything not listed can happen at any age.
const AGE_BANDS = {
  town_guard: [16, 45], market_thief: [10, 40], dragon_shadow: [12, 99], troll_toll: [12, 99],
  debased_coin: [16, 99], border_spy: [16, 70], crippled_soldier: [16, 99], black_market: [16, 70],
  forbidden_book: [14, 99], mercenary_band: [16, 60], noble_daughter: [16, 40], cattle_raid: [16, 70],
  tax_collector: [18, 99], knight_challenge: [16, 50], widow_land: [20, 99], traveling_merchant: [14, 99],
  rival_claimant: [20, 70], rival_pressure: [20, 80], execution_request: [25, 99], spy_caught: [20, 80],
  royal_summons: [18, 60], duel_of_words: [14, 60], siege_prep: [20, 60], coronation_rumor: [18, 99],
  wild_horse: [10, 40], cavalry_gift: [16, 45], moonlit_coven: [14, 99], dragon_hoard: [18, 99],
  blacksmith_sword: [14, 99], tournament_melee: [16, 40], abandoned_shrine_map: [12, 70],
  royal_physician: [30, 99], night_watch: [16, 60], meet_elin: [16, 35], strange_letter: [16, 99],
  dragon_offer: [18, 99], ysolde_return: [16, 99], elf_heir: [20, 99], sword_worthy: [16, 99],
  grimoire_insight: [14, 99], militia_promotion: [16, 50], captain_promotion: [20, 60],
  mystery_clue: [16, 70], mystery_reveal: [20, 80], elin_letter: [16, 60], elin_proposal: [16, 60],
  reputation_kind: [25, 99], reputation_ruthless: [25, 99], reputation_cunning: [25, 99],
};

/* ---------------------------------- Helpers ----------------------------------- */
const START_STATE = (character) => ({
  folk: 50, haer: 50, magi: 50, skat: 50, health: 100,
  ...(character ? character.startStats : {}),
  turn: 0, flags: {}, artifacts: {}, traits: { kind: 0, ruthless: 0, cunning: 0 }, usedOnce: {}, history: [], lastDelta: {},
  chain: { done: 0, lastAdvanceTurn: 0, cooldown: {}, lastChainShownTurn: -99, dueSince: null, advancedAt: -1 },
});

function eligible(c, state, lastId, character) {
  if (c.hidden) return false;
  if (c.id === lastId) return false;
  if (c.once && state.usedOnce[c.id]) return false;
  const owner = CHAIN_OWNER[c.id];
  if (owner && character && owner === character.id) return false;   // the scheduler hands these out
  if (c.ownerOnly) return false;                                    // ...and nobody else gets them
  const age = 7 + state.turn;
  const band = c.ageMin != null ? [c.ageMin, c.ageMax != null ? c.ageMax : 99] : AGE_BANDS[c.id];
  if (band && (age < band[0] || age > band[1])) return false;
  if (c.condition && !c.condition(state)) return false;
  return true;
}

function chainStatus(state, st) {
  const ch = state.chain;
  const age = 7 + state.turn;
  const ready = age >= st.minAge
    && (ch.done === 0 || state.turn - ch.lastAdvanceTurn >= CHAIN_MIN_GAP)
    && state.turn >= (ch.cooldown[st.cardId] || 0)
    && st.requires(state);
  if (!ready) return { ready: false, blocked: null };
  const failing = (st.gates || []).find(([k, min]) => state[k] < min);
  return { ready: true, blocked: failing ? failing[0] : null };
}

// Called once per choice, after flags/stats are applied to `next`.
function updateChain(next, card, side, character) {
  const steps = character && CHAINS[character.id];
  if (!steps) return next.chain;
  const ch = { ...next.chain, cooldown: { ...next.chain.cooldown } };
  const cur = steps[ch.done];
  if (cur) {
    if (cur.done(next)) {
      ch.done += 1; ch.lastAdvanceTurn = next.turn; ch.dueSince = null; ch.advancedAt = next.turn;
    } else if (card.id === cur.cardId || card.id === cur.finaleId) {
      const choice = card[side];
      const leadsOn = card.id === cur.cardId && choice && choice.forceNext;
      if (!leadsOn) ch.cooldown[cur.cardId] = next.turn + (cur.final ? 10 : 8) + Math.floor(Math.random() * 4);
    }
  }
  const now = steps[ch.done];
  if (now) {
    const stt = chainStatus({ ...next, chain: ch }, now);
    if (stt.ready && !stt.blocked) { if (ch.dueSince == null) ch.dueSince = next.turn; }
    else ch.dueSince = null;
  }
  return ch;
}

function markShown(next, upcoming, character) {
  if (!upcoming || !character) return next;
  if (CHAIN_OWNER[upcoming.id] !== character.id) return next;
  return { ...next, chain: { ...next.chain, lastChainShownTurn: next.turn } };
}

// One choice, as a pure function: stats, aging, frailty, flags, artifacts, chain.
function advance(prev, card, side, character) {
  const choice = card[side];
  const willBeTurn = prev.turn + 1;
  const age = 7 + willBeTurn;
  let heal = choice.effects.health || 0;
  if (heal > 0 && age > 65) heal = Math.floor(heal * Math.max(0.1, 1 - (age - 65) * 0.05)); // old-age frailty: healing works less and less
  // Soft walls: close to either edge, a push toward that edge lands at half strength,
  // so a long life isn't ended by one lucky card. Reaching 0 or 100 still ends it.
  const soft = (v, d) => (d > 0 && v >= SOFT_HI) ? Math.ceil(d * 0.5) : (d < 0 && v <= SOFT_LO) ? Math.floor(d * 0.5) : d;
  const delta = {
    folk: soft(prev.folk, choice.effects.folk || 0), haer: soft(prev.haer, choice.effects.haer || 0),
    magi: soft(prev.magi, choice.effects.magi || 0), skat: soft(prev.skat, choice.effects.skat || 0),
    health: heal - ageHealthDecay(age),
  };
  let flags = choice.flag ? { ...prev.flags, [choice.flag]: true } : { ...prev.flags };
  if (choice.flag2) flags = { ...flags, [choice.flag2]: true };
  const traits = choice.trait ? { ...prev.traits, [choice.trait]: (prev.traits[choice.trait] || 0) + 1 } : prev.traits;
  const next = {
    ...prev,
    folk: clamp(prev.folk + delta.folk), haer: clamp(prev.haer + delta.haer), magi: clamp(prev.magi + delta.magi),
    skat: clamp(prev.skat + delta.skat), health: clamp(prev.health + delta.health),
    turn: willBeTurn, flags, traits,
    artifacts: choice.artifact ? { ...prev.artifacts, [choice.artifact]: true } : { ...prev.artifacts },
    usedOnce: card.once ? { ...prev.usedOnce, [card.id]: true } : prev.usedOnce,
    history: [...prev.history, { card: card.id, side }],
    lastDelta: delta,
  };
  next.chain = updateChain({ ...next, chain: prev.chain || START_STATE().chain }, card, side, character);
  return next;
}

function pathBoostIds(character, state) {
  const ids = [];
  if (state.flags.elf_pact && !state.flags.shadow_heir) ids.push("elf_heir");
  if (state.flags.nisse_friend) ids.push("knurre_gift");
  if (state.flags.met_ysolde && !state.flags.witch_pact) ids.push("ysolde_return");
  if (state.flags.courting_elin && !state.flags.married) { ids.push("elin_letter"); ids.push("elin_proposal"); }
  if (state.flags.rival_ally && !state.flags.rival_resolved) ids.push("rival_pressure");
  if (state.flags.duel_won && !state.flags.horse_gifted) ids.push("cavalry_gift");
  if (state.flags.militia_recruit && !state.flags.soldier) ids.push("militia_promotion");
  if (state.flags.soldier && !state.flags.captain) ids.push("captain_promotion");
  if (state.flags.mystery_started && !state.flags.mystery_clue_found) ids.push("mystery_clue");
  if (state.artifacts.torn_ledger && !state.flags.mystery_resolved) ids.push("mystery_reveal");
  if (state.traits.kind >= 5) ids.push("reputation_kind");
  if (state.traits.ruthless >= 5) ids.push("reputation_ruthless");
  if (state.traits.cunning >= 5) ids.push("reputation_cunning");
  return ids;
}

function pickNextCard(state, lastId, character) {
  const recent = state.history.slice(-15).map((h) => h.card);
  const recentHeal = state.history.slice(-3).map((h) => h.card);
  const okCard = (c) => eligible(c, state, lastId, character)
    && (HEALING_CARD_IDS.includes(c.id) ? !recentHeal.includes(c.id) : !recent.includes(c.id));
  const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const healPool = () => ALL_CARDS.filter((c) => HEALING_CARD_IDS.includes(c.id) && okCard(c));

  // 1. Emergency: a failing body always gets a chance to recover.
  if (state.health < 35) {
    const pool = healPool();
    if (pool.length) return rnd(pool);
  }

  // 2. The next rung of the life goal, if its time has come.
  const steps = character && CHAINS[character.id];
  let blockedStat = null;
  if (steps && state.chain && state.chain.done < steps.length) {
    const st = steps[state.chain.done];
    const stt = chainStatus(state, st);
    if (stt.ready && stt.blocked) blockedStat = stt.blocked;
    else if (stt.ready && state.turn - state.chain.lastChainShownTurn >= CHAIN_SPACING) {
      const overdue = state.chain.dueSince == null ? 0 : state.turn - state.chain.dueSince;
      if (Math.random() < Math.min(1, 0.30 + 0.15 * overdue)) return getCardById(st.cardId, character);
    }
  }

  // 3. A stat is holding the final trial back: give the player a fair way to fix it.
  if (blockedStat && Math.random() < 0.5) {
    const fixPool = ALL_CARDS.filter((c) => okCard(c) && !HEALING_CARD_IDS.includes(c.id)
      && ((c.left.effects[blockedStat] || 0) > 0 || (c.right.effects[blockedStat] || 0) > 0));
    if (fixPool.length) return rnd(fixPool);
  }

  // 4. Looking after yourself (never more than two in a row, so life keeps moving).
  const lastTwoHeal = state.history.slice(-2).length === 2 && state.history.slice(-2).every((h) => HEALING_CARD_IDS.includes(h.card));
  if (state.health < 55 && !lastTwoHeal && Math.random() < 0.6) {
    const pool = healPool();
    if (pool.length) return rnd(pool);
  }

  // 5. Side stories follow their flags, but only some of the time.
  const boostIds = pathBoostIds(character, state);
  if (boostIds.length && Math.random() < 0.30) {
    const boostPool = ALL_CARDS.filter((c) => boostIds.includes(c.id) && okCard(c));
    if (boostPool.length) return rnd(boostPool);
  }

  // 6. Ordinary life.
  let pool = ALL_CARDS.filter(okCard);
  if (pool.length === 0) pool = ALL_CARDS.filter((c) => eligible(c, state, lastId, character));
  if (pool.length === 0) {
    const fb = CARDS.filter((c) => c.id !== lastId && !c.hidden);
    return rnd(fb);
  }
  return rnd(pool);
}

function startCardFor(character) {
  return {
    speaker: "The Chronicler", pixel: "scroll", plate: "#3a2f1c", id: "start",
    text: character.name + " is seven when their father dies in the fields. The village takes them in — out of duty, not kindness.",
    left: { label: "Begin the story", effects: {} },
    right: { label: "Begin the story", effects: {} },
  };
}

// Turn 1-2: tutorial. Turn 3: chores. Turn 4: destiny card. Turn 5+: the story proper.
function cardForTurn(nextState, lastId, character) {
  if (nextState.turn === 1) return { ...TUTORIAL_CARD };
  if (nextState.turn === 2) return { ...TUTORIAL_CARD2 };
  if (nextState.turn === 3) return { ...CHORES_CARD, id: "chores" };
  if (nextState.turn === 4) {
    const d = character.destinyCard;
    return { id: "destiny", speaker: d.speaker, portrait: d.portrait, sound: d.sound, text: d.text,
      left: { label: "Watch closely", effects: d.effects, flag: character.destinyFlag },
      right: { label: "Watch closely", effects: d.effects, flag: character.destinyFlag } };
  }
  return pickNextCard(nextState, lastId, character);
}

function getCardById(id, character) {
  if (id === "start") return startCardFor(character);
  if (id === "tutorial") return { ...TUTORIAL_CARD };
  if (id === "tutorial2") return { ...TUTORIAL_CARD2 };
  if (id === "chores") return { ...CHORES_CARD, id: "chores" };
  if (id === "destiny") {
    const d = character.destinyCard;
    return { id: "destiny", speaker: d.speaker, portrait: d.portrait, sound: d.sound, text: d.text,
      left: { label: "Watch closely", effects: d.effects, flag: character.destinyFlag },
      right: { label: "Watch closely", effects: d.effects, flag: character.destinyFlag } };
  }
  if (id === "poetry_slam") return buildPoetryPuzzle();
  if (id === "grimoire_math") return buildMathPuzzle();
  if (id === "coven_trial_test") return buildRitualPuzzle();
  const found = ALL_CARDS.find((c) => c.id === id);
  if (found && found.hidden) return shuffleLR(found);
  return found || null;
}

let pid = 0;
let popId = 0;
const CHRONICLE_BASE = 601;
const ACHV_KEY = "vintermark_achievements";
const SAVE_KEY = "vintermark_save";
const SETTINGS_KEY = "vintermark_settings";
const BESTIARY_KEY = "vintermark_bestiary";

async function storageGet(key) {
  try { if (window.storage) { const r = await window.storage.get(key); return r ? r.value : null; } } catch (e) {}
  try { return window.localStorage.getItem(key); } catch (e) {}
  return null;
}
async function storageSet(key, value) {
  try { if (window.storage) { await window.storage.set(key, value); return; } } catch (e) {}
  try { window.localStorage.setItem(key, value); } catch (e) {}
}
async function storageDelete(key) {
  try { if (window.storage) { await window.storage.delete(key); return; } } catch (e) {}
  try { window.localStorage.removeItem(key); } catch (e) {}
}

/* ---------------------------------- UI ----------------------------------- */
export default function Vintermark() {
  const { sfx, startMusic, stopMusic } = useAudioEngine();
  const [phase, setPhase] = useState("home");
  const [returnPhase, setReturnPhase] = useState("home");
  const [character, setCharacter] = useState(null);
  const [achievements, setAchievements] = useState({});
  const [met, setMet] = useState({});
  const [selectedAchv, setSelectedAchv] = useState(null);
  const [toast, setToast] = useState(null);
  const [hasSave, setHasSave] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [state, setState] = useState(() => START_STATE());
  const [card, setCard] = useState(null);
  const [pendingNext, setPendingNext] = useState(null);
  const [ending, setEnding] = useState(null);
  const [goalFlash, setGoalFlash] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0, dragging: false });
  const [flyDir, setFlyDir] = useState(null);
  const [particles, setParticles] = useState([]);
  const [popups, setPopups] = useState([]);
  const [displayedText, setDisplayedText] = useState("");
  const dragStart = useRef({ x: 0, y: 0 });
  const stateRef = useRef(state);
  const achvRef = useRef(achievements);
  const goalCelebratedRef = useRef(false);

  const isConsequence = card && card.__consequence;

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { achvRef.current = achievements; }, [achievements]);

  const playSfx = useCallback((name, ...args) => { if (sfxOn && sfx[name]) sfx[name](...args); }, [sfxOn, sfx]);

  useEffect(() => {
    (async () => {
      const a = await storageGet(ACHV_KEY);
      if (a) { try { setAchievements(JSON.parse(a)); } catch (e) {} }
      const m = await storageGet(BESTIARY_KEY);
      if (m) { try { setMet(JSON.parse(m)); } catch (e) {} }
      const s = await storageGet(SAVE_KEY);
      setHasSave(!!s);
      const st = await storageGet(SETTINGS_KEY);
      if (st) { try { const p = JSON.parse(st); if (typeof p.musicOn === "boolean") setMusicOn(p.musicOn); if (typeof p.sfxOn === "boolean") setSfxOn(p.sfxOn); } catch (e) {} }
    })();
  }, []);

  const persistSettings = (m, s) => storageSet(SETTINGS_KEY, JSON.stringify({ musicOn: m, sfxOn: s }));

  const showToast = (title) => {
    setToast(title);
    setTimeout(() => setToast((t) => (t === title ? null : t)), 2600);
  };

  const unlockAchievement = (id, title) => {
    if (achvRef.current[id]) return;
    const next = { ...achvRef.current, [id]: true };
    achvRef.current = next;
    setAchievements(next);
    storageSet(ACHV_KEY, JSON.stringify(next));
    playSfx("star");
    showToast("Achievement: " + title);
  };

  const scanAchievements = (nextState) => {
    ACHIEVEMENTS.forEach((a) => { if (!achvRef.current[a.id] && a.check(nextState)) unlockAchievement(a.id, a.title); });
  };

  useEffect(() => {
    if (phase === "playing" && musicOn) startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [phase, musicOn, startMusic, stopMusic]);

  useEffect(() => {
    if (card && card.sound) playSfx(card.sound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card]);

  useEffect(() => {
    if (!card || card.__consequence) return;
    if (!card.speaker || card.speaker === "You") return;
    setMet((prev) => {
      if (prev[card.speaker]) return prev;
      const next = { ...prev, [card.speaker]: true };
      storageSet(BESTIARY_KEY, JSON.stringify(next));
      return next;
    });
  }, [card]);

  useEffect(() => {
    if (!card) return;
    setDisplayedText("");
    const full = card.text;
    let i = 0;
    const speed = full.length > 140 ? 8 : 13;
    const iv = setInterval(() => {
      i++;
      setDisplayedText(full.slice(0, i));
      if (i >= full.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [card]);

  const rotation = useMemo(() => Math.max(-16, Math.min(16, drag.x / 8)), [drag.x]);
  const threshold = 110;

  const spawnParticles = (dir) => {
    const color = dir === "left" ? PAL.good : PAL.bad;
    const batch = Array.from({ length: 14 }).map(() => ({
      id: pid++, color,
      tx: (dir === "left" ? -1 : 1) * (60 + Math.random() * 160),
      ty: -60 + Math.random() * 120,
      rot: Math.random() * 360, delay: Math.random() * 0.06,
      size: 4 + Math.round(Math.random() * 3),
    }));
    setParticles((p) => [...p, ...batch]);
    setTimeout(() => setParticles((p) => p.filter((x) => !batch.includes(x))), 650);
  };

  const spawnPopups = (effects) => {
    const entries = Object.entries(effects).filter(([, v]) => v);
    entries.forEach(([key, val], i) => {
      const id = popId++;
      setTimeout(() => {
        setPopups((p) => [...p, { id, key, val }]);
        if (val > 0) playSfx("statUp", i); else playSfx("statDown", i);
        setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 900);
      }, i * 90);
    });
  };

  const celebrateGoal = () => {
    goalCelebratedRef.current = true;
    setTimeout(() => {
      playSfx("goalFanfare");
      setGoalFlash(true);
      setTimeout(() => setGoalFlash(false), 2400);
    }, 300);
  };

  const advanceFromConsequence = () => {
    if (pendingNext) {
      setCard(pendingNext);
      storageSet(SAVE_KEY, JSON.stringify({ characterId: character.id, cardId: pendingNext.id, state: stateRef.current }));
      setPendingNext(null);
    }
  };

  const applyChoice = useCallback((side) => {
    if (flyDir || isConsequence) return;
    const choice = card[side];
    const isPuzzle = card.id === "poetry_slam" || card.id === "grimoire_math" || card.id === "coven_trial_test";
    setFlyDir(side);
    playSfx("whoosh", side === "right" ? 1 : -1);
    spawnParticles(side);
    if (isPuzzle) setTimeout(() => playSfx((choice.effects.folk > 0 || choice.effects.magi > 0) ? "correct" : "wrong"), 180);

    setTimeout(() => {
      setState((prev) => {
        let next = advance(prev, card, side, character);
        const delta = next.lastDelta;
        spawnPopups(delta);
        if (!goalCelebratedRef.current && character.goalCheck(null, next)) celebrateGoal();
        const result = resolveEnding(next, character.name, character.id);
        if (result) {
          if (result.grantFlag) next = { ...next, flags: { ...next.flags, [result.grantFlag]: true } };
          scanAchievements(next);
          const achieved = !!character.goalCheck(result, next);
          result.achieved = achieved;
          storageDelete(SAVE_KEY);
          setHasSave(false);
          setTimeout(() => {
            playSfx(result.good ? "fanfare" : "doom");
            if (achieved) setTimeout(() => playSfx("star"), 400);
            setEnding(result);
          }, 500);
        } else {
          scanAchievements(next);
          const upcoming = choice.forceNext ? getCardById(choice.forceNext, character) : cardForTurn(next, card.id, character);
          next = markShown(next, upcoming, character);
          if (next.chain.advancedAt === next.turn && !character.goalCheck(null, next)) {
            setTimeout(() => { playSfx("chime"); showToast("Your path moves on."); }, 450);
          }
          if (choice.consequence) {
            setTimeout(() => playSfx("chime"), 150);
            setCard({ ...choice.consequence, __consequence: true, id: card.id + "-cq" });
            setPendingNext(upcoming);
          } else {
            setCard(upcoming);
            storageSet(SAVE_KEY, JSON.stringify({ characterId: character.id, cardId: upcoming.id, state: next }));
            setHasSave(true);
          }
        }
        return next;
      });
      setDrag({ x: 0, y: 0, dragging: false });
      setFlyDir(null);
    }, 260);
  }, [card, flyDir, isConsequence, playSfx, character]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = (e) => {
    if (flyDir || isConsequence) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDrag((d) => ({ ...d, dragging: true }));
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.dragging || flyDir || isConsequence) return;
    setDrag({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y, dragging: true });
  };
  const onPointerUp = () => {
    if (!drag.dragging || flyDir || isConsequence) return;
    if (drag.x > threshold) applyChoice("right");
    else if (drag.x < -threshold) applyChoice("left");
    else setDrag({ x: 0, y: 0, dragging: false });
  };

  const goHome = () => setPhase("home");
  const goNewGame = () => setPhase("menu");
  const selectCharacter = (c) => { playSfx("click"); setCharacter(c); setPhase("detail"); };

  const beginStory = () => {
    const s0 = START_STATE(character);
    setState(s0);
    const c0 = startCardFor(character);
    setCard(c0);
    goalCelebratedRef.current = false;
    storageSet(SAVE_KEY, JSON.stringify({ characterId: character.id, cardId: "start", state: s0 }));
    setHasSave(true);
    setPhase("playing");
  };

  const continueGame = async () => {
    const raw = await storageGet(SAVE_KEY);
    if (!raw) return;
    try {
      const save = JSON.parse(raw);
      const c = CHARACTERS.find((x) => x.id === save.characterId);
      if (!c) return;
      const restoredState = { ...START_STATE(c), ...save.state };
      goalCelebratedRef.current = !!c.goalCheck(null, restoredState);
      setCharacter(c);
      setState(restoredState);
      setCard(getCardById(save.cardId, c));
      setPhase("playing");
    } catch (e) {}
  };

  const restart = () => {
    setPhase("home"); setCharacter(null);
    setState(START_STATE()); setCard(null); setPendingNext(null); setEnding(null); setGoalFlash(false);
    setDrag({ x: 0, y: 0, dragging: false }); setFlyDir(null); setPopups([]); setParticles([]);
  };

  const openSettings = () => { setReturnPhase(phase); setPhase("settings"); };
  const openAchievements = () => { setReturnPhase(phase); setSelectedAchv(null); setPhase("achievements"); };
  const openLibrary = () => { setReturnPhase(phase); setPhase("library"); };

  const resetProgress = async () => {
    await storageDelete(ACHV_KEY);
    await storageDelete(SAVE_KEY);
    await storageDelete(BESTIARY_KEY);
    setAchievements({}); achvRef.current = {};
    setMet({});
    setHasSave(false);
  };

  const leftOpacity = drag.x < 0 ? Math.min(1, -drag.x / threshold) : 0;
  const rightOpacity = drag.x > 0 ? Math.min(1, drag.x / threshold) : 0;
  const bannerLabel = !isConsequence ? (drag.x < 0 ? card?.left?.label : card?.right?.label) : null;
  const bannerOpacity = Math.max(leftOpacity, rightOpacity);

  const flyStyle =
    flyDir === "left" ? { transform: "translate(-640px, " + drag.y + "px) rotate(-28deg)", opacity: 0 } :
    flyDir === "right" ? { transform: "translate(640px, " + drag.y + "px) rotate(28deg)", opacity: 0 } :
    { transform: "translate(" + drag.x + "px, " + (drag.y * 0.4) + "px) rotate(" + rotation + "deg)" };

  // The last door is ready but a stat is holding it shut: the final diamond flickers.
  const finalSteps = character && CHAINS[character.id];
  const finalWaiting = !!(finalSteps && state.chain && state.chain.done === 5 && (() => { const t = chainStatus(state, finalSteps[5]); return t.ready && t.blocked; })());
  const companionCount = ["dragon_ally", "witch_pact", "nisse_friend", "shadow_heir"].filter((f) => state.flags[f]).length;
  const artifactList = state.artifacts ? Object.keys(state.artifacts) : [];

  const Toast = toast ? (
    <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 80, background: "#1c0d12", border: "2px solid " + PAL.gold, borderRadius: 8, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 20px rgba(0,0,0,0.5)" }}>
      <Star size={15} color={PAL.gold} fill={PAL.gold} />
      <span className="vm-title" style={{ fontSize: 10, color: PAL.cream }}>{toast}</span>
    </div>
  ) : null;

  if (phase === "home") {
    return (
      <div style={styles.page}>
        <GlobalStyle /><Vignette /><CastleBackdrop />{Toast}
        <CornerFlourish corner="tl" /><CornerFlourish corner="tr" /><CornerFlourish corner="bl" /><CornerFlourish corner="br" />
        <TrophyButton onClick={openAchievements} />
        <GearButton onClick={openSettings} />
        <div style={{ width: "100%", maxWidth: 340, position: "relative", zIndex: 1, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 10, marginBottom: 4 }}>
            <Pennant /><Logo /><Pennant flip />
          </div>
          <div className="vm-title" style={{ fontSize: 12, color: PAL.gold, letterSpacing: 3, marginBottom: 6 }}>KINGDOM OF</div>
          <div className="vm-title" style={{ fontSize: 34, color: PAL.cream, marginBottom: 2 }}>VINTERMARK</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 1, background: PAL.gold, opacity: 0.6 }} />
            <span style={{ color: PAL.gold, fontSize: 11, opacity: 0.8 }}>{"\u2766"}</span>
            <div style={{ width: 36, height: 1, background: PAL.gold, opacity: 0.6 }} />
          </div>
          <div className="vm-body" style={{ fontSize: 15, color: "#a99a90", marginBottom: 30 }}>A Peasant's Tale</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button className="vm-btn vm-title" onClick={continueGame} disabled={!hasSave} style={{ ...styles.menuBtn, opacity: hasSave ? 1 : 0.4, cursor: hasSave ? "pointer" : "default" }}>CONTINUE PLAYING</button>
            <button className="vm-btn vm-title" onClick={goNewGame} style={styles.menuBtn}>NEW GAME</button>
            <button className="vm-btn vm-title" onClick={openLibrary} style={{ ...styles.menuBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><BookOpen size={14} /> NPC LIBRARY</button>
            <button className="vm-btn vm-title" onClick={openAchievements} style={{ ...styles.menuBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Trophy size={14} /> ACHIEVEMENTS</button>
            <button className="vm-btn vm-title" onClick={openSettings} style={{ ...styles.menuBtn, background: "transparent", border: "2px solid " + PAL.wine, boxShadow: "none" }}>SETTINGS</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "settings") {
    return (
      <div style={styles.page}>
        <GlobalStyle /><Vignette />
        <div style={{ width: "100%", maxWidth: 340, position: "relative", zIndex: 1 }}>
          <button className="vm-btn vm-body" onClick={() => setPhase(returnPhase)} style={styles.backBtn}><ArrowLeft size={16} /> Back</button>
          <div className="vm-title" style={{ fontSize: 22, color: PAL.cream, marginBottom: 24 }}>SETTINGS</div>
          <SettingRow label="Music"><ToggleSwitch on={musicOn} onClick={() => { const v = !musicOn; setMusicOn(v); persistSettings(v, sfxOn); }} /></SettingRow>
          <SettingRow label="Sound Effects"><ToggleSwitch on={sfxOn} onClick={() => { const v = !sfxOn; setSfxOn(v); persistSettings(musicOn, v); }} /></SettingRow>
          <div style={{ height: 1, background: "#3a2028", margin: "22px 0" }} />
          <button className="vm-btn vm-body" onClick={resetProgress} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "1px solid " + PAL.bad, color: PAL.bad, padding: "10px 14px", cursor: "pointer", fontSize: 14, marginBottom: 14, width: "100%", justifyContent: "center" }}><Trash2 size={15} /> Reset progress &amp; achievements</button>
          <button className="vm-btn vm-title" onClick={goHome} style={{ ...styles.menuBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12 }}><Home size={15} /> RETURN TO HOME SCREEN</button>
        </div>
      </div>
    );
  }

  if (phase === "achievements") {
    const sel = ACHIEVEMENTS.find((a) => a.id === selectedAchv);
    return (
      <div style={styles.page}>
        <GlobalStyle /><Vignette />
        <div style={{ width: "100%", maxWidth: 380, position: "relative", zIndex: 1 }}>
          <button className="vm-btn vm-body" onClick={() => setPhase(returnPhase)} style={styles.backBtn}><ArrowLeft size={16} /> Back</button>
          <div className="vm-title" style={{ fontSize: 22, color: PAL.cream, marginBottom: 4 }}>ACHIEVEMENTS</div>
          <div className="vm-body" style={{ fontSize: 14, color: "#a99a78", marginBottom: 18 }}>{Object.keys(achievements).length} / {ACHIEVEMENTS.length} unlocked</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
            {ACHIEVEMENTS.map((a) => {
              const unlocked = !!achievements[a.id];
              return (
                <button key={a.id} className="vm-btn" onClick={() => setSelectedAchv(a.id)} style={{ background: unlocked ? "#1c0d12" : "#120a0d", border: "1px solid " + (unlocked ? PAL.gold : "#3a2a2e"), borderRadius: 6, padding: "12px 4px", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 26, filter: unlocked ? "none" : "grayscale(1) brightness(0.4)" }}>{unlocked ? a.icon : "\u2754"}</div>
                  <div className="vm-body" style={{ fontSize: 10, color: unlocked ? PAL.cream : "#5a4f4a", marginTop: 4 }}>{unlocked ? a.title : "???"}</div>
                </button>
              );
            })}
          </div>
          {sel && (
            <div style={{ background: PAL.card, border: "1px solid " + PAL.gold, borderRadius: 8, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 34 }}>{achievements[sel.id] ? sel.icon : "\u2754"}</div>
              <div className="vm-title" style={{ fontSize: 14, color: PAL.gold, margin: "8px 0" }}>{achievements[sel.id] ? sel.title : "Locked"}</div>
              <div className="vm-body" style={{ fontSize: 15, color: PAL.text }}>{achievements[sel.id] ? sel.desc : "Keep playing to find out how to get this one."}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "library") {
    return (
      <div style={styles.page}>
        <GlobalStyle /><Vignette />
        <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
          <button className="vm-btn vm-body" onClick={() => setPhase(returnPhase)} style={styles.backBtn}><ArrowLeft size={16} /> Back</button>
          <div className="vm-title" style={{ fontSize: 22, color: PAL.cream, marginBottom: 4 }}>NPC LIBRARY</div>
          <div className="vm-body" style={{ fontSize: 14, color: "#a99a78", marginBottom: 18 }}>{Object.keys(met).length} / {NPC_REGISTRY.length} met</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, maxHeight: "62vh", overflowY: "auto", paddingRight: 2 }}>
            {NPC_REGISTRY.map((npc) => {
              const known = !!met[npc.name];
              return (
                <div key={npc.name} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ position: "relative", width: "100%", aspectRatio: "400 / 488", borderRadius: 7, overflow: "hidden", border: "2px solid " + (known ? "#4a1624" : "#2a2020"), background: "#4a1f2e" }}>
                    <Portrait speaker={npc.name} {...npc.portrait} greyed={!known} />
                  </div>
                  <div className="vm-body" style={{ fontSize: 9, color: known ? "#c9bfa0" : "#4a4040", marginTop: 3, textAlign: "center", lineHeight: 1.1 }}>{known ? npc.name : "???"}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "menu") {
    return (
      <div style={styles.page}>
        <GlobalStyle /><Vignette />
        <GearButton onClick={openSettings} />
        <div style={{ width: "100%", maxWidth: 380, position: "relative", zIndex: 1 }}>
          <button className="vm-btn vm-body" onClick={goHome} style={styles.backBtn}><ArrowLeft size={16} /> Home</button>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div className="vm-title" style={{ fontSize: 22, color: PAL.cream }}>Pick who you'll grow up to be.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {CHARACTERS.map((c) => (
              <button key={c.id} className="vm-btn" onClick={() => selectCharacter(c)} style={styles.charTile}>
                <div style={{ position: "relative", width: "100%", height: 130, borderRadius: 4, overflow: "hidden", marginBottom: 8, border: "1px solid " + PAL.wine }}>
                  <CharacterArt id={c.id} />
                  {achievements[c.id] && <div style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.55)", borderRadius: "50%", padding: 3 }}><Star size={14} color={PAL.gold} fill={PAL.gold} /></div>}
                </div>
                <div className="vm-title" style={{ fontSize: 13, color: PAL.cream }}>{c.name}</div>
                <div className="vm-body" style={{ fontSize: 13, color: "#a99a78", marginBottom: 4 }}>{c.title}</div>
                <div className="vm-body" style={{ fontSize: 12, color: "#c9bfa0", lineHeight: 1.25 }}>{c.teaser}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "detail") {
    return (
      <div style={styles.page}>
        <GlobalStyle /><Vignette />
        <GearButton onClick={openSettings} />
        <div style={{ width: "100%", maxWidth: 360, maxHeight: "92vh", overflowY: "auto", position: "relative", zIndex: 1 }}>
          <button className="vm-btn vm-body" onClick={() => setPhase("menu")} style={styles.backBtn}><ArrowLeft size={16} /> Back</button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
            <div style={{ width: 210, borderRadius: 16, background: "#2a0f18", padding: 6, boxShadow: "0 0 0 1px #000, 0 0 0 2px #6a2236, 0 14px 28px rgba(0,0,0,0.6)" }}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "400 / 488", borderRadius: 11, overflow: "hidden", background: "#4a1f2e" }}>
                <CharacterArt id={character.id} />
              </div>
              <div className="vm-title" style={{ fontSize: 15, color: PAL.cream, textAlign: "center", padding: "9px 4px 1px" }}>{character.name}</div>
              <div className="vm-body" style={{ fontSize: 13, color: "#c9bfa0", textAlign: "center", paddingBottom: 5 }}>{character.title}</div>
            </div>
          </div>

          <div className="vm-body" style={{ fontSize: 14, lineHeight: 1.55, color: PAL.cream, marginBottom: 14, fontStyle: "italic" }}>{character.bio}</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            <SheetItem label="PERSONALITY" value={character.personality} />
            <SheetItem label="STARTS STRONG IN" value={character.strongStat} />
            <SheetItem label="FEARS" value={character.fear} />
            <SheetItem label="QUIRK" value={character.quirk} />
          </div>

          <div className="vm-title" style={{ fontSize: 10, color: PAL.gold, letterSpacing: 1, marginBottom: 6 }}>WHAT THEY WANT</div>
          <div className="vm-body" style={{ fontSize: 18, lineHeight: 1.4, color: PAL.cream, marginBottom: 10 }}>{character.goalText}</div>
          <div className="vm-body" style={{ fontSize: 13, lineHeight: 1.4, color: "#a99a78", marginBottom: 22 }}>Reaching it takes a real string of correct choices, not luck — and doesn't end the story by itself. You keep playing until your health runs out, or one of the other bars runs dry or overflows.</div>
          <button className="vm-btn vm-title" onClick={beginStory} style={{ ...styles.menuBtn, fontSize: 12, marginBottom: 10 }}>BEGIN {character.name.toUpperCase()}'S STORY</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <GlobalStyle /><Vignette />{Toast}
      <div style={{ position: "fixed", left: "50%", top: "42%", pointerEvents: "none", zIndex: 40 }}>
        {particles.map((p) => (
          <div key={p.id} style={{ position: "absolute", width: p.size, height: p.size, background: p.color, opacity: 0, animation: "pop-" + p.id + " 0.6s ease " + p.delay + "s forwards" }} />
        ))}
        <style>{particles.map((p) => "@keyframes pop-" + p.id + "{0%{transform:translate(0,0) rotate(0deg);opacity:1;}100%{transform:translate(" + p.tx + "px," + p.ty + "px) rotate(" + p.rot + "deg);opacity:0;}}").join("\n")}</style>
      </div>

      {goalFlash && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div className="vm-goalpop" style={{ background: "#1c0d12", border: "2px solid " + PAL.gold, borderRadius: 12, padding: "22px 30px", textAlign: "center", boxShadow: "0 0 50px rgba(201,162,74,0.65), 0 10px 30px rgba(0,0,0,0.6)" }}>
            <Trophy size={34} color={PAL.gold} />
            <div className="vm-title" style={{ fontSize: 16, color: PAL.gold, marginTop: 8, letterSpacing: 1 }}>LIFE GOAL ACHIEVED</div>
            <div className="vm-body" style={{ fontSize: 14, color: PAL.cream, marginTop: 6, maxWidth: 240 }}>{character.goalText}</div>
          </div>
        </div>
      )}

      {!ending && artifactList.length > 0 && (
        <div style={{ position: "fixed", bottom: 14, left: 14, zIndex: 60, display: "flex", gap: 6 }}>
          {artifactList.map((a) => (
            <div key={a} title={ARTIFACT_LABEL[a] || a} style={{ width: 32, height: 32, borderRadius: 7, background: "#1c0d12", border: "1px solid " + PAL.gold, padding: 5, boxShadow: "0 3px 8px rgba(0,0,0,0.5)" }}>
              <ArtifactIcon type={a} />
            </div>
          ))}
        </div>
      )}

      {!ending && card && (
        <div style={{ width: "100%", maxWidth: 380, borderRadius: 14, overflow: "hidden", boxShadow: "0 0 0 2px #000, 0 0 0 5px " + PAL.wine + ", 0 0 0 6px " + PAL.gold + ", 0 14px 34px rgba(0,0,0,0.6)", position: "relative", zIndex: 1 }}>

          <div style={styles.statHeader}>
            {STAT_ORDER.map((key) => {
              const meta = STAT_META[key];
              const Icon = meta.icon;
              const val = state[key];
              const d = state.lastDelta[key] || 0;
              const danger = key === "health" ? val <= 30 : (val <= 15 || val >= 85);
              const pop = popups.find((p) => p.key === key);
              return (
                <div key={key} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", marginBottom: 3, background: d > 0 ? PAL.good : d < 0 ? "#c25454" : "#5a4f3a" }} />
                  <StatGauge Icon={Icon} value={val} danger={danger} />
                  {key === "health" && (
                    <div style={{ height: 11, marginTop: 1 }}>
                      {d < 0 && <ArrowDown size={11} color="#e0776f" strokeWidth={3} />}
                      {d > 0 && <ArrowUp size={11} color={PAL.good} strokeWidth={3} />}
                    </div>
                  )}
                  {pop && <div key={pop.id} className="vm-title" style={{ position: "absolute", top: -14, fontSize: 11, color: pop.val > 0 ? "#9fce8a" : "#e08080", textShadow: "1px 1px 0 #000", animation: "floatUp 0.9s ease forwards" }}>{pop.val > 0 ? "+" + pop.val : pop.val}</div>}
                </div>
              );
            })}
            <button className="vm-btn" onClick={openSettings} style={{ background: "none", border: "none", color: "rgba(238,226,200,0.5)", cursor: "pointer", padding: 0, marginLeft: 4 }} aria-label="Settings"><Settings size={16} /></button>
          </div>

          <div style={{ position: "relative", background: PAL.card, padding: "22px 20px 18px", minHeight: 480, display: "flex", flexDirection: "column" }}>
            {card.tutorial && (
              <div className="vm-title" style={{ alignSelf: "center", background: PAL.gold, color: "#1a1410", fontSize: 10, letterSpacing: 2, padding: "4px 12px", borderRadius: 4, marginBottom: 10 }}>TUTORIAL</div>
            )}
            <div className="vm-body" style={{ fontSize: 21, lineHeight: 1.3, color: PAL.text, textAlign: "center", marginBottom: 14, minHeight: 56 }}>
              {isConsequence ? "" : displayedText}
              {!isConsequence && displayedText.length < card.text.length && <span style={{ animation: "blink 0.8s steps(1) infinite" }}>▌</span>}
            </div>

            <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {!isConsequence && <div style={{ ...styles.ghostPanel, left: 0, background: "#2e3a24", opacity: 0.5 + leftOpacity * 0.5 }}>{Array.from({ length: 3 }).map((_, i) => <div key={i} style={styles.fleur}>❋</div>)}</div>}
              {!isConsequence && <div style={{ ...styles.ghostPanel, right: 0, background: "#4a1c22", opacity: 0.5 + rightOpacity * 0.5 }}>{Array.from({ length: 3 }).map((_, i) => <div key={i} style={styles.fleur}>❋</div>)}</div>}

              <div key={card.id} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} className="vm-cardin"
                style={{ position: "relative", width: "78%", maxWidth: 262, borderRadius: 16, background: "#2a0f18", padding: 6, boxShadow: "0 0 0 1px #000, 0 0 0 2px #6a2236, 0 14px 28px rgba(0,0,0,0.6)", cursor: isConsequence ? "default" : drag.dragging ? "grabbing" : "grab", touchAction: "none", overflow: "hidden", transition: drag.dragging ? "none" : "transform 0.35s ease", ...flyStyle }}>
                <div style={{ position: "relative", width: "100%", aspectRatio: "400 / 488", borderRadius: 11, overflow: "hidden", background: "#4a1f2e" }}>
                  <Portrait speaker={card.speaker === "You" ? "hero:" + character.id : card.speaker} {...(card.portrait || { pixel: card.pixel, plate: card.plate })} />
                  {!isConsequence && bannerOpacity > 0.05 && <div className="vm-title" style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "14px 10px", background: "linear-gradient(to bottom, rgba(20,6,10,0.78), transparent)", fontSize: 13, lineHeight: 1.4, color: PAL.cream, opacity: bannerOpacity, textAlign: "center" }}>{bannerLabel}</div>}
                  {isConsequence && <div className="vm-title" style={{ position: "absolute", top: 10, left: 0, right: 0, fontSize: 9, color: PAL.gold, letterSpacing: 1, textAlign: "center", textShadow: "0 1px 2px #000" }}>MEANWHILE...</div>}
                  {isConsequence && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(20,6,10,0.92), rgba(20,6,10,0.55) 70%, transparent)", padding: "30px 12px 12px" }}>
                      <div className="vm-body" style={{ fontSize: 16, color: PAL.cream, textAlign: "center", lineHeight: 1.3 }}>{displayedText}{displayedText.length < card.text.length && <span style={{ animation: "blink 0.8s steps(1) infinite" }}>▌</span>}</div>
                    </div>
                  )}
                </div>
                <div className="vm-title" style={{ fontSize: 11, letterSpacing: 0.5, color: PAL.cream, textAlign: "center", padding: "9px 4px 5px", minHeight: 18 }}>{card.speaker}</div>
              </div>
            </div>

            {isConsequence && <button className="vm-btn vm-title" onClick={advanceFromConsequence} style={{ ...styles.pixelBtn, alignSelf: "center", marginTop: 16, fontSize: 10 }}>CONTINUE</button>}
            {!isConsequence && <div className="vm-body" style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#d9c9b0", marginTop: 14 }}><span style={{ maxWidth: "46%" }}>◄ {card.left.label}</span><span style={{ maxWidth: "46%", textAlign: "right" }}>{card.right.label} ►</span></div>}
          </div>

          <div style={styles.footer}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div className="vm-title" style={{ fontSize: 15, color: PAL.cream }}>{character.name}</div>
              <div title="Your path" style={{ display: "flex", gap: 5, alignItems: "center" }}>
                {Array.from({ length: 6 }).map((_, i) => {
                  const on = state.chain && i < state.chain.done;
                  const waiting = i === 5 && state.chain && state.chain.done === 5 && finalWaiting;
                  return <div key={i} style={{ width: 9, height: 9, transform: "rotate(45deg)", background: on ? PAL.gold : "transparent", border: "1px solid " + (on || waiting ? PAL.gold : PAL.wine), boxShadow: on ? "0 0 6px rgba(201,162,74,0.7)" : "none", animation: waiting ? "flicker 1.2s ease-in-out infinite" : "none" }} />;
                })}
              </div>
              <div className="vm-title" style={{ fontSize: 18, color: PAL.cream }}>{CHRONICLE_BASE + state.turn}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
              <div className="vm-body" style={{ fontSize: 17, color: "#a99a78" }}>Age {7 + state.turn} · {getRank(state.turn)}</div>
              <div style={{ display: "flex", gap: 5 }}>
                {["dragon_ally", "witch_pact", "nisse_friend", "shadow_heir"].map((f) => (
                  <div key={f} style={{ width: 12, height: 12, background: state.flags[f] ? PAL.gold : "#3a2028" }} title={f} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {ending && <EndingScreen ending={ending} character={character} state={state} companionCount={companionCount} onRestart={restart} />}

      <div className="vm-body" style={{ marginTop: 16, fontSize: 14, color: "#8a7368", textAlign: "center", maxWidth: 320, position: "relative", zIndex: 1 }}>
        Swipe left or right. Every choice sticks with you.
      </div>
    </div>
  );
}

function SheetItem({ label, value }) {
  return (
    <div style={{ background: "#160a0d", border: "1px solid " + PAL.wineDeep, borderRadius: 6, padding: "8px 10px" }}>
      <div className="vm-title" style={{ fontSize: 9, color: PAL.gold, letterSpacing: 1, marginBottom: 3 }}>{label}</div>
      <div className="vm-body" style={{ fontSize: 12, color: PAL.cream, lineHeight: 1.3 }}>{value}</div>
    </div>
  );
}

function EndingScreen({ ending, character, state, companionCount, onRestart }) {
  const good = ending.good;
  const goalLine = ending.achieved
    ? character.name + " achieved their life goal — happiness fills their grave."
    : character.name + " never reached their goal, and could not die happy.";
  return (
    <div style={{ width: "100%", maxWidth: 380, borderRadius: 14, overflow: "hidden", boxShadow: "0 0 0 2px #000, 0 0 0 5px " + PAL.wine + ", 0 0 0 6px " + PAL.gold + ", 0 14px 34px rgba(0,0,0,0.6)", position: "relative", zIndex: 1 }}>
      <div style={styles.statHeader} />
      <div style={{ background: good ? "linear-gradient(180deg, #2c1219 0%, #3a2418 100%)" : "linear-gradient(180deg, #241416 0%, #1a1214 100%)", padding: "30px 22px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <svg width="100%" height="100%" viewBox="0 0 300 340" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, opacity: 0.4 }}>
          {good ? (
            <>
              <circle cx="150" cy="70" r="50" fill="none" stroke={PAL.gold} strokeWidth="1.5" opacity="0.5" />
              <path d="M 30 300 Q 150 250 270 300" stroke={PAL.gold} strokeWidth="1.5" fill="none" opacity="0.4" />
              <path d="M 60 40 Q 150 -10 240 40" stroke={PAL.gold} strokeWidth="1" fill="none" opacity="0.3" />
            </>
          ) : (
            <>
              <line x1="20" y1="0" x2="70" y2="100" stroke="#000" strokeWidth="2" opacity="0.4" />
              <line x1="250" y1="10" x2="290" y2="130" stroke="#000" strokeWidth="2" opacity="0.4" />
              <line x1="130" y1="0" x2="150" y2="70" stroke="#000" strokeWidth="1.5" opacity="0.35" />
              <line x1="180" y1="250" x2="220" y2="340" stroke="#000" strokeWidth="2" opacity="0.3" />
            </>
          )}
        </svg>
        <div style={{ position: "relative" }}>
          {ending.old && <div className="vm-title" style={{ fontSize: 10, color: PAL.gold, marginBottom: 8, letterSpacing: 1 }}>THE STORY ENDS HERE</div>}
          {ending.secret && <div className="vm-title" style={{ fontSize: 10, color: "#a878c9", marginBottom: 8, letterSpacing: 1 }}>✦ HIDDEN ENDING ✦</div>}

          {good ? (
            <div style={{ width: 92, height: 92, borderRadius: "50%", margin: "0 auto", background: "radial-gradient(circle, rgba(201,162,74,0.25), transparent)", border: "3px solid " + PAL.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 44 }}>{ending.emoji}</span>
            </div>
          ) : (
            <div style={{ width: 90, height: 102, borderRadius: "50% 50% 8px 8px", margin: "0 auto", background: PAL.stone, border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 42 }}>{ending.emoji}</span>
            </div>
          )}

          <div className="vm-title" style={{ fontSize: 15, color: good ? PAL.good : PAL.bad, margin: "14px 0", lineHeight: 1.6 }}>{ending.title}</div>
          <div className="vm-body" style={{ fontSize: 20, lineHeight: 1.35, color: PAL.text, marginBottom: 14 }}>{ending.text}</div>

          <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid " + (ending.achieved ? PAL.gold : "#4a2028"), borderRadius: 8, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
            {ending.achieved && <Star size={16} fill={PAL.gold} color={PAL.gold} />}
            <div className="vm-body" style={{ fontSize: 15, lineHeight: 1.4, color: ending.achieved ? PAL.gold : "#c9a0a0", fontStyle: "italic", textAlign: "center" }}>{goalLine}</div>
          </div>

          <div className="vm-body" style={{ fontSize: 16, color: "#d9c9b0", marginBottom: 18 }}>
            {character.name}'s story lasted {state.turn} years.{companionCount > 0 ? " " + companionCount + " companion" + (companionCount > 1 ? "s" : "") + " stood beside them." : ""}
          </div>
          <button className="vm-btn vm-title" onClick={onRestart} style={{ ...styles.pixelBtn, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 8 }}><RotateCcw size={14} /> HOME</button>
        </div>
      </div>
      <div style={styles.footer} />
    </div>
  );
}

function TrophyButton({ onClick }) {
  return (
    <button className="vm-btn" onClick={onClick} aria-label="Achievements" style={{ position: "absolute", top: 18, left: 18, zIndex: 5, background: "rgba(0,0,0,0.35)", border: "1px solid " + PAL.wine, borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: PAL.gold, cursor: "pointer" }}>
      <Trophy size={16} />
    </button>
  );
}
function GearButton({ onClick }) {
  return (
    <button className="vm-btn" onClick={onClick} aria-label="Settings" style={{ position: "absolute", top: 18, right: 18, zIndex: 5, background: "rgba(0,0,0,0.35)", border: "1px solid " + PAL.wine, borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: PAL.cream, cursor: "pointer" }}>
      <Settings size={17} />
    </button>
  );
}

function SettingRow({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div className="vm-body" style={{ fontSize: 17, color: PAL.cream }}>{label}</div>
      {children}
    </div>
  );
}

function ToggleSwitch({ on, onClick }) {
  return (
    <button className="vm-btn" onClick={onClick} style={{ width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer", background: on ? PAL.wine : "#3a2a2a", position: "relative", transition: "background 0.2s" }}>
      <div style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: PAL.cream, transition: "left 0.2s" }} />
    </button>
  );
}

function Vignette() {
  return <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse at 50% 20%, rgba(122,31,52,0.14) 0%, rgba(0,0,0,0) 55%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)", animation: "flicker 6s ease-in-out infinite" }} />;
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
      .vm-title { font-family: 'Space Mono', monospace; font-weight: 700; }
      .vm-body { font-family: 'Space Mono', monospace; font-weight: 400; }
      .vm-btn { transition: transform 0.06s; }
      .vm-btn:active { transform: translateY(2px); }
      .vm-cardin { animation: cardIn 0.4s ease; }
      .vm-goalpop { animation: goalPop 2.4s ease forwards; }
      @keyframes cardIn { from { opacity: 0; transform: translateY(14px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes floatUp { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-30px); opacity: 0; } }
      @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0.2 } }
      @keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }
      @keyframes goalPop { 0% { transform: scale(0.7); opacity: 0; } 14% { transform: scale(1.08); opacity: 1; } 24% { transform: scale(1); opacity: 1; } 82% { opacity: 1; } 100% { opacity: 0; } }
    `}</style>
  );
}

const plaqueClip = "polygon(7px 0, calc(100% - 7px) 0, 100% 7px, 100% calc(100% - 7px), calc(100% - 7px) 100%, 7px 100%, 0 calc(100% - 7px), 0 7px)";

const styles = {
  page: { minHeight: "100vh", width: "100%", background: PAL.bg + " repeating-linear-gradient(135deg, rgba(122,31,52,0.05) 0px, rgba(122,31,52,0.05) 2px, transparent 2px, transparent 12px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "26px 14px 30px", boxSizing: "border-box", userSelect: "none", overflow: "hidden", color: PAL.cream, position: "relative" },
  statHeader: { background: PAL.header + " repeating-linear-gradient(135deg, rgba(122,31,52,0.18) 0px, rgba(122,31,52,0.18) 2px, transparent 2px, transparent 10px)", padding: "16px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid " + PAL.wineDeep },
  footer: { background: PAL.header + " repeating-linear-gradient(135deg, rgba(122,31,52,0.18) 0px, rgba(122,31,52,0.18) 2px, transparent 2px, transparent 10px)", padding: "14px 18px 16px", borderTop: "1px solid " + PAL.wineDeep },
  ghostPanel: { position: "absolute", top: 6, bottom: 6, width: "40%", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-evenly", transition: "opacity 0.1s", zIndex: 0 },
  fleur: { color: "rgba(238,226,200,0.35)", fontSize: 16 },
  pixelBtn: { background: "#1c0d12", color: PAL.cream, border: "1px solid " + PAL.gold, boxShadow: "4px 4px 0 0 " + PAL.wine, padding: "13px 20px", cursor: "pointer", clipPath: plaqueClip },
  menuBtn: { background: "#1c0d12", color: PAL.cream, border: "1px solid " + PAL.gold, boxShadow: "4px 4px 0 0 " + PAL.wine, padding: "15px 20px", cursor: "pointer", fontSize: 13, clipPath: plaqueClip },
  charTile: { background: "#160a0d", border: "1px solid " + PAL.wineDeep, borderRadius: 6, padding: 10, cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column" },
  backBtn: { background: "none", border: "none", color: "#c9bfa0", display: "flex", alignItems: "center", gap: 6, fontSize: 14, marginBottom: 14, cursor: "pointer", padding: 0 },
};

