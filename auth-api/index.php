<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");

$db_host = getenv('DB_HOST') ?: 'postgres_db';
$db_port = getenv('DB_PORT') ?: '5432';
$db_name = getenv('DB_NAME') ?: 'chatdb';
$db_user = getenv('DB_USER') ?: 'admin';
$db_pass = getenv('DB_PASSWORD') ?: 'secret';

$dsn = "pgsql:host={$db_host};port={$db_port};dbname={$db_name}";
$pdo = null;

try {
    $pdo = new PDO($dsn, $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro de conexão com o banco de dados: ' . $e->getMessage()]);
    exit;
}

$request_method = $_SERVER["REQUEST_METHOD"];
$path_info = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : '/';

switch ($path_info) {
    case '/register':
        if ($request_method == 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            if (!isset($data['username']) || !isset($data['password'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Usuário e senha são obrigatórios.']);
                exit;
            }
            $hashed_password = md5($data['password']);

            try {
                $stmt = $pdo->prepare("INSERT INTO users (username, password_hash) VALUES (:username, :password)");
                $stmt->bindParam(':username', $data['username']);
                $stmt->bindParam(':password', $hashed_password);
                $stmt->execute();
                http_response_code(201);
                echo json_encode(['message' => 'Usuário registrado com sucesso!', 'user_id' => $pdo->lastInsertId()]);
            } catch (PDOException $e) {
                http_response_code(409);
                echo json_encode(['error' => 'Erro ao registrar usuário: ' . $e->getMessage()]);
            }
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Método não permitido para /register. Use POST.']);
        }
        break;

    case '/login':
        if ($request_method == 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            if (!isset($data['username']) || !isset($data['password'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Usuário e senha são obrigatórios.']);
                exit;
            }
            $hashed_password_input = md5($data['password']);

            $stmt = $pdo->prepare("SELECT id, username, password_hash FROM users WHERE username = :username");
            $stmt->bindParam(':username', $data['username']);
            $stmt->execute();
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && $user['password_hash'] === $hashed_password_input) {
                $token = base64_encode(json_encode(['user_id' => $user['id'], 'username' => $user['username'], 'exp' => time() + 3600]));
                echo json_encode(['message' => 'Login bem-sucedido!', 'token' => $token]);
            } else {
                http_response_code(401);
                echo json_encode(['error' => 'Credenciais inválidas.']);
            }
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Método não permitido para /login. Use POST.']);
        }
        break;

    case '/auth/validate':
        if ($request_method == 'GET') {
            $headers = getallheaders();
            $auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : (isset($headers['authorization']) ? $headers['authorization'] : null);

            if ($auth_header) {
                list($type, $token) = explode(' ', $auth_header, 2);
                if (strcasecmp($type, 'Bearer') == 0 && $token) {
                    try {
                        $decoded_token = json_decode(base64_decode($token), true);
                        if ($decoded_token && isset($decoded_token['exp']) && $decoded_token['exp'] > time()) {
                             echo json_encode(['message' => 'Token válido.', 'user' => $decoded_token]);
                        } else {
                            http_response_code(401);
                            echo json_encode(['error' => 'Token inválido ou expirado.']);
                        }
                    } catch (Exception $e) {
                        http_response_code(401);
                        echo json_encode(['error' => 'Token malformado.']);
                    }
                } else {
                    http_response_code(401);
                    echo json_encode(['error' => 'Token malformado ou tipo de autorização incorreto.']);
                }
            } else {
                http_response_code(401);
                echo json_encode(['error' => 'Cabeçalho de autorização ausente.']);
            }
        } else {
             http_response_code(405);
             echo json_encode(['error' => 'Método não permitido para /auth/validate. Use GET.']);
        }
        break;

    case '/health':
        $db_connected = false;
        $db_error_message = null;
        try {
            if ($pdo) {
                $pdo->query("SELECT 1");
                $db_connected = true;
            } else {
                $db_error_message = "PDO object was not initialized globally.";
            }
        } catch (PDOException $e) {
            $db_connected = false;
            $db_error_message = $e->getMessage();
        }

        if ($db_connected) {
            http_response_code(200);
            echo json_encode(['status' => 'Auth-API UP', 'database_connected' => true]);
        } else {
            http_response_code(503);
            echo json_encode([
                'status' => 'Auth-API PARTIALLY_UP',
                'database_connected' => false,
                'database_error' => $db_error_message
            ]);
        }
        break;
}
?>