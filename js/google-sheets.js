import Modal 			from './Modal.js';
import ExportToExcel 	from './export-to-excel.js';
import ExportTemplates 	from './export-templates.js';
import SelectProducts 	from './select-products.js';
import LicenseManager   from './license.js';
// -----------------------------------------------------




const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
const { __ } = wp.i18n;
// -----------------------------------------------------







class GoogleSheets {

	constructor() {

		this.clientId = '223138436133-bdhlmsj90t6rjhmv0vas42qu2cqtrb58.apps.googleusercontent.com';
		this.scopes = {
			drive: [
				'https://www.googleapis.com/auth/drive.file',
				'https://www.googleapis.com/auth/spreadsheets'
			],
			ai: [
				'https://www.googleapis.com/auth/generative-language',
				'openid',
				'email',
				'profile'
			]
		}
		this.discoveryDocs = [
			'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
			'https://sheets.googleapis.com/$discovery/rest?version=v4'
		];
		this.redirectUri = 'urn:ietf:wg:oauth:2.0:oob'; // special desktop redirect
		this.status = null
		
		// Simple cache
		this.connectionCache = null;
		this.cacheTime = null;

		this.init();

	}


	init() {
		
		document.addEventListener('DOMContentLoaded', async () => {
			await this.showStatus();
		});

	}




	// MARK: ACEX Callback
	// -----------------------------------------------------
	async acexCallback() {
		// Read URL parameters
		const urlParams = new URLSearchParams(window.location.search);
		const params = {};
		for (const [key, value] of urlParams.entries()) {
			params[key] = value;
		}
	
		// Clean up the URL
		const pageParam = urlParams.get('page');
		let newUrl = window.location.pathname;
		if (pageParam) {
			newUrl += '?page=' + encodeURIComponent(pageParam);
		}
		window.history.replaceState({}, document.title, newUrl);


	
		// Save the connected status to preferences
		DATA.prefs.google_connected = true;
		DATA.prefs.google_connected_at = Date.now();
		DATA.prefs.save();


		
		// Google OAuth completed
		// -----------------------------------------------------
		if ( params.status === 'acex_google_ready' ) {

				
			let confirmed = await Modal.confirm(
				'Export Products to Google Sheets',
				'Google Connected',
			)

			if (!confirmed) { return 'error' }

			await ExportToExcel.export( ExportTemplates.template, SelectProducts, true );

		}


		

		// Load file from Google Drive
		// -----------------------------------------------------
		if ( params.status === 'acex_google_load_file' ) {


		}





	}





