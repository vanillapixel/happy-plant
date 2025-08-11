<?php
header('Content-Type: application/json');

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
            date TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $stmt = $db->query("SELECT * FROM readings ORDER BY date DESC");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($rows);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
