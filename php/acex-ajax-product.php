<?php
include_once __DIR__ . '/acex-data.php';





// Register AJAX actions
add_action( 'wp_ajax_acex_save_multiple_products', 'ajax_acex_save_multiple_products' );







// MARK: AJAX Save Multiple
// ----------------------------------------------------------
function ajax_acex_save_multiple_products() {
    acex_ajax_security();


    acex_log('========================================================', 'report');
    acex_log('                                                 WRITING', 'report');



    
    // Get products data from POST
    $products_data = isset($_POST['products_data']) ? wp_unslash($_POST['products_data']) : '';
    $_data = isset($_POST['_data']) ? wp_unslash($_POST['_data']) : '';

    // Try to decode if it's a JSON string
    if ( is_string($products_data) ) {
        $decoded = json_decode($products_data, true);
        if ( json_last_error() === JSON_ERROR_NONE && is_array($decoded) ) {
            $products_data = $decoded;
        }
    }
    if ( ! is_array($products_data) ) {
        wp_send_json_error(array('message' => 'Products data must be an array or valid JSON string.'));
        return;
    }


    
    // Sanitize the products data array
    $products_data = acex_sanitize_options($products_data);
    
    // Decode _data array
    if ( is_string($_data) ) {
        $decoded = json_decode($_data, true);
        if ( json_last_error() === JSON_ERROR_NONE && is_array($decoded) ) {
            $_data = $decoded;
        }
    }
    // Sanitize _data array
    if ( is_array($_data) ) {
        $_data = acex_sanitize_options($_data);
    }
    
    $meta_to_update = array();
    $results = array();
    $successful = 0;
    $failed = 0;
    $created = 0;
    $updated = 0;
    $variable_ids = array();
    
    foreach ( $products_data as $index => $product_data ) {
        if ( ! is_array($product_data) ) {
            $results[] = array(
                'index' => $index,
                'error' => true,
                'message' => 'Product data is not an array.'
            );
            $failed++;
            continue;
        }

        if ( isset($product_data['type']) && $product_data['type'] === 'variation' ) {
            if ( (isset($product_data['id']) && ! in_array($product_data['id'], $_data['update_ids'])) &&
                 (isset($product_data['sku']) && ! in_array($product_data['sku'], $_data['update_skus']))
            ) {

               $product_data['parent_id'] = $variable_ids[$product_data['parent_id']] ?? 0;

            }
        }
        $_data['index'] = $index;
        $result = acex_save_full_product($product_data, $_data, $products_data);

        if ( isset($result['meta_to_update']) ) {
            $meta_to_update = array_merge($meta_to_update, $result['meta_to_update']);
        }
        // Handle WP_Error
        if ( is_wp_error($result) ) {
            $results[] = array(
                'index' => $index,
                'error' => true,
                'message' => $result->get_error_message(),
                'code' => $result->get_error_code(),
            );
            $failed++;
            continue;
        }

        if ( $result['creation'] ) $created++;
        else $updated++;

        
        if ( $result['product_type'] === 'variable' && $product_data['id'] ){ 
            $variable_ids[$product_data['id']] = $result['product_id'];
        }

        // Handle array response
        if ( is_array($result) ) {
            // Check if it's an error response
            if ( isset($result['error']) && $result['error'] === true ) {
                $results[] = array(
                    'index' => $index,
                    'error' => true,
                    'message' => $result['message'] ?? 'Unknown error',
                    'code' => $result['code'] ?? 'save_failed',
                    'debug' => $result['debug'] ?? array()
                );
                $failed++;
                continue;
            }

            // Success response with possible warnings
            $results[] = array(
                'index' => $index,
                'error' => false,
                'product_id' => $result['product_id'] ?? null,
                'warnings' => $result['warnings'] ?? array(),
                'debug' => $result['debug'] ?? array()
            );
            $successful++;
            continue;
        }

        // Fallback for unexpected response format
        $results[] = array(
            'index' => $index,
            'error' => true,
            'message' => 'Unexpected response format',
            'code' => 'invalid_response',
            'debug' => $result['debug'] ?? array()
        );
        $failed++;
    }


/*
    // MARK: Update meta in bulk
    // -----------------------------------------------
    if ( ! empty( $meta_to_update ) ) {
        global $wpdb;

        // Prepare multi-row insert
        $values = array();
        $placeholders = array();
        foreach ( $meta_to_update as $meta_key => $meta_value ) {
            $values[] = $saved_id;
            $values[] = $meta_key;
            $values[] = maybe_serialize($meta_value);
            $placeholders[] = "(%d, %s, %s)";
        }
        if ( $placeholders ) {
            $sql = "INSERT INTO {$wpdb->postmeta} (post_id, meta_key, meta_value) VALUES " . implode(',', $placeholders);
            $wpdb->query( $wpdb->prepare( $sql, ...$values ) );
        }

        // Clear meta cache
        wp_cache_delete( $saved_id, 'post_meta' );


    }
    $results[] = ['meta_to_update' => $meta_to_update];
*/
    

    $log_results = array(
        'total' => count($products_data),
        'successful' => $successful,
        'failed' => $failed,
        'created' => $created,
        'updated' => $updated,
    );
	acex_log('--------------------------------------------------------', 'report');
    acex_log('📦 total products : '. count($products_data), 'report');
    acex_log('✅ successful     : '. $successful, 'report');
    acex_log('⛔ failed         : '. $failed, 'report');
    acex_log('➕ created        : '. $created, 'report');
    acex_log('✏️ updated        : '. $updated, 'report');
	acex_log('--------------------------------------------------------', 'report');
    foreach ( $results as $res ) {
        if ( isset($res['error']) && $res['error'] ) {
            acex_log('❌ (row ' . ($res['index'] + 3) . ') ' . $res['message'], 'report');
        }
    }
    acex_log('--------------------------------------------------------', 'report');
    foreach ( $results as $res ) {
        if ( isset($res['warnings']) && is_array($res['warnings']) && count($res['warnings']) > 0 ) {
            foreach ( $res['warnings'] as $warning ) {
                acex_log('⚠️ (row ' . ($res['index'] + 3) . ') ' . $warning, 'report');
            }
        }
    }
	acex_log('--------------------------------------------------------', 'report');
    


    // Send summary with results
    wp_send_json_success(array(
        'results' => $results,
        'summary' => array(
            'total' => count($products_data),
            'successful' => $successful,
            'failed' => $failed,
            'created' => $created,
            'updated' => $updated,
        )
    ));
}





