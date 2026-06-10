'use strict';

/* ============================================================
   SERVICE WORKER REGISTRATION (PWA)
   ============================================================ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

/* ============================================================
   STATE
   ============================================================ */
const state = {
  goblinsReady: 0,
  goblinsSick:  0,
  goblinAtk: 1,
  goblinDef: 1,
  custom: [],
};

/* ============================================================
   HELPERS
   ============================================================ */
function goblinTotal() {
  return state.goblinsReady + state.goblinsSick;
}

/* ============================================================
   RENDER
   ============================================================ */
const appEl = document.querySelector('.app');

function render() {
  renderGoblins();
  renderTokens();
  appEl.classList.toggle('no-tokens', state.custom.length === 0);
}

function renderGoblins() {
  const total = goblinTotal();
  document.getElementById('goblinsReady').textContent = state.goblinsReady;
  document.getElementById('goblinsSick').textContent  = state.goblinsSick;
  document.getElementById('goblinTotal').textContent  = total;
  document.getElementById('goblinAtk').textContent    = state.goblinAtk;
  document.getElementById('goblinDef').textContent    = state.goblinDef;
  const btn = document.getElementById('tapKrenkoBtn');
  document.getElementById('tapHint').textContent = total === 0 ? 'add goblins first' : `+${total} goblins`;
  btn.disabled = total === 0;
}

function tokenCardHTML(t, idxAttr, removeIdx) {
  return `
    <div class="token-card">
      <div class="token-card-header">
        <span class="token-name">${t.name}</span>
        <span class="token-tag custom">${t.tag}</span>
      </div>
      <div class="token-card-body">
        <div class="token-stats">
          <div class="stat-block">
            <span class="stat-label">⚔ Attack</span>
            <div class="stepper">
              <button class="stat-btn stepper-btn" ${idxAttr} data-stat="atk" data-d="1">+</button>
              <span class="stat-value">${t.atk}</span>
              <button class="stat-btn stepper-btn" ${idxAttr} data-stat="atk" data-d="-1">−</button>
            </div>
          </div>
          <div class="stat-divider">/</div>
          <div class="stat-block">
            <span class="stat-label">🛡 Defense</span>
            <div class="stepper">
              <button class="stat-btn stepper-btn" ${idxAttr} data-stat="def" data-d="1">+</button>
              <span class="stat-value">${t.def}</span>
              <button class="stat-btn stepper-btn" ${idxAttr} data-stat="def" data-d="-1">−</button>
            </div>
          </div>
        </div>
      </div>
      <div class="token-card-footer">
        <div class="footer-header">
          <span class="count-label">Tokens</span>
          <button class="btn-remove" data-ri="${removeIdx}" title="Remove">×</button>
        </div>
        <div class="stepper">
          <button class="adj-btn stepper-btn" ${idxAttr} data-d="1">+</button>
          <span class="token-count">${t.count}</span>
          <button class="adj-btn stepper-btn" ${idxAttr} data-d="-1">−</button>
        </div>
      </div>
    </div>`;
}

function renderTokens() {
  document.getElementById('tokensGrid').innerHTML = state.custom.map((t, i) =>
    tokenCardHTML(t, `data-ci="${i}"`, i)
  ).join('');
}

/* ============================================================
   GOBLIN READY / SICK ADJUSTERS
   ============================================================ */
document.getElementById('readyMinus').addEventListener('click', () => {
  if (state.goblinsReady === 0) return;
  state.goblinsReady--;
  render();
});
document.getElementById('readyPlus').addEventListener('click', () => {
  state.goblinsReady++;
  render();
});
document.getElementById('sickMinus').addEventListener('click', () => {
  if (state.goblinsSick === 0) return;
  state.goblinsSick--;
  render();
});
document.getElementById('sickPlus').addEventListener('click', () => {
  state.goblinsSick++;
  render();
});

/* ============================================================
   GOBLIN ATK / DEF
   ============================================================ */
document.getElementById('goblinAtkMinus').addEventListener('click', () => {
  state.goblinAtk = Math.max(0, state.goblinAtk - 1);
  renderGoblins();
});
document.getElementById('goblinAtkPlus').addEventListener('click', () => {
  state.goblinAtk++;
  renderGoblins();
});
document.getElementById('goblinDefMinus').addEventListener('click', () => {
  state.goblinDef = Math.max(0, state.goblinDef - 1);
  renderGoblins();
});
document.getElementById('goblinDefPlus').addEventListener('click', () => {
  state.goblinDef++;
  renderGoblins();
});

/* ============================================================
   BOARD WIPE
   ============================================================ */
