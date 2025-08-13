<?php
header('Content-Type: application/json');
session_start();

try {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['identifier'], $data['password'])) {
        echo json_encode(['status' => 'error', 'message' => 'Missing identifier or password']);
        exit;
    }

    $identifier = trim($data['identifier']);
    $password = $data['password'];

    $path = __DIR__ . '/../plants.sqlite';
    $pdo = new PDO("sqlite:$path");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Try email first, then username
    $stmt = $pdo->prepare('SELECT id, email, username, password FROM users WHERE lower(email) = lower(?) OR username = ? LIMIT 1');
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password'])) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid credentials']);
        exit;
    }

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['email'] = $user['email'] ?? null;
    $_SESSION['username'] = $user['username'] ?? null;

    echo json_encode(['status' => 'success', 'email' => $user['email'], 'username' => $user['username']]);
} catch (Throwable $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
