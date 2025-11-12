<?php





add_action( 'wp_ajax_acex_get_product', 'ajax_acex_get_product' );
add_action( 'wp_ajax_acex_get_preview_products', 'ajax_acex_get_preview_products' );

/**








// MARK: AJAX Get
/** 
 * AJAX handler for getting full product data
 */
function ajax_acex_get_product() {
    // Security check
    check_ajax_referer('acex_nonce', 'nonce');
    
    if (!current_user_can('edit_products')) {
        wp_send_json_error(array('message' => __('You do not have sufficient permissions.', 'actus-excel-for-woo')));
        return;
    }
    
    $product_id = isset($_POST['product_id']) ? absint(wp_unslash($_POST['product_id'])) : 0;
    
    if ( ! $product_id ) {
        wp_send_json_error(array('message' => __('Product ID is required.', 'actus-excel-for-woo')));
        return;
    }
    
    // Call the main function
    $product_data = acex_get_product($product_id);
    
    if ( is_wp_error($product_data) ) {
        wp_send_json_error(array(
            'message' => $product_data->get_error_message(),
            'code' => $product_data->get_error_code()
        ));
    } else {
        wp_send_json_success(array('product' => $product_data));
    }
}




// MARK: AJAX Preview
/**
 * AJAX handler for getting preview products
 */
function ajax_acex_get_preview_products() {
    // Security check
    check_ajax_referer('acex_nonce', 'nonce');
    
    if (!current_user_can('edit_products')) {
        wp_send_json_error(array('message' => __('You do not have sufficient permissions.', 'actus-excel-for-woo')));
        return;
    }
    
    $count = isset($_POST['count']) ? absint(wp_unslash($_POST['count'])) : 5;
    $product_ids = isset($_POST['ids']) ? wp_unslash($_POST['ids']) : '';

    // Sanitize product IDs if provided
    if ( ! empty($product_ids) ) {
        // Handle JSON string
        if ( is_string($product_ids) ) {
            $decoded = json_decode($product_ids, true);
            if ( json_last_error() === JSON_ERROR_NONE && is_array($decoded) ) {
                $product_ids = $decoded;
            }
        }
        
        // Sanitize array of IDs if it's an array
        if ( is_array($product_ids) ) {
            $product_ids = array_map('absint', $product_ids);
            $product_ids = array_filter($product_ids); // Remove zeros
        } else {
            $product_ids = '';
        }
    }

	if ( ! $product_ids ) {
		$args = array(
			'post_type'      => 'product',
			'posts_per_page' => $count,
			'orderby'        => 'date',
			'order'          => 'DESC',
			'fields'         => 'ids',
			'post_status'    => array('publish', 'draft', 'pending', 'private', 'future'),
		);
        $result = get_posts($args);
        
        // Ensure we have valid product IDs
        if ( is_array( $result ) && ! empty( $result ) ) {
            $product_ids = array_map( 'absint', $result );
            $product_ids = array_filter( $product_ids );
        } else {
            $product_ids = array();
        }
	}


    // Call the main function
	$response = acex_get_multiple_products( $product_ids );
	$products = $response['products'];


    
    if ( is_wp_error($products) ) {
        wp_send_json_error(array(
            'message' => $products->get_error_message(),
            'code' => $products->get_error_code()
        ));
    } else {
        wp_send_json_success(array('products' => $products));
    }

}






// MARK: Get Multiple Products
/** 
 * Get multiple products by IDs with options for chunking and error handling
 * 
 * @param array $product_ids Array of product IDs to fetch
 * @param array $options Options array:
 *   - chunk_size: Number of products to process per chunk (default 50)
 *   - skip_errors: Whether to skip products that cause errors (default true)
 * @return array Array of product data arrays or WP_Error objects
 */
