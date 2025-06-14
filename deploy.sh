#!/bin/bash

echo "Iniciando o processo de deploy do Sistema de Chat por Microserviços..."

echo "Construindo as imagens Docker..."
docker-compose build
if [ $? -ne 0 ]; then
    echo "Erro durante o build das imagens. Abortando."
    exit 1
fi

echo "Subindo os containers com Docker Compose..."
docker-compose up -d
if [ $? -ne 0 ]; then
    echo "AVISO: Docker Compose reportou um erro ao subir os containers (um ou mais podem não estar saudáveis)."
fi

echo "Aguardando os serviços iniciarem (tempo extra para healthchecks)..."
sleep 30

echo "Logs dos containers:"
docker-compose logs --tail="20" auth-api
docker-compose logs --tail="20" record-api
docker-compose logs --tail="20" receive-send-api
docker-compose logs --tail="10" postgres_db
docker-compose logs --tail="10" redis_cache

echo "Executando testes de saúde básicos..."

AUTH_API_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
if [ "$AUTH_API_HTTP_CODE" = "200" ]; then
    echo "Auth-API está respondendo (HTTP 200)."
else
    echo "Auth-API não está respondendo corretamente (HTTP $AUTH_API_HTTP_CODE)."
fi

RECORD_API_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5002/health)
if [ "$RECORD_API_HTTP_CODE" = "200" ]; then
    echo "Record-API está respondendo (HTTP 200)."
else
    echo "Record-API não está respondendo corretamente (HTTP $RECORD_API_HTTP_CODE)."
fi

RECEIVE_SEND_API_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health)
if [ "$RECEIVE_SEND_API_HTTP_CODE" = "200" ]; then
    echo "Receive-Send-API está respondendo (HTTP 200)."
else
    echo "Receive-Send-API não está respondendo corretamente (HTTP $RECEIVE_SEND_API_HTTP_CODE)."
fi
 
if docker exec redis_cache_service redis-cli PING | grep -q PONG; then
    echo "Redis está respondendo (PING/PONG)."
else
    echo "Redis não está respondendo."
fi

echo "Processo de deploy concluído."
echo "Serviços disponíveis em:"
echo "   Auth-API: http://localhost:3001"
echo "   Record-API: http://localhost:5002"
echo "   Receive-Send-API: http://localhost:3002"
echo "   PostgreSQL: localhost:5432 (interno: postgres_db:5432)"
echo "   Redis: localhost:6379 (interno: redis_cache:6379)"

echo "Para parar os serviços, execute: docker-compose down"
echo "Para ver logs em tempo real: docker-compose logs -f"

echo "-----------------------------------------------------"
echo "Verificando status detalhado dos containers:"
docker-compose ps

echo "-----------------------------------------------------"
echo "Logs completos do record-api se estiver com problemas:"
if ! docker-compose ps record-api | grep -q "healthy"; then
    echo "record-api NÃO está healthy. Exibindo logs completos:"
    docker-compose logs --tail="200" record-api
else
    echo "record-api está healthy."
fi
echo "-----------------------------------------------------"