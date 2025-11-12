import GoogleSheets from './google-sheets.js';
import ImportSheet 	from './import-sheet.js';
import Modal 		from './Modal.js';
// -----------------------------------------------------













const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
const { __ } = wp.i18n;
// -----------------------------------------------------




class History {

	constructor() {
		this.history = [];
		this.$target = null;
		this.$historyFilters = null;
		this.$historyList = null;
	}




	// MARK: Init
	// -----------------------------------------------------
	init( target ) {

		this.$target = target;
		this.$target.empty();
		
		// Create filter tabs
		this.$historyContainer = $('<div class="acex-history-container">').appendTo(this.$target);
		this.$historyFilters = $('<div class="acex-history-filters">').appendTo(this.$historyContainer);
		
		const filterButtons = [
			{ type: '', label: 'All' },
			{ type: 'import', label: 'Imports' },
			{ type: 'export', label: 'Exports' }
		];
		
		filterButtons.forEach(btn => {
			const $btn = $('<button class="acex-filter-btn actus-btn actus-btn-secondary">')
				.text(btn.label)
				.data('type', btn.type)
				.appendTo(this.$historyFilters);
			
			if (btn.type === '') $btn.addClass('actus-btn-primary');
			
			$btn.on('click', (e) => {
				this.$historyFilters.find('.acex-filter-btn').removeClass('actus-btn-primary');
				$(e.currentTarget).addClass('actus-btn-primary');
				this.render(btn.type);
			});
		});
		

		// Load initial history
		this.render();
	}




	// MARK: Load History
	// -----------------------------------------------------
	load(actionType = '', offset = 0) {
		return new Promise( (resolve, reject) => {
			$.ajax({
				url: ajaxurl,
				method: 'POST',
				data: {
					action: 'acex_get_history',
					nonce: DATA.nonce,
					action_type: actionType,
					limit: 20,
					offset: offset
				},
				success: (response) => {
					
					if (response.success) {
						resolve( response.data );
						//this.render(response.data.records, response.data.total, actionType, offset);
					} else {
						resolve({ error: true })
					}
				},
				error: () => {
					resolve({ error: true })
				}
			});
		});
	}




	// MARK: Render History
	// -----------------------------------------------------
	async render(actionType = '', offset = 0) {
		
		// Create history container
		$('.acex-history-list').remove();
		this.$historyList = $('<div class="acex-history-list">').appendTo(this.$historyContainer);
		const $loader = $('<div class="acex-history-loader">Loading history...</div>');

		if (offset === 0) {
			this.$historyList.html($loader);
		} else {
			this.$historyList.append($loader);
		}


		let response = await this.load( actionType, offset );
		if (response.error) {
			this.$historyList.html('<div class="acex-no-history">Error loading history</div>');
			return;
		}
		let { records, total } = response;

		if (!records || records.length === 0) {
			if (offset === 0) {
				this.$historyList.html('<div class="acex-no-history">No history records found</div>');
			}
			return;
		}
		$loader.remove();
		records.forEach(record => {
			const $item = this.createHistoryItem(record);
			this.$historyList.append($item);
		});
		
		// Add "Load More" button if there are more records
		const displayed = offset + records.length;
		if (displayed < total) {
			const $loadMore = $('<button class="acex-load-more">Load More</button>');
			$loadMore.on('click', () => {
				$loadMore.remove();
				this.render(actionType, displayed);
			});
			this.$historyList.append($loadMore);
		}
	}



