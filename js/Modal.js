const $ = window.jQuery || jQuery;

/**
 * Modal Class
 * 
 * A flexible modal dialog system with support for:
 * - Custom content
 * - Multiple sizes
 * - Animations
 * - Callbacks
 * - Stacking (multiple modals)
 * - Accessibility (keyboard navigation, focus management)
 * 
 * USAGE:
 * 
 * // Simple modal
 * const modal = new Modal({
 *     title: 'My Modal',
 *     content: 'Hello World',
 *     size: 'medium'
 * });
 * modal.open();
 * 
 * // Modal with buttons
 * const modal = new Modal({
 *     title: 'Confirm Action',
 *     content: 'Are you sure?',
 *     buttons: [
 *         {
 *             text: 'Cancel',
 *             class: 'button',
 *             onClick: (modal) => modal.close()
 *         },
 *         {
 *             text: 'Confirm',
 *             class: 'actus-btn-primary',
 *             onClick: (modal) => {
 *                 console.log('Confirmed!');
 *                 modal.close();
 *             }
 *         }
 *     ]
 * });
 * 
 * // Modal with callbacks
 * const modal = new Modal({
 *     title: 'Edit Item',
 *     content: '<form>...</form>',
 *     onOpen: () => console.log('Modal opened'),
 *     onClose: () => console.log('Modal closed'),
 *     beforeClose: () => {
 *         // Return false to prevent closing
 *         return confirm('Discard changes?');
 *     }
 * });
 */
class Modal {

	constructor(options = {}) {
		// Default options
		this.options = {
			title: '',
			content: '',
			size: 'medium', // 'small', 'medium', 'large', 'xlarge', 'fullscreen'
			closeButton: true,
			closeOnOverlay: false,
			closeOnEscape: true,
			animation: 'fade', // 'fade', 'slide', 'zoom', 'none'
			buttons: [],
			className: '',
			onOpen: null,
			onClose: null,
			beforeClose: null,
			focusTrap: true,
			...options
		};

		// State
		this.isOpen = false;
		this.$modal = null;
		this.$overlay = null;
		this.previousFocus = null;

		// Generate unique ID
		this.id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		// Create modal elements
		this.create();

		// Bind methods
		this.handleKeyDown = this.handleKeyDown.bind(this);
		this.handleOverlayClick = this.handleOverlayClick.bind(this);
	}




	// MARK: Create Modal
	// -----------------------------
	create() {
		const sizeClass = `actus-modal-${this.options.size}`;
		const animationClass = `actus-modal-animation-${this.options.animation}`;
		const customClass = this.options.className ? this.options.className : '';

		// Create overlay
		this.$overlay = $(`
			<div class="actus-modal-overlay" data-modal-id="${this.id}">
				<div class="actus-modal acex-main ${sizeClass} ${animationClass} ${customClass}" role="dialog" aria-modal="true" aria-labelledby="${this.id}-title">
					<div class="actus-modal-container">
						${this.options.closeButton ? '<button class="actus-modal-close" aria-label="Close modal">&times;</button>' : ''}
						${this.options.title ? `<div class="actus-modal-header"><h2 id="${this.id}-title" class="actus-modal-title">${this.options.title}</h2></div>` : ''}
						<div class="actus-modal-body"></div>
						${this.options.buttons.length > 0 ? '<div class="actus-modal-footer"></div>' : ''}
					</div>
				</div>
			</div>
		`);

		this.$modal = this.$overlay.find('.actus-modal');
		this.$container = this.$modal.find('.actus-modal-container');
		this.$body = this.$modal.find('.actus-modal-body');

		// Set content
		this.setContent(this.options.content);

		// Add buttons
		if (this.options.buttons.length > 0) {
			this.addButtons(this.options.buttons);
		}

		// Append to body (but keep hidden)
		this.$overlay.hide().appendTo('body');

		// Bind events
		this.bindEvents();
	}




