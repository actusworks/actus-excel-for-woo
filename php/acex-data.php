<?php
global $acex_property_groups, $acex_product_properties,
       $acex_protected_keys, $acex_mustBeInherited,
	   $acex_property_restrictions, $acex_property_warnings;






// MARK: Groups
// ----------------------------------------------------------
$acex_property_groups = [
	'core' => array(
		'label' => 'Basic Information',
		'icon' => 'info',
		'description' => 'Core product details'
	),
	'pricing' => array(
		'label' => 'Pricing',
		'icon' => 'money',
		'description' => 'Price and tax settings'
	),
	'stock' => array(
		'label' => 'Inventory',
		'icon' => 'stock',
		'description' => 'Stock management'
	),
	'shipping' => array(
		'label' => 'Shipping',
		'icon' => 'shipping',
		'description' => 'Shipping dimensions and class'
	),
	'attributes' => array(
		'label' => 'Attributes / Variations',
		'icon' => 'variations',
		'description' => 'Product attributes and variations'
	),
	'taxonomies' => array(
		'label' => 'Taxonomies',
		'icon' => 'category',
		'description' => 'Product taxonomies'
	),
	'images' => array(
		'label' => 'Images',
		'icon' => 'image',
		'description' => 'Product images'
	),
	'virtual' => array(
		'label' => 'Virtual / Downloadable',
		'icon' => 'virtual',
		'description' => 'Virtual and downloadable product settings'
	),
	'linked' => array(
		'label' => 'Linked Products',
		'icon' => 'link',
		'description' => 'Upsells, cross-sells, and related'
	),
	'external' => array(
		'label' => 'External',
		'icon' => 'external',
		'description' => 'External product settings'
	),
	'reviews' => array(
		'label' => 'Reviews',
		'icon' => 'star',
		'description' => 'Customer reviews and ratings'
	),
	'misc' => array(
		'label' => 'Miscellaneous',
		'icon' => 'tag',
		'description' => 'Other product details'
	),
	'meta' => array(
		'label' => 'Meta Data',
		'icon' => 'meta',
		'description' => 'Custom meta fields',
	)
	
];




