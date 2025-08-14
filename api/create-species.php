<?php
header('Content-Type: application/json');
session_start();
if (!isset($_SESSION['user_id'])) { http_response_code(401); echo json_encode(['status'=>'error','message'=>'Unauthorized']); exit; }

try {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $name = isset($input['name']) ? trim((string)$input['name']) : '';
    $ph_low = isset($input['ph_low']) ? (float)$input['ph_low'] : null;
    $ph_high = isset($input['ph_high']) ? (float)$input['ph_high'] : null;
    $moisture_day = isset($input['moisture_day']) ? (int)$input['moisture_day'] : null;
    $moisture_night = isset($input['moisture_night']) ? (int)$input['moisture_night'] : null;

    if ($name === '') { echo json_encode(['status'=>'error','message'=>'Name required']); exit; }

    $db = new PDO('sqlite:../data/plants.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Ensure table exists
    $db->exec("CREATE TABLE IF NOT EXISTS species (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        ph_low REAL,
        ph_high REAL,
        moisture_day INTEGER,
        moisture_night INTEGER
    )");

    // If species exists (case-insensitive), return its id
    $stmt = $db->prepare('SELECT id FROM species WHERE LOWER(name) = LOWER(:name) LIMIT 1');
    $stmt->execute([':name' => $name]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && isset($row['id'])) {
        echo json_encode(['status'=>'success','id'=>(int)$row['id'], 'existing'=>true]);
        exit;
    }

    $stmt = $db->prepare('INSERT INTO species (name, ph_low, ph_high, moisture_day, moisture_night) VALUES (:name, :pl, :ph, :md, :mn)');
    $stmt->execute([
        ':name' => $name,
        ':pl' => $ph_low,
        ':ph' => $ph_high,
        ':md' => $moisture_day,
        ':mn' => $moisture_night
    ]);
    $id = (int)$db->lastInsertId();

    echo json_encode(['status'=>'success','id'=>$id]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>$e->getMessage()]);
}
