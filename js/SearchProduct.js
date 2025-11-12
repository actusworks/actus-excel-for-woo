


const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}




let root;




class SearchProduct {

	constructor( $input, $target, name ) {

		this.$container 	= null;
		this.$input 		= $input || $();
		this.$target 		= $target || $();
		this.name			= name || '';
		this.$list 			= $();
		this.listCurrent 	= 0;
		this.result 		= [];
		this.selected 		= [];
		this.callback		= null;

		if ( this.$input.length ) {
			this.$container = this.$input.parent();
			this.$input.attr('autocomplete', 'off');
			this.name = this.name || this.$input.attr('name') || this.$container.attr('name') || 'search_product';
			
			const position = this.$container.css('position');
			if (!['relative', 'absolute', 'fixed'].includes(position)) {
				this.$container.css('position', 'relative');
			}

			this.$hidden = $('<input type="hidden" />')
				.attr('name', this.name )
				.insertBefore( this.$input );

			this.events();
		}

		root = this;
	
	}


	
	// MARK: Events
	// -----------------------------
	events(){

		this.$input.on('input', 	this.search.bind(this) )
		this.$input.on('keydown', 	this.preventEnterOnSearch.bind(this) )
		this.$input.on('keyup', 	this.listKeyEvents.bind(this) )

	}



	// MARK: Set Value
	// -----------------------------
	setValue( val ){
		this.selected = val || [];
		this.$hidden.val( JSON.stringify(this.selected) )
		this.populateTarget()
	}



	// MARK: Search
	// -----------------------------
	search( ev ) {

		let val = $.trim( $(ev.target).val() );
		
		if ( val.length > 2 ) {
			if ( this.ajax ) this.ajax.abort();
			if ( this.timeout ) clearTimeout( this.timeout );

			this.listInit( ev );

			this.timeout = setTimeout(event =>{
				this.ajax = $.post( DATA.ajax_url, {
					_ajax_nonce : DATA.nonce,
					action      : 'acex_search_product',
					search      : val,
				}, function( result ){
					root.result = result.data;
					root.resultList();
					console.log('result', result.data)
				})
			}, 400, ev)
					
		} else {
			if ( this.$list.length ) {
				this.$list.remove();
				this.$list = $();
			}
		}



	}




	// MARK: List Init
	// -----------------------------
	listInit( ev ) {
console.log('listInit', this.$list);
		if ( this.$list && this.$list.length ) return;

		this.$list =
			$('<div class="acex-results">')
				.html( DATA.SVG.loader )
				.insertAfter( ev.target );


		this.$list.css({
			position: 'absolute',
			zIndex: 9999,
			width: this.$input.outerWidth(),
			top: this.$input.offset().top + this.$input.outerHeight(),
			left: this.$input.offset().left
		}).appendTo('body');



		this.updateListPosition = () => {
			if (!this.$list.length) return;
			this.$list.css({
				top: this.$input.offset().top + this.$input.outerHeight(),
				left: this.$input.offset().left,
				width: this.$input.width()
			});
		};

		$(window).off('scroll.acex-search resize.acex-search');
		$(window).on('scroll.acex-search resize.acex-search', this.updateListPosition);
	}




	// MARK: List
	// -----------------------------
	resultList() {
		this.$list.empty();
		const selectedIds = this.selected.map(item => item[0]);
		this.result = this.result.filter(row => !selectedIds.includes(String(row.ID)));
		if ( ! this.result.length ) {
			this.$list.remove();
			this.$list = $();
			return;
		}
		
		 
		this.result.forEach(row =>{
			$('<div class="acex-row">')
				.attr('data-id', row.ID )
				.attr('data-title', row.post_title )
				.attr('data-sku', row.sku )
				.html( row.sku + ' - ' + row.post_title )
				.appendTo( this.$list )
				.click( this.listSelect.bind(this) );
		})
		this.listCurrent = 0;
		this.listActive()

		
		$('body').off('click.acex-search')
		$('body').on('click.acex-search', (e) => {
			if ( ! $(e.target).closest('.acex-results').length )
				if ( this.$list?.length ) {
					this.$list.remove();
					this.$list = $();
				}
		})

	}



	// MARK: List Events
	// -----------------------------
	listKeyEvents( ev ){
		if ( ! this.$list.length ) return;
		if ( this.$list.children().length <= 1 ) return;

		// Arrow Up
		if (ev.keyCode == 38) {
			this.listCurrent--;
			if ( this.listCurrent < 0 )
				this.listCurrent = this.$list.children().length;
			this.listActive()
		}
		// Arrow Down
		if (ev.keyCode == 40) {
			this.listCurrent++;
			if ( this.listCurrent > this.$list.children().length )
				this.listCurrent = 0;
			this.listActive()
		}
		// Enter
		if (ev.keyCode == 13) {
			ev.preventDefault();
			ev.stopPropagation();
			this.listSelect()
		}
	
	}



	// MARK: List Active
	// -----------------------------
	listActive(){
		this.$list.children().removeClass('actus-active');
		this.$list.children().eq( this.listCurrent )
			.addClass('actus-active')
	}



	// MARK: List Select
	// -----------------------------
	listSelect( ev ){
		let el = this.$list.children().eq( this.listCurrent );
		if ( ev ) el = $(ev.target);
		let id 		= el.attr('data-id')
		let sku 	= el.attr('data-sku')
		let title 	= el.attr('data-title')

		this.$list.remove();
		this.$list = $();

		// add value to variable
		this.selected.push([ id, el.text() ])
		this.$hidden.val( JSON.stringify(this.selected) )
		this.onChange( null, this.selected )
		this.populateTarget()
		

	}



	// MARK: On Change
	// -----------------------------
	onChange( fnc, val ){

		if ( fnc ) this.callback = fnc;
		if ( val ) this.callback( val )

	}




	
	// MARK: Remove Item
	// -----------------------------
	removeItem( ev ){
		let el   = $( ev.target ).closest('.acex-row');
		let id   = el.attr('data-id')
		el.remove();

		this.selected.forEach((row, idx) =>{
			if ( row[0] == id ) this.selected.splice(idx, 1);
		})
		this.$hidden.val( JSON.stringify(this.selected) )
		this.onChange( null, this.selected )
		this.populateTarget()
	}




	// MARK: prevent Enter On Search
	// -----------------------------
	preventEnterOnSearch( ev ){
		//if (ev.key == 'Enter') {
		if (ev.keyCode == 13) {
			ev.preventDefault();
			ev.stopPropagation();
		}
		
	}




	
	// MARK: Populate Target
	// -----------------------------
	populateTarget(){
		if ( ! this.$target?.length ) return;

		this.$target.empty();

		this.selected.forEach(row =>{

			let $item = $('<div class="acex-row actus-tag">')
				.attr('data-id', row[0] )
				.html( row[1] )
				.appendTo( this.$target )

			$( DATA.SVG.times ).appendTo( $item )
				.click( this.removeItem.bind(this) )

		})
			
	}




}
	







export default SearchProduct;
