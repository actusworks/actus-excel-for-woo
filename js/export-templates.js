import TemplatePreview 		from './template-preview.js';
import TemplateProperties 	from './template-properties.js';
import TEMPLATES 			from './data-templates.js';
import Modal 				from './Modal.js';
import LicenseManager   	from './license.js';
import {
	ajax_saveOption,
} from './helpers.js';
// -----------------------------------------------------



const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
const { __ } = wp.i18n;
// -----------------------------------------------------





const templateDefault = {
	name: 'New Template',
	sheet: 'Products',
	columns: [
		{ header: 'Product ID', key: 'id', type: 'int' },
		{ header: 'Product Name', key: 'name', type: 'string' },
	]
};




// Merge predefined templates if no templates exist
if (!DATA.templates || !DATA.templates.length) {
	DATA.templates = TEMPLATES.map(tpl => ({ ...tpl }));
}





class ExportTemplates {

	
	constructor() {


		this.currentTemplate = 0;
		this.templates 		 = [];
		this.template 		 = null;

		this.$list 		 		 = null;
		this.$listContainer 	 = null;
		this.$buttonEditTemplate = null;
		this.$target 			 = null;
		this.$preview 			 = null;

	}




	// MARK: Init
	// -----------------------------------------------------
	async init( $target ) {
		this.$target = $target || null;
		if (this.isInitialized) {
			this.cleanup();
		}

		this.currentTemplate = DATA.prefs?.currentTemplate || 0;
		this.templates = DATA.templates || [];
		if ( ! this.templates.length ) this.templates = [ { ...templateDefault } ];
		this.template = this.templates[this.currentTemplate];
	}




	// MARK: Events
	// -----------------------------
	events() {

		// Select Template
		$('body').off('click.acex-export')
		$('body').on('click.acex-export', '.acex-template-item', (e) => {
			const index = $(e.target).index();

			$(`.acex-template-item[data-index="${index}"]`).addClass('actus-active').siblings().removeClass('actus-active');
			let template = this.templates[ index ] || { ...templateDefault };

			this.template = template;
			this.currentTemplate = index;
			DATA.prefs.currentTemplate = index;
			DATA.prefs.save()

			if ( ! this.template.columns.length ) {
				this.$buttonEditTemplate.trigger('click');
			}
			$('body').trigger('acex::template-changed', [ this.template ]);
		});



		// Template Changed
		$('body').off('acex::template-changed.acex-export')
		$('body').on('acex::template-changed.acex-export', async (e, template) => {
			console.log('@@@ acex::template-changed.acex-export', template );
			//let products = SelectProducts.getProducts();
			TemplatePreview.setContainer( this.$preview );
			TemplatePreview.create( this.template );
		});
		
	
	}



	

	// MARK: List
	// -----------------------------
	renderList( target, showTitle = true ) {
		if ( ! target ) return;

		this.$list = target.find('.acex-template-list');
		if ( ! this.$list.length ) {
			this.$list = $('<div class="acex-template-list">').appendTo( target );
		}
		if ( showTitle ) {
			$('<h3>').text(__('Select a Template', 'actus-excel-for-woo')).appendTo( this.$list );
		}
		this.$listContainer = $('<div class="acex-template-list-container">').appendTo( this.$list );
		this.templates.forEach( (template, index) => {
			const isActive = this.template === template;
			const $item = $(`<div class="acex-template-item" data-index="${index}">${template.name}</div>`)
				.toggleClass('actus-active', isActive)
				.appendTo( this.$listContainer );
		});


		
		this.events();


	}





	// MARK: Render Preview
	// -----------------------------
	renderPreview() {
		this.$preview = $('<div class="acex-products-preview">').appendTo( this.$target );
	}





	