function acex_get_multiple_products( $product_ids, $options = array() ) {
	if ( is_string( $product_ids ) ) {
		// If it's a comma-separated string, convert to array
		if ( strpos( $product_ids, ',' ) !== false ) {
			$product_ids = array_map( 'trim', explode( ',', $product_ids ) );
		}
	}
    if ( ! is_array( $product_ids ) || empty( $product_ids ) ) {
        return new WP_Error( 'invalid_ids', 'Product IDs must be a non-empty array' );
    }


    // Default options
    $defaults = array(
        'chunk_size' => 50,
        'skip_errors' => true,
    );
    $options = wp_parse_args( $options, $defaults );


    // Sanitize product IDs
    $product_ids = array_map( 'absint', $product_ids );
    $product_ids = array_filter( $product_ids ); // Remove zeros
    $product_ids = array_unique( $product_ids ); // Remove duplicates
    
    if ( empty( $product_ids ) ) {
        return new WP_Error( 'invalid_ids', 'No valid product IDs provided' );
    }
    
    $results = array();





    // Pre-load all products efficiently to reduce database queries
    $products_cache = array();
	$variation_ids = array();
	$variations = 0;
	$variable_products = 0;
	$simple_products = 0;
	$grouped_products = 0;
	$external_products = 0;
	$downloadable_products = 0;
    foreach ( $product_ids as $product_id ) {
		try {
			$product = acex_get_product( $product_id, false, false );
            
			if ( $product ) {
				$products_cache[ $product_id ] = $product;

				// Count product types
				if ( isset( $product['type'] ) ) {
					switch ( $product['type'] ) {
						case 'variable':
							$variable_products++;
							break;
						case 'simple':
							$simple_products++;
							break;
						case 'grouped':
							$grouped_products++;
							break;
						case 'external':
							$external_products++;
							break;
					}
				}
                if ( isset( $product['downloadable'] ) && $product['downloadable'] ) {
                    $downloadable_products++;
                }
			
			}

		} catch ( Exception $e ) {
			if ( $options['skip_errors'] ) {
				$results[] = array(
					'product_id' => $product_id,
					'error' => new WP_Error( 'product_error', $e->getMessage() ),
				);
			} else {
				return new WP_Error( 'product_error', "Error processing product {$product_id}: " . $e->getMessage() );
			}
		}
    }

	$product_ids = array_merge( $product_ids, $variation_ids );
     
	$meta_cache = acex_get_multi_meta( $product_ids );

    $taxonomies = acex_get_taxonomies();
	$tax_cache = acex_get_multi_taxonomies( $product_ids, $taxonomies );


    
    // Process products in chunks to manage memory
    $chunks = array_chunk( $product_ids, $options['chunk_size'], true );
    

    foreach ( $chunks as $chunk ) {
        foreach ( $chunk as $product_id ) {
            if ( ! isset( $products_cache[ $product_id ] ) ) {
                if ( $options['skip_errors'] ) {
                    $results[ $product_id ] = new WP_Error( 'product_not_found', "Product {$product_id} not found" );
                    continue;
                } else {
                    return new WP_Error( 'product_not_found', "Product {$product_id} not found" );
                }
            }

			$product = $products_cache[ $product_id ];
	
			// Use cached meta and taxonomy terms
			$product['meta_data'] = $meta_cache[ $product_id ] ?? array();
            
            foreach ( $taxonomies as $tax_key => $tax ) {
                if ( isset( $tax_cache[ $tax_key ][ $product_id ] ) ) {
                    $product[ $tax_key ] = $tax_cache[ $tax_key ][ $product_id ];
                }
            }
			
			$results[] = $product;
     
        }
        
        // Optional: Clear some caches between chunks to manage memory
        // wp_cache_flush();

	}

	$results = array(
		'products' => $results,
	);

	if ( $simple_products > 0 ) $results['simple_products'] = $simple_products;
	if ( $variable_products > 0 ) $results['variable_products'] = $variable_products;
	if ( $variations > 0 ) $results['variations'] = $variations;
	if ( $grouped_products > 0 ) $results['grouped_products'] = $grouped_products;
	if ( $external_products > 0 ) $results['external_products'] = $external_products;
	if ( $downloadable_products > 0 ) $results['downloadable_products'] = $downloadable_products;
	if ( ! empty( $variation_ids ) ) $results['variation_ids'] = $variation_ids;

    return $results;


}




