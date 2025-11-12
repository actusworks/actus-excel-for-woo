<?php
/**
 * Plugin Deactivator
 * Handles plugin deactivation tasks
 */



if (!defined('ABSPATH')) {
    exit;
}





// MARK: Deactivation
// ----------------------------------------------------------
function acex_deactivate() {

    // Remove database tables
    acex_remove_tables();

    // Remove options
    // acex_remove_options();

    // Remove capabilities
    // acex_remove_capabilities();

    // Clear scheduled events
    acex_clear_scheduled_events();


}






// MARK: Tables
// ----------------------------------------------------------
function acex_remove_tables() {
	global $wpdb;

    $settings = get_option('acex_options', array());
    $delete_data_on_deactivation = isset($settings['delete_data_on_deactivation']) ? $settings['delete_data_on_deactivation'] : false;
    
    if ($delete_data_on_deactivation) {
        require_once __DIR__ . '/class-acex-history.php';
        $history = new ACEX_History();
        $history->delete_table();
        
        // Clean up options
        delete_option('acex_history_db_version');
        delete_option('acex_options');
    }


}





// MARK: Options
// ----------------------------------------------------------
function acex_remove_options() {

    // Remove options for the plugin
    //delete_option('acex_options');

}




// MARK: Capabilities
// ----------------------------------------------------------
function acex_remove_capabilities() {

    // Remove custom capabilities for the plugin
    $role = get_role('editor');

    /*
    if ($role) {
        $role->remove_cap('read_private_products');
        $role->remove_cap('edit_products');
        $role->remove_cap('edit_published_products');
        $role->remove_cap('publish_products');
    }
    */
	
}


// MARK: Scheduled Events
// ----------------------------------------------------------
function acex_clear_scheduled_events() {


}







/**
 * The code that runs during plugin uninstallation.
 * This action is fired when the plugin is uninstalled.
 */
register_uninstall_hook(__FILE__, 'acex_uninstall');
function acex_uninstall() {
    // Clear any scheduled WP-Cron events for the plugin
    //wp_clear_scheduled_hook('acex_daily_license_check');


    // Delete plugin options from the database
    //delete_option('acex_license_key');
    //delete_option('acex_license_status');

    // You might want to delete other plugin-specific data here
    // For example: delete_option('acex_some_other_setting');
}


 


