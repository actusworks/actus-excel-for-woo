import Validations 			from './export-validations.js';
import { ajax_getData }		from './helpers.js';
import LicenseManager   	from './license.js';
//import AnalysisSheet 		from './export-analysis.js';
// -----------------------------------------------------


const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
const { __ } = wp.i18n;
// -----------------------------------------------------


class WorkBook {

	constructor( template, query ) {
		
		this.template = template || {};
		this.query = query || {};
		this.free = LicenseManager.free
		this.workbook = null;
		this.worksheet = null;

	}




	// MARK: Create Workbook
	// -----------------------------
	async create2(products) {

		const workbook = await this.createBase();
		const worksheet = await this.createWorksheet();
		this.addProductRows( products );
		const finalize = await this.finalize( products );

	}


	// MARK: Create Workbook Base
	// -----------------------------
	async createBase() {

		// Check if ExcelJS is available
		if (typeof ExcelJS === 'undefined') {
			throw new Error('ExcelJS library is not loaded. Please include: <script src="https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js"></script>');
		}

		this.check = await LicenseManager.check()

		this.KEYS = this.template.columns
		if ( ! this.check ) {
			this.KEYS = this.template.columns.filter(col => this.free.props.includes(col.key))
		}


		// Create a new workbook using ExcelJS
		this.workbook = new ExcelJS.Workbook();
		this.workbook.creator = 'Actus Excel for WooCommerce';
		this.workbook.created = new Date();

        // Force full recalculation when the file opens in Excel
        this.workbook.calcProperties.fullCalcOnLoad = true;


		return this.workbook;

	}



	// MARK: Create Worksheet
	// -----------------------------
	async createWorksheet() {


		// Create main worksheet
		const sheetName = this.template.sheet || 'Products';
		this.worksheet = this.workbook.addWorksheet(sheetName);


		// Disable auto-row-height
    	this.worksheet.properties.outlineLevelRow = 0;
		this.worksheet.properties.defaultRowHeight = 15;
		this.worksheet.properties.dyDescent = 0;

		// This is critical - tell Excel NOT to auto-fit row heights
		this.worksheet.properties.defaultColWidth = 10;
		
		// Add headers
		let headers = this.createHeaders( this.worksheet );



		// Add column descriptions
		this.worksheet = this.addDescriptions( this.worksheet );
		


		// Freeze top 2 rows
		this.worksheet.views = [{ state: 'frozen', ySplit: 1 }];


		this.worksheet._headers = headers;

		this.rows = ['H','h']


		return this.worksheet;

	}




	// MARK: Finalize
	// -----------------------------
	async finalize() {

		//console.log('Finalize')

		// Auto-size columns
		this.autoSizeColumns();


		
		// Style all cells: wrap text, padding, vertical align top, no word break
		this.styleCells();



		// Create reference sheets BEFORE validations so they can be referenced
		await this.createShippingClassesSheet();
		await this.createAttributesSheet();
		await this.createAttributesTermsSheet();



		// Add data validations (dropdowns, lists, etc.)
		let VALIDATIONS = new Validations( this.template, this.createSheet.bind(this) );
		await VALIDATIONS.addValidations(this.workbook, this.worksheet, this.rows.length-2);


		// Protect the worksheet. This enables the `locked` property on cells.
		// The password is empty, allowing users to unprotect it if needed.
		this.worksheet.protect('', {
			selectLockedCells: true,
			selectUnlockedCells: true
		});

        this.enforceRowHeightLimit(150);

		// Create Analysis sheet with insights
		//const analysis = new AnalysisSheet(this.template, products, this.query);
		//analysis.create(workbook);

//console.log('Finalize', this.workbook)
		return this.workbook;

	}