// MARK: Count Variable Products
/**
 * Count variable products from a specific set of product IDs
 * 
 * @param array $product_ids Array of product IDs to check
 * @return int Count of variable products in the provided IDs
 */
function acex_count_variable_products( $product_ids ) {
    if ( empty( $product_ids ) || ! is_array( $product_ids ) ) {
        return 0;
    }
 
    global $wpdb;
    
    $ids_placeholder = implode( ',', array_fill( 0, count( $product_ids ), '%d' ) );
    
    $count = $wpdb->get_var( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Complex JOIN query for counting variable products, no WP API equivalent
        $wpdb->prepare(
            "SELECT COUNT(DISTINCT p.ID) 
            FROM {$wpdb->posts} p
            INNER JOIN {$wpdb->term_relationships} tr ON p.ID = tr.object_id
            INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
            INNER JOIN {$wpdb->terms} t ON tt.term_id = t.term_id
            WHERE p.ID IN ({$ids_placeholder})
            AND p.post_type = 'product'
            AND tt.taxonomy = 'product_type'
            AND t.slug = 'variable'", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            ...$product_ids
        )
    );
    
    return absint( $count );
}



// MARK: Count Variations
/**
 * Count product variations from a specific set of product IDs
 * 
 * @param array $product_ids Array of product IDs to check
 * @return int Count of variations in the provided IDs
 */
function acex_count_variations( $product_ids ) {
    if ( empty( $product_ids ) || ! is_array( $product_ids ) ) {
        return 0;
    }

    global $wpdb;
    
    $ids_placeholder = implode( ',', array_fill( 0, count( $product_ids ), '%d' ) );
    
    $count = $wpdb->get_var( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Optimized query for counting variations in specific set of IDs, no WP API equivalent
        $wpdb->prepare(
            "SELECT COUNT(DISTINCT p.ID) 
            FROM {$wpdb->posts} p
            WHERE p.ID IN ({$ids_placeholder})
            AND p.post_type = 'product_variation'", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            ...$product_ids
        )
    );
    
    return absint( $count );
}






// MARK: Get Product
/** 
 * Get product data including all standard properties, taxonomies, attributes, and meta
 * 
 * @param int $product_id The product ID to fetch
 * @param bool $with_tax Whether to include taxonomies (categories, tags)
 * @param bool $with_meta Whether to include all post meta
 * @return array Full product data array
 */
