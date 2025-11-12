<?php
if ( ! defined( 'ABSPATH' ) ) exit;








class ACEX_License {
	private $option_name = 'acex_license_key';
    private $api_base = ACEX_LICENSE_API_URL;
	private $plugin_id = ACEX_PLUGIN_SLUG;


	public function __construct() {
		add_action('admin_menu', [ $this, 'add_license_menu' ]);
		add_action('admin_post_acex_validate_license', [ $this, 'handle_validate_license' ]);
		add_action('admin_post_acex_deactivate_license', [ $this, 'handle_deactivate_license' ]);
		
		// AJAX endpoints
		add_action('wp_ajax_acex_verify_license', [ $this, 'ajax_verify_license' ]);
		add_action('wp_ajax_acex_deactivate_license', [ $this, 'ajax_deactivate_license' ]);
		add_action('wp_ajax_acex_check_premium', [ $this, 'ajax_check_premium' ]);
	}



	// MARK: Admin Menu
	// Add license menu to WP admin
    public function add_license_menu() {
        add_options_page(
            'Actus Excel for WooCommerce License',
            'Actus Excel for WooCommerce',
            'manage_options',
            'actus-excel-for-woo-license',
            [ $this, 'license_page' ]
        );
    }



	// MARK: UI
	// License management page
    public function license_page() {
		$license_key = get_option( $this->option_name );
        ?>
        <div class="wrap">
            <h2>Actus Excel for WooCommerce License</h2>

            <form method="post" action="<?php echo esc_url( admin_url('admin-post.php') ); ?>">
				<input type="hidden" name="action" value="acex_validate_license">
				<?php wp_nonce_field('acex_license_action', 'acex_license_nonce'); ?>
				<p>
					<label for="license_key">License Key:</label><br>
					<input type="text" id="license_key" name="license_key" value="<?php echo esc_attr( $license_key ); ?>" style="width:300px;">
				</p>
				<p>
					<button type="submit" class="button button-primary">Validate License</button>
				</p>
			</form>

			<form method="post" action="<?php echo esc_url( admin_url('admin-post.php') ); ?>" style="margin-top:20px;">
				<input type="hidden" name="action" value="acex_deactivate_license">
				<?php wp_nonce_field('acex_license_action', 'acex_license_nonce'); ?>
				<p>
					<button type="submit" class="button">Deactivate License</button>
				</p>
			</form>
		</div>
        <?php
    }

 

	// MARK: Submit
	// Handle form submission
    public function maybe_handle_form() {
        if ( ! isset($_POST['acex_license_key']) || ! check_admin_referer('acex_license_nonce') ) return;

        $key = sanitize_text_field(wp_unslash($_POST['acex_license_key']));
        update_option($this->option_key, $key);

        if ( isset($_POST['acex_deactivate']) ) {
            $this->deactivate_license();
        } else {
            $this->verify_license();
        }

        add_settings_error('acex_license', 'acex_license_saved', 'License status updated.', 'updated');
    }




	// MARK: Validation
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// Validate License Key via API
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	private function validate_license_key( $license_key ) {
		$response = wp_remote_post( "{$this->api_base}/validate", [
			'headers' => [ 'Content-Type' => 'application/json' ],
			'body'    => wp_json_encode([
				'licenseKey' => $license_key,
				'siteUrl'    => get_site_url(),
				'pluginId'   => $this->plugin_id,
			]),
			'timeout' => 15,
		]);

		if ( is_wp_error( $response ) ) {
			return [
				'success' => false,
				'error'   => $response->get_error_message(),
			];
		}

		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		return $data ?: [ 'success' => false, 'message' => 'Invalid response' ];
	}




	// MARK: Validation Handlers
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// Handle License Validation
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	public function handle_validate_license() {
		if ( ! current_user_can('manage_options') || ! check_admin_referer('acex_license_action', 'acex_license_nonce') ) {
			wp_die('Unauthorized');
		}

		$license_key = sanitize_text_field( wp_unslash( $_POST['license_key'] ?? '' ) );

		if ( ! $license_key ) {
			wp_redirect( add_query_arg('msg', 'missing', wp_get_referer()) );
			exit;
		}

		update_option( $this->option_name, $license_key );

		$result = $this->validate_license_key( $license_key );

		if ( isset( $result['error'] ) ) {
			$this->add_admin_notice('Connection error: ' . $result['error'], 'error');
		} elseif ( isset($result['success']) && $result['success'] ) {
			$expires = $result['expires'] ?? 'never';
			set_transient( 'acex_license_status', 'valid', DAY_IN_SECONDS );
			$this->add_admin_notice("✅ License validated successfully. Expires: {$expires}", 'success');
		} else {
			$msg = $result['message'] ?? 'Invalid license.';
			delete_transient( 'acex_license_status' );
			$this->add_admin_notice("❌ {$msg}", 'error');
		}

		wp_redirect( wp_get_referer() );
		exit;
	}




