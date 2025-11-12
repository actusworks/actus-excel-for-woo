<?php
/**
 * Helpers for Actus Excel for WooCommerce plugin
 *
 * @package Actus_WOO_Excel
 */

// Prevent direct file access.
if (!defined('ABSPATH')) {
    exit;
}

global $ACEX;










/**
 * Encrypt API keys
 */
function acex_log($message, $tag = '', $data = null) {

return;


    $entry = '';
    
    if ( is_array($message) || is_object($message) ) {
        $message = print_r( $message, true ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_print_r
    }

    if ( strpos($tag, 'report') !== 0 ) {
        $date = gmdate('Y-m-d H:i:s');
        $date .= '.' . substr( (string) microtime(), 2, 3 );
        $entry = "[$date] ";
    }
    $entry .= "$message\n";

    if ( !empty($data) ) {
        $data = print_r( $data, true ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_print_r
        $entry .= "$data\n";
    }
  

    // Write to log file
    if (!empty($tag)) {
        file_put_contents(ABSPATH . 'wp-content/plugins/actus-excel-for-woo/logs/acex-' . $tag . '.txt', $entry, FILE_APPEND);
    } else {
        file_put_contents(ABSPATH . 'wp-content/plugins/actus-excel-for-woo/logs/acex-log.txt', $entry, FILE_APPEND);
    }

    
}
function acex_log_clear($tag = '') {
    $log_file = ABSPATH . 'wp-content/plugins/actus-excel-for-woo/logs/acex-log.txt';
    if (!empty($tag)) {
        $log_file = ABSPATH . 'wp-content/plugins/actus-excel-for-woo/logs/acex-' . $tag . '.txt';
    }
    if (file_exists($log_file)) {
        wp_delete_file($log_file);
    }
}





// Initialization Log
add_action('init', 'acex_init_log');
function acex_init_log() {

    if ( ! is_admin() ) {
        return;
    }

            
    
    acex_log_clear();




    // Get IP address
    $ip_address = '';
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip_address = $_SERVER['HTTP_CLIENT_IP']; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip_address = $_SERVER['HTTP_X_FORWARDED_FOR']; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
    } elseif (!empty($_SERVER['REMOTE_ADDR'])) {
        $ip_address = $_SERVER['REMOTE_ADDR']; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
    }



}























/**
 * Helper function to get the stored license key.
 * @return string The license key or empty string if not set.
 */
function acex_get_license_key() {
    $license = get_option('copyspell-ai-license', ['key' => '', 'status' => 'inactive']);
    $key = acex_decrypt_api_key($license['key']);
    return $key;
}

/**
 * Helper function to get the stored license status.
 * @return array The license status array or default values.
 */
function acex_get_license_status() {
    //error_log( print_r(get_option('copyspell-ai-license'), true) );

    return get_option('acex_license_status', [
        'status' => 'inactive',
        'message' => 'License not activated.',
        'expires' => null,
        'activationsCount' => 0,
        'maxActivations' => 0,
    ]);
}

/**
 * Helper function to check if the plugin is licensed and active.
 * You can use this to conditionally enable/disable features.
 * @return bool True if licensed and active, false otherwise.
 */
function acex_on() {
    $status = acex_get_license_status();
    return (isset($status['status']) && 
        ($status['status'] === 'active' || $status['status'] === 'trial' || $status['status'] === 'expired trial'));
}



















// MARK: Encryption
// ----------------------------------------------------------

/**
 * Encrypt API keys
 */
function acex_encrypt_api_key($key) {
    if (empty($key)) return '';
    
    $salt = wp_salt('auth');
    $encrypted = openssl_encrypt($key, 'AES-256-CBC', $salt, 0, substr($salt, 0, 16));
    return base64_encode($encrypted);
}

/**
 * Decrypt API keys
 */
function acex_decrypt_api_key($encrypted_key) {
    if (empty($encrypted_key)) return '';
    
    $salt = wp_salt('auth');
    $decoded = base64_decode($encrypted_key);
    return openssl_decrypt($decoded, 'AES-256-CBC', $salt, 0, substr($salt, 0, 16));
}






 