/** MARK: Save Product
 * Save full product data from the format returned by acex_get_full_product
 * 
 * @param array $product_data Full product data array
 * @return int|WP_Error Product ID on success or WP_Error on failure
 */
function acex_save_full_product( $product_data, &$_data=array(), $products_data = array() ) {
    global $acex_protected_keys;

    //error_log('=== ACEX Save Product: ' . ($product_data['name'] ?? 'unnamed') . ' (ID: ' . ($product_data['id'] ?? 'new') . ') ===');

    if ( ! is_array( $product_data ) ) {
        //error_log('ERROR: Product data is not an array');
        return new WP_Error( 'invalid_data', 'Product data must be an array' );
    }

    //$debug['_data'] = $_data;
    //$debug['products_data'] = $products_data;

    
    // Ensure $_data is always an array (decode if JSON string)
    if ( is_string( $_data ) ) {
        $decoded = json_decode(stripslashes($_data), true);
        if ( json_last_error() === JSON_ERROR_NONE && is_array($decoded) ) {
            $_data = $decoded;
        }
    }
    if ( ! is_array( $_data ) ) {
        $_data = array();
    }

    $post_updates = array();
    $warnings = array();
    $creation = false;


    // MARK: ID - SKU
    // ----------------------------------------------------------

    // Determine if we're updating or creating
    $product_id = isset( $product_data['id'] ) ? absint( $product_data['id'] ) : 0;
    $product_type = isset( $product_data['type'] ) ? sanitize_text_field( $product_data['type'] ) : 'simple';
    if ( ! empty( $product_type ) && ! is_string( $product_type ) ) {
        //$product_type = 'simple';
    }
    if ( $product_id ) {
        $product_data['original_id'] = $product_id;
    }

    

    // Check if SKU is in $_data['update_skus']
    $sku = isset($product_data['sku']) ? $product_data['sku'] : '';
    $update_skus = isset($_data['update_skus']) && is_array($_data['update_skus']) ? $_data['update_skus'] : array();

    


    if ( ! empty( $sku ) && in_array( $sku, $update_skus ) ) {
        $product_id = wc_get_product_id_by_sku( $sku );
        
        $_data['update_ids'][] = $product_id;
        //error_log('Found existing product by SKU: ' . $product_id);
    }


    $row = $_data['index'] ?? null;
    $row += 3;    
    




    // Get or create product object
    if ( $product_id && 
         ( ! isset($_data['import_as_new']) || ! $_data['import_as_new'] ) &&
         ( isset($_data['update_ids']) &&
           in_array($product_id, $_data['update_ids']) )
    ) {

        $product = wc_get_product( $product_id );
        if ( ! $product ) {
            //error_log('ERROR: Product not found for ID: ' . $product_id);
            return new WP_Error( 'product_not_found', 'Product not found' );
        }
        //error_log('=== Update :' . $product_id . ' === ' . $product_data['sku']);


    } else {
        // Only create if product name and type are provided
        if ( empty( $product_data['name'] ) || empty( $product_type ) ) {
            //error_log('ERROR: Missing product name or type for new product');
            //error_log('ERROR name: ' . $product_data['name']);
            //error_log('ERROR type: ' . $product_type);
            return new WP_Error( 'missing_data',  ( $product_data['name'] ?? $product_data['slug'] ?? $product_data[0] ?? '') . '<br>Product name and type are required to create a new product.' );
        }
        // Create new product based on type
        $class_name = WC_Product_Factory::get_product_classname( $product_id, $product_type );
        $product = new $class_name();

        $creation = true;

//error_log('=== Create :' . $product_id . ' ===' . $product_data['sku']);
    }
    

    if ( $product_data['sku'] == '07.01.0014' ) {
        //$warnings[] = $product_id . ' test warning.';
    }


    // MARK: SKU - Check for conflicts
    if ( isset( $product_data['sku'] ) ) {
        $sku = sanitize_text_field( $product_data['sku'] );
        if ( ! empty( $sku ) ) {
            $existing_id = wc_get_product_id_by_sku( $sku );
            // Check if SKU exists for a different product
            if ( $existing_id && $existing_id !== $product_id ) {
                //error_log('WARNING: SKU conflict - "' . $sku . '" exists for product ID ' . $existing_id);
                $warnings[] = sprintf( 
                    'SKU "%s" already exists for product ID %d and was not updated.', 
                    $sku, 
                    $existing_id 
                );
            } else {
                $product->set_sku( $sku );
            }
        } else {
            $product->set_sku( '' );
        }
    }





/*
error_log('===========================================');
error_log( print_r( $_data['update_ids'], true ) );
error_log('===========================================');
return array(
    'success' => true,
    'product_id' => $product_data['id'],
    'warnings'   => $product_data['manage_stock'],
    'debug'      => (bool) $product_data['manage_stock'],
);
*/




    try {

        // MARK: Core
        // ───────────────────────────────────────
        if ( isset( $product_data['name'] ) ) {
            $product->set_name( sanitize_text_field( $product_data['name'] ) );
        }
        
        if ( isset( $product_data['slug'] ) ) {
            $product->set_slug( sanitize_title( $product_data['slug'] ) );
        }
        
        if ( isset( $product_data['status'] ) ) {
            $product->set_status( sanitize_text_field( $product_data['status'] ) );
        }
        
        if ( isset( $product_data['description'] ) ) {
            $product->set_description( wp_kses_post( $product_data['description'] ) );
        }
        
        if ( isset( $product_data['short_description'] ) ) {
            $product->set_short_description( wp_kses_post( $product_data['short_description'] ) );
        }

        if ( isset( $product_data['date_created'] ) ) {
            $timestamp = strtotime( $product_data['date_created'] );
            if ( $timestamp !== false ) {
                $post_updates['post_date'] = gmdate( 'Y-m-d H:i:s', $timestamp );
                $post_updates['post_date_gmt'] = gmdate( 'Y-m-d H:i:s', $timestamp );
            }
        }

        if ( isset( $product_data['date_modified'] ) ) {
            $timestamp = strtotime( $product_data['date_modified'] );
            if ( $timestamp !== false ) {
                $post_updates['post_modified'] = gmdate( 'Y-m-d H:i:s', $timestamp );
                $post_updates['post_modified_gmt'] = gmdate( 'Y-m-d H:i:s', $timestamp );
            }
        }

        if ( isset( $product_data['author_id'] ) ) {
            $post_updates['post_author'] = absint( $product_data['author_id'] );
        }

 

        
        
        // MARK: Pricing
        // ───────────────────────────────────────
        if ( isset( $product_data['price'] ) ) {
            //$product->set_price( $product_data['price'] );
        }

        if ( isset( $product_data['regular_price'] ) ) {
            $product->set_regular_price( $product_data['regular_price'] );
        }
        
        if ( isset( $product_data['sale_price'] ) ) {
            if ( ! $product_data['sale_price'] ) {
                $product_data['sale_price'] = '';
            }
            $product->set_sale_price( $product_data['sale_price'] );
        }
        
        if ( isset( $product_data['date_on_sale_from'] ) ) {
            $product->set_date_on_sale_from( $product_data['date_on_sale_from'] );
        }
        
        if ( isset( $product_data['date_on_sale_to'] ) ) {
            $product->set_date_on_sale_to( $product_data['date_on_sale_to'] );
        }
        
        if ( isset( $product_data['sale_price'] ) ) {
            // Clear sale dates if empty sale price was provided
            if ( empty( $product_data['sale_price'] ) ) {
                $product->set_date_on_sale_from( '' );
                $product->set_date_on_sale_to( '' );
            }
        }

        // Force price recalculation by explicitly calling the method
        if ( isset( $product_data['regular_price'] ) || isset( $product_data['sale_price'] ) ) {
            $sale_price = $product->get_sale_price();
            $regular_price = $product->get_regular_price();
            
            // Check if sale price is valid and sale dates are active
            if ( $sale_price !== '' && $product->is_on_sale() ) {
                $product->set_price( $sale_price );
            } else {
                $product->set_price( $regular_price );
            }
        }



        if ( isset( $product_data['total_sales'] ) ) {
            $product->set_total_sales( absint( $product_data['total_sales'] ) );
        }
        
        if ( isset( $product_data['tax_status'] ) ) {
            $product->set_tax_status( sanitize_text_field( $product_data['tax_status'] ) );
        }
        
        if ( isset( $product_data['tax_class'] ) ) {
            $product->set_tax_class( sanitize_text_field( $product_data['tax_class'] ) );
        }
        


        
        // MARK: Stock / Inventory
        // ───────────────────────────────────────

        if ( isset( $product_data['manage_stock'] ) ) {
            $product->set_manage_stock( (bool) $product_data['manage_stock'] );
        }
        
        if ( isset( $product_data['stock_quantity'] ) ) {
            $product->set_stock_quantity( $product_data['stock_quantity'] );
        }
        
        if ( isset( $product_data['stock_status'] ) ) {
            $product->set_stock_status( sanitize_text_field( $product_data['stock_status'] ) );
        }
        
        if ( isset( $product_data['backorders'] ) ) {
            $product->set_backorders( sanitize_text_field( $product_data['backorders'] ) );
        }
        
        if ( isset( $product_data['sold_individually'] ) ) {
            $product->set_sold_individually( (bool) $product_data['sold_individually'] );
        }
        
        if ( isset( $product_data['low_stock_amount'] ) ) {
            $product->set_low_stock_amount( $product_data['low_stock_amount'] );
        }
        

    
        // MARK: Shipping
        // ───────────────────────────────────────
        if ( isset( $product_data['weight'] ) ) {
            $product->set_weight( $product_data['weight'] );
        }
        
        if ( isset( $product_data['length'] ) ) {
            $product->set_length( $product_data['length'] );
        }
        
        if ( isset( $product_data['width'] ) ) {
            $product->set_width( $product_data['width'] );
        }
        
        if ( isset( $product_data['height'] ) ) {
            $product->set_height( $product_data['height'] );
        }
        // Set shipping class by slug if provided
        if ( isset( $product_data['shipping_class_slug'] ) && ! empty( $product_data['shipping_class_slug'] ) ) {
            // Handle URL-decoded slugs
            $slug = urldecode( $product_data['shipping_class_slug'] );
            $shipping_class = get_term_by( 'slug', $slug, 'product_shipping_class' );
            if ( $shipping_class && ! is_wp_error( $shipping_class ) ) {
                $product->set_shipping_class_id( absint( $shipping_class->term_id ) );
            }
        } elseif ( isset( $product_data['shipping_class_id'] ) ) {
            $product->set_shipping_class_id( absint( $product_data['shipping_class_id'] ) );
        }




        
        
    
        // MARK: Virtual / Downloadable
        // ───────────────────────────────────────
        if ( isset( $product_data['virtual'] ) ) {
            $product->set_virtual( (bool) $product_data['virtual'] );
        }
        
        if ( isset( $product_data['downloadable'] ) ) {
            $product->set_downloadable( (bool) $product_data['downloadable'] );
        }
        
        if ( isset( $product_data['downloads'] ) && is_array( $product_data['downloads'] ) ) {
            $product->set_downloads( $product_data['downloads'] );
        }
        
        if ( isset( $product_data['download_limit'] ) ) {
            $product->set_download_limit( absint( $product_data['download_limit'] ) );
        }
        
        if ( isset( $product_data['download_expiry'] ) ) {
            $product->set_download_expiry( absint( $product_data['download_expiry'] ) );
        }
     



        // MARK: Linked products
        // ───────────────────────────────────────
        if ( isset( $product_data['upsell_ids'] ) && is_array( $product_data['upsell_ids'] ) ) {
            $product->set_upsell_ids( array_map( 'absint', $product_data['upsell_ids'] ) );
        }
        if ( isset( $product_data['cross_sell_ids'] ) && is_array( $product_data['cross_sell_ids'] ) ) {
            $product->set_cross_sell_ids( array_map( 'absint', $product_data['cross_sell_ids'] ) );
        }
        if ( $product->is_type( 'grouped' ) && isset( $product_data['grouped_products'] ) && is_array( $product_data['grouped_products'] ) ) {
            $product->set_children( array_map( 'absint', $product_data['grouped_products'] ) );
        }
        


        // MARK: External product data
        // ───────────────────────────────────────
        if ( $product->is_type( 'external' ) ) {
            if ( isset( $product_data['product_url'] ) ) {
                $product->set_product_url( esc_url_raw( $product_data['product_url'] ) );
            }
            if ( isset( $product_data['button_text'] ) ) {
                $product->set_button_text( sanitize_text_field( $product_data['button_text'] ) );
            }
        }

 
    

        // MARK: Reviews
        // ───────────────────────────────────────
        if ( isset( $product_data['reviews_allowed'] ) ) {
            $product->set_reviews_allowed( (bool) $product_data['reviews_allowed'] );
        }
        if ( isset( $product_data['review_count'] ) ) {
            $product->set_review_count( absint( $product_data['review_count'] ) );
        }
        if ( isset( $product_data['average_rating'] ) ) {
            $product->set_average_rating( floatval( $product_data['average_rating'] ) );
        }
        if ( isset( $product_data['rating_counts'] ) && is_array( $product_data['rating_counts'] ) ) {
            $product->set_rating_counts( array_map( 'absint', $product_data['rating_counts'] ) );
        }


 
    
        // MARK: Images
        // ───────────────────────────────────────
        if ( isset( $product_data['image_id'] ) ) {
            $product->set_image_id( absint( $product_data['image_id'] ) );
        } elseif ( isset( $product_data['images'] ) && is_array( $product_data['images'] ) && ! empty( $product_data['images'] ) ) {
            // Set first image as featured image
            $first_image = reset( $product_data['images'] );
            if ( isset( $first_image['id'] ) ) {
                $product->set_image_id( absint( $first_image['id'] ) );
            }
        }
        
        if ( isset( $product_data['gallery_image_ids'] ) && is_array( $product_data['gallery_image_ids'] ) ) {
            $product->set_gallery_image_ids( array_map( 'absint', $product_data['gallery_image_ids'] ) );
        } elseif ( isset( $product_data['images'] ) && is_array( $product_data['images'] ) && count( $product_data['images'] ) > 1 ) {
            // Set remaining images as gallery
            $gallery_ids = array();
            foreach ( array_slice( $product_data['images'], 1 ) as $image ) {
                if ( isset( $image['id'] ) ) {
                    $gallery_ids[] = absint( $image['id'] );
                }
            }
            $product->set_gallery_image_ids( $gallery_ids );
        }




        // MARK: Misc
        // ───────────────────────────────────────
        if ( isset( $product_data['menu_order'] ) ) {
            $product->set_menu_order( absint( $product_data['menu_order'] ) );
        }
        if ( isset( $product_data['catalog_visibility'] ) ) {
            $product->set_catalog_visibility( sanitize_text_field( $product_data['catalog_visibility'] ) );
        }
        if ( isset( $product_data['featured'] ) ) {
            $product->set_featured( (bool) $product_data['featured'] );
        }
        if ( isset( $product_data['purchase_note'] ) ) {
            $product->set_purchase_note( wp_kses_post( $product_data['purchase_note'] ) );
        }


        


        // MARK: Attributes and Variations
        // ───────────────────────────────────────
        if ( ! isset($_data['ignoreAttributes']) || ! $_data['ignoreAttributes'] ) {
            
            //acex_log('--------------------------------------------------------', 'import-attributes');
            //acex_log( $product_data['attributes'], 'import-attributes' );

            if ( isset( $product_data['attributes'] ) ) {
                // If attributes is a JSON string, decode it
                if (is_string($product_data['attributes'])) {
                    $decoded_attributes = json_decode(stripslashes($product_data['attributes']), true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded_attributes)) {
                        $product_data['attributes'] = $decoded_attributes;
                    } else {
                        $product_data['attributes'] = array();
                    }
                }
                if (!is_array($product_data['attributes'])) {
                    $product_data['attributes'] = array();
                }
                $attributes = array();



                foreach ( $product_data['attributes'] as $attribute_data ) {
                    if ( ! is_array( $attribute_data ) ) {
                        continue;
                    }
                    
                    $attribute_name = $attribute_data['name'] ?? '';
                    if ( empty( $attribute_name ) ) {
                        continue;
                    }
                    
                    $attribute = new WC_Product_Attribute();

                    // Check if it's a taxonomy attribute (starts with pa_)
                    if ( strpos( $attribute_name, 'pa_' ) === 0 || isset( $attribute_data['taxonomy'] ) ) {
                        // Taxonomy attribute
                        $taxonomy_name = $attribute_data['taxonomy'] ?? $attribute_name;
                        $attribute->set_id( wc_attribute_taxonomy_id_by_name( $taxonomy_name ) );
                        $attribute->set_name( $taxonomy_name );
                        
                        // For taxonomy attributes, options should be term slugs or IDs
                        $options = $attribute_data['options'] ?? array();
                        if ( ! empty( $options ) && is_array( $options ) ) {
                            // Get term IDs from slugs/names
                            $term_ids = array();
                            foreach ( $options as $option ) {
                                // Try to get term by slug first
                                $term = get_term_by( 'slug', sanitize_title( $option ), $taxonomy_name );
                                if ( ! $term ) {
                                    // Try by name
                                    $term = get_term_by( 'name', $option, $taxonomy_name );
                                }
                                if ( ! $term ) {
                                    // Create the term if it doesn't exist
                                    $new_term = wp_insert_term( $option, $taxonomy_name, array( 'slug' => sanitize_title( $option ) ) );
                                    if ( ! is_wp_error( $new_term ) ) {
                                        $term_ids[] = $new_term['term_id'];
                                    }
                                } else {
                                    $term_ids[] = $term->term_id;
                                }
                            }
                            $attribute->set_options( $term_ids );
                        }
                    } else {
                        // Custom attribute
                        $attribute->set_name( $attribute_name );
                        $attribute->set_options( $attribute_data['options'] ?? array() );
                    }
                    
                    $attribute->set_position( $attribute_data['position'] ?? 0 );
                    $attribute->set_visible( isset( $attribute_data['visible'] ) ? (bool) $attribute_data['visible'] : true );
                    $attribute->set_variation( isset( $attribute_data['variation'] ) ? (bool) $attribute_data['variation'] : false );
                    
                    $attributes[] = $attribute;
                }
                
                $product->set_attributes( $attributes );
            }

            
            if ( $product->is_type( 'variable' ) && isset( $product_data['default_attributes'] ) && is_array( $product_data['default_attributes'] ) ) {
                $product->set_default_attributes( $product_data['default_attributes'] );
            }
        }
        




        // MARK: Variation-specific data
        // ───────────────────────────────────────
        if ( $product->is_type( 'variation' ) ) {
            
            if ( isset( $product_data['parent_id'] ) ) {
                $product->set_parent_id( absint( $product_data['parent_id'] ) );
            }
            if ( ! isset($_data['ignoreAttributes']) || ! $_data['ignoreAttributes'] ) {
                if ( isset( $product_data['attribute_values'] ) ) {
                    // If attribute_values is a JSON string, decode it
                    if (is_string($product_data['attribute_values'])) {
                        $decoded_attr_values = json_decode(stripslashes($product_data['attribute_values']), true);
                        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded_attr_values)) {
                            $product_data['attribute_values'] = $decoded_attr_values;
                        } else {
                            $product_data['attribute_values'] = array();
                        }
                    }
                    if (!is_array($product_data['attribute_values'])) {
                        $product_data['attribute_values'] = array();
                    }
                    // Process attribute values for variation
                    $variation_attributes = array();
                    
                    foreach ( $product_data['attribute_values'] as $attr_key => $attr_value ) {
                        

                        // Check if it's a taxonomy attribute (starts with pa_)
                        if ( strpos( $attr_key, 'pa_' ) === 0 ) {
                            // For taxonomy attributes, we need to use the term slug
                            // Get the term to ensure it exists and get proper slug
                            $term = get_term_by( 'slug', sanitize_title( $attr_value ), $attr_key );
                            if ( ! $term ) {
                                // Try by name
                                $term = get_term_by( 'name', $attr_value, $attr_key );
                            }
                            if ( ! $term ) {
                                // Create the term if it doesn't exist
                                $new_term = wp_insert_term( $attr_value, $attr_key, array( 'slug' => sanitize_title( $attr_value ) ) );
                                if ( ! is_wp_error( $new_term ) ) {
                                    $term = get_term( $new_term['term_id'], $attr_key );
                                }
                            }
                            

                            $attr_key = strtolower(urlencode($attr_key));


                            // Use the term slug for the attribute value
                            if ( $term && ! is_wp_error( $term ) ) {
                                $variation_attributes[ $attr_key ] = $term->slug;
                            } else {
                                // Fallback to sanitized value if term handling fails
                                $variation_attributes[ $attr_key ] = sanitize_title( $attr_value );
                            }
                        } else {
                            // For custom attributes, use the value as-is (but sanitized)
                            $variation_attributes[ $attr_key ] = sanitize_text_field( $attr_value );
                        }
                    }
                    
                    if ( ! $product->get_id() ) { $product->save(); }
                    $product->set_attributes( $variation_attributes );
                    /*
                    foreach ( $variation_attributes as $attr_key => $attr_value ) {
                        update_post_meta( $product->get_id(), 'attribute_' . $attr_key, $attr_value );
                    }
                    */
                }
            }
          



            // MARK: Sync Variations


            $parent_id = $product->get_parent_id();
            if ( $parent_id ) {

                // Find parent in current products_data by original_id
                $original_parent = array_reduce($products_data, fn($carry, $pd) => $carry ?: (isset($pd['id']) && $pd['id'] == $parent_id ? $pd : null), null);
                $parent_sku = $original_parent['sku'] ?? '';
                $parent_slug = $original_parent['slug'] ?? '';

                $debug['sync'][] = $parent_id;
                // Get parent product
                // If parent not found by ID, try to find by SKU or slug
                if ( isset($parent_sku) && !empty($parent_sku) ) {
                    $parent_id = wc_get_product_id_by_sku( $parent_sku );
                    if ( $parent_id ) {
                        $parent = wc_get_product( $parent_id );
                        $product->set_parent_id( $parent_id );
                        $debug['sync'][] = 'Found parent by SKU: ' . $parent_sku;
                    }
                }
                if ( ! $parent && isset($parent_slug) && !empty($parent_slug) ) {
                    $parent_post = get_page_by_path( $parent_slug, OBJECT, 'product' );
                    if ( $parent_post ) {
                        $parent = wc_get_product( $parent_post->ID );
                        $product->set_parent_id( $parent_post->ID );
                        $debug['sync'][] = 'Found parent by slug: ' . $parent_slug;
                    }
                }
                if ( ! $parent ) {
                    $parent = wc_get_product( $parent_id );
                }
                if ( $parent && $parent->is_type( 'variable' ) ) {
                    $debug['sync'][] = $parent_id . ' is variable';
                    // Sync the parent to update its variation children list
                    WC_Product_Variable::sync( $parent );
                    
                    // Clear parent cache
                    wc_delete_product_transients( $parent_id );
                    
                } else {
                    $debug['sync'][] = $parent_id . ' is not variable';
                }
            }
        }



        
        // MARK: Save Product
        // ───────────────────────────────────────
        // Save the product to get an ID if it's new
        $saved_id = $product->save();

