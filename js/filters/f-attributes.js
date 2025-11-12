import {
	ajax_getData,
} from '../helpers.js';
// -----------------------------------------------------





const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
// -----------------------------------------------------








// MARK: Attributes Filter
// -----------------------------------------------------
export default async function attributesFilter( query, target, attributes ) {

	let attrHTML = ''
	let hasValues = false;

	
	await ajax_getData('attributes');
	attributes = DATA.product_attributes || [];
	
	attributes.forEach(attr => {
		let termsHTML = '';
		if (attr.terms && attr.terms.length) {
			//const attributeName = 'pa_' + attr.attribute_name;
			const attributeName = attr.attribute_name;
			termsHTML = `
				<div class="acex-attribute-terms">
					${attr.terms.map(term => {
						const isSelected = query.attributes?.[attributeName]?.includes(String(term.term_id)) ? 'actus-selected' : '';
						if (isSelected) hasValues = true;
						return `<div class="actus-tag actus-small acex-attribute-term ${isSelected}" data-id="${term.term_id}">${term.name}</div>`;
					}).join('')}
				</div>
			`;
		}
		attrHTML += `
			<div class="acex-attribute" data-id="${attr.attribute_id}">
				<label>${attr.attribute_label}</label>
				${termsHTML}
			</div>
		`;
	});

	// Attributes Filter
	const $attrFilter = $(`
		<div class="acex-filter acex-premium ${hasValues ? 'actus-open' : ''}">
			<h3>Attributes<span>${DATA.SVG.caret}</span></h3>
			<div class="acex-filter-body">
				<div class="acex-filter-attributes">
					${ attrHTML }
				</div>
			</div>
		</div>
	`);
	target.append($attrFilter);

	$('body').off('click.acex-select-products', '.acex-attribute-term')
	$('body').on('click.acex-select-products', '.acex-attribute-term', (e) => {
		const $term = $(e.currentTarget);
		const termId = $term.attr('data-id');
		const $attribute = $term.closest('.acex-attribute');
		//const attributeName = 'pa_' + $attribute.find('label').text();
		const attributeName = $attribute.find('label').text();

		if ($term.hasClass('actus-selected')) {
			$term.removeClass('actus-selected');
			query.attributes = query.attributes || {};
			query.attributes[attributeName] = query.attributes[attributeName].filter(id => id !== termId);
			if ( query.attributes[attributeName].length == 0 ) {
				delete query.attributes[attributeName];
			}
		} else {
			$term.addClass('actus-selected');
			query.attributes = query.attributes || {};
			query.attributes[attributeName] = query.attributes[attributeName] || [];
			query.attributes[attributeName].push(termId);
		}
		if ( query.attributes && Object.keys(query.attributes).length == 0 ) {
			delete query.attributes;
		}

		
		$('body').trigger('acex::filter-changed-query', [query, $el]);
		
	});

}







