# Trabalho Final – Disciplina de DevOps: Containerização e Orquestração do Sistema de Chat por Microserviços

**Aluno:** Vitor Henrique Camillo
**Aluno:** Hiro Alessandro Terato
**Aluno:** Erick Borges

## 1. Introdução e Objetivo

Este projeto tem como objetivo principal containerizar e orquestrar um sistema de chat baseado em microserviços, utilizando Docker e Docker Compose. Os microserviços componentes são: uma API de Autenticação (PHP), uma API de Gravação de Mensagens (Python) e uma API de Envio/Recebimento de Mensagens (Node.js). O projeto visa aplicar boas práticas de DevOps, assegurando a comunicação eficiente entre os serviços, a persistência de dados e um deploy automatizado em um ambiente simulado de produção.

## 2. Arquitetura Proposta

O sistema é composto pelos seguintes serviços, cada um rodando em seu próprio contêiner Docker:

- **Auth-API (PHP):** Responsável pelo registro e autenticação de usuários.
- **Record-API (Python):** Responsável por persistir as mensagens enviadas no banco de dados.
- **Receive-Send-API (Node.js):** Responsável por lidar com o envio e recebimento de mensagens em tempo real (simulado) e interagir com as outras APIs.
- **PostgreSQL:** Banco de dados relacional para persistência de dados das mensagens e usuários.
- **Redis:** Cache para sessões de usuário ou outras otimizações (ex: gerenciamento de presença).
- **Nginx (Opcional/Gateway):** Poderia ser adicionado como um reverse proxy e load balancer, mas para simplificar, as APIs podem ser acessadas diretamente por suas portas mapeadas inicialmente.

## 3. Pré-requisitos e Configuração do Ambiente

Antes de iniciar, certifique-se de ter os seguintes softwares instalados em sua máquina:

