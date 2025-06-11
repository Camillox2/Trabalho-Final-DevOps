    <?php
    require_once __DIR__ . '/../config/database.php';
    require_once __DIR__ . '/../models/User.php';

    class UserService {
        private PDO $pdo;

        public function __construct(PDO $pdo) {
            $this->pdo = $pdo;
        }

        public function registerUser(string $username, string $password): array {
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);

            try {
                $stmt = $this->pdo->prepare("INSERT INTO users (username, password_hash) VALUES (:username, :password_hash)");
                $stmt->bindParam(':username', $username);
                $stmt->bindParam(':password_hash', $hashed_password);
                $stmt->execute();
                $userId = $this->pdo->lastInsertId();
                return ['success' => true, 'data' => ['user_id' => $userId]];
            } catch (PDOException $e) {
                if ($e->getCode() === '23505') {
                    return ['success' => false, 'error' => 'Nome de usuário já existe.'];
                }
                error_log("Erro ao registrar usuário: " . $e->getMessage());
                return ['success' => false, 'error' => 'Erro ao registrar usuário: ' . $e->getMessage()];
            }
        }

        public function loginUser(string $username, string $password): array {
            $password = trim($password);

            $stmt = $this->pdo->prepare("SELECT id, username, password_hash FROM users WHERE username = :username");
            $stmt->bindParam(':username', $username);
            $stmt->execute();
            $user_data = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user_data && password_verify($password, $user_data['password_hash'])) {
                $payload = [
                    'user_id' => $user_data['id'],
                    'username' => $user_data['username'],
                    'exp' => time() + (3600 * 24) // Expira em 24 horas
                ];
                $token = base64_encode(json_encode($payload));
                return ['success' => true, 'data' => ['token' => $token]];
            } else {
                return ['success' => false, 'error' => 'Credenciais inválidas.'];
            }
        }

        public function validateToken(string $token): array {
            try {
                $decoded_token = json_decode(base64_decode($token), true);

                if (!$decoded_token || !isset($decoded_token['exp']) || $decoded_token['exp'] <= time()) {
                    return ['success' => false, 'error' => 'Token inválido ou expirado.'];
                }
                return ['success' => true, 'data' => ['user' => $decoded_token]];
            } catch (Exception $e) {
                error_log("Erro ao decodificar token: " . $e->getMessage());
                return ['success' => false, 'error' => 'Token malformado.'];
            }
        }
    }
    