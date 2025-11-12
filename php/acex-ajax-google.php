<?php
require_once __DIR__ . '/class-acex-history.php';
// --------------------------------------------------








// Register ADMIN actions
add_action('admin_post_actus_google_oauth_callback', 'actus_google_oauth_callback');




// Register AJAX actions
add_action( 'wp_ajax_acex_upload_xlsx_to_google', 'ajax_acex_upload_xlsx_to_google' );
add_action( 'wp_ajax_actus_google_drive_check', 'ajax_actus_google_drive_check');
add_action( 'wp_ajax_actus_google_disconnect', 'ajax_actus_google_disconnect');
add_action( 'wp_ajax_acex_load_google_sheet', 'ajax_acex_load_google_sheet');
add_action( 'wp_ajax_acex_delete_google_sheet', 'ajax_acex_delete_google_sheet');

add_action( 'wp_ajax_acex_aicall', 'ajax_acex_aicall');

add_action('wp_ajax_acex_save_history', 'ajax_acex_save_history');
add_action('wp_ajax_acex_get_history', 'ajax_acex_get_history');
add_action('wp_ajax_acex_delete_history', 'ajax_acex_delete_history');
add_action('wp_ajax_acex_get_history_stats', 'ajax_acex_get_history_stats');
add_action('wp_ajax_acex_update_history_google', 'ajax_acex_update_history_google');






// MARK: Google Auth
// ADMIN - Google OAuth callback
// coming back from Node.js server
// ----------------------------------------------------------
function actus_google_oauth_callback() {
    
    $callback_flag = 'acex_google_ready';
    if (isset($_GET['callback_flag'])) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $callback_flag = sanitize_text_field(wp_unslash($_GET['callback_flag'])); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
    }
	
    // Check if tokens exist
    if (!isset($_GET['access_token']) || !isset($_GET['refresh_token'])) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        //error_log('OAuth failed: Missing tokens');
        $_GET['error'] = 'missing_tokens';
        include __DIR__ . '/acex-google-callback.php';
        exit;
    }

    // Check if user is logged in
    $user_id = get_current_user_id();
    if (!$user_id) {
        //error_log('OAuth failed: User not logged in');
        $_GET['error'] = 'not_logged_in';
        include __DIR__ . '/acex-google-callback.php';
        exit;
    }

    // Save tokens to user meta
    update_user_meta($user_id, 'actus_google_access_token', sanitize_text_field(wp_unslash($_GET['access_token']))); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
    update_user_meta($user_id, 'actus_google_refresh_token', sanitize_text_field(wp_unslash($_GET['refresh_token']))); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
    
    // ADD: Store expiry time (typically 3600 seconds = 1 hour)
    $expires_in = isset($_GET['expires_in']) ? intval($_GET['expires_in']) : 3600; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
    $expires_at = time() + $expires_in;
    update_user_meta($user_id, 'actus_google_token_expires_at', $expires_at);

    // Include the callback page which will communicate with parent window
    include __DIR__ . '/acex-google-callback.php';
    exit;
}