	// MARK: Set Content
	// -----------------------------
	setContent(content='') {
		const $body = this.$modal.find('.actus-modal-body');
		
		if (typeof content === 'string') {
			$body.html(content);
		} else if (content instanceof jQuery) {
			$body.empty().append(content);
		} else if (content instanceof HTMLElement) {
			$body.empty().append(content);
		} else {
			$body.html('');
		}

		return this;
	}




	// MARK: Add Content
	// -----------------------------
	addContent(content) {
		const $body = this.$modal.find('.actus-modal-body');

		if (typeof content === 'string') {
			$body.append(content);
		} else if (content instanceof jQuery) {
			$body.append(content);
		} else if (content instanceof HTMLElement) {
			$body.append(content);
		}

		return this;
	}




	// MARK: Add Buttons
	// -----------------------------
	addButtons(buttons) {
		const $footer = this.$modal.find('.actus-modal-footer');
		$footer.empty();

		buttons.forEach(button => {
			const $button = $(`<button class="actus-btn ${button.class || ''}">${button.text||''}</button>`);
			
			if (button.onClick) {
				$button.on('click', (e) => {
					e.preventDefault();
					button.onClick(this, e);
				});
			}

			$footer.append($button);
		});

		return this;
	}




	// MARK: Bind Events
	// -----------------------------
	bindEvents() {
		// Close button
		if (this.options.closeButton) {
			this.$modal.find('.actus-modal-close').on('click', (e) => {
				e.preventDefault();
				this.destroy();
			});
		}

		// Overlay click
		if (this.options.closeOnOverlay) {
			this.$overlay.on('click', this.handleOverlayClick.bind(this));
		}

		// Prevent modal content clicks from closing
		this.$modal.on('click', (e) => {
			e.stopPropagation();
		});
	}




	// MARK: Handle Overlay Click
	// -----------------------------
	handleOverlayClick(e) {
		if ($(e.target).hasClass('actus-modal-overlay')) {
			this.destroy();
		}
	}




	// MARK: Handle Key Down
	// -----------------------------
	handleKeyDown(e) {
		// ESC key
		if (e.keyCode === 27 && this.options.closeOnEscape) {
			e.preventDefault();
			this.destroy();
		}

		// Tab key (focus trap)
		if (e.keyCode === 9 && this.options.focusTrap) {
			this.trapFocus(e);
		}
	}




	// MARK: Trap Focus
	// -----------------------------
	trapFocus(e) {
		const focusableElements = this.$modal.find(
			'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
		);

		if (focusableElements.length === 0) return;

		const firstElement = focusableElements.first()[0];
		const lastElement = focusableElements.last()[0];

		if (e.shiftKey) {
			// Shift + Tab
			if (document.activeElement === firstElement) {
				e.preventDefault();
				lastElement.focus();
			}
		} else {
			// Tab
			if (document.activeElement === lastElement) {
				e.preventDefault();
				firstElement.focus();
			}
		}
	}




	// MARK: Open Modal
	// -----------------------------
	open() {
		if (this.isOpen) return this;

		// Store currently focused element
		this.previousFocus = document.activeElement;

		// Show overlay and modal
		this.$overlay.show();
		
		// Trigger animation
		setTimeout(() => {
			this.$overlay.addClass('actus-modal-open');
			this.$modal.addClass('actus-modal-active');
		}, 10);

		// Add body class to prevent scrolling
		$('body').addClass('actus-modal-is-open');

		// Bind keyboard events
		$(document).on(`keydown.modal-${this.id}`, this.handleKeyDown);

		// Focus first focusable element
		setTimeout(() => {
			const firstFocusable = this.$modal.find(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			).first();
			
			if (firstFocusable.length) {
				firstFocusable.focus();
			} else {
				this.$modal.focus();
			}
		}, 100);

		this.isOpen = true;

		// Trigger callback
		if (typeof this.options.onOpen === 'function') {
			this.options.onOpen(this);
		}

		// Trigger custom event
		$(document).trigger('acex::modal:open', [this]);

		return this;
	}




