// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC5tDXJpe-JdC83kd9VE0Tc8V70Dblztu4",
  authDomain: "gerador-times-volei.firebaseapp.com",
  databaseURL: "https://gerador-times-volei-default-rtdb.firebaseio.com",
  projectId: "gerador-times-volei",
  storageBucket: "gerador-times-volei.appspot.com",
  messagingSenderId: "133601686847",
  appId: "1:133601686847:web:9f60913fa7ce7a1dda4f8a",
  measurementId: "G-3QQ5PSND5M"
};

// Configuração da API Backend
const API_BASE_URL = 'http://localhost:5000';

// Dados dos jogadores
let players = JSON.parse(localStorage.getItem('players')) || [];
let savedPlayers = JSON.parse(localStorage.getItem('savedPlayers')) || [];
let currentTeams = null;
let apiConnected = false;

// Elementos do DOM
const elements = {
    form: document.getElementById('player-form'),
    idInput: document.getElementById('player-id'),
    nameInput: document.getElementById('player-name'),
    list: document.getElementById('player-list'),
    teamOutput: document.getElementById('team-output'),
    generateBtn: document.getElementById('generate-team'),
    regenerateBtn: document.getElementById('regenerate-team'),
    clearBtn: document.getElementById('clear-players'),
    countElement: document.getElementById('player-count'),
    savedList: document.getElementById('saved-players-list'),
    submitBtn: document.getElementById('submit-button'),
    cancelEditBtn: document.getElementById('cancel-edit'),
    toggleSavedBtn: document.getElementById('toggle-saved-players'),
    reloadFirebaseBtn: document.getElementById('reload-firebase-players')
};

