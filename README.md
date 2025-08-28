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
- **Visualização com estrelas** para níveis dos jogadores
- **Design responsivo** (mobile/desktop)
- **Interface simplificada** sem sugestões desnecessárias
- **Animações e transições suaves**

## Como Utilizar

### Frontend (Aplicação Web)
1. **Cadastro de Jogadores**
   ```javascript
   {
     "name": "Esmeraldo",
     "level": "ótimo",
     "gender": "masculino",
     "isSetter": true
   }
   ```

2. **Geração de Times**
   - Prompt simplificado para número de times
   - Distribuição automática e inteligente
   - Re-sorteio com manutenção de todas as regras

3. **Compartilhamento**
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
- **FASE 2**: Mulheres distribuídas igualitariamente (round-robin)
- **FASE 3**: Homens distribuídos sequencialmente para completar times
- **Resultado**: Times equilibrados em gênero e posições

### Sistema de Níveis com Visualização
- **OK**: ⭐ (Jogadores iniciantes)
- **Bom**: ⭐⭐ (Jogadores intermediários)
- **Ótimo**: ⭐⭐⭐ (Jogadores avançados)
- **Delicioso**: ⭐⭐⭐⭐ (Jogadores profissionais)

### Interface Otimizada
- **Banco de jogadores** com estrelas de nível visíveis
- **Prompt simplificado** para formação de times
- **Times exibem apenas nomes** para uso durante jogos
- **Resorteio inteligente** mantendo todas as regras estabelecidas

## Firebase Integration + Python API

### Frontend
- **Realtime Database**: Armazenamento de jogadores
- **Sincronização automática**: Jogadores salvos automaticamente
- **Backup na nuvem**: Dados seguros na nuvem do Google
- **Times locais**: Gerados e mantidos apenas localmente

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
  "isSetter": boolean      // true/false para levantador
}
```

## Configuração do Firebase

As credenciais do Firebase já estão configuradas no projeto:
- Database URL: `https://gerador-times-volei-default-rtdb.firebaseio.com`
- Project ID: `gerador-times-volei`
- Validação automática dos dados dos jogadores antes do salvamento
- Sincronização automática ativada apenas para jogadores
- Times são gerados e mantidos localmente (sem salvamento no Firebase)

## Melhorias Recentes

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

## Licença

Projeto desenvolvido por [Matheus Uchoa](https://github.com/MatheusUchoaa) para a comunidade do Vôlei Villa.