import {
	ajax_getData,
	productQuery
} 	from './helpers.js';
// -----------------------------------------------------




const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
// -----------------------------------------------------


class Validations {

	constructor( template, createSheet ) {
		
		this.template 		= template || {};
		this.createSheet 	= createSheet;

	}









	// MARK: Validations
	// -----------------------------
	/**
	 * Add validations to the worksheet based on the template configuration
	 * @param {Object} workbook - ExcelJS workbook
	 * @param {Object} worksheet - ExcelJS worksheet
	 * @param {Number} productCount - Number of products (to determine row range)
	 */
	async addValidations(workbook, worksheet, productCount) {
		let dropdowns = []

//console.log('addValidations', productCount, workbook)
		
		// Track inserted columns count to properly place helper columns
		let insertedColumnsCount = 0;

		// Create a hidden sheet for all helper columns
		const helperSheet = workbook.addWorksheet('_acex_helpers');
		helperSheet.state = 'hidden';
		let helperSheetColCount = 0;
		
		// Collect conditional formatting info from taxonomies to apply AFTER all columns are inserted
		const conditionalFormattingList = [];
		const formulaList = []; // New: Store formula info

		for (const col of this.template.columns) {


			if ( Object.keys(DATA.data_taxonomies).includes( col.key ) ) {

				const result = await this.validation_taxonomies(workbook, worksheet, productCount, col.key, insertedColumnsCount, helperSheet, helperSheetColCount);
				workbook = result.workbook;
				worksheet = result.worksheet;
				insertedColumnsCount = result.insertedColumnsCount;
				helperSheetColCount = result.helperSheetColCount;
				if (result.conditionalFormattingInfo) {
					conditionalFormattingList.push(result.conditionalFormattingInfo);
				}
				if (result.formulaInfo) { // New: Collect formula info
					formulaList.push(result.formulaInfo);
				}

			}


			if ( col.key === 'shipping_class' ) {
				dropdowns.push({
					column: col.key,
					//options: ['true', 'false'],
					referenceSheet: 'Shipping Classes',
					referenceHeader: 'Slug',
					referenceColumn: 'B',
					startRow: 3
				});
			}


			// Props with array of options
			if (Array.isArray(col.type) || (typeof col.type === 'string' && col.type.includes(','))) {
				let options = Array.isArray(col.type) ? col.type : col.type.split(',').map(opt => opt.trim());
				dropdowns.push({
					column: col.key,
					options: options,
				});
			}
				
				
			// Handle boolean fields with checkbox-style formatting
			if (col.type === 'bool' || col.type === 'boolean') {
				dropdowns.push({
					column: col.key,
					options: ['true', 'false'],
				});
				
				const colIndex = this.template.columns.findIndex(c => c.key === col.key);
				const colLetter = this.getExcelColumnLetter(colIndex + 1);
				const maxRow = productCount + 2 + 1000;

				// Add conditional formatting for visual feedback
				worksheet.addConditionalFormatting({
					ref: `${colLetter}3:${colLetter}${maxRow}`,
					rules: [
						{
							type: 'expression',
							formulae: [`LOWER(${colLetter}3)="true"`],
							style: {
								fill: {
									type: 'pattern',
									pattern: 'solid',
									bgColor: { argb: 'FFD4EDDA' } // Light green
								},
								font: {
									color: { argb: 'FF155724' }, // Dark green
									bold: true
								}
							}
						},
						{
							type: 'expression',
							formulae: [`LOWER(${colLetter}3)="false"`],
							style: {
								fill: {
									type: 'pattern',
									pattern: 'solid',
									bgColor: { argb: 'FFF8D7DA' } // Light red
								},
								font: {
									color: { argb: 'FF721C24' } // Dark red
								}
							}
						}
					]
				});






				// Center align the column
				worksheet.getColumn(colIndex + 1).alignment = { 
					horizontal: 'center', 
					vertical: 'middle' 
				};
			}


		}

		// New: Loop through and apply all formulas now that all columns are stable
		formulaList.forEach(info => {
			this.applyTaxonomyFormulas(worksheet, info);
		});


		// NOW apply all conditional formatting for taxonomies AFTER all columns have been inserted
		// This ensures the helper column references don't shift
		conditionalFormattingList.forEach(cfInfo => {
			// Convert indices to letters NOW, after all insertions are complete
			const colLetter = this.getExcelColumnLetter(cfInfo.colIndex);
			const helperColLetter = this.getExcelColumnLetter(cfInfo.helperColIndex);
			
			worksheet.addConditionalFormatting({
				ref: `${colLetter}3:${colLetter}${cfInfo.maxRow}`,
				rules: [
					{
						type: 'expression',
						formulae: [`INDIRECT("'${cfInfo.helperSheetName}'!${helperColLetter}"&ROW())>0`],
						style: {
							fill: {
								type: 'pattern',
								pattern: 'solid',
								bgColor: { argb: 'FFFF9999' }
							}
						}
					}
				]
			});
		});





		this.validation_dropdowns( dropdowns, worksheet, productCount )

	
	
	}