	// MARK: Deactivation Handlers
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// Handle License Deactivation
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	public function handle_deactivate_license() {
		if ( ! current_user_can('manage_options') || ! check_admin_referer('acex_license_action', 'acex_license_nonce') ) {
			wp_die('Unauthorized');
		}

		$license_key = get_option( $this->option_name );

		if ( ! $license_key ) {
			$this->add_admin_notice('No license key found to deactivate.', 'error');
			wp_redirect( wp_get_referer() );
			exit;
		}

		$response = wp_remote_post( "{$this->api_base}/deactivate", [
			'headers' => [ 'Content-Type' => 'application/json' ],
			'body'    => wp_json_encode([
				'licenseKey' => $license_key,
				'siteUrl'    => get_site_url(),
				'pluginId'   => $this->plugin_id,
			]),
			'timeout' => 15,
		]);

		if ( is_wp_error( $response ) ) {
			$this->add_admin_notice('Connection error: ' . $response->get_error_message(), 'error');
		} else {
			$data = json_decode( wp_remote_retrieve_body( $response ), true );

			if ( isset($data['success']) && $data['success'] ) {
				delete_option( $this->option_name );
				$this->add_admin_notice("🔓 License deactivated successfully.", 'success');
			} else {
				$msg = $data['message'] ?? 'Deactivation failed.';
				$this->add_admin_notice("❌ {$msg}", 'error');
			}
		}

		wp_redirect( wp_get_referer() );
		exit;
	}



	// MARK: is Premium
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// Check if Premium License is Active
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	public function is_premium() {
		$license_key = get_option( $this->option_name );
		
		if ( empty( $license_key ) ) {
			return false;
		}

		// Check if we have a cached validation status
		$cached_status = get_transient( 'acex_license_status' );
		if ( $cached_status !== false ) {
			return $cached_status === 'valid';
		}

		// Verify with API using shared validation method
		$result = $this->validate_license_key( $license_key );
		$is_valid = isset( $result['success'] ) && $result['success'];

		// Cache the result for 24 hours
		set_transient( 'acex_license_status', $is_valid ? 'valid' : 'invalid', DAY_IN_SECONDS );

		return $is_valid;
	}




	

	// MARK: AJAX Verify
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// AJAX: Verify/Validate License
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	public function ajax_verify_license() {
		check_ajax_referer( 'acex_license_ajax', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( [ 'message' => 'Unauthorized' ], 403 );
		}

		$license_key = sanitize_text_field( wp_unslash( $_POST['license_key'] ?? '' ) );

		if ( empty( $license_key ) ) {
			wp_send_json_error( [ 'message' => 'License key is required' ], 400 );
		}

		update_option( $this->option_name, $license_key );

		$result = $this->validate_license_key( $license_key );

		if ( isset( $result['error'] ) ) {
			wp_send_json_error( [ 
				'message' => 'Connection error: ' . $result['error'] 
			], 500 );
		}

		if ( isset( $result['success'] ) && $result['success'] ) {
			set_transient( 'acex_license_status', 'valid', DAY_IN_SECONDS );
			wp_send_json_success( [
				'message' => 'License validated successfully',
				'expires' => $result['expires'] ?? 'never',
				'data'    => $result
			] );
		} else {
			delete_transient( 'acex_license_status' );
			wp_send_json_error( [
				'message' => $result['message'] ?? 'Invalid license'
			], 400 );
		}
	}



	// MARK: AJAX Deactivate
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// AJAX: Deactivate License
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	public function ajax_deactivate_license() {
		check_ajax_referer( 'acex_license_ajax', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( [ 'message' => 'Unauthorized' ], 403 );
		}

		$license_key = get_option( $this->option_name );

		if ( empty( $license_key ) ) {
			wp_send_json_error( [ 'message' => 'No license key found to deactivate' ], 404 );
		}

		$response = wp_remote_post( "{$this->api_base}/deactivate", [
			'headers' => [ 'Content-Type' => 'application/json' ],
			'body'    => wp_json_encode([
				'licenseKey' => $license_key,
				'siteUrl'    => get_site_url(),
				'pluginId'   => $this->plugin_id,
			]),
			'timeout' => 15,
		]);

		if ( is_wp_error( $response ) ) {
			wp_send_json_error( [ 
				'message' => 'Connection error: ' . $response->get_error_message() 
			], 500 );
		}

		$data = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( isset( $data['success'] ) && $data['success'] ) {
			delete_option( $this->option_name );
			delete_transient( 'acex_license_status' );
			wp_send_json_success( [
				'message' => 'License deactivated successfully',
				'data'    => $data
			] );
		} else {
			wp_send_json_error( [
				'message' => $data['message'] ?? 'Deactivation failed'
			], 400 );
		}
	}



	// MARK: AJAX Premium Check
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// AJAX: Check if Premium License is Active
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	public function ajax_check_premium() {
		check_ajax_referer( 'acex_license_ajax', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( [ 'message' => 'Unauthorized' ], 403 );
		}

		$is_premium = $this->is_premium();

		wp_send_json_success( [
			'is_premium'  => $is_premium,
			'license_key' => $is_premium ? get_option( $this->option_name ) : null,
			'message'     => $is_premium ? 'Premium license is active' : 'No valid premium license'
		] );
	}





	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	private function add_admin_notice($message, $type = 'info') {
		add_action('admin_notices', function() use ($message, $type) {
			printf('<div class="notice notice-%s is-dismissible"><p>%s</p></div>', esc_attr($type), esc_html($message));
		});
	}



}


