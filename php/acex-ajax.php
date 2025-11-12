<?php
include_once __DIR__ . '/acex-ajax-product-get.php';
include_once __DIR__ . '/acex-query-templates.php';
include_once __DIR__ . '/acex-ajax-query.php';
include_once __DIR__ . '/acex-ajax-validate-import.php';
include_once __DIR__ . '/acex-ajax-taxonomies.php';
include_once __DIR__ . '/acex-ajax-product.php';
include_once __DIR__ . '/acex-ajax-google.php';











// MARK: AJAX Security Check
// ----------------------------------------------------------
function acex_ajax_security( $mode="edit" ){
    
    $role = 'edit_products';
    if ( $mode === "edit" ) $role = 'manage_woocommerce';

    // Security check
    if ( ! check_ajax_referer('acex_nonce', 'nonce', false) ) {
        wp_send_json_error(array('message' => __('Nonce verification failed.', 'actus-excel-for-woo')));
        return false;
    }
    
    if (!current_user_can( $role )) {
        wp_send_json_error(array('message' => __('You do not have sufficient permissions.', 'actus-excel-for-woo')));
        return false;
    }

    return true;

}





// MARK: Get Data
// ----------------------------------------------------------
add_action( 'wp_ajax_acex_get_data', 'acex_get_data' );
function acex_get_data() {
    check_ajax_referer('acex_nonce', 'nonce');
        
    // For settings/options
    if (!current_user_can('manage_woocommerce')) {
        wp_send_json_error(array('message' => __('You do not have sufficient permissions.', 'actus-excel-for-woo')));
        return;
    }
    


    $name = isset($_POST['name']) ? sanitize_text_field(wp_unslash($_POST['name'])) : '';

    
    $taxonomies = acex_get_taxonomies();

    // Taxonomies
    if ( in_array( $name, array_keys( $taxonomies ) ) ) {
        $terms = get_terms( array(
            'taxonomy'   => $taxonomies[ $name ]->query_var,
            'hide_empty' => false,
            'orderby'    => 'name',
            'order'      => 'asc',
        ));

        wp_send_json_success( $terms );
        return;
    }



    // Shipping Classes
    if ( $name == 'shipping_classes' || $name == 'shipping' ) {
        $shipping_classes = get_terms( array(
            'taxonomy'   => 'product_shipping_class',
            'hide_empty' => false,
			'orderby'    => 'name',
			'order'      => 'asc',
        ));

        wp_send_json_success( $shipping_classes );
        return;
    }


    // Attributes
    if ( $name == 'attributes' || $name == 'attributes_terms' ) {


		$attributes = wc_get_attribute_taxonomies();
		$product_attributes = acex_get_current_attributes();

        
        if ( $name == 'attributes' ) {
		    wp_send_json_success( $product_attributes );
        } else {
            wp_send_json_success( $attributes );
        }
		return;
	}




    // Templates
    if ( $name == 'templates' ) {
        global $query_templates;
        wp_send_json_success( $query_templates );
        return;
    }


    // Query Templates
    if ( $name == 'query_templates' ) {
        global $query_templates;
        wp_send_json_success( $query_templates );
        return;
    }


}


// MARK: Get Attributes
// ----------------------------------------------------------
function acex_get_current_attributes(){

    $product_attributes = array();
    $attributes = wc_get_attribute_taxonomies();

    // Add terms for each attribute
    foreach ( $attributes as &$attribute ) {
        $taxonomy = wc_attribute_taxonomy_name( $attribute->attribute_name );
        $attribute->terms = get_terms( array(
            'taxonomy'   => $taxonomy,
            'hide_empty' => false,
        ) );
        $attribute->options = array();
        if ( isset( $attribute->terms ) && is_array( $attribute->terms ) ) {
            foreach ( $attribute->terms as $term ) {
                $attribute->options[] = $term->slug;
            }
        }
        $product_attributes[] = $attribute;
    }

    return $product_attributes;

}









