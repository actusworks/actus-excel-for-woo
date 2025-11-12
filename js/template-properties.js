import TemplatePreview 		from './template-preview.js';
import LicenseManager   	from './license.js';
import Modal 				from './Modal.js';
import { log } 				from './helpers.js';
// -----------------------------------------------------



const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
const { __ } = wp.i18n;
// -----------------------------------------------------











class TemplateProperties {



	
	constructor() {

		this.template = null;
		this.free = LicenseManager.free
		
		this.$target = null;
		this.$propsContainer = null;
		this.$selectAllButton = null;



	}




	// MARK: Init
	// -----------------------------------------------------
	async init() {
	}




	// MARK: Events
	// -----------------------------------------------------
	events() {

		$('body').off('click.acex-props', '.acex-group-checkbox');
		$('body').on('click.acex-props', '.acex-group-checkbox', async (e) => {
			e.preventDefault();
			e.stopPropagation();
			
			if ( this.template.system ) {
				this.check = await LicenseManager.check('Upgrade to the Premium version to modify system templates.')
				if ( ! this.check ) return;
			}
	
			this.toggleGroup(e);
		});
		$('body').off('click.acex-props', '.acex-prop-item');
		$('body').on('click.acex-props', '.acex-prop-item', async (e) => {
			e.preventDefault();
			e.stopPropagation();
			
			if ( this.template.system ) {
				if ( ! this.check ) $('.actus-modal-overlay').remove();
				this.check = await LicenseManager.check('Upgrade to the Premium version to modify system templates.')
				if ( ! this.check ) return;
			}

			this.selectProperty(e);
		});


	}




	// MARK: Render
	// -----------------------------------------------------
	async render( target, template ) {
		if ( ! target ) return;
		this.$target = target || null;
		this.template = template || null;

		this.check = await LicenseManager.check();

		// Create Section
		const $section = $('<div class="acex-section acex-properties-section">').appendTo( this.$target );
		const $h3 = $('<h3>').text(__('Product Properties', 'actus-excel-for-woo')).appendTo( $section );
		
		
		// Select All Button
		this.$selectAllButton = $('<button class="actus-btn actus-btn-secondary actus-small">')
			.text(__('Select All Properties', 'actus-excel-for-woo'))
			.on('click', this.toggleAll.bind(this))
			.appendTo($h3);

		$('<p>').text(__('Select the product properties you want to include in the export.', 'actus-excel-for-woo')).appendTo( $section );


		// Properties Container
		this.$propsContainer = $('<div class="acex-props-container">').appendTo( this.$target );
		for ( let key in DATA.data_groups ) {
			const group = DATA.data_groups[key];

			let groupClass = '';
			if ( ! this.free.groups.includes( key ) ) {
				groupClass = 'acex-premium';
			}

			// Create Group
			const $group = $('<div class="acex-prop-group">')
				.addClass( groupClass )
				.attr('data-group', key)
				.appendTo( this.$propsContainer );


			// Group Header
			const $groupHeader = $('<div class="acex-prop-group-header">').appendTo($group);
			$('<input type="checkbox" class="acex-group-checkbox">')
				.appendTo($groupHeader)
				//.on('click', this.toggleGroup.bind(this))
			const $h4 = $('<h4>')
				.text(group.label)
				.attr('data-title', group.description)
				.appendTo( $groupHeader );


			// List
			const $list = $('<div class="acex-prop-list">').appendTo( $group );
			let fields = this.filterByGroup( key );

			// header
			if ( key === 'meta' ) {
				fields = DATA.data_meta || [];
				$group.addClass('is-closed');
				$h4.prepend('<span class="acex-caret"></span>');
				$list.hide();
				$groupHeader.on('click', function(e) {
					if ($(e.target).is('input.acex-group-checkbox')) return;
					const $grp = $(this).closest('.acex-prop-group');
					$grp.toggleClass('is-closed');
					$grp.find('.acex-prop-list').slideToggle();
				});
			}

			// properties
			if ( ! Object.keys(fields).length ) continue;
			for ( let propKey in fields ) {
				const prop = fields[propKey];
				const key = prop.meta_key;
				const isChecked = this.template.columns.some(col => col.key === propKey);
				let descr = prop.description
				if ( prop.type && Array.isArray(prop.type) ) {
					if ( Array.isArray(prop.type) ) {
						descr += '\n(' + prop.type.join(', ') + ')';
					} else {
						descr += '\n(' + prop.type + ')';
					}
				}
				let clss = ''
				let icon = ''
					
				if ( ! this.free.props.includes( propKey ) ) {
					clss = 'acex-premium';
					if ( ! this.check ) {
						descr = "🔒 PREMIUM property\n\n" + descr;
					}
				}

				
				if ( DATA.data_warnings && DATA.data_warnings[ propKey ] ) {
					clss += ' has-warning';
					icon = DATA.SVG['warning-filled'];
					descr += '\n\n⚠️ ' + DATA.data_warnings[ propKey ];
				}
				if ( DATA.data_restrictions && DATA.data_restrictions[ propKey ] ) {
					clss += ' has-restriction';
					icon = DATA.SVG['warning-filled'];
					descr += '\n\n❗ ' + DATA.data_restrictions[ propKey ];
				}
				const $item = $(`<div class="acex-prop-item ${clss}" title="${descr}" data-type="${prop.type||''}" data-align="${prop.align||''}">
						<input type="checkbox" id="prop_${propKey}" name="prop_${propKey}" value="${propKey}" ${isChecked ? 'checked' : ''}>
						<div class="acex-prop-warning" title="${key||propKey||''}">${icon}</div>
						<label for="prop_${propKey}">${prop.label}</label>
					</div>
				`).appendTo( $list )
				//.click( this.selectProperty.bind(this) );
				if (isChecked) $item.addClass('selected');
			}




			this.checkGroupCheckboxState($group);
			
		}
		
		this.events();

	}







