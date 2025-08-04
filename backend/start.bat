@echo off
echo 🚀 Iniciando Backend do Gerador de Times de Volei Villa
echo.

REM Verifica se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python não está instalado ou não está no PATH
    echo.
    echo 📋 Instruções de instalação:
    echo 1. Baixe Python em: https://python.org/downloads/
    echo 2. Durante a instalação, marque "Add Python to PATH"
    echo 3. Execute este script novamente
    pause
    exit /b 1
)

echo ✅ Python encontrado
python --version

REM Navega para o diretório do backend
cd /d "%~dp0"
echo 📁 Diretório atual: %CD%

REM Verifica se o arquivo requirements.txt existe
if not exist "requirements.txt" (
    echo ❌ Arquivo requirements.txt não encontrado
    echo Certifique-se de estar na pasta 'backend'
    pause
    exit /b 1
)

echo 📦 Instalando dependências...
pip install -r requirements.txt

if errorlevel 1 (
    echo ❌ Erro ao instalar dependências
    echo.
    echo 💡 Tente executar manualmente:
    echo pip install -r requirements.txt
    pause
    exit /b 1
)

echo ✅ Dependências instaladas com sucesso!
echo.

REM Verifica se o arquivo de credenciais existe
if not exist "firebase-credentials.json" (
    echo ⚠️  Arquivo firebase-credentials.json não encontrado
    echo.
    echo 📋 Para configurar o Firebase:
    echo 1. Acesse: https://console.firebase.google.com/
    echo 2. Selecione seu projeto 'gerador-times-volei'
    echo 3. Vá em Configurações ^> Contas de serviço
    echo 4. Clique em 'Gerar nova chave privada'
    echo 5. Salve o arquivo como 'firebase-credentials.json' nesta pasta
    echo.
    echo 🔄 O servidor funcionará sem Firebase por enquanto
    echo.
)

echo 🌐 Iniciando servidor Flask...
echo.
echo 📋 Endpoints disponíveis:
echo    http://localhost:5000 - Informações da API
echo    http://localhost:5000/players - Gerenciar jogadores
echo    http://localhost:5000/health - Status da API
echo.
echo 🛑 Para parar o servidor, pressione Ctrl+C
echo.

python app.py

echo.
echo 👋 Servidor finalizado
pause
