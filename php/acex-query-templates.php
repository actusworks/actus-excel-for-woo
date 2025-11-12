<?php
/**
 * Query Templates for Analytics & Insights
 * 
 * Pre-configured WP_Query arguments for product analytics,
 * reporting, and insights generation.
 * 
 * Usage:
 * $query = new WP_Query($query_templates['low_stock_products']);
 * 
 * @since 1.0.0
 */

global $query_templates;

$query_templates = [




	/**
	 * Products Without Price
	 * Products missing regular price (data quality issue)
	 */
	'products_no_price' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_query'     => [
			'relation' => 'OR',
			[
				'key'     => '_regular_price',
				'compare' => 'NOT EXISTS'
			],
			[
				'key'     => '_regular_price',
				'value'   => '',
				'compare' => '='
			],
			[
				'key'     => '_regular_price',
				'value'   => 0,
				'compare' => '<=',
				'type'    => 'NUMERIC'
			]
		]
	],
 

	

	/**
	 * Products Without Categories
	 * Data quality check - uncategorized products
	 */
	'uncategorized_products' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'tax_query'      => [
			[
				'taxonomy' => 'product_cat',
				'operator' => 'NOT EXISTS'
			]
		]
	],


	
	/**
	 * Products Without Featured Image
	 * Data quality - products missing main image
	 */
	'no_featured_image' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_query'     => [
			[
				'key'     => '_thumbnail_id',
				'compare' => 'NOT EXISTS'
			]
		]
	],



	/**
	 * Products Without Description
	 * SEO issue - products with empty content
	 */
	'no_description' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_query'     => [
			'relation' => 'OR',
			[
				'key'     => 'post_content',
				'value'   => '',
				'compare' => '='
			]
		],
		// Additional filter needed in code to check post_content
	],



	

	/**
	 * Products with Reviews
	 * Products that have customer reviews
	 */
	'products_with_reviews' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_query'     => [
			[
				'key'     => '_wc_review_count',
				'value'   => 0,
				'compare' => '>',
				'type'    => 'NUMERIC'
			]
		],
		'orderby'        => [
			'meta_value_num' => 'DESC'
		],
		'meta_key'       => '_wc_review_count'
	],






	/**
	 * High Rated Products
	 * Products with average rating 4.0+
	 */
	'high_rated_products' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_query'     => [
			[
				'key'     => '_wc_average_rating',
				'value'   => 4.0,
				'compare' => '>=',
				'type'    => 'NUMERIC'
			]
		],
		'orderby'        => [
			'meta_value_num' => 'DESC'
		],
		'meta_key'       => '_wc_average_rating'
	],





	
	/**
	 * Incomplete Products
	 * Products missing critical data (no price, image, or SKU)
	 */
	'incomplete_products' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_query'     => [
			'relation' => 'OR',
			[
				'key'     => '_thumbnail_id',
				'compare' => 'NOT EXISTS'
			],
			[
				'key'     => '_sku',
				'value'   => '',
				'compare' => '='
			],
			[
				'key'     => '_regular_price',
				'value'   => '',
				'compare' => '='
			]
		]
	],



	
	/**
	 * Products Without Weight
	 * Shipping calculation issue
	 */
	'no_weight' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_query'     => [
			'relation' => 'AND',
			[
				'key'     => '_virtual',
				'value'   => 'yes',
				'compare' => '!='
			],
			[
				'relation' => 'OR',
				[
					'key'     => '_weight',
					'compare' => 'NOT EXISTS'
				],
				[
					'key'     => '_weight',
					'value'   => '',
					'compare' => '='
				]
			]
		]
	],


	
	/**
	 * Products Without Dimensions
	 * Missing length, width, or height
	 */
	'no_dimensions' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_query'     => [
			'relation' => 'AND',
			[
				'key'     => '_virtual',
				'value'   => 'yes',
				'compare' => '!='
			],
			[
				'relation' => 'OR',
				[
					'key'     => '_length',
					'compare' => 'NOT EXISTS'
				],
				[
					'key'     => '_width',
					'compare' => 'NOT EXISTS'
				],
				[
					'key'     => '_height',
					'compare' => 'NOT EXISTS'
				]
			]
		]
	],



	/**
	 * Heavy Products
	 * Products over 50 lbs (shipping consideration)
	 */
	'heavy_products' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_query'     => [
			[
				'key'     => '_weight',
				'value'   => 50,
				'compare' => '>',
				'type'    => 'NUMERIC'
			]
		],
		'orderby'        => [
			'meta_value_num' => 'DESC'
		],
		'meta_key'       => '_weight'
	],





	// =====================================================
	// COMPLEX ANALYTICS QUERIES
	// =====================================================

	/**
	 * High-Value Low-Stock Alert
	 * Expensive products running low on stock
	 */
	'high_value_low_stock' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_query'     => [
			'relation' => 'AND',
			[
				'key'     => '_price',
				'value'   => 50,
				'compare' => '>',
				'type'    => 'NUMERIC'
			],
			[
				'key'     => '_stock',
				'value'   => 10,
				'compare' => '<',
				'type'    => 'NUMERIC'
			],
			[
				'key'     => '_stock_status',
				'value'   => 'instock',
				'compare' => '='
			]
		]
	],


	/**
	 * Featured Products on Sale
	 * Featured items with active discounts
	 */
	'featured_on_sale' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_query'     => [
			'relation' => 'AND',
			[
				'key'     => '_featured',
				'value'   => 'yes',
				'compare' => '='
			],
			[
				'key'     => '_sale_price',
				'value'   => '',
				'compare' => '!=',
			],
			[
				'key'     => '_sale_price',
				'value'   => 0,
				'compare' => '>',
				'type'    => 'NUMERIC'
			]
		]
	],

	/**
	 * Featured Out of Stock
	 * Critical: featured products unavailable
	 */
	'featured_out_of_stock' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_query'     => [
			'relation' => 'AND',
			[
				'key'     => '_featured',
				'value'   => 'yes',
				'compare' => '='
			],
			[
				'key'     => '_stock_status',
				'value'   => 'outofstock',
				'compare' => '='
			]
		]
	],

	/**
	 * Variable Products Low Stock
	 * Variable products with low inventory
	 */
	'variable_low_stock' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'tax_query'      => [
			[
				'taxonomy' => 'product_type',
				'field'    => 'slug',
				'terms'    => 'variable'
			]
		],
		'meta_query'     => [
			'relation' => 'AND',
			[
				'key'     => '_stock',
				'value'   => 15,
				'compare' => '<',
				'type'    => 'NUMERIC'
			],
			[
				'key'     => '_stock_status',
				'value'   => 'instock',
				'compare' => '='
			]
		]
	],



	/**
	 * Products Needing Restock
	 * Low stock or out of stock items that sold well
	 */
	'needs_restock' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_query'     => [
			'relation' => 'AND',
			[
				'relation' => 'OR',
				[
					'key'     => '_stock_status',
					'value'   => 'outofstock',
					'compare' => '='
				],
				[
					'key'     => '_stock',
					'value'   => 10,
					'compare' => '<',
					'type'    => 'NUMERIC'
				]
			],
			[
				'key'     => 'total_sales',
				'value'   => 10,
				'compare' => '>',
				'type'    => 'NUMERIC'
			]
		],
		'orderby'        => [
			'meta_value_num' => 'DESC'
		],
		'meta_key'       => 'total_sales'
	],

	// =====================================================
	// PRICING STRATEGY ANALYTICS
	// =====================================================

	/**
	 * Deep Discount Products
	 * Products with >30% discount
	 */
	'deep_discount' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_query'     => [
			'relation' => 'AND',
			[
				'key'     => '_sale_price',
				'value'   => '',
				'compare' => '!=',
			],
			[
				'key'     => '_regular_price',
				'value'   => '',
				'compare' => '!=',
			]
		]
		// Additional calculation needed in PHP to filter >30% discount
	],

	/**
	 * Products Never on Sale
	 * Products that have never had a discount
	 */
	'never_on_sale' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_query'     => [
			'relation' => 'OR',
			[
				'key'     => '_sale_price',
				'compare' => 'NOT EXISTS'
			],
			[
				'key'     => '_sale_price',
				'value'   => '',
				'compare' => '='
			]
		]
	],


];

