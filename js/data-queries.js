



const QUERIES = [


	// All Products (Default)
	{
		"query_name"	: "📦 All Published",
		"status"		: [ "publish" ],
		"description"	: "All published products in the store",
		"_system"		: true,
	},
	
	
	// Recently Added (Last 30 days)
	{
		"query_name"	: "🆕 Recently Added",
		"status"		: [ "publish" ],
		"date_from"		: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0],
		"description"	: "Products added in the last 30 days",
		"_system"		: true,
	},


	
	
	// Recently Updated
	{
		"query_name"	: "🔄 Recently Updated",
		//"template"		: "recently_updated",
		"date_modified_from" : new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0],
		"description"	: "Products modified in the last 7 days",
		"_system"		: true,
	},


	// Old Products
	{
		"query_name"	: "🕰️ Old Products",
		//"template"		: "old_products",
		"date_created_to" : new Date(Date.now() - 365*24*60*60*1000).toISOString().split('T')[0],
		"description"	: "Products older than 1 year",
		"_system"		: true,
	},


	// 💤 Stale Products
	{
		"query_name"	: "💤 Stale Products",
		//"template"		: "stale_products",
		"date_modified_to" : new Date(Date.now() - 180*24*60*60*1000).toISOString().split('T')[0],
		"description"	: "Products not updated in 6+ months",
		"_system"		: true,
	},

	// 🛒 Overstocked Products
	{
		"query_name"	: "🛒 Overstocked",
		"manage_stock"	: "yes",
		"min_stock"		: 100,
		"description"	: "Products with more than 100 units in stock",
		"_system"		: true,
		"p"				: true,
	},
	
	// Low Stock Products (need stock management enabled)
	{
		"query_name"	: "📉 Low Stock Alert",
		"status"		: [ "publish" ],
		"stock_status"	: [ "instock" ],
		"manage_stock"	: "yes",
		"max_stock"		: 10,
		"description"	: "Products with low stock (10 or less)",
		"_system"		: true,
		"p"				: true,
	},
	
	// Out of Stock Products
	{
		"query_name"	: "⚠️ Out of Stock",
		"status"		: [ "publish" ],
		"stock_status"	: [ "outofstock" ],
		"description"	: "Products currently out of stock",
		"_system"		: true,
		"p"				: true,
	},


	// Products on Sale
	{
		"query_name"	: "💰 On Sale",
		"status"		: [ "publish" ],
		"on_sale"		: true,
		"description"	: "Products currently on sale",
		"_system"		: true,
		"p"				: true,
	},
	
	// Expired Sales
	{
		"query_name"	: "⏳ Expired Sales",
		"date_on_sale_to" : new Date().toISOString().split('T')[0],
		"description"	: "Products with sale dates that have ended",
		"_system"		: true,
		"p"				: true,
	},


	// Featured Products
	{
		"query_name"	: "⭐ Featured",
		"status"		: [ "publish" ],
		"featured"		: true,
		"description"	: "Products marked as featured",
		"_system"		: true,
	},
	
	// Products with Reviews
	{
		"query_name"	: "⭐ With Reviews",
		"template"		: "products_with_reviews",
		"description"	: "Products that have customer reviews",
		"_system"		: true,
	},

	// High Rated Products
	{
		"query_name"	: "⭐ High Rated",
		"template"		: "high_rated_products",
		"description"	: "Products with an average rating of 4.0 or higher",
		"_system"		: true,
	},

	// Heavy Products
	{
		"query_name"	: "⚖️ Heavy Products",
		"template"		: "heavy_products",
		"description"	: "Products with a weight greater than 50kg. Important for shipping considerations.",
		"_system"		: true,
	},



	// Incomplete Products
	{
		"query_name"	: "❗ Incomplete Products",
		"template"		: "incomplete_products",
		"description"	: "Products missing critical data (no price, image, or SKU).",
		"_system"		: true,
		"p"				: true,
	},

	// Products Without Price
	{
		"query_name"	: "❌ Without Price",
		"template"		: "products_no_price",
		"description"	: "Products missing a regular price.",
		"_system"		: true,
		"p"				: true,
	},

	// Products Without Categories
	{
		"query_name"	: "❌ Without Categories",
		"template"		: "uncategorized_products",
		"description"	: "Products not assigned to any category. Important for organization and navigation.",
		"_system"		: true,
		"p"				: true,
	},

	// Products Without Featured Image
	{
		"query_name"	: "❌ Without Featured Image",
		"template"		: "no_featured_image",
		"description"	: "Products missing a featured image. Important for visual appeal.",
		"_system"		: true,
		"p"				: true,
	},

	// Products Without Description
	{
		"query_name"	: "❌ Without Description",
		"template"		: "no_description",
		"description"	: "Products missing a description. Important for SEO and conversions.",
		"_system"		: true,
	},


	// Products Without Weight
	{
		"query_name"	: "❌ Without Weight",
		"template"		: "no_weight",
		"description"	: "Products missing a weight attribute. Can affect shipping calculations.",
		"_system"		: true,
	},


	// Products Without Dimensions
	{
		"query_name"	: "❌ Without Dimensions",
		"template"		: "no_dimensions",
		"description"	: "Products missing dimensions (length, width, height). Important for shipping and display.",
		"_system"		: true,
	},




]










export default QUERIES;