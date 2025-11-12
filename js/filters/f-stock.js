



const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
// -----------------------------------------------------








// MARK: Stock Filter
// -----------------------------------------------------
export default function stockFilters( query, target ) {

	const hasValues = !!(query.stock_status || query.min_stock || query.max_stock || 
		query.min_low_stock || query.max_low_stock);

	// Stock Filters
	const $stockFilter = $(`
		<div class="acex-filter actus-stock-filters acex-premium ${hasValues ? 'actus-open' : ''}">
			<h3>Stock<span>${DATA.SVG.caret}</span></h3>
			<div class="acex-filter-body">

				<div class="acex-filter-row acex-filter-stock-status actus-flex">
					<div class="actus-switch-group acex-stock-manage">
						<label class="actus-label">Manage Stock</label>
						<span alt="no" class="actus-switch ${query.manage_stock=='no' ? 'actus-selected' : ''}" />no</span>
						<span alt="yes" class="actus-switch ${query.manage_stock=='yes' ? 'actus-selected' : ''}" />yes</span>
						<span alt="clear" class="actus-switch ${ ! query.manage_stock ? 'actus-selected' : ''}" />clear</span>
					</div>
					<label><input type="checkbox" class="acex-stock-status-checkbox" value="instock" ${query.stock_status?.includes('instock') ? 'checked' : ''} /> In Stock</label>
					<label><input type="checkbox" class="acex-stock-status-checkbox" value="outofstock" ${query.stock_status?.includes('outofstock') ? 'checked' : ''} /> Out of Stock</label>
					<label><input type="checkbox" class="acex-stock-status-checkbox" value="onbackorder" ${query.stock_status?.includes('onbackorder') ? 'checked' : ''} /> On Backorder</label>
				</div>

				<div class="acex-filter-row acex-filter-stock-quantity actus-flex">
					<label class="actus-label">Stock</label>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="min_stock">min:</label>
						<input class="actus-input actus-small" type="number" id="min_stock" class="acex-stock-quantity-input" min="0" value="${query.min_stock || ''}" />
					</div>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="max_stock">max:</label>
						<input class="actus-input actus-small" type="number" id="max_stock" class="acex-stock-quantity-input" min="0" value="${query.max_stock || ''}" />
					</div>
				</div>

				<div class="acex-filter-row acex-filter-low-stock-quantity actus-flex">
					<label class="actus-label">Low Stock</label>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="min_low_stock">min:</label>
						<input class="actus-input actus-small" type="number" id="min_low_stock" class="acex-low-stock-quantity-input" min="0" value="${query.min_low_stock || ''}" />
					</div>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="max_low_stock">max:</label>
						<input class="actus-input actus-small" type="number" id="max_low_stock" class="acex-low-stock-quantity-input" min="0" value="${query.max_low_stock || ''}" />
					</div>
				</div>
				
				<div class="acex-filter-row acex-filter-low-stock-quantity actus-flex">
					<label class="actus-label">Shipping Classes</label>
					<div class="acex-filter-classes">
						${DATA.product_shipping_classes.map(clss => {
							const isSelected = query.shipping_class?.includes(String(clss.slug)) ? 'actus-selected' : '';
							return `<span class="actus-tag ${isSelected}" data-id="${clss.term_id}" data-slug="${clss.slug}">${clss.name}</span>`;
						}).join('')}
					</div>
				</div>

			</div>
		</div>
	`);


	target.append($stockFilter);


	// Manage Stock Switch
	$('body').off('click.acex-select-products', '.acex-stock-manage span');
	$('body').on('click.acex-select-products', '.acex-stock-manage span', (e) => {
		const $span = $(e.currentTarget);
		$span.siblings().removeClass('actus-selected');
		$span.addClass('actus-selected');
		let value = $span.attr('alt');

		if (value === 'clear') {
			delete query.manage_stock;
		} else {
			query.manage_stock = value;
		}

		$('body').trigger('acex::filter-changed-query', [query, $span]);
	});


	// Stock Status Checkboxes
	$('body').off('change.acex-select-products', '.acex-stock-status-checkbox');
	$('body').on('change.acex-select-products', '.acex-stock-status-checkbox', (e) => {
		const $el = $(e.currentTarget);
		const val = $el.val();
		const name = 'stock_status';

		$('body').trigger('acex::filter-changed', [name, val, $el]);
	});

	
	// Stock Quantity Inputs
	$('body').off('change.acex-select-products', '.acex-filter-stock-quantity input');
	$('body').on('change.acex-select-products', '.acex-filter-stock-quantity input', (e) => {
		const $el = $(e.currentTarget);
		const val = parseInt($el.val());
		const name = $el.attr('id');

		$('body').trigger('acex::filter-changed', [name, val, $el]);
	})


	// Shipping Classes
	$('body').off('click.acex-select-products', '.acex-filter-classes .actus-tag')
	$('body').on('click.acex-select-products', '.acex-filter-classes .actus-tag', (e) => {
		const $el = $(e.currentTarget);
		const val = $el.attr('data-slug');
		const name = 'shipping_class';

		$('body').trigger('acex::filter-changed', [name, val, $el]);
	});


}