	// MARK: Close Modal
	// -----------------------------
	close() {
		if (!this.isOpen) return this;

		// Check beforeClose callback
		if (typeof this.options.beforeClose === 'function') {
			const shouldClose = this.options.beforeClose(this);
			if (shouldClose === false) return this;
		}

		// Remove animation classes
		this.$overlay.removeClass('actus-modal-open');
		this.$modal.removeClass('actus-modal-active');

		// Hide after animation
		setTimeout(() => {
			this.$overlay.hide();
		}, 300);

		// Remove body class
		if ($('.actus-modal-overlay.actus-modal-open').length === 0) {
			$('body').removeClass('actus-modal-is-open');
		}

		// Unbind keyboard events
		$(document).off(`keydown.modal-${this.id}`);

		// Restore focus
		if (this.previousFocus) {
			this.previousFocus.focus();
		}

		this.isOpen = false;

		// Trigger callback
		if (typeof this.options.onClose === 'function') {
			this.options.onClose(this);
		}

		// Trigger custom event
		$(document).trigger('acex::modal:close', [this]);

		return this;
	}




	// MARK: Toggle Modal
	// -----------------------------
	toggle() {
		return this.isOpen ? this.close() : this.open();
	}




	// MARK: Update Content
	// -----------------------------
	updateContent(content) {
		this.setContent(content);
		return this;
	}




	// MARK: Update Title
	// -----------------------------
	updateTitle(title) {
		const $title = this.$modal.find('.actus-modal-title');
		if ($title.length) {
			$title.html(title);
		} else if (title) {
			// Create header if it doesn't exist
			const $header = $(`<div class="actus-modal-header"><h2 id="${this.id}-title" class="actus-modal-title">${title}</h2></div>`);
			this.$modal.find('.actus-modal-container').prepend($header);
		}
		return this;
	}




	// MARK: Update Buttons
	// -----------------------------
	updateButtons(buttons) {
		this.options.buttons = buttons;
		
		let $footer = this.$modal.find('.actus-modal-footer');
		if (!$footer.length && buttons.length > 0) {
			$footer = $('<div class="actus-modal-footer"></div>');
			this.$modal.find('.actus-modal-container').append($footer);
		}
		
		this.addButtons(buttons);
		return this;
	}




	// MARK: Get Body Element
	// -----------------------------
	getBody() {
		return this.$modal.find('.actus-modal-body');
	}




	// MARK: Get Footer Element
	// -----------------------------
	getFooter() {
		let $footer = this.$modal.find('.actus-modal-footer');
		if (!$footer.length) {
			$footer = $('<div class="actus-modal-footer"></div>');
			this.$modal.find('.actus-modal-container').append($footer);
		}
		return $footer;
	}




	// MARK: Show Loading
	// -----------------------------
	showLoading(message = 'Loading...') {
		const $body = this.getBody();
		$body.html(`
			<div class="actus-modal-loading">
				<div class="actus-spinner"></div>
				<p>${message}</p>
			</div>
		`);
		return this;
	}




	// MARK: Destroy Modal
	// -----------------------------
	destroy() {
		this.close();
		$(document).off(`keydown.modal-${this.id}`);
		setTimeout(() => {
			if ( this.$overlay ) this.$overlay.remove();
			this.$modal = null;
			this.$overlay = null;
		}, 300);
	}




	// MARK: Static Helper Methods
	// -----------------------------

