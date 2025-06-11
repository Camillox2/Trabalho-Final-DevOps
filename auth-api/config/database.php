<?php

$db_host = getenv('DB_HOST') ?: 'postgres_db';
$db_port = getenv('DB_PORT') ?: '5432';
$db_name = getenv('DB_NAME') ?: 'chatdb';
$db_user = getenv('DB_USER') ?: 'admin';
$db_pass = getenv('DB_PASSWORD') ?: 'secret';

function getPDOConnection(): ?PDO {
    global $db_host, $db_port, $db_name, $db_user, $db_pass;
    $dsn = "pgsql:host={$db_host};port={$db_port};dbname={$db_name}";
    
    try {
        $pdo = new PDO($dsn, $db_user, $db_pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        error_log("Erro de conexão com o banco de dados: " . $e->getMessage());
        return null;
    }
}

function initDatabase(PDO $pdo): bool {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL
        )");
        return true;
    } catch (PDOException $e) {
        error_log("Erro ao inicializar tabela 'users': " . $e->getMessage());
        return false;
    }
}