	// MARK: Create History Item
	// -----------------------------------------------------
	createHistoryItem(record) {
		const isImport = record.action_type === 'import';
		const date = new Date(record.created_at);
		const formattedDate = date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
		
		// Calculate success rate
		const successRate = record.total_rows > 0 
			? Math.round((record.successful / record.total_rows) * 100) 
			: 0;
		
		// Determine status
		let statusClass = 'success';
		let statusText = 'Success';
		if (record.failed > 0 && record.successful === 0) {
			statusClass = 'error';
			statusText = 'Failed';
		} else if (record.failed > 0) {
			statusClass = 'warning';
			statusText = 'Partial';
		}
		
		const $item = $(`
            <div class="acex-history-item" data-id="${record.id}">
                <div class="acex-history-header">
                    <div class="acex-history-icon ${isImport ? 'import' : 'export'}">
                        ${isImport ? DATA.SVG.import : DATA.SVG.export}
                    </div>
                    <div class="acex-history-main">
                        <div class="acex-history-title">
                            <span class="acex-history-filename">${this.escapeHtml(record.filename)}</span>
                            <span class="acex-history-badge acex-badge-${record.action_type}">${record.action_type}</span>
                            <span class="acex-history-status acex-status-${statusClass}">${statusText}</span>
                        </div>
                        <div class="acex-history-meta">
                            <span class="acex-history-date">${formattedDate}</span>
                        </div>
                    </div>
                    <div class="acex-history-actions">
                        <button class="acex-btn-icon acex-btn-details" title="View Details">
                            <i class="dashicons dashicons-visibility"></i>
                        </button>
                        <button class="acex-btn-icon acex-btn-delete" title="Delete">
                            <i class="dashicons dashicons-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="acex-history-flex">
					<div class="acex-history-stats">
						${isImport ? `
							<div class="acex-stat">
								<span class="acex-stat-label">Total</span>
								<span class="acex-stat-value">${record.total_rows}</span>
							</div>
							<div class="acex-stat acex-stat-success">
								<span class="acex-stat-label">Created</span>
								<span class="acex-stat-value">${record.created}</span>
							</div>
							<div class="acex-stat acex-stat-updated">
								<span class="acex-stat-label">Updated</span>
								<span class="acex-stat-value">${record.updated}</span>
							</div>
						` : `
							<div class="acex-stat">
								<span class="acex-stat-label">Total</span>
								<span class="acex-stat-value">${parseInt(record.total_rows)+parseInt(record.metadata.product_types.variations||0)}</span>
							</div>
							${record.metadata.product_types.simple > 0 ? `
								<div class="acex-stat acex-stat-success">
									<span class="acex-stat-label">simple</span>
									<span class="acex-stat-value">${record.metadata.product_types.simple}</span>
								</div>
							` : ''}
							${record.metadata.product_types.variable > 0 ? `
								<div class="acex-stat acex-stat-updated">
									<span class="acex-stat-label">variable</span>
									<span class="acex-stat-value">${record.metadata.product_types.variable}</span>
								</div>
							` : ''}
							${record.metadata.product_types.variations > 0 ? `
								<div class="acex-stat acex-stat-updated">
									<span class="acex-stat-label">variations</span>
									<span class="acex-stat-value">${record.metadata.product_types.variations}</span>
								</div>
							` : ''}
							${record.metadata.product_types.grouped > 0 ? `
								<div class="acex-stat acex-stat-exported">
									<span class="acex-stat-label">grouped</span>
									<span class="acex-stat-value">${record.metadata.product_types.grouped}</span>
								</div>
							` : ''}
							${record.metadata.product_types.external > 0 ? `
								<div class="acex-stat acex-stat-exported">
									<span class="acex-stat-label">external</span>
									<span class="acex-stat-value">${record.metadata.product_types.external}</span>
								</div>
							` : ''}
						`}
						${record.failed > 0 ? `
							<div class="acex-stat acex-stat-failed">
								<span class="acex-stat-label">Failed</span>
								<span class="acex-stat-value">${record.failed}</span>
							</div>
						` : ''}
					</div>
					
					${successRate < 100 ? `
						<div class="acex-history-progress">
							<div class="acex-progress-bar">
								<div class="acex-progress-fill acex-progress-${statusClass}" style="width: ${successRate}%"></div>
							</div>
							<span class="acex-progress-text">${successRate}% successful</span>
						</div>
					` : ''}
					
					${record.google_sheet_url ? `
						<div class="actus-flex-1"></div>
						<div class="acex-history-google">
							${DATA.SVG['google-sheet']}
							<a href="${record.google_sheet_url}" target="_blank" rel="noopener noreferrer">
								Open in Google Sheets
							</a>
							<button class="acex-btn-icon acex-btn-delete-google" title="Delete Google Sheet">
								<i class="dashicons dashicons-trash"></i>
							</button>
						</div>
					` : ''}

                </div>
                

                <div class="acex-history-details" style="display: none;">
                    ${this.renderDetails(record)}
                </div>
            </div>
        `);
		
		// Event handlers
        $item.find('.acex-btn-details').on('click', () => {
            $item.find('.acex-history-details').slideToggle(200);
            $item.toggleClass('expanded');
        });
        
        $item.find('.acex-btn-delete-google').on('click', () => {
            this.deleteGoogleSheet(record.google_sheet_id, record.id, $item);
        });
        
        $item.find('.acex-btn-delete').on('click', () => {
            this.deleteHistoryRecord(record.id, $item, record.google_sheet_id);
        });
		
		return $item;
	}



