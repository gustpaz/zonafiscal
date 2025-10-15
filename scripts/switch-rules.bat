@echo off
setlocal

if "%1"=="dev" goto dev
if "%1"=="prod" goto prod
echo Uso: switch-rules.bat [dev^|prod]
echo   dev  - Usa regras permissivas para desenvolvimento
echo   prod - Usa regras seguras para produção
exit /b 1

:dev
echo Alternando para regras de DESENVOLVIMENTO...
echo ⚠️  ATENÇÃO: Estas regras são permissivas e NÃO devem ser usadas em produção!
copy "firestore.rules.dev" "firestore.rules" >nul
goto success

:prod
echo Alternando para regras de PRODUÇÃO...
copy "firestore.rules" "firestore.rules" >nul
goto success

:success
echo Regras atualizadas com sucesso!
echo Para aplicar as mudanças, execute: firebase deploy --only firestore:rules
exit /b 0