/**
 * Helper function to get a query template
 * 
 * @param string $template_name The name of the template
 * @return array|false Query args or false if not found
 */
function acex_get_query_template( $template_name ) {
	global $query_templates;
	return isset( $query_templates[ $template_name ] ) ? $query_templates[ $template_name ] : false;
}

/**
 * Helper function to get all query template names
 * 
 * @return array List of available template names
 */
function acex_get_query_template_names() {
	global $query_templates;
	return array_keys( $query_templates );
}



$query_templates2 = [

	// =====================================================
	// ADVANCED / COMPLEX INSIGHT QUERIES
	// =====================================================

	/**
	 * Seasonal Sale Candidates
	 * Upcoming sales within 14 days, healthy inventory
	 */
	'seasonal_sale_candidates' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'orderby'        => [
			'meta_value_num' => 'ASC'
		],
		'order'          => 'ASC',
		'fields'         => 'ids',
		'meta_key'       => '_sale_price_dates_from',
		'meta_query'     => [
			'relation' => 'AND',
			[
				'key'     => '_sale_price',
				'value'   => '',
				'compare' => '!=',
			],
			[
				'key'     => '_sale_price',
				'value'   => 0,
				'compare' => '>',
				'type'    => 'NUMERIC'
			],
			[
				'key'     => '_sale_price_dates_from',
				'value'   => current_time('timestamp'),
				'compare' => '>=',
				'type'    => 'NUMERIC'
			],
			[
				'relation' => 'OR',
				[
					'key'     => '_sale_price_dates_from',
					'value'   => strtotime('+14 days', current_time('timestamp')),
					'compare' => '<=',
					'type'    => 'NUMERIC'
				],
				[
					'key'     => '_sale_price_dates_to',
					'compare' => 'NOT EXISTS'
				]
			],
			[
				'key'     => '_stock_status',
				'value'   => 'instock',
				'compare' => '='
			],
			[
				'key'     => '_stock',
				'value'   => 0,
				'compare' => '>',
				'type'    => 'NUMERIC'
			]
		]
	],

	/**
	 * Aging Inventory with High Stock
	 * Old products holding inventory and low sales
	 */
	'aging_inventory_high_stock' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'orderby'        => [
			'meta_value_num' => 'DESC',
			'date'            => 'ASC'
		],
		'order'          => 'DESC',
		'meta_key'       => '_stock',
		'date_query'     => [
			[
				'before'    => '120 days ago',
				'inclusive' => true
			]
		],
		'meta_query'     => [
			'relation' => 'AND',
			[
				'key'     => '_manage_stock',
				'value'   => 'yes',
				'compare' => '='
			],
			[
				'key'     => '_stock_status',
				'value'   => 'instock',
				'compare' => '='
			],
			[
				'key'     => '_stock',
				'value'   => 50,
				'compare' => '>=',
				'type'    => 'NUMERIC'
			],
			[
				'relation' => 'OR',
				[
					'key'     => 'total_sales',
					'value'   => 5,
					'compare' => '<',
					'type'    => 'NUMERIC'
				],
				[
					'key'     => 'total_sales',
					'compare' => 'NOT EXISTS'
				]
			]
		]
	],

	/**
	 * High Rating, Low Inventory
	 * Popular products that risk stockouts
	 */
	'high_rating_low_inventory' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'orderby'        => [
			'meta_value_num' => 'DESC'
		],
		'order'          => 'DESC',
		'meta_key'       => '_wc_average_rating',
		'meta_query'     => [
			'relation' => 'AND',
			[
				'key'     => '_wc_average_rating',
				'value'   => 4.5,
				'compare' => '>=',
				'type'    => 'NUMERIC'
			],
			[
				'key'     => '_wc_review_count',
				'value'   => 5,
				'compare' => '>=',
				'type'    => 'NUMERIC'
			],
			[
				'key'     => '_stock',
				'value'   => 15,
				'compare' => '<=',
				'type'    => 'NUMERIC'
			],
			[
				'key'     => '_stock_status',
				'value'   => 'instock',
				'compare' => '='
			]
		]
	],

	/**
	 * High Traffic, Low Sales
	 * Investigate listings with engagement but poor conversions
	 */
	'high_traffic_low_sales' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'orderby'        => 'date',
		'order'          => 'DESC',
		'meta_query'     => [
			'relation' => 'AND',
			[
				'key'     => 'post_views_count',
				'value'   => 500,
				'compare' => '>=',
				'type'    => 'NUMERIC'
			],
			[
				'relation' => 'OR',
				[
					'key'     => 'total_sales',
					'value'   => 5,
					'compare' => '<',
					'type'    => 'NUMERIC'
				],
				[
					'key'     => 'total_sales',
					'compare' => 'NOT EXISTS'
				]
			]
		]
	],

	/**
	 * Upsell & Cross-Sell Gaps
	 * Products with sales but no relational offers configured
	 */
	'upsell_cross_sell_gaps' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'tax_query'      => [
			[
				'taxonomy' => 'product_type',
				'field'    => 'slug',
				'terms'    => [ 'simple', 'grouped' ],
				'operator' => 'IN'
			]
		],
		'meta_query'     => [
			'relation' => 'AND',
			[
				'relation' => 'OR',
				[
					'key'     => '_upsell_ids',
					'compare' => 'NOT EXISTS'
				],
				[
					'key'     => '_upsell_ids',
					'value'   => 'a:0:{}',
					'compare' => '='
				]
			],
			[
				'relation' => 'OR',
				[
					'key'     => '_crosssell_ids',
					'compare' => 'NOT EXISTS'
				],
				[
					'key'     => '_crosssell_ids',
					'value'   => 'a:0:{}',
					'compare' => '='
				]
			],
			[
				'key'     => 'total_sales',
				'value'   => 10,
				'compare' => '>=',
				'type'    => 'NUMERIC'
			]
		]
	],

	/**
	 * Stagnant Featured Products
	 * Featured catalogue items with poor sales and stale updates
	 */
	'stagnant_featured_products' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'tax_query'      => [
			[
				'taxonomy' => 'product_visibility',
				'field'    => 'name',
				'terms'    => [ 'featured' ],
				'operator' => 'IN'
			]
		],
		'date_query'     => [
			[
				'column'    => 'post_modified',
				'before'    => '6 months ago',
				'inclusive' => true
			]
		],
		'meta_query'     => [
			[
				'key'     => 'total_sales',
				'value'   => 5,
				'compare' => '<=',
				'type'    => 'NUMERIC'
			]
		]
	],

	/**
	 * Heavy Products Missing Dimensions
	 * Shipping risk: heavy items lacking dimension data
	 */
	'heavy_products_missing_dimensions' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'meta_query'     => [
			'relation' => 'AND',
			[
				'key'     => '_weight',
				'value'   => 30,
				'compare' => '>=',
				'type'    => 'NUMERIC'
			],
			[
				'relation' => 'OR',
				[
					'key'     => '_length',
					'compare' => 'NOT EXISTS'
				],
				[
					'key'     => '_width',
					'compare' => 'NOT EXISTS'
				],
				[
					'key'     => '_height',
					'compare' => 'NOT EXISTS'
				],
				[
					'key'     => '_length',
					'value'   => 0,
					'compare' => '<=',
					'type'    => 'NUMERIC'
				],
				[
					'key'     => '_width',
					'value'   => 0,
					'compare' => '<=',
					'type'    => 'NUMERIC'
				],
				[
					'key'     => '_height',
					'value'   => 0,
					'compare' => '<=',
					'type'    => 'NUMERIC'
				]
			]
		]
	],

	/**
	 * Recent Best-Sellers with Low Review Volume
	 * Newly hot products lacking social proof
	 */
	'recent_best_sellers_low_reviews' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'date_query'     => [
			[
				'after'     => '90 days ago',
				'inclusive' => true
			]
		],
		'meta_query'     => [
			'relation' => 'AND',
			[
				'key'     => 'total_sales',
				'value'   => 20,
				'compare' => '>=',
				'type'    => 'NUMERIC'
			],
			[
				'relation' => 'OR',
				[
					'key'     => '_wc_review_count',
					'value'   => 3,
					'compare' => '<',
					'type'    => 'NUMERIC'
				],
				[
					'key'     => '_wc_review_count',
					'compare' => 'NOT EXISTS'
				]
			]
		]
	],

	/**
	 * Variable Products Missing Visual Assets
	 * Variation catalog entries lacking imagery support
	 */
	'variable_needing_images' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'tax_query'      => [
			[
				'taxonomy' => 'product_type',
				'field'    => 'slug',
				'terms'    => [ 'variable' ]
			]
		],
		'meta_query'     => [
			'relation' => 'AND',
			[
				'relation' => 'OR',
				[
					'key'     => '_thumbnail_id',
					'compare' => 'NOT EXISTS'
				],
				[
					'key'     => '_thumbnail_id',
					'value'   => 0,
					'compare' => '=',
					'type'    => 'NUMERIC'
				]
			],
			[
				'relation' => 'OR',
				[
					'key'     => '_product_image_gallery',
					'compare' => 'NOT EXISTS'
				],
				[
					'key'     => '_product_image_gallery',
					'value'   => '',
					'compare' => '='
				],
				[
					'key'     => '_product_image_gallery',
					'value'   => 'a:0:{}',
					'compare' => '='
				]
			]
		]
	],

	/**
	 * Downloadable Products Missing Files
	 * Data quality: digital goods without file payload
	 */
	'digital_missing_files' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'meta_query'     => [
			'relation' => 'AND',
			[
				'key'     => '_downloadable',
				'value'   => 'yes',
				'compare' => '='
			],
			[
				'relation' => 'OR',
				[
					'key'     => '_downloadable_files',
					'compare' => 'NOT EXISTS'
				],
				[
					'key'     => '_downloadable_files',
					'value'   => '',
					'compare' => '='
				],
				[
					'key'     => '_downloadable_files',
					'value'   => 'a:0:{}',
					'compare' => '='
				]
			]
		]
	],

	/**
	 * Backorder High Demand
	 * Items on backorder with meaningful sales velocity
	 */
	'backorder_high_demand' => [
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'date_query'     => [
			[
				'after'     => '180 days ago',
				'inclusive' => true
			]
		],
		'meta_query'     => [
			'relation' => 'AND',
			[
				'key'     => '_stock_status',
				'value'   => 'onbackorder',
				'compare' => '='
			],
			[
				'key'     => 'total_sales',
				'value'   => 25,
				'compare' => '>=',
				'type'    => 'NUMERIC'
			]
		]
	],

	/**
	 * Orphaned Variations with Missing Pricing
	 * product_variation posts lacking regular price data
	 */
	'orphaned_variations_missing_price' => [
		'post_type'      => 'product_variation',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'orderby'        => 'parent',
		'order'          => 'ASC',
		'meta_query'     => [
			'relation' => 'AND',
			[
				'relation' => 'OR',
				[
					'key'     => '_regular_price',
					'compare' => 'NOT EXISTS'
				],
				[
					'key'     => '_regular_price',
					'value'   => '',
					'compare' => '='
				],
				[
					'key'     => '_regular_price',
					'value'   => 0,
					'compare' => '<=',
					'type'    => 'NUMERIC'
				]
			],
			[
				'relation' => 'OR',
				[
					'key'     => '_price',
					'compare' => 'NOT EXISTS'
				],
				[
					'key'     => '_price',
					'value'   => '',
					'compare' => '='
				]
			]
		]
	],

];

/**
 * Helper function to get a complex query template
 *
 * @param string $template_name The name of the complex template
 * @return array|false Query args or false if not found
 */
function acex_get_query_template2( $template_name ) {
	global $query_templates2;
	return isset( $query_templates2[ $template_name ] ) ? $query_templates2[ $template_name ] : false;
}

/**
 * Helper function to list complex query template names
 *
 * @return array List of available complex template names
 */
function acex_get_query_template2_names() {
	global $query_templates2;
	return array_keys( $query_templates2 );
}