	// MARK: Render History Details
	// -----------------------------------------------------
	renderDetails(record) {
		let html = '<div class="acex-details-content">';
		
		// Errors
		if (record.errors && record.errors.length > 0) {
			html += `
				<div class="acex-details-section acex-details-errors">
					<h4><i class="dashicons dashicons-warning"></i> Errors (${record.errors.length})</h4>
					<ul>
						${record.errors.map(err => `<li>${this.escapeHtml(err)}</li>`).join('')}
					</ul>
				</div>
			`;
		}
		
		// Warnings
		if (record.warnings && record.warnings.length > 0) {
			html += `
				<div class="acex-details-section acex-details-warnings">
					<h4><i class="dashicons dashicons-info"></i> Warnings (${record.warnings.length})</h4>
					<ul>
						${record.warnings.map(warn => `<li>${this.escapeHtml(warn)}</li>`).join('')}
					</ul>
				</div>
			`;
		}
		
		// Metadata
		if (record.metadata) {
			html += `
				<div class="acex-details-section acex-details-metadata">
					<h4><i class="dashicons dashicons-admin-settings"></i> Metadata</h4>
					<pre>${JSON.stringify(record.metadata, null, 2)}</pre>
				</div>
			`;
		}
		
		html += '</div>';
		return html;
	}




	// MARK: Render Google Sheets List
	// -----------------------------------------------------
	async renderGoogleSheetsList( target ) {
		let response = await this.load();
		let records = response.records || [];

		$('.acex-google-sheets-list').remove();
		const $list = $('<div class="acex-google-sheets-list">').appendTo( target );
		records.forEach(record => {
			if (record.google_sheet_url) {
				const $item = $(`
					<div class="acex-google-sheet-item" data-id="${record.google_sheet_id}">
						${DATA.SVG['google-sheet']}
						<div class="acex-google-sheet-date">${this.escapeHtml(record.created_at.substr(0, 10))}</div>
						<div class="acex-google-sheet-name">${this.escapeHtml(record.metadata.template_name)}</div>
						<div class="actus-flex-1"></div>
						<div class="acex-google-sheet-rows">${parseInt(record.total_rows)} rows</div>
						<button class="actus-btn actus-btn-secondary actus-btn-import-sheet">
							Import to WooCommerce
						</button>
						<button class="actus-btn actus-btn-secondary">
							<a href="${record.google_sheet_url}" target="_blank" rel="noopener noreferrer">
								Open in Google Sheets
							</a>
						</button>
						<button class="acex-btn-icon acex-btn-delete-google" title="Delete Google Sheet">
							<i class="dashicons dashicons-trash"></i>
						</button>
					</div>
				`);
				$list.append($item);
			}
		});


		$('body').off('click.acex-google-import', '.actus-btn-import-sheet');
		$('body').on('click.acex-google-import', '.actus-btn-import-sheet', async (e) => {
			e.preventDefault();
			const $item = $(e.currentTarget).closest('.acex-google-sheet-item');
			const sheetId = $item.data('id');
			let modal = new Modal();
			modal.showLoading('Loading data from Google Sheet...');
			modal.open();
			const file = await GoogleSheets.loadFile(sheetId);
			modal.close();
			if (file) {
				ImportSheet.fileUploaded({ file: file });
			}
		});

		return $list;
	}





	// MARK: Delete Google Sheet
    // -----------------------------------------------------
    async deleteGoogleSheet(sheetId, recordId, $item) {

        let confirmed = await Modal.confirm(
			'Are you sure you want to delete this Google Sheet? This action cannot be undone.',
            'Delete Google Sheet',
			'Delete Google Sheet',
        );

		if (!confirmed) return;
		
        const modal = new Modal();
		modal.showLoading('Deleting Google Sheet...');
		modal.open()
                
		try {
			const deleted = await GoogleSheets.deleteFile(sheetId);
			if (deleted) {
				// Update the database to remove Google Sheet reference
				await $.ajax({
					url: ajaxurl,
					method: 'POST',
					data: {
						action: 'acex_update_history_google',
						nonce: DATA.nonce,
						id: recordId,
						google_sheet_id: null,
						google_sheet_url: null
					}
				});
				
				// Update UI
				$item.find('.acex-btn-delete-google').remove();
				$item.find('.acex-history-google').remove();
				
				modal.close()
				Modal.success('Google Sheet deleted successfully');
			} else {
				modal.close();
				Modal.error('Failed to delete Google Sheet',  (result.error || 'Unknown error'));
			}
		} catch (error) {
			modal.close()
			Modal.error(
				'Error deleting Google Sheet',
				error.message,
			);
		}


    }



