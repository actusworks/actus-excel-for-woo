<?php
include_once __DIR__ . '/acex-data.php';





// Register AJAX actions
add_action( 'wp_ajax_acex_create_taxonomies', 'ajax_acex_create_taxonomies' );




// MARK: AJAX Create Taxonomies
// ----------------------------------------------------------
function ajax_acex_create_taxonomies() {
	global $wpdb;


    acex_log('========================================================', 'report');
    acex_log('                                              TAXONOMIES', 'report');


	check_ajax_referer('acex_nonce', 'nonce');

    if (!current_user_can('edit_products')) {
        wp_send_json_error(array('message' => __('You do not have sufficient permissions.', 'actus-excel-for-woo')));
        return;
    }
 
	try {
		$data = isset($_POST['data']) ? wp_unslash($_POST['data']) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- JSON string sanitized after decode
		$data = is_string($data) ? json_decode($data, true) : (is_array($data) ? $data : array());


		// Validate input data
		if (empty($data) || !is_array($data)) {
			wp_send_json_error(array(
				'message' => __('Invalid or empty data provided.', 'actus-excel-for-woo'),
				'created' => array(),
				'errors' => array(__('No data to process', 'actus-excel-for-woo'))
			));
			return;
		}

    	$taxonomies = acex_get_taxonomies();
		$result = acex_create_taxonomies( $data, $taxonomies );

		$all = array();
		$created_count = array_sum(array_map('count', $result['created']));
		$all['attributes'] = implode("\n", array_column($result['created']['attributes'], 'name'));
		$all['attribute_terms'] = implode("\n", array_column($result['created']['attribute_terms'], 'name'));

		foreach ( $taxonomies as $tax_key => $tax ) {
			$all[$tax_key] = implode("\n", array_column($result['created'][$tax_key], 'name'));
		}


		acex_log('--------------------------------------------------------', 'report');
		acex_log('🏷️ created taxonomies : '. $created_count, 'report');
		
		foreach ( $taxonomies as $tax_key => $tax ) {
			if ( $all[$tax_key] ) {
				acex_log('--------------------------------------------- ' . $tax->label, 'report');
				acex_log($all[$tax_key], 'report');
			}
		}
		if ( $all['attributes'] ) {
			acex_log('--------------------------------------------- attributes', 'report');
			acex_log($all['attributes'], 'report');
		}
		if ( $all['attribute_terms'] ) {
			acex_log('---------------------------------------- attribute terms', 'report');
			acex_log($all['attribute_terms'], 'report');
		}



	
		$details = array(
			'attributes' => count($result['created']['attributes']),
			'attribute_terms' => array_sum(array_map('count', $result['created']['attribute_terms']))
		);
		foreach ( $taxonomies as $tax_key => $tax ) {
			$details[$tax_key] = count($result['created'][$tax_key]);
		}


		// Check if there were any errors
		if ( ! empty( $result['errors'] ) ) {
			$error_count = count($result['errors']);
			
			acex_log('--------------------------------------------------------', 'report');
			acex_log('⛔ errors : '. $error_count, 'report');
			acex_log('--------------------------------------------------------', 'report');
			acex_log("❌ " . implode("\n❌ ", $result['errors']), 'report');
			
			/* translators: 1: number of errors, 2: number of created items */
			wp_send_json_error( array( 
				'message' => sprintf(
					__('%1$d error(s) occurred while creating taxonomies. %2$d item(s) were created successfully.', 'actus-excel-for-woo'),
					$error_count,
					$created_count
				),
				'created' => $result['created'],
				'errors' => $result['errors'],
				'debug' => $result['debug'],
				'error_count' => $error_count,
				'created_count' => $created_count,
				'details' => $details
			) );
			return;
		}

		// Success response with detailed counts
		acex_log('--------------------------------------------------------', 'report');
	
		/* translators: 1: number of created items */
		wp_send_json_success( array(
			'message' => sprintf(
				__('%d taxonomies created successfully.', 'actus-excel-for-woo'),
				$created_count
			),
			'created' => $result['created'],
			'errors' => array(),
			'debug' => $result['debug'],
			'created_count' => $created_count,
			'details' => $details
		) );
	} catch (Exception $e) {
		// Catch any unexpected errors
		/* translators: 1: error message */
		wp_send_json_error(array(
			'message' => sprintf(
				__('An unexpected error occurred: %s', 'actus-excel-for-woo'),
				$e->getMessage()
			),
			'created' => array(),
			'errors' => array($e->getMessage()),
			'exception' => array(
				'message' => $e->getMessage(),
				'file' => $e->getFile(),
				'line' => $e->getLine(),
				'trace' => WP_DEBUG ? $e->getTraceAsString() : null
			)
		));
	}
	
	wp_die();
}






