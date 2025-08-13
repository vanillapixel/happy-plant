<?php
header('Content-Type: application/json');

session_start();
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$dbFile = '../plants.sqlite';

if (!file_exists($dbFile)) {
    // DB file missing, return empty array
    echo json_encode([]);
    exit;
}

try {
    $db = new PDO("sqlite:$dbFile");
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Ensure the table exists
    $db->exec("
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plant TEXT NOT NULL,
            ph REAL,
            moisture INTEGER,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER
        )
    ");

    // Ensure user_id column exists for older DBs
    try {
        $cols = $db->query('PRAGMA table_info(readings)')->fetchAll(PDO::FETCH_ASSOC);
        $hasUser = false;
        foreach ($cols as $c) { if (strcasecmp($c['name'], 'user_id') === 0) { $hasUser = true; break; } }
        if (!$hasUser) {
            $db->exec('ALTER TABLE readings ADD COLUMN user_id INTEGER');
        }
    } catch (Throwable $e) { /* ignore */ }

    // Filter readings by plant
    $plant = $_GET['plant'] ?? null;
    if ($plant) {
        $stmt = $db->prepare("SELECT * FROM readings WHERE user_id = :uid AND plant = :plant ORDER BY date DESC");
        $stmt->bindValue(':plant', $plant, PDO::PARAM_STR);
    } else {
        $stmt = $db->prepare("SELECT * FROM readings WHERE user_id = :uid ORDER BY date DESC");
    }
    $stmt->bindValue(':uid', $_SESSION['user_id'], PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($rows);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
