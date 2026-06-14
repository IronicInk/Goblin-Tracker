'use strict';

/* ============================================================
   SERVICE WORKER
   ============================================================ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

/* ============================================================
   HAPTIC FEEDBACK
   ============================================================ */
function haptic(ms = 6) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
}

/* ============================================================
   COMMANDERS
   ============================================================ */
const PIP_COLORS = {
  R: '#e03020', G: '#20a040', W: '#d8d0b0',
  B: '#706878', U: '#2060d0', '?': '#c8882a',
};

const COMMANDERS = [
  {
    id: 'krenko',
    name: 'Krenko, Mob Boss',
    type: 'Goblin Warrior — 3/3',
    ability: 'Tap: Create X 1/1 Red Goblin tokens where X = Goblins you control',
    tapLabel: 'TAP KRENKO',
    tapType: 'x-total',
    tapCount: 1,
    tokenName: 'Goblin',
    accent: '#f07030', accentDk: '#c04010', accentDim: 'rgba(240,112,48,0.15)',
    pips: ['R'], stats: '3/3',
  },
  {
    id: 'rhys',
    name: 'Rhys the Redeemed',
    type: 'Elf Warrior — 1/1',
    ability: '{6}{G}{W}: Create a copy of each token you control, doubling your entire board',
    tapLabel: 'TAP RHYS',
    tapType: 'double',
    tapCount: 1,
    tokenName: 'Elf',
    accent: '#40b060', accentDk: '#208040', accentDim: 'rgba(64,176,96,0.15)',
    pips: ['G', 'W'], stats: '1/1',
  },
  {
    id: 'edgar',
    name: 'Edgar Markov',
    type: 'Vampire Knight — 4/4',
    ability: 'Eminence: Whenever you cast a Vampire spell, create a 1/1 white Vampire token',
    tapLabel: 'CAST A VAMPIRE',
    tapType: 'fixed',
    tapCount: 1,
    tokenName: 'Vampire',
    accent: '#9050c0', accentDk: '#6030a0', accentDim: 'rgba(144,80,192,0.15)',
    pips: ['W', 'B', 'R'], stats: '4/4',
  },
  {
    id: 'chatterfang',
    name: 'Chatterfang',
    type: 'Squirrel Warrior — 3/3',
    ability: 'Tap: Create X 1/1 Green Squirrel tokens where X = tokens you control',
    tapLabel: 'TAP CHATTERFANG',
    tapType: 'x-total',
    tapCount: 1,
    tokenName: 'Squirrel',
    accent: '#80b020', accentDk: '#508010', accentDim: 'rgba(128,176,32,0.15)',
    pips: ['G'], stats: '3/3',
  },
  {
    id: 'thalisse',
    name: 'Thalisse, Reverent Medium',
    type: 'Human Cleric — 3/4',
    ability: 'End of turn: Create X 1/1 flying Spirit tokens (X = tokens created this turn)',
    tapLabel: 'END TURN TRIGGER',
    tapType: 'fixed',
    tapCount: 2,
    tokenName: 'Spirit',
    accent: '#c090e0', accentDk: '#9060c0', accentDim: 'rgba(192,144,224,0.15)',
    pips: ['W', 'B'], stats: '3/4',
  },
  {
    id: 'custom',
    name: 'Custom Commander',
    type: 'Build your own',
    ability: 'Track any token strategy with a commander of your choice',
    tapLabel: 'TAP COMMANDER',
    tapType: 'fixed',
    tapCount: 1,
    tokenName: 'Token',
    accent: '#c8882a', accentDk: '#906010', accentDim: 'rgba(200,136,42,0.15)',
    pips: ['?'], stats: '?/?',
  },
];

/* ============================================================
   PRESET TOKENS
   ============================================================ */
