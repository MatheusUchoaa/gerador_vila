# 📁 Estrutura do Projeto - Gerador de Times da Vila

## 🏗️ Organização das Pastas

```
gerador_vila/
├── 📄 index.html                    # Página principal (raiz para GitHub Pages)
├── 📄 README.md                     # Documentação principal
├── 📁 frontend/                     # Arquivos do frontend
│   ├── 📁 css/
│   │   └── 📄 style.css            # Estilos principais
│   └── 📁 js/
│       └── 📄 script.js            # JavaScript principal
├── 📁 assets/                       # Recursos estáticos
│   └── 📁 images/
│       └── 📄 logo.jpg             # Logo da aplicação
├── 📁 backend/                      # API e backend
│   ├── 📄 app.py                   # Flask API
│   ├── 📄 Program.cs               # C# API (alternativa)
│   ├── 📄 requirements.txt         # Dependências Python
│   └── 📁 Models/                  # Modelos de dados
├── 📁 docs/                         # Documentação
│   ├── 📄 FIREBASE_INTEGRATION.md  # Guia Firebase
│   └── 📄 STRUCTURE.md             # Este arquivo
└── 📁 .git/                        # Controle de versão
```

## 🚀 GitHub Pages

- **Arquivo principal**: `index.html` (deve permanecer na raiz)
- **URL de acesso**: `https://MatheusUchoaa.github.io/gerador_vila`
- **Caminhos relativos**: Todos os links são relativos à raiz

## 🎯 Benefícios da Nova Estrutura

### ✅ **Organização**
- Separação clara entre frontend, backend e assets
- Documentação centralizada na pasta `docs`
- Estrutura escalável para futuras melhorias

### ✅ **Manutenibilidade**
- Arquivos agrupados por funcionalidade
- Fácil localização de recursos
- Separação de responsabilidades

### ✅ **GitHub Pages Compatível**
- `index.html` na raiz mantém funcionamento
- Caminhos relativos preservam links
- Sem quebra de funcionalidade

## 📝 Arquivos Principais

| Arquivo | Localização | Função |
|---------|-------------|---------|
| `index.html` | `/` | Interface principal |
| `style.css` | `/frontend/css/` | Estilos da aplicação |
| `script.js` | `/frontend/js/` | Lógica JavaScript |
| `logo.jpg` | `/assets/images/` | Logo da aplicação |
| `app.py` | `/backend/` | API Flask |

## 🔧 Como Contribuir

1. **Frontend**: Modifique arquivos em `/frontend/`
2. **Estilos**: Edite `/frontend/css/style.css`
3. **JavaScript**: Edite `/frontend/js/script.js`
4. **Imagens**: Adicione em `/assets/images/`
5. **Documentação**: Adicione em `/docs/`

## 📚 Documentação Adicional

- [Integração Firebase](FIREBASE_INTEGRATION.md)
- [README Principal](../README.md)
