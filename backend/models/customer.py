"""
Customer Model - Advanced customer relationship management
"""
import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP

class CustomerModel:
    def __init__(self, db_path: str = "pos_database.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize customer tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Customers table
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
        
        # Customer purchase history
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
        
        # Customer preferences
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
        
        # Customer segments
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
        
        # Insert default segments
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
        
        conn.commit()
        conn.close()
    
    def add_customer(self, customer_data: Dict) -> Dict:
        """Add a new customer"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Validate required fields
            required_fields = ['first_name', 'last_name']
            for field in required_fields:
                if field not in customer_data or not customer_data[field]:
                    return {'success': False, 'error': f'Missing required field: {field}'}
            
            cursor.execute('''
                INSERT INTO customers (
                    first_name, last_name, email, phone, date_of_birth, gender,
                    address_line1, address_line2, city, state, postal_code, country,
                    customer_type, company_name, tax_id, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                customer_data['first_name'],
                customer_data['last_name'],
                customer_data.get('email'),
                customer_data.get('phone'),
                customer_data.get('date_of_birth'),
                customer_data.get('gender'),
                customer_data.get('address_line1'),
                customer_data.get('address_line2'),
                customer_data.get('city'),
                customer_data.get('state'),
                customer_data.get('postal_code'),
                customer_data.get('country', 'US'),
                customer_data.get('customer_type', 'individual'),
                customer_data.get('company_name'),
                customer_data.get('tax_id'),
                customer_data.get('notes')
            ))
            
            customer_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'customer_id': customer_id,
                'message': 'Customer added successfully'
            }
            
        except sqlite3.IntegrityError as e:
            if 'UNIQUE constraint failed: customers.email' in str(e):
                return {'success': False, 'error': 'Email already exists'}
            return {'success': False, 'error': str(e)}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def update_customer(self, customer_id: int, customer_data: Dict) -> Dict:
        """Update existing customer"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Build dynamic update query
            update_fields = []
            values = []
            
            updatable_fields = [
                'first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender',
                'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country',
                'customer_type', 'company_name', 'tax_id', 'notes'
            ]
            
            for field in updatable_fields:
                if field in customer_data:
                    update_fields.append(f"{field} = ?")
                    values.append(customer_data[field])
            
            if update_fields:
                values.append(customer_id)
                cursor.execute(f'''
                    UPDATE customers 
                    SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', values)
                
                if cursor.rowcount == 0:
                    return {'success': False, 'error': 'Customer not found'}
            
            conn.commit()
            conn.close()
            
            return {'success': True, 'message': 'Customer updated successfully'}
            
        except sqlite3.IntegrityError as e:
            if 'UNIQUE constraint failed: customers.email' in str(e):
                return {'success': False, 'error': 'Email already exists'}
            return {'success': False, 'error': str(e)}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def delete_customer(self, customer_id: int) -> Dict:
        """Soft delete customer (mark as inactive)"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE customers 
                SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (customer_id,))
            
            if cursor.rowcount == 0:
                return {'success': False, 'error': 'Customer not found'}
            
            conn.commit()
            conn.close()
            
            return {'success': True, 'message': 'Customer deleted successfully'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def find_customer(self, search_term: str) -> Dict:
        """Search customers by name, email, or phone"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            search_pattern = f'%{search_term}%'
            cursor.execute('''
                SELECT * FROM customers 
                WHERE is_active = 1 AND (
                    first_name LIKE ? OR 
                    last_name LIKE ? OR 
                    email LIKE ? OR 
                    phone LIKE ? OR
                    company_name LIKE ?
                )
                ORDER BY last_name, first_name
            ''', (search_pattern, search_pattern, search_pattern, search_pattern, search_pattern))
            
            customers = cursor.fetchall()
            
            # Convert to list of dictionaries
            customer_list = []
            for customer in customers:
                customer_list.append({
                    'id': customer[0],
                    'first_name': customer[1],
                    'last_name': customer[2],
                    'email': customer[3],
                    'phone': customer[4],
                    'date_of_birth': customer[5],
                    'gender': customer[6],
                    'address_line1': customer[7],
                    'address_line2': customer[8],
                    'city': customer[9],
                    'state': customer[10],
                    'postal_code': customer[11],
                    'country': customer[12],
                    'customer_type': customer[13],
                    'company_name': customer[14],
                    'tax_id': customer[15],
                    'loyalty_points': customer[16],
                    'total_spent': float(customer[17]) if customer[17] else 0,
                    'last_purchase_date': customer[18],
                    'is_active': bool(customer[19]),
                    'notes': customer[20],
                    'created_at': customer[21],
                    'updated_at': customer[22]
                })
            
            conn.close()
            
            return {'success': True, 'customers': customer_list}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_customer(self, customer_id: int) -> Dict:
        """Get customer by ID"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM customers WHERE id = ? AND is_active = 1', (customer_id,))
            customer = cursor.fetchone()
            
            if not customer:
                return {'success': False, 'error': 'Customer not found'}
            
            customer_data = {
                'id': customer[0],
                'first_name': customer[1],
                'last_name': customer[2],
                'email': customer[3],
                'phone': customer[4],
                'date_of_birth': customer[5],
                'gender': customer[6],
                'address_line1': customer[7],
                'address_line2': customer[8],
                'city': customer[9],
                'state': customer[10],
                'postal_code': customer[11],
                'country': customer[12],
                'customer_type': customer[13],
                'company_name': customer[14],
                'tax_id': customer[15],
                'loyalty_points': customer[16],
                'total_spent': float(customer[17]) if customer[17] else 0,
                'last_purchase_date': customer[18],
                'is_active': bool(customer[19]),
                'notes': customer[20],
                'created_at': customer[21],
                'updated_at': customer[22]
            }
            
            conn.close()
            
            return {'success': True, 'customer': customer_data}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_customer_purchase_history(self, customer_id: int, limit: int = 50) -> Dict:
        """Get customer's purchase history"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM customer_purchases 
                WHERE customer_id = ? 
                ORDER BY purchase_date DESC 
                LIMIT ?
            ''', (customer_id, limit))
            
            purchases = cursor.fetchall()
            
            # Convert to list of dictionaries
            purchase_list = []
            for purchase in purchases:
                purchase_list.append({
                    'id': purchase[0],
                    'customer_id': purchase[1],
                    'transaction_id': purchase[2],
                    'purchase_date': purchase[3],
                    'total_amount': float(purchase[4]) if purchase[4] else 0,
                    'payment_method': purchase[5],
                    'items': json.loads(purchase[6]) if purchase[6] else [],
                    'created_at': purchase[7]
                })
            
            conn.close()
            
            return {'success': True, 'purchases': purchase_list}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def add_purchase_record(self, customer_id: int, transaction_id: str, 
                          total_amount: float, payment_method: str, 
                          items: List[Dict]) -> Dict:
        """Add a purchase record for customer"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Add purchase record
            cursor.execute('''
                INSERT INTO customer_purchases (
                    customer_id, transaction_id, purchase_date, total_amount,
                    payment_method, items
                ) VALUES (?, ?, ?, ?, ?, ?)
            ''', (customer_id, transaction_id, datetime.now(), total_amount, 
                  payment_method, json.dumps(items)))
            
            # Update customer totals
            cursor.execute('''
                UPDATE customers 
                SET total_spent = total_spent + ?, 
                    last_purchase_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (total_amount, customer_id))
            
            # Award loyalty points (1 point per dollar spent)
            points_earned = int(total_amount)
            cursor.execute('''
                UPDATE customers 
                SET loyalty_points = loyalty_points + ?
                WHERE id = ?
            ''', (points_earned, customer_id))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'points_earned': points_earned,
                'message': 'Purchase recorded successfully'
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_customer_segments(self) -> Dict:
        """Get all customer segments"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM customer_segments 
                WHERE is_active = 1 
                ORDER BY name
            ''')
            
            segments = cursor.fetchall()
            
            # Convert to list of dictionaries
            segment_list = []
            for segment in segments:
                segment_list.append({
                    'id': segment[0],
                    'name': segment[1],
                    'description': segment[2],
                    'criteria': json.loads(segment[3]) if segment[3] else {},
                    'color_code': segment[4],
                    'is_active': bool(segment[5]),
                    'created_at': segment[6]
                })
            
            conn.close()
            
            return {'success': True, 'segments': segment_list}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_customers_by_segment(self, segment_id: int) -> Dict:
        """Get customers belonging to a specific segment"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get segment criteria
            cursor.execute('SELECT criteria FROM customer_segments WHERE id = ?', (segment_id,))
            segment = cursor.fetchone()
            
            if not segment:
                return {'success': False, 'error': 'Segment not found'}
            
            criteria = json.loads(segment[0])
            
            # Build query based on criteria
            query = 'SELECT * FROM customers WHERE is_active = 1'
            params = []
            
            if 'min_total_spent' in criteria:
                query += ' AND total_spent >= ?'
                params.append(criteria['min_total_spent'])
            
            if 'min_visits' in criteria:
                # This would require a more complex query with purchase count
                pass
            
            if 'days_since_last_purchase' in criteria:
                cutoff_date = datetime.now() - timedelta(days=criteria['days_since_last_purchase'])
                query += ' AND (last_purchase_date IS NULL OR last_purchase_date < ?)'
                params.append(cutoff_date)
            
            if 'days_since_created' in criteria:
                cutoff_date = datetime.now() - timedelta(days=criteria['days_since_created'])
                query += ' AND created_at >= ?'
                params.append(cutoff_date)
            
            query += ' ORDER BY total_spent DESC'
            
            cursor.execute(query, params)
            customers = cursor.fetchall()
            
            # Convert to list of dictionaries
            customer_list = []
            for customer in customers:
                customer_list.append({
                    'id': customer[0],
                    'first_name': customer[1],
                    'last_name': customer[2],
                    'email': customer[3],
                    'phone': customer[4],
                    'total_spent': float(customer[17]) if customer[17] else 0,
                    'last_purchase_date': customer[18],
                    'loyalty_points': customer[16]
                })
            
            conn.close()
            
            return {'success': True, 'customers': customer_list}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def update_loyalty_points(self, customer_id: int, points_change: int, 
                            reason: str = "") -> Dict:
        """Update customer loyalty points"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get current points
            cursor.execute('SELECT loyalty_points FROM customers WHERE id = ?', (customer_id,))
            current_points = cursor.fetchone()
            
            if not current_points:
                return {'success': False, 'error': 'Customer not found'}
            
            new_points = max(0, current_points[0] + points_change)
            
            cursor.execute('''
                UPDATE customers 
                SET loyalty_points = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (new_points, customer_id))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'previous_points': current_points[0],
                'new_points': new_points,
                'points_change': points_change
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}