	// MARK: Dropdown Validations
	// -----------------------------------------------------
	/**
	 * Validate dropdowns in the worksheet
	 * @param {Array} dropdowns - List of dropdown configurations
	 */
	validation_dropdowns( dropdowns, worksheet, productCount ) {

		if ( ! dropdowns.length ) return;

		dropdowns.forEach(dropdown => {
			const { column, options, referenceSheet, referenceHeader, referenceColumn, startRow } = dropdown;

			// Find column index from the original template
			const colIndex = this.template.columns.findIndex(col => col.key === column);
			if (colIndex === -1) return;

			// Account for any taxonomy display columns inserted before this one
			let displayColumnsBeforeThisOne = 0;
			for (let i = 0; i < colIndex; i++) {
				const col = this.template.columns[i];
				if ( Object.keys(DATA.data_taxonomies).includes( col.key ) ) {
					displayColumnsBeforeThisOne++;
				}
			}
			const actualColIndex = colIndex + displayColumnsBeforeThisOne;

			const colLetter = this.getExcelColumnLetter(actualColIndex + 1);

			if (referenceSheet && (! options || ! options.length) ) {

				// Fetch options from the reference sheet's specified header
				const refCol = referenceColumn || 'B';
				const dataStartRow = startRow || 3;
				// Find the last row with data in the reference sheet for the specified column
				const refSheet = worksheet.workbook.getWorksheet(referenceSheet);
				let lastRefRow = dataStartRow;
				// If the header is in row 1, data starts from dataStartRow
				if (refSheet) {
					// Get actual row count from the worksheet
					const actualRowCount = refSheet.actualRowCount || refSheet.rowCount || dataStartRow;
					for (let i = actualRowCount; i >= dataStartRow; i--) {
						const cellValue = refSheet.getCell(`${refCol}${i}`).value;
						if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
							lastRefRow = i;
							break;
						}
					}
				}
				const optionsRange = `'${referenceSheet}'!$${refCol}$${dataStartRow}:$${refCol}$${lastRefRow}`;
				for (let rowNum = 3; rowNum <= productCount + 2; rowNum++) {
					const cell = worksheet.getCell(`${colLetter}${rowNum}`);
					cell.dataValidation = {
						type: 'list',
						allowBlank: true,
						formulae: [optionsRange],
						showErrorMessage: true,
						errorTitle: 'Invalid Selection',
						error: `Please select a value from the ${referenceHeader || 'Options'} list`
					};
				}
				return;
			}



			if (referenceSheet && options && options.length > 0) {
				// Use specific column if provided, otherwise default to column A
				const refCol = referenceColumn || 'B';
        		const dataStartRow = startRow || 2;
        		const optionsRange = `'${referenceSheet}'!$${refCol}$${dataStartRow}:$${refCol}$${options.length + dataStartRow - 1}`;
				
				for (let rowNum = 3; rowNum <= productCount + 2; rowNum++) {
					const cell = worksheet.getCell(`${colLetter}${rowNum}`);
					cell.dataValidation = {
						type: 'list',
						allowBlank: true,
						formulae: [optionsRange],
						showErrorMessage: true,
						errorTitle: 'Invalid Selection',
						error: `Please select a value from the ${referenceHeader || 'Options'} list`
					};
				}

			} else if (options && options.length > 0) {
				// Direct list validation (for small lists, max 255 chars)
				const optionsList = `"${options.join(',')}"`;
				
				if (optionsList.length <= 255) {
					for (let rowNum = 3; rowNum <= productCount + 2; rowNum++) {
						const cell = worksheet.getCell(`${colLetter}${rowNum}`);
						cell.dataValidation = {
							type: 'list',
							allowBlank: true,
							formulae: [optionsList],
							showErrorMessage: true,
							errorTitle: 'Invalid Selection',
							error: 'Please select a value from the dropdown list'
						};
					}
				} else {
					// List too long for direct validation, create reference sheet
					const refSheetName = `${column}_options`;
					const refSheet = workbook.addWorksheet(refSheetName);
					refSheet.addRow(['Options']);
					refSheet.getRow(1).font = { bold: true };
					
					options.forEach(option => {
						refSheet.addRow([option]);
					});

					const optionsRange = `${refSheetName}!$A$2:$A$${options.length + 1}`;

					for (let rowNum = 3; rowNum <= productCount + 2; rowNum++) {
						const cell = worksheet.getCell(`${colLetter}${rowNum}`);
						cell.dataValidation = {
							type: 'list',
							allowBlank: true,
							formulae: [optionsRange],
							showErrorMessage: true,
							errorTitle: 'Invalid Selection',
							error: 'Please select a value from the Options list'
						};
					}
				}
			}
		});
	

	}

	


	
	// MARK: Taxonomies Validation
	// -----------------------------
	/**
	 * Generic validation for taxonomies (categories or tags)
	 * @param {Object} workbook - ExcelJS workbook
	 * @param {Object} worksheet - ExcelJS worksheet
	 * @param {Number} productCount - Number of products
	 * @param {String} taxonomyType - 'categories' or 'tags'
	 * @param {Number} insertedColumnsCount - Number of columns already inserted (for proper helper column placement)
	 * @returns {Object} - {workbook, worksheet, insertedColumnsCount}
	 */
	async validation_taxonomies(workbook, worksheet, productCount, taxonomyType = 'categories', insertedColumnsCount = 0, helperSheet, helperSheetColCount = 0) {
		
		const config = {}
		for ( let key in DATA.data_taxonomies ) {
			await ajax_getData( key );
			let tax = DATA.data_taxonomies[key];
			let name = tax.labels.menu_name || tax.label || key
			config[key] = {
				sheetName: name,
				columnKey: key,
				dataSource: DATA[`product_${key}`],
				headers: ['id', 'slug', 'name', 'description'],
				hasParent: false,
				comment: 'Multiple tags: Select from dropdown, then press F2 to edit. Add more tags on new lines (Alt+Enter) or comma-separated.',
				displayColumnName: name,
				helperColumnPrefix: key + ' Name Helper',
				validationHelperTitle: name + ' Validation (Helper)',
				validationRange: `${name}!$B:$B`,
				nameRange: `${name}!$B:$C`,
				promptTitle: 'Enter Slugs',
				promptText: `Enter taxonomy slugs separated by:\n• Commas: electronics,gadgets\n• New lines: Alt+Enter between slugs\n\nNames appear in the ${name} column.\nInvalid slugs turn the cell RED.\n\n💡 Tip: Select rows and use Home → Format → AutoFit Row Height to see all terms.`,
				headerNote: `✏️ Enter taxonomy slugs (comma or newline separated).\n\n👀 Names appear in the ${name} column.\n\n✅ Cell stays white if all slugs are valid.\n❌ Cell turns RED if any slug is invalid.\n\n📖 See ${name} sheet for the Slug/Name list.`,
				useIds: false,
				vlookupColumn: 2,
				lookupColumn: 1,
				namesWidth: 25,
			};
			if ( tax.hierarchical ) {
				config[key].headers = ['id', 'slug', 'name', 'description', 'parent', 'parent name', 'parent slug'];
				config[key].hasParent = true;
			}
		}


		const cfg = config[taxonomyType];
		if (!cfg) {
			console.error(`Unknown taxonomy type: ${taxonomyType}`);
			return { workbook, worksheet };
		}


//console.log('validation_taxonomies', cfg)


		// Create reference sheet
		//const refSheet = workbook.addWorksheet(cfg.sheetName);
		const refSheet = this.createSheet( cfg.sheetName, cfg.headers, cfg.comment );
		
		



		// Add taxonomy data
		if (cfg.dataSource && cfg.dataSource.length > 0) {

			// Decode HTML entities in names and slugs
			cfg.dataSource.forEach(item => {
				const rowData = [
					item.term_id,
					this.decodeHtmlEntities(item.slug),
					this.decodeHtmlEntities(item.name),
					item.description,
				];
				
				// Add parent column for hierarchical taxonomies
				if (cfg.hasParent) {
					const parent = cfg.dataSource.find(cat => cat.term_id === item.parent);
					rowData.push(item.parent);
					rowData.push(parent ? this.decodeHtmlEntities(parent.name) : '');
					rowData.push(parent ? this.decodeHtmlEntities(parent.slug) : '');
				}
				
				refSheet.addRow(rowData);
			});




			// Set column widths
			const columnWidths = cfg.hasParent 
				? [10, 40, 40, 60, 20, 40]  // id, slug, name, parent, instructions
				: [10, 40, 40, 60];      // id, slug, name, instructions

			columnWidths.forEach((width, index) => {
				refSheet.getColumn(index + 1).width = width;
			});

			// Set column alignments
			refSheet.getColumn(1).alignment = { horizontal: 'center', vertical: 'top' };
			for (let i = 2; i <= columnWidths.length; i++) {
				refSheet.getColumn(i).alignment = { horizontal: 'left', vertical: 'top', indent: 1 };
			}
			refSheet.getColumn(columnWidths.length).alignment = { 
				horizontal: 'left', 
				vertical: 'top', 
				indent: 1, 
				wrapText: true 
			};




			let response = this.addTaxonomyValidation( workbook, worksheet, productCount, cfg, insertedColumnsCount, helperSheet, helperSheetColCount )
			if ( response ) {
				return response;
			}

			// Add validation to main worksheet
		}

		return { workbook, worksheet, insertedColumnsCount, helperSheetColCount };
	}


	

	// MARK: Add Taxonomy Validation to Worksheet
	// -----------------------------------------------------
	// Inserts display and helper columns, adds data validation and conditional formatting
	addTaxonomyValidation( workbook, worksheet, productCount, cfg, insertedColumnsCount, helperSheet, helperSheetColCount ) {

		const columnIndex = this.template.columns.findIndex(c => c.key === cfg.columnKey);
		if (columnIndex !== -1) {
			// Calculate how many display columns were inserted BEFORE this taxonomy column
			let displayColumnsBeforeThisOne = 0;
			for (let i = 0; i < columnIndex; i++) {
				const col = this.template.columns[i];
				if ( Object.keys(DATA.data_taxonomies).includes( col.key ) ) {
					displayColumnsBeforeThisOne++;
				}
			}
			
			// Adjust the actual column position in the worksheet
			const actualColumnIndex = columnIndex + displayColumnsBeforeThisOne;
			
			// Insert a new column right after the taxonomy column
			const insertPosition = actualColumnIndex + 2;
			
			// Insert blank column by moving columns to the right
			// IMPORTANT: This shifts ALL columns to the right, including the data column!
			worksheet.spliceColumns(insertPosition, 0, []);
			
			// NOW calculate the column letters AFTER the insertion
			// The data column is still at the same position (actualColumnIndex + 1)
			const colLetter = this.getExcelColumnLetter(actualColumnIndex + 1);
			const displayColLetter = this.getExcelColumnLetter(insertPosition);
			
			// Configure the display column
			worksheet.getColumn(insertPosition).width = cfg.namesWidth;
			worksheet.getCell(`${displayColLetter}1`).value = cfg.displayColumnName;
			worksheet.getCell(`${displayColLetter}1`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
			worksheet.getCell(`${displayColLetter}1`).alignment = { horizontal: 'center' };
			worksheet.getCell(`${displayColLetter}1`).fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FF777777' }
			};
			worksheet.getCell(`${displayColLetter}2`).value = 'Auto-filled';
			worksheet.getCell(`${displayColLetter}2`).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
			worksheet.getCell(`${displayColLetter}2`).font = { italic: true, color: { argb: 'FF888888' } };
			
			const displayColIndex = insertPosition;

			// Calculate row range
			const lastDataRow = worksheet.lastRow?.number || 2;
			const bufferRows = 100;
			const maxRow = Math.min(
				Math.max(lastDataRow, productCount + 2) + bufferRows,
				10000 // Increased from 500 to support more products
			);
			
			
			// Create helper columns in the dedicated helper sheet
			const helperInfo = this._addTaxonomyHelpers(helperSheet, cfg, maxRow, helperSheetColCount, worksheet.name, colLetter);
			
			// Add validation to each row
			for (let rowNum = 3; rowNum <= maxRow; rowNum++) {
				const cell = worksheet.getCell(`${colLetter}${rowNum}`);

				// Add data validation
				cell.dataValidation = {
					type: 'textLength',
					operator: 'lessThan',
					formulae: [10000],
					allowBlank: true,
					showInputMessage: true,
					promptTitle: cfg.promptTitle,
					prompt: cfg.promptText,
					showErrorMessage: false
				};
			}

			// Store conditional formatting info to apply AFTER all columns are inserted
			const conditionalFormattingInfo = {
				colIndex: actualColumnIndex + 1,
				helperColIndex: helperInfo.validationHelperColIndex,
				helperSheetName: helperSheet.name,
				maxRow: maxRow
			};

			// New: Store formula info to apply later
			const formulaInfo = {
				cfg,
				maxRow,
				worksheetName: worksheet.name,
				colIndex: actualColumnIndex + 1,
				displayColIndex: displayColIndex,
				helperSheetName: helperSheet.name,
				nameHelperStartIndex: helperInfo.nameHelperStartIndex,
				nameHelperCount: helperInfo.nameHelperCount,
				validationHelperColIndex: helperInfo.validationHelperColIndex,
			};

			// Add header note
			const headerCell = worksheet.getCell(1, actualColumnIndex + 1);
			headerCell.note = {
				texts: [{
					font: { size: 11, color: { argb: 'FF000000' } },
					text: cfg.headerNote
				}]
			};

			// Auto-resize the column
			const column = worksheet.getColumn(actualColumnIndex + 1);
			let maxWidth = this.estimateColumnWidth(this.template.columns[columnIndex].header);

			
			// Limit the cell iteration to avoid performance issues
			const maxRowToCheck = Math.min(worksheet.rowCount || productCount + 10, productCount + 10);
			for (let rowNumber = 3; rowNumber <= maxRowToCheck; rowNumber++) {
				const cell = worksheet.getCell(rowNumber, actualColumnIndex + 1);
				if (cell && cell.value) {
					const cellWidth = this.estimateColumnWidth(String(cell.value || ''));
					maxWidth = Math.max(maxWidth, cellWidth);
				}
			}

			column.width = Math.min(Math.max(maxWidth, 10) + 2, 50);
			
			// Increment the inserted columns count (we inserted 1 display column)
			insertedColumnsCount += 1;
			
			// Return the conditional formatting info so it can be applied later
			return { workbook, worksheet, insertedColumnsCount, helperSheetColCount: helperInfo.newHelperSheetColCount, conditionalFormattingInfo, formulaInfo };
		}
	
		return false

	}





	// MARK: Taxonomy Helpers
	/**
	 * Adds the necessary helper columns for a taxonomy to a specified helper sheet.
	 * @private
	 */
	_addTaxonomyHelpers(helperSheet, cfg, maxRow, startColumnIndex, sourceSheetName, sourceColLetter) {
		const nameHelperCount = 10;
		const nameHelperStartIndex = startColumnIndex + 1;

		// Add Name Helper columns
		for (let i = 0; i < nameHelperCount; i++) {
			const helperIdx = nameHelperStartIndex + i;
			const helperLetter = this.getExcelColumnLetter(helperIdx);

			helperSheet.getColumn(helperIdx).width = 30;
			helperSheet.getCell(`${helperLetter}1`).value = `${cfg.helperColumnPrefix} ${i + 1}`;
			helperSheet.getCell(`${helperLetter}1`).font = { italic: true, color: { argb: 'FFBBBBBB' } };

			for (let rowNum = 3; rowNum <= maxRow; rowNum++) {
				const sliceStart = (i + 1) * 99 - 98;
				const tokenFormula = `LET(` +
					`_raw,SUBSTITUTE('${sourceSheetName}'!${sourceColLetter}${rowNum},CHAR(10),","),` +
					`_token,TRIM(MID(SUBSTITUTE(_raw,",",REPT(" ",99)),${sliceStart},99)),` +
					`IF(_token="","",IFERROR(VLOOKUP(_token,${cfg.nameRange},${cfg.vlookupColumn},FALSE),"[invalid slug]")))`;
				helperSheet.getCell(`${helperLetter}${rowNum}`).value = { formula: tokenFormula };
			}
		}

		// Add Validation Helper column
		const validationHelperColIndex = nameHelperStartIndex + nameHelperCount;
		const validationHelperColLetter = this.getExcelColumnLetter(validationHelperColIndex);

		helperSheet.getColumn(validationHelperColIndex).width = 15;
		helperSheet.getCell(`${validationHelperColLetter}1`).value = cfg.validationHelperTitle;
		helperSheet.getCell(`${validationHelperColLetter}1`).font = { bold: true, color: { argb: 'FF888888' } };
		helperSheet.getCell(`${validationHelperColLetter}2`).value = '0 = Valid IDs\n>0 = Invalid';
		helperSheet.getCell(`${validationHelperColLetter}2`).alignment = { wrapText: true, vertical: 'top' };
		helperSheet.getCell(`${validationHelperColLetter}2`).font = { italic: true, color: { argb: 'FF888888' } };

		for (let rowNum = 3; rowNum <= maxRow; rowNum++) {
			const helperFormula = `IF('${sourceSheetName}'!${sourceColLetter}${rowNum}="",0,LET(` +
				`_raw,SUBSTITUTE('${sourceSheetName}'!${sourceColLetter}${rowNum},CHAR(10),","),` +
				`_arr,IFERROR(TEXTSPLIT(_raw,","),TRIM(MID(SUBSTITUTE(_raw,",",REPT(" ",99)),ROW(INDIRECT("1:200"))*99-98,99))),` +
				`_trim,TRIM(_arr),` +
				`SUMPRODUCT(--(LEN(_trim)>0),--(COUNTIF(${cfg.validationRange},_trim)=0))` +
			`))`;
			helperSheet.getCell(`${validationHelperColLetter}${rowNum}`).value = { formula: helperFormula };
		}

		return {
			nameHelperStartIndex,
			nameHelperCount,
			validationHelperColIndex,
			newHelperSheetColCount: startColumnIndex + nameHelperCount + 1
		};
	}




	// MARK: Apply Taxonomy Formulas
	// -----------------------------------------------------
	// New: Function to apply formulas after all columns are stable
	applyTaxonomyFormulas(worksheet, info) {
		const { cfg, maxRow, colIndex, displayColIndex, helperSheetName, nameHelperStartIndex, nameHelperCount, validationHelperColIndex } = info;

		const colLetter = this.getExcelColumnLetter(colIndex);
		const displayColLetter = this.getExcelColumnLetter(displayColIndex);

		const nameHelperLetters = [];
		for (let i = 0; i < nameHelperCount; i++) {
			nameHelperLetters.push(this.getExcelColumnLetter(nameHelperStartIndex + i));
		}
		const firstNameHelperLetter = nameHelperLetters[0];
		const lastNameHelperLetter = nameHelperLetters[nameHelperLetters.length - 1];

		for (let rowNum = 3; rowNum <= maxRow; rowNum++) {
			const displayCell = worksheet.getCell(`${displayColLetter}${rowNum}`);

			// Add display formula that references the helper sheet
			const displayFormula = `IF(${colLetter}${rowNum}="", "", LET(` +
				`_names,'${helperSheetName}'!${firstNameHelperLetter}${rowNum}:${lastNameHelperLetter}${rowNum},` +
				`_joined,TEXTJOIN(CHAR(10),TRUE,_names),` +
				`IF(_joined="","[no matches]",_joined)` +
			`))`;

			const row = worksheet.getRow(rowNum);
			row.height = undefined;

			displayCell.value = { formula: displayFormula };
			displayCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'center' };

			displayCell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFEFF5FF' }
			};
			displayCell.font = { color: { argb: 'FF1F4E78' } };
			displayCell.protection = { locked: true };
			displayCell.border = {
				top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
				bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } }
			};
		}
	}
















	// MARK: Get Excel Column Letter
	// -----------------------------
	getExcelColumnLetter(columnNumber) {
		let columnLetter = '';
		while (columnNumber > 0) {
			const remainder = (columnNumber - 1) % 26;
			columnLetter = String.fromCharCode(65 + remainder) + columnLetter;
			columnNumber = Math.floor((columnNumber - 1) / 26);
		}
		return columnLetter;
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
		//return decodeURIComponent(escape(this._htmlDecodeHelper(text)));
		
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







}









// -----------------------------------------------------
export default Validations;