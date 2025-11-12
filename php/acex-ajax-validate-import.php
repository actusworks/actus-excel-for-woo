<?php









add_action( 'wp_ajax_acex_validate_import', 'ajax_acex_validate_import' );







// MARK: AJAX Validate Import
// ----------------------------------------------------------
function ajax_acex_validate_import() {
	global $wpdb;

	check_ajax_referer('acex_nonce', 'nonce');

    if (!current_user_can('edit_products')) {
        wp_send_json_error(array('message' => __('You do not have sufficient permissions.', 'actus-excel-for-woo')));
        return;
    }

	
    $current_user = wp_get_current_user();
    acex_log_clear('report');
    acex_log('======================================== Actus Excel for WooCommerce', 'report');
    acex_log('Date: ' . wp_date('Y-m-d H:i:s'), 'report');
    acex_log('User: '. $current_user->user_email, 'report');
    acex_log('========================================================', 'report');
    acex_log('                                              VALIDATION', 'report');





	// Get and sanitize the products data from the request
	$products = isset($_POST['products']) ? wp_unslash($_POST['products']) : array();
	$keys = isset($_POST['keys']) ? wp_unslash($_POST['keys']) : array();
	
	// Decode JSON string if needed
	if (is_string($products)) {
		$decoded = json_decode($products, true);
		if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
			$products = $decoded;
		}
	}
	
	// Sanitize the products array after decoding
	if (is_array($products)) {
		$products = acex_sanitize_options($products);
	}
	
	// Process keys
	if (is_string($keys)) {
		$keys = explode(',', $keys);
	}
	if (is_array($keys)) {
		$keys = array_map('sanitize_text_field', $keys);
	} else {
		$keys = array();
	}

	// Validate that we have an array of products
	if (!is_array($products)) {
		wp_send_json_error(array('message' => __('Invalid products data format.', 'actus-excel-for-woo')));
		return;
	}

	// Here you can add your validation logic
	$validation_results = array();



	// Validate IDs and SKUs
	// -----------------------------------------
	$validation_results = acex_validate_ids_skus( $products, $keys );





	// LOOP THROUGH PRODUCTS TO VALIDATE
	// -----------------------------------------
	foreach ($products as $index => $product) {

		$validation = acex_validate_product( $product, $keys );

		if ( $validation ) {
			$validation_results[$index] = array(
				'product' => $product['id'] ?? $product['name'] ?? $product['SKU'] ?? $product['slug'] ?? $product ?? 'unknown',
				'validation'  => $validation,
			);
		}
	}



	acex_log('📦 total products: '. $validation_results['total'], 'report');
	acex_log('--------------------------------------------------------', 'report');
	if ( count( $validation_results['update_ids'] ) )
		acex_log("🆔 to be updated by id:\n  ➤ ". implode( "\n  ➤ ", $validation_results['update_ids']), 'report');
	if ( count( $validation_results['update_skus'] ) )
		acex_log("🏷️ to be updated by sku:\n  ➤ ". implode( "\n  ➤ ", $validation_results['update_skus']), 'report');
	if ( count( $validation_results['create'] ) ) {
		acex_log('➕ to be created:', 'report');
		foreach ( $validation_results['create'] as $create_idx ) {
			$product = $products[$create_idx];
			$identifier = $product['id'] ?? $product['name'] ?? $product['SKU'] ?? $product['slug'] ?? $product[0] ?? 'unknown';
			acex_log('  ➤ ' . $identifier, 'report');
		}
	}
	if ( count( $validation_results['invalid'] ) ) {
		acex_log('🚫 to be created:', 'report');
		foreach ( $validation_results['invalid'] as $invalid_idx ) {
			$product = $products[$invalid_idx];
			$identifier = $product['id'] ?? $product['name'] ?? $product['SKU'] ?? $product['slug'] ?? $product[0] ?? 'unknown';
			acex_log('  ➤ ' . $identifier, 'report');
		}
	}
	acex_log('--------------------------------------------------------', 'report');



	// -----------------------------------------
	wp_send_json_success( $validation_results );

}





