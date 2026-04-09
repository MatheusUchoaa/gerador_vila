/* ========================================
   Gerador de Times da Vila v3.0
   Script otimizado para performance
   ======================================== */

// --- Config ---
const API_BASE_URL = 'http://localhost:5000';
const DEBUG = false;
const log = (...args) => { if (DEBUG) console.log(...args); };

// --- State ---
let players = JSON.parse(localStorage.getItem('players')) || [];
let savedPlayers = JSON.parse(localStorage.getItem('savedPlayers')) || [];
let currentTeams = null;
let apiConnected = false;

// --- DOM Cache ---
const $ = (sel) => document.getElementById(sel) || document.querySelector(sel);
const el = {
  form: null, idInput: null, nameInput: null, list: null, teamOutput: null,
  generateBtn: null, regenerateBtn: null, clearBtn: null, countEl: null,
  savedList: null, submitBtn: null, cancelEditBtn: null, toggleSavedBtn: null,
  reloadFirebaseBtn: null, searchInput: null, clearSearchBtn: null,
};

function cacheDom() {
  el.form = $('player-form');
  el.idInput = $('player-id');
  el.nameInput = $('player-name');
  el.list = $('player-list');
  el.teamOutput = $('team-output');
  el.generateBtn = $('generate-team');
  el.regenerateBtn = $('regenerate-team');
  el.clearBtn = $('clear-players');
  el.countEl = $('player-count');
  el.savedList = $('saved-players-list');
  el.submitBtn = $('submit-button');
  el.cancelEditBtn = $('cancel-edit');
  el.toggleSavedBtn = $('toggle-saved-players');
  el.reloadFirebaseBtn = $('reload-firebase-players');
  el.searchInput = $('player-search');
  el.clearSearchBtn = $('clear-search');
}

// --- Utility ---
function debounce(fn, ms = 200) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const LEVEL_MAP = { 'iniciante': 1, 'ok': 2, 'bom': 3, 'ótimo': 4, 'pro': 5 };
const LEVEL_STARS = { 'iniciante': '⭐', 'ok': '⭐⭐', 'bom': '⭐⭐⭐', 'ótimo': '⭐⭐⭐⭐', 'pro': '⭐⭐⭐⭐⭐' };

function savePlayers() { localStorage.setItem('players', JSON.stringify(players)); }
function saveSavedPlayers() { localStorage.setItem('savedPlayers', JSON.stringify(savedPlayers)); }

function showAlert(message, type = 'info') {
  let c = document.getElementById('alerts-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'alerts-container';
    document.body.appendChild(c);
  }
  const d = document.createElement('div');
  d.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
  d.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  c.prepend(d);
  setTimeout(() => { d.classList.remove('show'); setTimeout(() => d.remove(), 150); }, 4000);
}

