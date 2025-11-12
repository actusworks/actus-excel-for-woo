import Modal 			from './Modal.js';
import ActusUpload 		from './upload.js';
import ImportValidation from './import-validation.js';
import LicenseManager   from './license.js';
import History   		from './history.js';
import {
	validateKeys,
	parseProductsFromSheet,
	parseTaxonomiesSheets,
	checkOrphaned,
} from './import-tools.js';
import {
	ajax_createTaxonomies,
	ajax_saveMultipleProducts,
	log,
} from './helpers.js';
// -----------------------------------------------------



const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
const LIMIT = 100
const { __ } = wp.i18n;
// -----------------------------------------------------




class ImportSheet {

	
	constructor() {

		
		this.workbook = null;
		this.importOptions = {};


		this.$mainContainer = $('.acex-main');
		this.$uploadContainer = null
    	this.uploaderInstance = null
		this.free = LicenseManager.free

	}





	
	// MARK: Initialization
	// -----------------------------------------------------
	async init() {
			
		if (this.uploaderInstance) {
			this.cleanup();
		}

		this.$mainContainer.empty();
		this.importOptions = {};

		this.importNavigation();

		this.$bodyContainer = $('<div class="acex-import-body">').appendTo( this.$mainContainer );
		this.$bodyHeader = $('<div class="acex-header-flex">').appendTo( this.$bodyContainer );
		this.$bodyTitle = $('<h2>').appendTo( this.$bodyHeader );
		this.$bodyNote = $('<p>').appendTo( this.$bodyHeader );


		this.check = await LicenseManager.check()
		
	}



	// MARK: Cleanup
	// -----------------------------------------------------
	cleanup() {
		// Destroy uploader instance
		if (this.uploaderInstance) {
			this.uploaderInstance.destroy();
			//this.uploaderInstance = null;
		}
		
		// Clear DOM references
		this.$mainContainer.empty()
		this.$uploadContainer = null;
		
		// Clear workbook reference
		this.workbook = null;
		this.importOptions = {};
	}












	// MARK: Import Nav
	// -----------------------------
	importNavigation() {
		this.$navContainer = $('<div class="acex-navigation">').appendTo( this.$mainContainer );
		
		this.$navContainer.on('click', '.acex-navigation-button', function() {
			$(this).addClass('actus-active').siblings('.acex-navigation-button').removeClass('actus-active');
		});

		this.$buttonImportQuery = $('<button class="acex-navigation-button">').text(__('Import Sheet', 'actus-excel-for-woo')).appendTo( this.$navContainer );
		this.$buttonImportQuery.on('click', ()=>{
			this.$bodyTitle.text(__('Import Sheet', 'actus-excel-for-woo'));
			this.$bodyNote.text('Import products from an Excel (.xlsx) file');
			this.uploader();
		});

		this.$buttonHistory = $('<button class="acex-navigation-button">').text(__('Google Sheets', 'actus-excel-for-woo')).appendTo( this.$navContainer );
		this.$buttonHistory.on('click', ()=>{
			this.$bodyTitle.text(__('Google Sheets', 'actus-excel-for-woo'));
			this.$bodyNote.text('');
			this.$bodyContainer.empty()
			History.renderGoogleSheetsList( this.$bodyContainer );
		});


		setTimeout(() => {
			this.$buttonImportQuery.trigger('click');
		}, 0);

	}
	











	// MARK: Uploader
	// -----------------------------------------------------
	uploader() {

		this.$bodyContainer.empty();

		this.$uploadContainer = $('<div class="acex-upload-container">')
			.appendTo( this.$bodyContainer );

		this.uploaderInstance = new ActusUpload(this.$uploadContainer[0], {
            onUploadComplete: (files) => {
				this.fileUploaded(files[0]);
            },
            onUploadError: (error, file) => {
                console.error('Upload error:', error, file);
            }
        });

		this.$orphanedButton = $('<button type="button" class="actus-btn actus-btn-primary" style="margin-left:10px;">Check for orphaned variations in your database</button>');
		this.$orphanedButton.on('click', () => checkOrphaned( this.$orphanedButton ));
		this.$uploadContainer.append( this.$orphanedButton );


	}





