// Dados dos jogadores
let players = JSON.parse(localStorage.getItem('players')) || [];
let savedPlayers = JSON.parse(localStorage.getItem('savedPlayers')) || [];
let currentTeams = null;

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
    toggleSavedBtn: document.getElementById('toggle-saved-players')
};

// Inicialização
function init() {
    updatePlayerList();
    updateSavedPlayersList();
    setupEventListeners();
    initializeTooltips();
}

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
}

// Funções principais
function handleAddPlayer(e) {
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
        updatePlayer(playerId, name, level, gender, isSetter);
    } else {
        addPlayer(name, level, gender, isSetter);
        savePlayerToDatabase(name, level, gender, isSetter);
    }
    
    resetForm();
}

function addPlayer(name, level, gender, isSetter = false) {
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
}

function updatePlayer(id, name, level, gender, isSetter) {
    const playerIndex = players.findIndex(p => p.id === id);
    if (playerIndex === -1) return;
    
    players[playerIndex] = {
        ...players[playerIndex],
        name,
        level,
        gender,
        isSetter
    };
    
    savePlayers();
    updatePlayerList();
    showAlert(`Jogador ${name} atualizado com sucesso!`, 'success');
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

function savePlayerToDatabase(name, level, gender, isSetter = false) {
    const existingIndex = savedPlayers.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (existingIndex === -1) {
        savedPlayers.push({
            id: Date.now().toString(),
            name,
            level,
            gender,
            isSetter,
            lastUsed: new Date().toISOString()
        });
    } else {
        savedPlayers[existingIndex] = {
            ...savedPlayers[existingIndex],
            level,
            gender,
            isSetter,
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
        playerElement.innerHTML = `
            ${player.name}
            <span class="badge role-badge ${player.gender}">
                ${player.gender.charAt(0).toUpperCase()}
            </span>
            ${player.isSetter ? '<span class="setter-badge">L</span>' : ''}
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
    
    const exists = players.some(p => 
        p.name === player.name && 
        p.gender === player.gender && 
        p.level === player.level
    );
    
    if (exists) {
        showAlert(`${player.name} já está na lista!`, 'warning');
        return;
    }

    const newPlayer = {
        id: Date.now().toString(),
        name: player.name,
        level: player.level,
        gender: player.gender,
        isSetter: player.isSetter,
        createdAt: new Date().toISOString()
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

function removePlayer(playerId) {
    const playerIndex = players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;
    
    const playerName = players[playerIndex].name;
    players.splice(playerIndex, 1);
    savePlayers();
    updatePlayerList();
    showAlert(`Jogador ${playerName} removido!`, 'warning');
}

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
    // Embaralha todos os jogadores aleatoriamente
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const availablePlayers = [...shuffledPlayers];
    const teams = Array(numTeams).fill().map(() => []);
    
    // Limpa o output antes de gerar novos times
    elements.teamOutput.innerHTML = '';
    
    const femalePlayers = availablePlayers.filter(p => p.gender === 'feminino');
    const malePlayers = availablePlayers.filter(p => p.gender === 'masculino');
    
    // Distribui os jogadores mantendo o balanceamento
    distributePlayers(femalePlayers, teams, availablePlayers);
    distributeMalePlayers(malePlayers, teams, availablePlayers);
    balanceTeams(teams, availablePlayers);
    ensureMinimumSetters(teams, availablePlayers);
    
    // Exibe os novos times
    displayTeams(teams);
    currentTeams = teams;
    elements.generateBtn.style.display = 'none';
    elements.regenerateBtn.style.display = 'block';
    showAlert(`${teams.length} novos times gerados com sucesso!`, 'success');
}

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
    
    // Retorna os grupos ordenados do maior para o menor nível
    return Object.entries(levels)
        .sort((a, b) => levelValues[b[0]] - levelValues[a[0]])
        .map(([_, group]) => group);
}

function distributePlayers(players, teams, availablePlayers) {
    const groupedByLevel = groupPlayersByLevel(players);
    
    for (const levelGroup of groupedByLevel) {
        // Embaralha os jogadores deste nível
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
    // Embaralha os levantadores antes de distribuir
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

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', init);