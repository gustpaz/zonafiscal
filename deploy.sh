#!/bin/bash

# Script de Deploy para VPS Vultr
echo "🚀 Iniciando deploy do Zona Fiscal..."

# Atualizar sistema
echo "📦 Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar Node.js (se não estiver instalado)
echo "📦 Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 para gerenciar processos
echo "📦 Instalando PM2..."
sudo npm install -g pm2

# Instalar Nginx (se não estiver instalado)
echo "📦 Instalando Nginx..."
sudo apt install nginx -y

# Clonar ou atualizar repositório
echo "📦 Preparando código..."
cd /var/www
sudo mkdir -p zonafiscal
cd zonafiscal

# Se já existe, fazer pull
if [ -d ".git" ]; then
    echo "📦 Atualizando código..."
    sudo git pull origin main
else
    echo "📦 Clonando repositório..."
    sudo git clone https://github.com/gustpaz/zonafiscal.git .
fi

# Instalar dependências
echo "📦 Instalando dependências..."
sudo npm install

# Build do projeto
echo "🔨 Fazendo build do projeto..."
sudo npm run build

# Configurar PM2
echo "⚙️ Configurando PM2..."
sudo pm2 start npm --name "zonafiscal" -- start
sudo pm2 save
sudo pm2 startup

# Configurar Nginx
echo "⚙️ Configurando Nginx..."
sudo tee /etc/nginx/sites-available/zonafiscal << EOF
server {
    listen 80;
    server_name zonafiscal.com.br www.zonafiscal.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Habilitar site
sudo ln -s /etc/nginx/sites-available/zonafiscal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo "✅ Deploy concluído!"
echo "🌐 Acesse: https://zonafiscal.com.br"
