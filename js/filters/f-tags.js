




const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
// -----------------------------------------------------








// MARK: Tags Filter
// -----------------------------------------------------
export default function tagsFilter( query, target, tags ) {

	const hasValues = !!(query.tags && query.tags.length > 0);

	// Tags Filter
	const $tagFilter = $(`
		<div class="acex-filter acex-premium ${hasValues ? 'actus-open' : ''}">
			<h3>Tags<span>${DATA.SVG.caret}</span></h3>
			<div class="acex-filter-body">
				<div class="acex-filter-tags">
					${ tags.map(tag => {
						const isSelected = query.tags?.includes(String(tag.slug)) ? 'actus-selected' : '';
						return `<div class="actus-tag ${isSelected}" data-id="${tag.term_id}" data-slug="${tag.slug}">${tag.name}</div>`;
					}).join('') }
				</div>
			</div>
		</div>
	`);
	target.append($tagFilter);

	$('body').off('click.acex-select-products', '.acex-filter-tags .actus-tag')
	$('body').on('click.acex-select-products', '.acex-filter-tags .actus-tag', (e) => {
		const $el = $(e.currentTarget);
		const val = decodeURIComponent($el.attr('data-slug'));
		const name = 'tags';

		$('body').trigger('acex::filter-changed', [name, val, $el]);
	});

}




