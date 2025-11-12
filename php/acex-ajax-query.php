<?php
include_once __DIR__ . '/acex-query-templates.php';




// MARK: Query
// -----------------------------------------------------


add_action( 'wp_ajax_acex_query', 'acex_ajax_query' );


/**
 * AJAX handler for counting products matching query
 */
function acex_ajax_query() {
    // Security check
    check_ajax_referer('acex_nonce', 'nonce');
    
    if (!current_user_can('edit_products')) {
        wp_send_json_error(array('message' => __('You do not have sufficient permissions.', 'actus-excel-for-woo')));
        return;
    }
    
    // Get query from POST
    $query = isset($_POST['query']) ? wp_unslash($_POST['query']) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Sanitized via acex_sanitize_options() after JSON decode
	$count_only = isset($_POST['count']) ? boolval($_POST['count']) : false;
    $images = isset($_POST['images']) ? boolval($_POST['images']) : false;
	$page = isset($_POST['page']) ? max(1, intval($_POST['page'])) : 1;
	$limit = isset($_POST['limit']) ? max(1, intval($_POST['limit'])) : 20;
    
    // Try to decode if it's a JSON string
    if ( is_string($query) ) {
        $decoded = json_decode($query, true);
        if ( json_last_error() === JSON_ERROR_NONE && is_array($decoded) ) {
            $query = $decoded;
        }
    }
    
    // Sanitize the query recursively
    if (is_array($query)) {
        $query = acex_sanitize_options($query);
    } else {
        wp_send_json_error(array('message' => 'Query must be an array or valid JSON string.'));
        return;
    }

    
    // Call the main function
    $response = acex_query($query, $count_only, $page, $limit, $images);

    if ( is_wp_error($response) ) {
        wp_send_json_error(array(
            'message' => $response->get_error_message(),
            'code' => $response->get_error_code(),
            'query' => $query,
        ));
    } else {
		 if ( $count_only === false ) {
			$response2 = acex_get_multiple_products( $response['products'] );
			if ( ! is_array($response2) ) {
				$response2 = array();
			}
			$result = array_merge( $response, $response2 );
			$result['query'] = $query;
		 } else {
			$result = array(
				'query' => $query,
				'count' => $response,
			);
		 }
        wp_send_json_success($result);
    }
}




// MARK: Query Function
/**
 * Count products matching the given query
 * 
 * @param array $query Query parameters (categories, tags, attributes, etc.)
 * @return int|WP_Error Product count or WP_Error on failure
 * {
 *   "success": true,
 *   "data": {
 *     "count": 42,
 *     "query": { --original query-- }
 *   }
 * }
 */
function acex_query( $query = array(), $count_only = false, $page = 1, $limit = 20, $images = false ) {
    if ( ! is_array($query) ) {
        return new WP_Error( 'invalid_query', 'Query must be an array' );
    }
	if ( $count_only === true ) $limit = -1; // No limit when counting



    // Build WP_Query arguments
    $args = acex_build_query( $query, $count_only, $page, $limit, $images );

   

    // Execute query
    $products_query = new WP_Query($args);
    

    // Return count
	if ( $count_only ) {


		return $products_query->found_posts;
		
        
    // Return products
	} else {
        $result = $products_query->posts;
        $ordered_ids = array();
        $image_urls = array();
        $product = null;
        $variations = 0;
        $product_types = array();
        
        // Loop through products and insert variations after variable products
        foreach ($result as $product_id) {
            $ordered_ids[] = $product_id;

            // Get image URLs
            /*
            if ( $images ) {
                $product = wc_get_product( $product_id );
                if ( $product ) {
                    $pid = $product->get_id();
                    $image_urls[ $pid ] = array();

                    // Main image
                    $image_id = $product->get_image_id();
                    if ( $image_id ) {
                        $image_urls[ $pid ][ $image_id ] = wp_get_attachment_url( $image_id );
                    } else {
                        $image_urls[ $pid ][] = wc_placeholder_img_src();
                    }

                    // Gallery images
                    $gallery_ids = $product->get_gallery_image_ids();
                    if ( ! empty( $gallery_ids ) ) {
                        foreach ( $gallery_ids as $gallery_id ) {
                            $image_urls[ $pid ][ $gallery_id ] = wp_get_attachment_url( $gallery_id );
                        }
                    }
                }
            }
            */
            
             
            
            if ( ! $product ) $product = wc_get_product( $product_id );
            $product_type = $product->get_type();
            if ( ! isset( $product_types[ $product_type ] ) ) {
                $product_types[ $product_type ] = 0;
            }
            $product_types[ $product_type ]++;
      
            if ( $product && $product->is_type( 'variable' ) ) {
                // Get all variation IDs for this variable product
                $variation_ids = $product->get_children();
                if ( ! empty( $variation_ids ) ) {
                    // Add variations right after the parent
                    $ordered_ids = array_merge( $ordered_ids, $variation_ids );
                    $variations += count( $variation_ids );
                }
            }
            

            $product = null;
        }

        
		return array(
			'products' => $ordered_ids,
			'variations' => $variations,
			//'product_types' => $product_types,
			//'image_urls' => $image_urls,
			'total' => $products_query->found_posts,
			'pages' => $products_query->max_num_pages,
			'page' => $page,
			'query_args' => $args,
		);
	}

}






