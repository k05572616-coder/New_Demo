<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Method not allowed.'], 405);
}

// Get posted data
$email    = trim($_POST['email'] ?? '');
$password = trim($_POST['password'] ?? '');

// Validate inputs
if (empty($email) || empty($password)) {
    respond(['success' => false, 'message' => 'Email and password are required.']);
}

// Find user by email
$stmt = $conn->prepare("SELECT id, name, email, password, company, role, profile_pic FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    respond(['success' => false, 'message' => 'Invalid email or password.']);
}

$user = $result->fetch_assoc();

// Verify password
if (!password_verify($password, $user['password'])) {
    respond(['success' => false, 'message' => 'Invalid email or password.']);
}

// Set session
$_SESSION['user_id']     = $user['id'];
$_SESSION['user_name']   = $user['name'];
$_SESSION['user_email']  = $user['email'];
$_SESSION['user_role']   = $user['role'];
$_SESSION['user_company']= $user['company'];

respond([
    'success'     => true,
    'message'     => 'Login successful.',
    'name'        => $user['name'],
    'email'       => $user['email'],
    'company'     => $user['company'],
    'role'        => $user['role'],
    'profile_pic' => $user['profile_pic']
]);
?>
