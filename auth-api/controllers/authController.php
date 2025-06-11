<?php

require_once __DIR__ . '/../services/UserService.php';

class AuthController {
    private UserService $userService;

    public function __construct(UserService $userService) {
        $this->userService = $userService;
    }

    public function register(): void {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['username']) || !isset($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Usuário e senha são obrigatórios.']);
            return;
        }

        $result = $this->userService->registerUser($data['username'], $data['password']);

        if ($result['success']) {
            http_response_code(201);
            echo json_encode(['message' => 'Usuário registrado com sucesso!', 'user_id' => $result['data']['user_id']]);
        } else {
            if ($result['error'] === 'Nome de usuário já existe.') {
                http_response_code(409);
            } else {
                http_response_code(500);
            }
            echo json_encode(['error' => $result['error']]);
        }
    }

    public function login(): void {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['username']) || !isset($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Usuário e senha são obrigatórios.']);
            return;
        }

        $result = $this->userService->loginUser($data['username'], $data['password']);

        if ($result['success']) {
            http_response_code(200);
            echo json_encode(['message' => 'Login bem-sucedido!', 'token' => $result['data']['token']]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => $result['error']]);
        }
    }

    public function validateAuth(): void {
        $headers = getallheaders();
        $auth_header = $headers['authorization'] ?? null;

        if (!$auth_header || !preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
            http_response_code(401);
            echo json_encode(['error' => 'Cabeçalho de autorização inválido ou ausente.']);
            return;
        }

        $token = $matches[1];
        $result = $this->userService->validateToken($token);

        if ($result['success']) {
            http_response_code(200);
            echo json_encode(['message' => 'Token válido.', 'user' => $result['data']['user']]);
        } else {
            http_response_code(401); // Unauthorized
            echo json_encode(['error' => $result['error']]);
        }
    }
}