const PRESET_TOKENS = [
  { name: 'Goblin',    atk: 1, def: 1 },
  { name: 'Zombie',    atk: 2, def: 2 },
  { name: 'Soldier',   atk: 1, def: 1 },
  { name: 'Dragon',    atk: 5, def: 5 },
  { name: 'Saproling', atk: 1, def: 1 },
  { name: 'Spirit',    atk: 1, def: 1 },
  { name: 'Wolf',      atk: 2, def: 2 },
  { name: 'Elemental', atk: 3, def: 1 },
  { name: 'Human',     atk: 1, def: 1 },
  { name: 'Vampire',   atk: 1, def: 1 },
  { name: 'Insect',    atk: 1, def: 1 },
  { name: 'Treasure',  atk: 0, def: 0 },
];

/* ============================================================
   STATE + PERSISTENCE
   ============================================================ */
const STATE_KEY = 'mythicaltrack_v2';

const state = {
  commander: null,
  goblinsReady: 0,
  goblinsSick: 0,
  goblinsHasted: 0,
  goblinAtk: 1,
  goblinDef: 1,
  hasteMode: false,
  custom: [],
};

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.commander?.id)                state.commander    = saved.commander;
    if (typeof saved.goblinsReady   === 'number') state.goblinsReady   = saved.goblinsReady;
    if (typeof saved.goblinsSick    === 'number') state.goblinsSick    = saved.goblinsSick;
    if (typeof saved.goblinsHasted  === 'number') state.goblinsHasted  = saved.goblinsHasted;
    if (typeof saved.goblinAtk    === 'number') state.goblinAtk    = saved.goblinAtk;
    if (typeof saved.goblinDef    === 'number') state.goblinDef    = saved.goblinDef;
    if (typeof saved.hasteMode    === 'boolean') state.hasteMode   = saved.hasteMode;
    if (Array.isArray(saved.custom)) {
      // Migrate old `count` field to ready/sick shape
      state.custom = saved.custom.map(t => ({
        name:  t.name  || 'Token',
        tag:   t.tag   || 'Token',
        ready: typeof t.ready === 'number' ? t.ready : (t.count || 0),
        sick:  typeof t.sick  === 'number' ? t.sick  : 0,
        atk:   typeof t.atk   === 'number' ? t.atk   : 1,
        def:   typeof t.def   === 'number' ? t.def   : 1,
      }));
    }
  } catch (e) {}
}

/* ============================================================
   HELPERS
   ============================================================ */
function goblinTotal() {
  return state.goblinsReady + state.goblinsSick + state.goblinsHasted;
}

