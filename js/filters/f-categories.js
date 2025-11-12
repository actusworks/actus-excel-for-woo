




const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
// -----------------------------------------------------








// MARK: Categories Filter
// -----------------------------------------------------
export default function categoriesFilter( query, target, categories ) {

	// Categories Filter

	/**
	 * Build hierarchical category tree from flat array
	 * @param {Array} categories - Flat array of category objects
	 * @param {number} parentId - Parent ID to filter by (default: 0 for root)
	 * @param {Set} visited - Set to track visited categories and prevent infinite loops
	 * @returns {Array} Hierarchical tree structure
	 */
	const buildCategoryTree = (categories, parentId = 0, visited = new Set()) => {
		const tree = [];
		
		for (const category of categories) {
			// Skip if already visited (prevent infinite loops)
			if (visited.has(category.term_id)) {
				continue;
			}
			
			// Check if this category belongs to the current parent
			// Handle both 'parent' and 'category_parent' property names
			const catParent = category.parent !== undefined ? category.parent : category.category_parent;
			
			if (catParent == parentId) {
				// Mark as visited
				visited.add(category.term_id);
				
				// Create category node
				const node = {
					id: category.term_id,
					name: category.name,
					slug: category.slug,
					parent: catParent,
					count: category.count || 0,
					children: []
				};
				
				// Recursively get children
				node.children = buildCategoryTree(categories, category.term_id, visited);
				
				tree.push(node);
			}
		}
		
		return tree;
	};

	const renderCategoryTree = (tree) => {
		if (!tree.length) return '';
		return `<ul>
			${tree.map(cat => {
				const isChecked = query.categories?.includes(String(cat.slug)) ? 'checked' : '';
				let liClass = 'acex-no-children'
				if ( cat.children && cat.children.length ) {
					liClass = 'acex-has-children';
				}
				return `
				<li class="${liClass}">
					<label>
						<input type="checkbox" value="${cat.slug}" class="acex-category-checkbox" ${isChecked} />
						${cat.name}
					</label>
					${renderCategoryTree(cat.children)}
				</li>
			`;
			}).join('')}
		</ul>`;
	};

	const categoryTree = buildCategoryTree( categories );
	const hasValues = !!(query.categories && query.categories.length > 0);

	const $catFilter = $(`
		<div class="acex-filter ${hasValues ? 'actus-open' : ''}">
			<h3>Categories<span>${DATA.SVG.caret}</span></h3>
			<div class="acex-filter-body">
				<div class="acex-category-tree">
					${renderCategoryTree(categoryTree)}
				</div>
			</div>
		</div>
	`);



	target.append( $catFilter );


	$('body').off('change.acex-select-products', '.acex-category-checkbox')
	$('body').on('change.acex-select-products', '.acex-category-checkbox', (e) => {
		const $el = $(e.currentTarget);
		const val = decodeURIComponent($el.val());
		const name = 'categories';

		$('body').trigger('acex::filter-changed', [name, val, $el]);
	
	});

}