// MARK: Properties
// ----------------------------------------------------------
$acex_product_properties = [

    // ───────────── Core post fields ─────────────
    'id' => [
        'label' => 'Product ID',
        'group' => 'core',
        'description' => 'Unique product identifier',
        'type' => 'int',
        'meta_key' => 'ID',
        'align' => 'center',
    ],
    'name' => [
        'label' => 'Product Name',
        'group' => 'core',
        'description' => 'Product title/name',
        'type' => 'string',
        'meta_key' => 'post_title',
    ],
    'slug' => [
        'label' => 'Slug',
        'group' => 'core',
        'description' => 'URL-friendly product name',
        'type' => 'string',
        'meta_key' => 'post_name',
    ],
    'status' => [
        'label' => 'Status',
        'group' => 'core',
        'description' => 'Product publication status',
        'type' => ['publish', 'draft', 'pending', 'private'],
        'meta_key' => 'post_status',
        'align' => 'center',
    ],
    'type' => [
        'label' => 'Product Type',
        'group' => 'core',
        'description' => 'Type of product',
        'type' => ['simple','variable','grouped','external','variation'],
        'meta_key' => 'product_type', // taxonomy
        'align' => 'center',
    ],
	'description' => [
        'label' => 'Description',
        'group' => 'core',
        'description' => 'Main product description',
        'type' => 'string',
        'meta_key' => 'post_content',
    ],
    'short_description' => [
        'label' => 'Short Description',
        'group' => 'core',
        'description' => 'Excerpt or short description',
        'type' => 'string',
        'meta_key' => 'post_excerpt',
    ],
    'date_created' => [
        'label' => 'Creation Date',
        'group' => 'core',
        'description' => 'Date product was created',
        'type' => 'datetime',
        'meta_key' => 'post_date',
    ],
    'date_modified' => [
        'label' => 'Modified Date',
        'group' => 'core',
        'description' => 'Date product was last modified',
        'type' => 'datetime',
        'meta_key' => 'post_modified',
    ],
    'author_id' => [
        'label' => 'Author ID',
        'group' => 'core',
        'description' => 'User ID of product author',
        'type' => 'int',
        'meta_key' => 'post_author',
        'align' => 'center',
    ],

    // ───────────── Pricing ─────────────
    'price' => [
        'label' => 'Price',
        'group' => 'pricing',
        'description' => 'Current product price',
        'type' => 'float',
        'meta_key' => '_price',
    ],
    'regular_price' => [
        'label' => 'Regular Price',
        'group' => 'pricing',
        'description' => 'Normal product price',
        'type' => 'float',
        'meta_key' => '_regular_price',
    ],
    'sale_price' => [
        'label' => 'Sale Price',
        'group' => 'pricing',
        'description' => 'Discounted product price',
        'type' => 'float',
        'meta_key' => '_sale_price',
    ],
    'date_on_sale_from' => [
        'label' => 'Sale Start Date',
        'group' => 'pricing',
        'description' => 'Start date for sale price',
        'type' => 'datetime',
        'meta_key' => '_sale_price_dates_from',
    ],
    'date_on_sale_to' => [
        'label' => 'Sale End Date',
        'group' => 'pricing',
        'description' => 'End date for sale price',
        'type' => 'datetime',
        'meta_key' => '_sale_price_dates_to',
    ],
    'total_sales' => [
        'label' => 'Total Sales',
        'group' => 'pricing',
        'description' => 'Number of times product was sold',
        'type' => 'int',
        'meta_key' => 'total_sales',
    ],
    'tax_status' => [
        'label' => 'Tax Status',
        'group' => 'pricing',
        'description' => 'Taxable status of product',
        'type' => ['taxable','shipping','none'],
        'meta_key' => '_tax_status',
        'align' => 'center',
    ],
    'tax_class' => [
        'label' => 'Tax Class',
        'group' => 'pricing',
        'description' => 'Tax class assigned to product',
        'type' => 'string',
        'meta_key' => '_tax_class',
    ],

    // ───────────── Stock / Inventory ─────────────
    'sku' => [
        'label' => 'SKU',
        'group' => 'stock',
        'description' => 'Stock Keeping Unit identifier',
        'type' => 'string',
        'meta_key' => '_sku',
    ],
    'manage_stock' => [
        'label' => 'Manage Stock',
        'group' => 'stock',
        'description' => 'Whether stock management is enabled',
        'type' => 'boolean',
        'meta_key' => '_manage_stock',
    ],
    'stock_quantity' => [
        'label' => 'Stock Quantity',
        'group' => 'stock',
        'description' => 'Number of items in stock',
        'type' => 'int',
        'meta_key' => '_stock',
    ],
    'stock_status' => [
        'label' => 'Stock Status',
        'group' => 'stock',
        'description' => 'Stock availability status',
        'type' => ['instock', 'outofstock', 'onbackorder'],
        'meta_key' => '_stock_status',
        'align' => 'center',
    ],
    'backorders' => [
        'label' => 'Backorders',
        'group' => 'stock',
        'description' => 'Whether backorders are allowed',
        'type' => ['no','notify','yes'],
        'meta_key' => '_backorders',
        'align' => 'center',
    ],
    'sold_individually' => [
        'label' => 'Sold Individually',
        'group' => 'stock',
        'description' => 'Whether only one can be purchased in an order',
        'type' => 'boolean',
        'meta_key' => '_sold_individually',
    ],
    'low_stock_amount' => [
        'label' => 'Low Stock Amount',
        'group' => 'stock',
        'description' => 'Threshold for low stock notification',
        'type' => 'int',
        'meta_key' => '_low_stock_amount',
    ],
 
    // ───────────── Shipping ─────────────
    'weight' => [
        'label' => 'Weight',
        'group' => 'shipping',
        'description' => 'Product weight',
        'type' => 'float',
        'meta_key' => '_weight',
    ],
    'length' => [
        'label' => 'Length',
        'group' => 'shipping',
        'description' => 'Product length',
        'type' => 'float',
        'meta_key' => '_length',
    ],
    'width' => [
        'label' => 'Width',
        'group' => 'shipping',
        'description' => 'Product width',
        'type' => 'float',
        'meta_key' => '_width',
    ],
    'height' => [
        'label' => 'Height',
        'group' => 'shipping',
        'description' => 'Product height',
        'type' => 'float',
        'meta_key' => '_height',
    ],
	'shipping_class' => [
        'label' => 'Shipping Class',
        'group' => 'shipping',
        'description' => 'Shipping class assigned to product',
        'type' => 'string',
        'meta_key' => 'product_shipping_class', // taxonomy
        'align' => 'center',
    ],

    // ───────────── Virtual / Downloadable ─────────────
    'virtual' => [
        'label' => 'Virtual',
        'group' => 'virtual',
        'description' => 'Whether product is virtual',
        'type' => 'boolean',
        'meta_key' => '_virtual',
    ],
    'downloadable' => [
        'label' => 'Downloadable',
        'group' => 'virtual',
        'description' => 'Whether product is downloadable',
        'type' => 'boolean',
        'meta_key' => '_downloadable',
    ],
    'downloads' => [
        'label' => 'Downloads',
        'group' => 'virtual',
        'description' => 'Downloadable files',
        'type' => 'serialized',
        'meta_key' => '_downloadable_files',
    ],
    'download_limit' => [
        'label' => 'Download Limit',
        'group' => 'virtual',
        'description' => 'Maximum downloads per customer',
        'type' => 'int',
        'meta_key' => '_download_limit',
    ],
    'download_expiry' => [
        'label' => 'Download Expiry',
        'group' => 'virtual',
        'description' => 'Days before download link expires',
        'type' => 'int',
        'meta_key' => '_download_expiry',
    ],

    // ───────────── Linked products ─────────────
    'cross_sell_ids' => [
        'label' => 'Cross-sells',
        'group' => 'linked',
        'description' => 'IDs of cross-sell products',
        'type' => 'array',
        'meta_key' => '_crosssell_ids',
        'align' => 'center',
    ],
    'upsell_ids' => [
        'label' => 'Upsells',
        'group' => 'linked',
        'description' => 'IDs of upsell products',
        'type' => 'array',
        'meta_key' => '_upsell_ids',
        'align' => 'center',
    ],
    'grouped_products' => [
        'label' => 'Grouped Products',
        'group' => 'linked',
        'description' => 'IDs of products in a grouped product',
        'type' => 'array',
        'meta_key' => '_children',
        'align' => 'center',
    ],

    // ───────────── External product data ─────────────
    'product_url' => [
        'label' => 'Product URL',
        'group' => 'external',
        'description' => 'URL for external product',
        'type' => 'string',
        'meta_key' => '_product_url',
    ],
    'button_text' => [
        'label' => 'Button Text',
        'group' => 'external',
        'description' => 'Text for external product button',
        'type' => 'string',
        'meta_key' => '_button_text',
    ],

    // ───────────── Reviews ─────────────
    'reviews_allowed' => [
        'label' => 'Reviews Allowed',
        'group' => 'reviews',
        'description' => 'Whether reviews are allowed',
        'type' => 'boolean',
        'meta_key' => '_reviews_allowed',
    ],
    'review_count' => [
        'label' => 'Review Count',
        'group' => 'reviews',
        'description' => 'Number of approved reviews',
        'type' => 'int',
        'meta_key' => '_wc_review_count',
    ],
    'average_rating' => [
        'label' => 'Average Rating',
        'group' => 'reviews',
        'description' => 'Average review rating (0-5)',
        'type' => 'float',
        'meta_key' => '_wc_average_rating',
    ],
    'rating_counts' => [
        'label' => 'Rating Counts',
        'group' => 'reviews',
        'description' => 'Ratings per score',
        'type' => 'serialized',
        'meta_key' => '_wc_rating_count',
    ],

    // ───────────── Images ─────────────
    'image_id' => [
        'label' => 'Main Image',
        'group' => 'images',
        'description' => 'ID of product main image',
        'type' => 'int',
        'meta_key' => '_thumbnail_id',
        'align' => 'center',
    ],
    'gallery_image_ids' => [
        'label' => 'Gallery Images',
        'group' => 'images',
        'description' => 'IDs of gallery images',
        'type' => 'comma-separated',
        'meta_key' => '_product_image_gallery',
        'align' => 'center',
    ],

    // ───────────── Misc ─────────────
    'menu_order' => [
        'label' => 'Menu Order',
        'group' => 'misc',
        'description' => 'Order for sorting products',
        'type' => 'int',
        'meta_key' => 'menu_order',
        'align' => 'center',
    ],
    'catalog_visibility' => [
        'label' => 'Catalog Visibility',
        'group' => 'misc',
        'description' => 'Product visibility in catalog/search',
        'type' => ['visible', 'catalog', 'search', 'hidden'],
        'meta_key' => '_catalog_visibility',
        'align' => 'center',
    ],
    'featured' => [
        'label' => 'Featured',
        'group' => 'misc',
        'description' => 'Whether product is marked as featured',
        'type' => 'boolean',
        'meta_key' => '_featured',
    ],
    'purchase_note' => [
        'label' => 'Purchase Note',
        'group' => 'misc',
        'description' => 'Optional note sent to customer after purchase',
        'type' => 'string',
        'meta_key' => '_purchase_note',
    ],

    // ───────────── Attributes / Variations ─────────────
    'attributes' => [
        'label' => 'Product Attributes',
        'group' => 'attributes',
        'description' => 'For simple products: all attributes defined for the product. \nFor variable products: available attributes for all variations. \n For variations: all attributes attached to this product.',
        'type' => 'serialized',
        'meta_key' => '_product_attributes',
    ],
    'attribute_values' => [
        'label' => 'Attribute Values',
        'group' => 'attributes',
        'description' => 'Applies only to variation products. \nSerialized array of variation attribute values',
        'type' => 'serialized',
        'meta_key' => '_variation_attributes',
    ],
    'default_attributes' => [
        'label' => 'Default Attributes',
        'group' => 'attributes',
        'description' => 'For variable products only! \nThe default attribute values that WooCommerce pre-selects on the product page',
        'type' => 'serialized',
        'meta_key' => '_default_attributes',
    ],
    'parent_id' => [
        'label' => 'Parent Product ID',
        'group' => 'attributes',
        'description' => 'Applies only to variation products. \nParent product ID for variations',
        'type' => 'int',
        'meta_key' => 'post_parent',
    ],

    /*
    // ───────────── Taxonomies ─────────────
    'categories' => [
        'label' => 'Categories',
        'group' => 'taxonomies',
        'description' => 'Product categories (term IDs or slugs)',
        'type' => 'array',
        'meta_key' => 'product_cat', // taxonomy
        'align' => 'center',
    ],
    'tags' => [
        'label' => 'Tags',
        'group' => 'taxonomies',
        'description' => 'Product tags (term IDs or slugs)',
        'type' => 'array',
        'meta_key' => 'product_tag', // taxonomy
        'align' => 'center',
    ],
    */

];







