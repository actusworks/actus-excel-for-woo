<?php
/**
 * Plugin Name: Actus Excel for WooCommerce
 * Requires Plugins: woocommerce
 * Plugin URI: https://awexcel.actusanima.com/
 * Description: Tools for WooCommerce and Spreadsheets
 * Version: 0.9.2
 * Author: Actus Anima
 * Author URI: https://actus.works
 * License: GPL-3.0
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain: actus-excel-for-woo
 */

 // Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

 
// Define plugin constants
define('ACEX_DEV', false);
define('ACEX_VERSION', '0.9.2');
define('ACEX_URL', plugin_dir_url(__FILE__));
define('ACEX_PATH', plugin_dir_path(__FILE__));
define('ACEX_FILE', __FILE__);
define('ACEX_PLUGIN_SLUG', 'actus-excel-for-woo');
define('ACEX_LICENSE_API_URL', 'https://license.actusanima.com/api/license');
define('ACEX_MODE', (defined('WP_DEBUG') && WP_DEBUG) ? 'DEBUG' : (ACEX_DEV ? 'DEV' : 'PROD'));




// Activation and deactivation hooks
require_once ACEX_PATH . 'php/acex-activator.php';
require_once ACEX_PATH . 'php/acex-deactivator.php';
register_activation_hook(__FILE__, 'acex_activate');
register_deactivation_hook(__FILE__, 'acex_deactivate');
register_uninstall_hook(__FILE__, 'acex_uninstall');




// Load license class

if (is_admin()) {
    require_once ACEX_PATH . 'php/class-acex-license.php';
    require_once ACEX_PATH . 'php/acex-helpers.php';
    require_once ACEX_PATH . 'php/acex-ajax.php';
    
    
    add_action('plugins_loaded', function() {
        $acex_license = new ACEX_License();
        
        // Example usage:
        /*
        if ( $acex_license->is_premium() ) {
            // Enable premium features
            //add_action('init', 'acex_enable_premium_features');
        }
        */
        
    });
    
}



 

// Initialize the plugin
add_action('init', 'acex_init');
// ----------------------------------------------------------
function acex_init() {


        // Initialize backend features
        if (is_admin()) {
            require_once ACEX_PATH . 'php/acex-backend.php';
        }


        // Initialize frontend features
        require_once ACEX_PATH . 'php/acex-frontend.php';



}

















// Add settings link
// ┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅
$plugin_name = plugin_basename(__FILE__);
add_filter("plugin_action_links_$plugin_name", 'acex_add_settings_link' );
function acex_add_settings_link( $links ) { 
    $settings_link = '<a href="admin.php?page=actus-excel-for-woo">'. __( "Settings", "actus-excel-for-woo" ) .'</a>'; 
    array_unshift( $links, $settings_link );
    return $links; 
}







