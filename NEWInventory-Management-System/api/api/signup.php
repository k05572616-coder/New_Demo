<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Method not allowed.'], 405);
}

// Get posted data
$name     = trim($_POST['name'] ?? '');
$email    = trim($_POST['email'] ?? '');
$password = trim($_POST['password'] ?? '');

// Validate inputs
if (empty($name) || empty($email) || empty($password)) {
    respond(['success' => false, 'message' => 'All fields are required.']);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(['success' => false, 'message' => 'Invalid email address.']);
}

if (strlen($password) < 6) {
    respond(['success' => false, 'message' => 'Password must be at least 6 characters.']);
}

// Check if email already exists
$check = $conn->prepare("SELECT id FROM users WHERE email = ?");
$check->bind_param("s", $email);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    respond(['success' => false, 'message' => 'An account with this email already exists.']);
}
$check->close();

// Hash password and insert user
$hashed = password_hash($password, PASSWORD_DEFAULT);

$stmt = $conn->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $name, $email, $hashed);

if ($stmt->execute()) {
    respond(['success' => true, 'message' => 'Account created! You can now log in.']);
} else {
    respond(['success' => false, 'message' => 'Registration failed. Please try again.'], 500);
}
?>
