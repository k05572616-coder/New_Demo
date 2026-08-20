<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

// Require login for all inventory operations
$user_id = requireLogin();

$method = $_SERVER['REQUEST_METHOD'];

// List inventory items for THIS user only
if ($method === 'GET') {
    $stmt = $conn->prepare(
        "SELECT id, product_name, category, quantity, unit_price
         FROM inventory
         WHERE created_by = ?
         ORDER BY id ASC"
    );
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $items = [];
    while ($row = $result->fetch_assoc()) {
        $row['total_value'] = round($row['quantity'] * $row['unit_price'], 2);

        if ((int)$row['quantity'] === 0) {
            $row['stock_status'] = 'Out of Stock';
        } elseif ((int)$row['quantity'] <= 20) {
            $row['stock_status'] = 'Low Stock';
        } else {
            $row['stock_status'] = 'In Stock';
        }

        $items[] = $row;
    }

    respond(['success' => true, 'data' => $items]);
}

// Add / Edit / Delete
if ($method === 'POST') {
    $action = trim($_POST['action'] ?? '');

    // ADD
    if ($action === 'add') {
        $name     = trim($_POST['product_name'] ?? '');
        $category = trim($_POST['category'] ?? '');
        $qty      = intval($_POST['quantity'] ?? 0);
        $price    = floatval($_POST['unit_price'] ?? 0);

        if (empty($name) || empty($category)) {
            respond(['success' => false, 'message' => 'Name and category are required.']);
        }

        $stmt = $conn->prepare(
            "INSERT INTO inventory (product_name, category, quantity, unit_price, created_by)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("ssidi", $name, $category, $qty, $price, $user_id);

        if ($stmt->execute()) {
            $new_id = $conn->insert_id;
            respond(['success' => true, 'message' => 'Item added.', 'id' => $new_id]);
        } else {
            respond(['success' => false, 'message' => 'Failed to add item: ' . $conn->error], 500);
        }
    }

    // EDIT
    elseif ($action === 'edit') {
        $id       = intval($_POST['id'] ?? 0);
        $name     = trim($_POST['product_name'] ?? '');
        $category = trim($_POST['category'] ?? '');
        $qty      = intval($_POST['quantity'] ?? 0);
        $price    = floatval($_POST['unit_price'] ?? 0);

        if ($id <= 0 || empty($name) || empty($category)) {
            respond(['success' => false, 'message' => 'Invalid data provided.']);
        }

        // Only update if this item belongs to the logged-in user
        $stmt = $conn->prepare(
            "UPDATE inventory
             SET product_name = ?, category = ?, quantity = ?, unit_price = ?
             WHERE id = ? AND created_by = ?"
        );
        $stmt->bind_param("ssidii", $name, $category, $qty, $price, $id, $user_id);

        if ($stmt->execute() && $stmt->affected_rows > 0) {
            respond(['success' => true, 'message' => 'Item updated.']);
        } else {
            respond(['success' => false, 'message' => 'Item not found or not yours.']);
        }
    }

    // DELETE
    elseif ($action === 'delete') {
        $id = intval($_POST['id'] ?? 0);

        if ($id <= 0) {
            respond(['success' => false, 'message' => 'Invalid ID.']);
        }

        // Only delete if this item belongs to the logged-in user
        $stmt = $conn->prepare(
            "DELETE FROM inventory WHERE id = ? AND created_by = ?"
        );
        $stmt->bind_param("ii", $id, $user_id);

        if ($stmt->execute() && $stmt->affected_rows > 0) {
            respond(['success' => true, 'message' => 'Item deleted.']);
        } else {
            respond(['success' => false, 'message' => 'Item not found or not yours.']);
        }
    }

    else {
        respond(['success' => false, 'message' => 'Unknown action.'], 400);
    }
}

respond(['success' => false, 'message' => 'Method not allowed.'], 405);
?>
