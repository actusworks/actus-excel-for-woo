<?php
class ACEX_History {
    
    private $table_name;
    
	// --------------------------------------------------
    public function __construct() {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'acex_history';
    }
    
	// --------------------------------------------------
    public function create_table() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE {$this->table_name} (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            filename varchar(255) NOT NULL,
            file_path varchar(500),
            action_type varchar(20) DEFAULT 'import',
            google_sheet_id varchar(255),
            google_sheet_url varchar(500),
            total_rows int(11) DEFAULT 0,
            successful int(11) DEFAULT 0,
            failed int(11) DEFAULT 0,
            created int(11) DEFAULT 0,
            updated int(11) DEFAULT 0,
            exported int(11) DEFAULT 0,
            warnings text,
            errors text,
            metadata longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY user_id (user_id),
            KEY action_type (action_type),
            KEY created_at (created_at),
            KEY google_sheet_id (google_sheet_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange -- Creating custom table for history tracking, dbDelta() is WordPress's recommended method for table creation
    }
    
	// --------------------------------------------------
	public function delete_table() {
		global $wpdb;
		
		$wpdb->query("DROP TABLE IF EXISTS {$this->table_name}"); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange -- Dropping custom table, schema change required for cleanup
		
		// Also delete table version option if you're tracking it
		delete_option('acex_history_db_version');
	}

	
	// --------------------------------------------------
    public function add_record($data) {
        global $wpdb;
        
        $action_type = sanitize_text_field($data['action_type'] ?? 'import');
        
        $insert_data = array(
            'user_id' => get_current_user_id(),
            'filename' => sanitize_text_field($data['filename'] ?? ''),
            'file_path' => sanitize_text_field($data['file_path'] ?? ''),
            'action_type' => $action_type,
            'google_sheet_id' => sanitize_text_field($data['google_sheet_id'] ?? ''),
            'google_sheet_url' => esc_url_raw($data['google_sheet_url'] ?? ''),
            'total_rows' => absint($data['total_rows'] ?? 0),
            'successful' => absint($data['successful'] ?? 0),
            'failed' => absint($data['failed'] ?? 0),
            'created' => absint($data['created'] ?? 0),
            'updated' => absint($data['updated'] ?? 0),
            'exported' => $action_type === 'export' ? absint($data['exported'] ?? 0) : 0,
            'warnings' => maybe_serialize($data['warnings'] ?? []),
            'errors' => maybe_serialize($data['errors'] ?? []),
            'metadata' => maybe_serialize($data['metadata'] ?? []),
        );
        
        $result = $wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom table insert with prepared statement placeholders
            $this->table_name,
            $insert_data,
            array('%d', '%s', '%s', '%s', '%s', '%s', '%d', '%d', '%d', '%d', '%d', '%d', '%s', '%s', '%s')
        );
        
        return $result;
    }
    
	// --------------------------------------------------
    public function get_history($args = array()) {
        global $wpdb;
        
        $defaults = array(
            'limit' => 50,
            'offset' => 0,
            'action_type' => '', // 'import', 'export', or empty for all
            'user_id' => 0,
        );
        
        $args = wp_parse_args($args, $defaults);
        
        $where = array('1=1');
        
        if (!empty($args['action_type'])) {
            $where[] = $wpdb->prepare('action_type = %s', $args['action_type']);
        }
        
        if (!empty($args['user_id'])) {
            $where[] = $wpdb->prepare('user_id = %d', $args['user_id']);
        }
        
        $where_clause = implode(' AND ', $where);
        
        $query = $wpdb->prepare(
            "SELECT * FROM {$this->table_name} 
            WHERE {$where_clause}
            ORDER BY created_at DESC 
            LIMIT %d OFFSET %d",
            $args['limit'],
            $args['offset']
        ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        
        $results = $wpdb->get_results($query); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table query with prepared statement, caching not suitable for frequently changing history data
        
        // Unserialize data
        foreach ($results as &$result) {
            $result->warnings = maybe_unserialize($result->warnings);
            $result->errors = maybe_unserialize($result->errors);
            $result->metadata = maybe_unserialize($result->metadata);
        }
        
        return $results;
    }


	
    // Get a single history record
    // --------------------------------------------------
    public function get_record($id) {
        global $wpdb;
        
        $result = $wpdb->get_row($wpdb->prepare( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table query with prepared statement, caching not suitable for individual record lookups
            "SELECT * FROM {$this->table_name} WHERE id = %d",
            $id
        )); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        
        if ($result) {
            $result->warnings = maybe_unserialize($result->warnings);
            $result->errors = maybe_unserialize($result->errors);
            $result->metadata = maybe_unserialize($result->metadata);
        }
        
        return $result;
    }
    


    // Delete a history record
    // --------------------------------------------------
    public function delete_record($id) {
        global $wpdb;
        
        return $wpdb->delete( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table delete with prepared statement placeholder
            $this->table_name,
            array('id' => $id),
            array('%d')
        );
    }



	// Get last insert ID
    // --------------------------------------------------
	public function get_insert_id() {
		global $wpdb;
		return $wpdb->insert_id;
	}




	// Get history count by action type
    // --------------------------------------------------
    public function get_count($action_type = '') {
        global $wpdb;
        
        if (!empty($action_type)) {
            return $wpdb->get_var($wpdb->prepare( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table count query with prepared statement, caching not suitable for real-time counts
                "SELECT COUNT(*) FROM {$this->table_name} WHERE action_type = %s",
                $action_type
            )); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        }
        
        return $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name}"); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table count query, caching not suitable for real-time counts
    }



	// Get statistics for a given period
	// --------------------------------------------------
    public function get_statistics($days = 30) {
        global $wpdb;
        
        $date_from = gmdate('Y-m-d H:i:s', strtotime("-{$days} days"));
        
        $stats = $wpdb->get_row($wpdb->prepare( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table aggregation query with prepared statement, caching not suitable for real-time statistics
            "SELECT 
                COUNT(*) as total_operations,
                SUM(CASE WHEN action_type = 'import' THEN 1 ELSE 0 END) as total_imports,
                SUM(CASE WHEN action_type = 'export' THEN 1 ELSE 0 END) as total_exports,
                SUM(total_rows) as total_rows_processed,
                SUM(successful) as total_successful,
                SUM(failed) as total_failed,
                SUM(created) as total_created,
                SUM(updated) as total_updated,
                SUM(exported) as total_exported
            FROM {$this->table_name}
            WHERE created_at >= %s",
            $date_from
        ), ARRAY_A); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        
        return $stats;
    }



	// Clear all records
	// --------------------------------------------------
	public function clear_all_records() {
		global $wpdb;
		
		return $wpdb->query("TRUNCATE TABLE {$this->table_name}"); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.SchemaChange -- TRUNCATE command on custom table for clearing all history records
	}


}