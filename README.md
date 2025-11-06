# Gerador de Times de Volei Villa

![Banner](img/logo.jpg)

O Gerador de Times da Villa é uma aplicação web inteligente para criar partidas de vôlei equilibradas, considerando múltiplos fatores técnicos e demográficos.

## Recursos Avançados

### Balanceamento Automático Inteligente
- **Sistema de pontuação por nível técnico** (OK = 1, Bom = 2, Ótimo = 3, Delicioso = 4)
- **Distribuição igualitária de levantadores** entre todos os times
- **Distribuição igualitária de mulheres** entre todos os times
- **Preenchimento sequencial** - times completados em ordem

### Compartilhamento de Dados
- **Sistema de código compartilhável** via Base64
- **Banco de dados local persistente**
- **Integração com Firebase** para sincronização em tempo real
- **API Backend Python** para gerenciamento avançado de dados

### Interface Moderna
- **Buscador inteligente** com busca em tempo real
- **Banco de jogadores otimizado** (fechado por padrão com scroll inteligente)
- **Visualização com estrelas** para níveis dos jogadores
- **Design responsivo** (mobile/desktop)
- **Interface simplificada** sem sugestões desnecessárias
- **Animações e transições suaves**

## Como Utilizar

### Frontend (Aplicação Web)
1. **Busca de Jogadores**
   - Use o buscador para encontrar jogadores rapidamente
   - Digite nome, nível, gênero ou "levantador"
   - Veja os resultados destacados em tempo real
   - Use ESC para limpar ou Enter para ações rápidas

4. **Cadastro de Jogadores**
   ```javascript
   {
     "name": "Esmeraldo",
     "level": "ótimo",
     "gender": "masculino",
     "isSetter": true,
     "isAttacker": false
   }
   ```

3. **Banco de Jogadores**
   - Lista inicia fechada para melhor organização
   - Clique em "Expandir" para ver jogadores salvos
   - Contador mostra quantos jogadores estão disponíveis
   - Expande automaticamente durante buscas
   - Jogadores Firebase aparecem com ícone 🔥
   - Botão ↻ para sincronização manual

4. **Geração de Times**
   - Prompt simplificado para número de times
   - Distribuição automática e inteligente
   - Re-sorteio com manutenção de todas as regras

5. **Compartilhamento**
   - Gere código para compartilhar
   - Sincronização automática via Firebase

### Backend API (Opcional)
Para funcionalidades avançadas, execute o backend Python:

