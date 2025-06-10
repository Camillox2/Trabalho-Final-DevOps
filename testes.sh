#!/bin/bash
set -e

echo "Teste 1: Registro de novo usuário..."
curl -s -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{ "username": "tiago", "password": "123456" }'

echo "Teste 2: Registro de usuário 2"
curl -s -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{ "username": "jorge", "password": "123456" }'

echo ""
echo "Teste 2: Login"
TOKEN=$(curl -s -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{ "username": "tiago", "password": "123456" }' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

echo "Login realizado e o token foi gerado: $TOKEN"

echo ""
echo "Teste 3: Enviando mensagem do usuário 1 para o usuário 2"
curl -s -X POST http://localhost:3002/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "userIdSend": 1,"userIdReceive": 2,"message": "Olá, usuário 2! Como vai?" }'

echo ""
echo "Teste 5: Consulta de mensagens do usuário 1"
curl -s -X GET "http://localhost:3002/messages?user=1" \
  -H "Authorization: Bearer $TOKEN"