// MARK: Allowed values
// ----------------------------------------------------------
$acex_property_allowed_values = [
    'name'                  => 'string',
    'slug'                  => 'string',
    'status'                => ['publish', 'draft', 'pending', 'private'],
    'catalog_visibility'    => ['visible', 'catalog', 'search', 'hidden'],
    'description'           => 'string',
    'short_description'     => 'string',
    'sku'                   => 'string|null',
    'date_created'          => 'datetime|string|null',
    'date_modified'         => 'datetime|string|null',
    'menu_order'            => 'int',
    'virtual'               => 'boolean',
    'downloadable'          => 'boolean',
    'downloads'             => 'array',
    'download_limit'        => 'int|null',
    'download_expiry'       => 'int|null',
    'manage_stock'          => 'boolean',
    'stock_quantity'        => 'int|null',
    'stock_status'          => ['instock', 'outofstock', 'onbackorder'],
    'backorders'            => ['no', 'notify', 'yes'],
    'low_stock_amount'      => 'int|null',
    'sold_individually'     => 'boolean',
    'weight'                => 'float|string|null',
    'length'                => 'float|string|null',
    'width'                 => 'float|string|null',
    'height'                => 'float|string|null',
    'dimensions'            => 'array',
    'shipping_class'        => 'string|null',
    'reviews_allowed'       => 'boolean',
    'purchase_note'         => 'string|null',
    'featured'              => 'boolean',
    'regular_price'         => 'float|string|null',
    'sale_price'            => 'float|string|null',
    'date_on_sale_from'     => 'datetime|string|null',
    'date_on_sale_to'       => 'datetime|string|null',
    'tax_status'            => ['taxable', 'shipping', 'none'],
    'tax_class'             => 'string|null',
    'category_ids'          => 'array<int>',
    'tag_ids'               => 'array<int>',
    'image_id'              => 'int|null',
    'gallery_image_ids'     => 'array<int>',
    'upsell_ids'            => 'array<int>',
    'cross_sell_ids'        => 'array<int>',
    'attributes'            => 'array',
    'default_attributes'    => 'array',
    'parent_id'             => 'int|null',
];