	// MARK: Toggle All
	// -----------------------------
	toggleAll(e) {
		const $button = $(e.currentTarget);
		const shouldSelect = $button.text() === __('Select All Properties', 'actus-excel-for-woo');


		this.$propsContainer.find('.acex-prop-group').each((index, group) => {
			const $group = $(group);
			$group.find('.acex-prop-item').each((i, item) => {
				const $item = $(item);
				const $checkbox = $item.find('input[type="checkbox"]');
				let key = $checkbox.val();
				let name = $item.find('label').text();
				let type = $item.attr('data-type') || 'string';
				let align = $item.attr('data-align') || 'left';


				if ($checkbox.prop('checked') !== shouldSelect) {
					if ( !this.template.columns.some(col => col.key === key) ) {
						this.template.columns.push({ header: name, key: key, type: type, align: align });
					}
				} else {
					// Remove property from template columns if present
					this.template.columns = this.template.columns.filter(col => col.key !== key);
				}
				

			});
		});
			
		$('body').trigger('acex::template-changed', [ this.template ]);


		//console.log('toggleAll', this.template);

	}






	// MARK: Toggle Group
	// -----------------------------
	toggleGroup(e) {
		const $groupCheckbox = $(e.currentTarget);
		const $group = $groupCheckbox.closest('.acex-prop-group');
		const isChecked = $groupCheckbox.prop('checked');

		/*
		if ( isChecked ) {
			$group.find('.acex-prop-item input[type="checkbox"]').prop('checked', true);
		} else {
			$group.find('.acex-prop-item input[type="checkbox"]').prop('checked', false);
		}
		*/
		$group.find('.acex-prop-item input[type="checkbox"]').each((i, checkbox) => {
			//$(checkbox).trigger('click.acex-props');

			const propKey = $(checkbox).val();
			const exists = this.template.columns.some(col => col.key === propKey);
			//console.log(i, propKey);
			if ( ! exists && isChecked ) {
				// Add property to template columns if not already present
				const $item = $(checkbox).closest('.acex-prop-item');
				const propName = $item.find('label').text();
				const type = $item.attr('data-type');
				const align = $item.attr('data-align');
				this.template.columns.push({ header: propName, key: propKey, type: type, align: align });
			} else if ( exists && ! isChecked ) {
				// Remove property from template columns if present
				this.template.columns = this.template.columns.filter(col => col.key !== propKey);
			}
		})

		$('body').trigger('acex::template-changed', [ this.template ]);
		//this.checkGroupCheckboxState( $group );
	
		
	}




	

