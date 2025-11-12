



const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
// -----------------------------------------------------








// MARK: Price Filter
// -----------------------------------------------------
export default function price_filters( query, target ) {

	const hasValues = !!(query.min_price || query.max_price || query.min_sale_price || 
		query.max_sale_price || query.date_on_sale_from || query.date_on_sale_to);

	// Price Filters
	const $priceFilter = $(`
		<div class="acex-filter actus-price-filters ${hasValues ? 'actus-open' : ''}">
			<h3>Price<span>${DATA.SVG.caret}</span></h3>
			<div class="acex-filter-body">

			
				<div class="acex-filter-row acex-premium acex-filter-on-sale actus-flex">
					<div class="actus-switch-group acex-on-sale">
						<label class="actus-label">On Sale</label>
						<input type="checkbox" class="acex-on-sale-checkbox" value="on_sale" ${query.on_sale ? 'checked' : ''} />
					</div>
				</div>

				<div class="acex-filter-row acex-filter-price actus-flex">
					<label class="actus-label">Price</label>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="min_price">min:</label>
						<input class="actus-input actus-small" type="number" id="min_price" class="acex-price-input" min="0" step="0.01" value="${query.min_price || ''}" />
					</div>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="max_price">max:</label>
						<input class="actus-input actus-small" type="number" id="max_price" class="acex-price-input" min="0" step="0.01" value="${query.max_price || ''}" />
					</div>
				</div>

				<div class="acex-filter-row acex-premium acex-filter-sale-price actus-flex">
					<label class="actus-label">Sale Price</label>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="min_sale_price">min:</label>
						<input class="actus-input actus-small" type="number" id="min_sale_price" class="acex-sale-price-input" min="0" step="0.01" value="${query.min_sale_price || ''}" />
					</div>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="max_sale_price">max:</label>
						<input class="actus-input actus-small" type="number" id="max_sale_price" class="acex-sale-price-input" min="0" step="0.01" value="${query.max_sale_price || ''}" />
					</div>
				</div>

				<div class="acex-filter-row acex-premium acex-filter-on-sale-dates actus-flex">
					<label class="actus-label">On Sale Dates</label>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="date_on_sale_from">From:</label>
						<input class="actus-input actus-small" type="date" id="date_on_sale_from" class="acex-on-sale-date-input" value="${query.date_on_sale_from || ''}" />
					</div>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="date_on_sale_to">To:</label>
						<input class="actus-input actus-small" type="date" id="date_on_sale_to" class="acex-on-sale-date-input" value="${query.date_on_sale_to || ''}" />
					</div>
					<button class="actus-btn actus-btn-secondary acex-clear-created-date">clear</button>
				</div>

				
				<div class="acex-filter-row acex-premium acex-filter-total-sales actus-flex">
					<label class="actus-label">Total Sales</label>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="min_total_sales">min:</label>
						<input class="actus-input actus-small" type="number" id="min_total_sales" class="acex-sales-input" min="0" step="1" value="${query.min_total_sales || ''}" />
					</div>
					<div class="actus-form-group actus-flex">
						<label class="actus-label actus-small" for="max_total_sales">max:</label>
						<input class="actus-input actus-small" type="number" id="max_total_sales" class="acex-sales-input" min="0" step="1" value="${query.max_total_sales || ''}" />
					</div>
				</div>


			</div>
		</div>
	`);

	target.append($priceFilter);


	

	// On Sale Checkbox
	$('body').off('click.acex-select-products', '.acex-on-sale-checkbox');
	$('body').on('click.acex-select-products', '.acex-on-sale-checkbox', (e) => {
		const $checkbox = $(e.currentTarget);
		let value = $checkbox.is(':checked') ? 'yes' : 'no';


		if (value === 'clear' || value == 'no') {
			delete query.on_sale;
		} else {
			query.on_sale = value;
		}

		$('body').trigger('acex::filter-changed-query', [query, $checkbox]);
	});


	// Price Inputs
	$('body').off('change.acex-select-products', '.actus-price-filters input:not(.acex-on-sale-checkbox)');
	$('body').on('change.acex-select-products', '.actus-price-filters input:not(.acex-on-sale-checkbox)', (e) => {
		const $el = $(e.currentTarget);
		const val = parseFloat($el.val());
		const name = $el.attr('id');

		$('body').trigger('acex::filter-changed', [name, val, $el]);
	});

	// On Sale Dates Inputs
	$('body').off('change.acex-select-products', '.acex-filter-on-sale-dates input');
	$('body').on('change.acex-select-products', '.acex-filter-on-sale-dates input', (e) => {
		const $el = $(e.currentTarget);
		const val = $el.val();
		const name = $el.attr('id');

		$('body').trigger('acex::filter-changed', [name, val, $el]);
	});


	// Clear Date Inputs
	$('body').off('click.acex-select-products', '.acex-price-filters .actus-btn-secondary');
	$('body').on('click.acex-select-products', '.acex-price-filters .actus-btn-secondary', (e) => {
		e.preventDefault();
		const $el = $(e.currentTarget);
		let from = 'date_on_sale_from';
		let to = 'date_on_sale_to';

		$('body').trigger('acex::filter-clear-date', [from, to, $el]);
	});



}