function darken(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * 0.65)},${Math.round(g * 0.65)},${Math.round(b * 0.65)})`;
}


/* ============================================================
   SCREEN MANAGEMENT
   ============================================================ */
function showScreen(id) {
  document.getElementById('selectScreen').hidden = id !== 'select';
  document.getElementById('gameScreen').hidden   = id !== 'game';
}

/* ============================================================
   APPLY COMMANDER THEME
   ============================================================ */
function applyCommanderTheme(cmd) {
  const root = document.documentElement;
  root.style.setProperty('--cmd-color',    cmd.accent);
  root.style.setProperty('--cmd-color-dk', cmd.accentDk || darken(cmd.accent));
  root.style.setProperty('--cmd-dim',      cmd.accentDim);
  document.getElementById('commanderName').textContent    = cmd.name;
  document.getElementById('commanderAbility').textContent = cmd.ability;
  document.getElementById('tapBtnLabel').textContent      = `⚡ ${cmd.tapLabel}`;
  document.getElementById('poolTotalLabel').textContent   = `Total ${cmd.tokenName}s`;
}

/* ============================================================
   COMMANDER SELECTION SCREEN
   ============================================================ */
function renderCommanderGrid() {
  const grid = document.getElementById('commanderGrid');
  grid.innerHTML = COMMANDERS.map(cmd => {
    const pips = cmd.pips.map(p =>
      `<span class="pip" style="background:${PIP_COLORS[p] || '#888'}" title="${p}"></span>`
    ).join('');
    return `
      <div class="cmd-card" data-cmd-id="${cmd.id}" role="listitem" tabindex="0"
           style="--accent-color:${cmd.accent}; --accent-dim:${cmd.accentDim}"
           aria-label="Select ${cmd.name}">
        <div class="cmd-card__bar"></div>
        <div class="cmd-card__body">
          <div class="cmd-card__header">
            <span class="cmd-card__name">${cmd.name}</span>
            <span class="cmd-card__stats">${cmd.stats}</span>
          </div>
          <span class="cmd-card__type">${cmd.type}</span>
          <p class="cmd-card__ability">${cmd.ability}</p>
          <div class="cmd-card__footer">
            <span class="cmd-card__token">Token: ${cmd.tokenName}</span>
            <div class="cmd-card__pips">${pips}</div>
          </div>
        </div>
        <div class="cmd-card__arrow">›</div>
      </div>`;
  }).join('');
}

document.getElementById('commanderGrid').addEventListener('click', e => {
  const card = e.target.closest('.cmd-card');
  if (!card) return;
  haptic(8);
  if (card.dataset.cmdId === 'custom') { openCustomCmdModal(); return; }
  startGame(COMMANDERS.find(c => c.id === card.dataset.cmdId));
});

document.getElementById('commanderGrid').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') e.target.closest('.cmd-card')?.click();
});

/* ============================================================
   CUSTOM COMMANDER MODAL
   ============================================================ */
const customCmdModal = document.getElementById('customCmdModal');
let customTapCount = 1;

function openCustomCmdModal() {
  document.getElementById('customCmdName').value   = '';
  document.getElementById('customTokenName').value = '';
  customTapCount = 1;
  document.getElementById('customTapVal').textContent = '1';
  customCmdModal.classList.add('open');
  setTimeout(() => document.getElementById('customCmdName').focus(), 120);
}
function closeCustomCmdModal() { customCmdModal.classList.remove('open'); }

document.getElementById('customCmdCancel').addEventListener('click', closeCustomCmdModal);
customCmdModal.addEventListener('click', e => { if (e.target === customCmdModal) closeCustomCmdModal(); });

document.getElementById('customTapMinus').addEventListener('click', () => {
  haptic(6);
  customTapCount = Math.max(1, customTapCount - 1);
  document.getElementById('customTapVal').textContent = customTapCount;
});
document.getElementById('customTapPlus').addEventListener('click', () => {
  haptic(6);
  customTapCount = Math.min(10, customTapCount + 1);
  document.getElementById('customTapVal').textContent = customTapCount;
});

document.getElementById('customCmdConfirm').addEventListener('click', () => {
  const name  = document.getElementById('customCmdName').value.trim()   || 'Custom Commander';
  const token = document.getElementById('customTokenName').value.trim() || 'Token';
  const base  = COMMANDERS.find(c => c.id === 'custom');
  closeCustomCmdModal();
  startGame({ ...base, name, tokenName: token, tapCount: customTapCount });
});

/* ============================================================
   START GAME
   ============================================================ */
function startGame(cmd) {
  state.commander = cmd;
  applyCommanderTheme(cmd);
  showScreen('game');
  render();
  showOnboarding();
}

function goToSelectScreen() {
  renderCommanderGrid();
  showScreen('select');
}

document.getElementById('changeCommanderBtn').addEventListener('click', goToSelectScreen);

/* ============================================================
   RENDER
   ============================================================ */
const appEl = document.querySelector('.app');

function render() {
  renderGoblins();
  renderTokens();
  renderHasteToggle();
  appEl.classList.toggle('no-tokens', state.custom.length === 0);
  saveState();
}

function renderGoblins() {
  const total = goblinTotal();
  const cmd   = state.commander;

  const hastedDisplay = state.hasteMode
    ? state.goblinsReady + state.goblinsSick + state.goblinsHasted
    : state.goblinsHasted;
  document.getElementById('goblinsReady').textContent  = state.goblinsReady;
  document.getElementById('goblinsHasted').textContent = hastedDisplay;
  document.getElementById('goblinsSick').textContent   = state.goblinsSick;
  document.getElementById('goblinTotal').textContent  = total;
  document.getElementById('goblinAtk').textContent    = state.goblinAtk;
  document.getElementById('goblinDef').textContent    = state.goblinDef;

  const btn  = document.getElementById('tapKrenkoBtn');
  const hint = document.getElementById('tapHint');
  btn.disabled = total === 0;

  if (total === 0 || !cmd) { hint.textContent = 'add tokens first'; return; }

  if (cmd.tapType === 'x-total')  hint.textContent = `+${total} ${cmd.tokenName}s`;
  else if (cmd.tapType === 'double') hint.textContent = `×2 — doubles all tokens`;
  else {
    const n = cmd.tapCount;
    hint.textContent = `+${n} ${cmd.tokenName}${n > 1 ? 's' : ''}`;
  }
}

function tokenCardHTML(t, idxAttr, removeIdx) {
  const tagClass = (t.tag || 'token').toLowerCase();
  const total    = t.ready + t.sick;
  return `
    <div class="token-card">
      <div class="token-card-header">
        <span class="token-name">${t.name}</span>
        <span class="token-tag ${tagClass}">${t.tag}</span>
      </div>
      <div class="token-card-body">
        <div class="token-stats">
          <div class="stat-block">
            <span class="stat-label">⚔ Attack</span>
            <div class="stepper">
              <button class="stat-btn stepper-btn" ${idxAttr} data-stat="atk" data-d="1" aria-label="Increase attack">+</button>
              <span class="stat-value">${t.atk}</span>
              <button class="stat-btn stepper-btn" ${idxAttr} data-stat="atk" data-d="-1" aria-label="Decrease attack">−</button>
            </div>
          </div>
          <div class="stat-divider">/</div>
          <div class="stat-block">
            <span class="stat-label">🛡 Defense</span>
            <div class="stepper">
              <button class="stat-btn stepper-btn" ${idxAttr} data-stat="def" data-d="1" aria-label="Increase defense">+</button>
              <span class="stat-value">${t.def}</span>
              <button class="stat-btn stepper-btn" ${idxAttr} data-stat="def" data-d="-1" aria-label="Decrease defense">−</button>
            </div>
          </div>
        </div>
      </div>
      <div class="token-card-footer">
        <div class="token-footer-top">
          <span class="token-total-label">Total: <span class="token-total-num">${total}</span></span>
          <button class="btn-remove" data-ri="${removeIdx}" aria-label="Remove ${t.name} token">×</button>
        </div>
        <div class="token-pools">
          <div class="token-pool token-pool--ready">
            <span class="token-pool__label">Ready</span>
            <div class="stepper">
              <button class="stepper-btn" ${idxAttr} data-pool="ready" data-d="1" aria-label="Add ready">+</button>
              <span class="token-pool__count">${t.ready}</span>
              <button class="stepper-btn" ${idxAttr} data-pool="ready" data-d="-1" aria-label="Remove ready">−</button>
            </div>
          </div>
          <div class="token-pool token-pool--sick">
            <span class="token-pool__label">Sick</span>
            <div class="stepper">
              <button class="stepper-btn" ${idxAttr} data-pool="sick" data-d="1" aria-label="Add sick">+</button>
              <span class="token-pool__count">${t.sick}</span>
              <button class="stepper-btn" ${idxAttr} data-pool="sick" data-d="-1" aria-label="Remove sick">−</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderTokens() {
  document.getElementById('tokensGrid').innerHTML = state.custom
    .map((t, i) => tokenCardHTML(t, `data-ci="${i}"`, i))
    .join('');
}