// Funções para comunicação com a API Backend
class PlayersAPI {
  static async getAllPlayers() {
    try {
      const response = await fetch(`${API_BASE_URL}/players`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao buscar jogadores da API:', error);
      return { success: false, error: 'Erro de conexão com a API' };
    }
  }

  static async createPlayer(playerData) {
    try {
      const response = await fetch(`${API_BASE_URL}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playerData)
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao criar jogador na API:', error);
      return { success: false, error: 'Erro de conexão com a API' };
    }
  }

  static async updatePlayer(firebase_id, playerData) {
    try {
      const response = await fetch(`${API_BASE_URL}/players/${firebase_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playerData)
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao atualizar jogador na API:', error);
      return { success: false, error: 'Erro de conexão com a API' };
    }
  }

  static async deletePlayer(firebase_id) {
    try {
      const response = await fetch(`${API_BASE_URL}/players/${firebase_id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao remover jogador na API:', error);
      return { success: false, error: 'Erro de conexão com a API' };
    }
  }

  static async checkAPIHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('API Backend não está disponível:', error);
      return false;
    }
  }
}

// Inicialização
async function init() {
    apiConnected = await PlayersAPI.checkAPIHealth();
    if (apiConnected) {
        console.log('✅ API Backend conectada');
        await loadPlayersFromAPI();
    } else {
        console.log('⚠️ API Backend não disponível, usando dados locais');
    }
    
    updatePlayerList();
    updateSavedPlayersList();
    setupEventListeners();
    initializeTooltips();
    
    setTimeout(() => {
        syncWithFirebase();
        setTimeout(() => {
            updateSavedPlayersList();
        }, 2000);
    }, 1000);
    
    // Disponibiliza funções globais para testes
    window.reloadPlayersFromFirebase = reloadPlayersFromFirebase;
    window.createSamplePlayers = createSamplePlayers;
    
    console.log('🔧 Funções disponíveis:');
    console.log('  - reloadPlayersFromFirebase(): Recarrega jogadores do Firebase');
    console.log('  - createSamplePlayers(): Cria jogadores de exemplo no Firebase');
}

// Funções auxiliares
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function setupEventListeners() {
    elements.form.addEventListener('submit', handleAddPlayer);
    elements.generateBtn.addEventListener('click', handleGenerateTeams);
    elements.regenerateBtn.addEventListener('click', handleGenerateTeams);
    elements.clearBtn.addEventListener('click', handleClearPlayers);
    elements.cancelEditBtn.addEventListener('click', cancelEdit);
    elements.toggleSavedBtn.addEventListener('click', toggleSavedPlayersList);
    
    if (elements.reloadFirebaseBtn) {
        elements.reloadFirebaseBtn.addEventListener('click', reloadPlayersFromFirebase);
    }
}

// Funções de CRUD com sincronização
async function handleAddPlayer(e) {
    e.preventDefault();
    
    const name = elements.nameInput.value.trim();
    const level = document.querySelector('input[name="player-level"]:checked')?.value;
    const gender = document.querySelector('input[name="player-gender"]:checked')?.value;
    const isSetter = document.getElementById('player-setter').checked;
    const playerId = elements.idInput.value;

    if (!name || !level || !gender) {
        showAlert('Por favor, preencha todos os campos!', 'error');
        return;
    }

    if (playerId) {
        await updatePlayer(playerId, name, level, gender, isSetter);
    } else {
        await addPlayer(name, level, gender, isSetter);
    }
    
    resetForm();
}

async function addPlayer(name, level, gender, isSetter = false) {
    const newPlayer = {
        id: Date.now().toString(),
        name,
        level,
        gender,
        isSetter,
        createdAt: new Date().toISOString()
    };
    
    players.push(newPlayer);
    savePlayers();
    updatePlayerList();
    showAlert(`Jogador ${name} adicionado com sucesso!`, 'success');
    
    if (apiConnected) {
        const playerData = { name, level, gender, isSetter };
        const apiPlayer = await syncPlayerWithAPI(playerData);
        
        if (apiPlayer) {
            const playerIndex = players.findIndex(p => p.id === newPlayer.id);
            if (playerIndex !== -1) {
                players[playerIndex].firebase_id = apiPlayer.firebase_id;
                savePlayers();
            }
            savePlayerToSavedDatabase(name, level, gender, isSetter, apiPlayer.firebase_id);
        }
    } else {
        // Fallback: salvar apenas no banco local de jogadores salvos
        savePlayerToSavedDatabase(name, level, gender, isSetter);
    }
}

async function updatePlayer(id, name, level, gender, isSetter) {
    const playerIndex = players.findIndex(p => p.id === id);
    if (playerIndex === -1) return;
    
    const oldPlayer = players[playerIndex];
    
    players[playerIndex] = {
        ...oldPlayer,
        name,
        level,
        gender,
        isSetter
    };
    
    savePlayers();
    updatePlayerList();
    showAlert(`Jogador ${name} atualizado com sucesso!`, 'success');
    
    if (apiConnected && oldPlayer.firebase_id) {
        const playerData = { name, level, gender, isSetter };
        const result = await PlayersAPI.updatePlayer(oldPlayer.firebase_id, playerData);
        
        if (result.success) {
            console.log('✅ Jogador atualizado na API:', name);
        } else {
            console.error('❌ Erro ao atualizar jogador na API:', result.error);
        }
    } else if (oldPlayer.firebase_id) {
        // Fallback: apenas atualiza no banco local se não há API disponível
        console.log('⚠️ API não disponível, mantendo dados locais apenas');
    }
    
    const savedPlayerIndex = savedPlayers.findIndex(p => p.id === id || p.firebase_id === oldPlayer.firebase_id);
    if (savedPlayerIndex !== -1) {
        savedPlayers[savedPlayerIndex] = {
            ...savedPlayers[savedPlayerIndex],
            name,
            level,
            gender,
            isSetter
        };
        saveSavedPlayers();
        updateSavedPlayersList();
    }
}

async function removePlayer(playerId) {
    const playerIndex = players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;
    
    const player = players[playerIndex];
    const playerName = player.name;
    
    players.splice(playerIndex, 1);
    savePlayers();
    updatePlayerList();
    showAlert(`Jogador ${playerName} removido!`, 'warning');
    
    if (apiConnected && player.firebase_id) {
        const result = await PlayersAPI.deletePlayer(player.firebase_id);
        
        if (result.success) {
            console.log('✅ Jogador removido da API:', playerName);
            
            const savedPlayerIndex = savedPlayers.findIndex(p => p.firebase_id === player.firebase_id);
            if (savedPlayerIndex !== -1) {
                savedPlayers.splice(savedPlayerIndex, 1);
                saveSavedPlayers();
                updateSavedPlayersList();
            }
        } else {
            console.error('❌ Erro ao remover jogador da API:', result.error);
        }
    }
}

// Funções de sincronização com Firebase/API
async function loadPlayersFromAPI() {
    try {
        const result = await PlayersAPI.getAllPlayers();
        if (result.success) {
            const apiPlayers = result.players.map(player => ({
                id: player.firebase_id,
                name: player.name,
                level: player.level,
                gender: player.gender,
                isSetter: player.isSetter,
                createdAt: player.createdAt || new Date().toISOString(),
                firebase_id: player.firebase_id
            }));
            
            apiPlayers.forEach(apiPlayer => {
                const existsLocally = players.some(localPlayer => localPlayer.firebase_id === apiPlayer.firebase_id);
                if (!existsLocally) {
                    players.push(apiPlayer);
                }
                
                const existsInSaved = savedPlayers.some(savedPlayer => 
                    savedPlayer.firebase_id === apiPlayer.firebase_id ||
                    (savedPlayer.name === apiPlayer.name && savedPlayer.gender === apiPlayer.gender)
                );
                
                if (!existsInSaved) {
                    const savedPlayer = {
                        id: apiPlayer.firebase_id,
                        name: apiPlayer.name,
                        level: apiPlayer.level,
                        gender: apiPlayer.gender,
                        isSetter: apiPlayer.isSetter,
                        firebase_id: apiPlayer.firebase_id,
                        createdAt: apiPlayer.createdAt,
                        lastUsed: apiPlayer.createdAt
                    };
                    savedPlayers.push(savedPlayer);
                }
            });
            
            savePlayers();
            saveSavedPlayers();
            console.log(`📥 ${apiPlayers.length} jogadores carregados da API`);
        }
    } catch (error) {
        console.error('Erro ao carregar jogadores da API:', error);
    }
}

async function syncPlayerWithAPI(playerData) {
    if (!apiConnected) return;
    
    try {
        const result = await PlayersAPI.createPlayer(playerData);
        if (result.success) {
            console.log('✅ Jogador sincronizado com API:', result.player.name);
            return result.player;
        } else {
            console.error('❌ Erro ao sincronizar jogador:', result.error);
        }
    } catch (error) {
        console.error('❌ Erro ao sincronizar jogador:', error);
    }
}

async function reloadPlayersFromFirebase() {
    console.log('🔄 Recarregando jogadores do Firebase...');
    
    if (apiConnected) {
        await loadPlayersFromAPI();
        updatePlayerList();
        updateSavedPlayersList();
        showAlert('Jogadores recarregados do Firebase!', 'success');
    } else {
        apiConnected = await PlayersAPI.checkAPIHealth();
        if (apiConnected) {
            console.log('✅ Reconectado com a API Backend');
            await loadPlayersFromAPI();
            updatePlayerList();
            updateSavedPlayersList();
            showAlert('Reconectado! Jogadores recarregados do Firebase!', 'success');
        } else {
            syncWithFirebase();
            setTimeout(() => {
                updateSavedPlayersList();
                showAlert('Sincronização com Firebase concluída!', 'info');
            }, 1000);
        }
    }
}

function syncWithFirebase() {
    if (typeof window.firebaseDatabase === 'undefined' || typeof window.firebaseRef === 'undefined' || typeof window.firebaseOnValue === 'undefined') {
        console.log('Firebase não está disponível para sincronização');
        return;
    }

    try {
        const playersRef = window.firebaseRef(window.firebaseDatabase, 'players');
        
        window.firebaseOnValue(playersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log('Jogadores sincronizados do Firebase:');
                
                Object.entries(data).forEach(([firebaseId, player]) => {
                    console.log(`- ${player.name}: ${player.level}, ${player.gender}, Levantador: ${player.isSetter}`);
                    
                    const existsInSaved = savedPlayers.some(savedPlayer => 
                        savedPlayer.firebase_id === firebaseId ||
                        (savedPlayer.name === player.name && savedPlayer.gender === player.gender)
                    );
                    
                    if (!existsInSaved) {
                        const savedPlayer = {
                            id: firebaseId,
                            name: player.name,
                            level: player.level,
                            gender: player.gender,
                            isSetter: player.isSetter || false,
                            firebase_id: firebaseId,
                            createdAt: player.createdAt || new Date().toISOString(),
                            lastUsed: player.updatedAt || player.createdAt || new Date().toISOString()
                        };
                        savedPlayers.push(savedPlayer);
                        
                        console.log(`✅ Jogador ${player.name} adicionado ao banco de jogadores`);
                    }
                });
                
                saveSavedPlayers();
                updateSavedPlayersList();
            }
        });
    } catch (error) {
        console.error('Erro ao sincronizar com Firebase:', error);
    }
}

// Funções de interface
function updatePlayerList() {
    elements.list.innerHTML = '';
    
    if (players.length === 0) {
        elements.list.innerHTML = `
            <li class="list-group-item text-center text-muted py-4">
                Nenhum jogador adicionado ainda.<br>
                Adicione jogadores usando o formulário acima.
            </li>
        `;
        elements.countElement.textContent = '0';
        elements.regenerateBtn.style.display = 'none';
        elements.generateBtn.style.display = 'block';
        return;
    }
    
    const uniquePlayers = [...new Map(players.map(p => [p.id, p]))].map(([_, p]) => p);
    elements.countElement.textContent = uniquePlayers.length;
    
    const sortedPlayers = [...players].sort((a, b) => 
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
    
    sortedPlayers.forEach(player => {
        const playerElement = createPlayerElement(player);
        elements.list.appendChild(playerElement);
    });
}

function createPlayerElement(player) {
    const li = document.createElement('li');
    li.className = `list-group-item d-flex justify-content-between align-items-center ${player.isSetter ? 'setter' : ''}`;
    
    li.innerHTML = `
        <div class="player-info" data-id="${player.id}">
            <span class="player-name">${player.name}</span>
            <span class="badge role-badge ${player.gender}">
                ${player.gender.charAt(0).toUpperCase()}
            </span>
            ${player.isSetter ? '<span class="setter-badge">L</span>' : ''}
        </div>
        <button class="btn btn-sm btn-outline-danger delete-player" data-id="${player.id}" title="Remover jogador">
            &times;
        </button>
    `;
    
    li.querySelector('.player-info').addEventListener('click', () => editPlayer(player.id));
    li.querySelector('.delete-player').addEventListener('click', (e) => {
        e.stopPropagation();
        removePlayer(player.id);
    });
    
    return li;
}

function editPlayer(id) {
    const player = players.find(p => p.id === id);
    if (!player) return;
    
    elements.idInput.value = player.id;
    elements.nameInput.value = player.name;
    document.getElementById(`level-${player.level.replace('ó', 'o')}`).checked = true;
    document.getElementById(`gender-${player.gender === 'masculino' ? 'male' : 'female'}`).checked = true;
    document.getElementById('player-setter').checked = player.isSetter;
    
    elements.submitBtn.innerHTML = '<i class="bi bi-save"></i> Salvar Alterações';
    elements.cancelEditBtn.style.display = 'block';
    elements.nameInput.focus();
}

function resetForm() {
    elements.form.reset();
    elements.idInput.value = '';
    elements.submitBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Adicionar Jogador';
    elements.cancelEditBtn.style.display = 'none';
    elements.nameInput.focus();
}

function cancelEdit() {
    resetForm();
}

// Funções para jogadores salvos
function savePlayerToSavedDatabase(name, level, gender, isSetter = false, firebase_id = null) {
    const existingIndex = savedPlayers.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (existingIndex === -1) {
        savedPlayers.push({
            id: firebase_id || Date.now().toString(),
            name,
            level,
            gender,
            isSetter,
            firebase_id,
            lastUsed: new Date().toISOString()
        });
    } else {
        savedPlayers[existingIndex] = {
            ...savedPlayers[existingIndex],
            level,
            gender,
            isSetter,
            firebase_id: firebase_id || savedPlayers[existingIndex].firebase_id,
            lastUsed: new Date().toISOString()
        };
    }
    
    saveSavedPlayers();
    updateSavedPlayersList();
}

function updateSavedPlayersList() {
    elements.savedList.innerHTML = '';
    
    if (savedPlayers.length === 0) {
        elements.savedList.innerHTML = '<p class="text-muted">Nenhum jogador salvo ainda.</p>';
        return;
    }
    
    const sortedPlayers = [...savedPlayers].sort((a, b) => 
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
    
    sortedPlayers.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.className = 'saved-player';
        playerElement.dataset.id = player.id;
        
        const firebaseIndicator = player.firebase_id ? 
            '<span class="firebase-indicator" title="Jogador sincronizado com Firebase">🔥</span>' : '';
        
        playerElement.innerHTML = `
            ${player.name}
            <span class="badge role-badge ${player.gender}">
                ${player.gender.charAt(0).toUpperCase()}
            </span>
            ${player.isSetter ? '<span class="setter-badge">L</span>' : ''}
            ${firebaseIndicator}
            <span class="delete-saved" data-id="${player.id}">&times;</span>
        `;
        
        playerElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-saved')) {
                addPlayerFromSaved(player.id);
            }
        });
        
        playerElement.querySelector('.delete-saved').addEventListener('click', (e) => {
            e.stopPropagation();
            removeSavedPlayer(player.id);
        });
        
        elements.savedList.appendChild(playerElement);
    });
}

function addPlayerFromSaved(playerId) {
    const player = savedPlayers.find(p => p.id === playerId);
    if (!player) return;
    
    const exists = players.some(p => {
        if (p.firebase_id && player.firebase_id) {
            return p.firebase_id === player.firebase_id;
        }
        return p.name.toLowerCase() === player.name.toLowerCase() && 
               p.gender === player.gender && 
               p.level === player.level;
    });
    
    if (exists) {
        const existingPlayerElement = [...elements.list.children].find(li => {
            const playerName = li.querySelector('.player-name').textContent;
            return playerName.toLowerCase() === player.name.toLowerCase();
        });
        
        if (existingPlayerElement) {
            existingPlayerElement.classList.add('duplicate-highlight');
            setTimeout(() => {
                existingPlayerElement.classList.remove('duplicate-highlight');
            }, 2000);
        }
        
        showAlert(`${player.name} já está na lista!`, 'warning');
        return;
    }

    const newPlayer = {
        id: player.firebase_id || Date.now().toString(),
        name: player.name,
        level: player.level,
        gender: player.gender,
        isSetter: player.isSetter,
        createdAt: player.createdAt || new Date().toISOString(),
        firebase_id: player.firebase_id
    };
    
    players.push(newPlayer);
    savePlayers();
    updatePlayerList();
    showAlert(`Jogador ${player.name} adicionado!`, 'success');
}

function toggleSavedPlayersList() {
    const isHidden = elements.savedList.style.display === 'none';
    elements.savedList.style.display = isHidden ? 'flex' : 'none';
    elements.toggleSavedBtn.innerHTML = isHidden 
        ? '<i class="bi bi-chevron-up"></i>' 
        : '<i class="bi bi-chevron-down"></i>';
}

function removeSavedPlayer(playerId) {
    const playerIndex = savedPlayers.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;
    
    const playerName = savedPlayers[playerIndex].name;
    savedPlayers.splice(playerIndex, 1);
    saveSavedPlayers();
    updateSavedPlayersList();
    showAlert(`Jogador ${playerName} removido do banco de dados!`, 'warning');
}

// Funções para geração de times
function handleGenerateTeams() {
    if (players.length < 2) {
        showAlert('Você precisa de pelo menos 2 jogadores para formar times!', 'error');
        return;
    }

    const suggestedTeams = calculateSuggestedTeams();
    const numTeams = prompt(`Quantos times deseja formar? (Sugerido: ${suggestedTeams})`, suggestedTeams);
    
    if (!numTeams || isNaN(numTeams) || numTeams < 1) return;
    
    generateTeams(parseInt(numTeams));
}

function generateTeams(numTeams) {
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const availablePlayers = [...shuffledPlayers];
    const teams = Array(numTeams).fill().map(() => []);
    
    elements.teamOutput.innerHTML = '';
    
    const femalePlayers = availablePlayers.filter(p => p.gender === 'feminino');
    const malePlayers = availablePlayers.filter(p => p.gender === 'masculino');
    
    distributePlayers(femalePlayers, teams, availablePlayers);
    distributeMalePlayers(malePlayers, teams, availablePlayers);
    balanceTeams(teams, availablePlayers);
    ensureMinimumSetters(teams, availablePlayers);
    
    displayTeams(teams);
    currentTeams = teams;
    elements.generateBtn.style.display = 'none';
    elements.regenerateBtn.style.display = 'block';
    showAlert(`${teams.length} novos times gerados com sucesso!`, 'success');
}

// Funções auxiliares para geração de times
function groupPlayersByLevel(players) {
    const levelValues = { 'delicioso': 4, 'ótimo': 3, 'bom': 2, 'ok': 1 };
    const levels = {};
    
    players.forEach(player => {
        const level = player.level;
        if (!levels[level]) {
            levels[level] = [];
        }
        levels[level].push(player);
    });
    
    return Object.entries(levels)
        .sort((a, b) => levelValues[b[0]] - levelValues[a[0]])
        .map(([_, group]) => group);
}

function distributePlayers(players, teams, availablePlayers) {
    const groupedByLevel = groupPlayersByLevel(players);
    
    for (const levelGroup of groupedByLevel) {
        const shuffledGroup = [...levelGroup].sort(() => Math.random() - 0.5);
        
        shuffledGroup.forEach((player, index) => {
            const teamIndex = index % teams.length;
            teams[teamIndex].push(player);
            removeFromAvailable(player, availablePlayers);
        });
    }
}

function distributeMalePlayers(malePlayers, teams, availablePlayers) {
    const maleSetters = malePlayers.filter(p => p.isSetter);
    const maleNonSetters = malePlayers.filter(p => !p.isSetter);
    
    distributeSetters(maleSetters, teams, availablePlayers);
    distributeByLevel(maleNonSetters, teams, availablePlayers);
}

function distributeSetters(setters, teams, availablePlayers) {
    const shuffledSetters = [...setters].sort(() => Math.random() - 0.5);
    shuffledSetters.slice(0, teams.length).forEach((setter, index) => {
        const teamIndex = index % teams.length;
        teams[teamIndex].push(setter);
        removeFromAvailable(setter, availablePlayers);
    });
}

function distributeByLevel(players, teams, availablePlayers) {
    const groupedByLevel = groupPlayersByLevel(players);
    
    for (const levelGroup of groupedByLevel) {
        const shuffledGroup = [...levelGroup].sort(() => Math.random() - 0.5);
        
        shuffledGroup.forEach(player => {
            const teamIndex = findBestTeamForPlayer(teams);
            if (teamIndex !== -1) {
                teams[teamIndex].push(player);
                removeFromAvailable(player, availablePlayers);
            }
        });
    }
}

function comparePlayersByLevel(a, b) {
    const levelValues = { 'delicioso': 4, 'ótimo': 3, 'bom': 2, 'ok': 1 };
    return levelValues[b.level] - levelValues[a.level];
}

function findBestTeamForPlayer(teams) {
    if (teams.length === 0) return -1;
    
    return teams.reduce((bestIndex, team, currentIndex) => {
        if (team.length >= 6) return bestIndex;
        if (bestIndex === -1) return currentIndex;
        return calculateTeamScore(team) < calculateTeamScore(teams[bestIndex]) ? currentIndex : bestIndex;
    }, -1);
}

function calculateTeamScore(team) {
    const levelValues = { 'ok': 1, 'bom': 2, 'ótimo': 3, 'delicioso': 4 };
    return team.reduce((sum, player) => sum + (levelValues[player.level] || 0), 0);
}

function balanceTeams(teams, availablePlayers) {
    while (availablePlayers.length > 0) {
        const teamIndex = findTeamWithFewestPlayers(teams);
        if (teamIndex === -1 || teams[teamIndex].length >= 6) break;
        const player = availablePlayers.shift();
        teams[teamIndex].push(player);
    }
}

function findTeamWithFewestPlayers(teams) {
    return teams.reduce((bestIndex, team, currentIndex) => {
        if (bestIndex === -1) return currentIndex;
        return team.length < teams[bestIndex].length ? currentIndex : bestIndex;
    }, -1);
}

function ensureMinimumSetters(teams, availablePlayers) {
    teams.forEach(team => {
        if (!team.some(p => p.isSetter)) {
            const setterIndex = availablePlayers.findIndex(p => p.isSetter);
            if (setterIndex !== -1) {
                const setter = availablePlayers.splice(setterIndex, 1)[0];
                team.push(setter);
            } else if (team.length > 0) {
                const bestPlayerIndex = team.reduce((best, player, index) => {
                    return comparePlayersByLevel(player, team[best]) > 0 ? index : best;
                }, 0);
                team[bestPlayerIndex].isSetter = true;
            }
        }
    });
}

function removeFromAvailable(player, availablePlayers) {
    const index = availablePlayers.findIndex(p => p.id === player.id);
    if (index !== -1) availablePlayers.splice(index, 1);
}

function displayTeams(teams) {
    elements.teamOutput.innerHTML = '<h3 class="text-center mb-4">Times Gerados</h3>';
    
    if (teams.length === 0) {
        elements.teamOutput.innerHTML = '<p class="text-center">Nenhum time foi gerado.</p>';
        return;
    }
    
    teams.forEach((team, index) => {
        const teamElement = createTeamElement(team, index);
        elements.teamOutput.appendChild(teamElement);
    });
}

function createTeamElement(team, index) {
    const teamDiv = document.createElement('div');
    teamDiv.className = 'team mb-4';
    
    teamDiv.innerHTML = `
        <h3 class="team-header">Time ${index + 1}</h3>
        <ul class="list-group team-players">
            ${team.map(player => `
                <li class="list-group-item d-flex justify-content-between align-items-center ${player.isSetter ? 'setter' : ''}">
                    <span class="player-info">
                        ${player.name}
                        <span class="badge role-badge ${player.gender}">
                            ${player.gender.charAt(0).toUpperCase()}
                        </span>
                        ${player.isSetter ? '<span class="setter-badge">L</span>' : ''}
                    </span>
                </li>
            `).join('')}
        </ul>
    `;
    
    return teamDiv;
}

function handleClearPlayers() {
    if (players.length === 0) {
        showAlert('Não há jogadores para remover!', 'warning');
        return;
    }

    if (confirm('Tem certeza que deseja remover TODOS os jogadores?')) {
        clearPlayers();
        showAlert('Todos os jogadores foram removidos!', 'success');
    }
}

function clearPlayers() {
    players = [];
    savePlayers();
    updatePlayerList();
    elements.teamOutput.innerHTML = '';
    currentTeams = null;
    elements.generateBtn.style.display = 'block';
    elements.regenerateBtn.style.display = 'none';
}

// Funções utilitárias
function savePlayers() {
    localStorage.setItem('players', JSON.stringify(players));
}

function saveSavedPlayers() {
    localStorage.setItem('savedPlayers', JSON.stringify(savedPlayers));
}

function showAlert(message, type = 'info') {
    const alertBox = document.createElement('div');
    alertBox.className = `alert alert-${type} alert-dismissible fade show`;
    alertBox.role = 'alert';
    alertBox.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const alertsContainer = document.getElementById('alerts-container') || createAlertsContainer();
    alertsContainer.prepend(alertBox);
    
    setTimeout(() => {
        alertBox.classList.remove('show');
        setTimeout(() => alertBox.remove(), 150);
    }, 5000);
}

function createAlertsContainer() {
    const container = document.createElement('div');
    container.id = 'alerts-container';
    container.className = 'position-fixed top-0 end-0 p-3';
    container.style.zIndex = '1100';
    document.body.appendChild(container);
    return container;
}

function calculateSuggestedTeams() {
    const minPlayersPerTeam = 3;
    const femalePlayers = players.filter(p => p.gender === 'feminino').length;
    const maxSuggested = femalePlayers > 0 ? Math.min(
        Math.floor(players.length / minPlayersPerTeam),
        femalePlayers
    ) : Math.floor(players.length / minPlayersPerTeam);
    return maxSuggested || 2;
}

// Funções de exemplo para testes
async function createSamplePlayers() {
    if (!apiConnected) {
        console.log('❌ API não está conectada. Não é possível criar jogadores de exemplo.');
        return;
    }
    
    const samplePlayers = [
        { name: "João Silva", level: "bom", gender: "masculino", isSetter: false },
        { name: "Maria Santos", level: "ótimo", gender: "feminino", isSetter: true },
        { name: "Pedro Costa", level: "delicioso", gender: "masculino", isSetter: false },
        { name: "Ana Oliveira", level: "bom", gender: "feminino", isSetter: false },
        { name: "Carlos Lima", level: "ok", gender: "masculino", isSetter: true }
    ];
    
    console.log('🔧 Criando jogadores de exemplo no Firebase...');
    
    for (const player of samplePlayers) {
        const result = await PlayersAPI.createPlayer(player);
        if (result.success) {
            console.log(`✅ Jogador ${player.name} criado com sucesso`);
        } else {
            console.log(`❌ Erro ao criar jogador ${player.name}:`, result.error);
        }
    }
    
    setTimeout(() => {
        reloadPlayersFromFirebase();
    }, 1000);
}

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', init);