// MARK: Validate IDs and SKUs
// ----------------------------------------------------------
function acex_validate_ids_skus( $products, $keys = array() ) {
	global $wpdb;

	$result = array();
	//$result['debug'] = [];
	$result['total'] = count($products);

	$ids  = array();
	$skus = array();
	$update_ids  = array();
	$update_skus = array();
	$invalid = array();
	$create = array();
	$update = array();
	$existing_ids = array();
	$missing_ids  = array();

	// Collect all product IDs
	/*
	$product_ids = array_filter(array_column($products, 'id'));
	$products_with_no_id = array_filter($products, function($p) {
		return empty($p['id']);
	});
	*/
	
	// Collect all product SKUs as a flat indexed array
	$product_skus = array();
	$products_with_no_sku = array();
	foreach ($products as $idx => $product) {
		if (!empty($product['sku'])) {
			$product_skus[] = $product['sku'];
		} else {
			$products_with_no_sku[] = $idx;
		}
	}
	// Re-index to ensure $product_skus is a flat array
	$product_skus = array_values($product_skus);

	// Find existing SKUs in the database
	if ( !empty($product_skus) ) {
		$placeholders = implode(',', array_fill(0, count($product_skus), '%s'));
		$sku_query = "
			SELECT meta_value 
			FROM {$wpdb->postmeta} pm
			INNER JOIN {$wpdb->posts} p ON pm.post_id = p.ID
			WHERE pm.meta_key = '_sku' 
			AND pm.meta_value IN ($placeholders)
			AND p.post_status != 'trash'
		";
		$update_skus = $wpdb->get_col($wpdb->prepare($sku_query, ...$product_skus)); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Bulk validation query to check existing SKUs, prepared via $wpdb->prepare(), caching not suitable for import validation
		$missing_skus = array_diff($product_skus, $update_skus);
		$missing_skus = array_values($missing_skus);
	}

	 
	// Build a map of product SKUs to IDs for quick lookup
	$sku_to_id = [];
	$product_ids = array();
	foreach ($products as $product) {
		if (!empty($product['sku']) && !empty($product['id'])) {
			$sku_to_id[$product['sku']] = $product['id'];
		}

		// no or missing SKU and has ID
		if ( (empty($product['sku']) || !in_array($product['sku'], $update_skus) ) &&
		     !empty($product['id']) ) {
			$product_ids[] = $product['id'];
		}
	}

	// Re-index to ensure $product_ids is a flat array
	$product_ids = array_values($product_ids);
	
	// Query the DB for products with these IDs
	if ( !empty($product_ids) ) {
		$args = [
			'post_type' => ['product', 'product_variation'],
			'post_status' => 'any',
			'post__in' => $product_ids,
			'fields' => 'ids',
			'posts_per_page' => -1,
		];
		$query = new WP_Query($args);
		$update_ids = $query->posts;
		$missing_ids = array_diff($product_ids, $update_ids);
		$missing_ids = array_values($missing_ids);
	}

	//$missing = array_merge( $missing, $missing_skus );
	//$create = array_merge( $create, $missing );




	foreach ($products as $idx => $product) {

		$id = $product['id'] ?? null;
		if ( (! in_array( $product['sku'], $update_skus ) && ! in_array( $id, $update_ids ) ) 
		){
				
			if (empty($product['name']) || empty($product['type'])) {
				$invalid[] = $idx;
			} else {
				$create[] = $idx;
			}

		} else {

			$update[] = $idx;

		}



	}



	


	$result['invalid'] = array_unique($invalid);
	$result['create'] = array_unique($create);
	$result['update'] = array_unique($update);
	$result['update_ids'] = $update_ids;
	$result['update_skus'] = $update_skus;
	$result['missing_ids'] = $missing_ids;
	$result['missing_skus'] = $missing_skus;
	$result['product_ids'] = $product_ids;
	//$result['product_ids_count'] = count($product_ids);
	//$result['product_ids_count_unique'] = count(array_unique($product_ids));
	//$result['sku_query'] = $sku_query;
	//$result['sku_response'] = $existing_skus;




	return $result;


}







// MARK: Validate Product
// ----------------------------------------------------------
function acex_validate_product( $product, $keys = array() ) {

	$validation = array();

	// Example validation: Check if product name is empty
	if ( empty( $product['name'] ) ) {
		//$validation[] = __( 'Product name cannot be empty.', 'actus-excel-for-woo' );
	}

	if ( empty( $product['type'] ) ) {
		//$validation[] = __( 'Product type cannot be empty.', 'actus-excel-for-woo' );
	}

	// Example validation: Check if price is a valid number
	if ( isset( $product['price'] ) && $product['price'] !== '' && ! is_numeric( $product['price'] ) ) {
		$validation[] = __( 'Price must be a valid number.', 'actus-excel-for-woo' );
	}

	if ( empty( $validation ) ) {
		return false;
	}	
	return $validation;
}







