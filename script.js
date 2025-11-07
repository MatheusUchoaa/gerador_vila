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
    reloadFirebaseBtn: document.getElementById('reload-firebase-players'),
    searchInput: document.getElementById('player-search'),
    clearSearchBtn: document.getElementById('clear-search'),
    // savedCountElement removido - contador do banco de jogadores não é mais usado
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
    initializeBankCollapsed();
    initializeSearch();
    
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
    
    console.log('🔧 Funções disponíveis:');
    console.log('  - reloadPlayersFromFirebase(): Recarrega jogadores do Firebase');
    console.log('  - createSamplePlayers(): Cria jogadores de exemplo no Firebase');
    console.log('  - testFirebaseConnection(): Testa conexão com Firebase');
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
    
    // Event listeners para o buscador
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', handlePlayerSearch);
        elements.searchInput.addEventListener('keydown', handleSearchKeydown);
    }
    
    if (elements.clearSearchBtn) {
        elements.clearSearchBtn.addEventListener('click', clearPlayerSearch);
    }
}

// Funções de CRUD com sincronização
async function handleAddPlayer(e) {
    e.preventDefault();
    
    const name = elements.nameInput.value.trim();
    const level = document.querySelector('input[name="player-level"]:checked')?.value;
    const gender = document.querySelector('input[name="player-gender"]:checked')?.value;
    const isSetter = document.getElementById('player-setter').checked;
    const isAttacker = document.getElementById('player-attacker').checked;
    const playerId = elements.idInput.value;

    if (!name || !level || !gender) {
        showAlert('Por favor, preencha todos os campos!', 'error');
        return;
    }

    // Verifica se estamos editando um jogador salvo do Firebase
    if (playerId && playerId.startsWith('saved_')) {
        const savedPlayerId = playerId.replace('saved_', '');
        console.log(`🔄 Detectada edição de jogador salvo: ${savedPlayerId}`);
        await updateSavedPlayerInFirebase(savedPlayerId, name, level, gender, isSetter, isAttacker);
    } else if (playerId) {
        // Edição de jogador normal (da lista atual)
        await updatePlayer(playerId, name, level, gender, isSetter, isAttacker);
    } else {
        // Adição de novo jogador
        await addPlayer(name, level, gender, isSetter, isAttacker);
    }
    
    resetForm();
}

async function addPlayer(name, level, gender, isSetter = false, isAttacker = false) {
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
        isAttacker,
        createdAt: new Date().toISOString()
    };
    
    // Adiciona à lista local primeiro
    players.push(newPlayer);
    savePlayers();
    updatePlayerList();
    showAlert(`Jogador ${name} adicionado com sucesso!`, 'success');
    
    // Tenta sincronizar com Firebase via API
    if (apiConnected) {
        console.log('🔄 Sincronizando com Firebase via API...');
        const playerData = { name, level, gender, isSetter, isAttacker };
        const apiPlayer = await syncPlayerWithAPI(playerData);
        
        if (apiPlayer && apiPlayer.firebase_id) {
            // Atualiza o jogador local com o ID do Firebase
            const playerIndex = players.findIndex(p => p.id === newPlayer.id);
            if (playerIndex !== -1) {
                players[playerIndex].firebase_id = apiPlayer.firebase_id;
                savePlayers();
                console.log(`✅ Jogador ${name} sincronizado com Firebase (ID: ${apiPlayer.firebase_id})`);
            }
            
            // Adiciona ao banco de jogadores salvos
            savePlayerToSavedDatabase(name, level, gender, isSetter, isAttacker, apiPlayer.firebase_id);
        } else {
            console.log(`⚠️ Falha na sincronização via API para ${name}, tentando Firebase direto`);
            // Fallback: tenta salvar diretamente no Firebase
            await savePlayerDirectlyToFirebase(name, level, gender, isSetter, isAttacker, newPlayer.id);
        }
    } else {
        console.log('⚠️ API não disponível, tentando Firebase direto...');
        // Se API não estiver disponível, tenta Firebase direto
        await savePlayerDirectlyToFirebase(name, level, gender, isSetter, isAttacker, newPlayer.id);
    }
}

