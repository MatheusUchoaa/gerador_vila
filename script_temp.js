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

// Sistema de logging profissional
const Logger = {
    success: (message, data = null) => {
        console.log(`[SUCCESS] ${message}`, data || '');
    },
    error: (message, error = null) => {
        console.error(`[ERROR] ${message}`, error || '');
    },
    warning: (message, data = null) => {
        console.warn(`[WARNING] ${message}`, data || '');
    },
    info: (message, data = null) => {
        console.log(`[INFO] ${message}`, data || '');
    },
    debug: (message, data = null) => {
        console.log(`[DEBUG] ${message}`, data || '');
    }
};

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
      Logger.error(Erro ao buscar jogadores da API:', error);
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
      Logger.error(Erro ao criar jogador na API:', error);
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
      Logger.error(Erro ao atualizar jogador na API:', error);
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
      Logger.error(Erro ao remover jogador na API:', error);
      return { success: false, error: 'Erro de conexão com a API' };
    }
  }

  static async checkAPIHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      Logger.error(API Backend não está disponível:', error);
      return false;
    }
  }
}

// Inicialização
async function init() {
    apiConnected = await PlayersAPI.checkAPIHealth();
    if (apiConnected) {
        Logger.success('API Backend conectada');
        await loadPlayersFromAPI();
    } else {
        Logger.warning('API Backend não disponível, usando dados locais');
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
    window.testFirebaseConnection = testFirebaseConnection;
    window.create22PlayersDemo = create22PlayersDemo;
    
    Logger.success(🔧 Funções disponíveis:');
    Logger.success(  - reloadPlayersFromFirebase(): Recarrega jogadores do Firebase');
    Logger.success(  - createSamplePlayers(): Cria jogadores de exemplo no Firebase');
    Logger.success(  - testFirebaseConnection(): Testa conexão com Firebase');
    Logger.success(  - create22PlayersDemo(): Cria 22 jogadores para demonstração');
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

    // Verifica se estamos editando um jogador salvo do Firebase
    if (playerId && playerId.startsWith('saved_')) {
        const savedPlayerId = playerId.replace('saved_', '');
        Logger.info(`Detectada edição de jogador salvo: ${savedPlayerId}`);
        await updateSavedPlayerInFirebase(savedPlayerId, name, level, gender, isSetter);
    } else if (playerId) {
        // Edição de jogador normal (da lista atual)
        await updatePlayer(playerId, name, level, gender, isSetter);
    } else {
        // Adição de novo jogador
        await addPlayer(name, level, gender, isSetter);
    }
    
    resetForm();
}

async function addPlayer(name, level, gender, isSetter = false) {
    // Primeiro verifica se já existe um jogador com o mesmo nome
    const existingPlayer = players.find(p => 
        p.name.toLowerCase() === name.toLowerCase() && p.gender === gender
    );
    
    if (existingPlayer) {
        showAlert(`Jogador ${name} já existe na lista!`, 'warning');
        return;
    }
    
    const newPlayer = {
        id: Date.now().toString(),
        name,
        level,
        gender,
        isSetter,
        createdAt: new Date().toISOString()
    };
    
    // Adiciona à lista local primeiro
    players.push(newPlayer);
    savePlayers();
    updatePlayerList();
    showAlert(`Jogador ${name} adicionado com sucesso!`, 'success');
    
    // Tenta sincronizar com Firebase via API
    if (apiConnected) {
        Logger.info('Sincronizando com Firebase via API...');
        const playerData = { name, level, gender, isSetter };
        const apiPlayer = await syncPlayerWithAPI(playerData);
        
        if (apiPlayer && apiPlayer.firebase_id) {
            // Atualiza o jogador local com o ID do Firebase
            const playerIndex = players.findIndex(p => p.id === newPlayer.id);
            if (playerIndex !== -1) {
                players[playerIndex].firebase_id = apiPlayer.firebase_id;
                savePlayers();
                Logger.success(`Jogador ${name} sincronizado com Firebase (ID: ${apiPlayer.firebase_id})`);
            }
            
            // Adiciona ao banco de jogadores salvos
            savePlayerToSavedDatabase(name, level, gender, isSetter, apiPlayer.firebase_id);
        } else {
            Logger.warning(`Falha na sincronização via API para ${name}, tentando Firebase direto`);
            // Fallback: tenta salvar diretamente no Firebase
            await savePlayerDirectlyToFirebase(name, level, gender, isSetter, newPlayer.id);
        }
    } else {
        Logger.warning('API não disponível, tentando Firebase direto...');
        // Se API não estiver disponível, tenta Firebase direto
        await savePlayerDirectlyToFirebase(name, level, gender, isSetter, newPlayer.id);
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
            Logger.success('Jogador atualizado na API:', name);
        } else {
            Logger.error('Erro ao atualizar jogador na API:', result.error);
        }
    } else if (oldPlayer.firebase_id) {
        // Fallback: apenas atualiza no banco local se não há API disponível
        Logger.warning('API não disponível, mantendo dados locais apenas');
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

// Esta função foi movida para baixo e aprimorada com confirmação e opções de exclusão do Firebase

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
        Logger.error(Erro ao carregar jogadores da API:', error);
    }
}

async function syncPlayerWithAPI(playerData) {
    if (!apiConnected) return null;
    
    try {
        const result = await PlayersAPI.createPlayer(playerData);
        if (result.success) {
            Logger.success(✅ Jogador sincronizado com API:', result.player.name);
            return result.player;
        } else {
            Logger.error(❌ Erro ao sincronizar jogador:', result.error);
            return null;
        }
    } catch (error) {
        Logger.error(❌ Erro ao sincronizar jogador:', error);
        return null;
    }
}

// Função para salvar diretamente no Firebase quando API não funciona
async function savePlayerDirectlyToFirebase(name, level, gender, isSetter, localId) {
    // Verifica se o Firebase está disponível
    if (typeof window.firebaseDatabase === 'undefined' || typeof window.firebaseRef === 'undefined' || typeof window.firebaseSet === 'undefined') {
        Logger.success(❌ Firebase não está disponível para salvamento direto');
        // Adiciona ao banco local mesmo assim
        savePlayerToSavedDatabase(name, level, gender, isSetter);
        return;
    }

    try {
        Logger.success(🔄 Tentando salvar diretamente no Firebase...');
        
        const playerData = {
            name,
            level,
            gender,
            isSetter,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Gera um ID único para o Firebase
        const firebaseId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const playerRef = window.firebaseRef(window.firebaseDatabase, `players/${firebaseId}`);
        
        await window.firebaseSet(playerRef, playerData);
        
        console.log(`✅ Jogador ${name} salvo diretamente no Firebase (ID: ${firebaseId})`);
        
        // Atualiza o jogador local com o ID do Firebase
        const playerIndex = players.findIndex(p => p.id === localId);
        if (playerIndex !== -1) {
            players[playerIndex].firebase_id = firebaseId;
            savePlayers();
        }
        
        // Adiciona ao banco de jogadores salvos
        savePlayerToSavedDatabase(name, level, gender, isSetter, firebaseId);
        
        // Mostra mensagem de sucesso
        showAlert(`Jogador ${name} salvo no Firebase!`, 'success');
        
    } catch (error) {
        Logger.error(❌ Erro ao salvar diretamente no Firebase:', error);
        Logger.success(💾 Salvando apenas localmente...');
        
        // Fallback: salva apenas localmente
        savePlayerToSavedDatabase(name, level, gender, isSetter);
        showAlert(`Jogador ${name} salvo localmente (Firebase indisponível)`, 'warning');
    }
}

// Função para carregar jogadores diretamente do Firebase
async function loadPlayersDirectlyFromFirebase() {
    if (typeof window.firebaseDatabase === 'undefined' || typeof window.firebaseRef === 'undefined' || typeof window.firebaseGet === 'undefined') {
        Logger.success(❌ Firebase não está disponível para carregamento direto');
        return false;
    }

    try {
        Logger.success(📥 Carregando jogadores diretamente do Firebase...');
        
        const playersRef = window.firebaseRef(window.firebaseDatabase, 'players');
        const snapshot = await window.firebaseGet(playersRef);
        
        if (snapshot.exists()) {
            const firebaseData = snapshot.val();
            let loadedCount = 0;
            
            Object.entries(firebaseData).forEach(([firebaseId, player]) => {
                // Verifica se o jogador já existe localmente
                const existsLocally = players.some(localPlayer => 
                    localPlayer.firebase_id === firebaseId ||
                    (localPlayer.name === player.name && localPlayer.gender === player.gender)
                );
                
                if (!existsLocally) {
                    const newPlayer = {
                        id: firebaseId,
                        name: player.name,
                        level: player.level,
                        gender: player.gender,
                        isSetter: player.isSetter || false,
                        createdAt: player.createdAt || new Date().toISOString(),
                        firebase_id: firebaseId
                    };
                    players.push(newPlayer);
                    loadedCount++;
                }
                
                // Adiciona ao banco de jogadores salvos se não existir
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
                }
            });
            
            // Salva as alterações
            savePlayers();
            saveSavedPlayers();
            
            console.log(`✅ ${loadedCount} novos jogadores carregados diretamente do Firebase`);
            console.log(`💾 Total de jogadores no banco: ${savedPlayers.length}`);
            
            return true;
        } else {
            Logger.success(📭 Nenhum jogador encontrado no Firebase');
            return true;
        }
        
    } catch (error) {
        Logger.error(❌ Erro ao carregar diretamente do Firebase:', error);
        return false;
    }
}

async function reloadPlayersFromFirebase() {
    Logger.success(🔄 Recarregando jogadores do Firebase...');
    
    // Primeiro tenta via API
    const wasConnected = apiConnected;
    apiConnected = await PlayersAPI.checkAPIHealth();
    
    if (apiConnected) {
        Logger.success(✅ API disponível, carregando via API...');
        await loadPlayersFromAPI();
        updatePlayerList();
        updateSavedPlayersList();
        showAlert('Jogadores recarregados do Firebase via API!', 'success');
    } else {
        Logger.success(⚠️ API não disponível, tentando Firebase direto...');
        
        // Tenta carregar diretamente do Firebase
        const firebaseSuccess = await loadPlayersDirectlyFromFirebase();
        
        if (firebaseSuccess) {
            updatePlayerList();
            updateSavedPlayersList();
            showAlert('Jogadores carregados diretamente do Firebase!', 'info');
        } else {
            Logger.success(❌ Falha ao carregar do Firebase, usando dados locais');
            showAlert('Não foi possível conectar ao Firebase. Usando dados locais.', 'warning');
        }
    }
    
    // Se reconectou à API, informa o usuário
    if (!wasConnected && apiConnected) {
        Logger.success(🔗 Reconectado à API Backend!');
    }
}

function syncWithFirebase() {
    if (typeof window.firebaseDatabase === 'undefined' || typeof window.firebaseRef === 'undefined' || typeof window.firebaseOnValue === 'undefined') {
        Logger.success(Firebase não está disponível para sincronização');
        return;
    }

    try {
        const playersRef = window.firebaseRef(window.firebaseDatabase, 'players');
        
        window.firebaseOnValue(playersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                Logger.success(Jogadores sincronizados do Firebase:');
                
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
        Logger.error(Erro ao sincronizar com Firebase:', error);
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
    // Verifica se estava editando um jogador do Firebase
    const formCard = elements.form.closest('.card') || elements.form.closest('section');
    if (formCard && formCard.classList.contains('editing-firebase-player')) {
        resetFormAfterFirebaseEdit();
    } else {
        resetForm();
    }
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
            <div class="saved-player-actions">
                <button class="edit-saved-btn" data-id="${player.id}" title="Editar jogador">
                    <i class="bi bi-pencil"></i>
                </button>
                <span class="delete-saved" data-id="${player.id}" title="Remover jogador">&times;</span>
            </div>
        `;
        
        playerElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-saved') && 
                !e.target.classList.contains('edit-saved-btn') &&
                !e.target.closest('.saved-player-actions')) {
                addPlayerFromSaved(player.id);
            }
        });
        
        playerElement.querySelector('.edit-saved-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            editSavedPlayer(player.id);
        });
        
        playerElement.querySelector('.delete-saved').addEventListener('click', (e) => {
            e.stopPropagation();
            removeSavedPlayer(player.id);
        });
        
        elements.savedList.appendChild(playerElement);
    });
}

/**
 * Função para editar um jogador salvo no Firebase
 * @param {string} playerId - ID do jogador no banco de jogadores salvos
 */
async function editSavedPlayer(playerId) {
    console.log(`🔧 Iniciando edição do jogador salvo ID: ${playerId}`);
    
    // Busca o jogador no banco de jogadores salvos
    const savedPlayer = savedPlayers.find(p => p.id === playerId);
    if (!savedPlayer) {
        Logger.error(❌ Jogador não encontrado no banco de salvos');
        showAlert('Jogador não encontrado!', 'error');
        return;
    }
    
    // Verifica se o jogador tem firebase_id (necessário para edição no Firebase)
    if (!savedPlayer.firebase_id) {
        console.warn('⚠️ Jogador não possui firebase_id - editando apenas localmente');
        showAlert('Este jogador não está sincronizado com o Firebase. Edição apenas local.', 'warning');
    }
    
    console.log(`📝 Editando jogador: ${savedPlayer.name} (Firebase ID: ${savedPlayer.firebase_id || 'N/A'})`);
    
    try {
        // Preenche o formulário com os dados atuais do jogador
        await fillFormForEdit(savedPlayer);
        
        // Marca o formulário como modo de edição para jogador salvo
        elements.idInput.value = `saved_${playerId}`;
        elements.submitBtn.innerHTML = '<i class="bi bi-save"></i> Atualizar no Firebase';
        elements.cancelEditBtn.style.display = 'block';
        elements.nameInput.focus();
        
        // Adiciona indicador visual de que está editando um jogador do Firebase
        const formCard = elements.form.closest('.card') || elements.form.closest('section');
        if (formCard) {
            formCard.classList.add('editing-firebase-player');
            
            // Adiciona badge indicando edição do Firebase
            let firebaseBadge = formCard.querySelector('.firebase-edit-badge');
            if (!firebaseBadge) {
                firebaseBadge = document.createElement('div');
                firebaseBadge.className = 'firebase-edit-badge';
                firebaseBadge.innerHTML = '<i class="bi bi-cloud-arrow-up"></i> Editando jogador do Firebase';
                formCard.insertBefore(firebaseBadge, formCard.firstChild);
            }
        }
        
        Logger.success(✅ Formulário preenchido para edição');
        showAlert(`Editando: ${savedPlayer.name}. Faça as alterações e clique em "Atualizar no Firebase".`, 'info');
        
    } catch (error) {
        Logger.error(❌ Erro ao iniciar edição:', error);
        showAlert('Erro ao carregar dados para edição!', 'error');
    }
}

/**
 * Preenche o formulário com os dados do jogador para edição
 * @param {Object} player - Dados do jogador
 */
async function fillFormForEdit(player) {
    try {
        // Limpa o formulário primeiro
        elements.form.reset();
        
        // Preenche nome
        elements.nameInput.value = player.name;
        
        // Seleciona o nível correto
        const levelRadios = document.querySelectorAll('input[name="level"]');
        levelRadios.forEach(radio => {
            if (radio.value === player.level) {
                radio.checked = true;
            }
        });
        
        // Seleciona o gênero correto
        const genderRadios = document.querySelectorAll('input[name="gender"]');
        genderRadios.forEach(radio => {
            if ((radio.value === 'masculino' && player.gender === 'masculino') ||
                (radio.value === 'feminino' && player.gender === 'feminino')) {
                radio.checked = true;
            }
        });
        
        // Define se é levantador
        const setterCheckbox = document.getElementById('player-setter');
        if (setterCheckbox) {
            setterCheckbox.checked = Boolean(player.isSetter);
        }
        
        Logger.success(📋 Formulário preenchido com dados:', {
            name: player.name,
            level: player.level,
            gender: player.gender,
            isSetter: player.isSetter
        });
        
    } catch (error) {
        Logger.error(❌ Erro ao preencher formulário:', error);
        throw error;
    }
}

/**
 * Atualiza um jogador salvo no Firebase
 * @param {string} playerId - ID do jogador no banco local
 * @param {string} name - Nome do jogador
 * @param {string} level - Nível do jogador
 * @param {string} gender - Gênero do jogador
 * @param {boolean} isSetter - Se é levantador
 */
async function updateSavedPlayerInFirebase(playerId, name, level, gender, isSetter) {
    console.log(`🔄 Iniciando atualização do jogador salvo ID: ${playerId}`);
    
    try {
        // Busca o jogador no banco de salvos
        const savedPlayerIndex = savedPlayers.findIndex(p => p.id === playerId);
        if (savedPlayerIndex === -1) {
            throw new Error('Jogador não encontrado no banco de salvos');
        }
        
        const savedPlayer = savedPlayers[savedPlayerIndex];
        const firebaseId = savedPlayer.firebase_id;
        
        if (!firebaseId) {
            throw new Error('Jogador não possui firebase_id para atualização');
        }
        
        // Dados atualizados
        const updatedData = {
            name: name.trim(),
            level,
            gender,
            isSetter,
            lastUpdated: new Date().toISOString()
        };
        
        console.log(`📤 Enviando atualização para Firebase ID: ${firebaseId}`, updatedData);
        
        let updateResult = { success: false };
        
        // Tenta atualizar via API primeiro
        if (apiConnected) {
            Logger.success(🌐 Tentando atualizar via API...');
            updateResult = await PlayersAPI.updatePlayer(firebaseId, updatedData);
            
            if (updateResult.success) {
                Logger.success(✅ Jogador atualizado via API com sucesso');
            } else {
                console.warn('⚠️ Falha na API, tentando Firebase direto...');
            }
        }
        
        // Fallback: atualização direta no Firebase se API falhar
        if (!updateResult.success) {
            Logger.success(🔥 Tentando atualização direta no Firebase...');
            updateResult = await updatePlayerDirectlyInFirebase(firebaseId, updatedData);
        }
        
        if (updateResult.success) {
            // Atualiza o jogador no banco local de salvos
            savedPlayers[savedPlayerIndex] = {
                ...savedPlayer,
                name: updatedData.name,
                level: updatedData.level,
                gender: updatedData.gender,
                isSetter: updatedData.isSetter,
                lastUsed: new Date().toISOString()
            };
            
            // Atualiza também se o jogador estiver na lista atual
            const currentPlayerIndex = players.findIndex(p => 
                p.firebase_id === firebaseId || 
                (p.name.toLowerCase() === savedPlayer.name.toLowerCase() && p.gender === savedPlayer.gender)
            );
            
            if (currentPlayerIndex !== -1) {
                players[currentPlayerIndex] = {
                    ...players[currentPlayerIndex],
                    name: updatedData.name,
                    level: updatedData.level,
                    gender: updatedData.gender,
                    isSetter: updatedData.isSetter
                };
                savePlayers();
                updatePlayerList();
            }
            
            // Salva os jogadores salvos atualizados
            saveSavedPlayers();
            updateSavedPlayersList();
            
            Logger.success(✅ Jogador atualizado com sucesso em todos os bancos');
            showAlert(`${updatedData.name} atualizado com sucesso no Firebase!`, 'success');
            
            // Limpa o formulário e remove modo de edição
            resetFormAfterFirebaseEdit();
            
        } else {
            throw new Error(updateResult.error || 'Falha na atualização do Firebase');
        }
        
    } catch (error) {
        Logger.error(❌ Erro ao atualizar jogador no Firebase:', error);
        showAlert(`Erro ao atualizar jogador: ${error.message}`, 'error');
        
        // Não limpa o formulário em caso de erro para o usuário tentar novamente
        throw error;
    }
}

/**
 * Atualiza um jogador diretamente no Firebase (fallback quando API não está disponível)
 * @param {string} firebaseId - ID do documento no Firebase
 * @param {Object} playerData - Dados do jogador para atualizar
 * @returns {Object} Resultado da operação
 */
async function updatePlayerDirectlyInFirebase(firebaseId, playerData) {
    try {
        console.log(`🔥 Atualizando diretamente no Firebase: ${firebaseId}`);
        
        // Importa as funções necessárias do Firebase
        const { getDatabase, ref, update } = window.firebaseModules;
        const database = getDatabase();
        
        // Referência para o jogador específico
        const playerRef = ref(database, `players/${firebaseId}`);
        
        // Atualiza os dados
        await update(playerRef, playerData);
        
        Logger.success(✅ Atualização direta no Firebase bem-sucedida');
        return { success: true };
        
    } catch (error) {
        Logger.error(❌ Erro na atualização direta do Firebase:', error);
        return { 
            success: false, 
            error: error.message || 'Erro ao conectar com Firebase'
        };
    }
}

/**
 * Reseta o formulário após edição do Firebase
 */
function resetFormAfterFirebaseEdit() {
    // Remove classe de edição
    const formCard = elements.form.closest('.card') || elements.form.closest('section');
    if (formCard) {
        formCard.classList.remove('editing-firebase-player');
        
        // Remove badge de edição
        const firebaseBadge = formCard.querySelector('.firebase-edit-badge');
        if (firebaseBadge) {
            firebaseBadge.remove();
        }
    }
    
    // Reseta o formulário
    resetForm();
    
    Logger.success(🔄 Formulário resetado após edição do Firebase');
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

/**
 * Remove um jogador salvo tanto do banco local quanto do Firebase
 * @param {string} playerId - ID do jogador no banco de jogadores salvos
 */
async function removeSavedPlayer(playerId) {
    console.log(`🗑️ Iniciando exclusão do jogador salvo ID: ${playerId}`);
    
    try {
        // Busca o jogador no banco de jogadores salvos
        const playerIndex = savedPlayers.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            Logger.error(❌ Jogador não encontrado no banco de salvos');
            showAlert('Jogador não encontrado!', 'error');
            return;
        }
        
        const player = savedPlayers[playerIndex];
        const playerName = player.name;
        const firebaseId = player.firebase_id;
        
        console.log(`📝 Jogador encontrado: ${playerName} (Firebase ID: ${firebaseId || 'N/A'})`);
        
        // Confirmação antes de excluir
        const confirmMessage = firebaseId 
            ? `Tem certeza que deseja excluir "${playerName}" do Firebase?\n\n⚠️ Esta ação não pode ser desfeita!`
            : `Tem certeza que deseja remover "${playerName}" do banco local?`;
            
        if (!confirm(confirmMessage)) {
            Logger.success(❌ Exclusão cancelada pelo usuário');
            return;
        }
        
        // Se tem firebase_id, tenta excluir do Firebase primeiro
        if (firebaseId) {
            console.log(`🔥 Tentando excluir do Firebase: ${firebaseId}`);
            const deleteResult = await deleteSavedPlayerFromFirebase(firebaseId, playerName);
            
            if (!deleteResult.success) {
                // Se falhar no Firebase, pergunta se quer remover apenas localmente
                const fallbackConfirm = confirm(
                    `Erro ao excluir do Firebase: ${deleteResult.error}\n\n` +
                    `Deseja remover apenas do banco local?`
                );
                
                if (!fallbackConfirm) {
                    Logger.success(❌ Exclusão cancelada após erro no Firebase');
                    return;
                }
                
                Logger.success(⚠️ Prosseguindo com exclusão apenas local');
            }
        }
        
        // Remove do banco local de jogadores salvos
        savedPlayers.splice(playerIndex, 1);
        saveSavedPlayers();
        updateSavedPlayersList();
        
        // Remove também da lista atual se estiver lá
        const currentPlayerIndex = players.findIndex(p => 
            (firebaseId && p.firebase_id === firebaseId) ||
            (p.name.toLowerCase() === playerName.toLowerCase() && p.gender === player.gender)
        );
        
        if (currentPlayerIndex !== -1) {
            console.log(`🔄 Removendo também da lista atual de jogadores`);
            players.splice(currentPlayerIndex, 1);
            savePlayers();
            updatePlayerList();
        }
        
        const message = firebaseId 
            ? `${playerName} excluído do Firebase e banco local com sucesso!`
            : `${playerName} removido do banco local!`;
            
        console.log(`✅ ${message}`);
        showAlert(message, 'success');
        
    } catch (error) {
        Logger.error(❌ Erro ao remover jogador:', error);
        showAlert(`Erro ao remover jogador: ${error.message}`, 'error');
    }
}

/**
 * Exclui um jogador diretamente do Firebase
 * @param {string} firebaseId - ID do documento no Firebase
 * @param {string} playerName - Nome do jogador (para logs)
 * @returns {Object} Resultado da operação
 */
async function deleteSavedPlayerFromFirebase(firebaseId, playerName) {
    console.log(`🔥 Excluindo jogador do Firebase: ${firebaseId}`);
    
    try {
        let deleteResult = { success: false };
        
        // Tenta excluir via API primeiro
        if (apiConnected) {
            Logger.success(🌐 Tentando excluir via API...');
            deleteResult = await PlayersAPI.deletePlayer(firebaseId);
            
            if (deleteResult.success) {
                Logger.success(✅ Jogador excluído via API com sucesso');
                return { success: true };
            } else {
                console.warn('⚠️ Falha na API, tentando Firebase direto...');
            }
        }
        
        // Fallback: exclusão direta no Firebase se API falhar
        if (!deleteResult.success) {
            Logger.success(🔥 Tentando exclusão direta no Firebase...');
            deleteResult = await deletePlayerDirectlyFromFirebase(firebaseId);
        }
        
        if (deleteResult.success) {
            console.log(`✅ Jogador ${playerName} excluído do Firebase com sucesso`);
            return { success: true };
        } else {
            throw new Error(deleteResult.error || 'Falha na exclusão do Firebase');
        }
        
    } catch (error) {
        Logger.error(❌ Erro ao excluir jogador do Firebase:', error);
        return { 
            success: false, 
            error: error.message || 'Erro ao conectar com Firebase'
        };
    }
}

/**
 * Exclui um jogador diretamente do Firebase (fallback quando API não está disponível)
 * @param {string} firebaseId - ID do documento no Firebase
 * @returns {Object} Resultado da operação
 */
async function deletePlayerDirectlyFromFirebase(firebaseId) {
    try {
        console.log(`🔥 Excluindo diretamente do Firebase: ${firebaseId}`);
        
        // Importa as funções necessárias do Firebase
        const { getDatabase, ref, remove } = window.firebaseModules;
        const database = getDatabase();
        
        // Referência para o jogador específico
        const playerRef = ref(database, `players/${firebaseId}`);
        
        // Remove o documento
        await remove(playerRef);
        
        Logger.success(✅ Exclusão direta do Firebase bem-sucedida');
        return { success: true };
        
    } catch (error) {
        Logger.error(❌ Erro na exclusão direta do Firebase:', error);
        return { 
            success: false, 
            error: error.message || 'Erro ao conectar com Firebase'
        };
    }
}

/**
 * Remove um jogador da lista atual e opcionalmente do Firebase
 * @param {string} playerId - ID do jogador na lista atual
 */
async function removePlayer(playerId) {
    console.log(`🗑️ Iniciando remoção do jogador da lista atual: ${playerId}`);
    
    try {
        const playerIndex = players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            Logger.error(❌ Jogador não encontrado na lista atual');
            showAlert('Jogador não encontrado!', 'error');
            return;
        }
        
        const player = players[playerIndex];
        const playerName = player.name;
        const firebaseId = player.firebase_id;
        
        console.log(`📝 Removendo jogador: ${playerName} (Firebase ID: ${firebaseId || 'N/A'})`);
        
        // Se o jogador tem firebase_id, pergunta se quer excluir do Firebase também
        let deleteFromFirebase = false;
        if (firebaseId) {
            deleteFromFirebase = confirm(
                `"${playerName}" está sincronizado com o Firebase.\n\n` +
                `Deseja excluir permanentemente do Firebase também?\n\n` +
                `• SIM = Remove da lista E exclui do Firebase\n` +
                `• NÃO = Remove apenas da lista atual`
            );
        }
        
        // Remove da lista atual
        players.splice(playerIndex, 1);
        savePlayers();
        updatePlayerList();
        
        // Se escolheu excluir do Firebase
        if (deleteFromFirebase && firebaseId) {
            console.log(`🔥 Excluindo também do Firebase...`);
            const deleteResult = await deleteSavedPlayerFromFirebase(firebaseId, playerName);
            
            if (deleteResult.success) {
                // Remove também do banco de jogadores salvos
                const savedPlayerIndex = savedPlayers.findIndex(p => p.firebase_id === firebaseId);
                if (savedPlayerIndex !== -1) {
                    savedPlayers.splice(savedPlayerIndex, 1);
                    saveSavedPlayers();
                    updateSavedPlayersList();
                }
                
                showAlert(`${playerName} removido da lista e excluído do Firebase!`, 'success');
            } else {
                showAlert(`${playerName} removido da lista, mas erro ao excluir do Firebase: ${deleteResult.error}`, 'warning');
            }
        } else {
            showAlert(`${playerName} removido da lista atual!`, 'success');
        }
        
        console.log(`✅ Jogador removido com sucesso`);
        
    } catch (error) {
        Logger.error(❌ Erro ao remover jogador:', error);
        showAlert(`Erro ao remover jogador: ${error.message}`, 'error');
    }
}

// Funções para geração de times
function handleGenerateTeams() {
    if (players.length < 2) {
        showAlert('Você precisa de pelo menos 2 jogadores para formar times!', 'error');
        return;
    }

    const suggestedTeams = calculateSuggestedTeamsOptimal();
    const teamSuggestions = getTeamSuggestions();
    
    let message = `Quantos times deseja formar?\n\n`;
    message += `📊 SUGESTÕES BASEADAS EM ${players.length} JOGADORES:\n`;
    message += teamSuggestions.map(suggestion => 
        `${suggestion.teams} times: ${suggestion.description}`
    ).join('\n');
    message += `\n\n💡 Recomendado: ${suggestedTeams} times`;
    
    const numTeams = prompt(message, suggestedTeams);
    
    if (!numTeams || isNaN(numTeams) || numTeams < 1) return;
    
    const teamsNumber = parseInt(numTeams);
    
    // Valida se o número de times faz sentido
    if (teamsNumber > players.length) {
        showAlert('Número de times não pode ser maior que o número de jogadores!', 'error');
        return;
    }
    
    if (teamsNumber > Math.ceil(players.length / 2)) {
        showAlert('Muitos times para poucos jogadores. Cada time teria muito poucos jogadores.', 'warning');
        return;
    }
    
    console.log(`🎯 Iniciando geração de ${teamsNumber} times para ${players.length} jogadores`);
    generateTeams(teamsNumber);
}

// Calcula o número ideal de times baseado na nova estratégia
function calculateSuggestedTeamsOptimal() {
    const totalPlayers = players.length;
    const idealPlayersPerTeam = 6;
    const minPlayersPerTeam = 4;
    const maxPlayersPerTeam = 7;
    
    // Calcula baseado em 6 jogadores por time
    const idealTeams = Math.floor(totalPlayers / idealPlayersPerTeam);
    
    // Se sobrarem muitos jogadores, sugere um time a mais
    const remainder = totalPlayers % idealPlayersPerTeam;
    
    if (idealTeams === 0) {
        return 1; // Pelo menos 1 time
    }
    
    if (remainder >= minPlayersPerTeam) {
        return idealTeams + 1;
    }
    
    return idealTeams;
}

// Gera sugestões detalhadas de formação de times
function getTeamSuggestions() {
    const totalPlayers = players.length;
    const suggestions = [];
    
    // Calcula diferentes cenários
    for (let teams = 1; teams <= Math.min(6, Math.ceil(totalPlayers / 3)); teams++) {
        const playersPerTeam = Math.floor(totalPlayers / teams);
        const remainder = totalPlayers % teams;
        
        let description;
        if (remainder === 0) {
            description = `${playersPerTeam} jogadores por time`;
        } else {
            const teamsWithExtra = remainder;
            const teamsNormal = teams - remainder;
            description = `${teamsNormal} times com ${playersPerTeam} jogadores, ${teamsWithExtra} times com ${playersPerTeam + 1}`;
        }
        
        // Adiciona avaliação da qualidade da distribuição
        const avgPlayersPerTeam = totalPlayers / teams;
        if (avgPlayersPerTeam >= 5 && avgPlayersPerTeam <= 7) {
            description += " ⭐ (ideal)";
        } else if (avgPlayersPerTeam >= 4 && avgPlayersPerTeam < 5) {
            description += " ⚠️ (poucos jogadores)";
        } else if (avgPlayersPerTeam > 7) {
            description += " ⚠️ (muitos jogadores)";
        }
        
        suggestions.push({ teams, description, avgPlayers: avgPlayersPerTeam });
    }
    
    return suggestions;
}

function generateTeams(numTeams) {
    console.log(`🎯 Gerando ${numTeams} times para ${players.length} jogadores`);
    
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const teams = Array(numTeams).fill().map(() => []);
    
    elements.teamOutput.innerHTML = '';
    
    // Nova estratégia: distribui jogadores de forma organizada e equilibrada
    distributePlayersOrganized(shuffledPlayers, teams);
    
    displayTeams(teams);
    currentTeams = teams;
    elements.generateBtn.style.display = 'none';
    elements.regenerateBtn.style.display = 'block';
    
    // Mostra estatísticas dos times
    showTeamStats(teams);
    showAlert(`${teams.length} times gerados com distribuição equilibrada!`, 'success');
}

// Nova função para distribuir jogadores de forma organizada
function distributePlayersOrganized(allPlayers, teams) {
    const maxPlayersPerTeam = 6;
    const totalPlayers = allPlayers.length;
    const numTeams = teams.length;
    
    console.log(`📊 Distribuindo ${totalPlayers} jogadores em ${numTeams} times (máx ${maxPlayersPerTeam} por time)`);
    
    // Separa jogadores por categorias para distribuição equilibrada
    const playerCategories = categorizePlayersForDistribution(allPlayers);
    
    // Fase 1: Distribui levantadores primeiro (prioridade máxima)
    distributeSettersOrganized(playerCategories.setters, teams, maxPlayersPerTeam);
    
    // Fase 2: Distribui jogadoras femininas por nível
    distributeFemalePlayersByLevel(playerCategories.females, teams, maxPlayersPerTeam);
    
    // Fase 3: Distribui jogadores masculinos por nível
    distributeMalePlayersByLevel(playerCategories.males, teams, maxPlayersPerTeam);
    
    // Fase 4: Preenche times até o limite ou distribui sobras
    distributeRemainingPlayers(playerCategories.remaining, teams, maxPlayersPerTeam);
    
    // Fase 5: Ajustes finais para balanceamento
    finalBalanceAdjustments(teams);
    
    Logger.success(✅ Distribuição organizada concluída');
}

// Categoriza jogadores para distribuição equilibrada
function categorizePlayersForDistribution(players) {
    const levelValues = { 'delicioso': 4, 'ótimo': 3, 'bom': 2, 'ok': 1 };
    
    const setters = players.filter(p => p.isSetter).sort((a, b) => 
        levelValues[b.level] - levelValues[a.level]
    );
    
    const nonSetters = players.filter(p => !p.isSetter);
    
    const females = nonSetters.filter(p => p.gender === 'feminino').sort((a, b) => 
        levelValues[b.level] - levelValues[a.level]
    );
    
    const males = nonSetters.filter(p => p.gender === 'masculino').sort((a, b) => 
        levelValues[b.level] - levelValues[a.level]
    );
    
    return {
        setters,
        females,
        males,
        remaining: [] // Será preenchido conforme necessário
    };
}

// Distribui levantadores de forma organizada
function distributeSettersOrganized(setters, teams, maxPerTeam) {
    console.log(`🏐 Distribuindo ${setters.length} levantadores`);
    
    let setterIndex = 0;
    
    // Primeiro, garante um levantador por time
    for (let teamIndex = 0; teamIndex < teams.length && setterIndex < setters.length; teamIndex++) {
        if (teams[teamIndex].length < maxPerTeam) {
            teams[teamIndex].push(setters[setterIndex]);
            console.log(`📍 Levantador ${setters[setterIndex].name} → Time ${teamIndex + 1}`);
            setterIndex++;
        }
    }
    
    // Distribui levantadores restantes em times que ainda têm espaço
    while (setterIndex < setters.length) {
        let placed = false;
        for (let teamIndex = 0; teamIndex < teams.length && setterIndex < setters.length; teamIndex++) {
            if (teams[teamIndex].length < maxPerTeam) {
                teams[teamIndex].push(setters[setterIndex]);
                console.log(`📍 Levantador ${setters[setterIndex].name} → Time ${teamIndex + 1}`);
                setterIndex++;
                placed = true;
            }
        }
        if (!placed) break; // Todos os times estão cheios
    }
}

// Distribui jogadoras femininas por nível
function distributeFemalePlayersByLevel(females, teams, maxPerTeam) {
    console.log(`👩 Distribuindo ${females.length} jogadoras femininas`);
    
    distributePlayersByLevelOrganized(females, teams, maxPerTeam, 'femininas');
}

// Distribui jogadores masculinos por nível
function distributeMalePlayersByLevel(males, teams, maxPerTeam) {
    console.log(`👨 Distribuindo ${males.length} jogadores masculinos`);
    
    distributePlayersByLevelOrganized(males, teams, maxPerTeam, 'masculinos');
}

// Função genérica para distribuir jogadores por nível de forma organizada
function distributePlayersByLevelOrganized(players, teams, maxPerTeam, category) {
    const levelValues = { 'delicioso': 4, 'ótimo': 3, 'bom': 2, 'ok': 1 };
    
    // Agrupa por nível
    const playersByLevel = {};
    players.forEach(player => {
        if (!playersByLevel[player.level]) {
            playersByLevel[player.level] = [];
        }
        playersByLevel[player.level].push(player);
    });
    
    // Distribui por nível (do melhor para o pior)
    const levels = ['delicioso', 'ótimo', 'bom', 'ok'];
    
    for (const level of levels) {
        if (!playersByLevel[level]) continue;
        
        console.log(`  📊 Distribuindo jogadores ${category} nível ${level}: ${playersByLevel[level].length}`);
        
        let playerIndex = 0;
        const levelPlayers = [...playersByLevel[level]].sort(() => Math.random() - 0.5); // Embaralha dentro do nível
        
        // Distribui em rodadas completas primeiro
        while (playerIndex < levelPlayers.length) {
            let roundPlaced = false;
            
            for (let teamIndex = 0; teamIndex < teams.length && playerIndex < levelPlayers.length; teamIndex++) {
                if (teams[teamIndex].length < maxPerTeam) {
                    teams[teamIndex].push(levelPlayers[playerIndex]);
                    console.log(`    📍 ${levelPlayers[playerIndex].name} (${level}) → Time ${teamIndex + 1}`);
                    playerIndex++;
                    roundPlaced = true;
                }
            }
            
            if (!roundPlaced) break; // Todos os times estão cheios
        }
    }
}

// Distribui jogadores restantes
function distributeRemainingPlayers(remainingPlayers, teams, maxPerTeam) {
    if (remainingPlayers.length === 0) return;
    
    console.log(`🔄 Distribuindo ${remainingPlayers.length} jogadores restantes`);
    
    let playerIndex = 0;
    
    while (playerIndex < remainingPlayers.length) {
        let placed = false;
        
        for (let teamIndex = 0; teamIndex < teams.length && playerIndex < remainingPlayers.length; teamIndex++) {
            if (teams[teamIndex].length < maxPerTeam) {
                teams[teamIndex].push(remainingPlayers[playerIndex]);
                console.log(`📍 ${remainingPlayers[playerIndex].name} → Time ${teamIndex + 1}`);
                playerIndex++;
                placed = true;
            }
        }
        
        if (!placed) {
            // Se todos os times estão com 6 jogadores, distribui o resto
            const teamWithFewest = teams.reduce((minTeam, team, index) => 
                team.length < teams[minTeam].length ? index : minTeam, 0
            );
            
            teams[teamWithFewest].push(remainingPlayers[playerIndex]);
            console.log(`📍 ${remainingPlayers[playerIndex].name} → Time ${teamWithFewest + 1} (sobra)`);
            playerIndex++;
        }
    }
}

// Ajustes finais para balanceamento
function finalBalanceAdjustments(teams) {
    Logger.success(⚖️ Aplicando ajustes finais de balanceamento');
    
    // Verifica se algum time está muito desbalanceado
    teams.forEach((team, index) => {
        const teamScore = calculateTeamScore(team);
        const setters = team.filter(p => p.isSetter).length;
        const females = team.filter(p => p.gender === 'feminino').length;
        const males = team.filter(p => p.gender === 'masculino').length;
        
        console.log(`📊 Time ${index + 1}: ${team.length} jogadores | Pontos: ${teamScore} | Levantadores: ${setters} | F: ${females} | M: ${males}`);
    });
}

// Mostra estatísticas dos times gerados
function showTeamStats(teams) {
    Logger.success(\n📈 ESTATÍSTICAS DOS TIMES GERADOS:');
    Logger.success(=' .repeat(50));
    
    teams.forEach((team, index) => {
        const teamScore = calculateTeamScore(team);
        const setters = team.filter(p => p.isSetter).length;
        const females = team.filter(p => p.gender === 'feminino').length;
        const males = team.filter(p => p.gender === 'masculino').length;
        
        const levelCounts = team.reduce((acc, player) => {
            acc[player.level] = (acc[player.level] || 0) + 1;
            return acc;
        }, {});
        
        console.log(`\n🏐 TIME ${index + 1} (${team.length} jogadores):`);
        console.log(`  📊 Pontuação: ${teamScore}`);
        console.log(`  🏐 Levantadores: ${setters}`);
        console.log(`  👥 Gênero: ${females}F / ${males}M`);
        console.log(`  ⭐ Níveis: ${Object.entries(levelCounts).map(([level, count]) => `${level}(${count})`).join(', ')}`);
    });
    
    const avgScore = teams.reduce((sum, team) => sum + calculateTeamScore(team), 0) / teams.length;
    console.log(`\n📊 Pontuação média: ${avgScore.toFixed(1)}`);
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
    elements.teamOutput.innerHTML = '<h3 class="text-center mb-4">Times Gerados com Distribuição Organizada</h3>';
    
    if (teams.length === 0) {
        elements.teamOutput.innerHTML = '<p class="text-center">Nenhum time foi gerado.</p>';
        return;
    }
    
    // Adiciona resumo geral
    const summaryElement = createTeamsSummary(teams);
    elements.teamOutput.appendChild(summaryElement);
    
    // Adiciona cada time
    teams.forEach((team, index) => {
        const teamElement = createTeamElementEnhanced(team, index);
        elements.teamOutput.appendChild(teamElement);
    });
}

// Cria resumo geral dos times
function createTeamsSummary(teams) {
    const totalPlayers = teams.reduce((sum, team) => sum + team.length, 0);
    const avgScore = teams.reduce((sum, team) => sum + calculateTeamScore(team), 0) / teams.length;
    const totalSetters = teams.reduce((sum, team) => sum + team.filter(p => p.isSetter).length, 0);
    
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'alert alert-info mb-4';
    summaryDiv.innerHTML = `
        <div class="row text-center">
            <div class="col-md-3">
                <strong>${teams.length}</strong><br>
                <small>Times</small>
            </div>
            <div class="col-md-3">
                <strong>${totalPlayers}</strong><br>
                <small>Jogadores</small>
            </div>
            <div class="col-md-3">
                <strong>${avgScore.toFixed(1)}</strong><br>
                <small>Pontuação Média</small>
            </div>
            <div class="col-md-3">
                <strong>${totalSetters}</strong><br>
                <small>Levantadores</small>
            </div>
        </div>
    `;
    
    return summaryDiv;
}

function createTeamElementEnhanced(team, index) {
    const teamDiv = document.createElement('div');
    teamDiv.className = 'team mb-4';
    
    // Calcula estatísticas do time
    const teamScore = calculateTeamScore(team);
    const setters = team.filter(p => p.isSetter).length;
    const females = team.filter(p => p.gender === 'feminino').length;
    const males = team.filter(p => p.gender === 'masculino').length;
    
    // Conta jogadores por nível
    const levelCounts = team.reduce((acc, player) => {
        acc[player.level] = (acc[player.level] || 0) + 1;
        return acc;
    }, {});
    
    const levelBadges = Object.entries(levelCounts)
        .map(([level, count]) => {
            const stars = { 'ok': '⭐', 'bom': '⭐⭐', 'ótimo': '⭐⭐⭐', 'delicioso': '🔥🔥🔥' };
            return `<span class="badge bg-secondary me-1">${level} (${count}) ${stars[level] || ''}</span>`;
        }).join('');
    
    teamDiv.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <h4 class="mb-0">🏐 Time ${index + 1}</h4>
                    <div class="team-stats">
                        <span class="badge bg-primary me-2">📊 ${teamScore} pts</span>
                        <span class="badge bg-info me-2">👥 ${team.length} jogadores</span>
                        ${setters > 0 ? `<span class="badge bg-warning">🏐 ${setters} levantador(es)</span>` : '<span class="badge bg-danger">⚠️ Sem levantador</span>'}
                    </div>
                </div>
                <div class="mt-2">
                    <small class="text-muted">
                        <strong>Gênero:</strong> ${females} ♀ / ${males} ♂ | 
                        <strong>Níveis:</strong> ${levelBadges}
                    </small>
                </div>
            </div>
            <div class="card-body p-0">
                <ul class="list-group list-group-flush">
                    ${team.map((player, playerIndex) => `
                        <li class="list-group-item d-flex justify-content-between align-items-center ${player.isSetter ? 'setter' : ''}">
                            <div class="player-info">
                                <span class="fw-bold">${playerIndex + 1}. ${player.name}</span>
                                <span class="badge role-badge ${player.gender} ms-2">
                                    ${player.gender.charAt(0).toUpperCase()}
                                </span>
                                ${player.isSetter ? '<span class="setter-badge ms-1">L</span>' : ''}
                            </div>
                            <div class="player-level">
                                <span class="badge bg-secondary">${player.level}</span>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
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
    const samplePlayers = [
        { name: "João Silva", level: "bom", gender: "masculino", isSetter: false },
        { name: "Maria Santos", level: "ótimo", gender: "feminino", isSetter: true },
        { name: "Pedro Costa", level: "delicioso", gender: "masculino", isSetter: false },
        { name: "Ana Oliveira", level: "bom", gender: "feminino", isSetter: false },
        { name: "Carlos Lima", level: "ok", gender: "masculino", isSetter: true }
    ];
    
    Logger.success(🔧 Criando jogadores de exemplo...');
    
    if (apiConnected) {
        Logger.success(📡 Usando API para criar jogadores...');
        
        for (const player of samplePlayers) {
            const result = await PlayersAPI.createPlayer(player);
            if (result.success) {
                console.log(`✅ Jogador ${player.name} criado via API`);
            } else {
                console.log(`❌ Erro ao criar jogador ${player.name} via API:`, result.error);
            }
        }
    } else {
        Logger.success(🔥 API não disponível, usando Firebase direto...');
        
        for (const player of samplePlayers) {
            await savePlayerDirectlyToFirebase(player.name, player.level, player.gender, player.isSetter, `temp_${Date.now()}`);
        }
    }
    
    // Aguarda um pouco e recarrega
    setTimeout(() => {
        reloadPlayersFromFirebase();
    }, 2000);
}

// Função para testar se o Firebase está funcionando
function testFirebaseConnection() {
    Logger.success(🧪 Testando conexão com Firebase...');
    
    if (typeof window.firebaseDatabase === 'undefined') {
        Logger.success(❌ Firebase Database não disponível');
        return false;
    }
    
    if (typeof window.firebaseRef === 'undefined') {
        Logger.success(❌ Firebase Ref não disponível');
        return false;
    }
    
    if (typeof window.firebaseSet === 'undefined') {
        Logger.success(❌ Firebase Set não disponível');
        return false;
    }
    
    if (typeof window.firebaseGet === 'undefined') {
        Logger.success(❌ Firebase Get não disponível');
        return false;
    }
    
    Logger.success(✅ Todas as funções do Firebase estão disponíveis');
    
    // Teste básico de escrita
    const testRef = window.firebaseRef(window.firebaseDatabase, 'test/connection');
    window.firebaseSet(testRef, {
        timestamp: new Date().toISOString(),
        message: 'Teste de conexão'
    }).then(() => {
        Logger.success(✅ Teste de escrita no Firebase bem-sucedido');
    }).catch((error) => {
        Logger.success(❌ Erro no teste de escrita:', error);
    });
    
    return true;
}

// Função para criar 22 jogadores para demonstração
function create22PlayersDemo() {
    Logger.success(🎭 Criando 22 jogadores para demonstração da nova funcionalidade...');
    
    // Limpa a lista atual
    players = [];
    savePlayers();
    updatePlayerList();
    
    const demoPlayers = [
        // Levantadores (4)
        { name: "Ana Levantadora", level: "ótimo", gender: "feminino", isSetter: true },
        { name: "Carlos Levantador", level: "delicioso", gender: "masculino", isSetter: true },
        { name: "Maria Setter", level: "bom", gender: "feminino", isSetter: true },
        { name: "João Levanta", level: "ótimo", gender: "masculino", isSetter: true },
        
        // Jogadoras femininas (9)
        { name: "Beatriz Silva", level: "delicioso", gender: "feminino", isSetter: false },
        { name: "Carolina Santos", level: "ótimo", gender: "feminino", isSetter: false },
        { name: "Daniela Costa", level: "ótimo", gender: "feminino", isSetter: false },
        { name: "Eduarda Lima", level: "bom", gender: "feminino", isSetter: false },
        { name: "Fernanda Rocha", level: "bom", gender: "feminino", isSetter: false },
        { name: "Gabriela Alves", level: "bom", gender: "feminino", isSetter: false },
        { name: "Helena Mendes", level: "ok", gender: "feminino", isSetter: false },
        { name: "Isabela Ferreira", level: "ok", gender: "feminino", isSetter: false },
        { name: "Juliana Oliveira", level: "ok", gender: "feminino", isSetter: false },
        
        // Jogadores masculinos (9)
        { name: "Bruno Atacante", level: "delicioso", gender: "masculino", isSetter: false },
        { name: "Diego Cortador", level: "delicioso", gender: "masculino", isSetter: false },
        { name: "Eduardo Blocker", level: "ótimo", gender: "masculino", isSetter: false },
        { name: "Felipe Spiker", level: "ótimo", gender: "masculino", isSetter: false },
        { name: "Gabriel Defensor", level: "ótimo", gender: "masculino", isSetter: false },
        { name: "Henrique Forte", level: "bom", gender: "masculino", isSetter: false },
        { name: "Igor Saltador", level: "bom", gender: "masculino", isSetter: false },
        { name: "Kevin Rápido", level: "bom", gender: "masculino", isSetter: false },
        { name: "Lucas Energia", level: "ok", gender: "masculino", isSetter: false }
    ];
    
    console.log(`📝 Adicionando ${demoPlayers.length} jogadores à lista...`);
    
    demoPlayers.forEach((playerData, index) => {
        const player = {
            id: `demo_${Date.now()}_${index}`,
            name: playerData.name,
            level: playerData.level,
            gender: playerData.gender,
            isSetter: playerData.isSetter,
            createdAt: new Date().toISOString()
        };
        
        players.push(player);
        console.log(`  ✅ ${player.name} (${player.level}, ${player.gender}${player.isSetter ? ', Levantador' : ''})`);
    });
    
    savePlayers();
    updatePlayerList();
    
    console.log(`\n🎯 DEMONSTRAÇÃO PRONTA!`);
    console.log(`📊 Total: ${players.length} jogadores`);
    console.log(`🏐 Levantadores: ${players.filter(p => p.isSetter).length}`);
    console.log(`👩 Feminino: ${players.filter(p => p.gender === 'feminino').length}`);
    console.log(`👨 Masculino: ${players.filter(p => p.gender === 'masculino').length}`);
    console.log(`\n💡 Agora clique em "Gerar Times" para ver a nova distribuição organizada!`);
    console.log(`   Recomendado: 4 times (6-6-6-4 jogadores) ou 3 times (7-7-8 jogadores)`);
    
    showAlert('22 jogadores criados para demonstração! Clique em "Gerar Times" para testar.', 'success');
}

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', init);