function acex_get_product( $product_id, $with_tax = true, $with_meta = true ) {

	$product = wc_get_product( $product_id );

    if ( ! $product ) {
        return [
            'error' => 'Product not found',
            'product_id' => $product_id,
        ];
        //return new WP_Error( 'product_not_found', 'Product not found' );
    }


    // Basic product data
    $product_data = array(

        // Core post fields
        'id' 				=> $product->get_id(),
        'name' 				=> $product->is_type('variation') ? wp_strip_all_tags($product->get_name()) : $product->get_name(), // Strip HTML from variations
        //'slug' 				=> $product->get_slug(),
        'status' 			=> $product->get_status(),
        'type' 				=> $product->get_type(),
        'description' 		=> $product->get_description(),
        'short_description'	=> $product->get_short_description(),
        'date_created' 		=> $product->get_date_created() ? $product->get_date_created()->date('Y-m-d H:i:s') : null,
        'date_modified' 	=> $product->get_date_modified() ? $product->get_date_modified()->date('Y-m-d H:i:s') : null,
		'author_id'			=> get_post_field( 'post_author', $product->get_id() ),

        // Pricing
        'price' 			=> $product->get_price(),
        'regular_price' 	=> $product->get_regular_price(),
        'sale_price' 		=> $product->get_sale_price(),
        'date_on_sale_from' => $product->get_date_on_sale_from() ? $product->get_date_on_sale_from()->date('Y-m-d H:i:s') : null,
        'date_on_sale_to' 	=> $product->get_date_on_sale_to() ? $product->get_date_on_sale_to()->date('Y-m-d H:i:s') : null,
		'total_sales'		=> $product->get_total_sales(),
		'tax_status'		=> $product->get_tax_status(),
		'tax_class'			=> $product->get_tax_class(),


        // Stock
        'sku' 				=> $product->get_sku(),
        'manage_stock' 		=> $product->get_manage_stock(),
        'stock_quantity' 	=> $product->get_stock_quantity(),
        'stock_status' 		=> $product->get_stock_status(),
        'backorders' 		=> $product->get_backorders(),
        'sold_individually' => $product->get_sold_individually(),
        'low_stock_amount' 	=> $product->get_low_stock_amount(),
        
        // Shipping
        'weight' 			=> $product->get_weight(),
        'length' 			=> $product->get_length(),
        'width' 			=> $product->get_width(),
        'height' 			=> $product->get_height(),
        'shipping_class' 	=> $product->get_shipping_class(),
        
        // Virtual/Downloadable
        'virtual' 			=> $product->get_virtual(),
        'downloadable' 		=> $product->get_downloadable(),
        'downloads' 		=> $product->get_downloads(),
        'download_limit' 	=> $product->get_download_limit(),
        'download_expiry' 	=> $product->get_download_expiry(),

        // Linked products
        'cross_sell_ids' 	=> $product->get_cross_sell_ids(),
        'upsell_ids' 		=> $product->get_upsell_ids(),
		'grouped_products' 	=> $product->is_type('grouped') ? $product->get_children() : array(),

		// External
		'product_url' 		=> $product->is_type('external') ? $product->get_product_url() : '',
		'button_text' 		=> $product->is_type('external') ? $product->get_button_text() : '',
        
        // Reviews
        'reviews_allowed' 	=> $product->get_reviews_allowed(),
        'average_rating' 	=> $product->get_average_rating(),
        'review_count' 		=> $product->get_review_count(),
        'rating_counts' 	=> $product->get_rating_counts(),

        // Images
        'image_id' 			=> $product->get_image_id(),
        'gallery_image_ids' => $product->get_gallery_image_ids(),

        // Misc
        'menu_order' 		=> $product->get_menu_order(),
        'catalog_visibility'=> $product->get_catalog_visibility(),
        'featured' 			=> $product->get_featured(),
        'purchase_note' 	=> $product->get_purchase_note(),

        // Attributes / Variations
        'attributes' 		=> array(),
		'default_attributes'=> $product->get_default_attributes(),
        'attribute_values'	=> $product->is_type( 'variation' ) ? $product->get_attributes() : array(),
        'parent_id' 		=> $product->get_parent_id(),
        
        // Taxonomies
        'categories' 		=> array(),
        'tags' 				=> array(),

        
        // All meta data
		//'meta_data_raw' 	=> $product->get_meta_data(),

    );


    $product_data['slug'] = $product->get_slug() ? urldecode($product->get_slug()) : urldecode(sanitize_title( $product->get_name() ));





    // Get attributes
	$product_data['attributes'] = acex_get_attributes( $product );




	
    // For grouped products, get children
    if ( $product->is_type( 'grouped' ) ) {
        $product_data['grouped_products'] = $product->get_children();
    }





	if ( $with_tax )  {

		$tax_data = acex_get_product_taxonomies( $product->get_id() );
        foreach ( $tax_data as $tax_key => $tax ) {
            $product_data[ $tax_key ] = $tax_data[ $tax_key ];
        }

	}



    if ( $product && $product->is_type( 'variable' ) ) {
        // Get all variation IDs for this variable product
        $variation_ids = $product->get_children();
        if ( ! empty( $variation_ids ) ) {
            // Add variations right after the parent
            $product_data['variation_ids'] = $variation_ids;
        }
    }


	// Get all meta data
	if ( $with_meta ) {
		
		acex_get_product_meta( $product->get_id() );

	}






    return $product_data;


}

