async function updatePlayer(id, name, level, gender, isSetter, isAttacker) {
    const playerIndex = players.findIndex(p => p.id === id);
    if (playerIndex === -1) return;
    
    const oldPlayer = players[playerIndex];
    
    players[playerIndex] = {
        ...oldPlayer,
        name,
        level,
        gender,
        isSetter,
        isAttacker
    };
    
    savePlayers();
    updatePlayerList();
    showAlert(`Jogador ${name} atualizado com sucesso!`, 'success');
    
    if (apiConnected && oldPlayer.firebase_id) {
        const playerData = { name, level, gender, isSetter, isAttacker };
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
            isSetter,
            isAttacker
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
                isAttacker: player.isAttacker || false,
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
                        isAttacker: apiPlayer.isAttacker,
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
    if (!apiConnected) return null;
    
    try {
        const result = await PlayersAPI.createPlayer(playerData);
        if (result.success) {
            console.log('✅ Jogador sincronizado com API:', result.player.name);
            return result.player;
        } else {
            console.error('❌ Erro ao sincronizar jogador:', result.error);
            return null;
        }
    } catch (error) {
        console.error('❌ Erro ao sincronizar jogador:', error);
        return null;
    }
}

// Função para salvar diretamente no Firebase quando API não funciona
async function savePlayerDirectlyToFirebase(name, level, gender, isSetter, isAttacker, localId) {
    // Verifica se o Firebase está disponível
    if (typeof window.firebaseDatabase === 'undefined' || typeof window.firebaseRef === 'undefined' || typeof window.firebaseSet === 'undefined') {
        console.log('❌ Firebase não está disponível para salvamento direto');
        // Adiciona ao banco local mesmo assim
        savePlayerToSavedDatabase(name, level, gender, isSetter, isAttacker);
        return;
    }

    try {
        console.log('🔄 Tentando salvar diretamente no Firebase...');
        
        const playerData = {
            name,
            level,
            gender,
            isSetter,
            isAttacker,
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
        savePlayerToSavedDatabase(name, level, gender, isSetter, isAttacker, firebaseId);
        
        // Mostra mensagem de sucesso
        showAlert(`Jogador ${name} salvo no Firebase!`, 'success');
        
    } catch (error) {
        console.error('❌ Erro ao salvar diretamente no Firebase:', error);
        console.log('💾 Salvando apenas localmente...');
        
        // Fallback: salva apenas localmente
        savePlayerToSavedDatabase(name, level, gender, isSetter, isAttacker);
        showAlert(`Jogador ${name} salvo localmente (Firebase indisponível)`, 'warning');
    }
}

// Função para carregar jogadores diretamente do Firebase
async function loadPlayersDirectlyFromFirebase() {
    if (typeof window.firebaseDatabase === 'undefined' || typeof window.firebaseRef === 'undefined' || typeof window.firebaseGet === 'undefined') {
        console.log('❌ Firebase não está disponível para carregamento direto');
        return false;
    }

    try {
        console.log('📥 Carregando jogadores diretamente do Firebase...');
        
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
                        isAttacker: player.isAttacker || false,
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
                        isAttacker: player.isAttacker || false,
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
            console.log('📭 Nenhum jogador encontrado no Firebase');
            return true;
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar diretamente do Firebase:', error);
        return false;
    }
}

async function reloadPlayersFromFirebase() {
    console.log('🔄 Recarregando jogadores do Firebase...');
    
    // Primeiro tenta via API
    const wasConnected = apiConnected;
    apiConnected = await PlayersAPI.checkAPIHealth();
    
    if (apiConnected) {
        console.log('✅ API disponível, carregando via API...');
        await loadPlayersFromAPI();
        updatePlayerList();
        updateSavedPlayersList();
        showAlert('Jogadores recarregados do Firebase via API!', 'success');
    } else {
        console.log('⚠️ API não disponível, tentando Firebase direto...');
        
        // Tenta carregar diretamente do Firebase
        const firebaseSuccess = await loadPlayersDirectlyFromFirebase();
        
        if (firebaseSuccess) {
            updatePlayerList();
            updateSavedPlayersList();
            showAlert('Jogadores carregados diretamente do Firebase!', 'info');
        } else {
            console.log('❌ Falha ao carregar do Firebase, usando dados locais');
            showAlert('Não foi possível conectar ao Firebase. Usando dados locais.', 'warning');
        }
    }
    
    // Se reconectou à API, informa o usuário
    if (!wasConnected && apiConnected) {
        console.log('🔗 Reconectado à API Backend!');
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
                            isAttacker: player.isAttacker || false,
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
        elements.countElement.innerHTML = '<i class="bi bi-people-fill me-1"></i>0';
        elements.regenerateBtn.style.display = 'none';
        elements.generateBtn.style.display = 'block';
        
        // Esconde lista simples
        document.getElementById('simple-players-card').style.display = 'none';
        return;
    }
    
    const uniquePlayers = [...new Map(players.map(p => [p.id, p]))].map(([_, p]) => p);
    console.log('📋 Jogadores únicos para renderizar:', uniquePlayers.length);
    elements.countElement.innerHTML = `<i class="bi bi-people-fill me-1"></i>${uniquePlayers.length}`;
    
    const sortedPlayers = [...players].sort((a, b) => 
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
    
    console.log('📝 Renderizando jogadores na lista...');
    sortedPlayers.forEach((player, index) => {
        console.log(`🎯 Jogador ${index + 1}:`, player.name, player);
        const playerElement = createPlayerElement(player);
        console.log('📦 Elemento criado:', playerElement);
        elements.list.appendChild(playerElement);
    });
    
    // Atualiza lista simples sempre
    updateSimplePlayersList();
    
    console.log('✅ Lista de jogadores atualizada');
}

// Nova função para lista simples e funcional
function updateSimplePlayersList() {
    const simpleCard = document.getElementById('simple-players-card');
    const simpleList = document.getElementById('simple-players-list');
    
    if (players.length === 0) {
        simpleCard.style.display = 'none';
        return;
    }
    
    console.log('🎯 Atualizando lista simples com', players.length, 'jogadores');
    
    // Mostra o card
    simpleCard.style.display = 'block';
    
    // Limpa a lista
    simpleList.innerHTML = '';
    
    // Adiciona cada jogador de forma simples
    players.forEach((player, index) => {
        const playerCard = document.createElement('div');
        playerCard.className = 'col-md-4 col-sm-6';
        
        const levelStars = getLevelStars(player.level);
        const badges = [];
        
        if (player.isSetter) badges.push('L');
        if (player.isAttacker) badges.push('A');
        
        // Define cor do card baseado no gênero (sutil)
        const cardColor = player.gender === 'feminino' ? '#f8f9fa' : '#ffffff';
        const borderColor = player.gender === 'feminino' ? '#e9ecef' : '#ddd';
        
        playerCard.innerHTML = `
            <div class="card h-100" style="background: ${cardColor}; border: 1px solid ${borderColor};">
                <div class="card-body p-3">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <strong style="color: #333; font-size: 15px;">${player.name}</strong>
                        <span style="font-size: 13px; color: #666;">${levelStars}</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <small style="color: #888; font-size: 11px;">${player.gender}</small>
                        <div>
                            ${badges.map(badge => `<span class="badge bg-secondary me-1" style="font-size: 10px;">${badge}</span>`).join('')}
                        </div>
                    </div>
                    <button class="btn btn-sm mt-2 w-100" onclick="removeSimplePlayer('${player.id}')" style="font-size: 11px; background: #6B7280; color: white; border: none;">
                        ✕ Remover
                    </button>
                </div>
            </div>
        `;
        
        simpleList.appendChild(playerCard);
    });
    
    console.log('✅ Lista simples atualizada com', players.length, 'jogadores');
}

// Função para remover jogador da lista simples
function removeSimplePlayer(playerId) {
    console.log('🗑️ Removendo jogador da lista simples:', playerId);
    removePlayer(playerId);
}

function createPlayerElement(player) {
    console.log('🎯 Criando elemento para jogador:', player.name, player);
    
    const li = document.createElement('li');
    li.className = `list-group-item d-flex justify-content-between align-items-center ${player.isSetter ? 'setter' : ''} ${player.isAttacker ? 'attacker' : ''}`;
    
    // Validação para evitar campos vazios
    const playerName = player.name || 'Sem nome';
    const playerGender = player.gender || 'masculino';
    const playerLevel = player.level || 'ok';
    
    // HTML simplificado para garantir visibilidade
    li.innerHTML = `
        <div class="player-card-wrapper" data-id="${player.id}" style="display: flex !important; align-items: center !important; padding: 16px !important; width: 100% !important;">
            <div class="player-main-info" style="display: flex !important; align-items: center !important; gap: 12px !important; flex: 1 !important;">
                <div class="player-avatar ${playerGender}" style="width: 40px !important; height: 40px !important; background: #6B7280 !important; color: white !important; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; font-weight: bold !important;">
                    ${playerGender === 'masculino' ? 'M' : 'F'}
                </div>
                <div class="player-details" style="flex: 1 !important;">
                    <div class="player-name" style="font-size: 16px !important; font-weight: bold !important; color: #000000 !important; margin-bottom: 4px !important;">${playerName}</div>
                    <div class="player-attributes" style="display: flex !important; align-items: center !important; gap: 6px !important;">
                        <span class="level-stars" style="font-size: 14px !important;">${getLevelStars(playerLevel)}</span>
                        ${player.isSetter ? '<span class="position-badge setter" style="background: #4B5563 !important; color: white !important; padding: 2px 6px !important; border-radius: 4px !important; font-size: 12px !important;">L</span>' : ''}
                        ${player.isAttacker ? '<span class="position-badge attacker" style="background: #374151 !important; color: white !important; padding: 2px 6px !important; border-radius: 4px !important; font-size: 12px !important;">A</span>' : ''}
                    </div>
                </div>
            </div>
            <button class="delete-btn" data-id="${player.id}" title="Remover jogador" style="background: #EF4444 !important; color: white !important; border: none !important; border-radius: 50% !important; width: 32px !important; height: 32px !important; display: flex !important; align-items: center !important; justify-content: center !important;">
                ✕
            </button>
        </div>
    `;
    
    console.log('✅ HTML do jogador criado:', li.innerHTML.substring(0, 100) + '...');
    
    li.querySelector('.player-card-wrapper').addEventListener('click', (e) => {
        if (!e.target.closest('.delete-btn')) {
            editPlayer(player.id);
        }
    });
    li.querySelector('.delete-btn').addEventListener('click', (e) => {
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
    document.getElementById('player-attacker').checked = player.isAttacker;
    
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
function savePlayerToSavedDatabase(name, level, gender, isSetter = false, isAttacker = false, firebase_id = null) {
    const existingIndex = savedPlayers.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (existingIndex === -1) {
        savedPlayers.push({
            id: firebase_id || Date.now().toString(),
            name,
            level,
            gender,
            isSetter,
            isAttacker,
            firebase_id,
            lastUsed: new Date().toISOString()
        });
    } else {
        savedPlayers[existingIndex] = {
            ...savedPlayers[existingIndex],
            level,
            gender,
            isSetter,
            isAttacker,
            firebase_id: firebase_id || savedPlayers[existingIndex].firebase_id,
            lastUsed: new Date().toISOString()
        };
    }
    
    saveSavedPlayers();
    updateSavedPlayersList();
}

// Função para converter nível em estrelas
function getLevelStars(level) {
    const levelMapping = {
        'ok': '⭐',
        'bom': '⭐⭐',
        'ótimo': '⭐⭐⭐',
        'delicioso': '⭐⭐⭐⭐'
    };
    return levelMapping[level] || '⭐';
}

function updateSavedPlayersList() {
    elements.savedList.innerHTML = '';
    
    // Contador do banco de jogadores foi removido
    
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
        
        // Converte nível para estrelas
        const levelStars = getLevelStars(player.level);
        
        playerElement.innerHTML = `
            <div class="saved-player-card">
                <div class="player-avatar ${player.gender}">
                    ${player.gender === 'masculino' ? 'M' : 'F'}
                </div>
                <div class="player-details">
                    <span class="saved-player-name">${player.name}</span>
                    <div class="saved-player-attributes">
                        <span class="level-stars" title="Nível: ${player.level}">${levelStars}</span>
                        ${player.isSetter ? '<span class="position-badge setter">L</span>' : ''}
                        ${player.isAttacker ? '<span class="position-badge attacker">A</span>' : ''}
                    </div>
                </div>
                <div class="saved-player-actions">
                    <button class="edit-btn" data-id="${player.id}" title="Editar jogador">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="delete-btn" data-id="${player.id}" title="Remover jogador">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
            </div>
        `;
        
        playerElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-saved') && 
                !e.target.classList.contains('edit-saved-btn') &&
                !e.target.closest('.saved-player-actions')) {
                addPlayerFromSaved(player.id);
            }
        });
        
        playerElement.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            editSavedPlayer(player.id);
        });
        
        playerElement.querySelector('.delete-btn').addEventListener('click', (e) => {
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
        console.error('❌ Jogador não encontrado no banco de salvos');
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
        
        console.log('✅ Formulário preenchido para edição');
        showAlert(`Editando: ${savedPlayer.name}. Faça as alterações e clique em "Atualizar no Firebase".`, 'info');
        
    } catch (error) {
        console.error('❌ Erro ao iniciar edição:', error);
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
        
        // Define se é atacante
        const attackerCheckbox = document.getElementById('player-attacker');
        if (attackerCheckbox) {
            attackerCheckbox.checked = Boolean(player.isAttacker);
        }
        
        console.log('📋 Formulário preenchido com dados:', {
            name: player.name,
            level: player.level,
            gender: player.gender,
            isSetter: player.isSetter,
            isAttacker: player.isAttacker
        });
        
    } catch (error) {
        console.error('❌ Erro ao preencher formulário:', error);
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
async function updateSavedPlayerInFirebase(playerId, name, level, gender, isSetter, isAttacker) {
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
            isAttacker,
            lastUpdated: new Date().toISOString()
        };
        
        console.log(`📤 Enviando atualização para Firebase ID: ${firebaseId}`, updatedData);
        
        let updateResult = { success: false };
        
        // Tenta atualizar via API primeiro
        if (apiConnected) {
            console.log('🌐 Tentando atualizar via API...');
            updateResult = await PlayersAPI.updatePlayer(firebaseId, updatedData);
            
            if (updateResult.success) {
                console.log('✅ Jogador atualizado via API com sucesso');
            } else {
                console.warn('⚠️ Falha na API, tentando Firebase direto...');
            }
        }
        
        // Fallback: atualização direta no Firebase se API falhar
        if (!updateResult.success) {
            console.log('🔥 Tentando atualização direta no Firebase...');
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
                isAttacker: updatedData.isAttacker,
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
                    isSetter: updatedData.isSetter,
                    isAttacker: updatedData.isAttacker
                };
                savePlayers();
                updatePlayerList();
            }
            
            // Salva os jogadores salvos atualizados
            saveSavedPlayers();
            updateSavedPlayersList();
            
            console.log('✅ Jogador atualizado com sucesso em todos os bancos');
            showAlert(`${updatedData.name} atualizado com sucesso no Firebase!`, 'success');
            
            // Limpa o formulário e remove modo de edição
            resetFormAfterFirebaseEdit();
            
        } else {
            throw new Error(updateResult.error || 'Falha na atualização do Firebase');
        }
        
    } catch (error) {
        console.error('❌ Erro ao atualizar jogador no Firebase:', error);
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
        
        // Verifica se o Firebase está disponível
        if (!window.firebaseDatabase || !window.firebaseRef || !window.firebaseUpdate) {
            throw new Error('Firebase não está disponível');
        }
        
        // Usa as funções globais do Firebase
        const database = window.firebaseDatabase;
        const playerRef = window.firebaseRef(database, `players/${firebaseId}`);
        
        // Atualiza os dados
        await window.firebaseUpdate(playerRef, playerData);
        
        console.log('✅ Atualização direta no Firebase bem-sucedida');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Erro na atualização direta do Firebase:', error);
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
    
    console.log('🔄 Formulário resetado após edição do Firebase');
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
        isAttacker: player.isAttacker,
        createdAt: player.createdAt || new Date().toISOString(),
        firebase_id: player.firebase_id
    };
    
    players.push(newPlayer);
    savePlayers();
    updatePlayerList();
    showAlert(`Jogador ${player.name} adicionado!`, 'success');
}