//error_log('=== Save :' . $saved_id . ' ===');





        // MARK: Taxonomies
        // ───────────────────────────────────────
        $taxonomies = acex_get_taxonomies();
        foreach ( $taxonomies as $key => $taxonomy ) {

            if ( isset( $product_data[$key] ) && ! empty( $product_data[$key] ) ) {
                $slugs = array();
                
                // Convert to array if it's a string (comma or newline separated)
                if ( is_string( $product_data[$key] ) ) {
                    // Try newline separation first
                    if ( strpos( $product_data[$key], "\n" ) !== false ) {
                        $slugs = array_map( 'trim', explode( "\n", $product_data[$key] ) );
                    } else {
                        // Fall back to comma separation
                        $slugs = array_map( 'trim', explode( ',', $product_data[$key] ) );
                    }
                } elseif ( is_array( $product_data[$key] ) ) {
                    $slugs = $product_data[$key];
                }
                
                // Filter out empty values
                $slugs = array_filter( $slugs );

                if ( ! empty( $slugs ) ) {
                    wp_set_object_terms( $saved_id, $slugs, $taxonomy->query_var );
                }
            }
        }








        // MARK: Meta Data
        // ───────────────────────────────────────
        $meta_to_update = array();
        foreach ( $product_data as $meta_key => $meta_value ) {
            // Skip protected WooCommerce meta that should be set via product methods
            if ( ! in_array( $meta_key, $acex_protected_keys ) &&
                 ! in_array( "_".$meta_key, $acex_protected_keys ) ) {
                if (strpos($meta_key, 'pa_') === 0) continue; // skip attribute taxonomies
                if (in_array($meta_key, ['product_cat', 'product_tag'], true)) continue; // skip main taxonomies

                $product->update_meta_data( $meta_key, $meta_value );
                $meta_to_update[$meta_key] = $meta_value;

            }
            if ( ! empty( $meta_to_update ) ) {
                $product->save_meta_data();
            }
        }






        // Update post fields if needed
        if ( ! empty( $post_updates ) ) {
            $post_updates['ID'] = $saved_id;
            wp_update_post( $post_updates );
        }

        //error_log('SUCCESS: Product saved with ID ' . $saved_id . ( ! empty( $warnings ) ? ' (with warnings)' : '' ));

        // Return success with warnings if any
        $result = array(
            'success' => true,
            'product_id' => $product->get_id(),
            'product_type' => $product->get_type(),
            'meta_to_update' => $meta_to_update,
            'creation' => $creation,
        );
        if ( ! empty( $warnings ) ) {
            $result['warnings'] = $warnings;
        }
        if ( ! empty( $debug ) ) {
            $result['debug'] = $debug;
        }
        
        return $result;
        
    } catch ( Exception $e ) {
        //error_log('EXCEPTION: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
        
        return array(
            'success' => false,
            'error' => true,
            'message' => $e->getMessage(),
            'code' => 'save_failed',
            'creation' => $creation,
        );
    }
}