	// MARK: File Uploaded
	// -----------------------------------------------------
	fileUploaded( fileObj ) {
		//console.log('File uploaded:', fileObj);
		
		this.importOptions = {}

		// Extract the actual File object from the wrapper
		const file = fileObj.file || fileObj;

		// Store filename for history
		this.currentFilename = file.name;
		
		if (file) {
			const reader = new FileReader();

			reader.onload = async (e) => {
				// Create a new ExcelJS workbook instance
				const workbook = new ExcelJS.Workbook();

				// Load the Excel file as an ArrayBuffer
				try {
					
					const modal = new Modal({title: 'Import Product Data'})
					modal.open();
					modal.showLoading('Loading Sheet...');
					await workbook.xlsx.load(e.target.result)
					modal.destroy();
					this.excelLoaded( workbook )

				} catch (error) {
					console.error('Error loading the Excel file:', error);
				}
			};

			// Read the file as an ArrayBuffer
			reader.readAsArrayBuffer(file);

		} else {
			alert('Please select a file!');
		}


	}




	// MARK: Excel Loaded
	// -----------------------------------------------------
	async excelLoaded( workbook ) {
		this.workbook = workbook;

		//console.log('worksheets', workbook.worksheets );

		// Access the first sheet
		const worksheet = workbook.getWorksheet(1); // First sheet (index 1)

		// Get field keys from row 2
		const fieldKeys = [];
		const row2 = worksheet.getRow(2);
		row2.eachCell((cell, colNumber) => {
			if ( ! this.check && ! this.free.props.includes(cell.value) ) {
				return; // Skip keys not allowed in free version
			}
			fieldKeys[colNumber - 1] = cell.value; // Store field key by column index
		});



    	//console.log('Field Keys:', fieldKeys);


		// Validate keys
 		let valid = validateKeys( fieldKeys );
		if ( ! valid ) {
			Modal.error(
				'Invalid Spreadsheet',
				'',
				'One or more field keys are invalid.',
				'Please check and try again.'
			);
			return;
		}


		// Select columns to import
		let selectedKeys = await this.selectColumnsModal( fieldKeys )
		if ( ! selectedKeys ) return;


		// Parse products from sheet
		const products = parseProductsFromSheet( worksheet, fieldKeys, selectedKeys, this.check, this.free  );
		
		console.log('products:', products );

		// Validate Products
		let validationResults = await ImportValidation.validate( products, selectedKeys );

		console.log('Validation Results:', validationResults );
		console.log('      AJAX Results:', validationResults[0]?.ajax || validationResults[1]?.ajax );








		if ( validationResults.length ) {

			// Show Validation Modal
			this.validationModal( validationResults, products );
		
		} else {

			// Start Import Modal
			this.startImportModal( validationResults, products );

		}



		/*
		worksheet.eachRow((row, rowNumber) => {
			//console.log(`Row ${rowNumber}:`, row.values);
		});
		const row1 = worksheet.getRow(1).values;
		const cellA1 = worksheet.getCell('A1');
		const cellB2 = worksheet.getCell(2, 3);  // Row 2, Column 3 (C2)
		*/

			
	}









	
	// MARK: Validation Modal
	// -----------------------------------------------------
	validationModal( validationResults, products ) {
		
		let HTML = '';
		


		let taxonomiesData = validationResults.find( res => res.taxonomies );
		HTML += taxonomiesData?.taxonomies?.html || '';

		let attributesData = validationResults.find( res => res.attributes );
		HTML += attributesData?.attributes?.html || '';

		let errorsAndWarnings = this.errorsAndWarnings( validationResults );
		if ( errorsAndWarnings.HTML ) {
			HTML += errorsAndWarnings.HTML;
		}


		if ( ! HTML ) {
			this.startImportModal( validationResults, products );
			return;
		}

		const modal = new Modal({title: 'Import Validation'})
		modal.setContent( HTML );
		modal.open();
		modal.updateButtons([
			{
				text: 'Cancel',
				class: 'actus-btn-secondary',
				onClick: (modal) => {
					modal.destroy()
					this.init();
				}
			},
			{
				text: 'Continue to Import',
				class: 'actus-btn-primary',
				onClick: (modal) => {
					if ( taxonomiesData?.taxonomies?.html ) {
						for ( let key in DATA.data_taxonomies ) {
							this.importOptions[`create_${key}`] = modal.$body.find(`input[name="acex-missing-${key}"]:checked`).val() === 'create' || '';
						}
						this.importOptions.taxonomiesData = taxonomiesData.taxonomies || {};
					}
					if ( attributesData?.attributes?.html ) {
						this.importOptions.create_attributes = modal.$body.find('input[name="acex-missing-attributes"]:checked').val() === 'create' || '';
						this.importOptions.attributesData = attributesData.attributes || {};
					}
					modal.destroy();
					this.startImportModal( validationResults, products )
				}
			},
		]);
		

	}




