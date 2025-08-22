<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['email'], $data['username'], $data['password'])) {
        echo json_encode(['status' => 'error', 'message' => 'Missing email, username or password']);
        exit;
    }

    $email = strtolower(trim($data['email']));
    $username = trim($data['username']);
    $password = $data['password'];
    $city = isset($data['city']) ? trim($data['city']) : '';
    if ($city === '') { $city = 'Utrecht'; }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid email']);
        exit;
    }
    if (!preg_match('/^[A-Za-z0-9_]{3,30}$/', $username)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid username (3-30 chars, letters/numbers/underscore)']);
        exit;
    }
    if (strlen($password) < 8) {
        echo json_encode(['status' => 'error', 'message' => 'Password must be at least 8 characters']);
        exit;
    }

    $pdo = hp_db();

    // Schema assumed to be managed via migration in development environment

    // Uniqueness checks
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1');
    $stmt->execute([$email, $username]);
    if ($stmt->fetch()) {
        echo json_encode(['status' => 'error', 'message' => 'Email or username already registered']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO users (email, username, password, city) VALUES (?, ?, ?, ?)');
    $stmt->execute([$email, $username, $hash, $city]);

    echo json_encode(['status' => 'success']);
} catch (Throwable $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
