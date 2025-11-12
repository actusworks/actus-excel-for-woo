import TemplatePreview 	from './template-preview.js';
import Modal 			from './Modal.js';
import QUERIES  		from './data-queries.js';
import productFilters	from './filters/f-product.js';
import categoriesFilter	from './filters/f-categories.js';
import tagsFilter		from './filters/f-tags.js';
import attributesFilter	from './filters/f-attributes.js';
import price_filters	from './filters/f-price.js';
import stockFilters		from './filters/f-stock.js';
import LicenseManager   	from './license.js';
import {
	ajax_getData,
	ajax_saveOption,
	productQuery
} from './helpers.js';
// -----------------------------------------------------

 


const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
const { __ } = wp.i18n;
// -----------------------------------------------------

/**
 * Predefined Product Queries
 * These queries align with common use cases and export templates
 */
const defaultQuery = {
	"query_index"	: 0,
	"query_name"	: "All Published Products",
	"status"		: [ "publish" ],
}


// Merge predefined queries if no queries exist
if (!DATA.queries || !DATA.queries.length) {
	DATA.queries = QUERIES.map(q => ({ ...q }));
}




class SelectProducts {

	
	constructor() {
		this.categories = DATA.product_categories || [];
		this.tags = DATA.product_tags || [];
		this.attributes = DATA.product_attributes || [];
		this.shipping_classes = DATA.product_shipping_classes || [];
		this.count = 0;
		this.products = [];
		this.current = DATA.prefs?.currentQuery || 0;
		this.queries = DATA.queries || []
		if ( ! this.queries.length ) this.queries = predefinedQueries;
		this.query = JSON.parse(JSON.stringify(this.queries[this.current])); // Hard copy of current query

		this.productCountTimeout = null;
		this.productsTimeout = null;
		this.template = { columns: [] };
		this.$preview = $('.acex-products-preview');
		this.queryUnsaved = false
		this.free = LicenseManager.free


	}





	getProducts() {
		console.log('SelectProducts.getProducts', this.products );
		return this.products;
	}






	// MARK: Render
	// -----------------------------------------------------
	async render( target, template ) {
    
		this.cleanup();
		this.check = await LicenseManager.check()

		this.current = DATA.prefs?.currentQuery || 0;
		if ( this.current >= this.queries.length ) {
			this.current = 0;
		}
		this.query = JSON.parse(JSON.stringify(this.queries[this.current]||{}))
		this.target = target;
		this.template = template || { columns: [] };

		this.$status = $(`
				<div class="acex-select-products-status">
					<h4>Selected products: <span class="acex-selected-count">0</span></h4>
					<div class="acex-variable-status"></div>
					<div class="actus-flex-1"></div>
					<button class="actus-btn actus-btn-primary acex-button-export-google">Export to Google Sheets</button>
					<button class="actus-btn actus-btn-primary acex-button-export">Export to Excel File</button	>
				</div>
		`).appendTo( target );

		const $container = $(`
			<div class="acex-select-products">
				<div class="acex-select-filters"></div>
			</div>
		`);

		// Append the container to the target
		target.append($container);

		this.$filtersContainer = $container.find('.acex-select-filters');
		this.$count = this.$status.find('.acex-selected-count');
		this.$variable = this.$status.find('.acex-variable-status');
		this.$preview = this.target.find('.acex-products-preview');
		setTimeout(() => {
			this.$preview = this.target.find('.acex-products-preview');
		}, 10);
		
		this.renderFilters();


		$('body').off('acex::template-changed.acex-select-products');
		$('body').on('acex::template-changed.acex-select-products', (e, template) => {
			this.template = template;
		});

	}


te





	// MARK: Render Filters
	// -----------------------------------------------------
	async renderFilters() {

		await ajax_getData('categories');
		await ajax_getData('tags');
		await ajax_getData('attributes');
		await ajax_getData('shipping_classes');
		this.categories = DATA.product_categories || [];
		this.tags = DATA.product_tags || [];
		this.attributes = DATA.product_attributes || [];
		this.shipping_classes = DATA.product_shipping_classes || [];


		this.$filtersContainer.empty();
		this.renderQueries();

		productFilters( this.query, this.$filtersContainer );
		categoriesFilter( this.query, this.$filtersContainer, this.categories );
		tagsFilter( this.query, this.$filtersContainer, this.tags );
		attributesFilter( this.query, this.$filtersContainer, this.attributes );
		price_filters( this.query, this.$filtersContainer );
		stockFilters( this.query, this.$filtersContainer );
		
		this.filterEvents();
		
		
		$('body').off('click.acex-select-products', '.acex-filter h3')
		$('body').on('click.acex-select-products', '.acex-filter h3', function() {
			$(this).parent().toggleClass('actus-open');
		});

	}