// MARK: Multi Taxonomies
// Pre-fetch all taxonomy terms for multiple products
function acex_get_multi_taxonomies( $product_ids, $taxonomies ) {

    $all = array();
    $cache = array();
    foreach ( $taxonomies as $tax_key => $tax ) {
        $query_var = $tax->query_var;

        $all[ $tax_key ] = wp_get_object_terms( $product_ids, $query_var, array( 'fields' => 'all_with_object_id' ) );


        // Organize terms by product ID
        $cache[ $tax_key ] = array();
        foreach ( $all[ $tax_key ] as $term ) {
            if ( ! isset( $cache[ $tax_key ][ $term->object_id ] ) ) {
                $cache[ $tax_key ][ $term->object_id ] = array();
            }
            $cache[ $tax_key ][ $term->object_id ][] = array(
                'id' => $term->term_id,
                'name' => $term->name,
                'slug' => $term->slug,
            );
        }

        //error_log( print_r( $cache[ $key ], true ) );
        
    }
    

	return $cache;
}






// MARK: Multi Meta
// Pre-fetch all post meta in a single query for better performance
function acex_get_multi_meta( $product_ids ) {
    global $wpdb;
    $ids_placeholder = implode( ',', array_fill( 0, count( $product_ids ), '%d' ) );
    $meta_query = $wpdb->prepare(
        "SELECT post_id, meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id IN ({$ids_placeholder})", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        ...$product_ids
    );
    $all_meta = $wpdb->get_results( $meta_query ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Bulk fetch all meta for multiple products in single query for performance, caching not suitable for bulk operations
    
	foreach ( $all_meta as $key => $values ) {
		$processed_values = array();
		foreach ( $values as $value ) {
			$processed_values[] = is_serialized( $value ) ? unserialize( $value ) : $value;
		}
		$all_meta[ $key ] = count( $processed_values ) === 1 ? $processed_values[0] : $processed_values;
	}

    //error_log('================================= all_meta');
    //error_log( print_r($all_meta, true) );
    //error_log('=================================');

    // Organize meta by post ID
    $meta_cache = array();
    foreach ( $all_meta as $meta ) {
        if (!isset($meta) || !is_array($meta)) {
			continue;
		}
        if (isset($meta[0], $meta[1], $meta[2])) {
            $id = $meta[0];
            $key = $meta[1];
            $value = $meta[2];
        } else {
            if ( isset( $meta['post_id'] ) ) $id = $meta['post_id'];
            if ( isset( $meta['meta_key'] ) ) $key = $meta['meta_key'];
            if ( isset( $meta['meta_value'] ) ) $value = $meta['meta_value'];
        }

        if ( isset( $id ) && ! isset( $meta_cache[ $id ] ) ) {
            $meta_cache[ $id ] = array();
        }
        if ( isset( $id ) && ! isset( $meta_cache[ $id ][ $key ] ) ) {
            $meta_cache[ $id ][ $key ] = array();
        }
        if ( isset($id) && isset($key) )
            $meta_cache[ $id ][ $key ][] = $value;
    }


	return $meta_cache;

}




























// MARK: Get Product Attributes
/** 
 * Get product attributes in a structured array
 * 
 * @param WC_Product $product The WooCommerce product object
 * @return array Array of attributes with details
 */
function acex_get_attributes( $product ) {
	$result = array();

    $attributes = $product->get_attributes();
	
    // For variations, attributes are just key-value pairs (strings)
    if ( $product->is_type( 'variation' ) ) {
        /*
        foreach ( $attributes as $key => $value ) {
            $result[] = array(
                'name' => $key,
                'value' => $value,
                'variation' => true,
            );
        }
        */
        return [];
        //return $result;
    }

	
    // For other product types, attributes are WC_Product_Attribute objects
    foreach ( $attributes as $attribute ) {
        // Skip if not a valid attribute object
        if ( ! is_object( $attribute ) || ! method_exists( $attribute, 'get_id' ) ) {
            continue;
        }
		
        $attribute_data = array(
            'name' => $attribute->get_name(),
            "label" => wc_attribute_label( $attribute->get_name() ),
            //'value' => '',
            'position' => $attribute->get_position(),
            'visible' => $attribute->get_visible(),
            'variation' => $attribute->get_variation(),
            //'is_taxonomy' => $attribute->is_taxonomy(),
            'options' => array(),
        );

        // If taxonomy attribute, get slugs
        if ( $attribute->is_taxonomy() ) {
            $terms = wc_get_product_terms( $product->get_id(), $attribute->get_taxonomy(), array( 'fields' => 'slugs' ) );
            $attribute_data['options'] = $terms;
        } else {
            // Custom attribute: use raw values, sanitize as slugs
            $options = $attribute->get_options();
            $attribute_data['options'] = array_map( 'sanitize_title', $options );
        }
        
        /*
        // If it's a taxonomy attribute, get the terms
        if ( $attribute->is_taxonomy() ) {
            $attribute_data['taxonomy'] = $attribute->get_taxonomy();
            $terms = wp_get_post_terms( $product->get_id(), $attribute->get_taxonomy() );
            if ( ! is_wp_error( $terms ) ) {
                $attribute_data['terms'] = array_map( function( $term ) {
                    return array(
                        'id' => $term->term_id,
                        'name' => $term->name,
                        'slug' => $term->slug,
                    );
                }, $terms );
            }
        }
        */
        
        $result[] = $attribute_data;
        //$result[] = $attribute;
    }

	return $result;
}







// MARK: Get Product Taxonomies
/** 
 * Get product taxonomies (categories, tags)
 * 
 * @param int $product_id The product ID
 * @return array Associative array with 'categories' and 'tags' keys
 */
function acex_get_product_taxonomies( $product_id ) {

    $taxonomies = acex_get_taxonomies();
	$result = array();

    foreach ( $taxonomies as $tax_key => $tax ) {
        $result[ $tax_key ] = array();
	    $terms = wp_get_post_terms( $product_id, $tax->query_var );
        if ( ! is_wp_error( $terms ) ) {
            foreach ( $terms as $term ) {
                $result[ $tax_key ][] = array(
                    'id' => $term->term_id,
                    'name' => $term->name,
                    'slug' => $term->slug,
                );
            }
        }
    }

	return $result;

}









// MARK: Get Product Meta
/** 
 * Get all meta data for a product
 * 
 * @param int $product_id The product ID
 * @return array Associative array of all meta key-value pairs
 */
function acex_get_product_meta( $product_id ) {

	$result = array();

	// Get all meta data
	$meta_data = get_post_meta( $product_id );
	$new_product['meta_data'] = array();
	foreach ( $meta_data as $key => $values ) {
		// Skip internal WordPress and WooCommerce meta (starting with _)
		// but include them in a separate array for completeness


		$i = 0;
		foreach ( $values as $value ) {
			// Check if value is a serialized string
			if ( is_serialized( $values ) ) {
				$values[ $i ] = unserialize( $value );
			}
			$i++;
		}

/*		
		// If only one value, flatten array
		if ( isset( $product_data['meta_data'][ $key ] ) && count( $product_data['meta_data'][ $key ] ) === 1 ) {
			$product_data['meta_data'][ $key ] = $product_data['meta_data'][ $key ][0];
		}

*/
		$values = count( $values ) === 1 ? $values[0] : $values;

		// Check if value is a serialized string
		if ( is_serialized( $values ) ) {
			$values = unserialize( $values );
		}
		
		
		$result[ $key ] = $values;
	}

	return $result;

}







