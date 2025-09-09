<?php
// Development migration: ensure required tables exist with current schema
header('Content-Type: application/json');

try {
    $dbPath = __DIR__ . '/../data/plants.sqlite';
    if (!is_dir(dirname($dbPath))) mkdir(dirname($dbPath), 0777, true);
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Create base tables (old installs will just keep existing data)
    $pdo->exec('CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE,
        password TEXT NOT NULL,
        city TEXT,                    -- new (older DBs may lack this; added below if missing)
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )');

    $pdo->exec("CREATE TABLE IF NOT EXISTS user_plants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        species_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plant TEXT NOT NULL,
        ph REAL,
        moisture INTEGER,
        fertility INTEGER,            -- new (older DBs may lack this; added below if missing)
        date TEXT DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER,
        user_plant_id INTEGER
    )");

    // Helper to check column existence
    function ensureColumn(PDO $pdo, $table, $column, $definition) {
        $stmt = $pdo->query("PRAGMA table_info($table)");
        $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($cols as $c) {
            if (strcasecmp($c['name'], $column) === 0) return false; // already exists
        }
        $pdo->exec("ALTER TABLE $table ADD COLUMN $column $definition");
        return true;
    }

    $added = [];
    if (ensureColumn($pdo, 'users', 'city', 'TEXT')) {
        $added[] = 'users.city';
    }
    if (ensureColumn($pdo, 'readings', 'fertility', 'INTEGER')) {
        $added[] = 'readings.fertility';
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Migration completed',
        'added_columns' => $added
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