	// MARK: Filter Events
	// -----------------------------------------------------
	filterEvents() {


		// Filter Changed Query
		$('body').off('acex::filter-changed-query.acex-select-products')
		$('body').on('acex::filter-changed-query.acex-select-products', (e, query, $el) => {
			//console.log('filter-changed-query');
			this.query = query;
			this.queryView();
		});


		// Filter Changed
		$('body').off('acex::filter-changed.acex-select-products')
		$('body').on('acex::filter-changed.acex-select-products', (e, name, val, $el) => {
			
			//console.log('Filter changed:', name, val, $el);

			// Check if $el is a checkbox or radio
			if ($el && 
				($el.prop('type') === 'checkbox' || $el.prop('type') === 'radio')
			) {
				
				if ($el.is(':checked')) {
					this.query[ name ] = this.query[ name ] || [];
					this.query[ name ].push(val);
				} else {
					this.query[ name ] = this.query[ name ].filter(v => v !== val);
				}
				if ( this.query[ name ] && this.query[ name ].length == 0 ) {
					delete this.query[ name ];
				}
				this.queryView();
				return;

			}



			if ( $el &&  $el.hasClass('actus-tag') ) {

				if ($el.hasClass('actus-selected')) {
					$el.removeClass('actus-selected');
					this.query[ name ] = this.query[ name ].filter(v => v !== val);
				} else {
					$el.addClass('actus-selected');
					this.query[ name ] = this.query[ name ] || [];
					this.query[ name ].push(val);
				}
				if ( this.query[ name ] && this.query[ name ].length == 0 ) {
					delete this.query[ name ];
				}
				
				this.queryView();
				return;

			}


			


			if ($el && $el.is('input[type="number"]')) {
				const numVal = $el.val();
				const parsedVal = numVal === '' ? null : Number(numVal);
				if (parsedVal === null || isNaN(parsedVal)) {
					delete this.query[name];
				} else {
					this.query[name] = parsedVal;
				}
				this.queryView();
				return;
			}


			

			if ( val ) {
				this.query[ name ] = val;
			} else {
				delete this.query[ name ];
			}

			this.queryView();


		});


		

		// Clear Date Inputs
		$('body').off('acex::filter-clear-date.acex-select-products')
		$('body').on('acex::filter-clear-date.acex-select-products', (e, from, to, $el) => {

			const $filterRow = $el.closest('.acex-filter-row');
			$filterRow.find('input[type="date"]').val('');

			delete this.query[ from ];
			delete this.query[ to ];

			
			this.queryView();

		})


	}




			