	// MARK: OAuth Start
	// -----------------------------------------------------
	async OAuth( callback_flag = 'acex_google_ready', scope = 'drive', force = false ) {

		
		this.check = await LicenseManager.check('Upgrade to the Premium version to use Google Sheets integration.')
		if ( ! this.check ) return;


        // Check if already connected
		const connected = await this.isConnected();
		if (connected && connected.connected && !force) {
			return Promise.resolve({
				success: true,
				message: 'Already connected',
				callback_flag
			});
		}
		
		// Show reassuring modal before OAuth
		const confirmed = await Modal.confirm(
			this.modalBody(),
			'Connect to Google Sheets',
			[],
			'medium'
		);
		
		if (!confirmed) {
			return { success: false, message: 'User cancelled' };
		}
		

		// Clear any previous OAuth state
		localStorage.removeItem('acex_oauth_result');

		
		const redirect = window.location.origin + '/wp-admin/admin-post.php?callback_flag=' + encodeURIComponent(callback_flag);
		const oauthUrl = `https://license.actusanima.com/api/oauth/start?wp_site=${encodeURIComponent(window.location.origin)}&redirect=${encodeURIComponent(redirect)}&scope=${encodeURIComponent(scope)}`;


		// Open popup window
		const popup = window.open(
			oauthUrl,
			'GoogleOAuth',
			'width=600,height=700,left=200,top=100'
		);

		if (!popup) {
			Modal.alert('Please allow popups for this site to connect to Google.', 'Popup Blocked');
			return { success: false, message: 'Popup blocked' };
		}

		// Wait for OAuth completion
		return new Promise((resolve) => {
			let resolved = false;
			
			// Poll localStorage for result - increased frequency
			const pollInterval = setInterval(() => {
				const result = localStorage.getItem('acex_oauth_result');
				
				if (result) {
					clearInterval(pollInterval);
					clearInterval(checkPopupInterval);
					
					if (resolved) return;
					resolved = true;
					
					// Clear the result
					localStorage.removeItem('acex_oauth_result');
					
					const data = JSON.parse(result);
					//console.log('✓ OAuth completed:', data.type);
					
					// Close popup if still open
					setTimeout(() => {
						if (popup && !popup.closed) {
							popup.close();
						}
					}, 500);
					
					if (data.type === 'acex_oauth_success') {
						// Clear cache to force refresh
						this.connectionCache = null;
						this.cacheTime = null;
						
						// Save to prefs
						DATA.prefs.google_connected = true;
						DATA.prefs.google_connected_at = Date.now();
						DATA.prefs.save();
						
						// Update UI
						this.showStatus();
						
						resolve({
							success: true,
							message: 'Connected to Google',
							callback_flag: callback_flag,
						});
					} else {
						Modal.alert(data.message || 'OAuth failed', 'Connection Failed');
						resolve({ success: false, message: data.message });
					}
				}
			}, 300); // Poll every 300ms for faster response
			
			// Check if popup was closed by user
			let checkCount = 0;
			let lastPopupCheck = Date.now();
			const checkPopupInterval = setInterval(() => {
				checkCount++;
				
				// Don't check for the first 10 seconds to allow OAuth flow to complete
				// This prevents false positives during navigation
				if (checkCount < 20) {
					return;
				}
				
				// Throttle checks to avoid excessive cross-origin errors
				const now = Date.now();
				if (now - lastPopupCheck < 1000) {
					return;
				}
				lastPopupCheck = now;
				
				try {
					// Use a more reliable method to check if popup is closed
					// Check both popup.closed and if window is still valid
					if (!popup || popup.closed || popup.window === null) {
						clearInterval(checkPopupInterval);
						clearInterval(pollInterval);
						
						if (resolved) return;
						resolved = true;
						
						// Check one final time for result with a delay
						setTimeout(() => {
							const finalResult = localStorage.getItem('acex_oauth_result');
							if (finalResult) {
								localStorage.removeItem('acex_oauth_result');
								const data = JSON.parse(finalResult);
								
								if (data.type === 'acex_oauth_success') {
									this.connectionCache = null;
									this.cacheTime = null;
									DATA.prefs.google_connected = true;
									DATA.prefs.google_connected_at = Date.now();
									DATA.prefs.save();
									this.showStatus();
									
									resolve({
										success: true,
										message: 'Connected to Google',
										callback_flag: callback_flag,
									});
								} else {
									Modal.alert(data.message || 'OAuth failed', 'Connection Failed');
									resolve({ success: false, message: data.message });
								}
							} else {
								console.log('⚠ OAuth window closed without completion');
								resolve({ success: false, message: 'Authentication cancelled' });
							}
						}, 500); // Increased delay to 500ms for final check
					}
				} catch (e) {
					// Ignore cross-origin errors during navigation
					// These are expected when popup navigates to Google's OAuth page
				}
			}, 1000); // Check every 1 second instead of 500ms
		});

	}



	

	// MARK: OAuth Local
	// -----------------------------------------------------
	OAuthLocal( scopes = 'drive' ) {

		const params = new URLSearchParams({
			client_id: this.clientId,
			redirect_uri: this.redirectUri,
			response_type: 'code',
			scope: this.scopes[ scopes ].join(' '),
			access_type: 'offline',
			prompt: 'consent'
		});
		const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

		window.location.href = authUrl;

		
	}

























