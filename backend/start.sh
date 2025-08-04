#!/bin/bash
# Script de instalação rápida para Linux/Mac

echo "🚀 Gerador de Times de Vôlei Villa - Instalação Backend"
echo "=================================================="

# Verifica se Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 não está instalado"
    echo "📋 Instale Python 3.8+ e execute novamente"
    exit 1
fi

echo "✅ Python encontrado: $(python3 --version)"

# Verifica se pip está instalado
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 não está instalado"
    echo "📋 Instale pip3 e execute novamente"
    exit 1
fi

echo "✅ pip encontrado"

# Navega para o diretório do backend
cd "$(dirname "$0")"
echo "📁 Diretório: $(pwd)"

# Instala dependências
echo "📦 Instalando dependências..."
pip3 install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências"
    exit 1
fi

echo "✅ Dependências instaladas!"

# Verifica arquivo de credenciais
if [ ! -f "firebase-credentials.json" ]; then
    echo "⚠️  Arquivo firebase-credentials.json não encontrado"
    echo ""
    echo "📋 Para configurar o Firebase:"
    echo "1. Acesse: https://console.firebase.google.com/"
    echo "2. Selecione seu projeto 'gerador-times-volei'"
    echo "3. Vá em Configurações > Contas de serviço"
    echo "4. Clique em 'Gerar nova chave privada'"
    echo "5. Salve o arquivo como 'firebase-credentials.json' nesta pasta"
    echo ""
    echo "🔄 O servidor funcionará sem Firebase por enquanto"
    echo ""
fi

echo "🌐 Iniciando servidor Flask..."
echo ""
echo "📋 Endpoints disponíveis:"
echo "   http://localhost:5000 - Informações da API"
echo "   http://localhost:5000/players - Gerenciar jogadores"
echo "   http://localhost:5000/health - Status da API"
echo ""
echo "🛑 Para parar o servidor, pressione Ctrl+C"
echo ""

python3 app.py