	// MARK: Queries
	// -----------------------------------------------------
	renderQueries() {

		let $queries = $('.acex-query-group')

		if ( ! $queries.length ) {
			$queries = $(`
				<div class="acex-filter acex-query-group actus-open">
					<h3>
						Query
						<button class="actus-btn actus-btn-secondary acex-button-reset-queries">
							restore default queries
						</button>
						<span>${DATA.SVG.caret}</span>
					</h3>
					<div class="acex-queries">
						<div class="acex-query-view"></div>
						<div class="acex-queries-list"></div>
					</div>
					<div class="acex-queries-buttons"></div>
				</div>
			`);
			this.$filtersContainer.append($queries);
		}

		$queries.find('.acex-query-view').empty();
		let $queriesList = $queries.find('.acex-queries-list').empty();
		let $queriesButtons = $queries.find('.acex-queries-buttons').empty();


		this.queryView();
		this.queryList( $queriesList );


		$('body').off('click.acex-select-products', '.acex-button-reset-queries');	
		$('body').on('click.acex-select-products', '.acex-button-reset-queries', (e) => {
			e.preventDefault();
			this.resetQueries( $queriesList );
		});



		// Delete Button
		const $deleteButton = $('<button class="actus-btn actus-btn-danger">').text('Delete Query').appendTo( $queriesButtons );
		$deleteButton.on('click', async (e) => {
			e.preventDefault();
			let r = await Modal.confirm('Are you sure you want to delete this query?');
			if (!r) return;
			if (typeof this.deleteQuery === 'function') {
				$(e.target).prop('disabled', true).html( DATA.SVG.loader );
				await this.deleteQuery(this.current);
				$(e.target).prop('disabled', false).text('Delete Query')
			}
		});


		// Add Button
		const $addButton = $('<button class="actus-btn actus-btn-secondary">').text('Add Query').appendTo( $queriesButtons );
		$addButton.on('click', (e) => {
			e.preventDefault();
			this.addQuery();
		});



		// Save Button
		const $saveButton = $('<button class="actus-btn actus-btn-primary acex-save-query">').text('Save Query').appendTo( $queriesButtons );
		$saveButton.on('click', async (e) => {
			e.preventDefault();

			if ( this.query._system ) {
				this.check = await LicenseManager.check('Upgrade to the Premium version to modify default queries.')
				if ( ! this.check ) return;
			}

			this.queries[ this.current ] = JSON.parse(JSON.stringify(this.query));
			this.queryUnsaved = false
//console.log('Saving templates...', this.templates);
			$(e.target).prop('disabled', true).html( DATA.SVG.loader );
			await ajax_saveOption( 'acex_queries', this.queries )
			$(e.target).prop('disabled', false).text('Save Query').hide()
			console.log('Query saved:', this.query);
		});

	}




	// MARK: Reset Queries
	// -----------------------------------------------------
	async resetQueries( $queriesList ) {

		let confirmed = await Modal.confirm('Are you sure you want to restore the default queries?<br>It will not affect your custom queries.')
		if ( ! confirmed ) return;

		this.queries = this.queries.filter( q => ! q._system );
		this.queries = [ ...QUERIES, ...this.queries ];
		DATA.queries = this.queries;

		// Save the updated queries
		await ajax_saveOption( 'acex_queries', DATA.queries );
		Modal.success('Default queries restored successfully.');

		this.queryList( $queriesList );
		setTimeout(() => {
			$queriesList.find('.acex-query-item').first().trigger('click');
		}, 0);

	}




	// MARK: Query List
	// -----------------------------------------------------
	queryList( $queriesList ) {

		// Clear existing list
		$queriesList.empty();
		// Populate with current queries
		this.queries.forEach((query, index) => {
			const isSelected = index === this.current ? 'actus-selected' : '';
			const clss = query.p ? 'acex-premium' : '';
			const $item = $(`
				<div class="acex-query-item ${isSelected} ${clss}" data-index="${index}">
					<span class="acex-query-name">${query.query_name}</span>
					</div>
				`);
					//<button class="acex-query-delete">${DATA.SVG.trash}</button>
			$queriesList.append($item);
		});


		$('body').off('click.acex-query-list', '.acex-query-item');
		$('body').on('click.acex-query-list', '.acex-query-item', async (e) => {
			if ( ! this.check && $(e.currentTarget).hasClass('acex-premium') ) {
				return;
			}

			if ( this.queryUnsaved ) {
				let r = await Modal.confirm(__('You have unsaved changes to the current query. Are you sure you want to switch queries without saving?', 'actus-excel-for-woo'));
				if (!r) return;
			}
			this.queryUnsaved = false
			const index = $(e.currentTarget).attr('data-index');
			const index2 = $(e.currentTarget).index();
			if (typeof this.useQuery === 'function') {
				this.useQuery(index);
			}
		});




	}



	// MARK: Use Query
	// -----------------------------------------------------
	useQuery( index ) {
		index = parseInt(index);

		// Load the selected query
		this.current = index;
		this.query = JSON.parse(JSON.stringify(this.queries[this.current]));
		DATA.prefs.currentQuery = this.current;
		DATA.prefs.save()

		$('.acex-query-item').removeClass('actus-selected');
		$(`.acex-query-item[data-index="${index}"]`).addClass('actus-selected');

		this.renderFilters();
	}



