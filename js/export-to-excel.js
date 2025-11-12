import { productQuery } 	from './helpers.js';
import Modal 				from './Modal.js';
import WorkBook 			from './export-workbook.js';
import LicenseManager   	from './license.js';
import GoogleSheets   		from './google-sheets.js';
import History   			from './history.js';
import { log, logg } 		from './helpers.js';
// -----------------------------------------------------

/**
 * ExportToExcel Class
 * 
 * Exports products to Excel with optional dropdown validations
 * 
 * TEMPLATE STRUCTURE:
 * {
 *   name: 'My Template',
 *   sheet: 'Products',
 *   columns: [
 *     { header: 'ID', key: 'id' },
 *     { header: 'Name', key: 'name' },
 *     { header: 'Type', key: 'type' }
 *   ],
 *   dropdowns: [
 *     {
 *       column: 'type',                    // key of column to add dropdown to
 *       options: ['simple', 'variable', 'grouped', 'external'],  // dropdown options
 *       referenceSheet: 'Product Types',   // (optional) name of reference sheet to create
 *       referenceHeader: 'Available Types' // (optional) header for reference sheet
 *     },
 *     {
 *       column: 'stock_status',
 *       options: ['instock', 'outofstock', 'onbackorder']
 *       // Without referenceSheet, uses direct validation (for lists < 255 chars)
 *     }
 *   ]
 * }
 * 
 * USAGE EXAMPLE:
 * 
 * const template = {
 *   name: 'Products Export',
 *   sheet: 'Sheet1',
 *   columns: [
 *     { header: 'ID', key: 'id' },
 *     { header: 'Name', key: 'name' },
 *     { header: 'Type', key: 'type' }
 *   ],
 *   dropdowns: [
 *     {
 *       column: 'type',
 *       options: ['type1', 'type2', 'type3', 'type4'],
 *       referenceSheet: 'Sheet2',
 *       referenceHeader: 'type_names'
 *     }
 *   ]
 * };
 * 
 * ExportToExcel.export(template, SelectProducts);
 * 
 * REQUIREMENTS:
 * - ExcelJS library (handles both basic exports and dropdowns)
 * 
 * Include in your HTML:
 * <script src="https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js"></script>
 */



const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
const { __ } = wp.i18n;
// -----------------------------------------------------




class ExportToExcel {

	
	constructor(template, SelectProducts) {
		this.template = null;
		this.SelectProducts = null;
		this.DATA = DATA;
		this.free = LicenseManager.free
		
	}




	// MARK: Export to Excel
	// -----------------------------
	async export( template, SelectProducts, google=false ) {
		this.template = template;
		this.SelectProducts = SelectProducts;
		this.check = await LicenseManager.check()

		let modal = {}
		modal = new Modal({title: 'Export Products'})

		try {
			// Validate template
			if (!this.template || !this.template.columns || this.template.columns.length === 0) {
				alert('Please select at least one column in the template before exporting.');
				return;
			}


			// Get the query from SelectProducts
			const query = this.SelectProducts.query || {};



			// Count total products matching query
			let totalProducts = await this.countQuery( modal, query )
			if ( totalProducts === 'error' ) return;


			
			this.WB = new WorkBook( this.template, query );
			this.workbook = await this.WB.createBase();
			this.worksheet = await this.WB.createWorksheet();



			// Fetch all products matching query
			const response = await this.mainQuery( modal, query, totalProducts );
			const {
				allProducts,
				variations,
				simple_products,
				variable_products,
				grouped_products,
				external_products,
				downloadable_products
			} = response

//console.log('All Products for Export:', allProducts);
//return;


			// Show processing state
			modal.showLoading(__('Creating Excel File...', 'actus-excel-for-woo'));
			await this.WB.finalize();

			// trigger workbook download
			const filename = await this.downloadWorkbook( this.workbook );


			let googleResult;
			if ( google ) {

				modal.showLoading(__('Uploading to Google Sheets...', 'actus-excel-for-woo'));
				googleResult = await GoogleSheets.uploadToGoogleSheets(this.workbook, filename)

			}



			// Save export history HERE
			await History.saveExport(
				filename,
				totalProducts,
				response,
				this.template,
				query,
				googleResult
			);
			

			// Close progress modal
			modal.destroy();


			// Limit totalProducts if on free version
			if ( ! this.check ) {
				if ( totalProducts > LIMIT ) totalProducts = LIMIT;
			}

			// Show success message with details
			let details = {
					'Template': this.template.name || 'N/A',
					'Products Exported': totalProducts,
			}
			if ( variations ) details['Products Exported'] += ` (+${variations} variations)`;
			if ( simple_products ) details['Simple Products'] = simple_products;
			if ( variable_products ) details['Variable Products'] = variable_products;
			if ( variations ) details['Variations'] = variations;
			if ( grouped_products ) details['Grouped Products'] = grouped_products;
			if ( external_products ) details['External Products'] = external_products;
			if ( downloadable_products ) details['Downloadable Products'] = downloadable_products;
			if ( googleResult ) details['Google Sheets Link'] = googleResult.sheetId ?
				`<a href="https://docs.google.com/spreadsheets/d/${googleResult.sheetId}" target="_blank">Open Sheet</a>` :
				'-';

			details['File Name'] = filename;
			details['Format'] = 'Excel (.xlsx)';


			// Success message with nice formatting
			Modal.success(
				'Export Successful!',
				'Your products have been exported successfully.',
				details
			);




		// -------------------------- Handle errors
		} catch (error) {
			modal.destroy()
			console.error('Export error:', error);
			
			// Show formatted error message
			Modal.error(
				'Export Failed',
				'An error occurred during the export process:',
				error.message,
				'Please try again or contact support if the problem persists.'
			);
		}


	}



