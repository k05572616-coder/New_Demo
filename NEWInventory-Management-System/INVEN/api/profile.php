<?php
// =====================================================
// BlueVault IMS — Profile API
//
// GET  → return current user's profile data
// POST → update name, email, company, role
// =====================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

$user_id = requireLogin();
$method  = $_SERVER['REQUEST_METHOD'];

// Load profile data
if ($method === 'GET') {
    $stmt = $conn->prepare(
        "SELECT name, email, company, role, profile_pic FROM users WHERE id = ?"
    );
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user   = $result->fetch_assoc();

    if (!$user) {
        respond(['success' => false, 'message' => 'User not found.'], 404);
    }

    respond(['success' => true, 'data' => $user]);
}

// Save profile changes
if ($method === 'POST') {
    $name    = trim($_POST['name'] ?? '');
    $email   = trim($_POST['email'] ?? '');
    $company = trim($_POST['company'] ?? '');
    $role    = trim($_POST['role'] ?? '');

    if (empty($name) || empty($email)) {
        respond(['success' => false, 'message' => 'Name and email are required.']);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(['success' => false, 'message' => 'Invalid email address.']);
    }

    // Check if email is taken by another user
    $check = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
    $check->bind_param("si", $email, $user_id);
    $check->execute();
    $check->store_result();
    if ($check->num_rows > 0) {
        respond(['success' => false, 'message' => 'That email is already in use.']);
    }
    $check->close();

    $stmt = $conn->prepare(
        "UPDATE users SET name = ?, email = ?, company = ?, role = ? WHERE id = ?"
    );
    $stmt->bind_param("ssssi", $name, $email, $company, $role, $user_id);

    if ($stmt->execute()) {
        // Update session too
        $_SESSION['user_name']    = $name;
        $_SESSION['user_email']   = $email;
        $_SESSION['user_company'] = $company;
        $_SESSION['user_role']    = $role;

        respond(['success' => true, 'message' => 'Profile updated successfully.']);
    } else {
        respond(['success' => false, 'message' => 'Update failed: ' . $conn->error], 500);
    }
}

respond(['success' => false, 'message' => 'Method not allowed.'], 405);
?>