// --- API ---
class PlayersAPI {
  static async fetch(url, opts) {
    try { const r = await fetch(url, opts); return await r.json(); }
    catch { return { success: false, error: 'Conexão falhou' }; }
  }
  static getAllPlayers() { return this.fetch(`${API_BASE_URL}/players`); }
  static createPlayer(d) { return this.fetch(`${API_BASE_URL}/players`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); }
  static updatePlayer(id, d) { return this.fetch(`${API_BASE_URL}/players/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); }
  static deletePlayer(id) { return this.fetch(`${API_BASE_URL}/players/${id}`, { method: 'DELETE' }); }
  static async checkHealth() { try { return (await fetch(`${API_BASE_URL}/health`)).ok; } catch { return false; } }
}

// --- Init ---
async function init() {
  cacheDom();
  apiConnected = await PlayersAPI.checkHealth();
  if (apiConnected) await loadPlayersFromAPI();
  renderPlayerList();
  renderSavedPlayers();
  setupEvents();
  initBankCollapsed();
  setTimeout(() => { syncWithFirebase(); setTimeout(renderSavedPlayers, 2000); }, 1000);
  window.reloadPlayersFromFirebase = reloadPlayersFromFirebase;
}

function setupEvents() {
  el.form.addEventListener('submit', handleAddPlayer);
  el.generateBtn.addEventListener('click', handleGenerateTeams);
  el.regenerateBtn.addEventListener('click', handleGenerateTeams);
  el.clearBtn.addEventListener('click', handleClearPlayers);
  el.cancelEditBtn.addEventListener('click', cancelEdit);
  el.toggleSavedBtn.addEventListener('click', toggleSavedPlayers);
  el.reloadFirebaseBtn?.addEventListener('click', reloadPlayersFromFirebase);
  el.searchInput?.addEventListener('input', debounce(handleSearch, 150));
  el.searchInput?.addEventListener('keydown', handleSearchKey);
  el.clearSearchBtn?.addEventListener('click', clearSearch);
}

// --- Render: Player List ---
function renderPlayerList() {
  const frag = document.createDocumentFragment();
  el.countEl.textContent = players.length;

  if (!players.length) {
    el.list.innerHTML = '';
    document.getElementById('simple-players-card').style.display = 'none';
    el.regenerateBtn.style.display = 'none';
    el.generateBtn.style.display = '';
    return;
  }

  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  sorted.forEach(p => frag.appendChild(createPlayerItem(p)));
  el.list.innerHTML = '';
  el.list.appendChild(frag);
  renderSimplePlayers();
}

function createPlayerItem(p) {
  const li = document.createElement('li');
  li.className = 'player-item';
  li.dataset.id = p.id;

  const badges = [];
  if (p.isSetter) badges.push('<span class="pos-badge setter">L</span>');
  if (p.isAttacker) badges.push('<span class="pos-badge attacker">A</span>');

  li.innerHTML = `
    <div class="player-avatar ${p.gender || 'masculino'}">${(p.gender === 'feminino') ? 'F' : 'M'}</div>
    <div class="player-info">
      <span class="player-name">${p.name}</span>
      <div class="player-meta">
        <span class="level-stars">${LEVEL_STARS[p.level] || '⭐'}</span>
        ${badges.join('')}
      </div>
    </div>
    <button class="player-remove" data-id="${p.id}" title="Remover">×</button>
  `;

  li.addEventListener('click', e => { if (!e.target.closest('.player-remove')) editPlayer(p.id); });
  li.querySelector('.player-remove').addEventListener('click', e => { e.stopPropagation(); removePlayer(p.id); });
  return li;
}

function renderSimplePlayers() {
  const card = document.getElementById('simple-players-card');
  const grid = document.getElementById('simple-players-list');
  if (!players.length) { card.style.display = 'none'; return; }
  card.style.display = '';
  const frag = document.createDocumentFragment();
  players.forEach(p => {
    const d = document.createElement('div');
    d.className = 'simple-player-chip';
    d.innerHTML = `<span><span class="name">${p.name}</span> <span class="stars">${LEVEL_STARS[p.level] || ''}</span></span><button class="remove-btn" data-id="${p.id}">×</button>`;
    d.querySelector('.remove-btn').addEventListener('click', () => removePlayer(p.id));
    frag.appendChild(d);
  });
  grid.innerHTML = '';
  grid.appendChild(frag);
}

// --- Render: Saved Players ---
function renderSavedPlayers() {
  const frag = document.createDocumentFragment();
  if (!savedPlayers.length) {
    el.savedList.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:8px;">Nenhum jogador salvo.</p>';
    return;
  }
  const sorted = [...savedPlayers].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  sorted.forEach(p => {
    const d = document.createElement('div');
    d.className = 'saved-player';
    d.dataset.id = p.id;
    const badges = [];
    if (p.isSetter) badges.push('<span class="pos-badge setter">L</span>');
    if (p.isAttacker) badges.push('<span class="pos-badge attacker">A</span>');
    d.innerHTML = `
      <div class="saved-player-card">
        <div class="player-avatar ${p.gender || 'masculino'}" style="width:28px;height:28px;font-size:11px;">${p.gender === 'feminino' ? 'F' : 'M'}</div>
        <div style="flex:1;min-width:0;">
          <span class="saved-player-name">${p.name}</span>
          <div class="saved-player-attributes"><span class="level-stars" style="font-size:10px;">${LEVEL_STARS[p.level] || '⭐'}</span>${badges.join('')}</div>
        </div>
        <div class="saved-player-actions">
          <button class="edit-btn" data-id="${p.id}" title="Editar"><i class="bi bi-pencil"></i></button>
          <button class="delete-btn" data-id="${p.id}" title="Remover"><i class="bi bi-x-lg"></i></button>
        </div>
      </div>`;
    d.addEventListener('click', e => { if (!e.target.closest('.saved-player-actions')) addPlayerFromSaved(p.id); });
    d.querySelector('.edit-btn').addEventListener('click', e => { e.stopPropagation(); editSavedPlayer(p.id); });
    d.querySelector('.delete-btn').addEventListener('click', e => { e.stopPropagation(); removeSavedPlayer(p.id); });
    frag.appendChild(d);
  });
  el.savedList.innerHTML = '';
  el.savedList.appendChild(frag);
}

// --- CRUD ---
async function handleAddPlayer(e) {
  e.preventDefault();
  const name = el.nameInput.value.trim();
  const level = document.querySelector('input[name="player-level"]:checked')?.value;
  const gender = document.querySelector('input[name="player-gender"]:checked')?.value;
  const isSetter = document.getElementById('player-setter').checked;
  const isAttacker = document.getElementById('player-attacker').checked;
  const pid = el.idInput.value;
  if (!name || !level || !gender) { showAlert('Preencha todos os campos!', 'error'); return; }
  if (pid && pid.startsWith('saved_')) {
    await updateSavedPlayerInFirebase(pid.replace('saved_', ''), name, level, gender, isSetter, isAttacker);
  } else if (pid) {
    await updatePlayer(pid, name, level, gender, isSetter, isAttacker);
  } else {
    await addPlayer(name, level, gender, isSetter, isAttacker);
  }
  resetForm();
}

async function addPlayer(name, level, gender, isSetter, isAttacker) {
  if (players.find(p => p.name.toLowerCase() === name.toLowerCase() && p.gender === gender)) {
    showAlert(`${name} já está na lista!`, 'warning'); return;
  }
  const np = { id: Date.now().toString(), name, level, gender, isSetter, isAttacker, createdAt: new Date().toISOString() };
  players.push(np);
  savePlayers();
  renderPlayerList();
  showAlert(`${name} adicionado!`, 'success');

  if (apiConnected) {
    const res = await PlayersAPI.createPlayer({ name, level, gender, isSetter, isAttacker });
    if (res.success && res.player?.firebase_id) {
      const idx = players.findIndex(p => p.id === np.id);
      if (idx !== -1) { players[idx].firebase_id = res.player.firebase_id; savePlayers(); }
      saveToBank(name, level, gender, isSetter, isAttacker, res.player.firebase_id);
    } else { await saveDirectFirebase(name, level, gender, isSetter, isAttacker, np.id); }
  } else { await saveDirectFirebase(name, level, gender, isSetter, isAttacker, np.id); }
}

async function updatePlayer(id, name, level, gender, isSetter, isAttacker) {
  const idx = players.findIndex(p => p.id === id);
  if (idx === -1) return;
  const old = players[idx];
  players[idx] = { ...old, name, level, gender, isSetter, isAttacker };
  savePlayers(); renderPlayerList();
  showAlert(`${name} atualizado!`, 'success');
  if (apiConnected && old.firebase_id) await PlayersAPI.updatePlayer(old.firebase_id, { name, level, gender, isSetter, isAttacker });
  const si = savedPlayers.findIndex(p => p.id === id || p.firebase_id === old.firebase_id);
  if (si !== -1) { savedPlayers[si] = { ...savedPlayers[si], name, level, gender, isSetter, isAttacker }; saveSavedPlayers(); renderSavedPlayers(); }
}

async function removePlayer(pid) {
  const idx = players.findIndex(p => p.id === pid);
  if (idx === -1) return;
  const name = players[idx].name;
  players.splice(idx, 1);
  savePlayers(); renderPlayerList();
  showAlert(`${name} removido da lista.`, 'success');
}

function editPlayer(id) {
  const p = players.find(x => x.id === id);
  if (!p) return;
  el.idInput.value = p.id;
  el.nameInput.value = p.name;
  selectRadio('player-level', p.level);
  selectRadio('player-gender', p.gender);
  document.getElementById('player-setter').checked = p.isSetter;
  document.getElementById('player-attacker').checked = p.isAttacker;
  el.submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Salvar';
  el.cancelEditBtn.style.display = '';
  el.nameInput.focus();
}

function selectRadio(name, val) {
  const r = document.querySelector(`input[name="${name}"][value="${val}"]`);
  if (r) r.checked = true;
}

function resetForm() {
  el.form.reset();
  el.idInput.value = '';
  el.submitBtn.innerHTML = '<i class="bi bi-plus-lg"></i> Adicionar';
  el.cancelEditBtn.style.display = 'none';
  resetFirebaseEditMode();
  el.nameInput.focus();
}

function cancelEdit() { resetForm(); }

function resetFirebaseEditMode() {
  const sec = el.form.closest('.card-section') || el.form.closest('section');
  if (sec) {
    sec.classList.remove('editing-firebase-player');
    sec.querySelector('.firebase-edit-badge')?.remove();
  }
}

// --- Saved Players / Bank ---
function saveToBank(name, level, gender, isSetter, isAttacker, fbId = null) {
  const idx = savedPlayers.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
  if (idx === -1) {
    savedPlayers.push({ id: fbId || Date.now().toString(), name, level, gender, isSetter, isAttacker, firebase_id: fbId, lastUsed: new Date().toISOString() });
  } else {
    savedPlayers[idx] = { ...savedPlayers[idx], level, gender, isSetter, isAttacker, firebase_id: fbId || savedPlayers[idx].firebase_id, lastUsed: new Date().toISOString() };
  }
  saveSavedPlayers(); renderSavedPlayers();
}

function addPlayerFromSaved(pid) {
  const p = savedPlayers.find(x => x.id === pid);
  if (!p) return;
  const exists = players.some(x => (x.firebase_id && p.firebase_id && x.firebase_id === p.firebase_id) || (x.name.toLowerCase() === p.name.toLowerCase() && x.gender === p.gender));
  if (exists) { showAlert(`${p.name} já está na lista!`, 'warning'); return; }
  players.push({ id: p.firebase_id || Date.now().toString(), name: p.name, level: p.level, gender: p.gender, isSetter: p.isSetter, isAttacker: p.isAttacker, firebase_id: p.firebase_id, createdAt: p.createdAt || new Date().toISOString() });
  savePlayers(); renderPlayerList();
  showAlert(`${p.name} adicionado!`, 'success');
}

async function editSavedPlayer(pid) {
  const p = savedPlayers.find(x => x.id === pid);
  if (!p) return;
  el.idInput.value = `saved_${pid}`;
  el.nameInput.value = p.name;
  selectRadio('player-level', p.level);
  selectRadio('player-gender', p.gender);
  document.getElementById('player-setter').checked = !!p.isSetter;
  document.getElementById('player-attacker').checked = !!p.isAttacker;
  el.submitBtn.innerHTML = '<i class="bi bi-cloud-arrow-up"></i> Atualizar';
  el.cancelEditBtn.style.display = '';
  const sec = el.form.closest('.card-section') || el.form.closest('section');
  if (sec) {
    sec.classList.add('editing-firebase-player');
    if (!sec.querySelector('.firebase-edit-badge')) {
      const badge = document.createElement('div');
      badge.className = 'firebase-edit-badge';
      badge.innerHTML = '<i class="bi bi-cloud-arrow-up"></i> Editando jogador do Firebase';
      sec.insertBefore(badge, sec.firstChild.nextSibling);
    }
  }
  el.nameInput.focus();
  showAlert(`Editando: ${p.name}`, 'info');
}

async function removeSavedPlayer(pid) {
  const idx = savedPlayers.findIndex(p => p.id === pid);
  if (idx === -1) return;
  const p = savedPlayers[idx];
  if (!confirm(`Excluir "${p.name}"?`)) return;
  if (p.firebase_id) await deleteFromFirebase(p.firebase_id);
  savedPlayers.splice(idx, 1);
  saveSavedPlayers(); renderSavedPlayers();
  const ci = players.findIndex(x => (p.firebase_id && x.firebase_id === p.firebase_id) || (x.name.toLowerCase() === p.name.toLowerCase()));
  if (ci !== -1) { players.splice(ci, 1); savePlayers(); renderPlayerList(); }
  showAlert(`${p.name} excluído!`, 'success');
}

async function updateSavedPlayerInFirebase(pid, name, level, gender, isSetter, isAttacker) {
  const si = savedPlayers.findIndex(p => p.id === pid);
  if (si === -1) return;
  const sp = savedPlayers[si];
  const data = { name: name.trim(), level, gender, isSetter, isAttacker, lastUpdated: new Date().toISOString() };
  let ok = false;
  if (apiConnected && sp.firebase_id) { const r = await PlayersAPI.updatePlayer(sp.firebase_id, data); ok = r.success; }
  if (!ok && sp.firebase_id) ok = (await updateDirectFirebase(sp.firebase_id, data)).success;
  if (ok || !sp.firebase_id) {
    savedPlayers[si] = { ...sp, ...data };
    saveSavedPlayers(); renderSavedPlayers();
    const ci = players.findIndex(x => x.firebase_id === sp.firebase_id || (x.name.toLowerCase() === sp.name.toLowerCase() && x.gender === sp.gender));
    if (ci !== -1) { players[ci] = { ...players[ci], ...data }; savePlayers(); renderPlayerList(); }
    showAlert(`${name} atualizado!`, 'success');
  } else { showAlert('Erro ao atualizar.', 'error'); }
  resetForm();
}

// --- Firebase Direct ---
async function saveDirectFirebase(name, level, gender, isSetter, isAttacker, localId) {
  if (!window.firebaseDatabase || !window.firebaseRef || !window.firebaseSet) {
    saveToBank(name, level, gender, isSetter, isAttacker); return;
  }
  try {
    const fbId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await window.firebaseSet(window.firebaseRef(window.firebaseDatabase, `players/${fbId}`), { name, level, gender, isSetter, isAttacker, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const idx = players.findIndex(p => p.id === localId);
    if (idx !== -1) { players[idx].firebase_id = fbId; savePlayers(); }
    saveToBank(name, level, gender, isSetter, isAttacker, fbId);
  } catch { saveToBank(name, level, gender, isSetter, isAttacker); }
}

async function updateDirectFirebase(fbId, data) {
  try {
    if (!window.firebaseDatabase || !window.firebaseRef || !window.firebaseUpdate) throw new Error();
    await window.firebaseUpdate(window.firebaseRef(window.firebaseDatabase, `players/${fbId}`), data);
    return { success: true };
  } catch { return { success: false }; }
}

async function deleteFromFirebase(fbId) {
  if (apiConnected) { const r = await PlayersAPI.deletePlayer(fbId); if (r.success) return; }
  try {
    if (window.firebaseDatabase && window.firebaseRef && window.firebaseRemove) {
      await window.firebaseRemove(window.firebaseRef(window.firebaseDatabase, `players/${fbId}`));
    }
  } catch { /* silent */ }
}

async function loadPlayersFromAPI() {
  const res = await PlayersAPI.getAllPlayers();
  if (!res.success) return;
  res.players.forEach(p => {
    if (!savedPlayers.some(s => s.firebase_id === p.firebase_id || (s.name === p.name && s.gender === p.gender))) {
      savedPlayers.push({ id: p.firebase_id, name: p.name, level: p.level, gender: p.gender, isSetter: p.isSetter, isAttacker: p.isAttacker || false, firebase_id: p.firebase_id, createdAt: p.createdAt || new Date().toISOString(), lastUsed: p.createdAt || new Date().toISOString() });
    }
  });
  saveSavedPlayers();
}

async function loadDirectFromFirebase() {
  if (!window.firebaseDatabase || !window.firebaseRef || !window.firebaseGet) return false;
  try {
    const snap = await window.firebaseGet(window.firebaseRef(window.firebaseDatabase, 'players'));
    if (!snap.exists()) return true;
    Object.entries(snap.val()).forEach(([fbId, p]) => {
      if (!savedPlayers.some(s => s.firebase_id === fbId || (s.name === p.name && s.gender === p.gender))) {
        savedPlayers.push({ id: fbId, name: p.name, level: p.level, gender: p.gender, isSetter: p.isSetter || false, isAttacker: p.isAttacker || false, firebase_id: fbId, createdAt: p.createdAt || new Date().toISOString(), lastUsed: p.updatedAt || new Date().toISOString() });
      }
    });
    saveSavedPlayers();
    return true;
  } catch { return false; }
}

async function reloadPlayersFromFirebase() {
  apiConnected = await PlayersAPI.checkHealth();
  if (apiConnected) { await loadPlayersFromAPI(); } else { await loadDirectFromFirebase(); }
  renderPlayerList(); renderSavedPlayers();
  showAlert('Jogadores recarregados!', 'success');
}

function syncWithFirebase() {
  if (!window.firebaseDatabase || !window.firebaseRef || !window.firebaseOnValue) return;
  try {
    window.firebaseOnValue(window.firebaseRef(window.firebaseDatabase, 'players'), snap => {
      const data = snap.val();
      if (!data) return;
      let changed = false;
      Object.entries(data).forEach(([fbId, p]) => {
        if (!savedPlayers.some(s => s.firebase_id === fbId || (s.name === p.name && s.gender === p.gender))) {
          savedPlayers.push({ id: fbId, name: p.name, level: p.level, gender: p.gender, isSetter: p.isSetter || false, isAttacker: p.isAttacker || false, firebase_id: fbId, createdAt: p.createdAt || new Date().toISOString(), lastUsed: p.updatedAt || new Date().toISOString() });
          changed = true;
        }
      });
      if (changed) { saveSavedPlayers(); renderSavedPlayers(); }
    });
  } catch { /* silent */ }
}

// --- Bank Toggle ---
function initBankCollapsed() {
  if (el.savedList) { el.savedList.style.display = 'none'; el.savedList.classList.remove('expanded'); }
  if (el.toggleSavedBtn) el.toggleSavedBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
}

function toggleSavedPlayers() {
  const open = el.savedList.classList.contains('expanded');
  if (open) {
    el.savedList.classList.remove('expanded');
    el.toggleSavedBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
    setTimeout(() => { if (!el.savedList.classList.contains('expanded')) el.savedList.style.display = 'none'; }, 300);
  } else {
    el.savedList.style.display = 'flex';
    requestAnimationFrame(() => el.savedList.classList.add('expanded'));
    el.toggleSavedBtn.innerHTML = '<i class="bi bi-chevron-down"></i>';
  }
}

// --- Search ---
function handleSearch() {
  const term = el.searchInput.value.trim().toLowerCase();
  el.clearSearchBtn?.classList.toggle('show', term.length > 0);
  document.querySelectorAll('.search-results-info, .search-empty-state').forEach(e => e.remove());

  if (!term) {
    el.list.querySelectorAll('.player-item').forEach(e => e.style.display = '');
    el.savedList.querySelectorAll('.saved-player').forEach(e => e.style.display = '');
    return;
  }

  const match = p => p.name.toLowerCase().includes(term) || p.level.includes(term) || p.gender.includes(term) || (p.isSetter && 'levantador'.includes(term)) || (p.isAttacker && 'atacante'.includes(term));
  let curCount = 0, savedCount = 0;

  el.list.querySelectorAll('.player-item').forEach(li => {
    const p = players.find(x => x.id === li.dataset.id);
    const show = p && match(p);
    li.style.display = show ? '' : 'none';
    if (show) curCount++;
  });

  el.savedList.querySelectorAll('.saved-player').forEach(d => {
    const p = savedPlayers.find(x => x.id === d.dataset.id);
    const show = p && match(p);
    d.style.display = show ? '' : 'none';
    if (show) savedCount++;
  });

  if (savedCount > 0 && !el.savedList.classList.contains('expanded')) toggleSavedPlayers();

  const total = curCount + savedCount;
  const info = document.createElement('div');
  info.className = total ? 'search-results-info' : 'search-empty-state';
  info.innerHTML = total
    ? `<i class="bi bi-search"></i> ${total} encontrado(s) (${curCount} na lista, ${savedCount} no banco)`
    : '<p>Nenhum jogador encontrado.</p>';
  el.searchInput.closest('.search-wrap').insertAdjacentElement('afterend', info);
}

function handleSearchKey(e) {
  if (e.key === 'Escape') clearSearch();
}

function clearSearch() {
  if (el.searchInput) { el.searchInput.value = ''; el.searchInput.focus(); }
  el.clearSearchBtn?.classList.remove('show');
  document.querySelectorAll('.search-results-info, .search-empty-state').forEach(e => e.remove());
  el.list.querySelectorAll('.player-item').forEach(e => e.style.display = '');
  el.savedList.querySelectorAll('.saved-player').forEach(e => e.style.display = '');
}

// --- Team Generation ---
function handleGenerateTeams() {
  if (players.length < 2) { showAlert('Mínimo 2 jogadores!', 'error'); return; }
  if (currentTeams) { handleRegenerate(); return; }
  const suggested = calcSuggestedTeams();
  const num = prompt('Quantos times?', suggested);
  if (!num || isNaN(num) || num < 1) return;
  const n = parseInt(num);
  if (n > players.length) { showAlert('Mais times que jogadores!', 'error'); return; }
  generateTeams(n);
}

function calcSuggestedTeams() {
  const t = players.length, ideal = Math.floor(t / 6), rem = t % 6;
  if (!ideal) return 1;
  return rem >= 4 ? ideal + 1 : ideal;
}

function generateTeams(n) {
  const shuffled = [...players].sort(() => Math.random() - .5);
  const teams = Array.from({ length: n }, () => []);
  distributeSequential(shuffled, teams);
  displayTeams(teams);
  currentTeams = teams;
  el.generateBtn.style.display = 'none';
  el.regenerateBtn.style.display = '';
  showAlert(`${n} times gerados!`, 'success');
}

function handleRegenerate() {
  const n = currentTeams.length;
  const prev = currentTeams.map(t => t.map(p => p.id));
  let best = null, bestDiff = 0;

  for (let i = 0; i < 10; i++) {
    const shuffled = [...players].sort(() => Math.random() - .5);
    const teams = Array.from({ length: n }, () => []);
    distributeSequential(shuffled, teams);
    const diff = calcDiff(teams, prev);
    if (diff > bestDiff) { bestDiff = diff; best = teams; }
    if (diff >= 50) break;
  }

  if (best) {
    displayTeams(best);
    currentTeams = best;
    showAlert(`Times re-sorteados (${bestDiff.toFixed(0)}% diferente)!`, 'success');
  }
}

function calcDiff(teams, prev) {
  let total = 0, diff = 0;
  teams.forEach((t, i) => t.forEach(p => { total++; if (!prev[i]?.includes(p.id)) diff++; }));
  return total ? (diff / total) * 100 : 0;
}

// --- Smart Distribution Engine ---

function distributeSequential(all, teams) {
  const n = teams.length;
  const max = Math.max(6, Math.ceil(all.length / n));
  const placed = new Set();

  // Tag each player with roles for sorting
  const tagged = all.map(p => ({
    ...p,
    score: LEVEL_MAP[p.level] || 1,
    roles: []
  }));
  tagged.forEach(p => {
    if (p.gender === 'feminino') p.roles.push('female');
    if (p.isSetter) p.roles.push('setter');
    if (p.isAttacker) p.roles.push('attacker');
    if (!p.roles.length) p.roles.push('general');
  });

  // --- PHASE 1: Setters (most scarce resource, highest priority) ---
  const setters = shuffle(tagged.filter(p => p.isSetter));
  serpentineDistribute(setters, teams, placed, max, 'setter');

  // --- PHASE 2: Attackers ---
  const attackers = shuffle(tagged.filter(p => p.isAttacker && !placed.has(p.id)));
  serpentineDistribute(attackers, teams, placed, max, 'attacker');

  // --- PHASE 3: Females (not yet placed as setter/attacker) ---
  const females = shuffle(tagged.filter(p => p.gender === 'feminino' && !placed.has(p.id)));
  serpentineDistribute(females, teams, placed, max, 'female');

  // --- PHASE 4: Remaining players — score-balanced distribution ---
  const remaining = shuffle(tagged.filter(p => !placed.has(p.id)));
  // Sort by score descending so we place strongest first (easier to balance)
  remaining.sort((a, b) => b.score - a.score);
  scoreBalancedDistribute(remaining, teams, placed, max);

  // --- PHASE 5: Final swap optimization ---
  optimizeTeamBalance(teams, 3); // 3 rounds of optimization
}

/**
 * Serpentine distribution: distributes players ensuring the count of a role
 * is as equal as possible across teams. Teams with fewest of that role get next.
 */
function serpentineDistribute(players, teams, placed, max, role) {
  if (!players.length) return;

  // Sort by skill descending, then shuffle within same level for randomness
  players.sort((a, b) => b.score - a.score || Math.random() - .5);

  for (const p of players) {
    if (placed.has(p.id)) continue;
    // Find the team that has the fewest of this role AND fewest total players AND lowest score
    const target = pickBestTeam(teams, placed, max, (team) => {
      const roleCount = countRole(team, role);
      const totalScore = teamScore(team);
      // Primary: fewest of this role; Secondary: fewest players; Tertiary: lowest score
      return roleCount * 10000 + team.length * 100 + totalScore;
    });
    if (target !== -1) {
      teams[target].push(p);
      placed.add(p.id);
    }
  }
}

/**
 * Score-balanced distribution for general players.
 * Always places the next player in the team with the LOWEST total score.
 */
function scoreBalancedDistribute(players, teams, placed, max) {
  for (const p of players) {
    if (placed.has(p.id)) continue;
    const target = pickBestTeam(teams, placed, max, (team) => {
      const score = teamScore(team);
      // Primary: lowest score; Secondary: fewest players
      return score * 100 + team.length;
    });
    if (target !== -1) {
      teams[target].push(p);
      placed.add(p.id);
    }
  }
}

/**
 * Pick the best team using a scoring function (lowest score wins).
 * Only considers teams that aren't full.
 */
function pickBestTeam(teams, placed, max, scoreFn) {
  let bestIdx = -1, bestScore = Infinity;
  for (let i = 0; i < teams.length; i++) {
    if (teams[i].length >= max) continue;
    const s = scoreFn(teams[i]);
    // Add small random tiebreaker to avoid bias toward lower indices
    const sRand = s + Math.random() * 0.1;
    if (sRand < bestScore) { bestScore = sRand; bestIdx = i; }
  }
  return bestIdx;
}

/**
 * Post-distribution optimization: tries swapping players between teams
 * to reduce imbalance in score, female count, setter count, and attacker count.
 */
function optimizeTeamBalance(teams, rounds) {
  for (let r = 0; r < rounds; r++) {
    let improved = false;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        improved = trySwapImprove(teams, i, j) || improved;
      }
    }
    if (!improved) break; // Converged
  }
}

/**
 * Try swapping each pair of players between two teams.
 * Accept the swap if it reduces the global imbalance.
 */
function trySwapImprove(teams, ti, tj) {
  const before = globalImbalance(teams);
  let bestSwap = null, bestImb = before;

  for (let a = 0; a < teams[ti].length; a++) {
    for (let b = 0; b < teams[tj].length; b++) {
      // Swap
      [teams[ti][a], teams[tj][b]] = [teams[tj][b], teams[ti][a]];
      const after = globalImbalance(teams);
      if (after < bestImb - 0.5) { // Only accept meaningful improvements
        bestImb = after;
        bestSwap = [a, b];
      }
      // Swap back
      [teams[ti][a], teams[tj][b]] = [teams[tj][b], teams[ti][a]];
    }
  }

  if (bestSwap) {
    [teams[ti][bestSwap[0]], teams[tj][bestSwap[1]]] = [teams[tj][bestSwap[1]], teams[ti][bestSwap[0]]];
    return true;
  }
  return false;
}

/**
 * Calculate a global imbalance metric across all teams.
 * Lower = more balanced. Considers: score, females, setters, attackers.
 */
function globalImbalance(teams) {
  const n = teams.length;
  if (n < 2) return 0;

  const scores = teams.map(t => teamScore(t));
  const females = teams.map(t => t.filter(p => p.gender === 'feminino').length);
  const setters = teams.map(t => t.filter(p => p.isSetter).length);
  const attackers = teams.map(t => t.filter(p => p.isAttacker).length);
  const sizes = teams.map(t => t.length);

  // Weighted variance
  return (
    variance(scores) * 3 +     // Skill balance is most important
    variance(females) * 8 +     // Female distribution very important
    variance(setters) * 10 +    // Setter distribution critical
    variance(attackers) * 8 +   // Attacker distribution very important
    variance(sizes) * 5         // Even team sizes important
  );
}

function variance(arr) {
  if (arr.length < 2) return 0;
  const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
  return arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length;
}

function teamScore(team) {
  return team.reduce((s, p) => s + (LEVEL_MAP[p.level] || 1), 0);
}

function countRole(team, role) {
  switch (role) {
    case 'setter': return team.filter(p => p.isSetter).length;
    case 'attacker': return team.filter(p => p.isAttacker).length;
    case 'female': return team.filter(p => p.gender === 'feminino').length;
    default: return 0;
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Balance Indicator System ---

/**
 * Calculates per-team stats and compares against averages.
 * Updates chip colors and the overall balance banner.
 */
function updateBalanceIndicators() {
  if (!currentTeams || currentTeams.length < 2) return;

  const n = currentTeams.length;
  const stats = currentTeams.map(t => ({
    score: teamScore(t),
    females: t.filter(p => p.gender === 'feminino').length,
    setters: t.filter(p => p.isSetter).length,
    attackers: t.filter(p => p.isAttacker).length,
    size: t.length
  }));

  const avg = {
    score: stats.reduce((s, t) => s + t.score, 0) / n,
    females: stats.reduce((s, t) => s + t.females, 0) / n,
    setters: stats.reduce((s, t) => s + t.setters, 0) / n,
    attackers: stats.reduce((s, t) => s + t.attackers, 0) / n,
    size: stats.reduce((s, t) => s + t.size, 0) / n
  };

  // Thresholds: how far from average before warning/danger
  const thresholds = {
    score: { warn: avg.score * 0.2, danger: avg.score * 0.35 },
    females: { warn: 1, danger: 2 },
    setters: { warn: 1, danger: 2 },
    attackers: { warn: 1, danger: 2 }
  };

  let overallBad = 0, overallTotal = 0;

  currentTeams.forEach((team, i) => {
    const card = document.querySelector(`.team-card[data-team-index="${i}"]`);
    if (!card) return;

    const s = stats[i];

    // Build meta chips with balance status
    let meta = card.querySelector('.team-card-meta');
    if (!meta) {
      meta = document.createElement('div');
      meta.className = 'team-card-meta';
      const body = card.querySelector('.team-card-body');
      card.insertBefore(meta, body);
    }

    const scoreStatus = getStatus(s.score, avg.score, thresholds.score);
    const femaleStatus = getStatus(s.females, avg.females, thresholds.females);
    const setterStatus = getStatus(s.setters, avg.setters, thresholds.setters);
    const attackerStatus = getStatus(s.attackers, avg.attackers, thresholds.attackers);

    meta.innerHTML = `
      <span class="team-stat-chip ${scoreStatus.cls}" title="${scoreStatus.tip}">⭐ ${s.score} pts</span>
      <span class="team-stat-chip ${femaleStatus.cls}" title="${femaleStatus.tip}">${s.females}♀</span>
      <span class="team-stat-chip ${setterStatus.cls}" title="${setterStatus.tip}">${s.setters}L</span>
      <span class="team-stat-chip ${attackerStatus.cls}" title="${attackerStatus.tip}">${s.attackers}A</span>
    `;

    // Balance bar
    let bar = card.querySelector('.team-balance-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'team-balance-bar';
      bar.innerHTML = '<div class="fill"></div>';
      card.querySelector('.team-card-header').after(bar);
    }

    const teamImb = (
      Math.abs(s.score - avg.score) / Math.max(avg.score, 1) +
      Math.abs(s.females - avg.females) / Math.max(avg.females, 1) * 0.5 +
      Math.abs(s.setters - avg.setters) / Math.max(avg.setters, 1) * 0.5 +
      Math.abs(s.attackers - avg.attackers) / Math.max(avg.attackers, 1) * 0.5
    );
    const balancePercent = Math.max(0, Math.min(100, (1 - teamImb / 2) * 100));
    const fill = bar.querySelector('.fill');
    fill.style.width = balancePercent + '%';
    fill.className = 'fill ' + (balancePercent >= 75 ? 'good' : balancePercent >= 50 ? 'ok' : 'bad');

    // Count for overall
    const statuses = [scoreStatus, femaleStatus, setterStatus, attackerStatus];
    overallTotal += statuses.length;
    overallBad += statuses.filter(s => s.cls === 'danger').length;
    overallBad += statuses.filter(s => s.cls === 'warning').length * 0.5;
  });

  // Overall balance banner
  updateBalanceBanner(overallBad, overallTotal);
}

function getStatus(value, avg, threshold) {
  const diff = Math.abs(value - avg);
  if (diff <= threshold.warn * 0.5) return { cls: 'balanced', tip: 'Equilibrado' };
  if (diff <= threshold.warn) return { cls: 'highlight', tip: 'Próximo da média' };
  if (diff <= threshold.danger) return { cls: 'warning', tip: `${value > avg ? 'Acima' : 'Abaixo'} da média (${avg.toFixed(1)})` };
  return { cls: 'danger', tip: `Muito ${value > avg ? 'acima' : 'abaixo'} da média (${avg.toFixed(1)})` };
}

function updateBalanceBanner(bad, total) {
  let banner = document.getElementById('balance-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'balance-banner';
    banner.className = 'balance-banner';
    const hint = el.teamOutput.querySelector('.drag-hint');
    if (hint) hint.after(banner);
    else el.teamOutput.prepend(banner);
  }

  const ratio = total > 0 ? bad / total : 0;

  if (ratio <= 0.1) {
    banner.className = 'balance-banner good';
    banner.innerHTML = '<i class="bi bi-check-circle-fill"></i> Times bem equilibrados!';
  } else if (ratio <= 0.3) {
    banner.className = 'balance-banner ok';
    banner.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Times razoavelmente equilibrados — ajuste arrastando jogadores';
  } else {
    banner.className = 'balance-banner bad';
    banner.innerHTML = '<i class="bi bi-exclamation-circle-fill"></i> Times desbalanceados — arraste jogadores para equilibrar';
  }
}

function displayTeams(teams) {
  el.teamOutput.innerHTML = '<h3>Times Sorteados</h3>';
  const hint = document.createElement('div');
  hint.className = 'drag-hint';
  hint.innerHTML = '<i class="bi bi-grip-vertical"></i> Arraste jogadores entre os times para ajustar';
  el.teamOutput.appendChild(hint);

  const frag = document.createDocumentFragment();

  teams.forEach((team, i) => {
    const card = document.createElement('div');
    card.className = 'team-card';
    card.dataset.teamIndex = i;
    card.style.animationDelay = `${i * .08}s`;

    const header = document.createElement('div');
    header.className = 'team-card-header';
    header.innerHTML = `<span>🏐 Time ${i + 1}</span><span class="team-size">${team.length} jogadores</span>`;

    // Stats row
    const meta = document.createElement('div');
    meta.className = 'team-card-meta';
    const sc = teamScore(team);
    const fc = team.filter(p => p.gender === 'feminino').length;
    const stc = team.filter(p => p.isSetter).length;
    const atc = team.filter(p => p.isAttacker).length;
    meta.innerHTML = `
      <span class="team-stat-chip highlight">⭐ ${sc} pts</span>
      <span class="team-stat-chip">${fc}♀</span>
      <span class="team-stat-chip">${stc}L</span>
      <span class="team-stat-chip">${atc}A</span>
    `;

    const body = document.createElement('div');
    body.className = 'team-card-body';

    team.forEach((p, j) => {
      body.appendChild(createTeamPlayerRow(p, j, i));
    });

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(body);
    frag.appendChild(card);

    // Drop zone events
    card.addEventListener('dragover', onDragOver);
    card.addEventListener('dragenter', onDragEnter);
    card.addEventListener('dragleave', onDragLeave);
    card.addEventListener('drop', onDrop);
  });

  const totalP = teams.reduce((s, t) => s + t.length, 0);
  const totalS = teams.reduce((s, t) => s + t.filter(p => p.isSetter).length, 0);
  const totalA = teams.reduce((s, t) => s + t.filter(p => p.isAttacker).length, 0);
  const summary = document.createElement('div');
  summary.className = 'team-summary';
  summary.id = 'team-summary';
  summary.textContent = `${teams.length} times · ${totalP} jogadores · ${totalS} levantadores · ${totalA} atacantes`;
  frag.appendChild(summary);

  el.teamOutput.appendChild(frag);

  // Calculate and show balance indicators
  updateBalanceIndicators();

  // Touch support
  initTouchDrag();
}

function createTeamPlayerRow(p, idx, teamIdx) {
  const row = document.createElement('div');
  row.className = 'team-player-row';
  row.draggable = true;
  row.dataset.playerId = p.id;
  row.dataset.teamIndex = teamIdx;

  const badges = [];
  if (p.isSetter) badges.push('<span class="pos-badge setter">L</span>');
  if (p.isAttacker) badges.push('<span class="pos-badge attacker">A</span>');

  row.innerHTML = `
    <span class="drag-handle"><i class="bi bi-grip-vertical"></i></span>
    <span class="num">${idx + 1}</span>
    <span class="name">${p.name}</span>
    <div class="badges">${badges.join('')}</div>
  `;

  row.addEventListener('dragstart', onDragStart);
  row.addEventListener('dragend', onDragEnd);
  return row;
}

// --- Drag & Drop Logic ---
let dragState = { playerId: null, fromTeam: null, element: null };

function onDragStart(e) {
  const row = e.currentTarget;
  dragState.playerId = row.dataset.playerId;
  dragState.fromTeam = parseInt(row.dataset.teamIndex);
  dragState.element = row;

  row.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', row.dataset.playerId);

  // Custom drag image
  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.textContent = row.querySelector('.name').textContent;
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
  requestAnimationFrame(() => ghost.remove());
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.team-card.drag-over').forEach(c => c.classList.remove('drag-over'));
  document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
  dragState = { playerId: null, fromTeam: null, element: null };
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function onDragEnter(e) {
  e.preventDefault();
  const card = e.currentTarget;
  const toTeam = parseInt(card.dataset.teamIndex);
  if (toTeam === dragState.fromTeam) return;

  document.querySelectorAll('.team-card.drag-over').forEach(c => c.classList.remove('drag-over'));
  document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());

  card.classList.add('drag-over');
  const body = card.querySelector('.team-card-body');
  if (!body.querySelector('.drop-placeholder')) {
    const ph = document.createElement('div');
    ph.className = 'drop-placeholder';
    ph.textContent = 'Soltar aqui';
    body.appendChild(ph);
  }
}

function onDragLeave(e) {
  const card = e.currentTarget;
  if (!card.contains(e.relatedTarget)) {
    card.classList.remove('drag-over');
    card.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
  }
}

function onDrop(e) {
  e.preventDefault();
  const card = e.currentTarget;
  const toTeam = parseInt(card.dataset.teamIndex);
  card.classList.remove('drag-over');
  card.querySelectorAll('.drop-placeholder').forEach(p => p.remove());

  if (toTeam === dragState.fromTeam || dragState.playerId === null) return;

  movePlayerBetweenTeams(dragState.playerId, dragState.fromTeam, toTeam);
}

function movePlayerBetweenTeams(playerId, fromIdx, toIdx) {
  if (!currentTeams || !currentTeams[fromIdx] || !currentTeams[toIdx]) return;

  const pIdx = currentTeams[fromIdx].findIndex(p => p.id === playerId);
  if (pIdx === -1) return;

  const [player] = currentTeams[fromIdx].splice(pIdx, 1);
  currentTeams[toIdx].push(player);

  // Re-render only the affected teams
  refreshTeamCard(fromIdx);
  refreshTeamCard(toIdx);
  refreshTeamSummary();

  showAlert(`${player.name} movido para Time ${toIdx + 1}`, 'info');
}

function refreshTeamCard(teamIdx) {
  const card = document.querySelector(`.team-card[data-team-index="${teamIdx}"]`);
  if (!card || !currentTeams[teamIdx]) return;
  const team = currentTeams[teamIdx];

  const header = card.querySelector('.team-card-header');
  header.innerHTML = `<span>🏐 Time ${teamIdx + 1}</span><span class="team-size">${team.length} jogadores</span>`;

  // Meta will be rebuilt by updateBalanceIndicators
  const body = card.querySelector('.team-card-body');
  body.innerHTML = '';
  team.forEach((p, j) => {
    body.appendChild(createTeamPlayerRow(p, j, teamIdx));
  });

  initTouchDragForCard(card);
}

function refreshTeamSummary() {
  const summary = document.getElementById('team-summary');
  if (!summary || !currentTeams) return;
  const totalP = currentTeams.reduce((s, t) => s + t.length, 0);
  const totalS = currentTeams.reduce((s, t) => s + t.filter(p => p.isSetter).length, 0);
  const totalA = currentTeams.reduce((s, t) => s + t.filter(p => p.isAttacker).length, 0);
  summary.textContent = `${currentTeams.length} times · ${totalP} jogadores · ${totalS} levantadores · ${totalA} atacantes`;
  updateBalanceIndicators();
}

// --- Touch Drag Support (mobile) ---
let touchDrag = { active: false, playerId: null, fromTeam: null, ghost: null, startY: 0 };

function initTouchDrag() {
  document.querySelectorAll('.team-card').forEach(card => initTouchDragForCard(card));
}

function initTouchDragForCard(card) {
  card.querySelectorAll('.team-player-row').forEach(row => {
    row.addEventListener('touchstart', onTouchStart, { passive: false });
    row.addEventListener('touchmove', onTouchMove, { passive: false });
    row.addEventListener('touchend', onTouchEnd);
  });
}

function onTouchStart(e) {
  const row = e.currentTarget;
  touchDrag.startX = e.touches[0].clientX;
  touchDrag.startY = e.touches[0].clientY;
  touchDrag.playerId = row.dataset.playerId;
  touchDrag.fromTeam = parseInt(row.dataset.teamIndex);
  touchDrag.moved = false;
  touchDrag.row = row;
  touchDrag.longPress = setTimeout(() => {
    touchDrag.active = true;
    row.classList.add('dragging');
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = row.querySelector('.name').textContent;
    ghost.style.left = e.touches[0].clientX + 'px';
    ghost.style.top = e.touches[0].clientY + 'px';
    document.body.appendChild(ghost);
    touchDrag.ghost = ghost;
    navigator.vibrate?.(30);
  }, 300);
}

function onTouchMove(e) {
  const dx = Math.abs(e.touches[0].clientX - touchDrag.startX);
  const dy = Math.abs(e.touches[0].clientY - touchDrag.startY);

  if (!touchDrag.active && (dx > 10 || dy > 10)) {
    clearTimeout(touchDrag.longPress);
    return;
  }

  if (!touchDrag.active) return;
  e.preventDefault();

  if (touchDrag.ghost) {
    touchDrag.ghost.style.left = e.touches[0].clientX + 'px';
    touchDrag.ghost.style.top = e.touches[0].clientY + 'px';
  }

  // Highlight target team card
  document.querySelectorAll('.team-card.drag-over').forEach(c => c.classList.remove('drag-over'));
  document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());

  const target = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
  const targetCard = target?.closest('.team-card');
  if (targetCard) {
    const toTeam = parseInt(targetCard.dataset.teamIndex);
    if (toTeam !== touchDrag.fromTeam) {
      targetCard.classList.add('drag-over');
      const body = targetCard.querySelector('.team-card-body');
      if (!body.querySelector('.drop-placeholder')) {
        const ph = document.createElement('div');
        ph.className = 'drop-placeholder';
        ph.textContent = 'Soltar aqui';
        body.appendChild(ph);
      }
    }
  }
}

function onTouchEnd(e) {
  clearTimeout(touchDrag.longPress);

  if (touchDrag.active) {
    touchDrag.ghost?.remove();
    touchDrag.row?.classList.remove('dragging');
    document.querySelectorAll('.team-card.drag-over').forEach(c => c.classList.remove('drag-over'));
    document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());

    const touch = e.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetCard = target?.closest('.team-card');

    if (targetCard) {
      const toTeam = parseInt(targetCard.dataset.teamIndex);
      if (toTeam !== touchDrag.fromTeam && touchDrag.playerId) {
        movePlayerBetweenTeams(touchDrag.playerId, touchDrag.fromTeam, toTeam);
      }
    }
  }

  touchDrag = { active: false, playerId: null, fromTeam: null, ghost: null, startY: 0 };
}

function handleClearPlayers() {
  if (!players.length) { showAlert('Nenhum jogador para remover.', 'warning'); return; }
  if (!confirm('Remover todos os jogadores?')) return;
  players = [];
  savePlayers();
  renderPlayerList();
  el.teamOutput.innerHTML = '';
  currentTeams = null;
  el.generateBtn.style.display = '';
  el.regenerateBtn.style.display = 'none';
  showAlert('Todos removidos!', 'success');
}

// --- Make removeSimplePlayer global ---
window.removeSimplePlayer = removePlayer;

// --- Start ---
document.addEventListener('DOMContentLoaded', init);