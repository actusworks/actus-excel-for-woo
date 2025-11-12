import Modal 			from './Modal.js';
import ActusUpload 		from './upload.js';
import ImportValidation from './import-validation.js';
import {
	log,
	logg,
	ajax_createTaxonomies,
	ajax_saveMultipleProducts,
} from './helpers.js';
// -----------------------------------------------------



const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
// -----------------------------------------------------




// MARK: Validate Keys
// -----------------------------------------------------
export function validateKeys( keys ) {
	return true;
	const validKeys = Object.keys( DATA.all_fields || {} );
	return keys.every( key => validKeys.includes( key ) );
}







// MARK: Parse Products
// -----------------------------------------------------
export function parseProductsFromSheet( worksheet, fieldKeys, selectedKeys, check, free ) {

	// Parse products starting from row 3
	const products = [];
	worksheet.eachRow((row, rowNumber) => {
		// Skip header rows (1 and 2)
		if (rowNumber <= 2) return;

		const product = {};
		row.eachCell((cell, colNumber) => {
			const fieldKey = fieldKeys[colNumber - 1];
			if ( selectedKeys.length && ! selectedKeys.includes(fieldKey) ) return;
			if ( ! check && ! free.props.includes(fieldKey) ) {
				return; // Skip keys not allowed in free version
			}
			DATA.data_props[ fieldKey ] = DATA.data_props[ fieldKey ] || {};
			if (fieldKey && String(fieldKey).startsWith('0')) return;
			if (fieldKey && String(fieldKey) == 'Auto-filled' ) return;
			const type = DATA.data_props[ fieldKey ].type


			if (fieldKey) {
				let value = cell.value;
				if ( DATA.data_props[ fieldKey ] ) {
					/*
					if ( type === 'array' || type === 'comma-separated' ) {
						if (typeof value === 'string') {
							value = value.split(/,|\n/).map(v => v.trim()).filter(v => v.length > 0);
						}
						if ( typeof value === 'number' || typeof value === 'float' ) {
							value = [value || 0];
						}
					}
					*/
					
					if ( type === 'boolean' ) {
						if ( typeof value == 'string' ) value = value.toLowerCase()
						if ( ['true','1','yes','on'].includes( value ) ) value = true;
						else value = '';
						if ( ! value ) value = '';
					}
				
				}
			
				product[fieldKey] = value;
			}


		});

		// Only add if product has at least one field
		if (Object.keys(product).length > 0) {
			products.push(product);
		}
	});

	//console.log('Products:', products);

	return products;

}






// MARK: Parse Taxonomies Sheets
// -----------------------------------------------------
export function parseTaxonomiesSheets( workbook, importOptions ) {

	let worksheet;
	let tData = {}

	
	for ( let key in DATA.data_taxonomies ) {
		let currentTaxonomy = DATA.data_taxonomies[ key ];
		let name = currentTaxonomy.labels.menu_name || currentTaxonomy.label || key;
		if ( importOptions[`create_${key}`] ) {
			worksheet = workbook.getWorksheet( name );
			if (worksheet) {
				// Parse taxonomies rows
				const taxonomies = [];
				worksheet.eachRow((row, rowNumber) => {
					if (rowNumber <= 2) return;
					const rowData = {};
					row.eachCell((cell, colNumber) => {
						const header = worksheet.getRow(1).getCell(colNumber).value;
						rowData[header] = cell.value;
					});
					if (Object.keys(rowData).length > 0) {
						taxonomies.push(rowData);
					}
				});
				tData[`original_${key}`] = taxonomies;
			}
		}
	}



	if ( importOptions.create_attributes ) {
		worksheet = workbook.getWorksheet('Attributes');
		if (worksheet) {
			// Parse attributes rows
			const attributes = [];
			worksheet.eachRow((row, rowNumber) => {
				if (rowNumber <= 2) return;
				const rowData = {};
				row.eachCell((cell, colNumber) => {
					const header = worksheet.getRow(1).getCell(colNumber).value;
					rowData[header] = cell.value;
				});
				if (Object.keys(rowData).length > 0) {
					attributes.push(rowData);
				}
			});
			tData.original_attributes = attributes;
		}

		worksheet = workbook.getWorksheet('Attribute Terms');
		if (worksheet) {
			// Parse attribute values rows
			const attributeValues = [];
			worksheet.eachRow((row, rowNumber) => {
				if (rowNumber <= 2) return;
				const rowData = {};
				row.eachCell((cell, colNumber) => {
					const header = worksheet.getRow(1).getCell(colNumber).value;
					rowData[header] = cell.value;
				});
				if (Object.keys(rowData).length > 0) {
					attributeValues.push(rowData);
				}
			});
			tData.original_attribute_values = attributeValues;
		}
	}

	return tData;
}