// MARK: Product That Has
// ----------------------------------------------------------




add_action( 'wp_ajax_acex_get_product_that_has', 'ajax_acex_get_product_that_has' );

/**
 * AJAX handler for getting the newest product with a property
 */
function ajax_acex_get_product_that_has() {
    acex_ajax_security();


    
    $property = isset($_POST['property']) ? sanitize_text_field(wp_unslash($_POST['property'])) : '';
    
    // Parse args - it comes as JSON string from JavaScript
    $args = array();
    if ( isset($_POST['args']) ) {
        $args_json = wp_unslash($_POST['args']);
        $args = json_decode($args_json, true);
        if ( json_last_error() !== JSON_ERROR_NONE ) {
            $args = array();
        } else {
            // Sanitize the args array
            $args = acex_sanitize_options($args);
        }
    }
    
    if ( empty($property) ) {
        wp_send_json_error(array('message' => 'Property parameter is required.'));
        return;
    }
    
    // Call the main function
    $product_id = acex_get_product_that_has($property, $args);

    if ( $product_id ) {

        wp_send_json_success( acex_get_product( $product_id ) );

    } else {
        $result = $product_id;
        if ( is_array( $product_id ) && $product_id['error'] ) {
            $result = $product_id['result'];
        }

        wp_send_json_error(array(
            'message' => 'No product found with the specified property.',
            'property' => $property,
            'args' => $args,
            'result' => $result,
        ));
    }
}






