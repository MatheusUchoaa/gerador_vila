# Gerador de Times – Vôlei Villa

![Banner](img/logo.jpg)

Aplicação web para criar partidas de vôlei equilibradas, distribuindo jogadores em times com base em nível técnico, gênero e posição.

## Funcionalidades

- **Balanceamento inteligente** — algoritmo em 5 fases que distribui levantadores, atacantes e mulheres igualitariamente, depois equilibra os times por pontuação
- **Otimização por swap** — após a distribuição inicial, o sistema tenta trocas entre times para minimizar desbalanceamento
- **Drag & drop** — arraste jogadores entre times para ajustes manuais (suporte touch em mobile)
- **Indicadores de equilíbrio** — barra de balanço e chips coloridos mostram em tempo real se os times estão equilibrados
- **Banco de jogadores** — jogadores salvos localmente e sincronizados com Firebase
- **Busca em tempo real** — filtre por nome, nível, gênero ou posição (levantador/atacante)

## Como Usar

1. **Adicione jogadores** preenchendo nome, nível, gênero e posição (levantador/atacante)
2. **Selecione jogadores do banco** clicando neles para adicioná-los à lista ativa
3. **Gere os times** informando quantos times deseja — o sistema sugere a quantidade ideal
4. **Ajuste manualmente** arrastando jogadores entre times se necessário
5. **Re-sorteie** para obter uma distribuição diferente mantendo as regras de balanceamento

## Sistema de Níveis

| Nível      | Estrelas     | Pontuação |
|------------|--------------|-----------|
| Iniciante  | ⭐            | 1         |
| OK         | ⭐⭐          | 2         |
| Bom        | ⭐⭐⭐        | 3         |
| Ótimo      | ⭐⭐⭐⭐      | 4         |
| Pro        | ⭐⭐⭐⭐⭐    | 5         |

## Algoritmo de Distribuição

O algoritmo trabalha em 5 fases para garantir equilíbrio:

1. **Levantadores** — distribuídos via serpentine (time com menos levantadores recebe o próximo)
2. **Atacantes** — mesma lógica serpentine
3. **Mulheres** — distribuídas igualitariamente entre os times
4. **Demais jogadores** — alocados no time com menor pontuação total
5. **Otimização** — 3 rodadas de tentativas de swap entre pares de times para reduzir o desbalanceamento global

O desbalanceamento global considera: pontuação (peso 3), distribuição de mulheres (peso 8), levantadores (peso 10), atacantes (peso 8) e tamanho dos times (peso 5).

## Estrutura do Projeto

```
gerador_vila/
├── index.html          # Interface principal
├── script.js           # Lógica da aplicação
├── style.css           # Estilos
├── img/                # Logo e assets
└── backend/            # API Python + Firebase (opcional)
    ├── app.py
    ├── requirements.txt
    └── firebase-credentials.json
```

## Tecnologias

| Componente     | Tecnologia                     |
|----------------|--------------------------------|
| Frontend       | HTML5, CSS3, JavaScript ES6+   |
| UI             | Bootstrap 5.3, Bootstrap Icons |
| Armazenamento  | LocalStorage                   |
| Banco de dados | Firebase Realtime Database     |
| Backend        | Python + Flask (opcional)      |

## Firebase

A sincronização com Firebase funciona de duas formas:

- **Direta** — o frontend se conecta ao Firebase Realtime Database via SDK
- **Via API** — o backend Python (`backend/app.py`) expõe endpoints REST que se comunicam com o Firebase Admin SDK

O sistema funciona offline com dados locais e sincroniza quando a conexão estiver disponível. Jogadores do Firebase aparecem no banco com o indicador 🔥.

### Estrutura de dados

```json
{
  "name": "Nome do Jogador",
  "level": "iniciante | ok | bom | ótimo | pro",
  "gender": "masculino | feminino",
  "isSetter": false,
  "isAttacker": false,
  "createdAt": "2025-01-01T12:00:00.000Z"
}
```

### Endpoints da API (backend opcional)

```
GET    /players          Lista todos os jogadores
POST   /players          Cria novo jogador
GET    /players/{id}     Busca jogador específico
PUT    /players/{id}     Atualiza jogador
DELETE /players/{id}     Remove jogador
GET    /health           Status da API
```

### Executar o backend

```bash
cd backend
pip install -r requirements.txt
python app.py
# API disponível em http://localhost:5000
```

## Solução de Problemas

**Banco de jogadores vazio?** Verifique se o backend está rodando ou clique no botão ↻ para forçar sincronização. No console do navegador, use `reloadPlayersFromFirebase()`.

**Times desbalanceados?** Use "Sortear Novamente" para nova distribuição ou arraste jogadores entre os times manualmente.

**API offline?** O sistema funciona normalmente com dados locais. A sincronização ocorre automaticamente quando a API voltar.

## Licença

Desenvolvido por [Matheus Uchoa](https://github.com/MatheusUchoaa) para a comunidade do Vôlei Villa.