// MARK: Restrictions
// ----------------------------------------------------------
$acex_property_restrictions = [
    'id'                   => "Product IDs cannot be manually set after creation.",
    'type'                 => "Changing the product type after creation is not supported and can break WooCommerce relationships. \nType should only be set at creation.",
    'date_created'         => "Changing the creation date is not standard. \nCan affect sorting and reporting.",
    'parent_id'  		   => "The parent ID of a variation is assigned on creation. \nChanging it manually can break variation-parent relationships.",
    'review_count'         => "Review count is a calculated meta field. \nIt cannot be set directly and should only be modified via WooCommerce's review system.",
    'average_rating'       => "Average rating is a calculated meta field. \nIt cannot be set directly and should only be modified via WooCommerce's review system.",
    'rating_counts'        => "Rating count is a calculated meta field. \nIt cannot be set directly and should only be modified via WooCommerce's review system.",
    'total_sales'          => "Total sales is automatically updated by WooCommerce when orders are completed. \nManually changing this will cause reporting inconsistencies. \nIt won't affect stock logic — it's purely informational",
	'product_type'         => "Product type cannot be changed after creation. \nChanging it breaks variations, attributes, and product relationships. \nDelete and recreate the product instead.",
    'attribute_values'     => "Variation attribute values must match the parent's defined product attributes. \nChanging these values without updating parent attributes can break the variation.",
];