/* ============================================================
   GOBLIN / TOKEN POOL ADJUSTERS
   ============================================================ */
document.getElementById('readyMinus').addEventListener('click', () => {
  haptic(6);
  if (state.goblinsReady === 0) return;
  state.goblinsReady--;
  render();
});
document.getElementById('readyPlus').addEventListener('click', () => {
  haptic(6);
  state.goblinsReady++;
  render();
});
document.getElementById('hastedMinus').addEventListener('click', () => {
  haptic(6);
  if (state.hasteMode) {
    if      (state.goblinsHasted > 0) state.goblinsHasted--;
    else if (state.goblinsSick   > 0) state.goblinsSick--;
    else if (state.goblinsReady  > 0) state.goblinsReady--;
    else return;
  } else {
    if (state.goblinsHasted === 0) return;
    state.goblinsHasted--;
  }
  render();
});
document.getElementById('hastedPlus').addEventListener('click', () => {
  haptic(6);
  state.goblinsHasted++;
  render();
});
document.getElementById('sickMinus').addEventListener('click', () => {
  haptic(6);
  if (state.goblinsSick === 0) return;
  state.goblinsSick--;
  render();
});
document.getElementById('sickPlus').addEventListener('click', () => {
  haptic(6);
  state.goblinsSick++;
  render();
});