	// MARK: Errors and Warnings
	// -----------------------------------------------------
	errorsAndWarnings( validationResults ) {

		let result = {}
		let errors = ''
		let warnings = ''
		let totalErrors = 0;
		let totalWarnings = 0;
		validationResults.forEach( (result, idx) => {
			if ( result.errors && result.errors.length > 0 ) {
				if ( result.product )
					errors += `<h4>Product: ${ result.product.name || result.product.slug || result.product.id || 'in row ' + (idx + 1 + 2) }</h4>`;
				errors += `<ul>`;
				result.errors.forEach( error => {
					errors += `<li>${ error }</li>`;
					totalErrors++;
				});
				errors += `</ul>`;
			}

			if ( result.warnings && result.warnings.length > 0 ) {
				if ( result.product )
					warnings += `<h4>Product: ${ result.product.name || result.product.slug || result.product.id || 'in row ' + (idx + 1 + 2) }</h4>`;
				warnings += `<ul>`;
				result.warnings.forEach( warning => {
					warnings += `<li>${ warning }</li>`;
					totalWarnings++;
				});
				warnings += `</ul>`;
			}
		});



		if ( totalErrors ) errors = `
			<p>Found <strong>${ totalErrors } errors</strong> in the imported data. Please correct these errors before proceeding.</p>
			<div class="acex-validation-errors">${ errors }</div>
		`;
		if ( warnings ) warnings = `
			<br>
			<p>Found <strong>${ totalWarnings } warnings</strong> in the imported data. You may choose to proceed despite these warnings.</p>
			<div class="acex-validation-warnings">${ warnings }</div>
		`;
		


		result.errors = totalErrors;
		result.warnings = totalWarnings;
		result.HTML = errors + warnings;

		return result;


	}







	// MARK: Select Columns Modal
	// -----------------------------------------------------
	async selectColumnsModal( fieldKeys ) {

		return new Promise((resolve) => {

			const modal = new Modal({
				title: 'Select Columns',
				className: 'acex-columns-modal'
			});

			let html = `<p>Please select the columns to import:</p>
				<div class="acex-select-columns-list">`;
			fieldKeys.forEach( (key, index) => {
				html += `
					<div class="acex-field acex-field-checkbox acex-select-column">
						<label>
							<input type="checkbox" class="acex-input" name="acex-column-key" value="${key}" checked />
							${key}
						</label>
					</div>
				`;
			});
			html += `</div>`;

			modal.setContent(html);

			modal.updateButtons([
				{
					text: 'Cancel',
					class: 'actus-btn-secondary',
					onClick: (modal) => {
						modal.destroy()
						resolve('')
						//this.init();
					}
				},
				
				{
					text: 'Continue',
					class: 'actus-btn-primary',
					onClick: (modal) => {
						const selectedKeys = modal.$body.find('input[name="acex-column-key"]:checked').map((_, el) => el.value).get();
						modal.destroy();
						resolve(selectedKeys);
					}
				},
			]);
			modal.open();

		});

	}





