import Modal 			from './Modal.js';
import {
	log,
	logg,
	ajax_getOption,
	ajax_saveOption,
} from './helpers.js';
// -----------------------------------------------------



const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
const { __ } = wp.i18n;
// -----------------------------------------------------
const CACHE_KEY = 'acex_license_check';
const CACHE_DURATION = 12 * 60 * 60 * 1000; 
const RETRY_DURATION =      15 * 60 * 1000; 






// -----------------------------------------------------
class LicenseManager {
// -----------------------------------------------------
	
	constructor() {

		this.key = null;
		this.status = null;
		this.expires = null;
		this.email = null;
		this.end = null;
		this.activations = null;
		this.isInitialized = false;
		this.free = {}
		this.setFree()

		this.$mainContainer = $('.acex-main');
		this.$bodyContainer = null;
		this.$bodyTitle = null;
		this.$bodyNote = null;

	
	}



	// MARK: Init
	// -----------------------------------------------------
	async init() {
        if (this.isInitialized) {
            this.cleanup();
        }


		let license = await ajax_getOption('acex-license') || {};
		if ( license && license.key ) {
			this.key = license.key;
			this.status = license.status;
			this.email = license.email;
			this.expires = license.expires;
			this.plan = license.plan;
			this.end = license.end;
			this.activations = license.activations;
		}
        this.isInitialized = true;

		await this.check()



		
		
		$('body').off('click.licenseManager', '.acex-premium')
		$('body').on('click.licenseManager', '.acex-premium', async (e) => {
			//console.log('premium clicked', this.status)
			if ( this.status === 'active' ) return;
			e.stopPropagation();
			e.preventDefault();
			let r = await Modal.confirm(
				__('This is a premium feature. Upgrade to premium to use it?', 'actus-excel-for-woo'),
				__('Premium Feature', 'actus-excel-for-woo'),
				[{
					text: 'Upgrade Now',
					class: 'actus-btn-primary',
					onClick: (modal) => {
						modal.destroy();
						// Open upgrade page
						window.open('https://awexcel.actusanima.com/', '_blank');
					}
				}, {
					class: 'actus-modal-flex-1',
				}]
			);
			if (!r) return;

		});


		return;

	}





	// MARK: START
	// -----------------------------------------------------
	start() {
		
		this.$mainContainer.empty()
		this.licenseBody();
		this.license();
		setTimeout(() => {
			this.showStatus();
			this.licenseEvents();
		}, 10);



	}



    cleanup() {
        // Remove all namespaced events
        //$('body').off('.licenseManager');
        
        // Clear temporary DOM references (but keep main container)
        // this.$mainContainer is needed for re-initialization, don't null it
        this.$bodyContainer = null;
        this.$bodyHeader = null;
        this.$bodyTitle = null;
        this.$bodyNote = null;
        
        this.isInitialized = false;
			
    }



	

	

	

	// MARK: License Body
	// -----------------------------
	licenseBody() {

		this.$bodyContainer = $('<div class="acex-license-body">').appendTo( this.$mainContainer );
		this.$bodyHeader = $('<div class="acex-header-flex">').appendTo( this.$bodyContainer );
		this.$bodyTitle = $('<h2>').appendTo( this.$bodyHeader );
		this.$bodyNote = $('<p>').appendTo( this.$bodyHeader );
		this.$bodyContainer = $('<div class="acex-license-body-container">').appendTo( this.$bodyContainer );


		let HTML = `
			<div class="actus-section">
			<div class="actus-form-group">
				<label class="actus-label" for="license_key">License Key</label>
				<div class="actus-flex">
					<input type="text"
							class="actus-input"
							id="license_key"
							name="license_key"
							value="${this.key || ''}"
							autocomplete="off"
							placeholder="enter your license key">
					<div class="actus-chip acex-license-status"></div>
					<button class="actus-btn-big acex-test-button">Activate</button>
					<button class="actus-btn-big acex-deactivate-button">Deactivate</button>
				</div>

				<small class="actus-form-help"></small>
				<br>
				<a href="https://copyspell.ai/#home-pricing" target="_blank" rel="noopener" class="actus-btn actus-btn-outline acex-info-btn">Get License Key</a>
			</div>
			</div>`;

		setTimeout(() => {
			this.$bodyContainer.html( HTML );
			this.$status = this.$bodyContainer.find('.acex-license-status');
			this.$helpText = this.$bodyContainer.find('.actus-form-help');
			this.$testButton = this.$bodyContainer.find('.acex-test-button');
			this.$deactivateButton = this.$bodyContainer.find('.acex-deactivate-button');
			this.$infoButton = this.$bodyContainer.find('.acex-info-btn');
			this.$input = this.$bodyContainer.find('#license_key');
		}, 0);

	}