// MARK: Create Taxonomies
// ----------------------------------------------------------
function acex_create_taxonomies( $data, $taxonomies ) {
	$created = array(
		'attributes' => array(),
		'attribute_terms' => array(),
	);
    foreach ( $taxonomies as $tax_key => $tax ) {
		$created[ $tax_key ] = array();
	}
	$errors = array();
	//$errors[] = $data;

	
    foreach ( $taxonomies as $tax_key => $tax ) {

		if ( $tax->hierarchical ) {
			$original = ! empty( $data['original_'.$tax_key] ) ? $data['original_'.$tax_key] : array();
			$created[ $tax_key ] = acex_create_categories( $data[ $tax_key ], $tax->query_var, $original, $errors );
		
		} else {
			$original = ! empty( $data['original_'.$tax_key] ) ? $data['original_'.$tax_key] : array();
			$created[ $tax_key ] = acex_create_tags( $data[ $tax_key ], $tax->query_var, $original, $errors );
		}


	}
	

	// $data['attributes'] -> attributes to be created
	// Attributes and their values
	if ( ! empty( $data['attributes'] ) && is_array( $data['attributes'] ) ) {
		$original_attributes = ! empty( $data['original_attributes'] ) ? $data['original_attributes'] : array();
		$original_values = ! empty( $data['original_attribute_values'] ) ? $data['original_attribute_values'] : array();
		$values = ! empty( $data['values'] ) && is_array( $data['values'] ) ? $data['values'] : array();



		$result = acex_create_attributes( $data, $values, $original_attributes, $original_values, $errors );
		$created['attributes'] = $result['attributes'];
		$created['attribute_terms'] = $result['terms'];
	}
	

	return array(
		'created' => $created,
		'errors' => $errors,
		'debug' => $result['debug']
	);
}