/* ============================================================
   ATK / DEF
   ============================================================ */
document.getElementById('goblinAtkMinus').addEventListener('click', () => {
  haptic(6);
  state.goblinAtk = Math.max(0, state.goblinAtk - 1);
  renderGoblins(); saveState();
});
document.getElementById('goblinAtkPlus').addEventListener('click', () => {
  haptic(6);
  state.goblinAtk++;
  renderGoblins(); saveState();
});
document.getElementById('goblinDefMinus').addEventListener('click', () => {
  haptic(6);
  state.goblinDef = Math.max(0, state.goblinDef - 1);
  renderGoblins(); saveState();
});
document.getElementById('goblinDefPlus').addEventListener('click', () => {
  haptic(6);
  state.goblinDef++;
  renderGoblins(); saveState();
});

/* ============================================================
   BOARD WIPE — opens confirmation modal
   ============================================================ */
const wipeModal = document.getElementById('wipeModal');

document.getElementById('boardWipeBtn').addEventListener('click', () => {
  if (goblinTotal() === 0) return;
  haptic(8);
  wipeModal.classList.add('open');
});

document.getElementById('wipeModalCancel').addEventListener('click', () => {
  wipeModal.classList.remove('open');
});

wipeModal.addEventListener('click', e => {
  if (e.target === wipeModal) wipeModal.classList.remove('open');
});

document.getElementById('wipeModalConfirm').addEventListener('click', () => {
  haptic(25);
  state.goblinsReady  = 0;
  state.goblinsSick   = 0;
  state.goblinsHasted = 0;
  wipeModal.classList.remove('open');
  render();
});

/* ============================================================
   HASTE TOGGLE
   When ON, tapping the commander routes new tokens to Ready
   instead of Sick — for when players have haste effects in play.
   ============================================================ */
const hasteToggleBtn = document.getElementById('hasteToggle');

function renderHasteToggle() {
  const on = state.hasteMode;
  hasteToggleBtn.setAttribute('aria-pressed', String(on));
  document.getElementById('hasteTarget').textContent = on ? '⚡ Hasted' : 'Sick';
  document.getElementById('goblinPools').classList.toggle('goblin-pools--haste', on);
}

hasteToggleBtn.addEventListener('click', () => {
  haptic(6);
  const wasOn = state.hasteMode;
  state.hasteMode = !state.hasteMode;
  if (wasOn) {
    // Turning haste OFF — only newly hasted tokens fall to sick; ready stays ready
    state.goblinsSick  += state.goblinsHasted;
    state.goblinsHasted = 0;
  }
  // Turning haste ON — don't move tokens, just change the display
  render();
});

/* ============================================================
   NEW TURN
   Graduates Sick → Ready on the main pool AND all token cards.
   ============================================================ */
document.getElementById('newTurnBtn').addEventListener('click', () => {
  haptic(12);
  state.goblinsReady  += state.goblinsSick + state.goblinsHasted;
  state.goblinsSick    = 0;
  state.goblinsHasted  = 0;
  // Graduate all token card sick pools too
  state.custom.forEach(t => {
    t.ready += t.sick;
    t.sick   = 0;
  });
  render();
});