	// MARK: License
	// -----------------------------
	license() {


		this.$bodyTitle.text('License Management');
		this.$bodyNote.text('Manage your license key and activation status here.');
		this.$bodyContainer.empty();


		
	}
	


	// MARK: License Events
	// -----------------------------
	licenseEvents() {
		


		// Input change event
		this.$input.on('input', () => {
			this.$deactivateButton.hide();
			const licenseKey = this.$input.val().trim();
			if ( licenseKey ) {
				this.$testButton.show();
				this.$status.hide();
			} else {
				this.$testButton.hide();
				this.$status.show();
				this.status = 'no key';
				this.showStatus();
			}
			this.key = licenseKey;
		})

		


		// Test button
		this.$testButton.on('click', async (e) => {
			e.preventDefault();
			this.$testButton.prop('disabled', true);
			this.$testButton.html( DATA.SVG.loader );
			this.clearCache()
			const licenseKey = this.$input.val().trim();
			if (licenseKey) {
				// Call the function to check the license key
				await this.validate( licenseKey );
				this.$status.show();
				this.$testButton.text('Activate');
				this.$testButton.prop('disabled', false);
				this.$testButton.hide();
			}
			this.showStatus()
		});




		// Deactivate button
		this.$deactivateButton.on('click', async (e) => {
			e.preventDefault();
			let r = confirm('Are you sure you want to deactivate the license key?');
			if ( ! r ) return;
			this.$deactivateButton.prop('disabled', true);
			this.$deactivateButton.html( DATA.SVG.loader );
			this.clearCache()
			const licenseKey = this.$input.val().trim();
			this.$input.val('');
			this.key = '';
			if (licenseKey) {
				// Call the function to check the license key
				await this.deactivate(licenseKey);
				this.$status.show();
				this.$deactivateButton.text('Deactivate');
				this.$deactivateButton.prop('disabled', false);
				this.$deactivateButton.hide();
			}
			this.showStatus();
		});







	}





	// MARK: Show Status
	// -----------------------------
	async showStatus( status ) {
		if ( ! this.$input || ! this.$input.length ) return;

		this.$input.val( this.key || '' );
		status = status || this.status || 'no key';
		this.status = status;
		let statusText = status;
		let clss = '';

		// Format the expiration date as DD/MM/YYYY
		let expires = '';
		if (this.expires) {
			const date = new Date(this.expires);
			if (!isNaN(date)) {
				const day = String(date.getDate()).padStart(2, '0');
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const year = date.getFullYear();
				expires = `${day}/${month}/${year}`;
			} else {
				expires = this.expires;
			}
		}

		this.$infoButton.hide()
		this.$deactivateButton.hide()

		switch (status) {
			case 'active':
				statusText = 'Licensed to <b>' + this.email + '</b><br>'
				clss = 'actus-chip-green';
				if ( this.end ) {
					const endDate = new Date(this.end * 1000);
					if (!isNaN(endDate)) {
						const day = String(endDate.getDate()).padStart(2, '0');
						const month = String(endDate.getMonth() + 1).padStart(2, '0');
						const year = endDate.getFullYear();
						statusText += 'Expires <b>' + `${day}/${month}/${year}` + '</b><br>';
					} else {
						statusText += 'Expires <b>' + this.end + '</b><br>';
					}
					statusText += `<br><a href="https://billing.stripe.com/p/login/7sY14mfvofQ86Gbgtf2go00?prefilled_email=${this.email}" target="_blank" rel="noopener" class="aai-btn-2 aai-btn-2-primary">Manage Subscription</a>`
				}
				if ( this.activations ) {
					statusText += 'Activations <b>' + this.activations + '</b>';
				}
				break;
			case 'inactive':
				statusText = 'Inactive License Key';
				clss = 'actus-chip-red';
				break;
			case 'expired':
				statusText = 'Expired License Key';
				statusText += `<br><br><a href="https://billing.stripe.com/p/login/7sY14mfvofQ86Gbgtf2go00?prefilled_email=${this.email}" target="_blank" rel="noopener" class="aai-btn-2 aai-btn-2-primary">Renew Subscription</a>`
				clss = 'actus-chip-red';
				break;
			case 'invalid':
				statusText = 'Invalid License Key';
				clss = 'actus-chip-red';
				break;
			case 'deactivated':
				statusText = 'Deactivated License Key';
				clss = 'actus-chip-orange';
				break;
			case 'revoked':
				statusText = 'Revoked License Key';
				clss = 'actus-chip-red';
				break;
			case 'no key':
			default:
				statusText = 'No License Key';
				clss = 'actus-chip-purple';
				break;
		}

		
		if ( status != 'active' && status != 'expired' ) this.$infoButton.show();
		else if ( status == 'active' ) this.$deactivateButton.show();


		if ( status == 'deactivated' && this.key ) {
			this.$testButton.show();
		}

//console.log('License Status:', statusText);

		this.$helpText.html( statusText );
		this.$status
			.removeClass().addClass(`acex-license-status actus-chip ${clss}`)
			.html( status.replace(/\s+/g, ' ') )

	}