- **Docker Engine:** [Instruções de Instalação](https://docs.docker.com/engine/install/)
- **Docker Compose:** [Instruções de Instalação](https://docs.docker.com/compose/install/) (Geralmente incluído na instalação do Docker Desktop)
- **Git:** [Instruções de Instalação](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) (Para clonar o repositório do projeto)
- **Um editor de texto ou IDE** (VSCode, Sublime Text, etc.)
- **Um terminal ou prompt de comando**
- **`curl` ou Postman:** Para realizar os testes nas APIs.

## 4. Estrutura de Diretórios do Projeto

## 5. Dockerfiles

Abaixo estão os `Dockerfile`s para cada microserviço.

### 5.1. Auth-API (PHP)

**Localização:** `auth-api/Dockerfile`

```dockerfile
# auth-api/Dockerfile
FROM php:8.1-apache

# Instalar extensões PHP necessárias (ex: pdo_pgsql para PostgreSQL)
RUN docker-php-ext-install pdo pdo_pgsql

# Copiar código da aplicação para o diretório web do Apache
COPY ./src/ /var/www/html/

# Expor a porta 80 (padrão do Apache)
EXPOSE 80

# record-api/Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Copiar arquivo de dependências
COPY ./requirements.txt /app/

# Instalar dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY ./src/ /app/

# Expor a porta da aplicação (ex: 5001)
EXPOSE 5001

# Comando para iniciar a aplicação
CMD ["python", "app.py"]

# receive-send-api/Dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

# Copiar package.json e package-lock.json (se existir)
COPY package*.json ./

# Instalar dependências da aplicação
RUN npm install

# Copiar código da aplicação
COPY ./src/ .

# Expor a porta da aplicação (ex: 3000)
EXPOSE 3000

# Comando para iniciar a aplicação
CMD [ "node", "server.js" ]

8. Comandos de Build e Deploy
8.1. Build das Imagens
O build das imagens é feito automaticamente pelo script deploy.sh ou manualmente com:

docker-compose build

8.2. Deploy da Aplicação
Para realizar o deploy (subir todos os serviços):

./deploy.sh

Este script também executará testes de saúde básicos.

8.3. Parar a Aplicação
Para parar todos os serviços:

docker-compose down

Para parar e remover os volumes (cuidado, isso apaga os dados do banco de dados se não houver backup):

docker-compose down -v

8.4. Visualizar Logs
Para visualizar os logs de todos os serviços em tempo real:

docker-compose logs -f

Para visualizar os logs de um serviço específico (ex: auth-api):

docker-compose logs -f auth-api

9. Diagramas (Mermaid)
9.1. Diagrama de Contêineres e Rede
graph TD
    subgraph "Host Machine (Seu PC)"
        U[Usuário/Cliente]
    end

    subgraph "Docker Environment (Rede: chat_network)"
        LB(Load Balancer/API Gateway - Opcional)
        RSAPI[Receive-Send API (Node.js)\nPorta Host: 3000\nPorta Contêiner: 3000]
        AUTH[Auth API (PHP)\nPorta Host: 8080\nPorta Contêiner: 80]
        REC[Record API (Python)\nPorta Host: 5001\nPorta Contêiner: 5001]
        DB[(PostgreSQL DB\nVolume: postgres_data\nPorta Host: 5432\nPorta Contêiner: 5432)]
        CACHE[(Redis Cache\nPorta Host: 6379\nPorta Contêiner: 6379)]
    end

    U -->|HTTP Requests (ex: Postman)| RSAPI
    U -->|HTTP Requests (ex: Postman)| AUTH
    U -->|HTTP Requests (ex: Postman)| REC

    RSAPI -->|Validação de Token| AUTH
    RSAPI -->|Gravação de Msg| REC
    RSAPI -->|Cache de Sessão/Presença| CACHE
    RSAPI -.->|Acesso Opcional Direto| DB

    AUTH -->|Dados de Usuário| DB
    REC -->|Persistência de Msg| DB

    style RSAPI fill:#87CEEB,stroke:#333,stroke-width:2px
    style AUTH fill:#FFD700,stroke:#333,stroke-width:2px
    style REC fill:#90EE90,stroke:#333,stroke-width:2px
    style DB fill:#DDA0DD,stroke:#333,stroke-width:2px
    style CACHE fill:#FFA07A,stroke:#333,stroke-width:2px

9.2. Diagrama de Fluxo de Rede (Simplificado)
sequenceDiagram
    participant U as Usuário/Cliente
    participant RS as Receive-Send API (Node.js)
    participant AU as Auth API (PHP)
    participant RC as Record API (Python)
    participant DB as PostgreSQL
    participant RD as Redis

    U->>+RS: Enviar Mensagem (POST /messages)
    RS->>+AU: Validar Token Usuário (GET /auth/validate)
    AU-->>-RS: Token Válido/Inválido
    alt Token Válido
        RS->>+RC: Gravar Mensagem (POST /messages)
        RC->>+DB: INSERT INTO messages
        DB-->>-RC: Mensagem Gravada
        RC-->>-RS: Sucesso/Falha
        RS->>+RD: Atualizar Cache (opcional)
        RD-->>-RS: Cache Atualizado
        RS-->>-U: Mensagem Enviada
    else Token Inválido
        RS-->>-U: Erro de Autenticação
    end

    U->>+RS: Registrar Usuário (POST /register via RS ou direto AU)
    RS->>+AU: Registrar (POST /users)
    AU->>+DB: INSERT INTO users
    DB-->>-AU: Usuário Criado
    AU-->>-RS: Usuário Registrado
    RS-->>-U: Registro Concluído

    U->>+RS: Login (POST /login via RS ou direto AU)
    RS->>+AU: Login (POST /login)
    AU->>+DB: SELECT user
    DB-->>-AU: Dados Usuário
    AU->>+RD: Salvar Sessão (opcional)
    RD-->>-AU: Sessão Salva
    AU-->>-RS: Token de Acesso
    RS-->>-U: Login Bem-sucedido

    U->>+RS: Consultar Mensagens (GET /messages)
    RS->>+RC: Obter Mensagens (GET /messages)
    RC->>+DB: SELECT FROM messages
    DB-->>-RC: Lista de Mensagens
    RC-->>-RS: Mensagens
    RS-->>-U: Lista de Mensagens

10. Casos de Teste (Exemplos com curl)
Nota: Os endpoints e formatos de payload são exemplos. Adapte-os à sua implementação.

10.1. Registro de Usuário (Auth-API)
curl -X POST -H "Content-Type: application/json" \
-d '{"username": "vitor", "password": "password123"}' \
http://localhost:8080/register # Ou o endpoint da sua Auth-API

10.2. Autenticação de Usuário e Obtenção de Token (Auth-API)
curl -X POST -H "Content-Type: application/json" \
-d '{"username": "vitor", "password": "password123"}' \
http://localhost:8080/login # Ou o endpoint da sua Auth-API
# Espera-se um JSON com um token de acesso

Guarde o token para os próximos requests.
TOKEN="SEU_TOKEN_AQUI"

10.3. Envio de Mensagem (Receive-Send-API)
curl -X POST -H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
-d '{"sender_id": "1", "receiver_id": "2", "content": "Olá, tudo bem?"}' \
http://localhost:3000/messages

10.4. Consulta de Mensagens Armazenadas (Receive-Send-API ou Record-API)
curl -X GET -H "Authorization: Bearer $TOKEN" \
http://localhost:3000/messages?userId=1 # Ou o endpoint da sua API para buscar mensagens

10.5. Teste de Saúde dos Serviços (Conforme deploy.sh)
curl http://localhost:8080/health # Auth-API
curl http://localhost:5001/health # Record-API
curl http://localhost:3000/health # Receive-Send-API
docker exec redis_cache_service redis-cli PING # Redis
# Para o PostgreSQL, o teste é mais complexo, geralmente feito pela capacidade das APIs de se conectarem.

## 11. Pontos de Falha Comuns e Soluções

Durante o desenvolvimento e deploy de um sistema de microserviços com Docker, alguns problemas comuns podem surgir. Abaixo estão alguns exemplos, suas causas prováveis e como solucioná-los:

1.  **Serviço não inicia / Healthcheck falha:**
    * **Causa Provável:**
        * Erro de configuração (variáveis de ambiente incorretas no `.env` ou `docker-compose.yml`, portas já em uso no host).
        * Erro no código da API impedindo a inicialização (verificar Dockerfile, script de entrypoint ou comando CMD).
        * Dependência não disponível ou demorando muito para iniciar (ex: API depende do banco de dados que ainda não está pronto, apesar do `depends_on`).
        * Endpoint de healthcheck configurado incorretamente no `docker-compose.yml` ou não implementado corretamente na API.
    * **Solução:**
        * Verificar os logs detalhados do contêiner específico: `docker-compose logs <nome_do_servico>` ou `docker logs <id_do_container>`.
        * Conferir as variáveis de ambiente e mapeamento de portas no `docker-compose.yml`.
        * Para problemas de dependência, revisar a ordem de `depends_on` e as condições de `healthcheck` das dependências. Aumentar o `start_period` no healthcheck do serviço problemático pode ajudar.
        * Testar o endpoint de healthcheck manualmente com `curl` de dentro de outro contêiner na mesma rede ou do host (se a porta estiver mapeada).

2.  **API retorna erro 5xx (Internal Server Error) ou outros erros HTTP inesperados:**
    * **Causa Provável:**
        * Erro interno na lógica da aplicação da API.
        * Falha ao conectar com o banco de dados (PostgreSQL) ou cache (Redis) - credenciais erradas, serviço indisponível.
        * Variáveis de ambiente necessárias para a API não foram injetadas corretamente no contêiner.
    * **Solução:**
        * Analisar os logs da API específica para identificar a mensagem de erro e o stack trace.
        * Verificar se as URLs de conexão e credenciais para serviços dependentes (DB, Redis, outras APIs) estão corretas e se os serviços estão acessíveis (ex: `DB_HOST` no `auth-api` deve ser `postgres_db`).
        * Garantir que todas as variáveis de ambiente listadas no `docker-compose.yml` para o serviço estão sendo lidas corretamente pela aplicação.

3.  **Problemas de Conexão entre Serviços na Rede Docker:**
    * **Causa Provável:**
        * Nomes de serviço incorretos nas URLs de comunicação entre APIs (ex: `AUTH_API_URL: http://auth-api` no `receive-send-api` deve corresponder ao nome do serviço `auth-api` no `docker-compose.yml`).
        * Todos os serviços não estão na mesma rede Docker (`chat_network`).
        * Firewall do host bloqueando comunicação interna do Docker (menos comum em configurações padrão).
    * **Solução:**
        * Confirmar que os nomes dos serviços usados nas URLs de comunicação interna correspondem aos nomes definidos no `docker-compose.yml`.
        * Verificar se todos os serviços estão listados sob a mesma `networks: - chat_network`.
        * Utilizar `docker exec -it <id_do_container_origem> sh` para entrar em um contêiner e tentar usar `ping <nome_do_servico_destino>` ou `curl http://<nome_do_servico_destino>:<porta_interna_servico_destino>/endpoint` para testar a conectividade.

4.  **Persistência de Dados não Funciona (Dados do PostgreSQL somem após reiniciar):**
    * **Causa Provável:**
        * Volume do PostgreSQL (`postgres_data`) não foi montado corretamente ou o caminho no `docker-compose.yml` está incorreto.
        * Permissões incorretas no diretório do host mapeado para o volume (se estiver usando bind mount em vez de volume nomeado).
    * **Solução:**
        * Verificar a definição do volume no `docker-compose.yml`: `volumes: - postgres_data:/var/lib/postgresql/data`.
        * Inspecionar os volumes do Docker com `docker volume ls` e `docker volume inspect projetodevops_postgres_data`.
        * Garantir que o usuário dentro do contêiner do PostgreSQL tem permissão para escrever no volume.

5.  **Redis não acessível / Comandos falham:**
    * **Causa Provável:**
        * Contêiner do Redis (`redis_cache_service`) não iniciou corretamente ou está falhando no healthcheck.
        * Problema de rede ou nome do host incorreto na configuração das APIs que o utilizam (`REDIS_HOST: redis_cache`).
    * **Solução:**
        * Checar logs do `redis_cache_service`: `docker-compose logs redis_cache_service`.
        * Verificar o resultado do healthcheck do Redis no `docker-compose.yml`.
        * Tentar conectar via `redis-cli PING` de dentro de um contêiner que depende dele (ex: `docker exec -it receive_send_api_service sh` e depois `redis-cli -h redis_cache PING`).
```