	// MARK: Download Workbook
	// -----------------------------
	async downloadWorkbook( workbook ) {


			// Create Excel workbook
			//const WORKBOOK = new WorkBook( this.template, query );
			//const workbook = await WORKBOOK.create( allProducts );



			// Generate filename
			const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/-/g, '').replace(/:/g, '');
			const filename = `${this.template.name || 'products'}_${timestamp}.xlsx`;



			// Download file using ExcelJS
			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], { 
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
			});
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			a.click();
			window.URL.revokeObjectURL(url);


			return filename;


	}














	

	// MARK: Count Query
	// -----------------------------
	// Counts the total number of products matching the current query
	async countQuery( modal, query ) {

		//modal.open();
		//modal.showLoading('Fetching products...');
	

		// First, get total count using existing helper function
		let totalProducts = await productQuery(query, true);
		if (!totalProducts) {
			modal.open();
			modal.setContent('<p>No products found matching your filters.</p>');
			modal.updateButtons([
				{
					text: 'Close',
					class: 'actus-btn-primary',
					onClick: (modal) => modal.destroy()
				}
			]);
			//alert('No products found matching your filters.');
			//$exportButton.prop('disabled', false).text(originalText);
			return;
		}


		// Confirm
		let message = `You are about to export ${totalProducts} products.`;
		let buttons;
		if ( ! this.check ) {
			message += `<br><br>Your current license only allows exporting up to ${LIMIT} products.`;
			if ( totalProducts > LIMIT ) {
				message += ` To export all ${totalProducts} products, please upgrade to the Pro version.`;
			}
			buttons = [{
				text: 'Upgrade Now',
				class: 'actus-btn-primary',
				onClick: (modal) => {
					modal.destroy();
					window.open('https://awexcel.actusanima.com/', '_blank');
				}
			}, {
				class: 'actus-modal-flex-1',
			}];
		}
		let confirmed = await Modal.confirm(
			message,
			'Export Products',
			buttons
		)
		if (!confirmed) { return 'error' }


		return totalProducts;

	}




	// MARK: Fetch Products for Export
	// -----------------------------
	async mainQuery( modal, query, totalProducts ) {
		if ( ! this.check ) {
			if ( totalProducts > LIMIT ) {
				totalProducts = LIMIT;
			}
		}
		const batchSize = 50; // Fetch 50 products per page
		const totalPages = Math.ceil(totalProducts / batchSize);
		

		modal.updateTitle(`Export ${totalProducts} Products`);
		modal.showLoading('Fetching...<br><div class="acex-progress"></div>');
		modal.open();
		let $progress = $('.actus-modal .acex-progress');


		// Fetch products in batches using existing helper function
		let allProducts = [];

		// Show progress
		$progress.html(`0/${totalProducts} products`);


		let simple_products = 0;
		let variable_products = 0;
		let variations = 0;
		let grouped_products = 0;
		let external_products = 0;
		let downloadable_products = 0;

		// Fetch each page sequentially (to avoid overloading server)
		let totalRows = 0
		for (let page = 1; page <= totalPages; page++) {
			let result = await productQuery(query, false, batchSize, page, true);  // with images
			logg('export', 'batch', result)
			if (!result || !result.products) {
				throw new Error(`Failed to fetch products page ${page}`);
			}
//console.log('****************************', result)
//console.log('*******', result.products)
			simple_products += result.simple_products || 0;
			variable_products += result.variable_products || 0;
			variations += result.variations || 0;
			grouped_products += result.grouped_products || 0;
			external_products += result.external_products || 0;
			downloadable_products += result.downloadable_products || 0;

			// Convert product IDs to full product objects (already done by acex_query)
			//allProducts = allProducts.concat(Object.values(result.products));
			this.WB.addProductRows( Object.values(result.products) );

			totalRows += Object.values(result.products).length;

			// Update progress
			let html = `${(totalRows-variations)}/${totalProducts} products`;
			if ( variations ) html += `<br> + ${variations} variations`;
			$progress.html( html );
			

			result.products = null; // free memory

		}

		logg('export', 'fetched', {
			allProducts,
			simple_products,
			variable_products,
			variations,
			grouped_products,
			external_products,
			downloadable_products,
		})
		return {
			allProducts,
			simple_products,
			variable_products,
			variations,
			grouped_products,
			external_products,
			downloadable_products,
		}

		
	}




}












// -----------------------------------------------------
export default new ExportToExcel();