1. **Instalar dependências:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configurar Firebase:**
   - Baixe as credenciais do [Console Firebase](https://console.firebase.google.com/)
   - Salve como `backend/firebase-credentials.json`

3. **Executar servidor:**
   ```bash
   python app.py
   # ou execute: backend/start.bat (Windows)
   ```

4. **API estará disponível em:** `http://localhost:5000`

> 📖 **Documentação completa da API:** Veja [backend/README.md](backend/README.md) para detalhes dos endpoints e exemplos de código.

## Estrutura do Projeto

```
gerador_vila/
├── 📄 index.html                # Interface principal
├── 📄 script.js                 # Lógica JavaScript  
├── 📄 style.css                 # Estilos CSS
├── 📁 img/                      # Imagens e assets
├── 📁 backend/                  # API Python + Firebase
│   ├── 📄 app.py               # Flask API
│   ├── 📄 requirements.txt     # Dependências Python
│   └── 📄 firebase-credentials.json
├── 📁 frontend/                 # Arquivos frontend alternativos
└── 📁 assets/                   # Recursos estáticos
```

## Tecnologias

| Componente       | Tecnologia                  |
|------------------|-----------------------------|
| Frontend         | HTML5, CSS3, JavaScript ES6+|
| Backend          | Python 3.8+, Flask          |
| UI Framework     | Bootstrap 5.3               |
| Armazenamento    | LocalStorage API            |
| Banco de Dados   | Firebase Realtime Database  |
| API              | REST API com CRUD completo  |
| Compartilhamento | Base64, Firebase Sync       |

## Funcionalidades Implementadas

### Algoritmo de Distribuição Avançado
- **FASE 1**: Levantadores distribuídos igualitariamente (round-robin)
- **FASE 2**: Atacantes distribuídos igualitariamente (round-robin)
- **FASE 3**: Mulheres distribuídas igualitariamente (round-robin)
- **FASE 4**: Homens distribuídos sequencialmente para completar times
- **Resultado**: Times equilibrados em gênero e posições específicas

### Sistema de Níveis com Visualização
- **OK**: ⭐ (Jogadores iniciantes)
- **Bom**: ⭐⭐ (Jogadores intermediários)
- **Ótimo**: ⭐⭐⭐ (Jogadores avançados)
- **Delicioso**: ⭐⭐⭐⭐ (Jogadores profissionais)

### Interface Otimizada
- **Buscador inteligente** para encontrar jogadores instantaneamente
- **Banco de jogadores fechado** com expansão sob demanda
- **Contador visual** de jogadores salvos sempre visível
- **Banco de jogadores** com estrelas de nível visíveis
- **Prompt simplificado** para formação de times
- **Times exibem apenas nomes** para uso durante jogos
- **Resorteio inteligente** mantendo todas as regras estabelecidas

## Firebase Integration + Python API

### Sincronização Automática com Firebase 🔥
- **Carregamento automático**: Jogadores do Firebase aparecem no banco automaticamente
- **Indicador visual**: Jogadores sincronizados mostram ícone 🔥
- **Botão de recarga**: Sincronização manual com botão ↻
- **Dupla proteção**: Funciona offline com fallback para dados locais
- **Evita duplicatas**: Verificação inteligente por nome + gênero

### Frontend
- **Realtime Database**: Armazenamento de jogadores
- **Sincronização automática**: Jogadores salvos automaticamente
- **Backup na nuvem**: Dados seguros na nuvem do Google
- **Times locais**: Gerados e mantidos apenas localmente
- **Cache local**: Dados persistem mesmo offline

### Backend API Python
- **CRUD Completo**: Create, Read, Update, Delete de jogadores
- **Validação de dados**: Verificação automática antes de salvar
- **Integração Firebase**: Comunicação direta com Firebase Admin SDK
- **API REST**: Endpoints padronizados para todas as operações

### Endpoints da API
```
GET    /players          # Lista todos os jogadores
POST   /players          # Cria novo jogador
GET    /players/{id}     # Busca jogador específico
PUT    /players/{id}     # Atualiza jogador
DELETE /players/{id}     # Remove jogador
GET    /health           # Status da API
```

### Estrutura de Dados dos Jogadores
```javascript
{
  "name": "string",        // Nome do jogador
  "level": "string",       // "ok", "bom", "ótimo", "delicioso" 
  "gender": "string",      // "masculino" ou "feminino"
  "isSetter": boolean,     // true/false para levantador
  "isAttacker": boolean    // true/false para atacante
}
```

## Configuração do Firebase

As credenciais do Firebase já estão configuradas no projeto:
- Database URL: `https://gerador-times-volei-default-rtdb.firebaseio.com`
- Project ID: `gerador-times-volei`
- Validação automática dos dados dos jogadores antes do salvamento
- Sincronização automática ativada apenas para jogadores
- Times são gerados e mantidos localmente (sem salvamento no Firebase)

### Estrutura dos Dados Firebase

**Estrutura do Jogador:**
```javascript
{
  "name": "Nome do Jogador",
  "level": "ótimo|bom|regular|iniciante", 
  "gender": "masculino|feminino|outro",
  "isSetter": true/false,
  "isAttacker": true/false
}
```

### Fluxo de Sincronização Firebase
1. **Página carrega** → Verifica API → Carrega jogadores do Firebase
2. **Jogadores aparecem no banco** com indicador 🔥
3. **Usuário clica em um jogador** → Adiciona à lista ativa
4. **Novos jogadores criados** → Automaticamente salvos no Firebase e banco

### Funções de Teste Disponíveis
Execute no console do navegador (F12):
```javascript
// Recarrega jogadores do Firebase
reloadPlayersFromFirebase()

// Cria jogadores de exemplo (apenas para testes)
createSamplePlayers()

// Testa conexão com Firebase
testFirebaseConnection()
```

### Estrutura de Dados Firebase
```javascript
{
  "name": "João Silva",
  "level": "bom", 
  "gender": "masculino",
  "isSetter": false,
  "isAttacker": true,
  "firebase_id": "abc123",
  "createdAt": "2025-01-01T12:00:00.000Z",
  "lastUsed": "2025-01-01T12:00:00.000Z"
}
```

## 🚀 Melhorias Recentes

### v2.3 - Sistema de Posições e Atacantes ⚡
- ⚡ **Nova Posição: Atacante**
  - Sistema de atacantes similar ao de levantadores
  - Marcador visual específico com badge vermelho "A"
  - Distribuição igualitária de atacantes entre todos os times
  - Checkbox no formulário para marcar jogadores atacantes
  - Busca por "atacante" no sistema de busca inteligente
  
- 🎯 **Algoritmo de Distribuição Aprimorado**
  - FASE 1: Levantadores distribuídos igualitariamente
  - FASE 2: Atacantes distribuídos igualitariamente
  - FASE 3: Mulheres distribuídas igualitariamente
  - FASE 4: Preenchimento sequencial com demais jogadores
  - Estatísticas detalhadas por posição

- 📜 **Interface de Navegação Melhorada**
  - Scroll vertical inteligente no banco de jogadores
  - Indicadores visuais para conteúdo adicional
  - Scrollbar customizada com tema visual consistente
  - Detecção automática de final de conteúdo

### v2.2 - Sistema de Busca e Interface Otimizada ✨
- 🔍 **Buscador de Jogadores Inteligente**
  - Busca em tempo real por nome, nível, gênero e posição
  - Destaque visual dos resultados encontrados
  - Busca simultânea na lista atual e banco Firebase
  - Contador de resultados em tempo real
  - Atalhos de teclado (ESC para limpar, Enter para ações rápidas)
  
- 🏦 **Banco de Jogadores Otimizado**
  - Estado inicial fechado para melhor organização visual
  - Botão expandir/fechar com animações suaves
  - Contador visível de jogadores salvos
  - Expansão automática durante buscas com resultados
  - Interface responsiva e moderna

### v2.1 - Distribuição Igualitária Completa
- ✅ Distribuição igualitária de mulheres entre times
- ✅ Manutenção da distribuição de levantadores
- ✅ Preenchimento sequencial otimizado
- ✅ Resorteio com manutenção de todas as regras

### v2.0 - Interface Aprimorada
- ✅ Sistema de estrelas para visualização de níveis
- ✅ Layout reorganizado do banco de jogadores
- ✅ Prompt simplificado para formação de times
- ✅ Remoção de indicadores desnecessários

## 🛠️ Solução de Problemas

### 🔥 Problemas com Firebase

**Banco de jogadores vazio?**
1. Verifique se o backend está rodando (`python app.py`)
2. Clique no botão ↻ para forçar sincronização
3. Use `reloadPlayersFromFirebase()` no console do navegador

**Jogadores não aparecem?**
1. Abra o console (F12) e veja se há erros
2. Verifique a conexão com Firebase
3. Execute `createSamplePlayers()` para criar dados de teste

**API offline?**
- O sistema funciona com dados locais automaticamente
- Jogadores são salvos no navegador como backup
- Sincronização ocorre quando API voltar online

### 🔍 Problemas com Buscador

**Busca não encontra resultados?**
1. Verifique se digitou corretamente (não diferencia maiúsculas)
2. Tente buscar apenas parte do nome
3. Use ESC para limpar e tentar novamente

**Banco não expande durante busca?**
- Clique manualmente em "Expandir"
- Verifique se há jogadores salvos no contador

### ⚙️ Problemas Gerais

**Times desbalanceados?**
- O algoritmo prioriza equilíbrio de gênero e levantadores
- Use "Sortear Novamente" para nova distribuição
- Adicione mais jogadores para melhor balanceamento

**Dados perdidos?**
- Jogadores ficam salvos no navegador automaticamente
- Use Firebase para backup em nuvem
- Exporte códigos para compartilhar listas

## Licença

Projeto desenvolvido por [Matheus Uchoa](https://github.com/MatheusUchoaa) para a comunidade do Vôlei Villa.