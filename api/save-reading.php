<?php
header('Content-Type: application/json');

session_start();
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['plant'], $data['ph'], $data['moisture'])) {
    echo json_encode(['status' => 'error', 'message' => 'Missing fields']);
    exit;
}

try {
    $path = __DIR__ . '/../plants.sqlite';
    $pdo = new PDO("sqlite:$path");
    if (!$pdo) {
        throw new Exception("Could not connect to the database.");
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plant TEXT NOT NULL,
        ph REAL NOT NULL,
        moisture INTEGER NOT NULL,
        date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER
    )");

    // Ensure user_id column exists for older DBs
    try {
        $cols = $pdo->query('PRAGMA table_info(readings)')->fetchAll(PDO::FETCH_ASSOC);
        $hasUser = false;
        foreach ($cols as $c) { if (strcasecmp($c['name'], 'user_id') === 0) { $hasUser = true; break; } }
        if (!$hasUser) {
            $pdo->exec('ALTER TABLE readings ADD COLUMN user_id INTEGER');
        }
    } catch (Throwable $e) { /* ignore */ }

    $stmt = $pdo->prepare("INSERT INTO readings (plant, ph, moisture, user_id) VALUES (?, ?, ?, ?)");
    $stmt->execute([$data['plant'], $data['ph'], $data['moisture'], $_SESSION['user_id']]);

    echo json_encode(['status' => 'success']);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