	// MARK: Create Workbook
	// -----------------------------
	async create(products) {

		// Check if ExcelJS is available
		if (typeof ExcelJS === 'undefined') {
			throw new Error('ExcelJS library is not loaded. Please include: <script src="https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js"></script>');
		}

		this.check = await LicenseManager.check()

		this.KEYS = this.template.columns
		if ( ! this.check ) {
			this.KEYS = this.template.columns.filter(col => this.free.props.includes(col.key))
		}


		// Create a new workbook using ExcelJS
		const workbook = new ExcelJS.Workbook();
		workbook.creator = 'Actus Excel for WooCommerce';
		workbook.created = new Date();

        // Force full recalculation when the file opens in Excel
        workbook.calcProperties.fullCalcOnLoad = true;



		// Create main worksheet
		const sheetName = this.template.sheet || 'Products';
		let worksheet = workbook.addWorksheet(sheetName);



		// Add headers
		let headers = this.createHeaders( worksheet );



		// Add column descriptions
		worksheet = this.addDescriptions( worksheet );
		


		// Freeze top 3 rows
		worksheet.views = [{ state: 'frozen', ySplit: 2 }];



		// Add product rows
		this.addProductRows( worksheet, products );
		


		// Auto-size columns
		this.autoSizeColumns( worksheet, products, headers );


		
		// Style all cells: wrap text, padding, vertical align top, no word break
		this.styleCells( worksheet, products );



		// Create reference sheets BEFORE validations so they can be referenced
		await this.createShippingClassesSheet();
		await this.createAttributesSheet();
		await this.createAttributesTermsSheet();



		// Add data validations (dropdowns, lists, etc.)
		let VALIDATIONS = new Validations( this.template, this.createSheet.bind(this) );
		await VALIDATIONS.addValidations(workbook, worksheet, products.length);


		// Protect the worksheet. This enables the `locked` property on cells.
		// The password is empty, allowing users to unprotect it if needed.
		worksheet.protect('', {
			selectLockedCells: true,
			selectUnlockedCells: true
		});


		// Create Analysis sheet with insights
		//const analysis = new AnalysisSheet(this.template, products, this.query);
		//analysis.create(workbook);


		return workbook;

		
	}












