import SelectProducts 	from './select-products.js';
import ExportToExcel 	from './export-to-excel.js';
import ExportTemplates 	from './export-templates.js';
import GoogleSheets   	from './google-sheets.js';
import LicenseManager   from './license.js';
// -----------------------------------------------------



const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
const { __ } = wp.i18n;
// -----------------------------------------------------







class ExportSheet {

	
	constructor() {


		this.$mainContainer = $('.acex-main');
		this.$buttonExportQuery = null;
		this.$buttonEditTemplate = null;
		this.$bodyContainer = null;
		this.$bodyTitle = null;
		this.$bodyNote = null;
		this.$bodyContainer = null;

	
	}


	init() {
        if (this.isInitialized) {
            this.cleanup();
        }
		
		this.$mainContainer.empty()
		this.exportNavigation();
		this.exportBody();

		ExportTemplates.init( this.$bodyContainer );

        this.isInitialized = true;
	}



    cleanup() {
        // Remove all namespaced events
        $('body').off('.acex-export');
        
        // Clear temporary DOM references (but keep main container)
        // this.$mainContainer is needed for re-initialization, don't null it
        this.$navContainer = null;
        this.$bodyContainer = null;
        this.$bodyHeader = null;
        this.$bodyTitle = null;
        this.$bodyNote = null;
        this.$selectAllButton = null;
        
        this.isInitialized = false;
			
		ExportTemplates.cleanup();
		
    }



	

	// MARK: Export Nav
	// -----------------------------
	exportNavigation() {
		this.$navContainer = $('<div class="acex-navigation">').appendTo( this.$mainContainer );
		
		this.$navContainer.on('click', '.acex-navigation-button', function() {
			$(this).addClass('actus-active').siblings('.acex-navigation-button').removeClass('actus-active');
		});
		
		this.$buttonExportQuery = $('<button class="acex-navigation-button">').text(__('Export Sheet', 'actus-excel-for-woo')).appendTo( this.$navContainer );
		this.$buttonExportQuery.on('click', this.export.bind(this) );

		this.$buttonEditTemplate = $('<button class="acex-navigation-button">').text(__('Edit Template', 'actus-excel-for-woo')).appendTo( this.$navContainer );
		this.$buttonEditTemplate.on('click', ()=>{
			this.$bodyTitle.text(__('Edit Template', 'actus-excel-for-woo'));
			this.$bodyNote.text('');
			ExportTemplates.edit();
		});


		setTimeout(() => {
			this.$buttonExportQuery.trigger('click');
		}, 0);

	}

	

	

	// MARK: Export Body
	// -----------------------------
	exportBody() {

		this.$bodyContainer = $('<div class="acex-export-body">').appendTo( this.$mainContainer );
		this.$bodyHeader = $('<div class="acex-header-flex">').appendTo( this.$bodyContainer );
		this.$bodyTitle = $('<h2>').appendTo( this.$bodyHeader );
		this.$bodyNote = $('<p>').appendTo( this.$bodyHeader );
		this.$bodyContainer = $('<div class="acex-export-body-container">').appendTo( this.$bodyContainer );

	}








	// MARK: Export
	// -----------------------------
	async export() {


		this.$bodyTitle.text(__('Export', 'actus-excel-for-woo'));
		this.$bodyNote.text(__('Export products to an Excel (.xlsx) file', 'actus-excel-for-woo'));
		this.$bodyContainer.empty();

		
		await SelectProducts.render( this.$bodyContainer, ExportTemplates.template );

		ExportTemplates.renderList( this.$bodyContainer );
		ExportTemplates.renderPreview();
		ExportTemplates.$list.clone().prependTo( this.$bodyContainer );

		this.exportEvents();
		
	}
	


	// MARK: Export Events
	// -----------------------------
	exportEvents() {
		
		// Bind export button
		$('body').off('click.acex-export', '.acex-button-export');
		$('body').on('click.acex-export', '.acex-button-export', async (e) => {
			e.preventDefault()
			await ExportToExcel.export( ExportTemplates.template, SelectProducts );
		});


		$('body').off('click.acex-export', '.acex-button-export-google');
		$('body').on('click.acex-export', '.acex-button-export-google', async (e) => {
			e.preventDefault()
			let result = await GoogleSheets.OAuth('acex_google_ready')
			if ( result && result.success ) {
				if ( result.message !== 'Already connected' ) {
					let confirmed = await Modal.confirm(
						'Export Products to Google Sheets',
						'Google Connected',
					)
					if (!confirmed) { return 'error' }
				}
				await ExportToExcel.export( ExportTemplates.template, SelectProducts, true );
			}
		});



	}












}






// -----------------------------------------------------
export default new ExportSheet();





