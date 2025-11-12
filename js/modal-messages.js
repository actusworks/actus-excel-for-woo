/**
 * Modal Message Templates
 * 
 * Reusable HTML templates for different types of modal messages
 */

const $ = window.jQuery || jQuery;

/**
 * Create a formatted error message
 * @param {string} title - Error title
 * @param {string} description - Error description
 * @param {string} errorMessage - Technical error message
 * @param {string} helpText - Optional help text
 * @returns {string} HTML string
 */
export function createErrorMessage(title, description, errorMessage, helpText = 'Please try again or contact support if the problem persists.') {
	return `
		<div class="acex-error-message">
			<div class="acex-error-icon">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<circle cx="12" cy="12" r="10" stroke="#dc3545" stroke-width="2"/>
					<path d="M12 8V12" stroke="#dc3545" stroke-width="2" stroke-linecap="round"/>
					<circle cx="12" cy="16" r="1" fill="#dc3545"/>
				</svg>
			</div>
			<h3 class="acex-error-title">${title}</h3>
			${description ? `<p class="acex-error-description">${description}</p>` : ''}
			<div class="acex-error-details">
				<code>${errorMessage}</code>
			</div>
			${helpText ? `<p class="acex-error-help">${helpText}</p>` : ''}
		</div>
	`;
}

/**
 * Create a formatted success message
 * @param {string} title - Success title
 * @param {string} description - Success description
 * @param {Object} details - Key-value pairs for details section
 * @returns {string} HTML string
 */
export function createSuccessMessage(title, description, details = {}) {
	const detailsHtml = Object.keys(details).length > 0
		? `<div class="acex-success-details">
			${Object.entries(details).map(([key, value]) => 
				`<p><strong>${key}:</strong> ${value}</p>`
			).join('')}
		</div>`
		: '';

	return `
		<div class="acex-success-message">
			<div class="acex-success-icon">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<circle cx="12" cy="12" r="10" stroke="#28a745" stroke-width="2"/>
					<path d="M8 12L11 15L16 9" stroke="#28a745" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</div>
			<h3 class="acex-success-title">${title}</h3>
			${description ? `<p class="acex-success-description">${description}</p>` : ''}
			${detailsHtml}
		</div>
	`;
}

/**
 * Create a formatted warning message
 * @param {string} title - Warning title
 * @param {string} description - Warning description
 * @param {Array<string>} points - Array of warning points
 * @returns {string} HTML string
 */
export function createWarningMessage(title, description, points = []) {
	const pointsHtml = points.length > 0
		? `<ul class="acex-warning-list">
			${points.map(point => `<li>${point}</li>`).join('')}
		</ul>`
		: '';

	return `
		<div class="acex-warning-message">
			<div class="acex-warning-icon">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M12 2L2 20h20L12 2z" stroke="#ffc107" stroke-width="2" stroke-linejoin="round"/>
					<path d="M12 9v4" stroke="#ffc107" stroke-width="2" stroke-linecap="round"/>
					<circle cx="12" cy="17" r="1" fill="#ffc107"/>
				</svg>
			</div>
			<h3 class="acex-warning-title">${title}</h3>
			${description ? `<p class="acex-warning-description">${description}</p>` : ''}
			${pointsHtml}
		</div>
	`;
}

/**
 * Create a formatted info message
 * @param {string} title - Info title
 * @param {string} description - Info description
 * @param {Object} details - Key-value pairs for details section
 * @returns {string} HTML string
 */
export function createInfoMessage(title, description, details = {}) {
	const detailsHtml = Object.keys(details).length > 0
		? `<div class="acex-info-details">
			${Object.entries(details).map(([key, value]) => 
				`<p><strong>${key}:</strong> ${value}</p>`
			).join('')}
		</div>`
		: '';

	return `
		<div class="acex-info-message">
			<div class="acex-info-icon">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<circle cx="12" cy="12" r="10" stroke="#2196F3" stroke-width="2"/>
					<path d="M12 8v0" stroke="#2196F3" stroke-width="2" stroke-linecap="round"/>
					<path d="M12 12v4" stroke="#2196F3" stroke-width="2" stroke-linecap="round"/>
				</svg>
			</div>
			<h3 class="acex-info-title">${title}</h3>
			${description ? `<p class="acex-info-description">${description}</p>` : ''}
			${detailsHtml}
		</div>
	`;
}

/**
 * Show a progress message in a modal
 * @param {Object} modal - Modal instance
 * @param {string} message - Progress message
 * @param {number} current - Current progress
 * @param {number} total - Total items
 */
export function showProgressMessage(modal, message, current, total) {
	const percentage = Math.round((current / total) * 100);
	
	const html = `
		<div class="acex-progress-message">
			<div class="acex-progress-icon">
				<div class="actus-spinner"></div>
			</div>
			<h3 class="acex-progress-title">${message}</h3>
			<div class="acex-progress-bar">
				<div class="acex-progress-fill" style="width: ${percentage}%"></div>
			</div>
			<p class="acex-progress-text">${current} / ${total} (${percentage}%)</p>
		</div>
	`;
	
	modal.updateContent(html);
}

// Export all functions as a single object for convenience
export default {
	createErrorMessage,
	createSuccessMessage,
	createWarningMessage,
	createInfoMessage,
	showProgressMessage
};