	// MARK: Clear Cache
	// -----------------------------------------------------
	clearCache() {
		localStorage.removeItem(CACHE_KEY);
	}





	// MARK: Check
	// -----------------------------------------------------
	async check( modal = false ) {

		// Wait until initialized before proceeding
		if (!this.isInitialized) {
			await new Promise(resolve => {
				const checkInit = () => {
					if (this.isInitialized) return resolve();
					setTimeout(checkInit, 50);
				};
				checkInit();
			});
		}

		let check;


		if ( ! this.key ) {

			$('.acex-admin').removeClass('acex-is-premium');
			$('.acex-admin').addClass('acex-is-lite');
		
		} else {
		
		
			// Check cache
			let cachedData = localStorage.getItem(CACHE_KEY) || '{}';
			logg('check', cachedData)
			//cachedData = null;
			if (cachedData) {
				cachedData = JSON.parse(cachedData);
				const { timestamp, data, status } = cachedData;
				if ( status ) {
					if (Date.now() - timestamp < CACHE_DURATION) {
						check = data;
					}
				}
			}
			

			if (typeof check === 'undefined') {

				cachedData = cachedData || {};

				//let diff = Math.floor((Date.now() - (cachedData.timestamp || 0)) / 1000)

				logg('check', this.status)
				// Revalidate every 15 minutes if not active
				if ( this.status !== 'active' &&
					Date.now() - (cachedData.timestamp || 0) < RETRY_DURATION ) {

					$('.acex-admin').removeClass('acex-is-premium');
					$('.acex-admin').addClass('acex-is-lite');
										
				} else {
				

					let license = await ajax_getOption('acex-license') || {};
					check = await this.validate( license?.key );
					license = await ajax_getOption('acex-license') || {};
				
					logg('check', license)
					
					//console.log('-------- license', license)

					localStorage.setItem(CACHE_KEY, JSON.stringify({
						timestamp: Date.now(),
						status: license.status,
						data: check
					}));

				}
			}


				
			$('.acex-admin').removeClass('acex-is-lite acex-is-premium');
			if ( ! check ) {
				$('.acex-admin').addClass('acex-is-lite');
			} else {
				$('.acex-admin').addClass('acex-is-premium');
			}


		}



		

		if ( ! check && modal ) {
			
			let message = __('Upgrade to the Premium version to unlock all features.', 'actus-excel-for-woo');
			if ( typeof modal === 'string' ) message = modal;
			let confirmed = await Modal.confirm(
				message,
				__('Upgrade to Premium', 'actus-excel-for-woo'),
				'Upgrade Now',
			);
			if ( confirmed ) window.open('https://awexcel.actusanima.com/', '_blank');
			
			return;
		}



		//console.log('---------- check', check)
		return check;

	}




	
	// MARK: Validate
	// -----------------------------------------------------
	async validate( key ) {
		
		key = key || this.key;
		if ( !key ) return false
		this.key = key;
	
		let data = {};
	
		try {
	
			// API call
			const response = await fetch(DATA.license_api_url + '/validate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					licenseKey: key,
					siteUrl: DATA.siteUrl,
					pluginId: 'actus-excel-for-woo',
				})
			});
			data = await response.json();
			this.email = data.email || '';
			this.expires = data.expires || '';
			this.activations = ''
			this.isSiteActivated = data.isSiteActivated || false;
			this.plan = data.plan || '';
			this.end = data.end || null;
	
			// Success
			if (response.ok && data.success) {
				//console.log("License validation OK:", data);
	
				this.status = data.status
	
				if ( data.maxActivations && data.maxActivations > 1 ) {
					this.activations = this.activationsCount + ' / ' + this.maxActivations;
				}
		
	
			// Error
			} else {
				
				//console.log("License validation failed:", data);
				this.status = 'inactive';
				if (data.code == "NOT_FOUND") this.status = 'invalid';
				if (data.code == "EXPIRED") this.status = 'expired';
				if (data.code == "DEACTIVATED") this.status = 'deactivated';
				if (data.code == "REVOKED") this.status = 'inactive';
				if (data.code == "MAX_ACTIVATIONS") this.status = 'max activations reached';
				if (data.code == "EXPIRED_TRIAL") this.status = 'expired trial';

			}
	
	
	
		// Catch network or API errors
		} catch (error) {
	
			console.error('Network or API error:', error);
			this.status = 'inactive';
	
		// Finalize
		} finally {
	
			await ajax_saveOption('acex-license', {
				key: key,
				status: this.status,
				email: this.email,
				expires: this.expires,
				activations: this.activations,
				plan: this.plan,
				end: this.end,
			})
			await ajax_saveOption('acex-license-status', {
				status: this.status,
				expires: this.expires,
				activationsCount: data.activationsCount,
				maxActivations: data.maxActivations,
			})
			this.showStatus()
	
			//activateButton.prop('disabled', false).text('Activate License');
			//deactivateButton.prop('disabled', false);
		}
	
		let check = false
		if ( this.status == 'active' ) check = true
	
	
		localStorage.setItem(CACHE_KEY, JSON.stringify({
			timestamp: Date.now(),
			data: check
		}));
	
		return check;
	
	}
	
	



	// MARK: Deactivate
	// -----------------------------------------------------
	async deactivate( key ) {
		key = key || this.key;
		if ( !key ) return false
		this.key = key;

		let data = {};

		try {
	
			// API call
			const response = await fetch(DATA.license_api_url + '/license/deactivate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					licenseKey: key,
					siteUrl: DATA.siteUrl,
					pluginId: 'actus-excel-for-woo',
				})
			});
			data = await response.json();
	
			
			this.key = '';
			this.status = 'no key';
			this.activations = data.activationsCount + ' / ' + data.maxActivations;

			this.showStatus()
			await ajax_saveOption('acex-license', {
				key: this.key,
				status: this.status,
				email: this.email,
				expires: this.expires,
				activations: this.activations,
				plan: this.plan,
				end: this.end,
			})
			await ajax_saveOption('acex-license-status', {
				status: 'no key',
				expires: data.expires || '',
				activationsCount: data.activationsCount,
				maxActivations: data.maxActivations,
			})
	
	
	
	
		// Catch network or API errors
		} catch (error) {
	
			console.error('Network or API error:', error);
	
		}
	
		return data;

	}




	// MARK: Set Free
	// -----------------------------------------------------
	setFree() {

		this.free.groups = [ 
			'core', 'pricing', 'stock', 'shipping', 'attributes',
		]
		this.free.props = [ 
			'id', 'name', 'slug', 'status', 'type', 'description', 'short_description', 'date_created', // 'date_modified', 'author_id',
			'price', 'regular_price', 'sale_price', // 'date_on_sale_from', 'date_on_sale_to', 'total_sales', 'tax_status', 'tax_class',
			'sku', 'manage_stock', 'stock_quantity', 'stock_status', //'backorders', 'sold_individually', 'low_stock_amount',
			'weight', 'length', 'width', 'height', // 'shipping_class',
			// Virtual / Downloadable
			// Linked Products
			// External
			// Images
			// Miscellaneous
			// Attributes / Variations
			'attributes', 'attribute_values', 'parent_id',
			// Taxonomies
			// Meta Data
		]
		this.free.filters = [
			'status', 'type', 'created', 'modified',
			'categories',
			'price',
		]


		return this.free;

	}


}






// -----------------------------------------------------
export default new LicenseManager();