// MARK: Build Query
/**
 * Build WP_Query arguments from the given query parameters
 * 
 * @param array $query Query parameters
 * @param bool $count_only Whether to build args for counting only
 * @param int $page Current page number
 * @param int $limit Number of products per page
 * @return array WP_Query arguments
 */
function acex_build_query( $query = array(), $count_only = false, $page = 1, $limit = 20, $images = false ) {
    global $query_templates;


    // Build WP_Query arguments
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => $limit,
        'paged' => $page,
        'fields' => 'ids', // Only get IDs for performance
        'no_found_rows' => false,
    );
    
    // Tax query array
    $tax_query = array();



    // Handle status
    if ( ! empty($query['status']) ) {
        $status = $query['status'];
        if ( is_array($status) ) {
            $args['post_status'] = array_map('sanitize_text_field', $status);
        } else {
            $args['post_status'] = sanitize_text_field($status);
        }
    }

    $taxonomies = acex_get_taxonomies();

    // Handle taxonomies
    foreach ( $taxonomies as $key => $taxonomy ) {
        if ( ! empty($query[$key]) && is_array($query[$key]) ) {
            $term_slugs = array_map(function($slug) {
                return sanitize_text_field(urldecode($slug));
            }, $query[$key]);
            if ( ! empty($term_slugs) ) {
                $tax_query[] = array(
                    'taxonomy' => $taxonomy->query_var,
                    'field' => 'slug',
                    'terms' => $term_slugs,
                    'operator' => 'IN',
                );
            }
        }
    }



    // Handle shipping classes
    if ( ! empty($query['shipping_class']) && is_array($query['shipping_class']) ) {
        $shipping_class_slugs = array_map(function($slug) {
            return sanitize_text_field(urldecode($slug));
        }, $query['shipping_class']);
        if ( ! empty($shipping_class_slugs) ) {
            $tax_query[] = array(
                'taxonomy' => 'product_shipping_class',
                'field' => 'slug',
                'terms' => $shipping_class_slugs,
                'operator' => 'IN',
            );
        }
    }

    // Handle product attributes (e.g., pa_color, pa_size)
    if ( ! empty($query['attributes']) && is_array($query['attributes']) ) {
        foreach ( $query['attributes'] as $taxonomy => $term_ids ) {
            if ( is_array($term_ids) && ! empty($term_ids) ) {
                $term_ids = array_map('absint', $term_ids);
                $tax_query[] = array(
                    'taxonomy' => sanitize_text_field($taxonomy),
                    'field' => 'term_id',
                    'terms' => $term_ids,
                    'operator' => 'IN',
                );
            }
        }
    }
    
    // Set tax query relation if multiple taxonomies
    if ( count($tax_query) > 1 ) {
        $tax_query['relation'] = isset($query['tax_relation']) ? strtoupper($query['tax_relation']) : 'AND';
    }
    
    if ( ! empty($tax_query) ) {
        $args['tax_query'] = $tax_query;
    }
    
    // Meta query array
    $meta_query = array();
    
    // Handle manage stock
    if ( isset($query['manage_stock']) ) {
        $manage_stock = wc_string_to_bool( $query['manage_stock'] );
        $meta_query[] = array(
            'key' => '_manage_stock',
            'value' => wc_bool_to_string( $manage_stock ),
            'compare' => '=',
        );
    }


    // Handle stock status
    if ( ! empty($query['stock_status']) ) {
        $stock_status = $query['stock_status'];
        if ( is_array($stock_status) ) {
            $meta_query[] = array(
                'key' => '_stock_status',
                'value' => array_map('sanitize_text_field', $stock_status),
                'compare' => 'IN',
            );
        } else {
            $meta_query[] = array(
                'key' => '_stock_status',
                'value' => sanitize_text_field($stock_status),
                'compare' => '=',
            );
        }
    }
    

    // Handle stock quantity
    if ( isset($query['min_stock']) || isset($query['max_stock']) ) {
        if ( isset($query['min_stock']) && isset($query['max_stock']) ) {
            $meta_query[] = array(
                'key' => '_stock',
                'value' => array(intval($query['min_stock']), intval($query['max_stock'])),
                'type' => 'NUMERIC',
                'compare' => 'BETWEEN',
            );
        } elseif ( isset($query['min_stock']) ) {
            $meta_query[] = array(
                'key' => '_stock',
                'value' => intval($query['min_stock']),
                'type' => 'NUMERIC',
                'compare' => '>=',
            );
        } elseif ( isset($query['max_stock']) ) {
            $meta_query[] = array(
                'key' => '_stock',
                'value' => intval($query['max_stock']),
                'type' => 'NUMERIC',
                'compare' => '<=',
            );
        }
    }


    // Handle low stock amount (ranges)
    if ( isset($query['min_low_stock']) || isset($query['max_low_stock']) ) {
        if ( isset($query['min_low_stock']) && isset($query['max_low_stock']) ) {
            $meta_query[] = array(
                'key' => '_low_stock_amount',
                'value' => array(intval($query['min_low_stock']), intval($query['max_low_stock'])),
                'type' => 'NUMERIC',
                'compare' => 'BETWEEN',
            );
        } elseif ( isset($query['min_low_stock']) ) {
            $meta_query[] = array(
                'key' => '_low_stock_amount',
                'value' => intval($query['min_low_stock']),
                'type' => 'NUMERIC',
                'compare' => '>=',
            );
        } elseif ( isset($query['max_low_stock']) ) {
            $meta_query[] = array(
                'key' => '_low_stock_amount',
                'value' => intval($query['max_low_stock']),
                'type' => 'NUMERIC',
                'compare' => '<=',
            );
        }
    }


    // Handle price range
    if ( isset($query['min_price']) || isset($query['max_price']) ) {
        if ( isset($query['min_price']) && isset($query['max_price']) ) {
            $meta_query[] = array(
                'key' => '_price',
                'value' => array(floatval($query['min_price']), floatval($query['max_price'])),
                'type' => 'NUMERIC',
                'compare' => 'BETWEEN',
            );
        } elseif ( isset($query['min_price']) ) {
            $meta_query[] = array(
                'key' => '_price',
                'value' => floatval($query['min_price']),
                'type' => 'NUMERIC',
                'compare' => '>=',
            );
        } elseif ( isset($query['max_price']) ) {
            $meta_query[] = array(
                'key' => '_price',
                'value' => floatval($query['max_price']),
                'type' => 'NUMERIC',
                'compare' => '<=',
            );
        }
    }


    // Handle sale price range
    if ( isset($query['min_sale_price']) || isset($query['max_sale_price']) ) {
        if ( isset($query['min_sale_price']) && isset($query['max_sale_price']) ) {
            $meta_query[] = array(
                'key' => '_sale_price',
                'value' => array(floatval($query['min_sale_price']), floatval($query['max_sale_price'])),
                'type' => 'NUMERIC',
                'compare' => 'BETWEEN',
            );
        } elseif ( isset($query['min_sale_price']) ) {
            $meta_query[] = array(
                'key' => '_sale_price',
                'value' => floatval($query['min_sale_price']),
                'type' => 'NUMERIC',
                'compare' => '>=',
            );
        } elseif ( isset($query['max_sale_price']) ) {
            $meta_query[] = array(
                'key' => '_sale_price',
                'value' => floatval($query['max_sale_price']),
                'type' => 'NUMERIC',
                'compare' => '<=',
            );
        }
    }


    
    // Handle date on sale range
    if ( ! empty($query['date_on_sale_from']) || ! empty($query['date_on_sale_to']) ) {
        $date_query = array();
        
        if ( ! empty($query['date_on_sale_from']) ) {
            $date_query['after'] = sanitize_text_field($query['date_on_sale_from']);
        }
        
        if ( ! empty($query['date_on_sale_to']) ) {
            $date_query['before'] = sanitize_text_field($query['date_on_sale_to']);
        }
        
        $date_query['inclusive'] = true;
        $meta_query[] = array(
            'key' => '_sale_price_dates_from',
            'value' => isset($date_query['after']) ? strtotime($date_query['after']) : '',
            'type' => 'NUMERIC',
            'compare' => '>=',
        );
        $meta_query[] = array(
            'key' => '_sale_price_dates_to',
            'value' => isset($date_query['before']) ? strtotime($date_query['before']) : '',
            'type' => 'NUMERIC',
            'compare' => '<=',
        );
    }




    // Handle total sales range
    if ( isset($query['min_total_sales']) || isset($query['max_total_sales']) ) {
        if ( isset($query['min_total_sales']) && isset($query['max_total_sales']) ) {
            $meta_query[] = array(
                'key' => '_total_sales',
                'value' => array(floatval($query['min_total_sales']), floatval($query['max_total_sales'])),
                'type' => 'NUMERIC',
                'compare' => 'BETWEEN',
            );
        } elseif ( isset($query['min_total_sales']) ) {
            $meta_query[] = array(
                'key' => '_total_sales',
                'value' => floatval($query['min_total_sales']),
                'type' => 'NUMERIC',
                'compare' => '>=',
            );
        } elseif ( isset($query['max_total_sales']) ) {
            $meta_query[] = array(
                'key' => '_total_sales',
                'value' => floatval($query['max_total_sales']),
                'type' => 'NUMERIC',
                'compare' => '<=',
            );
        }
    }


    
    // Handle SKU
    if ( ! empty($query['sku']) ) {
        $meta_query[] = array(
            'key' => '_sku',
            'value' => sanitize_text_field($query['sku']),
            'compare' => 'LIKE',
        );
    }
    
    // Handle featured products
    if ( isset($query['featured']) ) {
        $meta_query[] = array(
            'key' => '_featured',
            'value' => $query['featured'] ? 'yes' : 'no',
            'compare' => '=',
        );
    }
    
    // Handle on sale
    if ( isset($query['on_sale']) && $query['on_sale'] ) {
        $meta_query[] = array(
            'key' => '_sale_price',
            'value' => '',
            'compare' => '!=',
        );
    }
    
    // Handle custom meta queries
    if ( ! empty($query['meta']) && is_array($query['meta']) ) {
        foreach ( $query['meta'] as $meta ) {
            if ( isset($meta['key']) ) {
                $meta_item = array(
                    'key' => sanitize_text_field($meta['key']),
                );
                
                if ( isset($meta['value']) ) {
                    $meta_item['value'] = $meta['value'];
                }
                
                if ( isset($meta['compare']) ) {
                    $meta_item['compare'] = strtoupper(sanitize_text_field($meta['compare']));
                }
                
                if ( isset($meta['type']) ) {
                    $meta_item['type'] = strtoupper(sanitize_text_field($meta['type']));
                }
                
                $meta_query[] = $meta_item;
            }
        }
    }
    
    // Set meta query relation if multiple meta queries
    if ( count($meta_query) > 1 ) {
        $meta_query['relation'] = isset($query['meta_relation']) ? strtoupper($query['meta_relation']) : 'AND';
    }
    
    if ( ! empty($meta_query) ) {
        $args['meta_query'] = $meta_query;
    }
    
    // Handle product type
    if ( ! empty($query['product_type']) ) {
        $product_types = is_array($query['product_type']) ? $query['product_type'] : array($query['product_type']);
        $type_terms = array();
        
        foreach ( $product_types as $type ) {
            $type = sanitize_text_field($type);
            if ( in_array($type, array('simple', 'grouped', 'external', 'variable')) ) {
                $type_terms[] = $type;
            }
        }
        
        if ( ! empty($type_terms) ) {
            if ( ! isset($args['tax_query']) ) {
                $args['tax_query'] = array();
            }
            $args['tax_query'][] = array(
                'taxonomy' => 'product_type',
                'field' => 'slug',
                'terms' => $type_terms,
                'operator' => 'IN',
            );
        }
    }
    
    // Handle search term
    if ( ! empty($query['search']) ) {
        $args['s'] = sanitize_text_field($query['search']);
    }
    
    // Handle date range
    if ( ! empty($query['date_from']) || ! empty($query['date_to']) ) {
        $date_query = array();
        
        if ( ! empty($query['date_from']) ) {
            $date_query['after'] = sanitize_text_field($query['date_from']);
        }
        
        if ( ! empty($query['date_to']) ) {
            $date_query['before'] = sanitize_text_field($query['date_to']);
        }
        
        $date_query['inclusive'] = true;
        $args['date_query'] = array($date_query);
    }

    
    // Handle modified date range
    if ( ! empty($query['modified_from']) || ! empty($query['modified_to']) ) {
        $date_query = array();
        
        if ( ! empty($query['modified_from']) ) {
            $date_query['after'] = sanitize_text_field($query['modified_from']);
        }
        
        if ( ! empty($query['modified_to']) ) {
            $date_query['before'] = sanitize_text_field($query['modified_to']);
        }
        
        $date_query['inclusive'] = true;
        $args['date_query'][] = array_merge($date_query, array('column' => 'post_modified'));
    }


    //if ( $args['raw_query'] ) $args = $args['raw_query'];
    if ( ! empty( $query['template'] ) ) {
        // Deep merge template args into $args
        if ( isset( $query_templates[ $query['template'] ] ) && is_array( $query_templates[ $query['template'] ] ) ) {
            $args = array_replace_recursive( $query_templates[ $query['template'] ], $args );
        }
    }


    // Handle author IDs
    if ( ! empty($query['author_ids']) ) {
        // Accept comma-separated string or array
        if ( is_string($query['author_ids']) ) {
            $author_ids = array_filter(array_map('absint', explode(',', $query['author_ids'])));
        } elseif ( is_array($query['author_ids']) ) {
            $author_ids = array_map('absint', $query['author_ids']);
        } else {
            $author_ids = array();
        }
        if ( ! empty($author_ids) ) {
            $args['author__in'] = $author_ids;
        }
    }

    
    
    
    // Handle specific IDs
    if ( ! empty($query['ids']) ) {
        // Accept comma-separated string or array
        if ( is_string($query['ids']) ) {
            $ids = array_filter(array_map('absint', explode(',', $query['ids'])));
        } elseif ( is_array($query['ids']) ) {
            $ids = array_map('absint', $query['ids']);
        } else {
            $ids = array();
        }
        if ( ! empty($ids) ) {
            $args = array(
                'post__in' => $ids,
                'post_type' => 'product',
                'posts_per_page' => $limit,
                'paged' => $page,
                'fields' => 'ids', // Only get IDs for performance
                'no_found_rows' => false,
            );
        }
    }



    return $args;

}





