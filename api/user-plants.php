<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';
session_start();
if (!isset($_SESSION['user_id'])) { http_response_code(401); echo json_encode(['status'=>'error','message'=>'Unauthorized']); exit; }

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
try {
    $db = hp_db();

    if ($method === 'GET') {
        // fetch user plants from main DB
        $stmt = $db->prepare('SELECT id, label, species_id FROM user_plants WHERE user_id = :uid ORDER BY label');
        $stmt->bindValue(':uid', $_SESSION['user_id'], PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // map species names from species DB
    $sdb = hp_species_db();
        $out = [];
        foreach ($rows as $r) {
            $name = null; $sid = (int)$r['species_id'];
            try { $n = $sdb->query('SELECT common_name FROM species WHERE id = ' . $sid)->fetch(PDO::FETCH_ASSOC); $name = $n ? $n['common_name'] : null; } catch (Throwable $e) {}
            $out[] = ['id'=>(int)$r['id'], 'label'=>$r['label'], 'species'=>$name, 'species_id'=>$sid];
        }
        echo json_encode($out);
        exit;
    }

    $payload = json_decode(file_get_contents('php://input'), true) ?? [];

    if ($method === 'POST') {
        if (!isset($payload['species_id'], $payload['label'])) { echo json_encode(['status'=>'error','message'=>'Missing fields']); exit; }
        $stmt = $db->prepare('INSERT INTO user_plants (user_id, species_id, label) VALUES (:uid, :sid, :label)');
        $stmt->execute([':uid'=>$_SESSION['user_id'], ':sid'=>$payload['species_id'], ':label'=>$payload['label']]);
        $id = $db->lastInsertId();
        echo json_encode(['status'=>'success', 'id' => (int)$id]);
        exit;
    }

    if ($method === 'DELETE') {
        parse_str($_SERVER['QUERY_STRING'] ?? '', $q);
        $id = isset($q['id']) ? (int)$q['id'] : 0;
        if ($id <= 0) { echo json_encode(['status'=>'error','message'=>'Missing id']); exit; }
        $stmt = $db->prepare('DELETE FROM user_plants WHERE id = :id AND user_id = :uid');
        $stmt->execute([':id'=>$id, ':uid'=>$_SESSION['user_id']]);
        echo json_encode(['status'=>'success']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['status'=>'error','message'=>'Method not allowed']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>$e->getMessage()]);
}
