<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';
session_start();

try {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['identifier'], $data['password'])) {
        echo json_encode(['status' => 'error', 'message' => 'Missing identifier or password']);
        exit;
    }

    $identifier = trim($data['identifier']);
    $password = $data['password'];

    $pdo = hp_db();

    // Minimal bootstrap for dev: ensure users table exists (migration recommended)
    $pdo->exec('CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE,
        password TEXT NOT NULL,
        city TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )');

    // Try email first, then username
    $stmt = $pdo->prepare('SELECT id, email, username, password, city FROM users WHERE lower(email) = lower(?) OR username = ? LIMIT 1');
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password'])) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid credentials']);
        exit;
    }

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['email'] = $user['email'] ?? null;
    $_SESSION['username'] = $user['username'] ?? null;
    $_SESSION['city'] = $user['city'] ?? null;

    echo json_encode(['status' => 'success', 'email' => $user['email'], 'username' => $user['username'], 'city' => $user['city'] ?? null]);
} catch (Throwable $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
