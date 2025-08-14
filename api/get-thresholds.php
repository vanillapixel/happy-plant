<?php
header('Content-Type: application/json');
session_start();
if (!isset($_SESSION['user_id'])) { http_response_code(401); echo json_encode(['status'=>'error','message'=>'Unauthorized']); exit; }

try {
    // Inputs: either user_plant_id (preferred) or species_id
    $userPlantId = isset($_GET['user_plant_id']) ? (int)$_GET['user_plant_id'] : 0;
    $speciesId = isset($_GET['species_id']) ? (int)$_GET['species_id'] : 0;

    if ($userPlantId <= 0 && $speciesId <= 0) {
        http_response_code(400);
        echo json_encode(['status'=>'error','message'=>'Missing user_plant_id or species_id']);
        exit;
    }

    if ($userPlantId > 0) {
        $db = new PDO('sqlite:../data/plants.sqlite');
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        // Resolve species_id for this user_plant and ensure it belongs to the user
        $stmt = $db->prepare('SELECT species_id FROM user_plants WHERE id = :id AND user_id = :uid');
        $stmt->execute([':id' => $userPlantId, ':uid' => $_SESSION['user_id']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            echo json_encode(['status'=>'error','message'=>'User plant not found']);
            exit;
        }
        $speciesId = (int)$row['species_id'];
    }

    // Fetch thresholds from species DB
    $sdb = new PDO('sqlite:' . (__DIR__ . '/../data/species.sqlite'));
    $sdb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $sdb->prepare('SELECT id, common_name, scientific_name, ph_min, ph_max, soil_moisture_morning, soil_moisture_night FROM species WHERE id = :sid');
    $stmt->execute([':sid' => $speciesId]);
    $spec = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$spec) {
        http_response_code(404);
        echo json_encode(['status'=>'error','message'=>'Species not found']);
        exit;
    }

    $out = [
        'status' => 'success',
        'species_id' => (int)$spec['id'],
        'common_name' => $spec['common_name'],
        'scientific_name' => $spec['scientific_name'],
        'thresholds' => [
            'ph_min' => isset($spec['ph_min']) ? (float)$spec['ph_min'] : null,
            'ph_max' => isset($spec['ph_max']) ? (float)$spec['ph_max'] : null,
            'moisture_morning' => isset($spec['soil_moisture_morning']) ? (int)$spec['soil_moisture_morning'] : null,
            'moisture_night' => isset($spec['soil_moisture_night']) ? (int)$spec['soil_moisture_night'] : null,
        ]
    ];
    echo json_encode($out);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>$e->getMessage()]);
}
