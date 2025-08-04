```markdown
# Gerador de Times de Vôlei Villa 🏐

![Banner](img/logo.jpg)

O Gerador de Times da Villa é uma aplicação web inteligente para criar partidas de vôlei equilibradas, considerando múltiplos fatores técnicos e demográficos.

## ✨ Recursos Avançados

### 🎯 Balanceamento Automático
- **Sistema de pontuação por nível técnico**  
  (OK ⭐ = 1, Bom ⭐⭐ = 2, Ótimo ⭐⭐⭐ = 3, Delicioso 🔥 = 4)
- **Distribuição proporcional por gênero**
- **Alocação estratégica de levantadores**

### 📥📤 Compartilhamento de Dados
- **Sistema de código compartilhável** via Base64
- **Banco de dados local persistente**
- **🔥 Integração com Firebase** para sincronização em tempo real
- **🐍 API Backend Python** para gerenciamento avançado de dados

### 📱 Experiência do Usuário
- Interface intuitiva com feedback visual
- Design responsivo (mobile/desktop)
- Animações e transições suaves

## 🚀 Como Utilizar

### 🌐 **Frontend (Aplicação Web)**
1. **Cadastro de Jogadores**
   ```javascript
   // Exemplo de estrutura de dados
   {
     "name": "Jogador Exemplo",
     "level": "ótimo",
     "gender": "masculino",
     "isSetter": true
   }
   ```

2. **Geração de Times**
   - Número automático sugerido
   - Possibilidade de customização
   - Re-sorteio ilimitado

3. **Compartilhamento**
   - Gere código para compartilhar
   - Sincronização automática via Firebase

### 🐍 **Backend API (Opcional)**
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

## 🛠 Tecnologias

| Componente       | Tecnologia                  |
|------------------|-----------------------------|
| Frontend         | HTML5, CSS3, JavaScript ES6+|
| Backend          | Python 3.8+, Flask          |
| UI Framework     | Bootstrap 5.3               |
| Armazenamento    | LocalStorage API            |
| Banco de Dados   | Firebase Realtime Database  |
| API              | REST API com CRUD completo  |
| Compartilhamento | Base64, Firebase Sync       |

## 🎨 Personalização

Edite o arquivo CSS para ajustar:
```css
:root {
  --primary: #FFD700; /* Amarelo ouro */
  --secondary: #C9A0DC; /* Lavanda */
  --accent: #E6E6FA; /* Azul bebê */
}
```

## 📋 Requisitos Técnicos

- Navegadores compatíveis:
  - Chrome ≥ 60
  - Firefox ≥ 55
  - Edge ≥ 15
  - Safari ≥ 10.1

## 📌 Exemplo de Uso

```javascript
// Adicionando um jogador programaticamente
addPlayer("Esmeraldo", "delicioso", "Masculino", false);

// Salvando dados no Firebase (automático)
// Apenas os jogadores são salvos no Firebase quando adicionados
// Times são gerados localmente sem salvamento no Firebase
```

## 🔥 Firebase Integration + Python API

O projeto agora inclui integração completa com Firebase e uma API Python:

### **🌐 Frontend**
- **Realtime Database**: Armazenamento de jogadores com dados essenciais
- **Analytics**: Monitoramento de uso da aplicação
- **Sincronização automática**: Jogadores são salvos automaticamente no Firebase
- **Backup na nuvem**: Dados dos jogadores ficam seguros na nuvem do Google
- **Times locais**: Times são gerados e mantidos apenas localmente

### **🐍 Backend API Python**
- **CRUD Completo**: Create, Read, Update, Delete de jogadores
- **Validação de dados**: Verificação automática antes de salvar
- **Integração Firebase**: Comunicação direta com Firebase Admin SDK
- **API REST**: Endpoints padronizados para todas as operações
- **Tratamento de erros**: Respostas consistentes e informativas

### **📡 Endpoints da API**
```
GET    /players          # Lista todos os jogadores
POST   /players          # Cria novo jogador
GET    /players/{id}     # Busca jogador específico
PUT    /players/{id}     # Atualiza jogador
DELETE /players/{id}     # Remove jogador
GET    /health           # Status da API
```

### Estrutura de Dados dos Jogadores

Cada jogador é salvo no Firebase com exatamente estes campos:
```javascript
{
  "name": "string",        // Nome do jogador
  "level": "string",       // "ok", "bom", "ótimo", "delicioso" 
  "gender": "string",      // "masculino" ou "feminino"
  "isSetter": boolean      // true/false para levantador
}
```

**Nota:** Os times gerados não são salvos no Firebase, sendo mantidos apenas localmente durante a sessão.

### Configuração do Firebase

As credenciais do Firebase já estão configuradas no projeto:
- Database URL: `https://gerador-times-volei-default-rtdb.firebaseio.com`
- Project ID: `gerador-times-volei`
- Validação automática dos dados dos jogadores antes do salvamento
- Sincronização automática ativada apenas para jogadores
- Times são gerados e mantidos localmente (sem salvamento no Firebase)

## 📄 Licença

Projeto desenvolvido por [Matheus Uchoa](https://github.com/MatheusUchoaa) para a comunidade do Vôlei Villa.
```