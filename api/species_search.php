<?php
header('Content-Type: application/json');
session_start();
if (!isset($_SESSION['user_id'])) { http_response_code(401); echo json_encode(['status'=>'error','message'=>'Unauthorized']); exit; }
try {
    $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
    if (mb_strlen($q) < 2) { echo json_encode([]); exit; }
    $pdo = new PDO('sqlite:' . (__DIR__ . '/../data/species.sqlite'));
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $pdo->prepare('SELECT id, common_name, scientific_name, ph_min, ph_max, soil_moisture_morning, soil_moisture_night FROM species WHERE common_name LIKE :q OR scientific_name LIKE :q ORDER BY common_name LIMIT 50');
    $stmt->execute([':q' => '%' . $q . '%']);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>$e->getMessage()]);
}