// MARK: Warnings
// ----------------------------------------------------------
$acex_property_warnings = [
    'slug'                 => "Changing slugs on published products may break existing links. \nWooCommerce will attempt 301 redirects, but existing links may be affected.",
	'menu_order'           => "Changing menu_order affects sorting. \nAdjust carefully if products are already displayed in lists.",
	'variation_sku'        => "Changing variation SKUs affects stock/variation mapping. \nEnsure uniqueness across all products.",
	'sku'                  => "Changing the SKU can break stock and variation mappings. \nEnsure the new SKU is unique.",
	'stock_quantity'       => "Changing stock quantity affects availability. \nWooCommerce will recalc stock status automatically.",
	'stock_status'         => "Changing stock_status manually may conflict with stock quantity and backorders. \nConsider setting the stock quantity instead.",
	'backorders'           => "Changing backorders affects ordering rules. \nEnsure consistency with stock management settings.",
	'price'                => "Price is calculated from regular_price and sale_price. \nChanging directly may be overwritten.",
	'downloads'            => "Changing downloadable files affects access. \nEnsure correct file URLs and keys.",
	'attributes'           => "Changing product attributes affects variations, visibility, and options. \nHandle carefully to avoid breaking variation mapping.",
	'parent_id'            => "Changing parent id can break product relationships. \nOnly modify if you understand the implications for variations and grouped products.",
	'category_ids'         => "Changing category_ids affects taxonomy relationships and navigation. \nEnsure category IDs exist before assignment.",
	'tag_ids'              => "Changing tag_ids affects taxonomy relationships and filtering. \nEnsure tag IDs exist before assignment.",
	'shipping_class'        => "Changing shipping class affects shipping calculations.",
	'tax_class'            => "Changing tax_class affects tax calculations. \nEnsure the tax class is properly configured in WooCommerce settings.",
	'grouped_products'     => "Changing grouped product children affects product display and relationships. \nEnsure all child product IDs exist.",
	'dimensions'           => "When setting dimensions array. \nEnsure you also update individual length/width/height values for consistency.",
	'virtual'              => "Changing virtual flag affects shipping requirements. \nVirtual products skip shipping calculations.",
	'downloadable'         => "Changing downloadable flag affects product delivery. \nEnsure downloads array is properly configured when enabling.",
    'shipping_class'       => "Changing shipping class affects shipping rate calculations. \nEnsure the shipping class exists and rates are properly configured.",
];





