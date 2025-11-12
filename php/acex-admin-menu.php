<?php
/**
 * Admin Menu
 *
 * @package    Actus_WOO_Excel
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}



if ( ! is_super_admin()
     || ! function_exists( 'is_admin_bar_showing' ) 
     || ! is_admin_bar_showing() ) { 

} else {
	if ( is_admin() ) {
		acex_admin_menu();
	}
}




 
// ============================ ADMIN MENU
function acex_admin_menu(){
	// Adds ACTUS menu on admin panel
	if ( !function_exists( 'actus_menu' ) ) {
		function actus_menu(){
			add_menu_page( 
				'Actus Anima Plugins',
				'Actus',
				'manage_options',
				'actus-plugins',
				'actus_plugins_page',
				ACEX_URL . 'img/actus_white_20.png',
				66
			);
		}
		if ( is_admin() ) {
			add_action( 'admin_menu', 'actus_menu' );
		}
	}

	// Adds submenu on ACTUS menu
	if ( !function_exists( 'acex_submenu' ) ) {
		function acex_submenu() {
			add_submenu_page(
				'actus-plugins', 
				__('Actus Excel for WooCommerce', 'actus-excel-for-woo'), 
				'Actus Excel', 
				'manage_options', 
				'actus-excel-for-woo', 
				'acex_admin_page'
			);
		}
		if ( is_admin() ) {
			add_action( 'admin_menu', 'acex_submenu' );
		}
	}
}


// ============================ ADMIN PAGES

// The ACTUS plugins page content
if ( !function_exists( 'actus_plugins_page' ) ) {
    function actus_plugins_page() {

        //$actus_plugins_url = ACEX_DIR . '/includes/actus-plugins.php';
        //include_once $actus_plugins_url;
        ?>

        <?php
    }
}






// ACTUS Metabox Settings page
function acex_admin_page(){
	if ( ! current_user_can( 'manage_options' ) )  {
		wp_die( __( 'You do not have sufficient permissions to access this page.', 'actus-excel-for-woo' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_die() automatically escapes output
	}
        $logo      = ACEX_URL . 'img/logo.png';
        $actus_logo= ACEX_URL . 'img/actus-logo.png';
        $actus_w   = ACEX_URL . 'img/actus-white.png';
        $actus_i   = ACEX_URL . 'img/info.png';
        $actus_h   = ACEX_URL . 'img/help.png';
        $icon_gear = ACEX_URL . 'img/gear.png';
	?>


    <div class="actus-admin acex-admin">
		
        <!-- HEADER -->
        <div class="actus-admin-header acex-header">
			<h2 class="actus-admin-title">Actus Excel for WooCommerce</h2>
            <img class="actus-admin-header-logo" src="<?php echo esc_url($logo); ?>">
        </div>


        <!-- NAVIGATION -->
        <div class="actus-admin-nav acex-nav">

			<!-- 
			<div class="actus-admin-nav-button" alt="home">
				Αρχική
			</div>
			-->
			<div class="actus-admin-nav-button" alt="export">
				Export
			</div>
			<div class="actus-admin-nav-button" alt="import">
				Import
			</div>
			<div class="actus-admin-nav-button" alt="history">
				History
			</div>
			<div class="actus-admin-nav-button" alt="settings">
				Settings
			</div>
			<div class="actus-admin-nav-button" alt="license">
				License
			</div>
        
			<div class="acex-google-status-container"></div>

		</div>



        <!-- MAIN -->
        <div class="actus-admin-main acex-main">

			
		</div>



		
        
        <!-- FOOTER -->
        <div class="actus-admin-footer acex-footer">
			<div class="actus-admin-footer-logo">
				Actus Excel for WooCommerce v<?php echo esc_html( ACEX_VERSION ); ?>
			</div>
			<div class="actus-admin-footer-actus">
				Developed by 
	            <img class="actus-admin-footer-logo" src="<?php echo esc_url($actus_logo); ?>">
				<a href="https://actus.works" target="_blank">Actus Anima</a>
			</div>
        </div>
        
	<?php
	
	
}


