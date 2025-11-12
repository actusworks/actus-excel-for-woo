/**
 * Class responsible for validating imported product data in Actus Excel for WooCommerce.
 * Handles validation of product fields, collects validation errors, and provides
 * normalization utilities for specific field types.
 *
 * @class
 * @classdesc
 * The ImportValidation class provides methods to validate an array of product objects,
 * check for required fields, validate data types, and normalize boolean values.
 * Validation results are collected and can be used to display errors in a modal dialog.
 */
// -----------------------------------------------------
import {
	ajax_getData,
	productsValidation,
} from './helpers.js';
// -----------------------------------------------------
const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};












// MARK: CLASS
// -----------------------------------------------------
class ImportValidation {

	constructor() {

		this.ignore = false
		this.products 	= [];
		this.keys	 	= [];
		this.modal 		= null;
		this.validationResults = [];

	}



	// MARK: Validate Products
	// -----------------------------------------------------
	async validate( products, keys, ignore ) {
		this.ignore = ignore;
		this.products = products || [];
		this.keys = keys || [];
		this.validationResults = [];

		let productsToValidate = JSON.parse( JSON.stringify( this.products ) );

		// Check for presence of 'id' or 'sku' fields
		if ( ! this.keys.includes('id') && ! this.keys.includes('sku') ) {

			this.validationResults.push({
				warnings: [
					'There is no <strong>"id"</strong> or <strong>"sku"</strong> field in the imported data.<br>New products will be created for all rows.'
				]
			});

		}



		// Validate variations with missing parents

		if ( this.keys.includes('id') ) {
			let variationsWithMissingParent = productsToValidate.filter( p => 
				p.type === 'variation' && p.parent_id && 
				! productsToValidate.find( pp => pp.id && pp.id === p.parent_id )
			);
			if ( variationsWithMissingParent.length > 0 ) {
				this.validationResults.push({
					warnings: [`
						There are <strong>${variationsWithMissingParent.length}</strong> variations with missing parent IDs.<br>
						These variations will be ignored during import.
					`]
				});
			}
			productsToValidate = productsToValidate.filter( p => 
				!( p.type === 'variation' && p.parent_id && 
				! productsToValidate.find( pp => pp.id && pp.id === p.parent_id ) )
			);


		} else {

			let variable = productsToValidate.filter( p => p.type === 'variable' );
			let variations = productsToValidate.filter( p => p.type === 'variation' );
			if ( variations.length > 0 ) {
				this.validationResults.push({
					warnings: [`
						There are <strong>${variable.length}</strong> variable products with <strong>${variations.length}</strong> variations and no <strong>ID</strong> column.<br>
						Variations cannot be created without a parent <strong>ID</strong> and will be ignored.
					`]
				});
				productsToValidate = productsToValidate.filter( p => p.type !== 'variation' );
			}

		}




		let ajaxResult = await this.validateAJAX( productsToValidate, this.keys )
		this.validationResults.push({ ajax: ajaxResult });

		//console.log('AJAX Result:', ajaxResult );


		this.products = productsToValidate;


		/*
		if ( ajaxResult.missing_both ) {
			this.validationResults.push({
				warnings: [
					`There are ${ajaxResult.missing_both} products missing both <strong>"id"</strong> and <strong>"sku"</strong> fields.<br>New products will be created for these rows.`
				]
			});
		}
		*/




		// Perform validation for each product
		let taxonomiesValidation = {}
		for ( let key in DATA.data_taxonomies ) {
			taxonomiesValidation[`existing_${key}`] = [];
			taxonomiesValidation[`missing_${key}`] = [];
		}
		let attributesValidation = {
			all_attributes: [],
			all_values: {},
			missing_attributes: [],
			missing_values: {}
		};
		let HTML = '';
		for (const product of this.products) {
			const errors = this.validateProduct(product);
			if (errors.length > 0) {
				this.validationResults.push({
					product: product,
					errors: errors
				});
			}
			taxonomiesValidation = await this.validateProductTaxonomies(taxonomiesValidation, product, keys);
			attributesValidation = await this.validateProductAttributes(attributesValidation, product, keys);
		}

		taxonomiesValidation.html = ''
		for ( let key in taxonomiesValidation ) {
			if ( key.startsWith('missing_') ) {
				let current = taxonomiesValidation[key];
				key = key.replace('missing_', '');
				if ( current.length > 0 ) {
					taxonomiesValidation.html += `
					<div class="acex-field acex-field-${key} actus-flex">
						<h3>${current.length} Missing ${DATA.data_taxonomies[key].label}</h3>
						<label>
							<input type="radio" value="create" class="acex-input" name="acex-missing-${key}" checked />
							Create
						</label>
						<label>
							<input type="radio" value="skip" class="acex-input" name="acex-missing-${key}" />
							Skip
						</label>
					</div>`
				}
			}
		}


//console.log('------------- RESULT ATTRIBUTES:', HTML );


		this.validationResults.push({
			type: 'taxonomies',
			taxonomies: taxonomiesValidation
		});
		this.validationResults.push({
			type: 'attributes',
			attributes: attributesValidation
		});


		return this.validationResults;
	}