	// MARK: Edit Info
	// -----------------------------
	editInfo() {

		const $section = $('<div class="acex-section acex-template-info">').appendTo( this.$target );
		const $form = $('<div class="acex-form">').appendTo( $section );

		// Template Name
		const $nameGroup = $('<div class="actus-form-group actus-flex">').appendTo( $form );
		$('<label class="actus-label" for="template_name">').text(__('Template Name:', 'actus-excel-for-woo')).appendTo( $nameGroup );
		const $nameInput = $(`<input class="actus-input" type="text" id="template_name" name="template_name" placeholder="${__('Template Name', 'actus-excel-for-woo')}">`)
			.val( this.template.name || '' )
			.appendTo( $nameGroup );
		$nameInput.on('input', (e) => {
			this.template.name = e.target.value;
			this.$listContainer.find('.acex-template-item.actus-active').text( this.template.name || __('Unnamed Template', 'actus-excel-for-woo') );
			//console.log('Template Name:', this.template.name);
		});
	


		// Add Button
		const $addButton = $('<button class="actus-btn actus-btn-secondary">').text('Add').appendTo( $nameGroup );
		$addButton.on('click', async (e) => {
			e.preventDefault();

			let userTemplates = this.templates.filter( tpl => ! tpl.system );
			if ( userTemplates.length >= 1 ) {
				this.check = await LicenseManager.check('Upgrade to the Premium version to create more custom templates.')
				if ( ! this.check ) return;
			}
			const newTemplate = { ...templateDefault };
			this.templates.push(newTemplate);
			this.template = this.templates[ this.templates.length - 1 ];
			this.edit();
		});


		// Save Button
		const $saveButton = $('<button class="actus-btn actus-btn-primary">').text(__('Save Template', 'actus-excel-for-woo')).appendTo( $nameGroup );
		$saveButton.on('click', async (e) => {
			e.preventDefault();
			
			if ( this.template.system ) {
				this.check = await LicenseManager.check('Upgrade to the Premium version to modify default templates.')
				if ( ! this.check ) return;
			}
			const index = this.$listContainer.find('.acex-template-item.actus-active').index();
			this.templates[ index ] = this.template;
//console.log('Saving templates...', this.templates);
			$(e.target).prop('disabled', true).html( DATA.SVG.loader );
			await ajax_saveOption( 'acex_templates', this.templates )
			$(e.target).prop('disabled', false).text(__('Save Template', 'actus-excel-for-woo'));
			//console.log('Template saved:', this.template);
		});


		// Delete Button
		const $deleteButton = $('<button class="actus-btn actus-btn-danger">').html( DATA.SVG.trash ).appendTo( $nameGroup );
		$deleteButton.on('click', async (e) => {
			e.preventDefault();

			const index = this.$listContainer.find('.acex-template-item.actus-active').index();
			const confirmed = await Modal.confirm(__('Are you sure you want to delete this template?', 'actus-excel-for-woo') + '<br>' + this.templates[index].name);
			if ( !confirmed ) return;
			
			this.templates = this.templates.filter( (tpl, i) => i !== index );
			this.$listContainer.find('.acex-template-item').first().trigger('click');

			$(e.target).prop('disabled', true).html(DATA.SVG.loader);
			await ajax_saveOption('acex_templates', this.templates);
			$(e.target).prop('disabled', false).text(__('Delete Template', 'actus-excel-for-woo'));
			//console.log('Template deleted:', this.template);
			
		});

	}





	


	// MARK: Edit
	// -----------------------------
	async edit() {

		this.$target.empty();
		if ( ! $('.acex-button-reset-templates').length ) {
			$(`<button class="actus-btn actus-btn-secondary acex-button-reset-templates">`)
				.html(__('restore default templates', 'actus-excel-for-woo'))
				.appendTo('.acex-export-body .acex-header-flex')
				.click(()=> this.restoreDefault.bind(this) );
		}

		this.renderList( this.$target, false);
		this.editInfo();

		
		
		$('<hr>').css({ margin: '32px -24px' }).appendTo( this.$target );
		await TemplateProperties.render( this.$target, this.template );




		$('<hr>').css({ margin: '32px -24px' }).appendTo( this.$target );
		this.$previewContainer = $('<div class="acex-template-preview">').appendTo( this.$target );
		
		TemplatePreview.setPreviewProducts([], 'template' );
		TemplatePreview.setContainer( this.$previewContainer );
		TemplatePreview.create( this.template );



		
		$('body').off('acex::template-changed.template-edit')
		$('body').on('acex::template-changed.template-edit', (e, template) => {
			console.log('@@@ acex::template-changed.template-edit', template );
			this.edit();
		});


	
	}



	



	// MARK: Restore Default
	// -----------------------------
	async restoreDefault() {
		let confirmed = await Modal.confirm(__('Are you sure you want to restore the default templates?', 'actus-excel-for-woo') + '<br>' + __('It will not affect your custom templates.', 'actus-excel-for-woo'));
		if ( ! confirmed ) return;
		
		this.templates = this.templates.filter( tpl => ! tpl.system );
		this.templates = [ ...TEMPLATES, ...this.templates ];
		DATA.templates = this.templates;

		// Save the updated templates
		await ajax_saveOption( 'acex_templates', DATA.templates );
		Modal.success(__('Default templates restored successfully.', 'actus-excel-for-woo'));

		this.edit()

	}




	// MARK: Cleanup
	// -----------------------------
    cleanup() {

		
		// Remove all namespaced events
        $('body').off('.template-edit');
		$('.acex-button-reset-templates').remove();

        this.$list = null;
        this.$listContainer = null;

		TemplateProperties.cleanup();
		
		// Only cleanup drag handlers, not the whole preview
		TemplatePreview.removeDragHandlers();


	}








}








export default new ExportTemplates();