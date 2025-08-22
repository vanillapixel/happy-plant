<?php
declare(strict_types=1);

// Central DB helpers for Happy Plant (development-friendly)

function hp_root_dir(): string {
    return dirname(__DIR__); // project root
}

function hp_data_dir(): string {
    return hp_root_dir() . '/data';
}

function hp_ensure_dir(string $dir): void {
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }
}

function hp_open_sqlite(string $path): PDO {
    // Ensure file exists and is writable for dev
    if (!file_exists($path)) {
        @touch($path);
        @chmod($path, 0666);
    }
    $pdo = new PDO('sqlite:' . $path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    // Dev-friendly pragmas
    try { $pdo->exec('PRAGMA journal_mode=WAL;'); } catch (Throwable $e) {}
    try { $pdo->exec('PRAGMA busy_timeout=5000;'); } catch (Throwable $e) {}
    return $pdo;
}

function hp_init_main_schema(PDO $pdo): void {
    // Users (with city)
    $pdo->exec('CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE,
        password TEXT NOT NULL,
        city TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )');

    // User plants
    $pdo->exec('CREATE TABLE IF NOT EXISTS user_plants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        species_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )');

    // Readings (keep plant column for legacy compatibility)
    $pdo->exec('CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plant TEXT NOT NULL,
        ph REAL,
        moisture INTEGER,
        date TEXT DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER,
        user_plant_id INTEGER
    )');
}

function hp_init_species_schema(PDO $pdo): void {
    $pdo->exec('CREATE TABLE IF NOT EXISTS species (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        common_name TEXT NOT NULL,
        scientific_name TEXT,
        ph_min REAL,
        ph_max REAL,
        soil_moisture_morning INTEGER,
        soil_moisture_night INTEGER
    )');
}

function hp_db(): PDO {
    $dir = hp_data_dir();
    hp_ensure_dir($dir);
    $pdo = hp_open_sqlite($dir . '/plants.sqlite');
    hp_init_main_schema($pdo);
    return $pdo;
}

function hp_species_db(): PDO {
    $dir = hp_data_dir();
    hp_ensure_dir($dir);
    $pdo = hp_open_sqlite($dir . '/species.sqlite');
    hp_init_species_schema($pdo);
    return $pdo;
}
