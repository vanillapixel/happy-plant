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
    echo json_encode([]);
    exit;
}
try {
    $db = new PDO("sqlite:$dbFile");
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // ensure table exists
    $db->exec("CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plant TEXT NOT NULL,
        ph REAL,
        moisture INTEGER,
        date TEXT DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER
    )");

    $stmt = $db->prepare('SELECT DISTINCT plant FROM readings WHERE user_id = :uid ORDER BY plant');
    $stmt->bindValue(':uid', $_SESSION['user_id'], PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo json_encode($rows);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