	// MARK: Validate Attributes
	// -----------------------------------------------------
	async validateProductAttributes( attributesValidation, product, keys ) {
		const result = attributesValidation

		
		if ( keys.includes('attributes') && product.attributes ) {
			await ajax_getData('attributes_terms');
			const attributes = product.attributes;
			try {
				const parsed = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;
				const attrArray = Array.isArray(parsed)
					? parsed
					: typeof parsed === 'object'
						? Object.entries(parsed).map(([name, options]) => ({ name, options }))
						: [];

				attrArray.forEach(attrObj => {
					let attrKey = attrObj.slug || attrObj.name || attrObj.id;
					const values = Array.isArray(attrObj.options)
						? attrObj.options
						: String(attrObj.options).split(/,|\n/).map(v => v.trim()).filter(Boolean);

					// Add to all_attributes array if not already present
					if (!result.all_attributes.includes(attrKey)) {
						result.all_attributes.push(attrKey);
					}
					
					// Initialize array if it doesn't exist
					if (!result.all_values[attrKey]) {
						result.all_values[attrKey] = [];
					}
					
					// Add values to array if they don't already exist
					values.forEach(val => {
						if (!result.all_values[attrKey].includes(val)) {
							result.all_values[attrKey].push(val);
						}
					});

					// Find attribute by name, label, or id in the object structure
					attrKey = attrKey.startsWith('pa_') ? attrKey.slice(3) : attrKey;
					const exists = Object.values(DATA.product_attributes_terms || {})
						.find(a => a.attribute_name === attrKey );
					

					if (!exists) {
						// Add to missing_attributes array if not already present
						if (!result.missing_attributes.includes(attrKey)) {
							result.missing_attributes.push(attrKey);
						}
						// If attribute doesn't exist, all its values are missing
						if (!result.missing_values[attrKey]) {
							result.missing_values[attrKey] = [];
						}
						values.forEach(val => {
							if (!result.missing_values[attrKey].includes(val)) {
								result.missing_values[attrKey].push(val);
							}
						});
					} else {
						// Check if values exist in the attribute's options
						values.forEach(val => {
							const valLower = String(val).toLowerCase().trim();
							// Check against options array (slugs) and terms (name and slug)
							const valueExists = exists.options.includes(valLower) || 
								(exists.terms && exists.terms.some(term => 
									term.slug === valLower || 
									term.name.toLowerCase() === valLower
								));
							
							if (!valueExists) {
								// Initialize array if it doesn't exist
								if (!result.missing_values[attrKey]) {
									result.missing_values[attrKey] = [];
								}
								// Add value to array if it doesn't already exist
								if (!result.missing_values[attrKey].includes(val)) {
									result.missing_values[attrKey].push(val);
								}
							}
						});
					}
				});
			} catch (e) {
				console.error('Error parsing attributes JSON:', e);
				//result.html += `<div class="acex-error">Attributes field is not valid JSON: ${e.message}</div>`;
			}

			let missing_value_count = 0
			if ( Object.keys(result.missing_values).length > 0 ) {
				Object.keys(result.missing_values).forEach( attrKey => {
					missing_value_count += result.missing_values[ attrKey ].length
				});
			}
//console.log('--- missing_value_count:', missing_value_count );
			if ( result.missing_attributes.length > 0 || missing_value_count > 0 ) {
				result.html = '';
				result.html += `
				<div class="acex-field acex-field-attributes actus-flex">
					<h3>`
					
				if ( result.missing_attributes.length > 0 )
					result.html += `${result.missing_attributes.length} Missing Attributes`
				
				if ( missing_value_count > 0 ) {
					if ( result.missing_attributes.length > 0 )
						result.html += ' &amp;<br>'
					result.html += `${missing_value_count} Missing Attribute Values`
				}
				
				result.html += `
					</h3>
					<label>
						<input type="radio" value="create" class="acex-input" name="acex-missing-attributes" checked />
						Create
					</label>
					<label>
						<input type="radio" value="skip" class="acex-input" name="acex-missing-attributes" />
						Skip
					</label>
				</div>`
			}

		}
		return result;

	}