// MARK: check Google Drive OAuth
// AJAX - check if user is connected to Google Drive
// ----------------------------------------------------------
function ajax_actus_google_drive_check() {
    acex_ajax_security();
	
	$access_token = get_user_meta(get_current_user_id(), 'actus_google_access_token', true);
    $refresh_token = get_user_meta(get_current_user_id(), 'actus_google_refresh_token', true);
    


    // Check if tokens exist
    if (empty($access_token)) {
        wp_send_json_error([
            'message' => 'No access token found',
            'status' => 'disconnected',
        ]);
    }

    // Verify token with Google API - get user info
    $response = wp_remote_get(
        'https://www.googleapis.com/drive/v3/about?fields=user',
        [
            'headers' => [
                'Authorization' => 'Bearer ' . $access_token,
            ],
            'timeout' => 15,
        ]
    );


    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => $response->get_error_message(),
            'status' => 'error'
        ]);
    }


	
    $status_code = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);
    

    // DEBUG: Log what we got
	/*
    error_log('------------------------------------------------');
    error_log('OAuth Check - Status Code: ' . $status_code);
    error_log('OAuth Check - Body: ' . print_r($body, true));
    error_log('OAuth Check - email: ' . ($body['user']['emailAddress'] ?? 'NO'));
    error_log('------------------------------------------------');
	*/

    // Token is valid
    if ($status_code === 200 && !empty($body['user']['emailAddress'])) {
        wp_send_json_success([
            'status' => 'connected',
            'email' => $body['user']['emailAddress'],
            'name' => isset($body['user']['displayName']) ? $body['user']['displayName'] : '',
            'picture' => isset($body['user']['photoLink']) ? $body['user']['photoLink'] : ''
        ]);
		wp_die();
    }
    
    // Token is invalid or expired
    if ($status_code === 401) {

        // Try to refresh the token
        $new_token = actus_google_refresh_token();

        if ($new_token) {
            // Retry the check with new token
            $response = wp_remote_get(
                'https://www.googleapis.com/drive/v3/about?fields=user',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $new_token,
                    ],
                    'timeout' => 15,
                ]
            );
            
            $status_code = wp_remote_retrieve_response_code($response);
            $body = json_decode(wp_remote_retrieve_body($response), true);
            
            if ($status_code === 200 && !empty($body['user']['emailAddress'])) {
                wp_send_json_success([
                    'status' => 'connected',
                    'email' => $body['user']['emailAddress'],
                    'name' => isset($body['user']['displayName']) ? $body['user']['displayName'] : '',
                    'picture' => isset($body['user']['photoLink']) ? $body['user']['photoLink'] : ''
                ]);
            }
        }

        // Clear invalid tokens
        delete_user_meta(get_current_user_id(), 'actus_google_access_token');
        delete_user_meta(get_current_user_id(), 'actus_google_refresh_token');
        
        wp_send_json_error([
            'message' => 'Token expired or invalid',
            'status' => 'disconnected'
        ]);
    }
    
    // Other error
    wp_send_json_error([
        'message' => isset($body['error']['message']) ? $body['error']['message'] : 'Unknown error',
        'status' => 'error',
        'status_code' => $status_code,
        //'body' => $body // Debug info
    ]);



}








// MARK: Disconnect Google Drive OAuth
// AJAX - disconnect from Google Drive
// ----------------------------------------------------------
function ajax_actus_google_disconnect() {
	
    acex_ajax_security();

    $access_token = get_user_meta(get_current_user_id(), 'actus_google_access_token', true);
    $refresh_token = get_user_meta(get_current_user_id(), 'actus_google_refresh_token', true);

    // Revoke token with Google
    if (!empty($access_token)) {
        $revoke_response = wp_remote_post(
            'https://oauth2.googleapis.com/revoke',
            [
                'body' => [
                    'token' => $access_token
                ],
                'timeout' => 15,
            ]
        );

        // Log if revocation failed (but continue to clear local tokens anyway)
        if (is_wp_error($revoke_response)) {
            //error_log('Google token revocation failed: ' . $revoke_response->get_error_message());
        }
    }

    // Clear local tokens
    delete_user_meta(get_current_user_id(), 'actus_google_access_token');
    delete_user_meta(get_current_user_id(), 'actus_google_refresh_token');

    wp_send_json_success([
        'message' => 'Disconnected from Google Drive',
        'status' => 'disconnected'
    ]);
}







// MARK: Refresh Google Access Token
// Helper - refresh expired access token using refresh token
// ----------------------------------------------------------
function actus_google_refresh_token() {
    $refresh_token = get_user_meta(get_current_user_id(), 'actus_google_refresh_token', true);
    
    if (empty($refresh_token)) {
        return false;
    }
    
    //error_log('Attempting to refresh Google access token');
    
    // Call your Node.js server to refresh the token
    $response = wp_remote_post(
        'https://license.actusanima.com/api/oauth/refresh',
        [
            'body' => json_encode([
                'refresh_token' => $refresh_token
            ]),
            'headers' => [
                'Content-Type' => 'application/json'
            ],
            'timeout' => 15,
        ]
    );
    
    if (is_wp_error($response)) {
        //error_log('Token refresh failed: ' . $response->get_error_message());
        return false;
    }
    
    $body = json_decode(wp_remote_retrieve_body($response), true);
    
    if (!empty($body['access_token'])) {
        // Save new access token
        update_user_meta(get_current_user_id(), 'actus_google_access_token', $body['access_token']);
        
        // Update expiry time
        $expires_in = isset($body['expires_in']) ? intval($body['expires_in']) : 3600;
        $expires_at = time() + $expires_in;
        update_user_meta(get_current_user_id(), 'actus_google_token_expires_at', $expires_at);

        // Update refresh token if a new one was provided
        if (!empty($body['refresh_token'])) {
            update_user_meta(get_current_user_id(), 'actus_google_refresh_token', $body['refresh_token']);
        }
        
        //error_log('Successfully refreshed access token');
        return $body['access_token'];
    }
    
    //error_log('Token refresh response missing access_token');
    return false;
}





