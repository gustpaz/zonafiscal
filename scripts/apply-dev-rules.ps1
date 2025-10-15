# Script para aplicar regras de desenvolvimento no Firestore
Write-Host "🔥 Aplicando regras de desenvolvimento no Firestore..." -ForegroundColor Yellow

# Verificar se o Firebase CLI está instalado
try {
    firebase --version | Out-Null
    Write-Host "✅ Firebase CLI encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI não encontrado. Instalando..." -ForegroundColor Red
    npm install -g firebase-tools
    Write-Host "✅ Firebase CLI instalado" -ForegroundColor Green
}

# Fazer backup das regras atuais
if (Test-Path "firestore.rules") {
    Copy-Item "firestore.rules" "firestore.rules.backup" -Force
    Write-Host "✅ Backup das regras criado" -ForegroundColor Green
}

# Aplicar regras de desenvolvimento
if (Test-Path "firestore.rules.dev") {
    Copy-Item "firestore.rules.dev" "firestore.rules" -Force
    Write-Host "✅ Regras de desenvolvimento aplicadas" -ForegroundColor Green
} else {
    Write-Host "❌ Arquivo firestore.rules.dev não encontrado" -ForegroundColor Red
    exit 1
}

# Fazer login no Firebase (se necessário)
Write-Host "🔐 Verificando login no Firebase..." -ForegroundColor Yellow
try {
    firebase projects:list | Out-Null
    Write-Host "✅ Já logado no Firebase" -ForegroundColor Green
} catch {
    Write-Host "🔐 Fazendo login no Firebase..." -ForegroundColor Yellow
    firebase login
}

# Deploy das regras
Write-Host "🚀 Fazendo deploy das regras..." -ForegroundColor Yellow
try {
    firebase deploy --only firestore:rules
    Write-Host "✅ Regras aplicadas com sucesso!" -ForegroundColor Green
    Write-Host "🎯 Agora teste criar uma transação!" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erro ao aplicar regras:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Recarregue a página da aplicação" -ForegroundColor White
Write-Host "2. Faça login se necessário" -ForegroundColor White
Write-Host "3. Tente criar uma transação" -ForegroundColor White
Write-Host "4. Verifique se aparece no dashboard" -ForegroundColor White