	// MARK: isConnected
	// Check if user is connected to Google Drive
	// -----------------------------------------------------
	async isConnected() {

		this.check = await LicenseManager.check('Upgrade to the Premium version to use Google Sheets integration.')
		if ( ! this.check ) return;


		// Use cache if less than 5 minutes old
		if (this.connectionCache && this.cacheTime && (Date.now() - this.cacheTime < 300000)) {
			return this.connectionCache;
		}
		
		try {
			const response = await fetch(DATA.ajax_url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					action: 'actus_google_drive_check',
					nonce: DATA.nonce
				})
			});

			const result = await response.json();

			//console.log('Google Connection Check Result:', result.data);

			if (result.success) {
				// User is connected - update prefs and cache
				DATA.prefs.google_connected = true;
				DATA.prefs.google_connected_at = Date.now();
				DATA.prefs.save();
				
				this.connectionCache = {
					connected: true,
					email: result.data.email,
					name: result.data.name,
					picture: result.data.picture
				};
				this.cacheTime = Date.now();
				
				return this.connectionCache;


			} else {
				// User is not connected - update prefs and clear cache
				DATA.prefs.google_connected = false;
				delete DATA.prefs.google_connected_at;
				DATA.prefs.save();
				
				this.connectionCache = {
					connected: false,
					message: result.data.message,
					status: result.data.status
				};
				this.cacheTime = Date.now();
				
				return this.connectionCache;
			}
		} catch (error) {
			console.error('Error checking Google connection:', error);
			return {
				connected: false,
				message: 'Network error',
				status: 'error'
			};
		}
	}





	// MARK: Show Status
	// Display Google connection status in the UI
	// -----------------------------------------------------
	async showStatus() {
		this.check = await LicenseManager.check()
		if ( ! this.check ) return;


		const container = document.querySelector('.acex-google-status-container');
		if (!container) return;
		
		const status = await this.isConnected();
		
		if (!status.connected) {
			container.innerHTML = '';
			return;
		}
		
		const avatarUrl = status.picture || 'https://www.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png';
		
		container.innerHTML = `
			<div class="google-status-connected">
				<div class="google-status-info">
					<img src="${avatarUrl}" alt="Google Avatar" class="google-avatar" />
					<div class="google-user-details">
						<span class="google-connected-label">
							Google Connected
						</span>
						<span class="google-email">${status.email}</span>
					</div>
				</div>
				<button class="google-disconnect-btn" title="Disconnect from Google Sheets">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10" stroke-width="2" stroke-linecap="round"/>
					</svg>
					Disconnect
				</button>
			</div>
		`;
		
		// Add disconnect handler
		const disconnectBtn = container.querySelector('.google-disconnect-btn');
		disconnectBtn.addEventListener('click', async (e) => {
			e.preventDefault();
			
			const confirmed = await Modal.confirm(
				`<p>
					This will remove the connection to your Google account.<br>
					You can reconnect anytime.
				</p>`,
				'Disconnect from Google Sheets?',
				'Disconnect'
			);
			
			if (confirmed) {
				disconnectBtn.disabled = true;
				disconnectBtn.innerHTML = '<span style="opacity:0.6">Disconnecting...</span>';
				
				const result = await this.disconnect();
				
				if (result.success) {
					Modal.alert(
						'Successfully disconnected from Google Sheets.',
						'Disconnected',
					);
					container.innerHTML = '';
				} else {
					Modal.alert(
						result.message || 'Failed to disconnect. Please try again.',
						'Error',
					);
					disconnectBtn.disabled = false;
					disconnectBtn.innerHTML = `
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<path d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10" stroke-width="2" stroke-linecap="round"/>
						</svg>
						Disconnect
					`;
				}
			}
		});
	}




	// MARK: Disconnect
	// Disconnect from Google Drive and clear all data
	// -----------------------------------------------------
	async disconnect() {
		try {
			const response = await fetch(DATA.ajax_url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					action: 'actus_google_disconnect',
					nonce: DATA.nonce
				})
			});

			const result = await response.json();

			if (result.success) {
				// Clear cache
				this.connectionCache = null;
				this.cacheTime = null;
				
				// Clear prefs
				DATA.prefs.google_connected = false;
				delete DATA.prefs.google_connected_at;
				DATA.prefs.save();
				
				console.log('Disconnected from Google Sheets');
				
				return {
					success: true,
					message: 'Disconnected successfully'
				};
			} else {
				throw new Error(result.data.message || 'Disconnect failed');
			}
		} catch (error) {
			console.error('Error disconnecting from Google Sheets:', error);
			
			// Clear local data anyway, even if server call failed
			this.connectionCache = null;
			this.cacheTime = null;
			DATA.prefs.google_connected = false;
			delete DATA.prefs.google_connected_at;
			DATA.prefs.save();
			
			return {
				success: false,
				message: error.message
			};
		}
	}












	// MARK: Generate AI Response
	// -----------------------------
	async genAI() {

	
		// Create FormData to upload file
		const formData = new FormData();
		formData.append('action', 'acex_aicall');
		formData.append('nonce', acex_phpDATA?.nonce || '');
		formData.append('prompt', 'test');

		const AIResponse = await fetch(acex_phpDATA.ajax_url, {
			method: 'POST',
			body: formData
		});

console.log('AI Response:', AIResponse);
		const result = await AIResponse.json();

console.log('AI Response:', result);

		return result;
		

	}





	// MARK: Load File from Google Drive
	// -----------------------------
	async loadFile( fileId ) {
		
		let auth = await this.OAuth('acex_google_load_file')
		//if ( ! auth || auth.callback_flag !== 'acex_google_load_file' ) {
		if ( ! auth || ! auth.success ) {
			return;
		}

		

		const formData = new FormData();
		formData.append('action', 'acex_load_google_sheet');
		formData.append('nonce', acex_phpDATA?.nonce || '');
		formData.append('fileid', fileId);

		const response = await fetch(acex_phpDATA.ajax_url, {
			method: 'POST',
			body: formData
		});

		const result = await response.json();

		if (!result.success) {
			console.error('Failed to load Google Sheet:', result);
			return null;
		}

		// Convert base64 content back to File object
		const fileData = result.data;
		const binaryString = atob(fileData.content);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		const blob = new Blob([bytes], { type: fileData.type });
		const file = new File([blob], fileData.name, { type: fileData.type });

		return file;
	}




	// MARK: Delete File from Google Drive
	// -----------------------------
	async deleteFile( fileId ) {

		let auth = await this.OAuth('acex_google_delete_file')
		if ( ! auth || ! auth.success ) return;
		

		const formData = new FormData();
		formData.append('action', 'acex_delete_google_sheet');
		formData.append('nonce', acex_phpDATA?.nonce || '');
		formData.append('fileid', fileId);

		const response = await fetch(acex_phpDATA.ajax_url, {
			method: 'POST',
			body: formData
		});

		const result = await response.json();

		if (!result.success) {
			console.error('Failed to delete Google Sheet:', result);
			return null;
		}

		return true;
	}





	// MARK: Upload Workbook to Google Sheets
	// -----------------------------
	async uploadToGoogleSheets(workbook, filename) {
		try {
			// Generate buffer from workbook
			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], { 
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
			});

			// Create FormData to upload file
			const formData = new FormData();
			formData.append('action', 'acex_upload_xlsx_to_google');
			formData.append('nonce', acex_phpDATA?.nonce || '');
			formData.append('file', blob, filename);
			formData.append('sheet_name', filename.replace('.xlsx', ''));

			// Upload file to server first
			const uploadResponse = await fetch(acex_phpDATA.ajax_url, {
				method: 'POST',
				body: formData
			});

			const uploadResult = await uploadResponse.json();

			if (uploadResult.success) {
				return {
					success: true,
					sheetId: uploadResult.data.sheet_id,
					message: 'File uploaded to Google Sheets successfully'
				};
			} else {
				throw new Error(uploadResult.data.message || 'Upload failed');
			}

		} catch (error) {
			console.error('Error uploading to Google Sheets:', error);
			return {
				success: false,
				message: error.message
			};
		}
	}





	modalBody() {
		return `
<div class="google-auth-info">

	<div class="oauth-header">
		<svg class="oauth-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
			<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
		<h3>Before you continue...</h3>
	</div>

	<p class="oauth-intro">
		You’ll be redirected to Google to grant permissions<br>
		<strong>This is safe</strong> and handled securely by Google.
	</p>


	<div class="oauth-section">
		<h4>🔐 Why We Need Access</h4>
		<p>We need permission to <strong>create new Google Sheets</strong> so you can export your product data directly to your Drive.</p>
	</div>

	<div class="privacy-note">
		🔒 <strong>Your data stays private and secure</strong>
	</div>


	<div class="oauth-section oauth-section-safe">
		<h4>✓ We DON'T</h4>
		<ul>
			<li><strong>Access existing files</strong> — We can't see or touch your documents, photos, or other files</li>
			<li><strong>Read personal data</strong> — We only receive your email to identify you</li>
			<li><strong>Store credentials</strong> — Google handles all authentication securely</li>
			<li><strong>Share information</strong> — Your data never leaves your Google account and WordPress site</li>
		</ul>
	</div>

	<div class="oauth-section oauth-section-do">
		<h4>✓ We DO</h4>
		<ul>
			<li>Create <strong>new spreadsheet files</strong> when you click export</li>
			<li>Access <strong>only the files we create</strong></li>
			<li>Use <strong>Google's official OAuth</strong> (the gold standard for security)</li>
			<li>Let you disconnect anytime from your dashboard</li>
		</ul>
	</div>
		
	<div class="privacy-note">
		🔒 <strong>Your data stays private and secure</strong>
	</div>
</div>`
	}


}







export default new GoogleSheets();