/* ============================================================
   TAP COMMANDER
   Haste mode routes new tokens to Ready instead of Sick.
   ============================================================ */
document.getElementById('tapKrenkoBtn').addEventListener('click', () => {
  const total = goblinTotal();
  if (total === 0) return;
  haptic(15);
  const { tapType, tapCount } = state.commander;
  const pool = state.hasteMode ? 'goblinsHasted' : 'goblinsSick';
  const tokenPool = state.hasteMode ? 'ready' : 'sick';

  if (tapType === 'x-total') {
    state[pool] += total;
  } else if (tapType === 'double') {
    state[pool] += state.goblinsReady + state.goblinsSick + state.goblinsHasted;
    state.custom.forEach(t => { t[tokenPool] += t.ready + t.sick; });
  } else {
    state[pool] += tapCount || 1;
  }
  render();
});

/* ============================================================
   EVENT DELEGATION — TOKENS GRID
   ============================================================ */
document.getElementById('tokensGrid').addEventListener('click', e => {
  haptic(6);

  // Ready/Sick pool buttons on token cards
  const poolBtn = e.target.closest('[data-ci][data-pool][data-d]');
  if (poolBtn) {
    const token = state.custom[+poolBtn.dataset.ci];
    const pool  = poolBtn.dataset.pool;
    token[pool] = Math.max(0, token[pool] + (+poolBtn.dataset.d));
    render();
    return;
  }

  // Stat (atk/def) buttons
  const statBtn = e.target.closest('[data-ci][data-stat][data-d]');
  if (statBtn) {
    const token = state.custom[+statBtn.dataset.ci];
    const stat  = statBtn.dataset.stat;
    token[stat] = Math.max(0, token[stat] + (+statBtn.dataset.d));
    render();
    return;
  }

  // Remove button
  const rBtn = e.target.closest('[data-ri]');
  if (rBtn) {
    haptic(10);
    state.custom.splice(+rBtn.dataset.ri, 1);
    render();
  }
});

/* ============================================================
   ADD TOKEN MODAL
   ============================================================ */
const addModal   = document.getElementById('addModal');
const tokenInput = document.getElementById('tokenNameInput');
let modalAtk = 1;
let modalDef = 1;

function renderPresetChips() {
  document.getElementById('presetTokenGrid').innerHTML = PRESET_TOKENS
    .map(t => `
      <button class="preset-chip" data-name="${t.name}" data-atk="${t.atk}" data-def="${t.def}" aria-label="Add ${t.name} token">
        <span class="preset-chip__name">${t.name}</span>
        <span class="preset-chip__pt">${t.atk}/${t.def}</span>
      </button>`)
    .join('');
}

function openAddModal() {
  tokenInput.value = '';
  modalAtk = 1; modalDef = 1;
  document.getElementById('modalAtkVal').textContent = '1';
  document.getElementById('modalDefVal').textContent = '1';
  renderPresetChips();
  addModal.classList.add('open');
  setTimeout(() => tokenInput.focus(), 120);
}
function closeAddModal() { addModal.classList.remove('open'); }

document.getElementById('addTokenBtn').addEventListener('click', openAddModal);
document.getElementById('addModalCancel').addEventListener('click', closeAddModal);
addModal.addEventListener('click', e => { if (e.target === addModal) closeAddModal(); });

document.getElementById('presetTokenGrid').addEventListener('click', e => {
  const chip = e.target.closest('.preset-chip');
  if (!chip) return;
  haptic(8);
  state.custom.push({ name: chip.dataset.name, tag: 'Token', ready: 0, sick: 0, atk: +chip.dataset.atk, def: +chip.dataset.def });
  closeAddModal();
  render();
});