	// MARK: Delete History Record
    // -----------------------------------------------------
    async deleteHistoryRecord(id, $item, googleSheetId = null) {
        
        let message = 'Are you sure you want to delete this history record?';
        if (googleSheetId) {
            message += '<br><br><strong style="color: #d63638;">Warning:</strong> This record has an associated Google Sheet that will also be deleted permanently.';
        }

        let confirmed = await Modal.confirm(
            message,
            'Delete History Record',
            'Delete Record' + (googleSheetId ? ' & Google Sheet' : ''),
        );

		if (!confirmed) return;
		
        const modal = new Modal();

		modal.showLoading('Deleting record...');
		modal.open()
                
		try {
			// Delete Google Sheet first if exists
			if (googleSheetId) {
				await GoogleSheets.deleteFile(googleSheetId);
			}
			
			// Delete history record
			const response = await $.ajax({
				url: ajaxurl,
				method: 'POST',
				data: {
					action: 'acex_delete_history',
					nonce: DATA.nonce,
					id: id
				}
			});
			
			modal.close()
			if (response.success) {
				$item.fadeOut(300, () => $item.remove());
				Modal.success('Record deleted successfully');
			} else {
				Modal.error(
					'Failed to delete record',
					response.data,
				);
			}
		} catch (error) {
			modal.close()
			Modal.error(
				'Error deleting record',
				error.message,
			);
		}


    }



	// MARK: Escape HTML
	// -----------------------------------------------------
	escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}





	// MARK: Save Import
	// -----------------------------------------------------
	async saveImport(filename, result, products, importOptions) {
		// Collect errors and warnings
		const errors = [];
		const warnings = [];
		
        if (result.results) {
            result.results.forEach((r, i) => {
                if (r.error) {
                    errors.push(`Row ${i+3}: ${r.message}`);
                }
                if (r.warnings && r.warnings.length > 0) {
                    warnings.push(...r.warnings.map(w => `Row ${i+3}: ${w}`));
                }
            });
        }
		
		return $.ajax({
            url: ajaxurl,
            method: 'POST',
            data: {
                action: 'acex_save_history',
                nonce: DATA.nonce,
                history_data: {
                    filename: filename || 'unknown.xlsx',
                    action_type: 'import',
                    total_rows: products.length,
                    successful: result.successful || 0,
                    failed: result.failed || 0,
                    created: result.created || 0,
                    updated: result.updated || 0,
                    errors: errors,
                    warnings: warnings,
                    metadata: importOptions
                }
            }
        });
	}






	// MARK: Save Export History
	// -----------------------------
    async saveExport(filename, totalProducts, exportData, template, query, googleResult = null) {
		const historyData = {
            filename: filename,
            action_type: 'export',
            total_rows: totalProducts,
            exported: totalProducts,
            successful: totalProducts,
            failed: 0,
            errors: [],
            warnings: [],
            metadata: {
                template_name: template?.name || 'Export',
                format: googleResult ? 'google' : 'xlsx',
                query: query || {},
                columns: template?.columns?.map(col => col.key) || [],
                product_types: {
                    simple: exportData?.simple_products || 0,
                    variable: exportData?.variable_products || 0,
                    variations: exportData?.variations || 0,
                    grouped: exportData?.grouped_products || 0,
                    external: exportData?.external_products || 0,
                    downloadable: exportData?.downloadable_products || 0
                }
            }
        };
		
		// Add Google Sheet info if applicable
		if (googleResult && googleResult.sheetId) {
			historyData.google_sheet_id = googleResult.sheetId;
			historyData.google_sheet_url = `https://docs.google.com/spreadsheets/d/${googleResult.sheetId}`;
		}
		
		return $.ajax({
			url: ajaxurl,
			method: 'POST',
			data: {
				action: 'acex_save_history',
				nonce: DATA.nonce,
				history_data: historyData
			}
		});
	}








}
















export default new History();