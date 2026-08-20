<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

$user_id = requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Method not allowed.'], 405);
}

if (!isset($_FILES['profile_pic']) || $_FILES['profile_pic']['error'] !== UPLOAD_ERR_OK) {
    respond(['success' => false, 'message' => 'No file uploaded or upload error.']);
}

$file     = $_FILES['profile_pic'];
$allowed  = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$maxSize  = 5 * 1024 * 1024; // 5 MB

// Validate type
if (!in_array($file['type'], $allowed)) {
    respond(['success' => false, 'message' => 'Only JPG, PNG, GIF, and WebP images are allowed.']);
}

// Validate size
if ($file['size'] > $maxSize) {
    respond(['success' => false, 'message' => 'File too large. Max size is 5 MB.']);
}

// Build upload path — one folder up from api/
$uploadDir = dirname(__DIR__) . '/uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Unique filename
$ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = 'pfp_' . $user_id . '_' . time() . '.' . strtolower($ext);
$destPath = $uploadDir . $filename;
$webPath  = 'uploads/' . $filename; // relative path used in <img src>

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    respond(['success' => false, 'message' => 'Failed to save file.'], 500);
}

// Update DB
$stmt = $conn->prepare("UPDATE users SET profile_pic = ? WHERE id = ?");
$stmt->bind_param("si", $webPath, $user_id);

if ($stmt->execute()) {
    respond(['success' => true, 'message' => 'Profile picture updated.', 'path' => $webPath]);
} else {
    respond(['success' => false, 'message' => 'DB update failed.'], 500);
}
?>
