import {
	ajax_getProductThatHas,
	ajax_getPreviewProducts,
} 	from './helpers.js';
// -----------------------------------------------------	




const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
// -----------------------------------------------------






class TemplatePreview {

	
	constructor() {

		this.$container = null;
		this.template = {
			columns: []
		};
		this.previewProducts = []; // Sample products for preview
		this.mode = 'template'; // 'template' or 'products'

        this.dragHandlers = null;

	}



	events() {



	}

	

	cleanup() {
		// Remove drag handlers
		this.removeDragHandlers();
		
		// Clear DOM references
		this.$container = null;
		
		// Clear product data
		this.previewProducts = [];
		this.template = { columns: [] };
	}



	// MARK: Set Container
	// -----------------------------------------------------
	setContainer( $container ) {
		this.$container = $container;
		return this;
	}
	



	// MARK: Set Preview Products
	// -----------------------------------------------------
	setPreviewProducts( products, mode = 'products' ) {
		this.previewProducts = products || [];
		this.mode = mode;
		return this;
	}



	// MARK: Fetch Products
	// -----------------------------------------------------
	async fetchPreviewProducts() {

		// Fetch 3 products if not already fetched
		if ( ! this.previewProducts.length ) {
			this.previewProducts = await ajax_getPreviewProducts( 10 );
		}

	
		if ( this.previewProducts.length >= 10 ) {
			// Limit to 10 preview products
			//console.log('this.previewProducts', this.previewProducts );
			return;
		}
		

		/*
		// Loop through columns to ensure each has at least one product with a value
		// If not, try to find a product that has a value for that column
		if ( ! this.previewProducts.length ) return;
		for (let i = 0; i < this.template.columns.length; i++) {
			const col = this.template.columns[i];
			let hasValue = false;

			// Check existing preview products for value
			for (let j = 0; j < this.previewProducts.length; j++) {
				const product = this.previewProducts[j];

				let value = product[ col.key ] !== undefined ? product[ col.key ] : '';

				if ( ! value && product['meta_data'] ) {
					value = product['meta_data'][ col.key ] !== undefined ? product['meta_data'][ col.key ] : '';
				}

				if ( ! value ) {
					//let trimmedIndex = col.key.trim().replace(/^_+/, '');
					let trimmedIndex = '_' + col.key
					if ( trimmedIndex && trimmedIndex !== col.key ) {
						value = product[ trimmedIndex ] !== undefined ? product[ trimmedIndex ] : '';
					}
					if ( ! value && product['meta_data'] ) {
						value = product['meta_data'][ trimmedIndex ] !== undefined ? product['meta_data'][ trimmedIndex ] : '';
					}
				}

				if (Array.isArray(value) && value.length === 0) {
					value = '';
				}
				
				if ( value ) {
					hasValue = true;
					break;
				}

			}
			
			if ( hasValue ) {
				// Skip to next column if value found
				continue;
			}

			// If no product has value for this column, try to find one
			let foundProduct = await ajax_getProductThatHas( col.key )
			if ( foundProduct && ! foundProduct.errors ) {
				this.previewProducts.push(foundProduct);
				console.log('----------------- ', col.key, foundProduct );
				//console.log('----------------- ', Object.keys(foundProduct) );
			} else {
				this.previewProducts[0][ col.key ] = '-';
			}

		}
		*/

		console.log('this.previewProducts', this.previewProducts );

	}
		