// MARK: Load Option
// ----------------------------------------------------------
add_action( 'wp_ajax_acex_get_option', 'acex_get_option' );
function acex_get_option() {
    check_ajax_referer('acex_nonce', 'nonce');
    
    // For settings/options
    if (!current_user_can('manage_woocommerce')) {
        wp_send_json_error(array('message' => __('You do not have sufficient permissions.', 'actus-excel-for-woo')));
        return;
    }
    

    // Get the option name from the request
    $option_name = isset($_POST['name']) ? sanitize_text_field(wp_unslash($_POST['name'])) : '';
    

    // Retrieve the option value from the database
    $option_value = get_option($option_name);

 
    
    if (is_array($option_value) && isset($option_value['api'])) {
        foreach ($option_value['api'] as $provider => &$config) {
            if (!empty($config['key'])) {
                $config['key'] = acex_decrypt_api_key($config['key']);
            }
        }
    }

    if ( is_array($option_value) && $option_value['key'] ) {
        $option_value['key'] = acex_decrypt_api_key($option_value['key']);
    }




    if ($option_value !== false) {
        wp_send_json_success(array(
            'message' => 'Option loaded successfully.',
            'options' => $option_value,
            'name' => $option_name
        ));
    } else {
        wp_send_json_error(array('message' => __('Error loading option.', 'actus-excel-for-woo')));
    }
}




// MARK: Save Option
// ----------------------------------------------------------
add_action( 'wp_ajax_acex_save_option', 'acex_save_option' );
function acex_save_option() {
    check_ajax_referer('acex_nonce', 'nonce');

    if (!current_user_can('manage_options')) {
        wp_send_json_error(array('message' => __('You do not have sufficient permissions.', 'actus-excel-for-woo')));
    }
    
    // Parse the JSON options
    $options_name = isset($_POST['name']) ? sanitize_text_field(wp_unslash($_POST['name'])) : '';
    $options = isset($_POST['value']) ? wp_unslash($_POST['value']) : '';
    
    // Try to decode if it's a JSON string
    $parsed_options = $options;
    if (is_string($options)) {
        $decoded = json_decode($options, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $parsed_options = $decoded;
        }
    }

    // Sanitize the options recursively
    if (is_array($parsed_options)) {
        $sanitized_options = acex_sanitize_options($parsed_options);
    } else {
        // For simple strings, sanitize directly
        $sanitized_options = sanitize_text_field($parsed_options);
    }

    // if we are saving main options
    if ( ! $options_name ) {
        $options_name = 'acex_options';
        $current_options = get_option('acex_options', array());
        $updated_options = array_merge($current_options, $sanitized_options);

        
        
        // Encrypt API keys before saving
        if (isset($updated_options['api'])) {
            foreach ($updated_options['api'] as $provider => &$config) {
                if (!empty($config['key'])) {
                    $config['key'] = acex_encrypt_api_key($config['key']);
                }
            }
        }


        $saved_options = get_option('acex_options');
        if ( $current_options === $updated_options ) {
            wp_send_json_success(array(
                'message' => 'Settings are already up to date.',
                'options' => $updated_options
            ));
            return;
        }
    } else {
        $current_options = get_option($options_name, false);
        $current_options = acex_sanitize_options( $current_options );
        $updated_options = $sanitized_options;
        
        if ( is_array($updated_options) && $updated_options['key'] ) {
            $updated_options['key'] = acex_encrypt_api_key($updated_options['key']);
        }
    }

    global $wpdb;
    
    // Check actual table charset
    $table_status = $wpdb->get_row("SHOW TABLE STATUS LIKE '{$wpdb->options}'"); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Database metadata query to check table charset for emoji handling, not cacheable
    $actual_charset = $table_status->Collation ?? 'unknown';
    
    // If table doesn't support utf8mb4, convert emojis to HTML entities
    if (strpos($actual_charset, 'utf8mb4') === false) {
        $updated_options = acex_convert_emojis_recursive($updated_options);
    }
    
    // Delete first to avoid autoload issues
    delete_option($options_name);
    
    // Add with explicit autoload setting
    $result = add_option($options_name, $updated_options, '', 'no');
    
    // Verify save
    $saved_value = get_option($options_name);
    $save_successful = ($saved_value !== false);

    if ($save_successful) {
        wp_send_json_success(array(
            'message' => 'Settings saved successfully!',
            'options' => $saved_value,
            'name'    => $options_name,
            'table_charset' => $actual_charset
        ));
    } else {
        wp_send_json_error(array(
            'message' => __('Error saving settings.', 'actus-excel-for-woo'),
            'details' => $wpdb->last_error,
            'name'    => $options_name,
            'table_charset' => $actual_charset,
            'wpdb_charset' => $wpdb->charset
        ));
    }
}