document.getElementById('boardWipeBtn').addEventListener('click', () => {
  if (goblinTotal() === 0) return;
  state.goblinsReady = 0;
  state.goblinsSick  = 0;
  render();
});

/* ============================================================
   NEW TURN — graduate sick goblins to ready
   ============================================================ */
document.getElementById('newTurnBtn').addEventListener('click', () => {
  state.goblinsReady += state.goblinsSick;
  state.goblinsSick   = 0;
  render();
});

/* ============================================================
   KRENKO TAP — creates total goblins, all go to Sick
   ============================================================ */
document.getElementById('tapKrenkoBtn').addEventListener('click', () => {
  const total = goblinTotal();
  if (total === 0) return;
  state.goblinsSick += total;
  render();
});

/* ============================================================
   EVENT DELEGATION — TOKENS GRID
   ============================================================ */
document.getElementById('tokensGrid').addEventListener('click', e => {

  const cCountBtn = e.target.closest('[data-ci][data-d]:not([data-stat])');
  if (cCountBtn) {
    const token = state.custom[+cCountBtn.dataset.ci];
    token.count = Math.max(0, token.count + (+cCountBtn.dataset.d));
    render();
    return;
  }

  const cStatBtn = e.target.closest('[data-ci][data-stat]');
  if (cStatBtn) {
    const token = state.custom[+cStatBtn.dataset.ci];
    const stat  = cStatBtn.dataset.stat;
    token[stat] = Math.max(0, token[stat] + (+cStatBtn.dataset.d));
    render();
    return;
  }

  const rBtn = e.target.closest('[data-ri]');
  if (rBtn) {
    state.custom.splice(+rBtn.dataset.ri, 1);
    render();
  }
});

/* ============================================================
   ADD CUSTOM TOKEN MODAL
   ============================================================ */
const addModal   = document.getElementById('addModal');
const tokenInput = document.getElementById('tokenNameInput');
let modalAtk = 1;
let modalDef = 1;

function openAddModal() {
  tokenInput.value = '';
  modalAtk = 1;
  modalDef = 1;
  document.getElementById('modalAtkVal').textContent = '1';
  document.getElementById('modalDefVal').textContent = '1';
  addModal.classList.add('open');
  setTimeout(() => tokenInput.focus(), 120);
}
function closeAddModal() { addModal.classList.remove('open'); }

document.getElementById('addTokenBtn').addEventListener('click', openAddModal);
document.getElementById('addModalCancel').addEventListener('click', closeAddModal);
addModal.addEventListener('click', e => { if (e.target === addModal) closeAddModal(); });

document.getElementById('modalAtkMinus').addEventListener('click', () => {
  modalAtk = Math.max(0, modalAtk - 1);
  document.getElementById('modalAtkVal').textContent = modalAtk;
});
document.getElementById('modalAtkPlus').addEventListener('click', () => {
  modalAtk++;
  document.getElementById('modalAtkVal').textContent = modalAtk;
});
document.getElementById('modalDefMinus').addEventListener('click', () => {
  modalDef = Math.max(0, modalDef - 1);
  document.getElementById('modalDefVal').textContent = modalDef;
});
document.getElementById('modalDefPlus').addEventListener('click', () => {
  modalDef++;
  document.getElementById('modalDefVal').textContent = modalDef;
});

document.getElementById('addModalConfirm').addEventListener('click', () => {
  const name = tokenInput.value.trim();
  if (!name) return;
  state.custom.push({ name, tag: 'Custom', count: 0, atk: modalAtk, def: modalDef });
  closeAddModal();
  render();
});

tokenInput.addEventListener('keydown', e => {
  if (e.key === 'Enter')  document.getElementById('addModalConfirm').click();
  if (e.key === 'Escape') closeAddModal();
});

/* ============================================================
   RESET / NEW GAME MODAL
   ============================================================ */
const resetModal = document.getElementById('resetModal');

document.getElementById('resetBtn').addEventListener('click', () => resetModal.classList.add('open'));
document.getElementById('resetModalCancel').addEventListener('click', () => resetModal.classList.remove('open'));
resetModal.addEventListener('click', e => { if (e.target === resetModal) resetModal.classList.remove('open'); });

document.getElementById('resetModalConfirm').addEventListener('click', () => {
  state.goblinsReady = 0;
  state.goblinsSick  = 0;
  state.goblinAtk    = 1;
  state.goblinDef    = 1;
  state.custom       = [];
  resetModal.classList.remove('open');
  render();
});

/* ============================================================
   INIT
   ============================================================ */
render();
