<?php
// Development migration: ensure required tables exist with current schema
header('Content-Type: application/json');

try {
    $dbPath = __DIR__ . '/../data/plants.sqlite';
    if (!is_dir(dirname($dbPath))) mkdir(dirname($dbPath), 0777, true);
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Users with city
    $pdo->exec('CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE,
        password TEXT NOT NULL,
        city TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )');

    // User plants
    $pdo->exec("CREATE TABLE IF NOT EXISTS user_plants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        species_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )");

    // Readings (includes user_plant_id for new model)
    $pdo->exec("CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plant TEXT NOT NULL,
        ph REAL,
        moisture INTEGER,
        date TEXT DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER,
        user_plant_id INTEGER
    )");

    echo json_encode(['status' => 'success', 'message' => 'Migration completed']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