// MARK: Check Orphaned Variations
// ----------------------------------------------------------
add_action( 'wp_ajax_acex_check_orphaned', 'acex_check_orphaned' );
function acex_check_orphaned() {
    check_ajax_referer('acex_nonce', 'nonce');

    if (!current_user_can('manage_options')) {
        wp_send_json_error(array('message' => __('You do not have sufficient permissions.', 'actus-excel-for-woo')));
    }
    

    global $wpdb;
    $query = $wpdb->prepare(
        "SELECT p.ID, p.post_title, p.post_name
        FROM {$wpdb->posts} p
        WHERE p.post_type = %s
        AND (p.post_parent = 0 OR p.post_parent NOT IN (
            SELECT ID FROM {$wpdb->posts} WHERE post_type = %s
        ))",
        'product_variation',
        'product'
    );

    $orphaned_variations = $wpdb->get_results($query); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Complex subquery to find orphaned variations, prepared via $wpdb->prepare(), no WP API equivalent

    if (empty($orphaned_variations)) {
        wp_send_json_success(array('message' => __('No orphaned variations found.', 'actus-excel-for-woo')));
    }

    wp_send_json_success(array(
        'message' => __('Orphaned variations found.', 'actus-excel-for-woo'),
        'variations' => $orphaned_variations
    ));
}






// MARK: Delete Orphaned Variations
// ----------------------------------------------------------
add_action( 'wp_ajax_acex_delete_orphaned', 'acex_delete_orphaned' );
function acex_delete_orphaned() {
    check_ajax_referer('acex_nonce', 'nonce');

    if (!current_user_can('manage_options')) {
        wp_send_json_error(array('message' => __('You do not have sufficient permissions.', 'actus-excel-for-woo')));
    }
    
    $variation_ids = isset($_POST['variation_ids']) && is_array($_POST['variation_ids'])
        ? array_filter(array_map('intval', $_POST['variation_ids']), function($id) { return $id > 0; })
        : array();
    if (empty($variation_ids)) {
        wp_send_json_error(array('message' => __('No variation IDs provided.', 'actus-excel-for-woo')));
    }


    foreach ( array_chunk( $variation_ids, 100 ) as $batch ) {
        foreach ( $batch as $id ) {
            wp_delete_post( $id, true ); // clean + safe
        }
        sleep(1); // small pause for server load
    }


    wp_send_json_success(array(
        'message' => __('Orphaned variations deleted successfully.', 'actus-excel-for-woo'),
        'deleted_ids' => $variation_ids
    ));



}



























// MARK: Convert Emojis
// ----------------------------------------------------------
// Convert emojis to HTML entities for databases that don't support utf8mb4
function acex_convert_emojis_recursive($data) {
    if (is_array($data)) {
        foreach ($data as $key => $value) {
            $data[$key] = acex_convert_emojis_recursive($value);
        }
        return $data;
    } elseif (is_string($data)) {
        // Convert emojis to HTML entities
        return mb_encode_numericentity($data, [0x10000, 0x10FFFF, 0, 0xFFFFFF], 'UTF-8');
    }
    return $data;
}

// MARK: Sanitize
// ----------------------------------------------------------
/**
 * Helper function to recursively sanitize options
 * 
 * @param mixed $options The data to sanitize
 * @return mixed Sanitized data
 */