// MARK: Check Orphaned Variations
// -----------------------------------------------------
export async function checkOrphaned( $button ) {

	$button.prop('disabled', true).html( DATA.SVG.loader );
	const response = await $.ajax({
		url: acex_phpDATA.ajax_url,
		type: 'POST',
		data: {
			action: 'acex_check_orphaned',
			nonce: acex_phpDATA?.nonce
		}
	});
	//console.log('Orphaned variations response:', response );

	if (response.success) {
		//console.log(response.data.variations);
		displayOrphanedResults( response.data.variations, $button );
	} else {
		console.error('Error checking orphaned variations:', response);
		displayOrphanedResults( [], $button );
	}
}







// MARK: Display Orphaned Results
// -----------------------------------------------------
function displayOrphanedResults( variations, $button ) {

	let $results;
	if ( $('.acex-orphaned-results').length ) {
		$results = $('.acex-orphaned-results');
		$results.empty();
	} else {
		$results = $('<div class="acex-orphaned-results" style="margin-top:20px;"></div>');
		$results.insertAfter( $button );
	}

	$button.remove()

	if ( ! variations || variations.length === 0 ) {
		$results.html('<p>No orphaned variations found.</p>');
		return;
	}

	
	$button = $('<button type="button" class="actus-btn actus-btn-primary">Delete orphaned variations</button>');
	$button.on('click', () => deleteOrphaned(variations, $button, $results));

	$results.html(`<h3>${variations.length} orphaned variations found.</h3>`);
	$results.append( $button );


	const $list = $('<ul class="acex-orphaned-list">');
	variations.forEach(variation => {
		$list.append(`<li><span>${variation.ID}</span> - ${decodeHtmlEntities(variation.post_title || variation.post_name)}</li>`);
	});
	$results.append($list);

}








// MARK: Delete Orphaned Variations
// -----------------------------------------------------
async function deleteOrphaned( variations, $button, $results ) {

	const confirmed = await Modal.confirm(`Are you sure you want to delete ${variations.length} orphaned variations? This action cannot be undone.`);
	if (!confirmed) {
		return;
	}
	$button.prop('disabled', true).html( DATA.SVG.loader );

	const variationIDs = variations.map(v => v.ID);

	$.ajax({
		url: acex_phpDATA.ajax_url,
		type: 'POST',
		data: {
			action: 'acex_delete_orphaned',
			nonce: acex_phpDATA?.nonce,
			variation_ids: variationIDs
		},
		success: (response) => {
			//console.log('Orphaned variations deleted:', response.data);
			$results.html(`<h3>${response.data.deleted_ids.length} orphaned variations deleted.</h3>`);
		},
		complete: () => {
			$button.remove();
		}
	});
}





`1`


// MARK: Decode HTML
// -----------------------------
function decodeHtmlEntities(text) {
	if (!text || typeof text !== 'string') return text;

	try {
		return decodeURIComponent(text);
	} catch {
		return text; // return as-is if not encoded
	}
	
}

