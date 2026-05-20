// hi-fi/data.jsx — shared analysis data (same shape as backend result)

const SECTION_PALETTE = {
  intro:  { fillVar: '--section-intro',  inkVar: '--section-intro-i'  },
  verse:  { fillVar: '--section-verse',  inkVar: '--section-verse-i'  },
  chorus: { fillVar: '--section-chorus', inkVar: '--section-chorus-i' },
  bridge: { fillVar: '--section-bridge', inkVar: '--section-bridge-i' },
  inst:   { fillVar: '--section-inst',   inkVar: '--section-inst-i'   },
  outro:  { fillVar: '--section-outro',  inkVar: '--section-outro-i'  },
};
const sectionVar = (label, kind = 'fill') => `var(${SECTION_PALETTE[label][kind + 'Var']})`;

const DUR = 214.5;
const BPM = 120.4;

const SECTIONS = [
  { start: 0.0,   end: 14.2,  label: 'intro'  },
  { start: 14.2,  end: 44.8,  label: 'verse'  },
  { start: 44.8,  end: 75.3,  label: 'chorus' },
  { start: 75.3,  end: 105.9, label: 'verse'  },
  { start: 105.9, end: 136.4, label: 'chorus' },
  { start: 136.4, end: 150.1, label: 'bridge' },
  { start: 150.1, end: 180.6, label: 'chorus' },
  { start: 180.6, end: 214.5, label: 'outro'  },
];

const _beatInterval = 60 / BPM;
const BEATS = (() => {
  const out = [];
  for (let t = 0.25; t < DUR; t += _beatInterval) out.push(+t.toFixed(3));
  return out;
})();
const DOWNBEATS = BEATS.filter((_, i) => i % 4 === 0);

const _chordCycle = [
  { roman: 'i',    chord: 'A:min', tension: 0.22 },
  { roman: 'V',    chord: 'E:maj', tension: 0.24 },
  { roman: 'VI',   chord: 'F:maj', tension: 0.13 },
  { roman: 'III',  chord: 'C:maj', tension: 0.11 },
  { roman: 'iv',   chord: 'D:min', tension: 0.28 },
  { roman: 'bVII', chord: 'G:maj', tension: 0.18 },
];
const CHORDS = (() => {
  const out = [];
  const len = 2.1;
  let i = 0;
  for (let t = 0; t < DUR; t += len, i++) {
    const c = _chordCycle[i % _chordCycle.length];
    out.push({ start: +t.toFixed(2), end: +Math.min(t + len, DUR).toFixed(2), ...c });
  }
  return out;
})();

function noise(i, seed = 1) {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function generateWaveform(n = 720) {
  const peaks = [];
  for (let i = 0; i < n; i++) {
    const tFrac = i / n;
    const t = tFrac * DUR;
    let env = 0.4;
    for (const s of SECTIONS) {
      if (t >= s.start && t < s.end) {
        env = ({ intro: 0.32, verse: 0.55, chorus: 0.88, bridge: 0.72, inst: 0.7, outro: 0.28 })[s.label] || 0.5;
      }
    }
    const wob = 0.7 + 0.3 * Math.sin(tFrac * Math.PI * 2 * 3);
    const v = env * wob * (0.55 + noise(i, 7) * 0.45);
    peaks.push(v);
  }
  return peaks;
}

function timeSeries(n, fn) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const tFrac = i / (n - 1);
    out.push([tFrac * DUR, fn(tFrac, i)]);
  }
  return out;
}
function sectionEnv(tFrac, vals) {
  const t = tFrac * DUR;
  for (const s of SECTIONS) if (t >= s.start && t < s.end) return vals[s.label];
  return 0;
}

const TENSION = timeSeries(240, (f, i) => {
  const base = sectionEnv(f, { intro: 0.18, verse: 0.32, chorus: 0.55, bridge: 0.78, inst: 0.5, outro: 0.15 });
  return Math.max(0, Math.min(1, base + (noise(i, 3) - 0.5) * 0.1));
});
const LUFS = timeSeries(240, (f, i) => {
  const base = sectionEnv(f, { intro: -24, verse: -19, chorus: -13, bridge: -15, inst: -16, outro: -25 });
  return base + (noise(i, 11) - 0.5) * 1.4;
});
const BRIGHT = timeSeries(240, (f, i) => {
  const base = sectionEnv(f, { intro: 1600, verse: 2100, chorus: 2900, bridge: 2400, inst: 2500, outro: 1500 });
  return base + (noise(i, 13) - 0.5) * 280;
});
const DENSITY = timeSeries(240, (f, i) => {
  const base = sectionEnv(f, { intro: 1, verse: 2.5, chorus: 3.8, bridge: 3.2, inst: 3.4, outro: 1.2 });
  return Math.max(0, base + (noise(i, 17) - 0.5) * 0.5);
});