	// MARK: Add Query
	// -----------------------------------------------------
	async addQuery() {

		let userQueries = this.queries.filter( q => ! q._system );
		if ( userQueries.length >= 1 ) {
			this.check = await LicenseManager.check('Upgrade to the Premium version to create more custom queries.')
			if ( ! this.check ) return;
		}

		
		const name = await Modal.prompt('What is the name of the query?', 'Default Query', 'User Input');

		if (!name) return;

		const newQuery = {
			query_name: name,
			// Add other default properties as needed
		};

		this.queries.push(newQuery);
		this.current = this.queries.length - 1;
		this.query = JSON.parse(JSON.stringify(newQuery));

		await ajax_saveOption( 'acex_queries', this.queries )
		this.renderQueries();
		
	}


	// MARK: Delete Query
	// -----------------------------------------------------
	async deleteQuery( index ) {

		// Prevent deleting if only one query remains
		if (this.queries.length <= 1) {
			return;
		}

		// Remove the query from the list
		this.queries.splice(index, 1);
		if (this.current >= this.queries.length) {
			this.current = this.queries.length - 1;
		}
		if (this.current < 0) {
			this.current = 0;
		}
		this.query = JSON.parse(JSON.stringify(this.queries[this.current])) || defaultQuery;
		
		await ajax_saveOption( 'acex_queries', this.queries )
		this.renderQueries();
		this.renderFilters();

		return;
		

	}





	// MARK: Query View
	// -----------------------------------------------------
	queryView() {


		//console.log('QUERY current -----', this.current)
		//console.log('QUERY queries -----', this.queries[this.current])
		//console.log('QUERY -------------', this.query)
		//console.log('QUERY -------------', JSON.stringify(this.query) == JSON.stringify(this.queries[this.current]))

		this.queryUnsaved = false
		$('.acex-save-query').hide();
		if ( JSON.stringify(this.query) != JSON.stringify(this.queries[this.current]) ) {
			this.queryUnsaved = true
			$('.acex-save-query').show();
		}



		let $queries = $('.acex-query-group')
		$queries.find('.acex-query-view').empty();


		this.getProductCount();
		this.query.description = this.query.description || this.query.query_name || '';
		let keys = Object.keys( this.query );
		if (keys.includes('description')) {
			keys = ['description', ...keys.filter(k => k !== 'description')];
		}
		
		keys.forEach( key => {
			if (key.startsWith('_')) return;
			if (key.startsWith('query_')) return;
			if (key.startsWith('template')) return;
			let value = JSON.stringify( this.query[key], null, 2 )

			if (key === 'specific_products' && 
				Array.isArray(this.query.specific_products) &&
				this.query.specific_products.length
			) {

				value = this.query.specific_products.map( v => v[1].split(' - ')[1] || v[1] ).join('<br>');
			}



			if (key === 'tags' && Array.isArray(this.query.tags)) {
				value = this.query.tags
					.map(slug => {
						this.tags = DATA.product_tags || [];
						const tag = this.tags.find(t => String(t.slug) === String(slug));
						return tag ? tag.name : slug;
					})
					.join(', ');
			}
			if (key === 'categories' && Array.isArray(this.query.categories)) {
				value = this.query.categories
					.map(slug => {
						this.categories = DATA.product_categories || [];
						const cat = this.categories.find(c => String(c.slug) === String(slug));
						return cat ? cat.name : slug;
					})
					.join(', ');
			}
			if (key === 'shipping_class' && Array.isArray(this.query.shipping_class)) {
				value = this.query.shipping_class
					.map(slug => {
						this.shipping_classes = DATA.product_shipping_classes || [];
						const shippingClass = this.shipping_classes.find(c => String(c.slug) === String(slug));
						return shippingClass ? shippingClass.name : slug;
					})
					.join(', ');
			}

			if (key === 'attributes' && typeof this.query.attributes === 'object') {
				value = Object.entries(this.query.attributes)
					.map(([attrKey, attrValues]) => {
						
						this.attributes = DATA.product_attributes || [];

						attrKey = attrKey.toLowerCase();
						// Find attribute label by key
						//const attrObj = this.attributes.find(a => 'pa_' + a.attribute_name === attrKey);
						const attrObj = this.attributes.find(a => a.attribute_name === attrKey);
						const attrLabel = attrObj ? attrObj.attribute_label : attrKey;
						
						// Map term IDs to names
						const termNames = Array.isArray(attrValues)
							? attrValues.map(slug => {
								const termObj = attrObj && attrObj.terms
									? attrObj.terms.find(t => String(t.slug) === String(slug))
									: null;
								return termObj ? termObj.name : slug;
							}).join(', ')
							: '';
						return `${attrLabel}: ${termNames}`;
					})
					.join('<br>');
			}

			if (typeof value === 'string') {
				value = value.replace(/^\[|\]$/g, '').replace(/^\{|\}$/g, '');
			} else if (Array.isArray(this.query[key])) {
				value = value.replace(/^\[|\]$/g, '');
			} else if (typeof this.query[key] === 'object' && this.query[key] !== null) {
				value = value.replace(/^\{|\}$/g, '');
			}
			value = value.trim();
			value = value.replace(/^"|"$/g, '');

			let name = DATA.data_props[ key ] ? DATA.data_props[ key ].label : key;

			const $field = $(`
				<div class="acex-query-field" data-key="${key}">
					<label>${name}</label>
					<div class="acex-query-value" data-key="${key}" data-value="${this.query[key] || ''}">${ value }</div>
				</div>
			`);
			$queries.find('.acex-query-view').append($field);
			if (key === 'specific_products') {
				$queries.find('.acex-query-view').html($field);
				return false;
			}
		});



	}