// MARK: API Request
// Helper - make Google API request with automatic token refresh on 401
// ----------------------------------------------------------
function actus_google_api_request($url, $args = []) {
    $access_token = get_user_meta(get_current_user_id(), 'actus_google_access_token', true);
    $expires_at = get_user_meta(get_current_user_id(), 'actus_google_token_expires_at', true);

    if (empty($access_token)) {
        return new WP_Error('no_token', 'No access token found');
    }
    
    // Proactive refresh if token expires in less than 5 minutes
    if (!empty($expires_at) && ($expires_at - time()) < 300) {
        //error_log('Token expires soon, proactively refreshing');
        $new_token = actus_google_refresh_token();
        if ($new_token) {
            $access_token = $new_token;
        }
    }

    // Ensure headers array exists and add Authorization
    if (!isset($args['headers'])) {
        $args['headers'] = [];
    }
    $args['headers']['Authorization'] = 'Bearer ' . $access_token;
    
    // Set default timeout if not provided
    if (!isset($args['timeout'])) {
        $args['timeout'] = 15;
    }
    
    // Determine request method
    $method = isset($args['method']) ? strtoupper($args['method']) : 'GET';
    
    // Make initial request
    if ($method === 'POST') {
        $response = wp_remote_post($url, $args);
    } elseif ($method === 'DELETE') {
        $response = wp_remote_request($url, $args);
    } else {
        $response = wp_remote_get($url, $args);
    }
    
    // Check for errors
    if (is_wp_error($response)) {
        return $response;
    }
    
    $status_code = wp_remote_retrieve_response_code($response);
    
    // Handle token expiration (401)
    if ($status_code === 401) {
        //error_log('Google API request failed - token expired, attempting refresh');
        
        $new_token = actus_google_refresh_token();
        
        if ($new_token) {
            
            // Re-fetch from DB to get potentially updated token
            $current_token = get_user_meta(get_current_user_id(), 'actus_google_access_token', true);


            // Update Authorization header with new token
            if ($current_token !== $access_token) {
                $args['headers']['Authorization'] = 'Bearer ' . $current_token;
            } else {
                $args['headers']['Authorization'] = 'Bearer ' . $new_token;
            }
            

            // Retry the request
            if ($method === 'POST') {
                $response = wp_remote_post($url, $args);
            } elseif ($method === 'DELETE') {
                $response = wp_remote_request($url, $args);
            } else {
                $response = wp_remote_get($url, $args);
            }
        } else {
            return new WP_Error('token_refresh_failed', 'Failed to refresh access token');
        }
    }
    
    return $response;
}