	/**
	 * Create a formatted message modal with icon and styling
	 * @param {string} type - Message type: 'error', 'success', 'warning', 'info'
	 * @param {string} title - Message title
	 * @param {string} description - Message description (optional)
	 * @param {Object} options - Additional options
	 * @param {string} options.errorMessage - Error message for error type (displays in code block)
	 * @param {Object} options.details - Key-value pairs for details section (for success/info)
	 * @param {Array<string>} options.points - Array of bullet points (for warning)
	 * @param {string} options.helpText - Help text (for error type)
	 * @param {string} options.buttonText - Custom button text (default: 'OK' or 'Close')
	 * @param {Function} options.onClose - Callback when modal closes
	 * @returns {Modal} Modal instance
	 */
	static message(type, title, description = '', options = {}) {
		const {
			errorMessage = '',
			details = {},
			points = [],
			helpText = 'Please try again or contact support if the problem persists.',
			buttonText = null,
			button2 = {},
			onClose = null
		} = options;

		let html = '';
		let modalTitle = '';
		let defaultButtonText = 'OK';

		switch (type) {
			case 'error':
				defaultButtonText = 'Close';
				modalTitle = title || 'Error';
				html = `
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
						${errorMessage ? `
							<div class="acex-error-details">
								<code>${errorMessage}</code>
							</div>
						` : ''}
						${helpText ? `<p class="acex-error-help">${helpText}</p>` : ''}
					</div>
				`;
				break;

			case 'success':
				modalTitle = title || 'Success';
				const successDetailsHtml = Object.keys(details).length > 0
					? `<div class="acex-success-details">
						${Object.entries(details).map(([key, value]) => 
							`<p><strong>${key}:</strong> ${value}</p>`
						).join('')}
					</div>`
					: '';
				
				html = `
					<div class="acex-success-message">
						<div class="acex-success-icon">
							<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<circle cx="12" cy="12" r="10" stroke="#28a745" stroke-width="2"/>
								<path d="M8 12L11 15L16 9" stroke="#28a745" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						</div>
						<h3 class="acex-success-title">${title}</h3>
						${description ? `<p class="acex-success-description">${description}</p>` : ''}
						${successDetailsHtml}
						${helpText ? `<p class="acex-success-help">${helpText}</p>` : ''}
					</div>
				`;
				break;

			case 'warning':
				modalTitle = title || 'Warning';
				const warningPointsHtml = points.length > 0
					? `<ul class="acex-warning-list">
						${points.map(point => `<li>${point}</li>`).join('')}
					</ul>`
					: '';
				
				html = `
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
						${warningPointsHtml}
					</div>
				`;
				break;

			case 'info':
				modalTitle = title || 'Information';
				const infoDetailsHtml = Object.keys(details).length > 0
					? `<div class="acex-info-details">
						${Object.entries(details).map(([key, value]) => 
							`<p><strong>${key}:</strong> ${value}</p>`
						).join('')}
					</div>`
					: '';
				
				html = `
					<div class="acex-info-message">
						<div class="acex-info-icon">
							<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<circle cx="12" cy="12" r="10" stroke="#2196F3" stroke-width="2"/>
								<path d="M12 8v0" stroke="#2196F3" stroke-width="2" stroke-linecap="round"/>
								<path d="M12 12v4" stroke="#2196F3" stroke-width="2" stroke-linecap="round"/>
							</svg>
						</div>
						${title ? `<h3 class="acex-info-title">${title}</h3>` : ''}
						${description ? `<p class="acex-info-description">${description}</p>` : ''}
						${infoDetailsHtml}
					</div>
				`;
				break;

			default:
				// Default to alert style
				modalTitle = title || 'Alert';
				html = `<p>${description}</p>`;
		}


		let buttons = [
			{
				text: buttonText || defaultButtonText,
				class: 'actus-btn-primary',
				onClick: (modal) => {
					if (onClose) onClose(modal);
					modal.destroy();
				}
			}
		]
		if (button2.text) {
			buttons.unshift({
				text: button2.text,
				class: button2.className || 'actus-btn-secondary',
				onClick: (modal) => {
					if (button2.onClick) button2.onClick(modal);
					modal.destroy();
				}
			});
		}

		return new Modal({
			title: modalTitle,
			content: html,
			size: 'medium',
			className: 'actus-modal-message', // Hide default header for message modals
			buttons: buttons
		}).open();
	}

