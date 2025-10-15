# Script para alternar entre regras de desenvolvimento e produção
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "prod")]
    [string]$Environment
)

$currentDir = Get-Location
$firestoreRulesFile = Join-Path $currentDir "firestore.rules"

if ($Environment -eq "dev") {
    $sourceFile = Join-Path $currentDir "firestore.rules.dev"
    Write-Host "Alternando para regras de DESENVOLVIMENTO..." -ForegroundColor Yellow
    Write-Host "⚠️  ATENÇÃO: Estas regras são permissivas e NÃO devem ser usadas em produção!" -ForegroundColor Red
} else {
    $sourceFile = Join-Path $currentDir "firestore.rules"
    Write-Host "Alternando para regras de PRODUÇÃO..." -ForegroundColor Green
}

if (Test-Path $sourceFile) {
    Copy-Item $sourceFile $firestoreRulesFile -Force
    Write-Host "Regras atualizadas com sucesso!" -ForegroundColor Green
    Write-Host "Para aplicar as mudanças, execute: firebase deploy --only firestore:rules" -ForegroundColor Cyan
} else {
    Write-Host "Erro: Arquivo de regras não encontrado: $sourceFile" -ForegroundColor Red
}