// MARK: Upload XLSX
// AJAX - upload XLSX file to Google Sheets
// ----------------------------------------------------------
function ajax_acex_upload_xlsx_to_google() {
    acex_ajax_security();

    // Handle file upload
    if (isset($_FILES['file'])) { // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified via acex_ajax_security()
        $uploaded_file = $_FILES['file']; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.Missing -- File data validated below, tmp_name used as-is for file operations, nonce verified via acex_ajax_security()
        
        // Validate file
        if ($uploaded_file['error'] !== UPLOAD_ERR_OK) {
            wp_send_json_error(['message' => 'File upload error']);
        }

        $file_path = $uploaded_file['tmp_name'];
        $sheet_name = isset($_POST['sheet_name']) ? sanitize_text_field(wp_unslash($_POST['sheet_name'])) : 'Products'; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified via acex_ajax_security()
    } else {
        // Legacy: Get file path from POST
        $file_path = isset($_POST['file_path']) ? sanitize_text_field(wp_unslash($_POST['file_path'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified via acex_ajax_security()
        $sheet_name = isset($_POST['sheet_name']) ? sanitize_text_field(wp_unslash($_POST['sheet_name'])) : 'Products'; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified via acex_ajax_security()
    }

    if (empty($file_path) || !file_exists($file_path)) {
        wp_send_json_error(['message' => 'Invalid file path']);
    }

    $access_token = get_user_meta(get_current_user_id(), 'actus_google_access_token', true);
    if (!$access_token) {
        wp_send_json_error(['message' => 'User not connected to Google']);
    }

    $boundary = wp_generate_password(24, false);
    $headers = [
        'Content-Type' => 'multipart/related; boundary=' . $boundary,
    ];

    $metadata = json_encode([
        'name' => $sheet_name,
        'mimeType' => 'application/vnd.google-apps.spreadsheet'
    ]);

    $file_contents = file_get_contents($file_path);

    $body = "--$boundary\r\n";
    $body .= "Content-Type: application/json; charset=UTF-8\r\n\r\n";
    $body .= $metadata . "\r\n";
    $body .= "--$boundary\r\n";
    $body .= "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n";
    $body .= $file_contents . "\r\n";
    $body .= "--$boundary--";

    // Use centralized API request with auto token refresh
    $response = actus_google_api_request(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        [
            'method' => 'POST',
            'headers' => $headers,
            'body' => $body,
        ]
    );

    if (is_wp_error($response)) {
        wp_send_json_error(['message' => $response->get_error_message()]);
    }
    
    $result = json_decode(wp_remote_retrieve_body($response), true);
	
    if (!empty($result['id'])) {
        wp_send_json_success(['sheet_id' => $result['id']]);
    } else {
        wp_send_json_error(['message' => 'Failed to upload file to Google Sheets']);
    }
}




// MARK: Load Google Sheet
// AJAX - load file from Google Sheet
// ----------------------------------------------------------
function ajax_acex_load_google_sheet() {
	acex_ajax_security();

	$file_id = isset($_POST['fileid']) ? sanitize_text_field(wp_unslash($_POST['fileid'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified via acex_ajax_security()

	if (empty($file_id)) {
		wp_send_json_error(['message' => 'Invalid File ID']);
	}

	$access_token = get_user_meta(get_current_user_id(), 'actus_google_access_token', true);
	if (!$access_token) {
		wp_send_json_error(['message' => 'User not connected to Google']);
	}
	
	// Fetch file metadata first
	$metadata_response = actus_google_api_request(
		'https://www.googleapis.com/drive/v3/files/' . $file_id . '?fields=name,mimeType'
	);

	if (is_wp_error($metadata_response)) {
		wp_send_json_error(['message' => $metadata_response->get_error_message()]);
	}

	$metadata = json_decode(wp_remote_retrieve_body($metadata_response), true);
	
	// Export as XLSX from Google Sheets
	$export_url = 'https://www.googleapis.com/drive/v3/files/' . $file_id . '/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
	
	$response = actus_google_api_request($export_url, ['timeout' => 30]);

	if (is_wp_error($response)) {
		wp_send_json_error(['message' => $response->get_error_message()]);
	}

	$file_content = wp_remote_retrieve_body($response);
	
	if (empty($file_content)) {
		wp_send_json_error(['message' => 'Failed to download file content']);
	}

	// Return file data as base64 for client-side File object creation
	wp_send_json_success([
		'name' => $metadata['name'] . '.xlsx',
		'type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'size' => strlen($file_content),
		'content' => base64_encode($file_content)
	]);
}




// MARK: Delete Google Sheet
// AJAX - delete file from Google Drive
// ----------------------------------------------------------
function ajax_acex_delete_google_sheet() {
	acex_ajax_security();
	
	$file_id = isset($_POST['fileid']) ? sanitize_text_field(wp_unslash($_POST['fileid'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified via acex_ajax_security()
	
	if (empty($file_id)) {
		wp_send_json_error(['message' => 'Invalid File ID']);
	}
	
	$access_token = get_user_meta(get_current_user_id(), 'actus_google_access_token', true);
	if (!$access_token) {
		wp_send_json_error(['message' => 'User not connected to Google']);
	}
	
	// Use centralized API request with auto token refresh
	$response = actus_google_api_request(
		'https://www.googleapis.com/drive/v3/files/' . $file_id,
		['method' => 'DELETE']
	);
	
	if (is_wp_error($response)) {
		wp_send_json_error(['message' => $response->get_error_message()]);
	}
	
	$status_code = wp_remote_retrieve_response_code($response);
	
	if ($status_code === 204) {
		wp_send_json_success(['message' => 'File deleted successfully']);
	} else {
		$body = json_decode(wp_remote_retrieve_body($response), true);
		wp_send_json_error([
			'message' => isset($body['error']['message']) ? $body['error']['message'] : 'Failed to delete file',
			'status_code' => $status_code
		]);
	}
}






















// MARK: Save History
// AJAX - save history record
// ----------------------------------------------------------
function ajax_acex_save_history() {
    acex_ajax_security();
    
    
    $history_data = isset($_POST['history_data']) ? wp_unslash($_POST['history_data']) : array(); // phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Nonce verified via acex_ajax_security(), array data validated in add_record() method
    
    $history = new ACEX_History();
    $result = $history->add_record($history_data);
    
    if ($result) {
        wp_send_json_success(array(
            'message' => 'History saved successfully',
            'id' => $history->get_insert_id()
        ));
    } else {
        wp_send_json_error('Failed to save history');
    }
}






// MARK: Get History
// AJAX - get history records
// ----------------------------------------------------------
function ajax_acex_get_history() {
    acex_ajax_security();
    
    
    $limit = isset($_POST['limit']) ? absint($_POST['limit']) : 50; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified via acex_ajax_security()
    $offset = isset($_POST['offset']) ? absint($_POST['offset']) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified via acex_ajax_security()
    $action_type = isset($_POST['action_type']) ? sanitize_text_field(wp_unslash($_POST['action_type'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified via acex_ajax_security()
    
    $history = new ACEX_History();
    $records = $history->get_history(array(
        'limit' => $limit,
        'offset' => $offset,
        'action_type' => $action_type
    ));
    
    $count = $history->get_count($action_type);
    
    wp_send_json_success(array(
        'records' => $records,
        'total' => $count
    ));

}







// MARK: Get History
// AJAX - get history records
// ----------------------------------------------------------
function ajax_acex_delete_history() {
    acex_ajax_security();
    
    
    $id = isset($_POST['id']) ? absint($_POST['id']) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified via acex_ajax_security()
    
    if (!$id) {
        wp_send_json_error('Invalid ID');
    }
    
    $history = new ACEX_History();
    $result = $history->delete_record($id);
    
    if ($result) {
        wp_send_json_success('Record deleted successfully');
    } else {
        wp_send_json_error('Failed to delete record');
    }
}





// MARK: Get History Stats
// AJAX - get history statistics
// ----------------------------------------------------------
function ajax_acex_get_history_stats() {
    acex_ajax_security();
    
    $days = isset($_POST['days']) ? absint($_POST['days']) : 30; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified via acex_ajax_security()
    
    $history = new ACEX_History();
    $stats = $history->get_statistics($days);
    
    wp_send_json_success($stats);
}




// MARK: Update History Google Sheet Info
// AJAX - update history record to remove Google Sheet reference
function ajax_acex_update_history_google() {
    acex_ajax_security();
    
    global $wpdb;
    $table_name = $wpdb->prefix . 'acex_history';
    
    $id = isset($_POST['id']) ? intval($_POST['id']) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified via acex_ajax_security()
    
    $updated = $wpdb->update( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table requires direct query with prepared statement, caching not needed for immediately updated user-specific data
        $table_name,
        [
            'google_sheet_id' => null,
            'google_sheet_url' => null
        ],
        ['id' => $id],
        ['%s', '%s'],
        ['%d']
    );
    
    if ($updated !== false) {
        wp_send_json_success('Google Sheet reference removed');
    } else {
        wp_send_json_error('Failed to update record');
    }
}