	// MARK: Start Import Modal
	// -----------------------------------------------------
	startImportModal( validationResults, products ) {

		//console.log('Starting import Modal:', this.importOptions );

		const modal = new Modal({
			title: 'Import Product Data',
			className: 'acex-import-modal'
		});
		if ( ! products.length ) {
			modal.setContent('<p>No products found matching your filters.</p>');
			modal.updateButtons([
				{
					text: 'Close',
					class: 'actus-btn-secondary',
					onClick: (modal) => {
						modal.destroy()
						this.init();
					}
				}
			]);
		} else {


			modal.setContent(`
				<h3 class="acex-products-title"><strong>${products.length} products</strong><br>parsed from the spreadsheet.</h3>
			`);



			// ID Validation Summary
			const html = this.idValidationHtml( validationResults );
			if ( html ) modal.addContent( html );




			modal.addContent(`
				<div class="acex-import-status">
					You can now proceed to import these products into your WooCommerce store.<br>
				</div>
			`);


				
			modal.addContent(`
				<div class="acex-field acex-field-checkbox acex-import-all-new">
					<label>
						<input type="checkbox" class="acex-input" />
						Import all as new products
					</label>
				</div>
			`);



			modal.addContent(`
				<br><br>
				<h3 class="acex-center acex-faded">We recommend backing up your database before proceeding.</h3>
			`);



			modal.updateButtons([
				{
					text: 'Close',
					class: 'actus-btn-secondary',
					onClick: (modal) => modal.destroy()
				},
				/*
				{
					text: 'Validate',
					class: 'actus-btn-primary',
					onClick: (_modal) => {
						ImportValidation.validate( products )
					}
				},
				*/
				{
					text: 'Start Import',
					class: 'actus-btn-primary',
					onClick: (_modal) => {
						this.importOptions.importAsNew = modal.$body.find('.acex-field-checkbox input.acex-input').is(':checked') || '';
						this.importProducts(products, validationResults, modal)
					}
				},
			]);
		}
		modal.open();

	}




	// MARK: ID Validation HTML
	// -----------------------------------------------------
	idValidationHtml( validationResults ) {
		
		let html = ''

		const ajax = validationResults[0]?.ajax || validationResults[1]?.ajax;
		if ( ajax ) {
			html += `<div class="acex-import-circles">`
			
			if ( ajax.create && ajax.create.length ) {
				html += `<div class="acex-import-circle">
					<div class="acex-circle acex-circle-green">
						<span>${ajax.create.length}</span>
					</div>
					products will be created new
				</div>`;
			}
			if ( ajax.update_ids && ajax.update_ids.length ) {
				html += `<div class="acex-import-circle">
					<div class="acex-circle">
						<span>${ajax.update_ids.length}</span>
					</div>
					products will be updated by ID
				</div>`;
			}
			if ( ajax.update_skus && ajax.update_skus.length ) {
				html += `<div class="acex-import-circle">
					<div class="acex-circle">
						<span>${ajax.update_skus.length}</span>
					</div>
					products will be updated by SKU
				</div>`;
			}
			if ( ajax.invalid && ajax.invalid.length ) {
				html += `<div class="acex-import-circle">
					<div class="acex-circle acex-circle-red">
						<span>${ajax.invalid.length}</span>
					</div>
					products are invalid (no name or type)
				</div>`;
			}
			


			html += `</div>`;

		}

		return html;


	}







