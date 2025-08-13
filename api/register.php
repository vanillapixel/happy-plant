<?php
header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['email'], $data['username'], $data['password'])) {
        echo json_encode(['status' => 'error', 'message' => 'Missing email, username or password']);
        exit;
    }

    $email = strtolower(trim($data['email']));
    $username = trim($data['username']);
    $password = $data['password'];
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

    $path = __DIR__ . '/../plants.sqlite';
    $pdo = new PDO("sqlite:$path");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE,
        password TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )');

    // Ensure username column exists for older DBs
    try {
        $cols = $pdo->query('PRAGMA table_info(users)')->fetchAll(PDO::FETCH_ASSOC);
        $hasUsername = false;
        foreach ($cols as $c) {
            if (strcasecmp($c['name'], 'username') === 0) { $hasUsername = true; break; }
        }
        if (!$hasUsername) {
            $pdo->exec('ALTER TABLE users ADD COLUMN username TEXT UNIQUE');
        }
    } catch (Throwable $e) { /* ignore */ }

    // Uniqueness checks
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1');
    $stmt->execute([$email, $username]);
    if ($stmt->fetch()) {
        echo json_encode(['status' => 'error', 'message' => 'Email or username already registered']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO users (email, username, password) VALUES (?, ?, ?)');
    $stmt->execute([$email, $username, $hash]);

    echo json_encode(['status' => 'success']);
} catch (Throwable $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