	// MARK: Validate Taxonomies
	// -----------------------------------------------------
	async validateProductTaxonomies( taxonomiesValidation, product, keys ) {
		const result = JSON.parse(JSON.stringify(taxonomiesValidation));
		result.html = '';

		
		for ( let key in DATA.data_taxonomies ) {
			if ( keys.includes( key ) && product[ key ] ) {
				const currentTax = DATA.data_taxonomies[ key ];
				const terms = Array.isArray(product[ key ])
					? product[ key ]
					: String(product[ key ]).split(/,|\n/).map(v => v.trim()).filter(v => v.length > 0);

					
				await ajax_getData( key );

				terms.forEach((term, index) => {
					let termSlug = typeof term === 'string' ? this.decodeHtmlEntities(term) : this.decodeHtmlEntities(term.slug);


					if ( result[`existing_${key}`].includes( termSlug ) ||
						result[`missing_${key}`].includes( termSlug )
					) {
						return; // Already checked
					}

						
					// Check if term exists
					const exists = DATA[`product_${key}`].find(c => 
						this.decodeHtmlEntities(c.slug) === termSlug || c.id === term || c.term_id === term
					);
					if (!exists) {
						result[`missing_${key}`].push( termSlug );
					} else {
						result[`existing_${key}`].push( termSlug );
					}
					
				})
			}
		}


		result.html = result.html || taxonomiesValidation.html

		return result;


	}





	// MARK: Single Product Validation
	// -----------------------------------------------------
	validateProduct( product ) {
		const errors = [];

		// Example validation: Check if product name is empty
		if ( ! product.id && ! product.sku ) {
			//errors.push('Product ID and SKU are missing. A new product will be created.');
		}

		// Example validation: Check if product name is empty
		if ( this.existInProduct( 'name', product ) && ! product.name  ) {
			errors.push('Product name cannot be empty.');
		}
		// Example validation: Check if price is a valid number
		if ( this.existInProduct( 'price', product ) && 
			 product.price !== '' && isNaN( product.price ) ) {
			errors.push('Price must be a valid number.');
		}


		Object.keys( DATA.data_props ).forEach( ( fieldKey ) => {
			const field = DATA.data_props[ fieldKey ];
			const type = field.type;

			// Skip if product does not have this field
			if ( ! this.existInProduct( fieldKey, product )) {
				return;
			}
			const value = product[ fieldKey ];
			

			if (
				product.type === 'variation' &&
				DATA.data_mustBeInherited.includes(fieldKey)
			) {
				return;
			}
//console.log('--- field:', field, type, value );

			if ( type === 'boolean' ) {
				const result = this.normalizeBoolean( value, fieldKey );

				if ( result.error ) {
					errors.push( result.message );
				} else {
					product[ fieldKey ] = result;
				}
			}

			if ( type === 'int' || type === 'float' ) {
				const result = this.validateNumeric( value, fieldKey, { allowEmpty: field.allow_empty } );
				if ( result.error ) {
					errors.push( result.message );
				} else {
					product[ fieldKey ] = result;
				}
			}


			if (type === 'array' || type === 'comma-separated') {
				const result = this.validateArrayField(value, fieldKey);
				if (result.error) {
					errors.push(...result.messages);
				} else {
					product[fieldKey] = result;
				}
			}


			if ( fieldKey === 'type' ) {
				const result = this.validateProductType( product );
				if ( result.error ) {
					errors.push( result.message );
				} else {
					product[ fieldKey ] = result.type;
				}
			}



		});



		return errors;
	}