	// MARK: Import Products
	// -----------------------------------------------------
	async importProducts( products, validationResults, modal ) {
		//console.log('Import these products:', products );
		this.importOptions.ajaxData = validationResults[0]?.ajax || validationResults[1]?.ajax || {};

		if ( ! this.check ) {
			if ( products.length > LIMIT ) {
				products = products.slice(0, LIMIT);
			}
		}


		let tData = {}
		let sData = {}
		sData.import_as_new	= this.importOptions.importAsNew || '';
		sData.create 		= this.importOptions.ajaxData?.create;
		sData.update_ids 	= this.importOptions.ajaxData?.update_ids;
		sData.update_skus 	= this.importOptions.ajaxData?.update_skus;
		sData.invalid 		= this.importOptions.ajaxData?.invalid;
		for ( let key in DATA.data_taxonomies ) {
			sData[`ignore_${key}`] = (this.importOptions?.taxonomiesData?.[`missing_${key}`]?.length) && ! this.importOptions[`create_${key}`];
		}
		sData.ignore_attributes 	= (this.importOptions?.attributesData?.missing_attributes?.length || this.importOptions?.attributesData?.missing_values?.length) && ! this.importOptions.create_attributes;
		//console.log('sData:', sData );


//console.log('this.importOptions:', this.importOptions );

		// TAXONOMIES & ATTRIBUTES
		if ( this.check ) {
			let presentTaxonomies = false;
			if ( this.importOptions.create_attributes ) presentTaxonomies = true;
			for ( let key in DATA.data_taxonomies ) {
				if ( this.importOptions[`create_${key}`] ) {
					presentTaxonomies = true;
					break;
				}
			}
			if ( presentTaxonomies ) {

				let message = ''
				for ( let key in DATA.data_taxonomies ) {
					let currentTaxonomy = DATA.data_taxonomies[ key ];
					if ( this.importOptions[`create_${key}`] ) {
						message += 'Creating ' + currentTaxonomy.label;
					}
				}
				if ( this.importOptions.create_attributes ) {
					if ( message ) message += ' and Attributes';
					else message += 'Creating Attributes';
				}
				modal.showLoading( message );

				for ( let key in DATA.data_taxonomies ) {
					tData[key] = this.importOptions[`create_${key}`] ? this.importOptions?.taxonomiesData?.[`missing_${key}`] : [];
				}
				tData.attributes = this.importOptions.create_attributes ? this.importOptions?.attributesData?.missing_attributes : [];
				tData.values = this.importOptions.create_attributes ? this.importOptions?.attributesData?.missing_values : [];

				tData = { ...tData, ...parseTaxonomiesSheets( this.workbook, this.importOptions ) };
				//console.log('tData:', tData );

				let result = await ajax_createTaxonomies( tData )

//console.log('Taxonomies creation result:', result );

			}
		}
				



		modal.showLoading('Importing product data to WooCommerce...');
		modal.updateButtons([]);
		modal.addContent(`<div class="acex-import-status">
			<div class="acex-progress-bar"><div class="acex-progress-bar-fill"></div></div>
			</div>`);
		let $status = $('.acex-import-status');
				

//console.log('PRODUCTS:', products );

		const result = await ajax_saveMultipleProducts(products, {
			chunkSize: 20,
			_data: sData,
			onProgress: (current, total, chunkResult) => {
				const percentage = Math.round((current / total) * 100);
				//console.log('onProgress 4', percentage)
				$status.html(`
					<p>Processed ${current} of ${total} rows (${percentage}%)</p>
					<p>${chunkResult.successful} successful, ${chunkResult.failed} failed so far.</p>
					<div class="acex-progress-bar"><div class="acex-progress-bar-fill" style="width: ${percentage}%;"></div></div>
				`);
			}
		});
		modal.destroy();
//console.log('Import result:', result );
					
		// Save to history
		await History.saveImport(
			this.currentFilename,
			result,
			products,
			this.importOptions
		);
	


		let errors = []
		let warnings = []
		result.results.forEach((r, i) => {
			if ( r.error ) {
				errors.push(`<span>row ${i+3}</span><i>⦿</i> ${r.message}`)
			}
			if (r.warnings && r.warnings.length > 0) {
				warnings = warnings.concat(r.warnings.map(w => `<span>row ${i+3}</span><i>⦿</i> ${w}`));
			}
		});
		
		if ( result.failed == result.total ) {

			this.importErrors( result, errors, warnings );

		} else if ( result.failed || errors.length || warnings.length ) {

			this.importWarnings( result, errors, warnings );

		} else {

			this.importSuccess( result );

		}



	}







