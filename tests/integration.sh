#!/usr/bin/env bash
set -euo pipefail
BASE="http://localhost:8080"

# Requires the docker-compose stack running locally.
# 1) Register
EMAIL="test$(date +%s)@example.com"
USER="tester$(date +%s)"
CITY="Utrecht"
PASS="password123"

curl -fsS -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"username\":\"$USER\",\"password\":\"$PASS\",\"city\":\"$CITY\"}" "$BASE/api/register.php" | tee /dev/stderr

# 2) Login (store cookie)
COOKIE_JAR="$(mktemp)"
curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -H 'Content-Type: application/json' -d "{\"identifier\":\"$EMAIL\",\"password\":\"$PASS\"}" "$BASE/api/login.php" | tee /dev/stderr

# 3) Auth check
curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE/api/auth.php" | tee /dev/stderr

# 4) Species seed ensure
curl -fsS "$BASE/api/species_migrate.php" | tee /dev/stderr

# 5) Create a species by name (optional) – skipping, we rely on seeded

# 6) Create a user plant (first seeded species id 1)
curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -H 'Content-Type: application/json' -d '{"species_id":1, "label":"Basil by window"}' "$BASE/api/user-plants.php" | tee /dev/stderr

# 7) List user plants
curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE/api/user-plants.php" | tee /dev/stderr

# 8) Save a reading for that plant id (grab first plant id)
PLANT_ID=$(curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE/api/user-plants.php" | jq -r '.[0].id')
[ -n "$PLANT_ID" ]
curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -H 'Content-Type: application/json' -d "{\"user_plant_id\":$PLANT_ID,\"ph\":6.5,\"moisture\":70}" "$BASE/api/save-reading.php" | tee /dev/stderr

# 9) Get thresholds for that plant
curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE/api/get-thresholds.php?user_plant_id=$PLANT_ID" | tee /dev/stderr

# 10) Get readings for that plant
curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE/api/get-readings.php?user_plant_id=$PLANT_ID" | tee /dev/stderr

echo 'Integration smoke tests finished successfully.'
