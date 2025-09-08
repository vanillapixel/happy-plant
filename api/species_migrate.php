<?php
// Create separate species DB and seed top N species
header('Content-Type: application/json');
try {
    $dbPath = __DIR__ . '/../data/species.sqlite';
    if (!is_dir(dirname($dbPath))) mkdir(dirname($dbPath), 0777, true);
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec('CREATE TABLE IF NOT EXISTS species (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        common_name TEXT NOT NULL,
        scientific_name TEXT,
        ph_min REAL,
        ph_max REAL,
        soil_moisture_morning INTEGER,
        soil_moisture_night INTEGER
    )');

    // Seed data (placeholder minimal set; expand to top 100 as needed)
    $count = (int)$pdo->query('SELECT COUNT(*) AS c FROM species')->fetch(PDO::FETCH_ASSOC)['c'];
    // Base seed list (English common names)
    $seed = [
        ['Basil', 'Ocimum basilicum', 6.0, 7.0, 60, 75],
        ['Sage', 'Salvia officinalis', 6.0, 7.0, 40, 55],
        ['Cherry Tomatoes', 'Solanum lycopersicum var. cerasiforme', 6.0, 6.5, 60, 80],
        ['Cat Grass', 'Avena sativa (or Hordeum vulgare, Triticum aestivum)', 6.0, 7.0, 65, 85],
        ['Mint', 'Mentha spp.', 6.0, 7.0, 70, 85],
        ['Thyme', 'Thymus vulgaris', 6.0, 8.0, 30, 50],
        // Newly requested species
        ['Jasmine', 'Jasminum spp.', 5.5, 7.5, 50, 65],
        ['Aloe Vera', 'Aloe barbadensis miller', 7.0, 8.5, 20, 30],
        ['Dipladenia', 'Mandevilla sanderi (Dipladenia)', 5.5, 6.5, 55, 70],
        ['Asparagus Fern', 'Asparagus setaceus (syn. plumosus)', 5.5, 6.5, 70, 85],
        ['Geranium', 'Pelargonium spp.', 6.0, 6.5, 45, 60],
    ];

    // Insert only missing species (idempotent migration)
    $checkStmt = $pdo->prepare('SELECT 1 FROM species WHERE lower(common_name) = lower(?) LIMIT 1');
    $insertStmt = $pdo->prepare('INSERT INTO species (common_name, scientific_name, ph_min, ph_max, soil_moisture_morning, soil_moisture_night) VALUES (?, ?, ?, ?, ?, ?)');
    foreach ($seed as $s) {
        $checkStmt->execute([$s[0]]);
        if (!$checkStmt->fetch()) {
            $insertStmt->execute($s);
        }
    }

    echo json_encode(['status'=>'success','message'=>'Species DB migrated']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>$e->getMessage()]);
}