function toggleSavedPlayersList() {
    const isHidden = elements.savedList.style.display === 'none' || !elements.savedList.classList.contains('expanded');
    
    if (isHidden) {
        // Expandir
        elements.savedList.style.display = 'flex';
        elements.savedList.classList.add('expanded');
        elements.toggleSavedBtn.innerHTML = '<i class="bi bi-chevron-down"></i><span class="ms-1">Fechar</span>';
        elements.toggleSavedBtn.classList.add('expanded');
        
        console.log('🔽 Banco de jogadores expandido');
    } else {
        // Fechar
        elements.savedList.classList.remove('expanded');
        elements.toggleSavedBtn.innerHTML = '<i class="bi bi-chevron-right"></i><span class="ms-1">Expandir</span>';
        elements.toggleSavedBtn.classList.remove('expanded');
        
        // Aguarda a animação antes de esconder completamente
        setTimeout(() => {
            if (!elements.savedList.classList.contains('expanded')) {
                elements.savedList.style.display = 'none';
            }
        }, 400);
        console.log('🔼 Banco de jogadores fechado');
    }
}

/**
 * Configura scroll para o banco de jogadores (simplificado)
 */
function setupScrollIndicator() {
    // Função mantida para compatibilidade, mas agora apenas garante que o scroll está funcionando
    if (!elements.savedList.classList.contains('expanded')) return;
    
    console.log('📜 Scroll configurado para o banco de jogadores');
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
            console.error('❌ Jogador não encontrado no banco de salvos');
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
            console.log('❌ Exclusão cancelada pelo usuário');
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
                    console.log('❌ Exclusão cancelada após erro no Firebase');
                    return;
                }
                
                console.log('⚠️ Prosseguindo com exclusão apenas local');
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
        console.error('❌ Erro ao remover jogador:', error);
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
            console.log('🌐 Tentando excluir via API...');
            deleteResult = await PlayersAPI.deletePlayer(firebaseId);
            
            if (deleteResult.success) {
                console.log('✅ Jogador excluído via API com sucesso');
                return { success: true };
            } else {
                console.warn('⚠️ Falha na API, tentando Firebase direto...');
            }
        }
        
        // Fallback: exclusão direta no Firebase se API falhar
        if (!deleteResult.success) {
            console.log('🔥 Tentando exclusão direta no Firebase...');
            deleteResult = await deletePlayerDirectlyFromFirebase(firebaseId);
        }
        
        if (deleteResult.success) {
            console.log(`✅ Jogador ${playerName} excluído do Firebase com sucesso`);
            return { success: true };
        } else {
            throw new Error(deleteResult.error || 'Falha na exclusão do Firebase');
        }
        
    } catch (error) {
        console.error('❌ Erro ao excluir jogador do Firebase:', error);
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
        
        // Verifica se o Firebase está disponível
        if (!window.firebaseDatabase || !window.firebaseRef || !window.firebaseRemove) {
            throw new Error('Firebase não está disponível');
        }
        
        // Usa as funções globais do Firebase
        const database = window.firebaseDatabase;
        const playerRef = window.firebaseRef(database, `players/${firebaseId}`);
        
        // Remove o documento
        await window.firebaseRemove(playerRef);
        
        console.log('✅ Exclusão direta do Firebase bem-sucedida');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Erro na exclusão direta do Firebase:', error);
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
            console.error('❌ Jogador não encontrado na lista atual');
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
        console.error('❌ Erro ao remover jogador:', error);
        showAlert(`Erro ao remover jogador: ${error.message}`, 'error');
    }
}

