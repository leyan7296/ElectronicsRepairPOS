"""
Database Utilities - SQLite/PostgreSQL connection and management
"""
import sqlite3
import json
import os
import shutil
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging

class DatabaseManager:
    def __init__(self, db_path: str = "pos_database.db", db_type: str = "sqlite"):
        self.db_path = db_path
        self.db_type = db_type
        self.connection = None
        self.logger = logging.getLogger(__name__)
        self.init_database()
    
    def init_database(self):
        """Initialize database with all required tables"""
        try:
            if self.db_type == "sqlite":
                self.connection = sqlite3.connect(self.db_path)
                self.connection.row_factory = sqlite3.Row
                self._init_sqlite_tables()
            else:
                # PostgreSQL initialization would go here
                raise NotImplementedError("PostgreSQL support not implemented yet")
            
            self.logger.info("Database initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Database initialization failed: {e}")
            raise
    
    def _init_sqlite_tables(self):
        """Initialize SQLite tables"""
        cursor = self.connection.cursor()
        
        # Enable foreign key constraints
        cursor.execute("PRAGMA foreign_keys = ON")
        
        # Create all tables
        self._create_employees_table(cursor)
        self._create_user_accounts_table(cursor)
        self._create_login_sessions_table(cursor)
        self._create_role_permissions_table(cursor)
        self._create_customers_table(cursor)
        self._create_customer_purchases_table(cursor)
        self._create_customer_preferences_table(cursor)
        self._create_customer_segments_table(cursor)
        self._create_products_table(cursor)
        self._create_categories_table(cursor)
        self._create_suppliers_table(cursor)
        self._create_stock_movements_table(cursor)
        self._create_sales_table(cursor)
        self._create_cash_drawer_table(cursor)
        self._create_tax_rates_table(cursor)
        self._create_security_events_table(cursor)
        self._create_system_settings_table(cursor)
        self._create_audit_log_table(cursor)
        
        # Insert default data
        self._insert_default_data(cursor)
        
        self.connection.commit()
        cursor.close()
    
    def _create_employees_table(self, cursor):
        """Create employees table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT UNIQUE NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE,
                phone TEXT,
                position TEXT NOT NULL,
                department TEXT,
                hire_date DATE NOT NULL,
                salary DECIMAL(10,2),
                hourly_rate DECIMAL(8,2),
                is_active BOOLEAN DEFAULT 1,
                pin_code TEXT,
                emergency_contact_name TEXT,
                emergency_contact_phone TEXT,
                address_line1 TEXT,
                address_line2 TEXT,
                city TEXT,
                state TEXT,
                postal_code TEXT,
                country TEXT DEFAULT 'US',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    
    def _create_user_accounts_table(self, cursor):
        """Create user accounts table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'staff',
                permissions JSON,
                last_login TIMESTAMP,
                login_attempts INTEGER DEFAULT 0,
                locked_until TIMESTAMP,
                password_reset_token TEXT,
                password_reset_expires TIMESTAMP,
                two_factor_enabled BOOLEAN DEFAULT 0,
                two_factor_secret TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(id)
            )
        ''')
    
    def _create_login_sessions_table(self, cursor):
        """Create login sessions table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS login_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                expires_at TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES user_accounts(id)
            )
        ''')
    
    def _create_role_permissions_table(self, cursor):
        """Create role permissions table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS role_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role_name TEXT UNIQUE NOT NULL,
                permissions JSON NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    
    def _create_customers_table(self, cursor):
        """Create customers table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE,
                phone TEXT,
                date_of_birth DATE,
                gender TEXT,
                address_line1 TEXT,
                address_line2 TEXT,
                city TEXT,
                state TEXT,
                postal_code TEXT,
                country TEXT DEFAULT 'US',
                customer_type TEXT DEFAULT 'individual',
                company_name TEXT,
                tax_id TEXT,
                loyalty_points INTEGER DEFAULT 0,
                total_spent DECIMAL(10,2) DEFAULT 0,
                last_purchase_date TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    
    def _create_customer_purchases_table(self, cursor):
        """Create customer purchases table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                transaction_id TEXT NOT NULL,
                purchase_date TIMESTAMP NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                payment_method TEXT NOT NULL,
                items JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
        ''')
    
    def _create_customer_preferences_table(self, cursor):
        """Create customer preferences table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                preference_type TEXT NOT NULL,
                preference_value TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
        ''')
    
    def _create_customer_segments_table(self, cursor):
        """Create customer segments table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_segments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                criteria JSON NOT NULL,
                color_code TEXT DEFAULT '#00D4FF',
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    
    def _create_products_table(self, cursor):
        """Create products table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                sku TEXT UNIQUE NOT NULL,
                barcode TEXT UNIQUE,
                category_id INTEGER,
                price DECIMAL(10,2) NOT NULL,
                cost DECIMAL(10,2),
                stock_quantity INTEGER DEFAULT 0,
                min_stock_level INTEGER DEFAULT 5,
                max_stock_level INTEGER DEFAULT 100,
                unit TEXT DEFAULT 'each',
                weight DECIMAL(8,3),
                dimensions TEXT,
                supplier_id INTEGER,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id),
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
            )
        ''')
    
    def _create_categories_table(self, cursor):
        """Create categories table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                parent_id INTEGER,
                color_code TEXT DEFAULT '#00D4FF',
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES categories(id)
            )
        ''')
    
    def _create_suppliers_table(self, cursor):
        """Create suppliers table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contact_person TEXT,
                email TEXT,
                phone TEXT,
                address TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    
    def _create_stock_movements_table(self, cursor):
        """Create stock movements table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS stock_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                movement_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                previous_quantity INTEGER NOT NULL,
                new_quantity INTEGER NOT NULL,
                reason TEXT,
                reference_id INTEGER,
                employee_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (employee_id) REFERENCES employees(id)
            )
        ''')
    
    def _create_sales_table(self, cursor):
        """Create sales table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id TEXT UNIQUE NOT NULL,
                customer_id INTEGER,
                employee_id INTEGER NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                tax_amount DECIMAL(10,2) NOT NULL,
                discount_amount DECIMAL(10,2) DEFAULT 0,
                total_amount DECIMAL(10,2) NOT NULL,
                payment_method TEXT NOT NULL,
                payment_status TEXT DEFAULT 'completed',
                items JSON NOT NULL,
                receipt_data JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (employee_id) REFERENCES employees(id)
            )
        ''')
    
    def _create_cash_drawer_table(self, cursor):
        """Create cash drawer table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cash_drawer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                opening_amount DECIMAL(10,2) NOT NULL,
                closing_amount DECIMAL(10,2),
                expected_amount DECIMAL(10,2),
                difference DECIMAL(10,2),
                status TEXT DEFAULT 'open',
                opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                closed_at TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(id)
            )
        ''')
    
    def _create_tax_rates_table(self, cursor):
        """Create tax rates table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tax_rates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                rate DECIMAL(5,4) NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    
    def _create_security_events_table(self, cursor):
        """Create security events table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS security_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                identifier TEXT,
                ip_address TEXT,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    
    def _create_system_settings_table(self, cursor):
        """Create system settings table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT NOT NULL,
                setting_type TEXT DEFAULT 'string',
                description TEXT,
                is_encrypted BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    
    def _create_audit_log_table(self, cursor):
        """Create audit log table"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_name TEXT NOT NULL,
                record_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                old_values JSON,
                new_values JSON,
                user_id INTEGER,
                ip_address TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user_accounts(id)
            )
        ''')
    
    def _insert_default_data(self, cursor):
        """Insert default data into tables"""
        # Insert default roles
        default_roles = [
            ('admin', {
                'sales': ['create', 'read', 'update', 'delete', 'void'],
                'inventory': ['create', 'read', 'update', 'delete', 'manage_categories'],
                'customers': ['create', 'read', 'update', 'delete', 'view_history'],
                'employees': ['create', 'read', 'update', 'delete', 'manage_roles'],
                'reports': ['view_all', 'export', 'schedule'],
                'settings': ['system', 'security', 'backup']
            }, 'Full system access'),
            ('manager', {
                'sales': ['create', 'read', 'update', 'void'],
                'inventory': ['create', 'read', 'update', 'manage_categories'],
                'customers': ['create', 'read', 'update', 'view_history'],
                'employees': ['read', 'update'],
                'reports': ['view_all', 'export']
            }, 'Management level access'),
            ('staff', {
                'sales': ['create', 'read'],
                'inventory': ['read', 'update'],
                'customers': ['create', 'read', 'update']
            }, 'Basic staff access'),
            ('cashier', {
                'sales': ['create', 'read'],
                'customers': ['read']
            }, 'Cashier only access')
        ]
        
        cursor.executemany('''
            INSERT OR IGNORE INTO role_permissions (role_name, permissions, description) 
            VALUES (?, ?, ?)
        ''', default_roles)
        
        # Insert default categories
        default_categories = [
            ('Electronics', 'Electronic devices and accessories', None, '#00D4FF'),
            ('Clothing', 'Apparel and fashion items', None, '#00FFAB'),
            ('Food & Beverage', 'Food and drink items', None, '#FFD700'),
            ('Accessories', 'Miscellaneous accessories', None, '#E8E8E8')
        ]
        
        cursor.executemany('''
            INSERT OR IGNORE INTO categories (name, description, parent_id, color_code) 
            VALUES (?, ?, ?, ?)
        ''', default_categories)
        
        # Insert default tax rate
        cursor.execute('''
            INSERT OR IGNORE INTO tax_rates (name, rate) 
            VALUES ('Standard Tax', 0.0875)
        ''')
        
        # Insert default customer segments
        default_segments = [
            ('VIP Customers', 'High-value customers with significant spending', 
             '{"min_total_spent": 1000, "min_visits": 10}', '#FFD700'),
            ('Frequent Buyers', 'Regular customers with consistent purchases',
             '{"min_visits": 5, "days_since_last_purchase": 30}', '#00FFAB'),
            ('New Customers', 'Recently acquired customers',
             '{"days_since_created": 30}', '#00D4FF'),
            ('At Risk', 'Customers who haven\'t purchased recently',
             '{"days_since_last_purchase": 90}', '#FF6B6B')
        ]
        
        cursor.executemany('''
            INSERT OR IGNORE INTO customer_segments (name, description, criteria, color_code) 
            VALUES (?, ?, ?, ?)
        ''', default_segments)
        
        # Insert default system settings
        default_settings = [
            ('company_name', 'POS Corp', 'string', 'Company name'),
            ('currency', 'USD', 'string', 'Default currency'),
            ('timezone', 'UTC', 'string', 'System timezone'),
            ('backup_frequency', 'daily', 'string', 'Backup frequency'),
            ('max_login_attempts', '5', 'integer', 'Maximum login attempts'),
            ('session_timeout', '8', 'integer', 'Session timeout in hours'),
            ('low_stock_threshold', '5', 'integer', 'Low stock alert threshold'),
            ('tax_rate', '0.0875', 'decimal', 'Default tax rate')
        ]
        
        cursor.executemany('''
            INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, description) 
            VALUES (?, ?, ?, ?)
        ''', default_settings)
    
    def get_connection(self):
        """Get database connection"""
        if not self.connection:
            self.connection = sqlite3.connect(self.db_path)
            self.connection.row_factory = sqlite3.Row
        return self.connection
    
    def execute_query(self, query: str, params: tuple = ()) -> List[Dict]:
        """Execute SELECT query and return results as list of dictionaries"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except Exception as e:
            self.logger.error(f"Query execution failed: {e}")
            raise
    
    def execute_update(self, query: str, params: tuple = ()) -> int:
        """Execute INSERT/UPDATE/DELETE query and return affected rows"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(query, params)
            conn.commit()
            return cursor.rowcount
        except Exception as e:
            self.logger.error(f"Update execution failed: {e}")
            conn.rollback()
            raise
    
    def execute_transaction(self, queries: List[tuple]) -> bool:
        """Execute multiple queries in a transaction"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            for query, params in queries:
                cursor.execute(query, params)
            
            conn.commit()
            return True
        except Exception as e:
            self.logger.error(f"Transaction failed: {e}")
            conn.rollback()
            return False
    
    def backup_database(self, backup_path: str = None) -> Dict:
        """Create database backup"""
        try:
            if not backup_path:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_path = f"backup_{timestamp}.db"
            
            if self.db_type == "sqlite":
                # Simple file copy for SQLite
                shutil.copy2(self.db_path, backup_path)
            else:
                # PostgreSQL backup would use pg_dump
                raise NotImplementedError("PostgreSQL backup not implemented")
            
            self.logger.info(f"Database backed up to {backup_path}")
            
            return {
                'success': True,
                'backup_path': backup_path,
                'backup_size': os.path.getsize(backup_path),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Backup failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def restore_database(self, backup_path: str) -> Dict:
        """Restore database from backup"""
        try:
            if not os.path.exists(backup_path):
                return {'success': False, 'error': 'Backup file not found'}
            
            # Close current connection
            if self.connection:
                self.connection.close()
            
            # Create backup of current database
            current_backup = f"backup_before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
            if os.path.exists(self.db_path):
                shutil.copy2(self.db_path, current_backup)
            
            # Restore from backup
            shutil.copy2(backup_path, self.db_path)
            
            # Reinitialize connection
            self.init_database()
            
            self.logger.info(f"Database restored from {backup_path}")
            
            return {
                'success': True,
                'restored_from': backup_path,
                'current_backup': current_backup,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Restore failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_database_stats(self) -> Dict:
        """Get database statistics"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Get table sizes
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            
            stats = {
                'tables': {},
                'total_size': 0,
                'last_backup': None,
                'connection_count': 0
            }
            
            for table in tables:
                table_name = table[0]
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                stats['tables'][table_name] = count
            
            # Get database file size
            if os.path.exists(self.db_path):
                stats['total_size'] = os.path.getsize(self.db_path)
            
            # Get last backup info (would need to track this)
            stats['last_backup'] = self._get_last_backup_info()
            
            return {'success': True, 'stats': stats}
            
        except Exception as e:
            self.logger.error(f"Failed to get database stats: {e}")
            return {'success': False, 'error': str(e)}
    
    def _get_last_backup_info(self) -> Optional[Dict]:
        """Get last backup information"""
        # This would check backup directory or database for backup records
        # For now, return None
        return None
    
    def optimize_database(self) -> Dict:
        """Optimize database performance"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Run VACUUM to optimize SQLite database
            cursor.execute("VACUUM")
            
            # Analyze tables for better query planning
            cursor.execute("ANALYZE")
            
            conn.commit()
            
            self.logger.info("Database optimized successfully")
            
            return {'success': True, 'message': 'Database optimized successfully'}
            
        except Exception as e:
            self.logger.error(f"Database optimization failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def close_connection(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            self.connection = None