// MARK: Protected keys
// ----------------------------------------------------------
$acex_protected_keys = [

    // --- Pricing ---
    '_price', '_regular_price', '_sale_price',
    '_sale_price_dates_from', '_sale_price_dates_to',

    // --- Stock / Inventory ---
    '_sku', '_stock', '_stock_status',
    '_manage_stock', '_backorders', '_sold_individually',
    '_low_stock_amount', '_stock_at_low_level', '_stock_reserved',
    'stock_quantity',

    // --- Images ---
    '_thumbnail_id', '_product_image_gallery',

    // --- Shipping ---
    '_weight', '_length', '_width', '_height',
    '_shipping_class', '_shipping_class_id',

    // --- Tax ---
    '_tax_status', '_tax_class',

    // --- Visibility & Features ---
    '_catalog_visibility', '_featured',

    // --- Virtual / Downloadable ---
    '_virtual', '_downloadable',
    '_download_limit', '_download_expiry', '_downloadable_files', 'downloads',

    // --- Linked Products ---
    '_upsell_ids', '_crosssell_ids', '_children', '_grouped_products', 'cross_sell_ids',

    // --- External Products ---
    '_product_url', '_button_text',

    // --- Reviews ---
    '_wc_review_count', '_wc_rating_count', '_wc_average_rating',

    // --- Product Type / Structure ---
    '_product_type', '_variation_description', '_default_attributes',
    '_product_version', '_parent_id',

    // --- Sales / Reporting ---
    '_total_sales', '_purchase_note', '_menu_order',
    '_edit_last', '_edit_lock',

    // --- System / housekeeping ---
    '_wp_old_slug', '_wc_last_updated', '_wp_old_date',

    // --- Attribute / taxonomy related (explicitly excluded) ---
    '_product_attributes', // handled via set_attributes()
    'attributes', 'attribute_values', 'default_attributes',

    'image_id', 'id', 'name', 'original_id', 'slug',
    'author_id', 'product_brand', 'type', 'status',
    'description', 'short_description', 'gallery_image_ids', 
    'date_created', 'date_modified', 'date_on_sale_from', 'date_on_sale_to',
    'categories', 'tags', 
    'rating_counts', 'average_rating', 'review_count', 'reviews_allowed',
    '_visibility'
];








// Properties that CAN be different in variations
$canBeDifferent = [
    // Pricing & Sales
    'regular_price',
    'sale_price',
    'price',
    'date_on_sale_from',
    'date_on_sale_to',
    
    // Inventory Management
    'sku',
    'manage_stock',
    'stock_quantity',
    'stock_status',
    'backorders',
    'low_stock_amount',
    
    // Physical Properties
    'weight',
    'length',
    'width',
    'height',
    'shipping_class_id',
    'shipping_class',
    
    // Product Status
    'virtual',
    'downloadable',
    'downloads',
    'download_limit',
    'download_expiry',
    
    // Images
    'image_id',
    'image',
    'images',
    'gallery_image_ids',
    
    // Content (rarely used but possible)
    'description',
    
    // Variation-Specific
    'menu_order',
    'attributes',        // The specific attribute values (e.g., {"pa_color": "red"})
    'tax_class',
    
    // Meta Data
    'meta_data',
    'meta_data_raw'
];