	// Check Key in Product
	// -----------------------------------------------------
	existInProduct( key, product ) {
		return Object.prototype.hasOwnProperty.call( product, key );
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



	// MARK: Normalize Boolean
	// -----------------------------------------------------
	normalizeBoolean(value, fieldKey) {
		if (typeof value === 'boolean') return value ? true : '';
		if (typeof value === 'number') return value !== 0 ? true : '';

		const str = String(value).toLowerCase().trim();

		// True values
		if (['true', '1', 'yes', 'on'].includes(str)) return true;

		// False values
		if (['false', '0', 'no', 'off', ''].includes(str)) return '';


		if ( this.ignore ) return '';

		return {
			error: true,
			message: `Invalid boolean value "${value}" for field "${fieldKey}". Use: true/false, 1/0, yes/no`
		};
	}





	// MARK: Validate Numeric
	// -----------------------------------------------------
	validateNumeric(value, fieldKey, options = {}) {
		if (value === null || value === '') {
			return options.allowEmpty ? null : {
				error: true,
				message: `${fieldKey} cannot be empty`
			};
		}

		const num = parseFloat(value);

		if (isNaN(num)) {
			if ( this.ignore ) return 0;
			return {
				error: true,
				message: `${fieldKey} must be a valid number, got "${value}"`
			};
		}

		// Validate ranges
		if (options.min !== undefined && num < options.min) {
			if ( this.ignore ) return 0;
			return {
				error: true,
				message: `${fieldKey} must be >= ${options.min}, got ${num}`
			};
		}

		if (options.max !== undefined && num > options.max) {
			if ( this.ignore ) return 0;
			return {
				error: true,
				message: `${fieldKey} must be <= ${options.max}, got ${num}`
			};
		}

		// For prices, warn about negatives
		if (['price', 'regular_price', 'sale_price'].includes(fieldKey) && num < 0) {
			return {
				value: num,
				warning: `${fieldKey} is negative (${num}). This may cause display issues.`
			};
		}

		return num;
	}




	// MARK: Validate Array Field
	// -----------------------------------------------------
	validateArrayField(value, fieldKey, expectedType = 'string') {
		if (!value) return [];
		if (Array.isArray(value) && value.length === 0) return [];
		//console.log(1, fieldKey, '---', value);

		let arr;

		// Parse if string
		if (typeof value === 'string') {
			arr = value.split(/,|\n/).map(v => v.trim()).filter(v => v.length > 0);
		} else if (Array.isArray(value)) {
			arr = value;
		} else {
			arr = [value];
		}

		// Validate each element
		const validated = arr.map((item, index) => {
			if (expectedType === 'number') {
				const num = parseInt(item);
				if (isNaN(num)) {
					return {
						error: true,
						message: `${fieldKey}[${index}]: "${item}" is not a valid number`
					};
				}
				return num;
			}
			return String(item).trim();
		});

		// Check for errors
		const errors = validated.filter(v => v && v.error);
		if (errors.length > 0) {
			return { error: true, messages: errors.map(e => e.message) };
		}

		//console.log(2, fieldKey, '---', validated);
		return validated;
	}



		
	// MARK: Validate Product Type
	// -----------------------------------------------------
	validateProductType(product) {
		const VALID_PRODUCT_TYPES = ['simple', 'variable', 'grouped', 'external', 'variation'];
		const type = product.type || 'simple';

		if (!VALID_PRODUCT_TYPES.includes(type)) {
			return {
				error: true,
				message: `Invalid product type "${type}". Must be one of: ${VALID_PRODUCT_TYPES.join(', ')}`,
				type: type
			};
		}

		// Type-specific validations
		if (type === 'external') {
			if (!product.product_url) {
				return {
					error: true,
					message: 'External products must have a product_url',
					type: type
				};
			}
		}

		if (type === 'variable') {
			if (!product.attributes || !Array.isArray(product.attributes) || product.attributes.length === 0) {
				return {
					warning: true,
					message: 'Variable product has no attributes. Variations cannot be created.',
					type: type
				};
			}
		}

		if (type === 'grouped') {
			if (!product.grouped_products || !Array.isArray(product.grouped_products)) {
				return {
					warning: true,
					message: 'Grouped product has no children products defined.',
					type: type
				};
			}
		}

		if (type === 'variation') {
			if (!product.parent_id) {
				return {
					error: true,
					message: 'Variation products must have a parent_id',
					type: type
				};
			}
		}

		return { type: type };
	}

	






	// MARK: Validate SKU
	// -----------------------------------------------------
	validateSku(sku, productId = 0) {
		if (!sku || sku === '') {
			return { valid: true }; // SKU is optional
		}

		sku = String(sku).trim();

		// Simulate wc_get_product_id_by_sku with a lookup (replace with actual implementation)
		const existingId = this.getProductIdBySku(sku);

		// SKU exists for a different product
		if (existingId && existingId !== productId) {
			return {
				valid: false,
				error: true,
				message: `SKU "${sku}" already exists for product ID ${existingId}. Please use a unique SKU or remove it to auto-generate.`
			};
		}

		return { valid: true, sku };
	}


	// Dummy implementation, replace with actual SKU lookup logic
	getProductIdBySku(sku) {
		// Example: Search in this.products for matching SKU
		const found = this.products.find(p => p.sku === sku);
		return found ? found.id : null;
	}













	






	// MARK: Validate Products AJAX
	// -----------------------------------------------------
	async validateAJAX( products, keys ) {
		const validationResults = await productsValidation( products, keys.join(',') );

		return validationResults

	}







}






export default new ImportValidation();