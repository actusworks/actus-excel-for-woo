<?php
/**
 * Plugin Activator
 * Handles plugin activation tasks
 */



if (!defined('ABSPATH')) {
    exit;
}





// MARK: Activation
// ----------------------------------------------------------
function acex_activate() {

    // Create database tables
    acex_create_tables();
    
    // Set default options
    acex_set_default_options();
    
    // Create necessary capabilities
    acex_create_capabilities();
    
    // Flush rewrite rules
    acex_flush_rewrite_rules();


}




// MARK: Database Tables
// ----------------------------------------------------------
function acex_create_tables() {
    require_once __DIR__ . '/class-acex-history.php';
    $history = new ACEX_History();
    $history->create_table();
    
    // Store database version for future updates
    update_option('acex_history_db_version', '1.0');

}

 


// MARK: Options
// ----------------------------------------------------------
function acex_set_default_options() {

    // Set default options for the plugin
    $default_options = array(
        'enabled'   => true,
		'logo'   	 => get_stylesheet_directory_uri() . '/img/logo.png',
		'form_email' => get_option('admin_email'),
    );
    add_option('acex_options', $default_options);
 
    
}




// MARK: Capabilities
// ----------------------------------------------------------
function acex_create_capabilities() {
    // Add custom capabilities for the plugin
    $role = get_role('editor');
    /*
    if ($role) {
        $role->add_cap('read_private_products');
        $role->add_cap('edit_products');
        $role->add_cap('edit_published_products');
        $role->add_cap('publish_products');
    }
    */
}




// MARK: Flush Rewrite Rules
// Flush rewrite rules to ensure custom post types and taxonomies work correctly
// ----------------------------------------------------------
function acex_flush_rewrite_rules() {
    flush_rewrite_rules();
}
