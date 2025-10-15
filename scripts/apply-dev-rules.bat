@echo off
echo 🔥 Aplicando regras de desenvolvimento no Firestore...

REM Verificar se o Firebase CLI está instalado
firebase --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Firebase CLI não encontrado. Instalando...
    npm install -g firebase-tools
    echo ✅ Firebase CLI instalado
) else (
    echo ✅ Firebase CLI encontrado
)

REM Fazer backup das regras atuais
if exist "firestore.rules" (
    copy "firestore.rules" "firestore.rules.backup" >nul
    echo ✅ Backup das regras criado
)

REM Aplicar regras de desenvolvimento
if exist "firestore.rules.dev" (
    copy "firestore.rules.dev" "firestore.rules" >nul
    echo ✅ Regras de desenvolvimento aplicadas
) else (
    echo ❌ Arquivo firestore.rules.dev não encontrado
    pause
    exit /b 1
)

REM Fazer deploy das regras
echo 🚀 Fazendo deploy das regras...
firebase deploy --only firestore:rules
if errorlevel 1 (
    echo ❌ Erro ao aplicar regras. Verifique se está logado no Firebase.
    echo Execute: firebase login
    pause
) else (
    echo ✅ Regras aplicadas com sucesso!
    echo 🎯 Agora teste criar uma transação!
)

echo.
echo 📋 Próximos passos:
echo 1. Recarregue a página da aplicação
echo 2. Faça login se necessário  
echo 3. Tente criar uma transação
echo 4. Verifique se aparece no dashboard
pause
