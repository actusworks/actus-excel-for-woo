


const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}





// MARK: Get Data
/**
 * Get data from the server by name
 * @param {string} name - The data name
 * @returns {Promise<any|null>} Promise resolving to data on success, or null on failure
 */
export async function ajax_getData( name ) {
	if ( ! name ) {
		console.error('Name is required');
		return null;
	}

	if ( DATA[ 'product_' + name ] ) {
		return DATA[ 'product_' + name ];
	}

	
	try {
		const formData = new FormData();
		formData.append('action', 'acex_get_data');
		formData.append('name', name);
		formData.append('nonce', acex_phpDATA?.nonce || '');

		const response = await fetch(acex_phpDATA.ajax_url, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		if (data.success) {
			DATA[ 'product_' + name ] = data.data;
			return DATA[ 'product_' + name ];
		} else {
			console.error('Error from server:', data.data?.message || 'Unknown error');
			return [];
		}

	} catch (error) {
		console.error(`Error fetching data for '${name}':`, error);
		throw error;
	}
}






// MARK: Get Option
/**
 * Get a plugin option value
 * Makes an AJAX call to the PHP backend function
 * @param {string} name - The option name
 * @returns {Promise<any|null>} Promise resolving to option value on success, or null on failure
 */
export async function ajax_getOption( name ) {
	if ( ! name ) {
		console.error('Option name is required');
		return null;
	}

	try {
		const formData = new FormData();
		formData.append('action', 'acex_get_option');
		formData.append('name', name);
		formData.append('nonce', acex_phpDATA?.nonce || '');

		const response = await fetch(acex_phpDATA.ajax_url, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		if (data.success) {
			return data.data.options;
		} else {
			console.error('Error from server:', data.data?.message || 'Unknown error');
			return null;
		}

	} catch (error) {
		console.error(`Error loading option '${name}':`, error);
		throw error;
	}
}




// MARK: Save Option
/**
 * Save a plugin option value
 * Makes an AJAX call to the PHP backend function
 * @param {string} name - The option name
 * @param {any} value - The option value (can be any type)
 * @returns {Promise<any|null>} Promise resolving to saved value on success, or null on failure
 */
export async function ajax_saveOption( name, value ) {
	if ( ! name ) {
		console.error('Option name is required');
		return null;
	}

	try {
		const formData = new FormData();
		formData.append('action', 'acex_save_option');
		formData.append('name', name);
		formData.append('value', JSON.stringify(value));
		formData.append('nonce', acex_phpDATA?.nonce || '');
//console.log('Saving option', name, value );
		const response = await fetch(acex_phpDATA.ajax_url, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		if (data.success) {
			return data.data;
		} else {
			console.error('Error from server:', data.data?.message || 'Unknown error', data.data);
			return null;
		}

	} catch (error) {
		console.error(`Error saving option '${name}':`, error);
		throw error;
	}
}






// MARK: Product That Has
/**
 * Get the newest product that has a value for the specified property
 * Makes an AJAX call to the PHP backend function
 * @param {string} property - The property to check for (e.g., 'images', 'description', 'price', 'sku')
 * @param {Object} options - Optional parameters
 * @param {string} options.status - Product status (default: 'publish')
 * @returns {Promise<Object|null>} Promise resolving to {product_id, property_value}, or null if none found
 */
export async function ajax_getProductThatHas( property, options = {} ) {
	const defaults = {
		status: 'publish'
	};
	
	const settings = { ...defaults, ...options };
	
	try {
		const formData = new FormData();
		formData.append('action', 'acex_get_product_that_has');
		formData.append('property', property);
		formData.append('args', JSON.stringify(settings));
		formData.append('nonce', acex_phpDATA?.nonce || '');
		
		const response = await fetch(acex_phpDATA.ajax_url, {
			method: 'POST',
			body: formData
		});
		
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const data = await response.json();
		if (data.success) {
			return data.data;
		} else {
			console.error('Error from server:', data.data?.message || 'Unknown error', data.data?.property, data.data?.result);
			return null;
		}
		
	} catch (error) {
		console.error(`Error fetching product with property '${property}':`, error);
		throw error;
	}
}






// MARK: Get Preview
/**
 * Get preview products for template preview
 * Makes an AJAX call to the PHP backend function
 * @param {number} count - Number of products to fetch (default: 3)
 * @returns {Promise<Array|null>} Promise resolving to array of products, or null if none found
 */
export async function ajax_getPreviewProducts( count = 3 ) {
	if ( ! count ) return null;

	try {
		const formData = new FormData();
		formData.append('action', 'acex_get_preview_products');
		formData.append('count', count);
		formData.append('nonce', acex_phpDATA?.nonce || '');

		const response = await fetch(acex_phpDATA.ajax_url, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		if (data.success) {
			return data.data.products;
		} else {
			console.error('Error from server:', data.data?.message || 'Unknown error');
			return null;
		}

	} catch (error) {
		console.error(`Error fetching preview products:`, error);
		throw error;
	}
}





// MARK: Taxonomies
/**
 * Create taxonomies (categories, tags, attributes) in bulk
 * @param {Object} data - The data to create taxonomies
 * @returns {Promise<Object|null>} Promise resolving to the created taxonomy data, or null on failure
 */
export async function ajax_createTaxonomies( _data ) {
	if ( ! _data || typeof _data !== 'object' ) {
		return null;
	}

	try {
		const formData = new FormData();
		formData.append('action', 'acex_create_taxonomies');
		formData.append('data', JSON.stringify(_data));
		formData.append('nonce', acex_phpDATA?.nonce || '');
		
		const response = await fetch(acex_phpDATA.ajax_url, {
			method: 'POST',
			body: formData
		});
		
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const data = await response.json();

		if (data.success) {
			//console.log(data.data);
			return data.data;
		} else {
			console.error('Error from server:', data.data?.message || 'Unknown error');
			return data.data;
		}
		
	} catch (error) {
		console.error('Error saving full product data:', error);
		throw error;
	}


}





// MARK: Save Multiple
/**
 * Save multiple products with automatic chunking for large datasets
 * @param {Array} products - Array of product data objects
 * @param {Object} options - Options object
 * @param {number} options.chunkSize - Products per batch (default: 50)
 * @param {Function} options.onProgress - Progress callback (current, total, chunkResults)
 * @param {boolean} options.sequential - Process chunks sequentially (default: true)
 * @returns {Promise<Object>} Promise resolving to aggregated results
 */
export async function ajax_saveMultipleProducts( products, options = {} ) {
    const { chunkSize = 50, onProgress, _data } = options;
    
    if ( ! products || ! Array.isArray(products) || products.length === 0 ) {
        console.error('Products must be a non-empty array');
        return null;
    }

    // For small batches, send directly without chunking
    if ( products.length <= chunkSize ) {
        return await saveBatch( products, _data );
    }

    // Split into chunks for large batches
    const chunks = [];
    for (let i = 0; i < products.length; i += chunkSize) {
        chunks.push(products.slice(i, i + chunkSize));
    }
    
    const allResults = {
        success: true,
        total: products.length,
        successful: 0,
        failed: 0,
        warnings: 0,
		created: 0,
		updated: 0,
        results: []
    };

    // Process chunks sequentially to avoid overwhelming the server
    for (let i = 0; i < chunks.length; i++) {
        try {
            const chunkResult = await saveBatch(chunks[i], _data);
            
            if (chunkResult && chunkResult.success) {
                allResults.successful += chunkResult.successful;
                allResults.failed += chunkResult.failed;
                allResults.created += chunkResult.created;
                allResults.updated += chunkResult.updated;
                allResults.results.push(...chunkResult.results);
                
                // Count warnings
                const warningCount = chunkResult.results.filter(r => r.warnings && r.warnings.length > 0).length;
                allResults.warnings += warningCount;
            } else {
                allResults.failed += chunks[i].length;
            }
            
            // Call progress callback
            if (onProgress) {
                const processed = (i + 1) * chunkSize;
				//console.log('onProgress 2 - ', processed)
				//console.log('onProgress 3 - ', chunkResult)
                onProgress(
                    Math.min(processed, products.length), 
                    products.length,
                    chunkResult
                );
            }
            
        } catch (error) {
            console.error(`Error processing chunk ${i + 1}:`, error);
            allResults.failed += chunks[i].length;
        }
    }

    //console.log(`Save completed: ${allResults.successful} success, ${allResults.failed} failed, ${allResults.warnings} warnings`);
    return allResults;
}




// MARK: Save Batch
/**
 * Internal function to save a batch of products via AJAX
 * @param {Array} products - Array of product data objects
 * @returns {Promise<Object>} Promise resolving to batch results
 */
async function saveBatch( products, _data ) {
    try {
        const formData = new FormData();
        formData.append('action', 'acex_save_multiple_products');
        formData.append('products_data', JSON.stringify(products));
        formData.append('_data', JSON.stringify(_data));
        formData.append('nonce', acex_phpDATA?.nonce || '');
        
        const response = await fetch(acex_phpDATA.ajax_url, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.success) {
            const summary = data.data.summary;
            
            return {
                success: true,
                total: summary.total,
                successful: summary.successful,
                failed: summary.failed,
                created: summary.created,
                updated: summary.updated,
                results: data.data.results
            };
        } else {
            console.error('Error from server:', data.data?.message || 'Unknown error');
            return {
                success: false,
                total: products.length,
                successful: 0,
                failed: products.length,
                results: [{
					error: true,
					message: data.data?.message || 'Unknown error',
				}]
            };
        }
        
    } catch (error) {
        console.error('Error saving batch:', error);
        throw error;
    }
}










// MARK: QUERY
/**
 * Get count of products matching a query
 * @param {Object} query - Query object with filters (categories, tags, etc.)
 * @returns {Promise<number|null>} Promise resolving to product count or null on failure
 */
export async function productQuery( _query, countOnly = false, limit = 20, page = 1, images = false ) {
	if ( ! _query || typeof _query !== 'object' ) {
		console.error('Query must be an object');
		return null;
	}
	let query = JSON.parse(JSON.stringify(_query)); // Deep copy to avoid mutation
	delete query.description;
//console.log('QUERY ***********************', query)
	try {
		if ( ! images ) images = ''
		const formData = new FormData();
		formData.append('action', 'acex_query');
		formData.append('limit', limit);
		formData.append('page', page);
		formData.append('images', images);
		formData.append('query', JSON.stringify(query));
		formData.append('nonce', acex_phpDATA?.nonce || '');
		if ( countOnly ) formData.append('count', countOnly);

		const response = await fetch(acex_phpDATA.ajax_url, {
			method: 'POST',
			body: formData
		});
		

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const data = await response.json();
		//console.log('Query response ---------', data.data);
		//if ( data.data.query_args )
			//console.log('Query args -------------', data.data.query_args);
		//else
			//console.log('Query count ------------', data.data.query);

		if (data.success) {

			if ( countOnly ) {
				return data.data.count;
			} else {
				return data.data;
			}
		} else {
			console.log('data', data);
			console.error('Error from server:', data.data?.message || 'Unknown error');
			return null;
		}
		
	} catch (error) {
		console.error('Error getting product count:', error);
		throw error;
	}
}






// MARK: Validation
/**
 * Validate products before import
 * @param {Array} products - Array of product objects to validate
 * @param {Object} modal - Modal object for displaying validation results
 * @returns {Promise<Array|null>} Promise resolving to an array of validation results or null on failure
 */
export async function productsValidation( products, keys ) {

	try {
		const formData = new FormData();
		formData.append('action', 'acex_validate_import');
		formData.append('products', JSON.stringify(products));
		formData.append('keys', keys);
		formData.append('nonce', acex_phpDATA?.nonce || '');

		const response = await fetch(acex_phpDATA.ajax_url, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
//console.log('productsValidation Validation data', data);
		if (data.success) {
			//console.log('Validation Response:', data);
			return data.data || [];
		} else {
			console.error('Error from server:', data.data?.message || 'Unknown error');
			return null;
		}

	} catch (error) {
		console.error('Error validating products:', error);
		throw error;
	}
}










// MARK: Log
let LOGS = []
export function log( ...args ) {
	console.groupCollapsed( '%c          ', 'background: #60a3daff; padding: 2px 4px;', ...args );
	let stackLines = logStack()
	console.groupEnd();

	LOGS.push( [...args, ...stackLines] );
	window.LOGS = LOGS;
}
export function logg( tag, ...args ) {
	const hiddenTags = [
		'check',
		'export',
	]
	let stackLines = logStack(true)
	if ( ! hiddenTags.includes( tag ) ) {
		console.groupCollapsed( '%c'+tag.padStart(10), 'background: darkorange; color: white; padding: 2px 4px;', ...args );
		stackLines = logStack()
		console.groupEnd();
	}

	LOGS.push( ['[' + tag + ']', ...args, ...stackLines] );
	window.LOGS = LOGS;
}
function logStack(silent=false){
	
	const stack = new Error().stack;
	const lines = stack.split('\n');
	let stackLines = []

	let stackLinesHTML = ''
	// Skip first line (Error message) and second line (this function)
	const relevantStack = lines.slice(3);
	//console.log('Full stack trace:');
	relevantStack.forEach((line, index) => {
		if (line.includes('load-scripts.php')) return;
		if (line.includes('jquery.min.js')) return;
			
		const match = line.match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/);
		if (match) {
			let [full, functionName, fileName, lineNumber, columnNumber] = match;
			
			let fileNameShort = fileName.split('actus-excel-for-woo').pop();
			functionName = functionName.replace('HTMLDivElement.', '');
			if ( ! silent ) console.log(`${functionName} ${fileName}:${lineNumber}`);
			functionName = functionName.padEnd(30, '.');
			stackLines.push(functionName + `${fileNameShort}:${lineNumber}`);
			stackLinesHTML += functionName + `${fileNameShort}:${lineNumber}\n`
		}
		//stackLines.push( line.trim().split(' (')[1] || line.trim() );
		//console.log(`  ${index + 1}: ${line.trim()}`);
	});

	return stackLines
}












