<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

try {
    // Initialize main DB and species DB schemas
    $pdo = hp_db();
    $sdb = hp_species_db();

    // Seed species if empty
    $count = 0;
    try {
        $row = $sdb->query('SELECT COUNT(*) AS c FROM species')->fetch();
        $count = (int)($row['c'] ?? 0);
    } catch (Throwable $e) { $count = 0; }

    if ($count === 0) {
        $seed = [
            ['Basil', 'Ocimum basilicum', 6.0, 7.0, 60, 75],
            ['Sage', 'Salvia officinalis', 6.0, 7.0, 40, 55],
            ['Cherry Tomatoes', 'Solanum lycopersicum var. cerasiforme', 6.0, 6.5, 60, 80],
            ['Cat Grass', 'Avena sativa (or Hordeum vulgare, Triticum aestivum)', 6.0, 7.0, 65, 85],
            ['Mint', 'Mentha spp.', 6.0, 7.0, 70, 85],
            ['Thyme', 'Thymus vulgaris', 6.0, 8.0, 30, 50]
        ];
        $stmt = $sdb->prepare('INSERT INTO species (common_name, scientific_name, ph_min, ph_max, soil_moisture_morning, soil_moisture_night) VALUES (?, ?, ?, ?, ?, ?)');
        foreach ($seed as $s) { $stmt->execute($s); }
    }

    echo json_encode(['status' => 'success', 'message' => 'Migration completed']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