// MARK: Create Categories
// Hierarchy Taxonomies
// ----------------------------------------------------------
function acex_create_categories( $slugs, $key, $original_taxonomies, &$errors ) {
	$created = array();
	$created_ids = array();
	$debug = array();

	// Build a map of original taxonomy data by slug (URL-decoded)
	$taxonomy_map = array();
	foreach ( $original_taxonomies as $tax ) {
		$tax_slug = isset( $tax['slug'] ) ? rawurldecode( $tax['slug'] ) : '';
		if ( $tax_slug ) {
			$taxonomy_map[ $tax_slug ] = $tax;
		}
	}

	// Get all existing taxonomies once to avoid multiple DB queries
	$existing_taxonomies = get_terms( array(
		'taxonomy'   => $key,
		'hide_empty' => false,
		'orderby'    => 'name',
		'order'      => 'asc',
	));

	// Build a map of existing taxonomies by slug for quick lookup
	$existing_tax_map = array();
	if ( ! is_wp_error( $existing_taxonomies ) && ! empty( $existing_taxonomies ) ) {
		foreach ( $existing_taxonomies as $tax ) {
			$existing_tax_map[ rawurldecode( $tax->slug ) ] = $tax;
		}
	}
$debug['existing_tax_map'] = $existing_tax_map;


	// Helper function to recursively create parent taxonomies
	$get_or_create_parent = function( $parent_slug ) use ( &$key, &$taxonomy_map, &$existing_tax_map, &$errors, &$created, &$created_ids, &$get_or_create_parent, &$debug ) {
		// Decode the parent slug
		$parent_slug = rawurldecode( $parent_slug );

$debug['parent_slug'] = $parent_slug;

		// Check if parent already exists in database
		if ( isset( $existing_tax_map[ $parent_slug ] ) ) {
			return $existing_tax_map[ $parent_slug ]->term_id;
		}

		// Check if we already created it
		if ( isset( $created_ids[ $parent_slug ] ) ) {
			return $created_ids[ $parent_slug ];
		}

		// Parent doesn't exist, we need to create it
		$parent_data = isset( $taxonomy_map[ $parent_slug ] ) ? $taxonomy_map[ $parent_slug ] : array();
		$parent_name = ! empty( $parent_data['name'] ) ? $parent_data['name'] : ucfirst( str_replace( array( '-', '_' ), ' ', $parent_slug ) );
		$parent_description = ! empty( $parent_data['description'] ) ? $parent_data['description'] : '';
		

		// Check if this parent also has a parent (recursive)
		$grandparent_id = 0;
		if ( ! empty( $parent_data['parent slug'] ) ) {
			$grandparent_slug = rawurldecode( $parent_data['parent slug'] );
			$grandparent_id = $get_or_create_parent( $grandparent_slug );
		
		} elseif ( ! empty( $parent_data['parent'] ) && is_numeric( $parent_data['parent'] ) ) {
			// If parent ID is provided but no slug, try to verify it exists
			$grandparent_term = get_term( $parent_data['parent'], $key );
			if ( ! is_wp_error( $grandparent_term ) && $grandparent_term ) {
				$grandparent_id = $grandparent_term->term_id;
			}
		}

		// Create the parent taxonomy
		$parent_result = wp_insert_term( $parent_name, $key, array(
			'slug' => $parent_slug,
			'description' => $parent_description,
			'parent' => $grandparent_id
		) );

		if ( is_wp_error( $parent_result ) ) {
			acex_log("====== error creating parent === $parent_slug", 'report' );
			$errors[] = sprintf( 'Parent taxonomy - %s: %s', $parent_slug, $parent_result->get_error_message() );
			$errors[] = array(
				'slug' => $parent_slug,
				'description' => $parent_description,
				'parent' => $grandparent_id,
				'key' => $key
			);
			return 0;
		}

		// Store the created parent
		$created[] = array(
			'term_id' => $parent_result['term_id'],
			'slug' => $parent_slug,
			'name' => $parent_name,
			'parent_id' => $grandparent_id
		);
		$created_ids[ $parent_slug ] = $parent_result['term_id'];
		
		// Update existing taxonomies map
		$existing_tax_map[ $parent_slug ] = (object) array(
			'term_id' => $parent_result['term_id'],
			'slug' => $parent_slug,
			'name' => $parent_name,
			'parent' => $grandparent_id
		);

		acex_log("====== parent created === $parent_slug", 'report' );
		return $parent_result['term_id'];
	};




	acex_log('========================== taxonomies', 'report' );


	// Process each taxonomy slug
	foreach ( $slugs as $slug ) {
		// Always work with URL-decoded slugs
		$slug = rawurldecode( $slug );

		// Check if taxonomy already exists in database
		if ( isset( $existing_tax_map[ $slug ] ) ) {
			// Category already exists, skip creation
			continue;
		}

		// Get taxonomy data from original taxonomies
		$cat_data = isset( $taxonomy_map[ $slug ] ) ? $taxonomy_map[ $slug ] : array();
		$name = ! empty( $cat_data['name'] ) ? $cat_data['name'] : ucfirst( str_replace( array( '-', '_' ), ' ', $slug ) );
		$description = ! empty( $cat_data['description'] ) ? $cat_data['description'] : '';
		

		// Handle parent taxonomy
		$parent_id = 0;
		if ( ! empty( $cat_data['parent slug'] ) ) {
			// Parent slug is provided - check if it exists or create it
			$parent_slug = rawurldecode( $cat_data['parent slug'] );
			$parent_id = $get_or_create_parent( $parent_slug );
		} elseif ( ! empty( $cat_data['parent'] ) && is_numeric( $cat_data['parent'] ) ) {
			// Parent ID is provided but no slug - verify it exists
			$parent_term = get_term( $cat_data['parent'], $key );
			if ( ! is_wp_error( $parent_term ) && $parent_term ) {
				$parent_id = $parent_term->term_id;
			}
		}


		// Create the taxonomy
		$result = wp_insert_term( $name, $key, array(
			'slug' => $slug,
			'description' => $description,
			'parent' => $parent_id
		) );

		if ( is_wp_error( $result ) ) {
			acex_log("=== error creating term === $slug === ". $result->get_error_message(), 'report' );
			$errors[] = sprintf( 'Term "%s": %s', $slug, $result->get_error_message() );
		} else {
			$created[] = array(
				'term_id' => $result['term_id'],
				'slug' => $slug,
				'name' => $name,
				'parent_id' => $parent_id
			);
			$created_ids[ $slug ] = $result['term_id'];
			
			acex_log("=== created === $slug", 'report' );

			// Update existing taxonomies map
			$existing_tax_map[ $slug ] = (object) array(
				'term_id' => $result['term_id'],
				'slug' => $slug,
				'name' => $name,
				'parent' => $parent_id
			);
		}
	}

	$created['debug'] = $debug;
	return $created;
}







