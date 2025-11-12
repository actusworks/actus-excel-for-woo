<?php
include_once __DIR__ . '/acex-svg.php';
include_once __DIR__ . '/acex-data.php';
include_once __DIR__ . '/acex-helpers.php';
include_once __DIR__ . '/acex-shortcodes.php';
include_once __DIR__ . '/acex-admin-menu.php';


global $ACEX, $SVG;
$ACEX = get_option('acex_options') ?? array();














  

// MARK: SCRIPTS
// Enqueue backend scripts and styles
// ----------------------------------------------------------
add_action('admin_enqueue_scripts', 'acex_backend_scripts');
// ----------------------------------------------------------
function acex_backend_scripts( $hook ) {
	global $post, $wp_query;
	// Only load on our plugin pages
    if ( strpos( $hook, 'actus-excel-for-woo' ) === false ) {
        return;
    }

	$screen = get_current_screen(); 
	//if( $screen->post_type === 'page' ) return; // disabled for Pages
	
	wp_enqueue_script( 'wp-api' );
	wp_enqueue_script( 'lodash' );
	wp_enqueue_script( 'jquery' );


	// Google Fonts
	wp_enqueue_style( 'google-fonts', 'https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;700;900&family=Geologica:wght@300;400;700;900&family=Roboto:wght@300;400;700;900&display=swap&subset=greek', array(), ACEX_VERSION );
 

	// ExcelJS
	$exceljs_file = ACEX_DEV ? 'js/ext/exceljs.min.js' : 'dist/ext/exceljs.min.js';
	wp_enqueue_script( 'exceljs', ACEX_URL . $exceljs_file, array(), '4.3.0' );


	$script_file = ACEX_DEV ? 'js/actus-excel-for-woo.js' : 'dist/actus-excel-for-woo.min.js';
	$file_path = ACEX_PATH . $script_file;
	$version = ACEX_DEV ? filemtime($file_path) : 'v';
	wp_enqueue_script(
 		'actus-excel-for-woo',
		ACEX_URL . $script_file,
		array( 'exceljs', 'lodash', 'jquery', 'wp-i18n' ),
		$version.ACEX_VERSION
	);
 
	
	// Make translations available to JS 
	wp_set_script_translations('actus-excel-for-woo', 'actus-excel-for-woo');



	$css_file_path = ACEX_PATH . 'css/actus-excel-for-woo.css';
	$css_version = ACEX_DEV ? filemtime($css_file_path) : 'v';
	wp_enqueue_style(
		'actus-excel-for-woo-css',
		ACEX_URL . 'css/actus-excel-for-woo.css',
		array( 'wp-edit-blocks' ),
		$css_version.ACEX_VERSION
	);
	
	



	acex_localize_data();





}
// ----------------------------------------------------------
add_filter( 'script_loader_tag', 'acex_script_module', 10, 3 );
// ----------------------------------------------------------
function acex_script_module( $tag, $handle, $src ) {

	if ( $handle == 'actus-excel-for-woo' ) {
		return '<script src="' . $src . '" type="module"></script>' . "\n"; // phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedScript -- Script is enqueued via wp_enqueue_script(), this filter only modifies the tag to add type="module"
	}

	return $tag;
}









// MARK: LOCALIZE
// ----------------------------------------------------------
function acex_localize_data(){
	global $ACEX, $SVG, $wp_query, $wp_meta_keys;
	global $acex_property_groups, $acex_product_properties,
	   	   $acex_property_restrictions, $acex_property_warnings,
		   $acex_mustBeInherited;


	//delete_option( 'acex_templates' ); // RESET
	//delete_option( 'acex_queries' ); // RESET


	$screen = get_current_screen(); 
	$acex_nonce = wp_create_nonce( 'acex_nonce' );
	$templates = get_option( 'acex_templates') ?? array();
	$queries = get_option( 'acex_queries') ?? array();


	
	$acex_phpDATA = array( 
		'ajax_url'   => admin_url( 'admin-ajax.php' ),
		'nonce'      => $acex_nonce,
		'plugin_dir' => ACEX_PATH,
		'plugin_url' => ACEX_URL,
		'siteUrl'    => get_site_url(),
		'screen'     => $screen,
		'options'	 => $ACEX,
		'SVG'	 	 => $SVG,
		'templates'  => $templates,
		'queries'  	 => $queries,
		'license_api_url'	=> ACEX_LICENSE_API_URL,
		'data_groups'		=> $acex_property_groups,
		'data_props' 		=> $acex_product_properties,
		'data_meta'			=> acex_get_meta_properties(),
		'data_warnings'		=> $acex_property_warnings,
		'data_restrictions'	=> $acex_property_restrictions,
		'data_mustBeInherited'=> $acex_mustBeInherited,
		
		//'data_Xetters'	=> $acex_property_Xetters,

		//'products_meta' => $products_meta,
		//'props_names' 	=> $props_names,
		//'all_props' 	=> $all_props,
		//'prop_groups' 	=> $prop_groups,
	);

	
	if ( class_exists( 'WooCommerce' ) ) {
		$ACEX['woocommerce_active'] = true;
		$cat_args = array(
			'orderby'    => 'name',
			'order'      => 'asc',
			'hide_empty' => false,
		);
		$acex_phpDATA['woocommerce_active'] = true;
		$acex_phpDATA['data_taxonomies'] 	= acex_get_taxonomies();
		//$acex_phpDATA['data_attributes'] 	= wc_get_attribute_taxonomies();
	} 



	wp_localize_script( 'actus-excel-for-woo', 'acex_phpDATA', $acex_phpDATA );
	wp_localize_script( 'actus-excel-for-woo-FE-defer', 'acex_phpDATA', $acex_phpDATA );
}








// MARK: Get Taxonomies
// ----------------------------------------------------------
function acex_get_taxonomies() {
	$product_taxonomies = get_object_taxonomies('product', 'objects');
	$taxonomy_data = array();
	foreach ($product_taxonomies as $taxonomy) {
		if (strpos($taxonomy->name, 'pa_') === 0) continue;
		if (in_array($taxonomy->name, ['product_type', 'product_visibility', 'product_shipping_class'])) {
			continue;
		}
		
        $key = $taxonomy->name;
        if ( $key === 'product_cat' ) {
            $key = 'categories';
        } elseif ( $key === 'product_tag' ) {
            $key = 'tags';
        }
		$taxonomy_data[$key] = $taxonomy;
		/*
        $result[$tax_key] = array(
            'meta_key' => $tax_obj->name,
            'label' => $tax_obj->label,
            // Add other properties you need
        );
		*/
	}
	return $taxonomy_data;
}






