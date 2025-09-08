<?php
header('Content-Type: application/json');
session_start();
if (isset($_SESSION['user_id'])) {
    echo json_encode(['authenticated' => true, 'email' => $_SESSION['email'] ?? null, 'username' => $_SESSION['username'] ?? null, 'city' => $_SESSION['city'] ?? null]);
} else {
    echo json_encode(['authenticated' => false]);
}
