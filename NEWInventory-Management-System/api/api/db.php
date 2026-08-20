<?php


define('DB_HOST', 'localhost');
define('DB_USER', 'root');       
define('DB_PASS', '');           
define('DB_NAME', 'bluevault_db');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

$conn->set_charset('utf8mb4');

function respond($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

function requireLogin() {
    if (!isset($_SESSION['user_id'])) {
        respond(['success' => false, 'message' => 'Not logged in.'], 401);
    }
    return $_SESSION['user_id'];
}
?>