const PITCH_CLASS = {
  '1':  1.00, 'b2': 0.05, '2':  0.42, 'b3': 0.71, '3':  0.08, '4':  0.38,
  'b5': 0.03, '5':  0.65, 'b6': 0.52, '6':  0.11, 'b7': 0.44, '7':  0.06,
};
const AVOID = ['b2', 'b5', '7'];

const STEMS = [
  { id: 'vocals', label: 'vocals',          conf: 0.98, range: { min: 'A3',  max: 'E5',  median: 'D4' } },
  { id: 'drums',  label: 'drum kit',        conf: 0.97 },
  { id: 'bass',   label: 'bass guitar',     conf: 0.92, range: { min: 'E2',  max: 'A3',  median: 'G2' } },
  { id: 'other',  label: 'electric guitar', conf: 0.55, range: { min: 'B3',  max: 'C6',  median: 'E4' } },
];

const SECTION_STATS = [
  { label: 'intro',  instances: 1, lufs: -24.5, bright: 1620, tension: 0.21, density: 1.1, peakRms: 0.041, chordRate: 0.6 },
  { label: 'verse',  instances: 2, lufs: -18.4, bright: 2103, tension: 0.31, density: 2.4, peakRms: 0.071, chordRate: 1.2 },
  { label: 'chorus', instances: 3, lufs: -14.2, bright: 2841, tension: 0.52, density: 3.8, peakRms: 0.124, chordRate: 2.1 },
  { label: 'bridge', instances: 1, lufs: -15.7, bright: 2410, tension: 0.71, density: 3.2, peakRms: 0.098, chordRate: 1.8 },
  { label: 'outro',  instances: 1, lufs: -25.1, bright: 1510, tension: 0.18, density: 1.2, peakRms: 0.038, chordRate: 0.4 },
];

const TRANSPOSE = [
  { semitones: -4, newKey: 'F# minor', range: { min: 'F#3', max: 'C#5' }, voices: ['baritone', 'tenor'] },
  { semitones: -2, newKey: 'G minor',  range: { min: 'G3',  max: 'D5'  }, voices: ['tenor', 'mezzo-soprano'] },
  { semitones:  0, newKey: 'A minor',  range: { min: 'A3',  max: 'E5'  }, voices: ['tenor', 'mezzo-soprano'] },
  { semitones:  2, newKey: 'B minor',  range: { min: 'B3',  max: 'F#5' }, voices: ['mezzo-soprano', 'soprano'] },
  { semitones:  4, newKey: 'C# minor', range: { min: 'C#4', max: 'G#5' }, voices: ['soprano'] },
];

const RECENT = [
  { name: 'cassette-dreams.mp3',   key: 'A min',  bpm: 120, dur: '3:34', when: 'just now',    progress: 100, active: true },
  { name: 'late-night-bus.wav',    key: 'F# min', bpm: 92,  dur: '4:12', when: '2h ago',      progress: 100 },
  { name: 'gull-cry-demo-v3.flac', key: 'D maj',  bpm: 138, dur: '2:48', when: 'yesterday',   progress: 100 },
  { name: 'porch-sketch-04.mp3',   key: 'C# dor', bpm: 76,  dur: '5:08', when: '3 days ago',  progress: 100 },
];

const ANALYSIS = {
  filename: 'cassette-dreams.mp3',
  fileMeta: '8.4 MB · 44.1 kHz · stereo',
  duration: DUR,
  bpm: BPM,
  timeSig: '4/4',
  key: { root: 'A', mode_quality: 'minor', mode_name: 'aeolian', mode_confidence: 0.74, key_confidence: 0.81 },
  progressionFingerprint: 'i — V — VI — III',
  sections: SECTIONS,
  beats: BEATS,
  downbeats: DOWNBEATS,
  chords: CHORDS,
  waveform: generateWaveform(720),
  tension: TENSION,
  lufs: LUFS,
  brightness: BRIGHT,
  density: DENSITY,
  pitchClass: PITCH_CLASS,
  avoidNotes: AVOID,
  stems: STEMS,
  sectionStats: SECTION_STATS,
  transpose: TRANSPOSE,
};

function fmtTime(s) {
  s = Math.max(0, s);
  const m = Math.floor(s / 60);
  const r = Math.floor(s - m * 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
}
function pctOf(t) { return (t / ANALYSIS.duration) * 100; }

const INTERVAL_NAMES = {
  '1': 'root', 'b2': 'minor 2nd', '2': 'major 2nd', 'b3': 'minor 3rd',
  '3': 'major 3rd', '4': 'perfect 4th', 'b5': 'tritone', '5': 'perfect 5th',
  'b6': 'minor 6th', '6': 'major 6th', 'b7': 'minor 7th', '7': 'major 7th',
};

Object.assign(window, {
  ANALYSIS, SECTION_PALETTE, sectionVar, RECENT, INTERVAL_NAMES, fmtTime, pctOf,
});
