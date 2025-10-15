"""
Inventory Model - Advanced product and stock management
"""
import sqlite3
import json
import qrcode
import io
import base64
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP

class InventoryModel:
    def __init__(self, db_path: str = "pos_database.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize inventory tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Products table
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
        
        # Categories table
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
        
        # Stock movements table
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
        
        # Suppliers table
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
        
        conn.commit()
        conn.close()
    
    def add_product(self, product_data: Dict) -> Dict:
        """Add a new product to inventory"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Generate SKU if not provided
            if not product_data.get('sku'):
                product_data['sku'] = self._generate_sku(product_data['name'])
            
            # Generate barcode if not provided
            if not product_data.get('barcode'):
                product_data['barcode'] = self._generate_barcode()
            
            cursor.execute('''
                INSERT INTO products (
                    name, description, sku, barcode, category_id, price, cost,
                    stock_quantity, min_stock_level, max_stock_level, unit,
                    weight, dimensions, supplier_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                product_data['name'],
                product_data.get('description', ''),
                product_data['sku'],
                product_data['barcode'],
                product_data.get('category_id'),
                float(product_data['price']),
                float(product_data.get('cost', 0)),
                int(product_data.get('stock_quantity', 0)),
                int(product_data.get('min_stock_level', 5)),
                int(product_data.get('max_stock_level', 100)),
                product_data.get('unit', 'each'),
                float(product_data.get('weight', 0)),
                product_data.get('dimensions', ''),
                product_data.get('supplier_id')
            ))
            
            product_id = cursor.lastrowid
            
            # Record initial stock movement
            if product_data.get('stock_quantity', 0) > 0:
                cursor.execute('''
                    INSERT INTO stock_movements (
                        product_id, movement_type, quantity, previous_quantity,
                        new_quantity, reason, employee_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    product_id, 'initial_stock', product_data['stock_quantity'],
                    0, product_data['stock_quantity'], 'Initial stock entry',
                    product_data.get('employee_id')
                ))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'product_id': product_id,
                'sku': product_data['sku'],
                'barcode': product_data['barcode']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def update_product(self, product_id: int, product_data: Dict) -> Dict:
        """Update existing product"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Build dynamic update query
            update_fields = []
            values = []
            
            for field in ['name', 'description', 'price', 'cost', 'min_stock_level', 
                         'max_stock_level', 'unit', 'weight', 'dimensions', 'supplier_id']:
                if field in product_data:
                    update_fields.append(f"{field} = ?")
                    values.append(product_data[field])
            
            if update_fields:
                values.append(product_id)
                cursor.execute(f'''
                    UPDATE products 
                    SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', values)
            
            conn.commit()
            conn.close()
            
            return {'success': True, 'message': 'Product updated successfully'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def delete_product(self, product_id: int) -> Dict:
        """Soft delete product (mark as inactive)"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE products 
                SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (product_id,))
            
            conn.commit()
            conn.close()
            
            return {'success': True, 'message': 'Product deleted successfully'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_products(self, category_id: Optional[int] = None, 
                    search_term: Optional[str] = None, 
                    low_stock_only: bool = False) -> Dict:
        """Get products with optional filtering"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = '''
                SELECT p.*, c.name as category_name, s.name as supplier_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                WHERE p.is_active = 1
            '''
            
            params = []
            
            if category_id:
                query += ' AND p.category_id = ?'
                params.append(category_id)
            
            if search_term:
                query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)'
                search_pattern = f'%{search_term}%'
                params.extend([search_pattern, search_pattern, search_pattern])
            
            if low_stock_only:
                query += ' AND p.stock_quantity <= p.min_stock_level'
            
            query += ' ORDER BY p.name'
            
            cursor.execute(query, params)
            products = cursor.fetchall()
            
            # Convert to list of dictionaries
            product_list = []
            for product in products:
                product_list.append({
                    'id': product[0],
                    'name': product[1],
                    'description': product[2],
                    'sku': product[3],
                    'barcode': product[4],
                    'category_id': product[5],
                    'category_name': product[16],
                    'price': float(product[6]),
                    'cost': float(product[7]) if product[7] else 0,
                    'stock_quantity': product[8],
                    'min_stock_level': product[9],
                    'max_stock_level': product[10],
                    'unit': product[11],
                    'weight': float(product[12]) if product[12] else 0,
                    'dimensions': product[13],
                    'supplier_id': product[14],
                    'supplier_name': product[17],
                    'is_active': bool(product[15]),
                    'created_at': product[18],
                    'updated_at': product[19]
                })
            
            conn.close()
            
            return {'success': True, 'products': product_list}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def update_stock(self, product_id: int, quantity_change: int, 
                    movement_type: str, reason: str = "", 
                    employee_id: Optional[int] = None) -> Dict:
        """Update product stock quantity"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get current stock
            cursor.execute('SELECT stock_quantity FROM products WHERE id = ?', (product_id,))
            current_stock = cursor.fetchone()
            
            if not current_stock:
                return {'success': False, 'error': 'Product not found'}
            
            previous_quantity = current_stock[0]
            new_quantity = previous_quantity + quantity_change
            
            # Prevent negative stock
            if new_quantity < 0:
                return {'success': False, 'error': 'Insufficient stock'}
            
            # Update stock quantity
            cursor.execute('''
                UPDATE products 
                SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (new_quantity, product_id))
            
            # Record stock movement
            cursor.execute('''
                INSERT INTO stock_movements (
                    product_id, movement_type, quantity, previous_quantity,
                    new_quantity, reason, employee_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (product_id, movement_type, quantity_change, previous_quantity, 
                  new_quantity, reason, employee_id))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'previous_quantity': previous_quantity,
                'new_quantity': new_quantity,
                'quantity_change': quantity_change
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_low_stock_alerts(self) -> Dict:
        """Get products with low stock levels"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT p.*, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.is_active = 1 AND p.stock_quantity <= p.min_stock_level
                ORDER BY (p.stock_quantity - p.min_stock_level) ASC
            ''')
            
            low_stock_products = cursor.fetchall()
            
            # Convert to list of dictionaries
            alert_list = []
            for product in low_stock_products:
                alert_list.append({
                    'id': product[0],
                    'name': product[1],
                    'sku': product[3],
                    'current_stock': product[8],
                    'min_stock_level': product[9],
                    'category_name': product[16],
                    'days_remaining': self._calculate_days_remaining(product[0])
                })
            
            conn.close()
            
            return {'success': True, 'alerts': alert_list}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def generate_barcode(self, product_id: int) -> Dict:
        """Generate barcode for product"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT barcode, name FROM products WHERE id = ?', (product_id,))
            product = cursor.fetchone()
            
            if not product:
                return {'success': False, 'error': 'Product not found'}
            
            barcode_data = product[0]
            product_name = product[1]
            
            # Generate QR code
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(barcode_data)
            qr.make(fit=True)
            
            # Create image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            conn.close()
            
            return {
                'success': True,
                'barcode_data': barcode_data,
                'barcode_image': f'data:image/png;base64,{img_str}',
                'product_name': product_name
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def search_products(self, search_term: str) -> Dict:
        """Search products by name, SKU, or barcode"""
        return self.get_products(search_term=search_term)
    
    def _generate_sku(self, product_name: str) -> str:
        """Generate SKU from product name"""
        import re
        # Take first 3 letters of each word, uppercase
        words = re.findall(r'\w+', product_name.upper())
        sku_base = ''.join([word[:3] for word in words[:3]])
        
        # Add timestamp suffix
        timestamp = datetime.now().strftime("%m%d%H%M")
        return f"{sku_base}{timestamp}"
    
    def _generate_barcode(self) -> str:
        """Generate unique barcode"""
        import random
        # Generate 12-digit barcode
        barcode = ''.join([str(random.randint(0, 9)) for _ in range(12)])
        return barcode
    
    def _calculate_days_remaining(self, product_id: int) -> int:
        """Calculate estimated days until stock runs out"""
        # This would analyze historical sales data
        # For now, return a placeholder
        return 7