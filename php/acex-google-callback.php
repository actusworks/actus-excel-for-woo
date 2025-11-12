<?php
// This page runs in the popup window after OAuth redirect
// Tokens are saved by actus_google_oauth_callback() before this page is included

$access_token = isset($_GET['access_token']) ? sanitize_text_field(wp_unslash($_GET['access_token'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- OAuth callback from external Google redirect, no nonce possible
$refresh_token = isset($_GET['refresh_token']) ? sanitize_text_field(wp_unslash($_GET['refresh_token'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- OAuth callback from external Google redirect, no nonce possible
$callback_flag = isset($_GET['callback_flag']) ? sanitize_text_field(wp_unslash($_GET['callback_flag'])) : 'acex_google_ready'; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- OAuth callback from external Google redirect, no nonce possible
$error = isset($_GET['error']) ? sanitize_text_field(wp_unslash($_GET['error'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- OAuth callback from external Google redirect, no nonce possible

// Determine if tokens were saved successfully
$tokens_saved = !empty($access_token) && !empty($refresh_token) && !$error;
?>
<!DOCTYPE html>
<html>
<head>
    <title>Google OAuth</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #f0f0f1;
        }
        .message {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            max-width: 400px;
        }
        .spinner {
            width: 40px;
            height: 40px;
            margin: 0 auto 20px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #2271b1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .success { color: #00a32a; }
        .error { color: #d63638; }
    </style>
</head>
<body>
    <div class="message">
        <?php if ($error): ?>
            <div class="error">
                <h2>❌ Authentication Failed</h2>
                <p><?php echo esc_html($error); ?></p>
            </div>
        <?php elseif ($tokens_saved): ?>
            <div class="spinner"></div>
            <div class="success">
                <p>✓ Authentication successful!</p>
                <p style="font-size: 12px; color: #666;">Completing setup...</p>
            </div>
        <?php else: ?>
            <div class="error">
                <p>❌ Authentication failed</p>
                <p style="font-size: 12px; color: #666;">Missing authentication data</p>
            </div>
        <?php endif; ?>
    </div>

    <script>
        <?php if ($error): ?>
            localStorage.setItem('acex_oauth_result', JSON.stringify({
                type: 'acex_oauth_error',
                message: '<?php echo esc_js($error); ?>'
            }));
            
            setTimeout(() => window.close(), 2000);
            
        <?php elseif ($tokens_saved): ?>
            // Tokens were already saved server-side by actus_google_oauth_callback()
            // Just notify parent window of success
            localStorage.setItem('acex_oauth_result', JSON.stringify({
                type: 'acex_oauth_success',
                callback_flag: '<?php echo esc_js($callback_flag); ?>'
            }));
            
            setTimeout(() => window.close(), 1500);
            
        <?php else: ?>
            localStorage.setItem('acex_oauth_result', JSON.stringify({
                type: 'acex_oauth_error',
                message: 'Missing authentication tokens'
            }));
            
            setTimeout(() => window.close(), 2000);
        <?php endif; ?>
    </script>
</body>
</html>