	// MARK: Headers
	// -----------------------------
	createHeaders( worksheet ) {

			
		// Add headers
		const headers = this.KEYS.map(col => col.header);

		worksheet.addRow(headers);


		// Style headers
		worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
		worksheet.getRow(1).fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FF777777' }
		};
		worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };



		// Add headers 2
		const headers2 = this.KEYS.map(col => col.key);
		worksheet.addRow(headers2);
		worksheet.getRow(2).alignment = { horizontal: 'center', vertical: 'middle' };


		return headers;


		// Style headers 2
		/*
		worksheet.getRow(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
		worksheet.getRow(2).fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FFBBBBBB' }
		};
		worksheet.getRow(2).alignment = { horizontal: 'center', vertical: 'middle' };
		*/


	}



	// MARK: Product Rows
	// -----------------------------
	addProductRows( products ) {
		
		// Add product rows
		// -----------------------------
		for (const product of products) {
			let rowLabel = '-'
			const isVariation = product.type === 'variation';
			if ( isVariation ) rowLabel = 'variation'
			this.rows.push( rowLabel )

			const row = this.KEYS.map(col => {
				const value = this.getProductValue(product, col.key, col.type);
				
				// Convert date strings to Excel date format
				if (col.key.includes('date_') && value) {
					// Parse the date string (format: 2025-10-13 11:29:09)
					const dateValue = new Date(value);
					if (!isNaN(dateValue.getTime())) {
						return dateValue; // Return as Date object for Excel
					}
				}

				// stringify objects/arrays for Excel
				if ( typeof value === 'object' && value !== null ) {
					return JSON.stringify(value);
				}


                // Check if this is a variation and the property must be inherited
                const mustBeInherited = DATA.data_mustBeInherited && DATA.data_mustBeInherited.includes(col.key);
                
				
                if (isVariation && mustBeInherited) {
					if (col.key !== 'name') {
						//return '';
					}
                }

				return value !== null && value !== undefined ? value : '';
			});

			const worksheetRow = this.worksheet.addRow(row);
			// Excel row height: 1 point = 1.33 pixels, so 200px ≈ 150 points
			//worksheetRow.height = 100;

			// Calculate row height based on content with a maximum
			//const calculatedHeight = this.calculateRowHeight(row, this.KEYS);
			//const maxHeight = 100; // Maximum height in points (200px)
			//worksheetRow.height = Math.min(calculatedHeight, maxHeight);

			// Format date cells
			this.KEYS.forEach((col, colIndex) => {
				if (col.key.includes('date_')) {
					const cell = worksheetRow.getCell(colIndex + 1);
					cell.numFmt = 'yyyy-mm-dd hh:mm:ss'; // Excel date format
				}
			});
			
		}
	}



	// MARK: Auto Size Columns
	// -----------------------------
	autoSizeColumns() {

		this.worksheet._headers.forEach((header, i) => {
			const column = this.worksheet.getColumn(i + 1);
			
			// Calculate widths based on character count with font-aware estimation
			const headerWidth = this.estimateColumnWidth(header);
			let maxDataWidth = 0;
			
			// Limit iteration to actual data rows to avoid performance issues
			const maxRowToCheck = Math.min(this.rows.length, 1000);
			for (let rowNum = 3; rowNum <= maxRowToCheck; rowNum++) {
				const cell = this.worksheet.getCell(rowNum, i + 1);
				if (cell && cell.value) {
					const cellWidth = this.estimateColumnWidth(String(cell.value || ''));
					maxDataWidth = Math.max(maxDataWidth, cellWidth);
				}
			}
			
			// Use the larger of header or data, add padding, but cap at maximum
			column.width = Math.min(Math.max(headerWidth, maxDataWidth, 10) + 2, 50);
		});

	}




	// MARK: Style Cells
	// -----------------------------
	styleCells() {
		const maxRowToStyle = this.rows.length;
		for (let rowNumber = 3; rowNumber <= maxRowToStyle; rowNumber++) {
			const row = this.worksheet.getRow(rowNumber);
			//const product = products[rowNumber - 3];
            const isVariation = this.rows[rowNumber-1] === 'variation';
			

			let calculatedHeight = 15
			this.KEYS.forEach((col, colNumber) => {
				const cell = row.getCell(colNumber + 1);

				// Check if cell contains a number
				const isNumeric = col && (col.type === 'number' || col.type === 'float' || col.type === 'int' || col.type === 'integer' || col.type === 'decimal');

				let alignment = isNumeric ? 'right' : 'left';
				alignment = col.align || alignment;

				cell.alignment = {
					wrapText: true,
					vertical: 'top',
					horizontal: alignment,
					indent: 1,
				};

				// Check if this property must be inherited for variations
                const mustBeInherited = DATA.data_mustBeInherited && DATA.data_mustBeInherited.includes(col.key);
                
                if (isVariation && mustBeInherited) {
                    // Lock the cell for inherited properties
                    cell.protection = { locked: true };
                    // Add gray background
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFE0E0E0' } // Light gray
                    };
                    // Make text gray/dimmed
                    cell.font = {
                        color: { argb: 'FF999999' }
                    };
                } else {
                    // Default all data cells to be unlocked
                    cell.protection = { locked: false };
                }

				const curHeight = this.calculateCellHeight(cell.value, colNumber, this.KEYS) || 15;
				calculatedHeight = Math.max(calculatedHeight, curHeight);
				
			});

			
				
			// FORCE row height with explicit value - cap at 100 points max
			const maxHeight = 100; // Maximum height in points
			const finalHeight = Math.min(calculatedHeight, maxHeight);
        	row.height = finalHeight;
            row.model.customHeight = true;
            row.customHeight = true;
			

			// Also try setting it via commit (some ExcelJS versions need this)
			row.commit();


		}



        //this.capRowHeights(150);
		this.worksheet.getRow(2).alignment = { horizontal: 'center', vertical: 'middle' };


	}





	// MARK: Add Descriptions
	// -----------------------------
	addDescriptions( worksheet ) {
		
		const keys = this.KEYS.map(col => col.key);

		this.KEYS.forEach((col, i) => {
			DATA.data_props[col.key] = DATA.data_props[col.key] || {};
			
			let description = '';
			description = (DATA.data_props && DATA.data_props[col.key] && DATA.data_props[col.key].description)
				? DATA.data_props[col.key].description
				: '';

			let infoColor = 'FFBBBBBB'
			if ( DATA.data_warnings && DATA.data_warnings[ col.key ] ) {
				infoColor = 'FFFFB84D'
				description += '\n\n⚠️ ' + DATA.data_warnings[ col.key ];
			}
			if ( DATA.data_restrictions && DATA.data_restrictions[ col.key ] ) {
				description += '\n\n❗ ' + DATA.data_restrictions[ col.key ];
				infoColor = 'FFFFAAAA'
			}


			const cell = worksheet.getCell(2, i + 1);

				
			// Split description by \n and create text runs
			const descriptionLines = description.split('\n');
			const texts = [
				{
					font: { bold: true, size: 11, color: { argb: 'FF000000' }, name: 'Calibri' },
					text: DATA.data_props[col.key].meta_key + '\n'
				}
			];

			// Add each line as a separate text run with \n at the end
			descriptionLines.forEach((line, index) => {
				texts.push({
					font: { size: 11, color: { argb: 'FF000000' }, name: 'Calibri' },
					text: line + (index < descriptionLines.length - 1 ? '\n' : '')
				});
			});
			
			cell.note = {
				texts: texts,
				margins: {
					insetmode: 'auto',
				}
			};
			cell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: infoColor }
			};
			cell.font = { italic: true, color: { argb: 'FFFFFFFF' } };
			cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'center', indent: 1 };


		})

		return worksheet;

	}
	




	// MARK: Create Shipping Classes Sheet
	// -----------------------------
	async createShippingClassesSheet() {

		// If the template includes shipping_class column, add an extra sheet with shipping classes details
		const hasShippingClass = this.KEYS.some(col => col.key === 'shipping_class');
		if ( ! hasShippingClass ) return;

		const shippingClassSheetHeaders = [
			{ header: 'ID', key: 'term_id', alignment: { horizontal: 'center', indent: 1 } },
			{ header: 'Slug', key: 'slug', alignment: { horizontal: 'left', indent: 1 } },
			{ header: 'Name', key: 'name', alignment: { horizontal: 'left', indent: 1 } },
			{ header: 'Description', key: 'description', alignment: { horizontal: 'left', indent: 1 } },
			{ header: 'Count', key: 'count', alignment: { horizontal: 'center', indent: 1 } }
		];
		const shippingClassRows = [];

		// Get product shipping classes from DATA
		await ajax_getData('shipping_classes');
		const productShippingClasses = DATA.product_shipping_classes || [];

		// Iterate through each shipping class - create ONE row per class
		productShippingClasses.forEach(shippingClass => {
			const shippingClassId = shippingClass.term_id || '';
			const shippingClassSlug = shippingClass.slug || '';
			const shippingClassName = shippingClass.name || '';
			const shippingClassDescription = shippingClass.description || '';
			const shippingClassCount = shippingClass.count || 0;

			// Create a single row for the shipping class
			shippingClassRows.push([
				shippingClassId,
				shippingClassSlug,
				shippingClassName,
				shippingClassDescription,
				shippingClassCount
			]);
		});
		this.createSheet('Shipping Classes', shippingClassSheetHeaders, 'Product shipping classes configuration', shippingClassRows);

	}




	// MARK: Create Attributes Sheet
	// -----------------------------
	async createAttributesSheet() {
		
		
		// If the template includes attribute columns, add an extra sheet with attribute details
		const attributeKeys = ['attributes', 'attribute_values', 'default_attributes'];
		const hasAttributes = this.KEYS.some(col => attributeKeys.includes(col.key));
		if ( ! hasAttributes ) return;

		
	
		const attributeSheetHeaders = [
			{ header: 'ID', key: 'id', 					alignment: { horizontal: 'center', indent: 1 } },
			{ header: 'Slug', key: 'slug', 				alignment: { horizontal: 'left', indent: 1 } },
			{ header: 'Label', key: 'label', 			alignment: { horizontal: 'left', indent: 1 } },
			{ header: 'Type', key: 'type', 				alignment: { horizontal: 'left', indent: 1 } },
			{ header: 'Is Visible', key: 'is_visible', 	alignment: { horizontal: 'center', indent: 1 } },
			{ header: 'Options', key: 'options', 		alignment: { horizontal: 'left', wrapText: true, indent: 1 } }
		];
		const attributeRows = [];

		// Get product attributes from DATA
		await ajax_getData('attributes');
		const productAttributes = DATA.product_attributes || [];

		// Iterate through each attribute - create ONE row per attribute
		productAttributes.forEach(attr => {
			const attributeId = attr.attribute_id || '';
			const attributeName = attr.attribute_name || '';
			const attributeLabel = attr.attribute_label || '';
			const attributeType = attr.attribute_type || 'select';
			const isVisible = attr.attribute_public === 1 ? 'Yes' : 'No';
			const terms = attr.terms || [];
			
			// Get all term slugs, newline separated
			const termSlugs = terms.map(term => this.decodeHtmlEntities(term.slug)).join('\n');
			
			// Create a single row for the attribute
			attributeRows.push([
				attributeId,
				attributeName,
				attributeLabel,
				attributeType,
				isVisible,
				termSlugs
			]);
		});

//console.log('Attribute Rows:', attributeRows);

		this.createSheet('Attributes', attributeSheetHeaders, 'Product attributes configuration', attributeRows);

		
	}




	// MARK: Create Attributes Terms Sheet
	// -----------------------------
	async createAttributesTermsSheet() {
		
		
		// If the template includes attribute columns, add an extra sheet with attribute terms details
		const attributeKeys = ['attributes', 'attribute_values', 'default_attributes'];
		const hasAttributes = this.KEYS.some(col => attributeKeys.includes(col.key));
		if ( ! hasAttributes ) return;

		
	
		const termsSheetHeaders = [
			{ header: 'Attribute', key: 'attribute_name', 		alignment: { horizontal: 'center', indent: 1 } },
			{ header: 'Term ID', key: 'term_id', 				alignment: { horizontal: 'center', indent: 1 } },
			{ header: 'Name', key: 'name', 						alignment: { horizontal: 'left', indent: 1 } },
			{ header: 'Slug', key: 'slug', 						alignment: { horizontal: 'left', indent: 1 } },
			{ header: 'Description', key: 'description', 		alignment: { horizontal: 'left', indent: 1 } },
			{ header: 'Count', key: 'count', 					alignment: { horizontal: 'center', indent: 1 } }
		]
		const termsRows = [];

		// Get product attributes from DATA
		await ajax_getData('attributes');
		const productAttributes = DATA.product_attributes || [];

		// Iterate through each attribute
		productAttributes.forEach(attr => {
			const attributeName = attr.attribute_name || '';
			const terms = attr.terms || [];

			// Create a row for each term
			terms.forEach(term => {
				const termId = term.term_id || '';
				const termName = this.decodeHtmlEntities(term.name) || '';
				const termSlug = this.decodeHtmlEntities(term.slug) || '';
				const termDescription = this.decodeHtmlEntities(term.description) || '';
				const termCount = term.count || 0;
				
				termsRows.push([
					attributeName,
					termId,
					termName,
					termSlug,
					termDescription,
					termCount
				]);
			});
		});

//console.log('Attribute Terms Rows:', termsRows);

		this.createSheet('Attribute Terms', termsSheetHeaders, 'Detailed list of all attribute terms with their properties', termsRows);

		
	}





	// MARK: Get Product Value
	// -----------------------------
	getProductValue(product, key, type) {

		
		// Handle nested properties with dot notation (e.g., 'meta_data.custom_field')
		if (key.includes('.')) {
			const parts = key.split('.');
			let value = product;
			for (const part of parts) {
				if (value && typeof value === 'object') {
					value = value[part];
				} else {
					return null;
				}
			}
        	return this.decodeHtmlEntities(value);
		}

		// Get the value from product or meta_data
		let value = product[key];
		
		// Fallback: Check meta_data if value not found in root level
		if (value === undefined && product['meta_data']) {
			value = product['meta_data'][key];
		}
		
		// Fallback: Check with underscore prefix (WordPress meta convention)
		if (value === undefined && product['meta_data']) {
			const metaKey = key.startsWith('_') ? key : '_' + key;
			value = product['meta_data'][metaKey];
		}

		// Handle booleans
		if (type === 'bool' || type === 'boolean') {
			return value ? 'true' : 'false';
		}
		
		// Handle integers
		if (type === 'int') {
			const intValue = parseInt(value);
			return isNaN(intValue) ? 0 : intValue;
		}

		// Handle floats
		if (type === 'float') {
			const floatValue = parseFloat(value);
			return isNaN(floatValue) ? 0 : floatValue;
		}

		

		// flatten categories and tags to array of slugs
		if ( Object.keys(DATA.data_taxonomies).includes( key ) ) {
            const slugs = Array.isArray(value)
                ? value.map(term => (term && term.slug !== undefined) ? this.decodeHtmlEntities(term.slug) : this.decodeHtmlEntities(term))
                : [];
            return slugs.filter(slug => slug !== undefined && slug !== null && slug !== '').join('\n');
        }



		if ( key === 'attributes' ) {
			// Decode HTML entities for attribute names and options
			if (Array.isArray(value)) {
				const decodedAttributes = value.map(attr => {
					const decodedAttr = { ...attr };
					
					// Decode attribute name
					if (decodedAttr.name) {
						decodedAttr.name = this.decodeHtmlEntities(decodedAttr.name);
					}
					
					// Decode all options
					if (Array.isArray(decodedAttr.options)) {
						decodedAttr.options = decodedAttr.options.map(option => 
							this.decodeHtmlEntities(option)
						);
					}
					
					return decodedAttr;
				});
				
				return JSON.stringify(decodedAttributes, null, 2);
			}
		}

		
		if ( key === 'attribute_values' ) {
			// Decode HTML entities for attribute_values object
			if (value && typeof value === 'object') {
				const decodedValues = {};
				
				// Iterate through each key-value pair
				for (const [attrKey, attrValue] of Object.entries(value)) {
					// Decode both the key and the value
					const decodedKey = this.decodeHtmlEntities(attrKey);
					const decodedVal = this.decodeHtmlEntities(attrValue);
					decodedValues[decodedKey] = decodedVal;
				}
				
				return JSON.stringify(decodedValues, null, 2);
			}
		}


		// Handle arrays
		if ( type === 'array' || 
			(type === 'comma-separated' && Array.isArray(value) )
		 ) {
			value = value || []
			return value.join('\n')
		}

		// Handle array properties
		if (Array.isArray(value)) {
			// For categories, tags, etc., join slugs with \n
			if (value.length > 0 && value[0].slug) {
				return value.map(item => this.decodeHtmlEntities(item.slug)).join('\n');
			}
			// For other arrays, stringify
			return JSON.stringify(value, null, 2);

			// For other arrays, join values
        	//return value.map(item => item).join('\n');
		}
		

		// Handle object properties
		if (value && typeof value === 'object') {
			// For objects with a 'slug' property, return the slug
				if (value.slug) {
					return this.decodeHtmlEntities(value.slug);
			}
			// For objects with a 'name' property, return the name
			else if (value.name) {
				//return this.decodeHtmlEntities(value.name);
			}
			// Otherwise, stringify the object
			return JSON.stringify(value, null, 2);
		}



		// Return the value directly
		return this.decodeHtmlEntities(value);
	}




















	


	// MARK: Create Sheet
	// -----------------------------
	createSheet( name, headers, comment, content ) {


		const sheet = this.workbook.addWorksheet(name);

		if ( typeof headers[0] === 'string' ) {
			headers = headers.map( header => ( { header: header, key: header } ) );
		}
		// Add headers
		sheet.addRow(headers.map(h => h.header));
		const headerRow = sheet.getRow(1);
		headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		headerRow.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FF777777' }
		};
		// Set alignment for all header cells to center horizontally and vertically
		headerRow.alignment = { horizontal: 'center', vertical: 'middle' };


		// Comment/header below

		// Merge cells
		sheet.mergeCells(2, 1, 2, headers.length);
		const header2Cell = sheet.getCell(2, 1);
		header2Cell.value = comment || '';
		header2Cell.font = { italic: true, color: { argb: 'FFFFFFFF' } };
		header2Cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FFAAAAAA' }
		};
		header2Cell.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };



				if ( content ) {
					if ( Array.isArray(content) ) {
						// Add content rows
						content.forEach(rowData => {
							sheet.addRow(rowData);
						});
					} else {
						// Single content row
						sheet.addRow([content]);
					}
				}


				// Add word wrap to all content cells, using alignment from headers if provided
				for (let rowIndex = 3; rowIndex <= sheet.rowCount; rowIndex++) {
					const row = sheet.getRow(rowIndex);
					row.eachCell((cell, colNumber) => {
						const headerAlignment = headers[colNumber - 1] && headers[colNumber - 1].alignment
							? headers[colNumber - 1].alignment
							: {};
						cell.alignment = {
							wrapText: true,
							vertical: 'top',
							horizontal: headerAlignment.horizontal || 'left',
							indent: headerAlignment.indent || 1,
							...headerAlignment
						};
					});
				}



				// Auto-size columns based on header and content
				sheet.columns.forEach((column, i) => {
					let maxLength = 0;
					// Check header
					const headerValue = headerRow.getCell(i + 1).value;
					maxLength = headerValue ? String(headerValue).length : 0;
					// Check all content rows
					for (let rowIndex = 3; rowIndex <= sheet.rowCount; rowIndex++) {
						const cellValue = sheet.getRow(rowIndex).getCell(i + 1).value;
						if (cellValue) {
							const cellLength = String(cellValue).split('\n').reduce((max, line) => Math.max(max, line.length), 0);
							if (cellLength > maxLength) maxLength = cellLength;
						}
					}
					// Add padding, cap at 50
					column.width = Math.min(maxLength + 6, 50);
				});




		return sheet;


	}






	// MARK: Decode HTML
	// -----------------------------
	decodeHtmlEntities(text) {
		if (!text || typeof text !== 'string') return text;

		try {
			return decodeURIComponent(text);
		} catch {
			return text; // return as-is if not encoded
		}
		
		const textarea = document.createElement('textarea');
		textarea.innerHTML = text;
		return textarea.value;
	}


	

	// MARK: Estimate Column Width
	// -----------------------------
	estimateColumnWidth(text) {

		if (!text) return 8;
		
		// Split by newlines and get the longest line
		const lines = String(text).split('\n');
		const longestLine = lines.reduce((max, line) => 
			line.length > max.length ? line : max, ''
		);
		
		// Excel column width is approximately the number of characters
		// but uppercase and wide characters need more space
		let width = 0;
		for (const char of longestLine) {
			// Wider characters (uppercase, numbers, special chars)
			if (/[A-Z0-9@#$%&*]/.test(char)) {
				width += 1.2;
			}
			// Narrow characters
			else if (/[il!|']/.test(char)) {
				width += 0.5;
			}
			// Regular characters
			else {
				width += 1;
			}
		}
		
		return Math.ceil(width);
	}




	// MARK: Calculate Row Height
	// -----------------------------
	calculateCellHeight(cellValue, index, columns) {
        const baseHeight = 15;
        if (!cellValue) return baseHeight;

        const column = this.worksheet ? this.worksheet.getColumn(index + 1) : null;
        const columnWidth =
            (column && column.width) ||
            (columns && columns[index] && columns[index].width) ||
            10;
        const charsPerLine = Math.max(Math.floor(columnWidth * 1.1), 1);

        const lines = String(cellValue).split('\n');
        const totalLines = lines.reduce(
            (sum, line) => sum + Math.max(Math.ceil(line.length / charsPerLine), 1),
            0
        );

        return Math.max(baseHeight, totalLines * baseHeight);
    }
	calculateRowHeight(row, columns) {
		const baseHeight = 15; // Base row height in points
		let maxLines = 1;
		
		// Check each cell in the row
		row.forEach((cellValue, index) => {
			if (!cellValue) return;
			
			const cellText = String(cellValue);
			const columnWidth = columns[index] ? (columns[index].width || 50) : 50;
			
			// Count newlines
			const newlineCount = (cellText.match(/\n/g) || []).length;
			
			// Estimate wrapped lines based on column width
			const lines = cellText.split('\n');
			let totalLines = 0;
			
			lines.forEach(line => {
				// Rough estimate: 1 line per ~column width characters
				const wrappedLines = Math.ceil(line.length / columnWidth);
				totalLines += Math.max(wrappedLines, 1);
			});
			
			maxLines = Math.max(maxLines, totalLines);
		});
		
		// Calculate height: ~15 points per line
		return maxLines * baseHeight;
	}

	capRowHeights(limit = 150) {
        if (!this.worksheet) return;

        const sheetModel = this.worksheet.model;
        if (sheetModel) {
            sheetModel.sheetFormat = sheetModel.sheetFormat || {};
            sheetModel.sheetFormat.customHeight = 1;

            if (Array.isArray(sheetModel.rows)) {
                sheetModel.rows.forEach(rowModel => {
                    if (!rowModel) return;
                    const target = Math.min(rowModel.height || limit, limit);
                    rowModel.height = target;
                    rowModel.customHeight = 1;
                });
            }
        }

        this.worksheet.eachRow({ includeEmpty: true }, (row, i) => {
			if (i <= 2) return; // Skip header rows
            if (!row) return;
            const target = Math.min(row.height || limit, limit);
            row.height = target;
            row.customHeight = true;
            row.commit();
        });
    }



	enforceRowHeightLimit(limit = 150) {
        if (!this.worksheet) return;

        const rows = this.worksheet._rows || [];
        for (let idx = 2; idx < rows.length; idx++) {
            const row = rows[idx];
            if (!row) continue;

            const target = Math.min(
                typeof row._height === 'number' ? row._height : limit,
                limit
            );

            row._height = target;
            row._customHeight = true;

            if (row.model) {
                row.model.height = target;
                row.model.customHeight = true;
            }

            const excelRow = this.worksheet.getRow(idx + 1);
            excelRow.height = target;
            excelRow.customHeight = true;
            excelRow.commit();
        }
    }


}







/*
this.template.dropdowns = [
	{
		column: 'type',                      // Column to add dropdown to (matches key)
		options: ['simple', 'variable', 'grouped', 'external'],  // Available options
		referenceSheet: 'Sheet2',            // Create a separate sheet with these options
		referenceHeader: 'type_names'        // Header in the reference sheet
	},
	{
		column: 'status',
		options: ['publish', 'draft', 'pending', 'private'],
		referenceSheet: 'Post Status',
		referenceHeader: 'Status Options'
	},
	{
		column: 'stock_status',
		// Direct validation (no reference sheet) - good for short lists
		options: ['instock', 'outofstock', 'onbackorder']
	}
]
*/






// -----------------------------------------------------
export default WorkBook;