/**
 * Get the newest product that has a value for the specified property
 * Uses direct database query for efficiency
 * 
 * @param string $property The property/meta key to check for (e.g., 'images', '_price', '_sku')
 * @param array  $args Optional arguments (status)
 * @return WC_Product|null The newest product with the property, or null if none found
 */
function acex_get_product_that_has( $property, $args = array() ) {
    global $wpdb;

    $debug = array();
    
    $defaults = array(
        'status' => 'publish',
    );
    $args = wp_parse_args( $args, $defaults );

    $taxonomies = acex_get_taxonomies();

    // Special handling for common non-meta properties
    if ( $property === 'images' ) {
        // Query for products with featured image (thumbnail)
        $sql = $wpdb->prepare(
            "SELECT p.ID 
            FROM {$wpdb->posts} p
            INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
            WHERE p.post_type = 'product'
            AND p.post_status = %s
            AND pm.meta_key = '_thumbnail_id'
            AND pm.meta_value != ''
            AND pm.meta_value IS NOT NULL
            ORDER BY p.post_date DESC
            LIMIT 1",
            $args['status']
        );
        
        $product_id = $wpdb->get_var( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Complex JOIN query to find products with images, prepared via $wpdb->prepare(), no WP API equivalent
        
        if ( $product_id ) {
            return $product_id;
        }
        return null;
        
    } elseif ( $property === 'description' ) {
        // Query for products with non-empty post_content
        $sql = $wpdb->prepare(
            "SELECT ID 
            FROM {$wpdb->posts}
            WHERE post_type = 'product'
            AND post_status = %s
            AND post_content != ''
            AND post_content IS NOT NULL
            ORDER BY post_date DESC
            LIMIT 1",
            $args['status']
        );
        
        $product_id = $wpdb->get_var( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Optimized query to find products with description, prepared via $wpdb->prepare(), caching not suitable for preview queries
        
        if ( $product_id ) {
            return $product_id;
        }
        return null;
        
    } elseif ( $property === 'short_description' ) {
        // Query for products with non-empty post_excerpt
        $sql = $wpdb->prepare(
            "SELECT ID 
            FROM {$wpdb->posts}
            WHERE post_type = 'product'
            AND post_status = %s
            AND post_excerpt != ''
            AND post_excerpt IS NOT NULL
            ORDER BY post_date DESC
            LIMIT 1",
            $args['status']
        );
        
        $product_id = $wpdb->get_var( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Optimized query to find products with short description, prepared via $wpdb->prepare(), caching not suitable for preview queries
        
        if ( $product_id ) {
            return $product_id;
        }
        return null;
        
    } elseif ( array_key_exists( $property, $taxonomies ) ) {
        // Query for products with the specified taxonomy
        $taxonomy = $taxonomies[$property];
        $sql = $wpdb->prepare(
            "SELECT p.ID 
            FROM {$wpdb->posts} p
            INNER JOIN {$wpdb->term_relationships} tr ON p.ID = tr.object_id
            INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
            WHERE p.post_type = 'product'
            AND p.post_status = %s
            AND tt.taxonomy = %s
            ORDER BY p.post_date DESC
            LIMIT 1",
            $args['status'],
            $taxonomy->query_var
        );
        
        $product_id = $wpdb->get_var( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Complex JOIN query to find products with specific taxonomy, prepared via $wpdb->prepare(), no WP API equivalent
        
        if ( $product_id ) {
            return $product_id;
        }
        return null;
    
    }
    
    // For all other properties, query postmeta
    // Try with the property as-is first
    $meta_key = $property;
    
    $sql = $wpdb->prepare(
        "SELECT p.ID 
        FROM {$wpdb->posts} p
        INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
        WHERE p.post_type = 'product'
        AND p.post_status = %s
        AND pm.meta_key = %s
        AND pm.meta_value != ''
        AND pm.meta_value != '[]'
        AND pm.meta_value != 'a:0:{}'
        AND pm.meta_value IS NOT NULL
        ORDER BY p.post_date DESC
        LIMIT 1",
        $args['status'],
        $meta_key
    );
    
    
    $product_id = $wpdb->get_var( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Complex JOIN query to find products with specific meta key, prepared via $wpdb->prepare(), caching not suitable for preview queries
    
    // If not found and property doesn't start with underscore, try with underscore prefix
    if ( ! $product_id && strpos( $property, '_' ) !== 0 ) {
        $meta_key = '_' . $property;
        
        $sql = $wpdb->prepare(
            "SELECT p.ID 
            FROM {$wpdb->posts} p
            INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
            WHERE p.post_type = 'product'
            AND p.post_status = %s
            AND pm.meta_key = %s
            AND pm.meta_value != ''
            AND pm.meta_value != '[]'
            AND pm.meta_value != 'a:0:{}'
            AND pm.meta_value IS NOT NULL
            ORDER BY p.post_date DESC
            LIMIT 1",
            $args['status'],
            $meta_key
        );
        
        $product_id = $wpdb->get_var( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Complex JOIN query to find products with underscore-prefixed meta key, prepared via $wpdb->prepare(), caching not suitable for preview queries
    }
    
    if ( $product_id ) {
        return $product_id;
    }
    
    return array(
        'error' => 'no_product_found',
        //'result' => $debug
    );
}