	// MARK: Create Preview Table
	// -----------------------------------------------------
	async create( template, products ) {

		//console.log('PREVIEW TEMPLATE', template.name );

		this.template = template || { columns: [] };
		if ( products ) {
			this.previewProducts = products;
			this.mode = 'products';
		}
		if ( !this.$container ) return;
			
		// Clean up old drag handlers before creating new table
		if (this.dragHandlers) {
			this.removeDragHandlers();
		}
		
		this.$container.empty();
		if ( ! this.template.columns.length ) return;



		if ( this.mode == 'template' ) {
			this.$container.html(`<div class="actus-loader">${DATA.SVG.loader}</div>`);
			await this.fetchPreviewProducts();
		}
		this.$container.empty();

		
        // Clean up old drag handlers before creating new table
        if (this.dragHandlers) {
            this.removeDragHandlers();
        }


		$('<h3>').text('Preview').appendTo( this.$container );

		const $table = $('<table class="acex-preview-table">').appendTo( this.$container );
		const $thead = $('<thead>').appendTo( $table );
		const $thead2 = $('<thead>').appendTo( $table );
		const $tbody = $('<tbody>').appendTo( $table );
		const $trHead = $('<tr>').appendTo( $thead );
		const $trHead2 = $('<tr>').appendTo( $thead2 );

		// Table Headers
		this.template.columns.forEach( (col, index) => {
			const $th = $('<th>')
				.text( col.header )
				.attr('draggable', true)
				.attr('data-column-index', index)
				.addClass('draggable-header')
				.appendTo( $trHead );
		});
		
		this.template.columns.forEach( col => {
			$('<th>').text( col.key ).appendTo( $trHead2 );
		});

		

		// Make headers draggable
		this.makeDraggable( $trHead, $table );

		// Table Rows
		let rowCount = 0;
		const maxRows = 10;
		this.previewProducts.forEach( product => {
			const $tr = $('<tr>').appendTo( $tbody );
			this.template.columns.forEach( col => {
				let value = product[ col.key ] !== undefined ? product[ col.key ] : '';
				if ( ! value && product['meta_data'] ) {
					value = product['meta_data'][ col.key ] !== undefined ? product['meta_data'][ col.key ] : '';
				}
				if ( ! value ) {
					//let trimmedIndex = col.key.trim().replace(/^_+/, '');
					let trimmedIndex = '_' + col.key
					if ( trimmedIndex && trimmedIndex !== col.key ) {
						value = product[ trimmedIndex ] !== undefined ? product[ trimmedIndex ] : '';
					}
					if ( ! value && product['meta_data'] ) {
						value = product['meta_data'][ trimmedIndex ] !== undefined ? product['meta_data'][ trimmedIndex ] : '';
					}
				}
				if ( Array.isArray(value) ) {
					if ( typeof value[0] === 'object' && value[0] !== null &&
						! Object.keys(DATA.data_taxonomies).includes( col.key ) 
					 ) {
						value = JSON.stringify(value, null, 2);
					} else {
						if ( value.length && typeof value[0] === 'object' && value[0] !== null ) {
							// If array of objects, extract 'name' properties
							value = value.map(v => v.name || v.slug || v.id || '').filter(Boolean);
						}
						value = value.join('\n');
					}
				}

				if ( typeof value === 'object' && value !== null ) {
					value = JSON.stringify(value, null, 2);
				}


				if ( col.key.includes('slug') ) {
					value = decodeURIComponent( value || '' );
				}

				if (typeof value === 'string' && /<\/?[a-z][\s\S]*>/i.test(value)) {
					value = $('<div>').text(value).html(); // Escape HTML to show code, not render
				}
				value = `<div class="acex-field-value">${value}</div>`;
				$('<td>').html( value ).appendTo( $tr );
			});
			rowCount++;
			if ( rowCount >= maxRows ) return false; // Break loop after maxRows
		});



	}

	
    removeDragHandlers() {
        if (!this.dragHandlers || !this.dragHandlers.$headers) return;
        
        const $headers = this.dragHandlers.$headers;
        
        // Remove all drag events
        $headers.off('dragstart dragover dragenter dragleave drop dragend');
    	$headers.off('.acex-columns');
        
        this.dragHandlers = null;
    }



	// MARK: Make Draggable
	// -----------------------------------------------------
	makeDraggable( $headerRow, $table ) {
		let draggedIndex = null;
		let draggedElement = null;

		const $headers = $headerRow.find('th[draggable]');

        // Store reference for cleanup
        this.dragHandlers = { $headers };

		// Drag start
		$headers.on('dragstart.acex-columns', (e) => {
			draggedElement = e.currentTarget;
			draggedIndex = parseInt($(draggedElement).attr('data-column-index'));
			$(draggedElement).addClass('dragging');
			e.originalEvent.dataTransfer.effectAllowed = 'move';
			e.originalEvent.dataTransfer.setData('text/html', draggedElement.innerHTML);
		});

		// Drag over
		$headers.on('dragover.acex-columns', (e) => {
			e.preventDefault();
			e.originalEvent.dataTransfer.dropEffect = 'move';
			
			const $target = $(e.currentTarget);
			if (draggedElement !== e.currentTarget) {
				$target.addClass('drag-over');
			}
			return false;
		});

		// Drag enter
		$headers.on('dragenter.acex-columns', (e) => {
			const $target = $(e.currentTarget);
			if (draggedElement !== e.currentTarget) {
				$target.addClass('drag-over');
			}
		});

		// Drag leave
		$headers.on('dragleave.acex-columns', (e) => {
			$(e.currentTarget).removeClass('drag-over');
		});

		// Drop
		$headers.on('drop.acex-columns', (e) => {
			e.stopPropagation();
			e.preventDefault();

			const $target = $(e.currentTarget);
			$target.removeClass('drag-over');

			const dropIndex = parseInt($target.attr('data-column-index'));

			if (draggedIndex !== null && draggedIndex !== dropIndex) {
				// Reorder columns array
				this.reorderColumns(draggedIndex, dropIndex);
				
				// Rebuild the table with new order
				this.create(this.template);
			}

			return false;
		});

		// Drag end
		$headers.on('dragend.acex-columns', (e) => {
			$(e.currentTarget).removeClass('dragging');
			$headers.removeClass('drag-over');
			draggedIndex = null;
			draggedElement = null;
		});
	}



	// MARK: Reorder Columns
	// -----------------------------------------------------
	reorderColumns( fromIndex, toIndex ) {
		// Remove the column from its current position
		const [movedColumn] = this.template.columns.splice(fromIndex, 1);
		
		// Insert it at the new position
		this.template.columns.splice(toIndex, 0, movedColumn);
		
		console.log('Columns reordered:', this.template.columns.map(c => c.header));
		
		// Trigger custom event for parent components
		if (this.$container) {
			this.$container.trigger('columnsReordered', [this.template.columns]);
		}
	}










}










// -----------------------------------------------------
export default new TemplatePreview();
	