function acex_sanitize_options($options, $context = '') {
    if (!is_array($options)) {
        // Sanitize non-array values
        if (is_string($options)) {
            return sanitize_text_field($options);
        }
        return $options;
    }

    $sanitized = array();
    
    // Fields that should preserve HTML content
    $html_fields = array(
        'description',
        'short_description', 
        'excerpt',
        'content',
        'post_content',
        'post_excerpt',
        'purchase_note',
    );
    
    /**
     * Filter the list of fields that should preserve HTML during import sanitization.
     * 
     * Use this filter to add custom fields or meta keys that contain HTML content.
     * 
     * @param array $html_fields Array of field names that should preserve HTML.
     * @param string $context The parent key context (useful for nested arrays).
     * 
     * @example
     * add_filter('acex_html_fields', function($fields) {
     *     $fields[] = 'custom_html_field';
     *     $fields[] = '_custom_meta_with_html';
     *     return $fields;
     * });
     */
    $html_fields = apply_filters('acex_html_fields', $html_fields, $context);
    
    foreach ($options as $key => $value) {
        // Sanitize the key
        $sanitized_key = sanitize_key($key);
        
        if (is_array($value)) {
            // Recursively sanitize nested arrays, pass the current key as context
            $sanitized[$sanitized_key] = acex_sanitize_options($value, $sanitized_key);
        } elseif (is_string($value)) {
            // Check if this field should preserve HTML
            //if (in_array($sanitized_key, $html_fields) || in_array($context, $html_fields)) {
                // Use wp_kses_post to allow safe HTML (same as WordPress post editor)
                $sanitized[$sanitized_key] = wp_kses_post($value);
            //} else {
                // For all other fields, strip HTML for security
                //$sanitized[$sanitized_key] = sanitize_text_field($value);
            //}
        } elseif (is_numeric($value)) {
            // Preserve numeric values
            $sanitized[$sanitized_key] = is_float($value) ? floatval($value) : intval($value);
        } elseif (is_bool($value)) {
            // Preserve boolean values
            $sanitized[$sanitized_key] = (bool) $value;
        } else {
            // For other types (null, objects, etc), pass through
            $sanitized[$sanitized_key] = $value;
        }
    }
    
    return $sanitized;
}








// MARK: Get Data
// ----------------------------------------------------------
add_action( 'wp_ajax_acex_search_product', 'acex_search_product' );
function acex_search_product() {

    check_ajax_referer('acex_nonce', 'nonce');
    
    // For settings/options
    if (!current_user_can('manage_woocommerce')) {
        wp_send_json_error(array('message' => __('You do not have sufficient permissions.', 'actus-excel-for-woo')));
        return;
    }
    


    $search = isset($_POST['search']) ? sanitize_text_field(wp_unslash($_POST['search'])) : '';

    
    $params = array(
			'posts_per_page' => 30,
			'post_status'      => 'publish',
			'post_type' => array('product'),
			'act_search_title_sku' => $search,
            /*
			'tax_query'            => array(
				array(
					'taxonomy' => 'product_cat',
					'field'    => 'term_id',
					'terms'    => array(424, 3233, 3232),
					'operator' => 'NOT IN', // Excluded
				)
			)
            */

		);
		add_filter( 'posts_where', 'acex_post_title_sku_filter', 10, 2 );
		$wc_query = new WP_Query( $params );
		
		$result = $wc_query->posts;

        foreach ( $result as $idx => $row ) {

            $result[$idx]->sku = get_post_meta( $row->ID, '_sku', true );

        }
		
		
		remove_filter( 'posts_where', 'acex_post_title_sku_filter', 10 );

            
        wp_send_json_success( $result );
		wp_die();

}




// Search Filters
function acex_post_title_filter($where, &$wp_query) {
    global $wpdb;
    if ( $search_term = $wp_query->get( 'act_search_post_title' ) ) {
        $where .= ' AND ' . $wpdb->posts . '.post_title LIKE \'%' . $wpdb->esc_like( $search_term ) . '%\'';
    }
    return $where;
}
function acex_post_title_sku_filter($where, &$wp_query) {
    global $wpdb;
    
    if ( $search_term = $wp_query->get( 'act_search_title_sku' ) ) {
        
        $args = array(
            'posts_per_page'  => -1,
            'post_status'      => 'publish',
            'post_type' => array('product'),
            'meta_query' => array(
                array(
                    'key' => '_sku',
                    'value' => $search_term,
                    'compare' => 'LIKE'
                )
            )
        );
        $posts = get_posts($args);
        //if(empty($posts)) return $search;
        if ( empty($posts) ) {
            $where .= 
                ' AND ' . $wpdb->posts . '.post_title LIKE \'%' . $wpdb->esc_like( $search_term ) . '%\'';
            
        } else {
            $get_post_ids = array();
            foreach($posts as $post){
                $get_post_ids[] = $post->ID;
            }
            $where .= 
                ' AND (' . $wpdb->posts . '.ID IN (' . implode( ',', $get_post_ids ) . ') OR ' . $wpdb->posts . '.post_title LIKE \'%' . $wpdb->esc_like( $search_term ) . '%\')';
        }
        
        
        
        /*
        if(empty($posts))
            $where .= 
                ' AND ' . $wpdb->posts . '.post_title LIKE \'%' . $wpdb->esc_like( $search_term ) . '%\'';
        */
    }
    return $where;
}