	// MARK: Save History
	// -----------------------------------------------------
	async saveHistory(result, products) {
		// Collect errors and warnings
		const errors = [];
		const warnings = [];
		
		result.results.forEach((r, i) => {
			if (r.error) {
				errors.push(`Row ${i+3}: ${r.message}`);
			}
			if (r.warnings && r.warnings.length > 0) {
				warnings.push(...r.warnings.map(w => `Row ${i+3}: ${w}`));
			}
		});
		
		return $.ajax({
			url: ajaxurl,
			method: 'POST',
			data: {
				action: 'acex_save_history',
				nonce: DATA.nonce,
				history_data: {
					filename: this.currentFilename || 'unknown.xlsx',
					action_type: 'import',
					total_rows: products.length,
					successful: result.successful,
					failed: result.failed,
					created: result.created,
					updated: result.updated,
					errors: errors,
					warnings: warnings,
					metadata: this.importOptions
				}
			}
		});
	}

















	// MARK: Success
	// -----------------------------------------------------
	importSuccess( result ) {



		Modal.success(
			'Import Complete',
			'Product import process has completed.' + this.getCircles( result ),
			{
				'Successful': result.successful,
			},
			``,
			(modal) => {
				//console.log('Success modal closed');
				// window.location.reload();
				this.init();
				modal.destroy();
			}
		);



	}




	// MARK: Warnings
	// -----------------------------------------------------
	importWarnings( result, errors, warnings ) {

		let errorsHtml = ''
		if ( errors.length ) {
			errorsHtml = '<ul class="acex-import-errors-list"><li>' + errors.join('</li><li>') + '</li></ul>';
		}			
		

		Modal.warning(
			'Import Warning',

			'Product import process has completed with issues.'  +
			this.getCircles( result ) + errorsHtml,
			warnings,
			(modal) => {
				//console.log('Success modal closed');
				// window.location.reload();
				this.init();
				modal.destroy();
			}
		);



	}



	// MARK: Errors
	// -----------------------------------------------------
	importErrors( result, errors, warnings ) {

		let errorsHtml = ''
		if ( errors.length ) {
			errorsHtml = '<ul><li>' + errors.join('</li><li>') + '</li></ul>';
		}

		Modal.error(
			'Import Error',
			'Product import process failed.',
			errorsHtml,
			'',
			(modal) => {
				//console.log('Success modal closed');
				// window.location.reload();
				this.init();
				modal.destroy();
			}
		);

		

	}





	// MARK: Get Circles HTML
	// -----------------------------------------------------
	getCircles( result ) {

		let html = '<div class="acex-final-import-circles">'

		if ( result.created ) {
			html += `<div class="acex-import-circle">
				<div class="acex-circle acex-circle-green">
					<span>${result.created}</span>
				</div>
				products created
			</div>`;
		}
		if ( result.updated ) {
			html += `<div class="acex-import-circle">
				<div class="acex-circle">
					<span>${result.updated}</span>
				</div>
				products updated
			</div>`;
		}
		if ( result.failed ) {
			html += `<div class="acex-import-circle">
				<div class="acex-circle acex-circle-red">
					<span>${result.failed}</span>
				</div>
				products failed
			</div>`;
		}

		html += `</div>`;

		return html;


	}




}







// -----------------------------------------------------
export default new ImportSheet();


