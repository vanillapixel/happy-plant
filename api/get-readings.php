<?php
header('Content-Type: application/json');

session_start();
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$dbFile = '../data/plants.sqlite';

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
            fertility INTEGER,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER
        )
    ");

    // Ensure user_id column exists for older DBs
    try {
        $cols = $db->query('PRAGMA table_info(readings)')->fetchAll(PDO::FETCH_ASSOC);
        $hasUser = false;
        $hasUserPlant = false;
        $hasFertility = false;
        foreach ($cols as $c) {
            if (strcasecmp($c['name'], 'user_id') === 0) { $hasUser = true; }
            if (strcasecmp($c['name'], 'user_plant_id') === 0) { $hasUserPlant = true; }
            if (strcasecmp($c['name'], 'fertility') === 0) { $hasFertility = true; }
        }
        if (!$hasUser) { $db->exec('ALTER TABLE readings ADD COLUMN user_id INTEGER'); }
        if (!$hasUserPlant) { $db->exec('ALTER TABLE readings ADD COLUMN user_plant_id INTEGER'); }
        if (!$hasFertility) { $db->exec('ALTER TABLE readings ADD COLUMN fertility INTEGER'); }
    } catch (Throwable $e) { /* ignore */ }

    // Filters: prefer user_plant_id; fallback to plant name for legacy
    $userPlantId = isset($_GET['user_plant_id']) ? intval($_GET['user_plant_id']) : null;
    $plant = $_GET['plant'] ?? null;
    if ($userPlantId) {
        // Verify the user_plant belongs to the current user and get its label for legacy rows
        $label = null;
        $belongs = false;
        try {
            $st2 = $db->prepare('SELECT label FROM user_plants WHERE id = :id AND user_id = :uid');
            $st2->execute([':id' => $userPlantId, ':uid' => $_SESSION['user_id']]);
            $row = $st2->fetch(PDO::FETCH_ASSOC);
            if ($row) { $belongs = true; $label = $row['label'] ?? null; }
        } catch (Throwable $e) { /* ignore */ }

        if (!$belongs) {
            echo json_encode([]);
            exit;
        }

        if ($label !== null && $label !== '') {
            $stmt = $db->prepare("SELECT * FROM readings WHERE user_id = :uid AND (user_plant_id = :upid OR plant = :label) ORDER BY date DESC");
            $stmt->bindValue(':upid', $userPlantId, PDO::PARAM_INT);
            $stmt->bindValue(':label', $label, PDO::PARAM_STR);
        } else {
            $stmt = $db->prepare("SELECT * FROM readings WHERE user_id = :uid AND user_plant_id = :upid ORDER BY date DESC");
            $stmt->bindValue(':upid', $userPlantId, PDO::PARAM_INT);
        }
    } else if ($plant) {
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
