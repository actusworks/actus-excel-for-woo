


const TEMPLATES = [
	// Use Case 1: Bulk Price Updates
	{
		name: '💰 Pricing Updates',
		system: true,
		sheet: 'Products',
		description: 'Update prices for seasonal sales and promotions',
		columns: [
			{ header: 'Product ID', key: 'id', type: 'int', align: 'center' },
			{ header: 'Product Name', key: 'name', type: 'string' },
			{ header: 'SKU', key: 'sku', type: 'string' },
			{ header: 'Regular Price', key: 'regular_price', type: 'float' },
			{ header: 'Sale Price', key: 'sale_price', type: 'float' },
			{ header: 'Sale Start Date', key: 'date_on_sale_from', type: 'datetime' },
			{ header: 'Sale End Date', key: 'date_on_sale_to', type: 'datetime' },
			{ header: 'Categories', key: 'categories', type: 'array', align: 'center' },
			{ header: 'Status', key: 'status', type: ['publish', 'draft', 'pending', 'private'], align: 'center' },
		]
	},
	
	// Use Case 2: Inventory Management
	{
		name: '📦 Inventory Management',
		system: true,
		sheet: 'Products',
		description: 'Weekly stock reconciliation and warehouse updates',
		columns: [
			{ header: 'Product ID', key: 'id', type: 'int', align: 'center' },
			{ header: 'SKU', key: 'sku', type: 'string' },
			{ header: 'Product Name', key: 'name', type: 'string' },
			{ header: 'Stock Quantity', key: 'stock_quantity', type: 'int' },
			{ header: 'Stock Status', key: 'stock_status', type: ['instock', 'outofstock', 'onbackorder'], align: 'center' },
			{ header: 'Manage Stock', key: 'manage_stock', type: 'boolean' },
			{ header: 'Backorders', key: 'backorders', type: ['no', 'notify', 'yes'], align: 'center' },
			{ header: 'Low Stock Amount', key: 'low_stock_amount', type: 'int' },
			{ header: 'Sold Individually', key: 'sold_individually', type: 'boolean' },
		]
	},
	
	// Use Case 3: Product Catalog Migration
	{
		name: '🚀 Full Product Export',
		system: true,
		sheet: 'Products',
		description: 'Complete product data for site migration or backup',
		columns: [
			{ header: 'Product ID', key: 'id', type: 'int', align: 'center' },
			{ header: 'Product Name', key: 'name', type: 'string' },
			{ header: 'Slug', key: 'slug', type: 'string' },
			{ header: 'Status', key: 'status', type: ['publish', 'draft', 'pending', 'private'], align: 'center' },
			{ header: 'Product Type', key: 'type', type: ['simple', 'variable', 'grouped', 'external'], align: 'center' },
			{ header: 'SKU', key: 'sku', type: 'string' },
			{ header: 'Regular Price', key: 'regular_price', type: 'float' },
			{ header: 'Sale Price', key: 'sale_price', type: 'float' },
			{ header: 'Description', key: 'description', type: 'string' },
			{ header: 'Short Description', key: 'short_description', type: 'string' },
			{ header: 'Categories', key: 'categories', type: 'array', align: 'center' },
			{ header: 'Tags', key: 'tags', type: 'array', align: 'center' },
			{ header: 'Stock Quantity', key: 'stock_quantity', type: 'int' },
			{ header: 'Stock Status', key: 'stock_status', type: ['instock', 'outofstock', 'onbackorder'], align: 'center' },
			{ header: 'Weight', key: 'weight', type: 'float' },
			{ header: 'Length', key: 'length', type: 'float' },
			{ header: 'Width', key: 'width', type: 'float' },
			{ header: 'Height', key: 'height', type: 'float' },
			{ header: 'Main Image', key: 'image_id', type: 'int', align: 'center' },
			{ header: 'Gallery Images', key: 'gallery_image_ids', type: 'comma-separated', align: 'center' },
		]
	},
	
	// Use Case 4: SEO Optimization
	{
		name: '🎯 SEO Optimization',
		system: true,
		sheet: 'Products',
		description: 'Optimize product titles, slugs, and descriptions',
		columns: [
			{ header: 'Product ID', key: 'id', type: 'int', align: 'center' },
			{ header: 'Product Name', key: 'name', type: 'string' },
			{ header: 'Slug', key: 'slug', type: 'string' },
			{ header: 'Description', key: 'description', type: 'string' },
			{ header: 'Short Description', key: 'short_description', type: 'string' },
			{ header: 'Categories', key: 'categories', type: 'array', align: 'center' },
			{ header: 'Tags', key: 'tags', type: 'array', align: 'center' },
			{ header: 'Status', key: 'status', type: ['publish', 'draft', 'pending', 'private'], align: 'center' },
			{ header: 'Featured', key: 'featured', type: 'boolean' },
		]
	},
	
	// Use Case 5: Category & Tag Reorganization
	{
		name: '🏷️ Categories & Tags',
		system: true,
		sheet: 'Products',
		description: 'Restructure product taxonomy and organization',
		columns: [
			{ header: 'Product ID', key: 'id', type: 'int', align: 'center' },
			{ header: 'Product Name', key: 'name', type: 'string' },
			{ header: 'SKU', key: 'sku', type: 'string' },
			{ header: 'Categories', key: 'categories', type: 'array', align: 'center' },
			{ header: 'Tags', key: 'tags', type: 'array', align: 'center' },
			{ header: 'Product Type', key: 'type', type: ['simple', 'variable', 'grouped', 'external'], align: 'center' },
			{ header: 'Status', key: 'status', type: ['publish', 'draft', 'pending', 'private'], align: 'center' },
			{ header: 'Featured', key: 'featured', type: 'boolean' },
			{ header: 'Menu Order', key: 'menu_order', type: 'int', align: 'center' },
		]
	},
	
	// Use Case 6: Attribute Management for Variable Products
	{
		name: '🎨 Product Attributes',
		system: true,
		sheet: 'Products',
		description: 'Manage attributes and variations',
		columns: [
			{ header: 'Product ID', key: 'id', type: 'int', align: 'center' },
			{ header: 'Product Name', key: 'name', type: 'string' },
			{ header: 'SKU', key: 'sku', type: 'string' },
			{ header: 'Product Type', key: 'type', type: ['simple', 'variable', 'grouped', 'external'], align: 'center' },
			{ header: 'Product Attributes', key: 'attributes', type: 'serialized' },
			{ header: 'Attribute Values', key: 'attribute_values', type: 'serialized' },
			{ header: 'Default Attributes', key: 'default_attributes', type: 'serialized' },
			//{ header: 'Parent Product ID', key: 'parent_id', type: 'int' },
			{ header: 'Status', key: 'status', type: ['publish', 'draft', 'pending', 'private'], align: 'center' },
		]
	},
	
	// Use Case 7: Product Image Management
	{
		name: '📸 Image Management',
		system: true,
		sheet: 'Products',
		description: 'Bulk assign and update product images',
		columns: [
			{ header: 'Product ID', key: 'id', type: 'int', align: 'center' },
			{ header: 'SKU', key: 'sku', type: 'string' },
			{ header: 'Product Name', key: 'name', type: 'string' },
			{ header: 'Main Image', key: 'image_id', type: 'int', align: 'center' },
			{ header: 'Gallery Images', key: 'gallery_image_ids', type: 'comma-separated', align: 'center' },
			{ header: 'Categories', key: 'categories', type: 'array', align: 'center' },
			{ header: 'Status', key: 'status', type: ['publish', 'draft', 'pending', 'private'], align: 'center' },
		]
	},
	
	/*
	// Use Case 8: Multi-Language Management
	{
		index: 7,
		name: '🌍 Multi-Language',
		sheet: 'Products',
		description: 'Manage translations and language versions',
		columns: [
			{ header: 'Product ID', key: 'id', type: 'int', align: 'center' },
			{ header: 'Product Name', key: 'name', type: 'string' },
			{ header: 'Slug', key: 'slug', type: 'string' },
			{ header: 'Description', key: 'description', type: 'string' },
			{ header: 'Short Description', key: 'short_description', type: 'string' },
			{ header: 'SKU', key: 'sku', type: 'string' },
			{ header: 'Categories', key: 'categories', type: 'array', align: 'center' },
			{ header: 'Tags', key: 'tags', type: 'array', align: 'center' },
			{ header: 'Status', key: 'status', type: ['publish', 'draft', 'pending', 'private'], align: 'center' },
		]
	},
	*/
	
	// Use Case 9: Supplier Data Integration
	{
		name: '🔄 Supplier Integration',
		system: true,
		sheet: 'Products',
		description: 'Import supplier data and updates',
		columns: [
			{ header: 'SKU', key: 'sku', type: 'string' },
			{ header: 'Product Name', key: 'name', type: 'string' },
			{ header: 'Regular Price', key: 'regular_price', type: 'float' },
			{ header: 'Sale Price', key: 'sale_price', type: 'float' },
			{ header: 'Stock Quantity', key: 'stock_quantity', type: 'int' },
			{ header: 'Stock Status', key: 'stock_status', type: ['instock', 'outofstock', 'onbackorder'], align: 'center' },
			{ header: 'Description', key: 'description', type: 'string' },
			{ header: 'Weight', key: 'weight', type: 'float' },
			{ header: 'Length', key: 'length', type: 'float' },
			{ header: 'Width', key: 'width', type: 'float' },
			{ header: 'Height', key: 'height', type: 'float' },
		]
	},
	
	// Use Case 10: Seasonal Product Management
	{
		name: '🎃 Seasonal Products',
		system: true,
		sheet: 'Products',
		description: 'Enable/disable seasonal products',
		columns: [
			{ header: 'Product ID', key: 'id', type: 'int', align: 'center' },
			{ header: 'Product Name', key: 'name', type: 'string' },
			{ header: 'SKU', key: 'sku', type: 'string' },
			{ header: 'Status', key: 'status', type: ['publish', 'draft', 'pending', 'private'], align: 'center' },
			{ header: 'Categories', key: 'categories', type: 'array', align: 'center' },
			{ header: 'Tags', key: 'tags', type: 'array', align: 'center' },
			{ header: 'Stock Status', key: 'stock_status', type: ['instock', 'outofstock', 'onbackorder'], align: 'center' },
			{ header: 'Catalog Visibility', key: 'catalog_visibility', type: ['visible', 'catalog', 'search', 'hidden'], align: 'center' },
			{ header: 'Featured', key: 'featured', type: 'boolean' },
		]
	},
	
	// Additional useful templates
	
	// Quick Edit Template
	{
		name: '⚡ Quick Edit',
		system: true,
		sheet: 'Products',
		description: 'Essential fields for quick updates',
		columns: [
			{ header: 'Product ID', key: 'id', type: 'int', align: 'center' },
			{ header: 'Product Name', key: 'name', type: 'string' },
			{ header: 'SKU', key: 'sku', type: 'string' },
			{ header: 'Status', key: 'status', type: ['publish', 'draft', 'pending', 'private'], align: 'center' },
			{ header: 'Regular Price', key: 'regular_price', type: 'float' },
			{ header: 'Stock Quantity', key: 'stock_quantity', type: 'int' },
		]
	},
	
	// Shipping Management
	{
		name: '📦 Shipping Details',
		system: true,
		sheet: 'Products',
		description: 'Manage shipping dimensions and classes',
		columns: [
			{ header: 'Product ID', key: 'id', type: 'int', align: 'center' },
			{ header: 'Product Name', key: 'name', type: 'string' },
			{ header: 'SKU', key: 'sku', type: 'string' },
			{ header: 'Weight', key: 'weight', type: 'float' },
			{ header: 'Length', key: 'length', type: 'float' },
			{ header: 'Width', key: 'width', type: 'float' },
			{ header: 'Height', key: 'height', type: 'float' },
			{ header: 'Shipping Class', key: 'shipping_class', type: 'string', align: 'center' },
			{ header: 'Virtual', key: 'virtual', type: 'boolean' },
		]
	},
	
	/*
	// Review & Rating Management
	{
		index: 12,
		name: '⭐ Reviews & Ratings',
		sheet: 'Products',
		description: 'Product reviews and rating data',
		columns: [
			{ header: 'Product ID', key: 'id', type: 'int', align: 'center' },
			{ header: 'Product Name', key: 'name', type: 'string' },
			{ header: 'SKU', key: 'sku', type: 'string' },
			{ header: 'Reviews Allowed', key: 'reviews_allowed', type: 'boolean' },
			{ header: 'Review Count', key: 'review_count', type: 'int' },
			{ header: 'Average Rating', key: 'average_rating', type: 'float' },
			{ header: 'Status', key: 'status', type: ['publish', 'draft', 'pending', 'private'], align: 'center' },
		]
	},
	*/
	
	// Downloadable/Virtual Products
	{
		name: '💾 Digital Products',
		system: true,
		sheet: 'Products',
		description: 'Manage downloadable and virtual products',
		columns: [
			{ header: 'Product ID', key: 'id', type: 'int', align: 'center' },
			{ header: 'Product Name', key: 'name', type: 'string' },
			{ header: 'SKU', key: 'sku', type: 'string' },
			{ header: 'Virtual', key: 'virtual', type: 'boolean' },
			{ header: 'Downloadable', key: 'downloadable', type: 'boolean' },
			{ header: 'Downloads', key: 'downloads', type: 'serialized' },
			{ header: 'Download Limit', key: 'download_limit', type: 'int' },
			{ header: 'Download Expiry', key: 'download_expiry', type: 'int' },
			{ header: 'Regular Price', key: 'regular_price', type: 'float' },
			{ header: 'Status', key: 'status', type: ['publish', 'draft', 'pending', 'private'], align: 'center' },
		]
	},
];









export default TEMPLATES;