// MARK: Create Tags
// Non-Hierarchy Taxonomies
// ----------------------------------------------------------
function acex_create_tags( $slugs, $key, $original_tags, &$errors ) {
	$created = array();

	// Build a map of original tag data by slug
	$tag_map = array();
	foreach ( $original_tags as $tag ) {
		$slug = isset( $tag['slug'] ) ? $tag['slug'] : '';
		if ( $slug ) {
			$tag_map[ $slug ] = $tag;
		}
	}

	foreach ( $slugs as $slug ) {
		// Check if tag already exists
		$existing = get_term_by( 'slug', $slug, $key );
		if ( $existing ) {
			continue; // Already exists, skip
		}

		$tag_data = isset( $tag_map[ $slug ] ) ? $tag_map[ $slug ] : array();
		$name = ! empty( $tag_data['name'] ) ? $tag_data['name'] : ucfirst( str_replace( array( '-', '_' ), ' ', $slug ) );
		$description = ! empty( $tag_data['description'] ) ? $tag_data['description'] : '';

		// Create the tag
		$result = wp_insert_term( $name, $key, array(
			'slug' => $slug,
			'description' => $description
		) );

		if ( is_wp_error( $result ) ) {
			$errors[] = sprintf( 'Tag "%s": %s', $slug, $result->get_error_message() );
		} else {
			$created[] = array(
				'term_id' => $result['term_id'],
				'slug' => $slug,
				'name' => $name
			);
		}
	}

	return $created;
}