document.getElementById('modalAtkMinus').addEventListener('click', () => { haptic(6); modalAtk = Math.max(0, modalAtk - 1); document.getElementById('modalAtkVal').textContent = modalAtk; });
document.getElementById('modalAtkPlus').addEventListener('click', ()  => { haptic(6); modalAtk++; document.getElementById('modalAtkVal').textContent = modalAtk; });
document.getElementById('modalDefMinus').addEventListener('click', () => { haptic(6); modalDef = Math.max(0, modalDef - 1); document.getElementById('modalDefVal').textContent = modalDef; });
document.getElementById('modalDefPlus').addEventListener('click', ()  => { haptic(6); modalDef++; document.getElementById('modalDefVal').textContent = modalDef; });

document.getElementById('addModalConfirm').addEventListener('click', () => {
  const name = tokenInput.value.trim();
  if (!name) { tokenInput.focus(); return; }
  haptic(8);
  state.custom.push({ name, tag: 'Custom', ready: 0, sick: 0, atk: modalAtk, def: modalDef });
  closeAddModal();
  render();
});

tokenInput.addEventListener('keydown', e => {
  if (e.key === 'Enter')  document.getElementById('addModalConfirm').click();
  if (e.key === 'Escape') closeAddModal();
});

/* ============================================================
   RESET / NEW GAME
   ============================================================ */
const resetModal = document.getElementById('resetModal');

document.getElementById('resetBtn').addEventListener('click', () => resetModal.classList.add('open'));
document.getElementById('resetModalCancel').addEventListener('click', () => resetModal.classList.remove('open'));
resetModal.addEventListener('click', e => { if (e.target === resetModal) resetModal.classList.remove('open'); });

document.getElementById('resetModalConfirm').addEventListener('click', () => {
  haptic(20);
  state.commander     = null;
  state.goblinsReady  = 0;
  state.goblinsSick   = 0;
  state.goblinsHasted = 0;
  state.goblinAtk     = 1;
  state.goblinDef     = 1;
  state.hasteMode     = false;
  state.custom        = [];
  resetModal.classList.remove('open');
  saveState();
  goToSelectScreen();
});

/* ============================================================
   ONBOARDING + TUTORIAL
   ============================================================ */
const ONBOARD_KEY  = 'mythicaltrack_onboarded';
const onboardModal = document.getElementById('onboardModal');

function showOnboarding() {
  if (localStorage.getItem(ONBOARD_KEY)) return;
  onboardModal.classList.add('open');
}
function openTutorial()  { onboardModal.classList.add('open'); }
function closeTutorial() { onboardModal.classList.remove('open'); }

document.getElementById('onboardDone').addEventListener('click', () => {
  localStorage.setItem(ONBOARD_KEY, '1');
  closeTutorial();
});
document.getElementById('onboardClose').addEventListener('click', closeTutorial);

/* ============================================================
   HAMBURGER MENU
   ============================================================ */
const hamburgerBtn  = document.getElementById('hamburgerBtn');
const hamburgerMenu = document.getElementById('hamburgerMenu');

function closeHamburger() {
  hamburgerMenu.hidden = true;
  hamburgerBtn.setAttribute('aria-expanded', 'false');
}

hamburgerBtn.addEventListener('click', e => {
  e.stopPropagation();
  haptic(6);
  const isOpen = !hamburgerMenu.hidden;
  hamburgerMenu.hidden = isOpen;
  hamburgerBtn.setAttribute('aria-expanded', String(!isOpen));
});

document.addEventListener('click', closeHamburger);

document.getElementById('menuTutorial').addEventListener('click', () => {
  closeHamburger();
  openTutorial();
});

/* ============================================================
   SPLASH SCREEN
   ============================================================ */
const splashEl = document.getElementById('splashScreen');
let splashDone = false;

function dismissSplash() {
  if (splashDone) return;
  splashDone = true;
  splashEl.classList.add('splash--exit');
  splashEl.addEventListener('animationend', () => { splashEl.hidden = true; }, { once: true });
}

splashEl.addEventListener('click', dismissSplash);
setTimeout(dismissSplash, 10000);

/* ============================================================
   INIT
   ============================================================ */
loadState();
renderCommanderGrid();
showScreen('select');