	/**
	 * Create an error modal
	 * @param {string} title - Error title
	 * @param {string} description - Error description
	 * @param {string} errorMessage - Technical error message
	 * @param {string} helpText - Help text (optional)
	 * @returns {Modal} Modal instance
	 */
	static error(title, description = '', errorMessage = '', helpText = null, button2) {
		return Modal.message('error', title, description, {
			errorMessage,
			helpText: helpText || 'Please try again or contact support if the problem persists.',
			button2
		});
	}

	/**
	 * Create a success modal
	 * @param {string} title - Success title
	 * @param {string} description - Success description
	 * @param {Object} details - Key-value pairs for details section
	 * @returns {Modal} Modal instance
	 */
	static success(title, description = '', details = {}, helpText = '', onClose = null) {
		return Modal.message('success', title, description, { details, onClose, helpText });
	}

	/**
	 * Create a warning modal
	 * @param {string} title - Warning title
	 * @param {string} description - Warning description
	 * @param {Array<string>} points - Array of warning points
	 * @returns {Modal} Modal instance
	 */
	static warning(title, description = '', points = []) {
		return Modal.message('warning', title, description, { points });
	}

	/**
	 * Create an info modal
	 * @param {string} title - Info title
	 * @param {string} description - Info description
	 * @param {Object} details - Key-value pairs for details section
	 * @returns {Modal} Modal instance
	 */
	static info(title, description = '', details = {}) {
		return Modal.message('info', title, description, { details });
	}

	/**
	 * Create a simple alert modal
	 */
	static alert(message, title = 'Alert') {
		return new Modal({
			title: title,
			content: message,
			size: 'small',
			buttons: [
				{
					text: 'OK',
					class: 'actus-btn-primary',
					onClick: (modal) => modal.destroy()
				}
			]
		}).open();
	}




	/**
	 * Create a confirm modal
	 */
	static confirm(message, title = 'Confirm', buttons = [], size = 'small') {
		if ( ! buttons ) buttons = [];
		let okButton = 'OK';
		if ( typeof buttons === 'string' ) {
			okButton = buttons;
			buttons = [];
		}

		return new Promise((resolve) => {
			let resolved = false;
			const modal = new Modal({
				title: title,
				content: message||'',
				size: size,
				buttons: [
					...buttons,
					{
						text: 'Cancel',
						class: 'actus-btn',
						onClick: (modal) => {
							resolved = true;
							resolve(false);
							modal.destroy();
						}
					},
					{
						text: okButton,
						class: 'actus-btn-primary',
						onClick: (modal) => {
							resolved = true;
							resolve(modal);
							modal.destroy();
						}
					}
				],
				onClose: () => {
					if (!resolved) {
						resolve(false);
					}
					modal.destroy()
				}
			}).open();
		
			//return modal;
		});

	}




	/**
	 * Create a prompt modal
	 */
	static prompt(message, defaultValue = '', title = 'Input') {
		return new Promise((resolve) => {
			let resolved = false;
			const inputId = `prompt-input-${Date.now()}`;
			const modal = new Modal({
				title: title,
				content: `
					<div class="actus-modal-prompt">
						<p>${message}</p>
						<input type="text" id="${inputId}" class="actus-input" value="${defaultValue}" autofocus />
					</div>
				`,
				size: 'small',
				buttons: [
					{
						text: 'Cancel',
						class: 'actus-btn',
						onClick: (modal) => {
							resolved = true;
							resolve(null);
							modal.destroy();
						}
					},
					{
						text: 'OK',
						class: 'actus-btn-primary',
						onClick: (modal) => {
							const value = modal.getBody().find(`#${inputId}`).val();
							resolved = true;
							resolve(value);
							modal.destroy();
						}
					}
				],
				onOpen: (modal) => {
					// Use setTimeout with delay longer than modal's focus trap (100ms)
					setTimeout(() => {
						const $input = modal.getBody().find(`#${inputId}`);
						$input.focus().select();
					}, 150);
				},
				onClose: () => {
					if (!resolved) {
						resolve(null);
					}
					modal.destroy()
				}
			}).open();
		});
	}



}




// Export for use in other modules
export default Modal;