	// MARK: Cleanup
	// -----------------------------------------------------
	cleanup() {
		// Clear timeouts
		if (this.productCountTimeout) {
			clearTimeout(this.productCountTimeout);
			this.productCountTimeout = null;
		}
		if (this.productsTimeout) {
			clearTimeout(this.productsTimeout);
			this.productsTimeout = null;
		}
		
		// Remove all namespaced event handlers
		$('body').off('.selectProducts');
		$('body').off('.acex-props');
		
		// Clear DOM references
		this.$preview = null;
		this.$filtersContainer = null;
		this.$status = null;
		this.$count = null;
		this.$variable = null;
	}


	







	// MARK: Get Product Count
	// -----------------------------------------------------
	async getProductCount(){
		this.$count.text( 0 );
		if ( ! this.query ) return;
		if ( ! Object.keys(this.query).length ) return;

		// Clear any existing timeout
		if (this.productCountTimeout) {
			clearTimeout(this.productCountTimeout);
        	this.productCountTimeout = null; 
		}

		// Return a promise that resolves after the throttle delay
		return new Promise((resolve) => {
			this.$count.html( DATA.SVG.loader );
			this.$preview.html(`<div class="actus-loader">${DATA.SVG.loader}</div>`);

			this.productCountTimeout = setTimeout(async () => {
				
				let query = JSON.parse( JSON.stringify(this.query) );
				if ( query.specific_products ) {
					query.ids = query.ids || []
					query.ids = [ ...new Set([ ...query.ids, ...query.specific_products ]) ];
					query.ids = query.ids.join(',');
					delete query.specific_products;
				}

				this.$count.html( DATA.SVG.loader );
				this.count = await productQuery( query, true );
				this.$count.text( this.count || 0 );
				
				// Clear reference after use
				this.productCountTimeout = null;
				
				//this.$variable.html('');
				resolve(this.count);
				await this.fetchProducts( query );
			}, 1000); // 1000ms throttle delay
		});
	}




	// MARK: Fetch Products
	// -----------------------------------------------------
	async fetchProducts( query ){
		if ( ! query ) return;
		if ( ! Object.keys(query).length ) return;

		// Clear any existing timeout
		if (this.productsTimeout) {
			clearTimeout(this.productsTimeout);
        this.productsTimeout = null;
		}

		// Return a promise that resolves after the throttle delay
		return new Promise((resolve) => {
			this.productsTimeout = setTimeout(async () => {
				let response = await productQuery( query );
				this.products = response.products || [];
            
				// Clear reference after use
				this.productsTimeout = null;
				
				resolve(this.products);
				//this.$count.text( (response.total + response.variations) || 0 );
				//this.$variable.html( response.variations ? `Including ${response.variations} variations from ${response.variable} variable products` : '' );

				let keep20products = this.products.slice(0, 20);
//console.log('Query Preview Products:', keep20products);
				TemplatePreview.setContainer( this.$preview );
				TemplatePreview.create(this.template, keep20products);
			}, 1000); // 1000ms throttle delay
		});
	}






}















export default new SelectProducts();


