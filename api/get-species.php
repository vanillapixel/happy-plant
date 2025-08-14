<?php
header('Content-Type: application/json');
session_start();
if (!isset($_SESSION['user_id'])) { http_response_code(401); echo json_encode(['status'=>'error','message'=>'Unauthorized']); exit; }
try {
    $db = new PDO('sqlite:../data/plants.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $rows = $db->query('SELECT id, name, ph_low, ph_high, moisture_day, moisture_night FROM species ORDER BY name')->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($rows);
} catch (Throwable $e) { echo json_encode(['status'=>'error','message'=>$e->getMessage()]); }
