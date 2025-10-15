#!/bin/bash

# Script de monitoramento do Zona Fiscal
echo "📊 Monitoramento do Zona Fiscal"

# Status do PM2
echo "📋 Status do PM2:"
pm2 status

# Logs em tempo real
echo "📋 Últimas 50 linhas do log:"
pm2 logs zonafiscal --lines 50

# Uso de recursos
echo "📋 Uso de recursos:"
pm2 monit

# Status do Nginx
echo "📋 Status do Nginx:"
sudo systemctl status nginx

# Status do banco de dados (se aplicável)
echo "📋 Portas em uso:"
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
