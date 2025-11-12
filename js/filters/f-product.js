import SearchProduct from '../SearchProduct.js';
// -----------------------------------------------------


const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
// -----------------------------------------------------





// MARK: Product Filters
// -----------------------------------------------------
export default function productFilters( query, target ) {

	// Product Filters HTML
	const $productFilters = $(`
		<div class="acex-filter acex-product-filters actus-open">
			<h3>Products<span>${DATA.SVG.caret}</span></h3>
			<div class="acex-filter-body">

				<div class="acex-filter-status actus-flex">
					<label class="actus-label">Status</label>
					<label><input type="checkbox" class="acex-status-checkbox" value="publish" ${query.status?.includes('publish') ? 'checked' : ''} /> Published</label>
					<label><input type="checkbox" class="acex-status-checkbox" value="draft" ${query.status?.includes('draft') ? 'checked' : ''} /> Draft</label>
					<label><input type="checkbox" class="acex-status-checkbox" value="pending" ${query.status?.includes('pending') ? 'checked' : ''} /> Pending</label>
					<label><input type="checkbox" class="acex-status-checkbox" value="private" ${query.status?.includes('private') ? 'checked' : ''} /> Private</label>
				</div>

				<div class="acex-filter-type actus-flex">
					<label class="actus-label">Type</label>
					<label><input type="checkbox" class="acex-type-checkbox" value="simple" ${query.product_type?.includes('simple') ? 'checked' : ''} /> Simple</label>
					<label><input type="checkbox" class="acex-type-checkbox" value="variable" ${query.product_type?.includes('variable') ? 'checked' : ''} /> Variable</label>
					<label><input type="checkbox" class="acex-type-checkbox" value="grouped" ${query.product_type?.includes('grouped') ? 'checked' : ''} /> Grouped</label>
					<label><input type="checkbox" class="acex-type-checkbox" value="external" ${query.product_type?.includes('external') ? 'checked' : ''} /> External</label>
				</div>

				<div class="acex-filter-row acex-filter-created actus-flex">
					<label class="actus-label">Created</label>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="date_from">From:</label>
						<input class="actus-input actus-small" type="date" id="date_from" class="acex-on-sale-date-input" value="${query.date_from || ''}" />
					</div>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="date_to">To:</label>
						<input class="actus-input actus-small" type="date" id="date_to" class="acex-on-sale-date-input" value="${query.date_to || ''}" />
					</div>
					<button class="actus-btn actus-btn-secondary acex-clear-created-date">clear</button>
				</div>

				<div class="acex-filter-row acex-filter-modified actus-flex">
					<label class="actus-label">Modified</label>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="modified_from">From:</label>
						<input class="actus-input actus-small" type="date" id="modified_from" class="acex-on-sale-date-input" value="${query.modified_from || ''}" />
					</div>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="modified_to">To:</label>
						<input class="actus-input actus-small" type="date" id="modified_to" class="acex-on-sale-date-input" value="${query.modified_to || ''}" />
					</div>
					<button class="actus-btn actus-btn-secondary acex-clear-modified-date">clear</button>
				</div>

				<div class="acex-filter-row acex-filter-author actus-flex acex-premium">
					<label class="actus-label">Author IDs</label>
					<input class="actus-input actus-small" type="text" id="author_ids" class="acex-ids-input" value="${query.author_ids || ''}" />
				</div>

				<div class="acex-filter-row acex-filter-ids actus-flex acex-premium">
					<label class="actus-label">Product IDs</label>
					<input class="actus-input actus-small" type="text" id="ids" class="acex-ids-input" value="${query.ids || ''}" />
				</div>
				<div class="acex-note acex-premium">If product IDs or Specific Products are entered, all other filters will be ignored.</div>

				<div class="acex-filter-row acex-specific-products actus-flex acex-premium">
					<div class="acex-specific-products-target"></div>
					<label class="actus-label">Specific Products</label>
					<input class="actus-input actus-small acex-search-products" type="search" />
				</div>

			</div>
		</div>
	`);
	target.append($productFilters);


	let $prodSearch = new SearchProduct( target.find('.acex-search-products'), $('.acex-specific-products-target') )
	$prodSearch.setValue( query.specific_products || '' );
	$prodSearch.onChange( ( value ) => {
		
		console.log('Specific Products changed:', value );
		query.specific_products = value
		//query.specific_products = value.map( v => v[0] ).join(',');

		$('body').trigger('acex::filter-changed-query', [query, $()]);
		//$('body').trigger('acex::filter-changed', ['specific_products', value, $prodSearch.$input]);
	});
	


	// Status Checkboxes
	$('body').off('change.acex-select-products', '.acex-product-filters .acex-status-checkbox');
	$('body').on('change.acex-select-products', '.acex-product-filters .acex-status-checkbox', (e) => {
		const $el = $(e.currentTarget);
		const val = $el.val();
		const name = 'status';

		$('body').trigger('acex::filter-changed', [name, val, $el]);
	
	});

	// Type Checkboxes
	$('body').off('change.acex-select-products', '.acex-product-filters .acex-type-checkbox');
	$('body').on('change.acex-select-products', '.acex-product-filters .acex-type-checkbox', (e) => {
		const $el = $(e.currentTarget);
		const val = $el.val();
		const name = 'product_type';

		$('body').trigger('acex::filter-changed', [name, val, $el]);
	});

	// Date Inputs
	$('body').off('change.acex-select-products', '.acex-product-filters input[type="date"]');
	$('body').on('change.acex-select-products', '.acex-product-filters input[type="date"]', (e) => {
		const $el = $(e.currentTarget);
		const val = $el.val();
		const name = $el.attr('id');

		$('body').trigger('acex::filter-changed', [name, val, $el]);
	});


	// Clear Date Inputs
	$('body').off('click.acex-select-products', '.acex-product-filters .actus-btn-secondary');
	$('body').on('click.acex-select-products', '.acex-product-filters .actus-btn-secondary', (e) => {
		e.preventDefault();
		const $el = $(e.currentTarget);
		let from, to;

		const label = $el.siblings('.actus-label').text().toLowerCase();
		if ( label.includes('created') ) {
			from = 'date_from';
			to = 'date_to';
		} else if ( label.includes('modified') ) {
			from = 'modified_from';
			to = 'modified_to';
		}

		$('body').trigger('acex::filter-clear-date', [from, to, $el]);


	});

	

	// Text Inputs
	$('body').off('change.acex-select-products', '.acex-product-filters input[type="text"]');
	$('body').on('change.acex-select-products', '.acex-product-filters input[type="text"]', (e) => {
		const $el = $(e.currentTarget);
		const val = $el.val();
		const name = $el.attr('id');

		$('body').trigger('acex::filter-changed', [name, val, $el]);

	});

}