/*

'categories' => [5139, 403, 365]     // Product category IDs
'tags' => [5199, 5304, 5385, 5188]   // Product tag IDs
'attributes' => [                     // Product attributes
    'pa_color' => [10, 11],
    'pa_size' => [20, 21]
]
'tax_relation' => 'AND'              // or 'OR' (default: 'AND')




Stock & Pricing:

'stock_status' => ['instock']        // 'instock', 'outofstock', 'onbackorder'
'min_stock' => 5                     // Minimum stock quantity
'max_stock' => 100                   // Maximum stock quantity
'min_low_stock' => 1                 // Minimum low stock amount
'max_low_stock' => 10                // Maximum low stock amount
'min_price' => 10.00                 // Minimum price
'max_price' => 100.00                // Maximum price
'min_sale_price' => 5.00             // Minimum sale price
'max_sale_price' => 50.00            // Maximum sale price
'date_on_sale_from' => '2025-01-01'  // On sale from date
'date_on_sale_to' => '2025-12-31'    // On sale
'sku' => 'ABC'                       // SKU search (LIKE)




Product Features:

'featured' => true                   // Featured products only
'on_sale' => true                    // On sale products only
'product_type' => 'simple'           // 'simple', 'variable', 'grouped', 'external'
'product_type' => ['simple', 'variable'] // Multiple types



Search & Dates:
'search' => 'keyword'                // Search term
'date_from' => '2025-01-01'         // Products after this date
'date_to' => '2025-12-31'           // Products before this date
'modified_from' => '2025-01-01'     // Modified after this date
'modified_to' => '2025-12-31'       // Modified before this date




Custom Meta:
'meta' => [
    [
        'key' => '_custom_field',
        'value' => 'some value',
        'compare' => '=',            // '=', '!=', '>', '<', 'LIKE', etc.
        'type' => 'CHAR'             // 'NUMERIC', 'BINARY', 'CHAR', 'DATE', etc.
    ]
]
'meta_relation' => 'AND'             // or 'OR' (default: 'AND')









*/





