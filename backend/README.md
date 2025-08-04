# Gerador de Times - Backend API

## 🚀 Setup e Instalação

### 1. Instalar Python 3.8+
Certifique-se de ter Python 3.8 ou superior instalado.

### 2. Instalar dependências
```bash
cd backend
pip install -r requirements.txt
```

### 3. Configurar Firebase
Você precisa de uma chave de serviço do Firebase:

1. Vá para o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione seu projeto "gerador-times-volei"
3. Vá em "Configurações do projeto" > "Contas de serviço"
4. Clique em "Gerar nova chave privada"
5. Salve o arquivo como `firebase-credentials.json` na pasta `backend/`

### 4. Executar o servidor
```bash
python app.py
```

O servidor estará disponível em: `http://localhost:5000`

## 📡 API Endpoints

### Base URL
```
http://localhost:5000
```

### Endpoints Disponíveis

#### 1. **GET /** - Informações da API
```http
GET /
```
**Resposta:**
```json
{
  "message": "API do Gerador de Times de Vôlei Villa",
  "version": "1.0",
  "endpoints": {...}
}
```

#### 2. **GET /players** - Listar todos os jogadores
```http
GET /players
```
**Resposta:**
```json
{
  "success": true,
  "players": [
    {
      "firebase_id": "abc123",
      "name": "João Silva",
      "level": "ótimo",
      "gender": "masculino",
      "isSetter": true,
      "createdAt": "2025-01-01T10:00:00",
      "updatedAt": "2025-01-01T10:00:00"
    }
  ]
}
```

#### 3. **POST /players** - Criar novo jogador
```http
POST /players
Content-Type: application/json

{
  "name": "Maria Santos",
  "level": "bom",
  "gender": "feminino",
  "isSetter": false
}
```
**Resposta:**
```json
{
  "success": true,
  "player": {...},
  "message": "Jogador Maria Santos criado com sucesso!"
}
```

#### 4. **GET /players/{id}** - Buscar jogador específico
```http
GET /players/abc123
```

#### 5. **PUT /players/{id}** - Atualizar jogador
```http
PUT /players/abc123
Content-Type: application/json

{
  "name": "João Silva Atualizado",
  "level": "delicioso",
  "gender": "masculino",
  "isSetter": true
}
```

#### 6. **DELETE /players/{id}** - Remover jogador
```http
DELETE /players/abc123
```

#### 7. **GET /health** - Status da API
```http
GET /health
```

## 🔧 Estrutura de Dados

### Jogador (Player)
```json
{
  "name": "string",        // Nome do jogador
  "level": "string",       // "ok", "bom", "ótimo", "delicioso"
  "gender": "string",      // "masculino", "feminino"
  "isSetter": boolean,     // true/false
  "firebase_id": "string", // ID único do Firebase
  "createdAt": "string",   // ISO timestamp
  "updatedAt": "string"    // ISO timestamp
}
```

## 🔒 Validações

- **name**: String não vazia, obrigatória
- **level**: Deve ser um dos valores: "ok", "bom", "ótimo", "delicioso"
- **gender**: Deve ser "masculino" ou "feminino"
- **isSetter**: Deve ser boolean (true/false)

## 🐛 Tratamento de Erros

### Códigos de Status HTTP
- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Dados inválidos
- `404` - Recurso não encontrado
- `500` - Erro interno do servidor

### Formato de Erro
```json
{
  "success": false,
  "error": "Mensagem de erro detalhada"
}
```

## 🔗 Integração com Frontend

O frontend JavaScript pode fazer requisições para esta API:

```javascript
// Exemplo: Buscar todos os jogadores
fetch('http://localhost:5000/players')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Jogadores:', data.players);
    }
  });

// Exemplo: Criar novo jogador
fetch('http://localhost:5000/players', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Novo Jogador',
    level: 'bom',
    gender: 'masculino',
    isSetter: false
  })
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('Jogador criado:', data.player);
  }
});
```
