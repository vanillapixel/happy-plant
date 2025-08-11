<?php
header('Content-Type: application/json');

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
        date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )");

    $stmt = $pdo->prepare("INSERT INTO readings (plant, ph, moisture) VALUES (?, ?, ?)");
    $stmt->execute([$data['plant'], $data['ph'], $data['moisture']]);

    echo json_encode(['status' => 'success']);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