// Funções para geração de times
function handleGenerateTeams() {
    if (players.length < 2) {
        showAlert('Você precisa de pelo menos 2 jogadores para formar times!', 'error');
        return;
    }

    // Detecta se é um resorteio
    const isRegeneration = currentTeams !== null;
    
    if (isRegeneration) {
        console.log('🔄 Detectado resorteio - usando estratégia diferente');
        handleRegenerateTeams();
        return;
    }

    const suggestedTeams = calculateSuggestedTeamsOptimal();
    
    let message = `Quantos times deseja formar?`;
    
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

/**
 * Função específica para resorteio com estratégias diferentes
 */
function handleRegenerateTeams() {
    console.log('🔄 Iniciando resorteio com estratégia diferente...');
    
    const numTeams = currentTeams.length;
    const previousTeamCompositions = currentTeams.map(team => 
        team.map(player => ({ id: player.id, name: player.name }))
    );
    
    console.log(`📋 Times anteriores salvos para comparação (${numTeams} times)`);
    
    // Tenta até 10 vezes gerar uma formação significativamente diferente
    let attempts = 0;
    let newTeams = null;
    let bestAttempt = null;
    let bestDifference = 0;
    
    while (attempts < 10) {
        attempts++;
        console.log(`🎲 Tentativa ${attempts} de resorteio...`);
        // Embaralha os jogadores, mas mantém todos os adicionados
        const reshuffledPlayers = reshufflePlayers(players, attempts);
        const testTeams = Array(numTeams).fill().map(() => []);
        // Usa a mesma lógica principal de distribuição sequencial
        distributePlayersSequentially(reshuffledPlayers, testTeams);
        // Calcula diferença em relação aos times anteriores
        const difference = calculateTeamDifference(testTeams, previousTeamCompositions);
        console.log(`📊 Tentativa ${attempts}: ${difference.toFixed(1)}% de diferença`);
        if (difference > bestDifference) {
            bestDifference = difference;
            bestAttempt = testTeams;
        }
        if (difference >= 50) {
            newTeams = testTeams;
            console.log(`✅ Formação suficientemente diferente encontrada (${difference.toFixed(1)}%)`);
            break;
        }
    }
    if (!newTeams) {
        newTeams = bestAttempt;
        console.log(`⚠️ Usando melhor tentativa com ${bestDifference.toFixed(1)}% de diferença`);
    }
    if (!newTeams) {
        showAlert('Erro ao gerar novo sorteio. Tente novamente.', 'error');
        return;
    }
    displayTeams(newTeams);
    currentTeams = newTeams;
    showTeamStats(newTeams);
    showAlert(`Times re-sorteados com ${bestDifference.toFixed(1)}% de diferença da formação anterior!`, 'success');
}

/**
 * Embaralha jogadores usando diferentes estratégias baseado na tentativa
 */
function reshufflePlayers(playersList, attempt) {
    const players = [...playersList];
    
    switch (attempt % 4) {
        case 1:
            // Embaralhamento padrão
            return players.sort(() => Math.random() - 0.5);
            
        case 2:
            // Embaralhamento invertido por nível
            return players.sort((a, b) => {
                const levelOrder = { 'delicioso': 4, 'ótimo': 3, 'bom': 2, 'ok': 1 };
                return levelOrder[b.level] - levelOrder[a.level] + (Math.random() - 0.5);
            });
            
        case 3:
            // Embaralhamento por gênero primeiro
            return players.sort((a, b) => {
                if (a.gender !== b.gender) {
                    return a.gender === 'feminino' ? -1 : 1;
                }
                return Math.random() - 0.5;
            });
            
        default:
            // Embaralhamento por posição (levantadores primeiro)
            return players.sort((a, b) => {
                if (a.isSetter !== b.isSetter) {
                    return b.isSetter ? 1 : -1;
                }
                return Math.random() - 0.5;
            });
    }
}

/**
 * Distribui jogadores usando estratégia alternativa para resorteio
 */
function distributePlayersForRegeneration(allPlayers, teams, attempt) {
    const maxPlayersPerTeam = 6;
    const totalPlayers = allPlayers.length;
    const numTeams = teams.length;
    
    console.log(`🔄 Estratégia de resorteio ${attempt % 3 + 1} para ${numTeams} times`);
    
    if (attempt % 3 === 0) {
        // Estratégia 1: Distribuição sequencial por nível
        distributeSequentialByLevel(allPlayers, teams, maxPlayersPerTeam);
    } else if (attempt % 3 === 1) {
        // Estratégia 2: Distribuição em serpentina
        distributeSerpentineStyle(allPlayers, teams, maxPlayersPerTeam);
    } else {
        // Estratégia 3: Distribuição balanceada alternativa
        distributeAlternativeBalanced(allPlayers, teams, maxPlayersPerTeam);
    }
}

/**
 * Estratégia 1: Distribuição sequencial por nível
 */
function distributeSequentialByLevel(allPlayers, teams, maxPlayersPerTeam) {
    console.log('📋 Usando distribuição sequencial por nível');
    
    // Separa por nível e embaralha cada grupo
    const levels = ['delicioso', 'ótimo', 'bom', 'ok'];
    let playerIndex = 0;
    
    levels.forEach(level => {
        const playersOfLevel = allPlayers.filter(p => p.level === level);
        playersOfLevel.forEach(player => {
            const targetTeam = playerIndex % teams.length;
            if (teams[targetTeam].length < maxPlayersPerTeam) {
                teams[targetTeam].push(player);
                playerIndex++;
            }
        });
    });
    
    // Distribui jogadores restantes
    const remaining = allPlayers.filter(p => !teams.some(team => team.includes(p)));
    remaining.forEach(player => {
        const teamWithSpace = teams.find(team => team.length < maxPlayersPerTeam);
        if (teamWithSpace) {
            teamWithSpace.push(player);
        }
    });
}

/**
 * Estratégia 2: Distribuição em serpentina
 */
function distributeSerpentineStyle(allPlayers, teams, maxPlayersPerTeam) {
    console.log('🐍 Usando distribuição em serpentina');
    
    let teamIndex = 0;
    let direction = 1; // 1 para frente, -1 para trás
    
    allPlayers.forEach((player, index) => {
        // Adiciona ao time atual se houver espaço
        if (teams[teamIndex].length < maxPlayersPerTeam) {
            teams[teamIndex].push(player);
        }
        
        // Move para próximo time em padrão serpentina
        if ((index + 1) % teams.length === 0) {
            direction *= -1; // Inverte direção
        }
        
        teamIndex += direction;
        
        // Ajusta índices para não sair dos limites
        if (teamIndex >= teams.length) {
            teamIndex = teams.length - 1;
            direction = -1;
        } else if (teamIndex < 0) {
            teamIndex = 0;
            direction = 1;
        }
    });
}

/**
 * Estratégia 3: Distribuição balanceada alternativa
 */
function distributeAlternativeBalanced(allPlayers, teams, maxPlayersPerTeam) {
    console.log('⚖️ Usando distribuição balanceada alternativa');
    
    // Separa jogadores por categorias
    const setters = allPlayers.filter(p => p.isSetter);
    const females = allPlayers.filter(p => p.gender === 'feminino' && !p.isSetter);
    const males = allPlayers.filter(p => p.gender === 'masculino' && !p.isSetter);
    
    // Distribui levantadores de forma alternada
    setters.forEach((setter, index) => {
        const teamIndex = index % teams.length;
        if (teams[teamIndex].length < maxPlayersPerTeam) {
            teams[teamIndex].push(setter);
        }
    });
    
    // Distribui femininas priorizando times com menos jogadoras
    females.forEach(player => {
        const teamWithFewestFemales = teams
            .filter(team => team.length < maxPlayersPerTeam)
            .sort((a, b) => {
                const femalesA = a.filter(p => p.gender === 'feminino').length;
                const femalesB = b.filter(p => p.gender === 'feminino').length;
                return femalesA - femalesB;
            })[0];
        
        if (teamWithFewestFemales) {
            teamWithFewestFemales.push(player);
        }
    });
    
    // Distribui masculinos priorizando equilíbrio
    males.forEach(player => {
        const teamWithSpace = teams
            .filter(team => team.length < maxPlayersPerTeam)
            .sort((a, b) => a.length - b.length)[0];
        
        if (teamWithSpace) {
            teamWithSpace.push(player);
        }
    });
}

/**
 * Calcula percentual de diferença entre duas formações de times
 */
function calculateTeamDifference(newTeams, previousTeamCompositions) {
    let totalPlayers = 0;
    let differentPlacements = 0;
    
    newTeams.forEach((newTeam, teamIndex) => {
        newTeam.forEach(player => {
            totalPlayers++;
            
            // Verifica se o jogador estava no mesmo time antes
            const wasInSameTeam = previousTeamCompositions[teamIndex] && 
                previousTeamCompositions[teamIndex].some(prevPlayer => prevPlayer.id === player.id);
            
            if (!wasInSameTeam) {
                differentPlacements++;
            }
        });
    });
    
    return totalPlayers > 0 ? (differentPlacements / totalPlayers) * 100 : 0;
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
    
    // Nova estratégia: distribui jogadores sequencialmente, preenchendo um time por vez
    distributePlayersSequentially(shuffledPlayers, teams);
    
    displayTeams(teams);
    currentTeams = teams;
    elements.generateBtn.style.display = 'none';
    elements.regenerateBtn.style.display = 'block';
    
    // Mostra estatísticas dos times
    showTeamStats(teams);
    showAlert(`${teams.length} times gerados com distribuição sequencial!`, 'success');
}

// Nova função para distribuir jogadores sequencialmente com distribuição igualitária por nível
function distributePlayersSequentially(allPlayers, teams) {
    const maxPlayersPerTeam = 6;
    const totalPlayers = allPlayers.length;
    const numTeams = teams.length;
    
    console.log(`📊 Distribuindo ${totalPlayers} jogadores sequencialmente em ${numTeams} times`);
    console.log(`🎯 Estratégia: Mulheres igualitariamente primeiro, depois homens por função`);
    
    // FASE 1: Distribui TODAS as mulheres igualitariamente (independente de posição)
    const females = allPlayers.filter(p => p.gender === 'feminino');
    const shuffledFemales = [...females].sort(() => Math.random() - 0.5);
    distributeFemalesEqually(shuffledFemales, teams, maxPlayersPerTeam);
    
    // FASE 2: Distribui levantadores homens igualitariamente
    const maleSetters = allPlayers.filter(p => p.isSetter && p.gender === 'masculino');
    const shuffledMaleSetters = [...maleSetters].sort(() => Math.random() - 0.5);
    distributeSettersEqually(shuffledMaleSetters, teams);
    
    // FASE 3: Distribui atacantes homens igualitariamente
    const maleAttackers = allPlayers.filter(p => p.isAttacker && p.gender === 'masculino');
    const shuffledMaleAttackers = [...maleAttackers].sort(() => Math.random() - 0.5);
    distributeAttackersEqually(shuffledMaleAttackers, teams, maxPlayersPerTeam);
    
    // FASE 4: Preenche os times sequencialmente com homens restantes (sem função específica)
    const maleNonSpecific = allPlayers.filter(p => 
        p.gender === 'masculino' && !p.isSetter && !p.isAttacker
    );
    const shuffledMaleNonSpecific = [...maleNonSpecific].sort(() => Math.random() - 0.5);
    fillTeamsSequentiallyWithMales(shuffledMaleNonSpecific, teams, maxPlayersPerTeam);
    
    // Log final da distribuição
    logFinalDistribution(teams);
    
    console.log('✅ Distribuição sequencial concluída');
}

// FASE 2: Distribui levantadores homens de forma igualitária entre todos os times
function distributeSettersEqually(setters, teams) {
    console.log(`\n🏐 FASE 2: Distribuindo ${setters.length} levantadores homens igualitariamente`);
    
    // Distribui levantadores em ordem circular (round-robin)
    for (let i = 0; i < setters.length; i++) {
        const teamIndex = i % teams.length; // Distribui ciclicamente
        const setter = setters[i];
        
        // Só adiciona se o jogador ainda não estiver em nenhum time
        const isAlreadyInTeam = teams.some(team => team.some(p => p.id === setter.id));
        if (!isAlreadyInTeam) {
            teams[teamIndex].push(setter);
            console.log(`📍 Levantador ${setter.name} (${setter.level}) → Time ${teamIndex + 1}`);
        }
    }
    
    // Mostra estatísticas dos levantadores por time
    console.log(`\n📊 Levantadores por time:`);
    teams.forEach((team, index) => {
        const settersInTeam = team.filter(p => p.isSetter).length;
        console.log(`  Time ${index + 1}: ${settersInTeam} levantador(es)`);
    });
}

// FASE 3: Nova função para distribuir jogadores por nível de habilidade igualitariamente
// FASE 3: Distribui atacantes homens de forma igualitária entre todos os times
function distributeAttackersEqually(attackers, teams, maxPlayersPerTeam) {
    console.log(`\n⚡ FASE 3: Distribuindo ${attackers.length} atacantes homens igualitariamente`);
    
    // Distribui atacantes em ordem circular (round-robin)
    for (let i = 0; i < attackers.length; i++) {
        const teamIndex = i % teams.length; // Distribui ciclicamente
        const attacker = attackers[i];
        
        // Verifica se o time ainda tem espaço
        if (teams[teamIndex].length < maxPlayersPerTeam) {
            teams[teamIndex].push(attacker);
            console.log(`📍 Atacante ${attacker.name} → Time ${teamIndex + 1} (${teams[teamIndex].length}° jogador)`);
        } else {
            // Se o time está cheio, procura outro time com espaço
            let placed = false;
            for (let j = 0; j < teams.length; j++) {
                const alternativeTeamIndex = (teamIndex + j) % teams.length;
                if (teams[alternativeTeamIndex].length < maxPlayersPerTeam) {
                    teams[alternativeTeamIndex].push(attacker);
                    console.log(`📍 ${attacker.name} → Time ${alternativeTeamIndex + 1} (${teams[alternativeTeamIndex].length}° jogador) [realocado]`);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                console.log(`⚠️ ${attacker.name} não pôde ser alocado - todos os times estão cheios`);
            }
        }
    }
    
    // Mostra estatísticas dos atacantes por time
    console.log(`\n📊 Atacantes por time:`);
    teams.forEach((team, index) => {
        const attackersInTeam = team.filter(p => p.isAttacker).length;
        console.log(`  Time ${index + 1}: ${attackersInTeam} atacante(s)`);
    });
}

// FASE 1: Distribui todas as mulheres (incluindo levantadoras e atacantes) de forma igualitária entre todos os times
function distributeFemalesEqually(females, teams, maxPlayersPerTeam) {
    console.log(`\n👩 FASE 1: Distribuindo ${females.length} mulheres igualitariamente (incluindo levantadoras e atacantes)`);
    
    // Distribui mulheres em ordem circular (round-robin)
    for (let i = 0; i < females.length; i++) {
        const teamIndex = i % teams.length; // Distribui ciclicamente
        const female = females[i];
        
        // Verifica se o time ainda tem espaço
        if (teams[teamIndex].length < maxPlayersPerTeam) {
            teams[teamIndex].push(female);
            console.log(`📍 ${female.name} → Time ${teamIndex + 1} (${teams[teamIndex].length}° jogador)`);
        } else {
            // Se o time está cheio, procura outro time com espaço
            let placed = false;
            for (let j = 0; j < teams.length; j++) {
                const alternativeTeamIndex = (teamIndex + j) % teams.length;
                if (teams[alternativeTeamIndex].length < maxPlayersPerTeam) {
                    teams[alternativeTeamIndex].push(female);
                    console.log(`📍 ${female.name} → Time ${alternativeTeamIndex + 1} (${teams[alternativeTeamIndex].length}° jogador) [realocada]`);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                console.log(`⚠️ ${female.name} não pôde ser alocada - todos os times estão cheios`);
            }
        }
    }
    
    // Mostra estatísticas das mulheres por time
    console.log(`\n📊 Mulheres por time:`);
    teams.forEach((team, index) => {
        const femalesInTeam = team.filter(p => p.gender === 'feminino').length;
        console.log(`  Time ${index + 1}: ${femalesInTeam} mulher(es)`);
    });
}

// FASE 4: Preenche os times sequencialmente com os homens restantes (sem função específica)
function fillTeamsSequentiallyWithMales(maleNonSetters, teams, maxPlayersPerTeam) {
    console.log(`\n👨 FASE 4: Preenchendo sequencialmente com ${maleNonSetters.length} homens sem função específica`);
    
    let currentTeamIndex = 0;
    
    for (let i = 0; i < maleNonSetters.length; i++) {
        const player = maleNonSetters[i];
        
        // Procura o próximo time que ainda tem espaço
        while (currentTeamIndex < teams.length && teams[currentTeamIndex].length >= maxPlayersPerTeam) {
            currentTeamIndex++;
        }
        
        // Se todos os times principais estão cheios, distribui nas sobras
        if (currentTeamIndex >= teams.length) {
            console.log(`⚠️ Todos os times principais estão cheios. Distribuindo sobras...`);
            distributeRemainingPlayersInOrder(maleNonSetters.slice(i), teams);
            break;
        }
        
        // Adiciona o jogador ao time atual
        teams[currentTeamIndex].push(player);
        
        const teamNumber = currentTeamIndex + 1;
        const positionInTeam = teams[currentTeamIndex].length;
        
        console.log(`📍 ${player.name} → Time ${teamNumber} (${positionInTeam}° jogador)`);
        
        // Se o time atual ficou cheio, passa para o próximo na próxima iteração
        if (teams[currentTeamIndex].length >= maxPlayersPerTeam) {
            console.log(`✅ Time ${teamNumber} completo com ${teams[currentTeamIndex].length} jogadores`);
        }
    }
}

// Função para mostrar distribuição final
function logFinalDistribution(teams) {
    console.log('\n📋 DISTRIBUIÇÃO FINAL:');
    teams.forEach((team, index) => {
        const settersCount = team.filter(p => p.isSetter).length;
        const attackersCount = team.filter(p => p.isAttacker).length;
        const femaleCount = team.filter(p => p.gender === 'feminino').length;
        const maleCount = team.filter(p => p.gender === 'masculino').length;
        
        console.log(`  Time ${index + 1}: ${team.length} jogadores (${settersCount} levantadores, ${attackersCount} atacantes, ${femaleCount}F, ${maleCount}M)`);
        
        // Lista os levantadores do time
        const teamSetters = team.filter(p => p.isSetter);
        if (teamSetters.length > 0) {
            console.log(`    Levantadores: ${teamSetters.map(p => p.name).join(', ')}`);
        }
        
        // Lista os atacantes do time
        const teamAttackers = team.filter(p => p.isAttacker);
        if (teamAttackers.length > 0) {
            console.log(`    Atacantes: ${teamAttackers.map(p => p.name).join(', ')}`);
        }
        
        // Lista as mulheres do time
        const teamFemales = team.filter(p => p.gender === 'feminino');
        if (teamFemales.length > 0) {
            console.log(`    Mulheres: ${teamFemales.map(p => p.name).join(', ')}`);
        }
    });
    
    // Estatísticas gerais de distribuição
    const totalFemales = teams.reduce((sum, team) => sum + team.filter(p => p.gender === 'feminino').length, 0);
    const totalSetters = teams.reduce((sum, team) => sum + team.filter(p => p.isSetter).length, 0);
    const totalAttackers = teams.reduce((sum, team) => sum + team.filter(p => p.isAttacker).length, 0);
    
    console.log(`\n📊 RESUMO DA DISTRIBUIÇÃO:`);
    console.log(`  Total de mulheres: ${totalFemales} (distribuídas entre ${teams.length} times)`);
    console.log(`  Total de levantadores: ${totalSetters} (distribuídos entre ${teams.length} times)`);
    console.log(`  Total de atacantes: ${totalAttackers} (distribuídos entre ${teams.length} times)`);
    console.log(`  Média de mulheres por time: ${(totalFemales / teams.length).toFixed(1)}`);
    console.log(`  Média de levantadores por time: ${(totalSetters / teams.length).toFixed(1)}`);
    console.log(`  Média de atacantes por time: ${(totalAttackers / teams.length).toFixed(1)}`);
}

// Distribui jogadores restantes quando todos os times principais estão cheios
function distributeRemainingPlayersInOrder(remainingPlayers, teams) {
    console.log(`📝 Distribuindo ${remainingPlayers.length} jogadores restantes...`);
    
    // Distribui um por um nos times que têm menos jogadores
    for (const player of remainingPlayers) {
        // Encontra o time com menos jogadores
        const teamSizes = teams.map(team => team.length);
        const minSize = Math.min(...teamSizes);
        const teamIndex = teamSizes.findIndex(size => size === minSize);
        
        teams[teamIndex].push(player);
        
        const setterIndicator = player.isSetter ? ' (Levantador)' : '';
        console.log(`📍 ${player.name}${setterIndicator} → Time ${teamIndex + 1} (sobra)`);
    }
}

// Nova função para distribuir jogadores de forma organizada (mantida como alternativa)
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
    
    console.log('✅ Distribuição organizada concluída');
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


// Ajustes finais para balanceamento
function finalBalanceAdjustments(teams) {
    console.log('⚖️ Aplicando ajustes finais de balanceamento');
    
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
    console.log('\n📈 ESTATÍSTICAS DOS TIMES GERADOS:');
    console.log('=' .repeat(50));
    
    teams.forEach((team, index) => {
        const teamScore = calculateTeamScore(team);
        const setters = team.filter(p => p.isSetter).length;
        const attackers = team.filter(p => p.isAttacker).length;
        const females = team.filter(p => p.gender === 'feminino').length;
        const males = team.filter(p => p.gender === 'masculino').length;
        
        const levelCounts = team.reduce((acc, player) => {
            acc[player.level] = (acc[player.level] || 0) + 1;
            return acc;
        }, {});
        
        console.log(`\n🏐 TIME ${index + 1} (${team.length} jogadores):`);
        console.log(`  📊 Pontuação: ${teamScore}`);
        console.log(`  🏐 Levantadores: ${setters}`);
        console.log(`  ⚡ Atacantes: ${attackers}`);
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
    elements.teamOutput.innerHTML = '<h3 class="text-center mb-4"> Times Sorteados</h3>';
    
    if (teams.length === 0) {
        elements.teamOutput.innerHTML = '<p class="text-center">Nenhum time foi gerado.</p>';
        return;
    }
    
    // Adiciona cada time de forma simplificada
    teams.forEach((team, index) => {
        const teamElement = createSimpleTeamElement(team, index);
        elements.teamOutput.appendChild(teamElement);
    });
    
    // Adiciona estatísticas gerais no final (opcional e compacta)
    const summaryElement = createCompactSummary(teams);
    elements.teamOutput.appendChild(summaryElement);
}

// Cria elemento de time simplificado - apenas nomes
function createSimpleTeamElement(team, index) {
    const teamDiv = document.createElement('div');
    teamDiv.className = 'team mb-3';
    
    teamDiv.innerHTML = `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">🏐 Time ${index + 1} (${team.length} jogadores)</h5>
            </div>
            <div class="card-body">
                <div class="row">
                    ${team.map((player, playerIndex) => `
                        <div class="col-md-6 col-lg-4 mb-2">
                            <div class="player-simple d-flex align-items-center">
                                <span class="player-number me-2">${playerIndex + 1}.</span>
                                <span class="player-name">${player.name}</span>
                                ${player.isSetter ? '<span class="setter-indicator ms-2" title="Levantador">🏐</span>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    return teamDiv;
}

// Cria resumo compacto (opcional)
function createCompactSummary(teams) {
    const totalPlayers = teams.reduce((sum, team) => sum + team.length, 0);
    const totalSetters = teams.reduce((sum, team) => sum + team.filter(p => p.isSetter).length, 0);
    const totalAttackers = teams.reduce((sum, team) => sum + team.filter(p => p.isAttacker).length, 0);
    
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'alert alert-success mt-4 text-center';
    summaryDiv.innerHTML = `
        <strong>📊 Resumo:</strong> ${teams.length} times | ${totalPlayers} jogadores | ${totalSetters} levantadores | ${totalAttackers} atacantes
    `;
    
    return summaryDiv;
}

// Cria resumo geral dos times
function createTeamsSummary(teams) {
    const totalPlayers = teams.reduce((sum, team) => sum + team.length, 0);
    const avgScore = teams.reduce((sum, team) => sum + calculateTeamScore(team), 0) / teams.length;
    const totalSetters = teams.reduce((sum, team) => sum + team.filter(p => p.isSetter).length, 0);
    const totalAttackers = teams.reduce((sum, team) => sum + team.filter(p => p.isAttacker).length, 0);
    
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'alert alert-info mb-4';
    summaryDiv.innerHTML = `
        <div class="row text-center">
            <div class="col-md-2">
                <strong>${teams.length}</strong><br>
                <small>Times</small>
            </div>
            <div class="col-md-2">
                <strong>${totalPlayers}</strong><br>
                <small>Jogadores</small>
            </div>
            <div class="col-md-3">
                <strong>${avgScore.toFixed(1)}</strong><br>
                <small>Pontuação Média</small>
            </div>
            <div class="col-md-2">
                <strong>${totalSetters}</strong><br>
                <small>Levantadores</small>
            </div>
            <div class="col-md-3">
                <strong>${totalAttackers}</strong><br>
                <small>Atacantes</small>
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
    const attackers = team.filter(p => p.isAttacker).length;
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
                        ${attackers > 0 ? `<span class="badge bg-success">⚡ ${attackers} atacante(s)</span>` : ''}
                    </div>
                </div>
                <div class="mt-2">
                    <small class="text-muted">
                        <strong>Gênero:</strong> ${females} ♀ / ${males} ♂ | 
                        <strong>Posições:</strong> ${setters}L ${attackers}A |
                        <strong>Níveis:</strong> ${levelBadges}
                    </small>
                </div>
            </div>
            <div class="card-body p-0">
                <ul class="list-group list-group-flush">
                    ${team.map((player, playerIndex) => `
                        <li class="list-group-item d-flex justify-content-between align-items-center ${player.isSetter ? 'setter' : ''} ${player.isAttacker ? 'attacker' : ''}">
                            <div class="player-info">
                                <span class="fw-bold">${playerIndex + 1}. ${player.name}</span>
                                <span class="badge role-badge ${player.gender} ms-2">
                                    ${player.gender.charAt(0).toUpperCase()}
                                </span>
                                ${player.isSetter ? '<span class="setter-badge ms-1">L</span>' : ''}
                                ${player.isAttacker ? '<span class="attacker-badge ms-1">A</span>' : ''}
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
        { name: "João Silva", level: "bom", gender: "masculino", isSetter: false, isAttacker: true },
        { name: "Maria Santos", level: "ótimo", gender: "feminino", isSetter: true, isAttacker: false },
        { name: "Pedro Costa", level: "delicioso", gender: "masculino", isSetter: false, isAttacker: false },
        { name: "Ana Oliveira", level: "bom", gender: "feminino", isSetter: false, isAttacker: true },
        { name: "Carlos Lima", level: "ok", gender: "masculino", isSetter: true, isAttacker: false },
        { name: "Felipe Atacante", level: "ótimo", gender: "masculino", isSetter: false, isAttacker: true },
        { name: "Laura Levantadora", level: "bom", gender: "feminino", isSetter: true, isAttacker: false }
    ];
    
    console.log('🔧 Criando jogadores de exemplo...');
    
    if (apiConnected) {
        console.log('📡 Usando API para criar jogadores...');
        
        for (const player of samplePlayers) {
            const result = await PlayersAPI.createPlayer(player);
            if (result.success) {
                console.log(`✅ Jogador ${player.name} criado via API`);
            } else {
                console.log(`❌ Erro ao criar jogador ${player.name} via API:`, result.error);
            }
        }
    } else {
        console.log('🔥 API não disponível, usando Firebase direto...');
        
        for (const player of samplePlayers) {
            await savePlayerDirectlyToFirebase(player.name, player.level, player.gender, player.isSetter, player.isAttacker, `temp_${Date.now()}`);
        }
    }
    
    // Aguarda um pouco e recarrega
    setTimeout(() => {
        reloadPlayersFromFirebase();
    }, 2000);
}

// Função para testar se o Firebase está funcionando
function testFirebaseConnection() {
    console.log('🧪 Testando conexão com Firebase...');
    
    if (typeof window.firebaseDatabase === 'undefined') {
        console.log('❌ Firebase Database não disponível');
        return false;
    }
    
    if (typeof window.firebaseRef === 'undefined') {
        console.log('❌ Firebase Ref não disponível');
        return false;
    }
    
    if (typeof window.firebaseSet === 'undefined') {
        console.log('❌ Firebase Set não disponível');
        return false;
    }
    
    if (typeof window.firebaseGet === 'undefined') {
        console.log('❌ Firebase Get não disponível');
        return false;
    }
    
    console.log('✅ Todas as funções do Firebase estão disponíveis');
    
    // Teste básico de escrita
    const testRef = window.firebaseRef(window.firebaseDatabase, 'test/connection');
    window.firebaseSet(testRef, {
        timestamp: new Date().toISOString(),
        message: 'Teste de conexão'
    }).then(() => {
        console.log('✅ Teste de escrita no Firebase bem-sucedido');
    }).catch((error) => {
        console.log('❌ Erro no teste de escrita:', error);
    });
    
    return true;
}

// ========================================
// FUNCIONALIDADES DO BUSCADOR DE JOGADORES
// ========================================

let searchResults = {
    current: [],
    saved: [],
    isEmpty: true
};

/**
 * Manipula a busca de jogadores em tempo real
 * @param {Event} e - Evento de input
 */
function handlePlayerSearch(e) {
    const searchTerm = e.target.value.trim().toLowerCase();
    
    // Mostra/esconde botão de limpar
    updateClearButton(searchTerm);
    
    if (!searchTerm) {
        clearSearchResults();
        return;
    }
    
    // Busca nos jogadores atuais
    const currentResults = searchInCurrentPlayers(searchTerm);
    
    // Busca nos jogadores salvos
    const savedResults = searchInSavedPlayers(searchTerm);
    
    // Atualiza resultados
    searchResults = {
        current: currentResults,
        saved: savedResults,
        isEmpty: currentResults.length === 0 && savedResults.length === 0
    };
    
    // Aplica filtros visuais
    applySearchHighlights(searchTerm);
    
    // Expande automaticamente o banco se houver resultados salvos
    if (savedResults.length > 0 && !elements.savedList.classList.contains('expanded')) {
        toggleSavedPlayersList();
    }
}

/**
 * Busca jogadores na lista atual
 * @param {string} searchTerm - Termo de busca
 * @returns {Array} Jogadores encontrados
 */
function searchInCurrentPlayers(searchTerm) {
    return players.filter(player => 
        player.name.toLowerCase().includes(searchTerm) ||
        player.level.toLowerCase().includes(searchTerm) ||
        player.gender.toLowerCase().includes(searchTerm) ||
        (player.isSetter && 'levantador'.includes(searchTerm)) ||
        (player.isAttacker && 'atacante'.includes(searchTerm))
    );
}

/**
 * Busca jogadores no banco de dados salvos
 * @param {string} searchTerm - Termo de busca
 * @returns {Array} Jogadores encontrados
 */
function searchInSavedPlayers(searchTerm) {
    return savedPlayers.filter(player => 
        player.name.toLowerCase().includes(searchTerm) ||
        player.level.toLowerCase().includes(searchTerm) ||
        player.gender.toLowerCase().includes(searchTerm) ||
        (player.isSetter && 'levantador'.includes(searchTerm)) ||
        (player.isAttacker && 'atacante'.includes(searchTerm))
    );
}

/**
 * Aplica destaques visuais nos resultados da busca
 * @param {string} searchTerm - Termo de busca
 */
function applySearchHighlights(searchTerm) {
    // Remove highlights anteriores
    clearSearchHighlights();
    
    if (searchResults.isEmpty) {
        showEmptySearchState();
        return;
    }
    
    // Destaca jogadores atuais
    highlightCurrentPlayers(searchResults.current);
    
    // Destaca jogadores salvos
    highlightSavedPlayers(searchResults.saved);
    
    // Esconde jogadores que não correspondem
    hideNonMatchingPlayers();
    
    // Mostra informações dos resultados
    showSearchResultsInfo();
}

/**
 * Destaca jogadores na lista atual
 * @param {Array} matchingPlayers - Jogadores que correspondem à busca
 */
function highlightCurrentPlayers(matchingPlayers) {
    const playerElements = elements.list.querySelectorAll('.list-group-item');
    
    playerElements.forEach(element => {
        const playerInfo = element.querySelector('.player-info');
        if (!playerInfo) return;
        
        const playerName = playerInfo.querySelector('.player-name').textContent;
        const matchingPlayer = matchingPlayers.find(p => p.name === playerName);
        
        if (matchingPlayer) {
            element.classList.add('player-highlighted');
            element.style.display = '';
        } else {
            element.style.display = 'none';
        }
    });
}

/**
 * Destaca jogadores salvos
 * @param {Array} matchingPlayers - Jogadores que correspondem à busca
 */
function highlightSavedPlayers(matchingPlayers) {
    const savedElements = elements.savedList.querySelectorAll('.saved-player');
    
    savedElements.forEach(element => {
        const playerName = element.querySelector('.saved-player-name').textContent;
        const matchingPlayer = matchingPlayers.find(p => p.name === playerName);
        
        if (matchingPlayer) {
            element.classList.add('player-highlighted');
            element.style.display = 'flex';
        } else {
            element.style.display = 'none';
        }
    });
}

/**
 * Esconde jogadores que não correspondem à busca
 */
function hideNonMatchingPlayers() {
    // Já implementado nas funções de highlight acima
}

/**
 * Mostra informações sobre os resultados da busca
 */
function showSearchResultsInfo() {
    removeExistingSearchInfo();
    
    const total = searchResults.current.length + searchResults.saved.length;
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'search-results-info';
    infoDiv.innerHTML = `
        <i class="bi bi-search"></i>
        <strong>${total} jogador(es) encontrado(s)</strong> 
        (${searchResults.current.length} na lista atual, ${searchResults.saved.length} no banco)
    `;
    
    // Insere após o buscador
    const searchSection = document.querySelector('.search-section');
    if (searchSection) {
        searchSection.insertAdjacentElement('afterend', infoDiv);
    }
}

/**
 * Mostra estado vazio quando nenhum resultado é encontrado
 */
function showEmptySearchState() {
    removeExistingSearchInfo();
    
    // Esconde todos os jogadores
    const allPlayerElements = [
        ...elements.list.querySelectorAll('.list-group-item'),
        ...elements.savedList.querySelectorAll('.saved-player')
    ];
    
    allPlayerElements.forEach(element => {
        element.style.display = 'none';
    });
    
    // Mostra mensagem de vazio
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'search-empty-state';
    emptyDiv.innerHTML = `
        <i class="bi bi-search" style="font-size: 2rem; opacity: 0.3;"></i>
        <p class="mb-0 mt-2">Nenhum jogador encontrado com esse nome</p>
        <small>Tente buscar por outro nome ou limpe a busca</small>
    `;
    
    // Insere após o buscador
    const searchSection = document.querySelector('.search-section');
    if (searchSection) {
        searchSection.insertAdjacentElement('afterend', emptyDiv);
    }
}

/**
 * Remove informações de busca existentes
 */
function removeExistingSearchInfo() {
    const existingInfo = [
        ...document.querySelectorAll('.search-results-info'),
        ...document.querySelectorAll('.search-empty-state')
    ];
    
    existingInfo.forEach(element => element.remove());
}

/**
 * Remove todos os destaques da busca
 */
function clearSearchHighlights() {
    const highlightedElements = [
        ...document.querySelectorAll('.player-highlighted')
    ];
    
    highlightedElements.forEach(element => {
        element.classList.remove('player-highlighted');
    });
}

/**
 * Limpa completamente os resultados da busca
 */
function clearSearchResults() {
    console.log('🧹 Limpando resultados da busca');
    
    // Remove highlights
    clearSearchHighlights();
    
    // Remove informações de busca
    removeExistingSearchInfo();
    
    // Mostra todos os jogadores novamente
    const allPlayerElements = [
        ...elements.list.querySelectorAll('.list-group-item'),
        ...elements.savedList.querySelectorAll('.saved-player')
    ];
    
    allPlayerElements.forEach(element => {
        element.style.display = '';
    });
    
    // Reseta resultados
    searchResults = {
        current: [],
        saved: [],
        isEmpty: true
    };
}

/**
 * Atualiza a visibilidade do botão de limpar busca
 * @param {string} searchTerm - Termo de busca atual
 */
function updateClearButton(searchTerm) {
    if (elements.clearSearchBtn) {
        if (searchTerm.length > 0) {
            elements.clearSearchBtn.classList.add('show');
        } else {
            elements.clearSearchBtn.classList.remove('show');
        }
    }
}

/**
 * Limpa o campo de busca e resultados
 */
function clearPlayerSearch() {
    if (elements.searchInput) {
        elements.searchInput.value = '';
        elements.searchInput.focus();
    }
    
    clearSearchResults();
    updateClearButton('');
}

/**
 * Manipula teclas especiais no buscador
 * @param {KeyboardEvent} e - Evento de teclado
 */
function handleSearchKeydown(e) {
    switch (e.key) {
        case 'Escape':
            clearPlayerSearch();
            break;
            
        case 'Enter':
            e.preventDefault();
            // Se houver apenas um resultado, poderia selecioná-lo automaticamente
            if (searchResults.current.length === 1 && searchResults.saved.length === 0) {
                const player = searchResults.current[0];
                showAlert(`Jogador encontrado: ${player.name}`, 'info');
            } else if (searchResults.current.length === 0 && searchResults.saved.length === 1) {
                const player = searchResults.saved[0];
                addPlayerFromSaved(player.id);
            }
            break;
    }
}

/**
 * Inicializa o banco de jogadores em estado fechado
 */
function initializeBankCollapsed() {
    console.log('🏦 Inicializando banco de jogadores em estado fechado');
    
    if (elements.savedList) {
        elements.savedList.style.display = 'none';
        elements.savedList.classList.remove('expanded');
    }
    
    if (elements.toggleSavedBtn) {
        elements.toggleSavedBtn.innerHTML = '<i class="bi bi-chevron-right"></i><span class="ms-1">Expandir</span>';
        elements.toggleSavedBtn.classList.remove('expanded');
    }
    
    console.log('✅ Banco de jogadores inicializado fechado');
}

/**
 * Inicializa a interface de busca minimalista
 */
function initializeSearch() {
    // Esconde o botão de limpar inicialmente
    if (elements.clearSearchBtn) {
        elements.clearSearchBtn.classList.remove('show');
    }
    
    // Garante estado inicial limpo
    if (elements.searchInput && !elements.searchInput.value) {
        updateClearButton('');
    }
}

// ========================================
// FIM DAS FUNCIONALIDADES DO BUSCADOR
// ========================================

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', init);