// Properties that MUST be inherited from parent (cannot be set on variations)
$acex_mustBeInherited = [
    // Product Identity
    'name',
    'slug',
    'type',              // Always "variation" for variations
    'status',
    
    // Taxonomy
    'categories',
    'tags',
    
    // Content
    'short_description',
    
    // Relationships
    'upsell_ids',
    'cross_sell_ids',
    'grouped_products',
    
    // Display & Marketing
    'catalog_visibility',
    'featured',
    'reviews_allowed',
    'review_count',
    'average_rating',
    'rating_counts',
    'total_sales',
    
    // Advanced Settings
    'purchase_note',
    'sold_individually',
    'tax_status',
    'button_text',
    'product_url',
    
    // Authorship
    'author_id',
    
    // Note: These exist on variations but link to parent
    'parent_id',         // Points to parent (required)
    //'default_attributes', // Only meaningful on parent
    //'attribute_values'    // Parent defines available values
];














// MARK: properties & meta



// Get all product properties
// ----------------------------------------------------------
function acex_products_props_names() {

	$props = acex_get_all_products_meta_keys();
	$props_names = array();
	foreach ( $props as $prop ) {
		$props_names[ $prop ] = ltrim(str_replace( '_', ' ', $prop ));
	}
	return $props_names;
}



// Get all product meta keys, excluding keys that start with _oembed_ or contain rwpp_sortorder_ or -wpfoof-
// ----------------------------------------------------------
function acex_get_all_products_meta_keys() {
	global $wpdb;
	$meta_keys = $wpdb->get_col( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Must query distinct meta keys directly, caching not suitable for dynamic user-defined custom fields
		"SELECT DISTINCT meta_key
		FROM $wpdb->postmeta
		WHERE post_id IN (
			SELECT ID FROM $wpdb->posts WHERE post_type = 'product'
		)
		AND meta_key NOT LIKE '_oembed_%'
		AND meta_key NOT LIKE 'rwpp_sortorder_%'
		AND meta_key NOT LIKE '%-wpfoof-%'
	" );
	return $meta_keys;
}




// Get meta properties that are not already defined in $acex_product_properties
// ----------------------------------------------------------
function acex_get_meta_properties() {
	global $acex_product_properties;
	$props_keys = array_keys( $acex_product_properties );
	$meta_props = acex_products_props_names();
	$result = array();

	$ignore = array(
		'_edit_lock',
		'_edit_last',
	);


	foreach ( $meta_props as $prop_key => $prop_name ) {
		//if ( strpos( $prop_key, '_' ) === 0 ) continue;
		$trimmed_key = ltrim($prop_key, '_');
		//$trimmed_key = '_' . $prop_key;
		if ( in_array( $prop_key, $ignore ) ) continue;
		if ( in_array( $prop_key, $props_keys ) ) continue;
		if ( in_array( $trimmed_key, $props_keys ) ) continue;
		$exists_in_meta_key = false;
		foreach ( $acex_product_properties as $property ) {
			if ( isset( $property['meta_key'] ) && $property['meta_key'] === $prop_key ) {
				$exists_in_meta_key = true;
				break;
			}
		}
		if ( $exists_in_meta_key ) continue;

		$result[$prop_key] = array(
			'label' => $prop_name ?: str_replace( '_', ' ', $prop_key ),
			'group' => 'meta',
			'description' => $prop_key,
			'meta_key' => $prop_key
		);

	}
	

	return $result;
}


































/*

Product (Variable)
│
├─ _product_attributes (defines all attributes)
│   ├─ pa_color
│   │   ├─ is_variation = 1
│   │   └─ options: red, blue, green
│   └─ pa_size
│       ├─ is_variation = 1
│       └─ options: S, M, L
│
├─ _default_attributes (preselected on product page)
│   ├─ pa_color => red
│   └─ pa_size  => M
│
└─ Variations (child products)
    ├─ Variation ID 101
    │   ├─ pa_color = red
    │   └─ pa_size  = S
    ├─ Variation ID 102
    │   ├─ pa_color = red
    │   └─ pa_size  = M   ← matches default_attributes
    ├─ Variation ID 103
    │   ├─ pa_color = blue
    │   └─ pa_size  = S
    └─ Variation ID 104
        ├─ pa_color = green
        └─ pa_size  = L






*/



