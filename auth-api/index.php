<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/services/UserService.php';
require_once __DIR__ . '/controllers/AuthController.php';

$pdo = getPDOConnection();

if (!$pdo) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro crítico: Não foi possível conectar ao banco de dados.']);
    exit;
}

if (!initDatabase($pdo)) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro crítico: Não foi possível inicializar o esquema do banco de dados.']);
    exit;
}

$request_method = $_SERVER["REQUEST_METHOD"];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH); 

$script_name = $_SERVER['SCRIPT_NAME'];
$base_path = str_replace('index.php', '', $script_name);
$path_info = str_replace($base_path, '/', $path);

$userService = new UserService($pdo);
$authController = new AuthController($userService);

switch ($path_info) {
    case '/register':
        if ($request_method == 'POST') {
            $authController->register();
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Método não permitido para /register. Use POST.']);
        }
        break;

    case '/login':
        if ($request_method == 'POST') {
            $authController->login();
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Método não permitido para /login. Use POST.']);
        }
        break;

    case '/auth/validate':
        if ($request_method == 'GET') {
            $authController->validateAuth();
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
                $db_error_message = "Objeto PDO não foi inicializado.";
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

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Rota não encontrada.']);
        break;
}

?>