	// MARK: Select Property
	// -----------------------------
	selectProperty(e) {
		if (!this._selectPropertyThrottle) {
			this._selectPropertyThrottle = { lastCall: 0, timer: null };
		}
		const throttle = this._selectPropertyThrottle;
		const now = Date.now();
		if (now - throttle.lastCall < 300) {
			clearTimeout(throttle.timer);
			throttle.timer = setTimeout(() => {
				throttle.lastCall = Date.now();
				this._selectProperty(e);
			}, 300);
			return;
		}
		throttle.lastCall = now;
		this._selectProperty(e);
	}
	_selectProperty(e) {
		e.stopPropagation();
		e.preventDefault();

		const $item = $(e.currentTarget);
		const type = $item.attr('data-type');
		const align = $item.attr('data-align');
		const $checkbox = $item.find('input[type="checkbox"]');
		$checkbox.prop('checked', !$checkbox.prop('checked'));
		$item.toggleClass('selected', $checkbox.prop('checked'));

		const propKey = $checkbox.val();
		const propName = $item.find('label').text();
		

		this.template.columns = this.template.columns || [];
		if ( $checkbox.prop('checked') ) {
			// Add property to template columns if not already present
			if ( !this.template.columns.some(col => col.key === propKey) ) {
				this.template.columns.push({ header: propName, key: propKey, type: type, align: align });
			}
		} else {
			// Remove property from template columns if present
			this.template.columns = this.template.columns.filter(col => col.key !== propKey);
		}
//console.log('selectProperty', this.template);
		TemplatePreview.create( this.template );
		this.checkGroupCheckboxState($item.closest('.acex-prop-group'));
	}





	

	// MARK: Filter By Group
	// -----------------------------
	filterByGroup( groupName, dataProps = DATA.data_props ) {
		let result = Object.fromEntries(
			Object.entries(dataProps).filter(([key, prop]) => prop.group === groupName)
		);

		if ( groupName === 'taxonomies' ) {
			// Include taxonomies from DATA.data_taxonomies
			const taxonomies = DATA.data_taxonomies || {};
			Object.keys(taxonomies).forEach(taxKey => {
				let key = taxKey
				if ( taxKey == 'product_cat' ) key = 'categories';
				if ( taxKey == 'product_tag' ) key = 'tags';

				result[key] = {
					align: 'center',
					description: taxonomies[taxKey].description || taxonomies[taxKey].label || '',
					group: 'taxonomies',
					label: taxonomies[taxKey].label,
					meta_key: taxKey,
					type: 'array',
					hierarchical: taxonomies[taxKey].hierarchical || false,
				};
			});
			//console.log('Taxonomies included in properties:', result);
		}

		return result;
	}


	
	// MARK: Check Group Checkbox State
	// -----------------------------
	checkGroupCheckboxState($group) {
		const $groupCheckbox = $group.find('.acex-group-checkbox');
		const $items = $group.find('.acex-prop-item input[type="checkbox"]');
		const total = $items.length;
		const checked = $items.filter(':checked').length;

		if (checked === 0) {
			$groupCheckbox.prop('checked', false);
			$groupCheckbox.prop('indeterminate', false);
		} else if (checked === total) {
			$groupCheckbox.prop('checked', true);
			$groupCheckbox.prop('indeterminate', false);
		} else {
			$groupCheckbox.prop('indeterminate', true);
		}

		// Update Select All button state
		if (this.$selectAllButton) {
			const allProps = this.$propsContainer.find('.acex-prop-item input[type="checkbox"]');
			const allChecked = allProps.filter(':checked').length;
			if (allChecked === allProps.length) {
				this.$selectAllButton.text(__('Deselect All Properties', 'actus-excel-for-woo'));
			} else {
				this.$selectAllButton.text(__('Select All Properties', 'actus-excel-for-woo'));
			}
		}
	}




	// MARK: Cleanup
	// -----------------------------
	cleanup() {
		
        $('body').off('.acex-props');
		
		if ( this.$propsContainer ) {
			this.$propsContainer.remove();
			this.$propsContainer = null;
		}
		if ( this.$selectAllButton ) {
			this.$selectAllButton.remove();
			this.$selectAllButton = null;
		}
	}


}







export default new TemplateProperties();
