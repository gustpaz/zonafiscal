#!/bin/bash

# Script para configurar SSL com Let's Encrypt
echo "🔒 Configurando SSL com Let's Encrypt..."

# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
echo "📜 Obtendo certificado SSL..."
sudo certbot --nginx -d zonafiscal.com.br -d www.zonafiscal.com.br

# Configurar renovação automática
echo "🔄 Configurando renovação automática..."
sudo crontab -e
# Adicionar esta linha no crontab:
# 0 12 * * * /usr/bin/certbot renew --quiet

echo "✅ SSL configurado com sucesso!"
echo "🌐 Acesse: https://zonafiscal.com.br"
