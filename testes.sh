#!/bin/bash
set -e

echo "Teste 1: Registro de novo usuario..."
curl -s -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{ "username": "tiago", "password": "123456" }'

echo "Teste 2: Registro de usuario 2"
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
echo "Teste 3: Enviando mensagem do usuario 1 para o usuario 2"
curl -s -X POST http://localhost:3002/message \
  -H "Content-Type: application/json" \
  -H "authorization: Bearer $TOKEN" \
  -d '{ "userIdSend": 1,"userIdReceive": 2,"message": "Ola, usuario 2! Como vai?" }'

echo ""
echo "Teste 4: Consulta de mensagens do usuario 1"
curl -s -X GET "http://localhost:3002/message?user=1" \
  -H "authorization: Bearer $TOKEN"