// MARK: Create Attributes
// ----------------------------------------------------------
function acex_create_attributes( $data, $values, $original_attributes, $original_values, &$errors ) {
    global $wpdb;

	$attribute_slugs = $data['attributes'];
	$attribute_values = $data['values']; // terms in the sheet by attribute name


    $created_attributes = array();
    $created_terms = array();
    $debug = array();

	
    $debug['original_attributes'] = $original_attributes;
    $debug['original_values'] = $original_values;

    // Build maps of original data (from the sheet)
    $attr_map = array();
    foreach ( $original_attributes as $attr ) {
        $slug = isset( $attr['Slug'] ) ? $attr['Slug'] : '';
        if ( $slug ) {
            // Store both encoded and decoded versions
            $attr_map[ $slug ] = $attr;
            $attr_map[ rawurldecode( $slug ) ] = $attr;
        }
    }

    $debug['attr_map'] = $attr_map;


	$current_attributes = acex_get_current_attributes();
    $debug['current_attributes'] = $current_attributes;


	// Build a map of original values by attribute slug
    $values_map = array();
    foreach ( $original_values as $val ) {
        $attr_slug = isset( $val['Attribute'] ) ? $val['Attribute'] : '';
        if ( $attr_slug ) {
            // Store with both encoded and decoded keys
            $decoded_attr_slug = rawurldecode( $attr_slug );
            if ( ! isset( $values_map[ $attr_slug ] ) ) {
                $values_map[ $attr_slug ] = array();
            }
            if ( ! isset( $values_map[ $decoded_attr_slug ] ) ) {
                $values_map[ $decoded_attr_slug ] = array();
            }
            $values_map[ $attr_slug ][] = $val;
            if ( $attr_slug !== $decoded_attr_slug ) {
                $values_map[ $decoded_attr_slug ][] = $val;
            }
        }
    }
    $debug['values_map'] = $values_map;
    $debug['attribute_slugs'] = $attribute_slugs;



	$debug['attr_data'] = array();
	$debug['attr_ids'] = array();

	// $attribute_slugs -> list of attribute slugs to create
    foreach ( $attribute_slugs as $attr_slug ) {

        // Decode attribute slug for Greek and other special characters
        $decoded_attr_slug = rawurldecode( $attr_slug );

        // Remove 'pa_' prefix if present
        $attr_name = preg_replace( '/^pa_/', '', $decoded_attr_slug );
        //$attr_name = $decoded_attr_slug;
        
        // Check if attribute already exists
        $attribute_id = wc_attribute_taxonomy_id_by_name( $attr_name );
        

        if ( ! $attribute_id ) {
            // Get attribute data from original (check both encoded and decoded)
            $attr_data = isset( $attr_map[ $decoded_attr_slug ] ) ? $attr_map[ $decoded_attr_slug ] 
                : ( isset( $attr_map[ $attr_slug ] ) ? $attr_map[ $attr_slug ] 
                : ( isset( $attr_map[ $attr_name ] ) ? $attr_map[ $attr_name ] : array() ) );
			$label = ! empty( $attr_data['Label'] ) ? $attr_data['Label'] : ucfirst( str_replace( array( '-', '_' ), ' ', $attr_name ) );
            $type = ! empty( $attr_data['Type'] ) ? $attr_data['Type'] : 'select';

            // Create new attribute
            $attribute_id = wc_create_attribute( array(
                'name' => $label,
                'slug' => $attr_name,
                'type' => $type,
                'order_by' => 'menu_order',
                'has_archives' => false
            ) );

            if ( is_wp_error( $attribute_id ) ) {
                $errors[] = sprintf( 'Attribute "%s": %s', $decoded_attr_slug, $attribute_id->get_error_message() );
                continue;
            }

            $created_attributes[] = array(
                'attribute_id' => $attribute_id,
                'slug' => $attr_name,
                'name' => $label
            );

			
            // FIX: Use clean name for taxonomy registration (WC will add pa_ prefix)
            $taxonomy = wc_attribute_taxonomy_name( $attr_name );

            // Register the taxonomy
			register_taxonomy( $taxonomy, array( 'product' ), array() );
        } else {
            // Ensure taxonomy is registered even if attribute exists
            $taxonomy = wc_attribute_taxonomy_name( $attr_name );
        }

        // Create attribute terms (values) - check both encoded and decoded attribute slugs
        $values_for_attr = ! empty( $values[ $attr_slug ] ) ? $values[ $attr_slug ] 
            : ( ! empty( $values[ $decoded_attr_slug ] ) ? $values[ $decoded_attr_slug ] : array() );
        
        if ( ! empty( $values_for_attr ) && is_array( $values_for_attr ) ) {
            $taxonomy = $attr_name;
            
            foreach ( $values_for_attr as $term_slug ) {
                // Decode URL-encoded slugs (for Greek and other special characters)
                $decoded_term_slug = rawurldecode( $term_slug );
                
                // Check if term already exists (check both encoded and decoded versions)
                $existing_term = get_term_by( 'slug', $decoded_term_slug, $taxonomy );
                if ( ! $existing_term ) {
                    $existing_term = get_term_by( 'slug', $term_slug, $taxonomy );
                }
                if ( $existing_term ) {
                    continue; // Already exists, skip
                }

                // Find term data from original values (check both encoded and decoded attribute slugs)
                $term_data = null;
                if ( isset( $values_map[ $decoded_attr_slug ] ) || isset( $values_map[ $attr_slug ] ) ) {
                    $values_to_check = isset( $values_map[ $decoded_attr_slug ] ) ? $values_map[ $decoded_attr_slug ] : $values_map[ $attr_slug ];
                    foreach ( $values_to_check as $val ) {
                        // Check both encoded and decoded versions
                        if ( isset( $val['Slug'] ) ) {
                            $val_slug_decoded = rawurldecode( $val['Slug'] );
                            if ( $val['Slug'] === $term_slug || $val['Slug'] === $decoded_term_slug || 
                                 $val_slug_decoded === $term_slug || $val_slug_decoded === $decoded_term_slug ) {
                                $term_data = $val;
                                break;
                            }
                        }
                    }
                }


                $term_name = ! empty( $term_data['Name'] ) ? $term_data['Name'] : ucfirst( str_replace( array( '-', '_' ), ' ', $decoded_term_slug ) );
                $term_description = ! empty( $term_data['Description'] ) ? $term_data['Description'] : '';

                // Create the term using decoded slug
                $result = wp_insert_term( $term_name, $taxonomy, array(
                    'slug' => $decoded_term_slug,
                    'description' => $term_description
                ));

                if ( is_wp_error( $result ) ) {
                    $errors[] = sprintf( 'Attribute term %s for %s: %s', $decoded_term_slug, $decoded_attr_slug, $result->get_error_message() );
                    $errors[] =  array(
						'slug' => $decoded_term_slug,
						'description' => $term_description,
						'term_name' => $term_name,
						'taxonomy' => $taxonomy,
						//'debug' => $debug,
					);
                } else {
                    // Use decoded attribute slug for the key
                    if ( ! isset( $created_terms[ $decoded_attr_slug ] ) ) {
                        $created_terms[ $decoded_attr_slug ] = array();
                    }
                    $created_terms[ $decoded_attr_slug ][] = array(
                        'term_id' => $result['term_id'],
                        'slug' => $decoded_term_slug,
                        'name' => $term_name
                    );
                }
            }
        }
    }

    // Clear caches
    delete_transient( 'wc_attribute_taxonomies' );
    wp_cache_flush();

    return array(
        'attributes' => $created_attributes,
        'terms' => $created_terms,
		'debug' => $debug
    );
}


