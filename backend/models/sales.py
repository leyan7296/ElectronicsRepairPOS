"""
Sales Model - Process sales transactions with advanced features
"""
import sqlite3
import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP

class SalesModel:
    def __init__(self, db_path: str = "pos_database.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize sales tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Sales transactions table
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
        
        # Cash drawer table
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
        
        # Tax rates table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tax_rates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                rate DECIMAL(5,4) NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Insert default tax rate
        cursor.execute('''
            INSERT OR IGNORE INTO tax_rates (name, rate) 
            VALUES ('Standard Tax', 0.0875)
        ''')
        
        conn.commit()
        conn.close()
    
    def process_sale(self, sale_data: Dict) -> Dict:
        """Process a complete sales transaction"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Calculate totals
            subtotal = self._calculate_subtotal(sale_data['items'])
            tax_amount = self._calculate_tax(subtotal, sale_data.get('tax_rate', 0.0875))
            discount_amount = self._calculate_discount(subtotal, sale_data.get('discount'))
            total_amount = subtotal + tax_amount - discount_amount
            
            # Generate transaction ID
            transaction_id = self._generate_transaction_id()
            
            # Insert sale record
            cursor.execute('''
                INSERT INTO sales (
                    transaction_id, customer_id, employee_id, subtotal, 
                    tax_amount, discount_amount, total_amount, payment_method, 
                    items, receipt_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                transaction_id,
                sale_data.get('customer_id'),
                sale_data['employee_id'],
                float(subtotal),
                float(tax_amount),
                float(discount_amount),
                float(total_amount),
                sale_data['payment_method'],
                json.dumps(sale_data['items']),
                json.dumps(self._generate_receipt_data(sale_data, transaction_id, subtotal, tax_amount, discount_amount, total_amount))
            ))
            
            # Update inventory if items are physical products
            self._update_inventory_after_sale(sale_data['items'])
            
            conn.commit()
            sale_id = cursor.lastrowid
            
            conn.close()
            
            return {
                'success': True,
                'transaction_id': transaction_id,
                'sale_id': sale_id,
                'total_amount': float(total_amount),
                'receipt_data': self._generate_receipt_data(sale_data, transaction_id, subtotal, tax_amount, discount_amount, total_amount)
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def void_transaction(self, transaction_id: str, employee_id: int, reason: str = "") -> Dict:
        """Void a completed transaction"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get the original sale
            cursor.execute('''
                SELECT * FROM sales WHERE transaction_id = ? AND payment_status = 'completed'
            ''', (transaction_id,))
            
            sale = cursor.fetchone()
            if not sale:
                return {'success': False, 'error': 'Transaction not found or already voided'}
            
            # Restore inventory
            items = json.loads(sale[10])  # items column
            self._restore_inventory_after_void(items)
            
            # Mark as voided
            cursor.execute('''
                UPDATE sales 
                SET payment_status = 'voided', updated_at = CURRENT_TIMESTAMP
                WHERE transaction_id = ?
            ''', (transaction_id,))
            
            conn.commit()
            conn.close()
            
            return {'success': True, 'message': 'Transaction voided successfully'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def apply_discount(self, transaction_id: str, discount_type: str, discount_value: float) -> Dict:
        """Apply discount to a transaction"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get current sale
            cursor.execute('SELECT * FROM sales WHERE transaction_id = ?', (transaction_id,))
            sale = cursor.fetchone()
            
            if not sale:
                return {'success': False, 'error': 'Transaction not found'}
            
            subtotal = float(sale[4])  # subtotal column
            current_discount = float(sale[6])  # discount_amount column
            
            # Calculate new discount
            if discount_type == 'percentage':
                new_discount = subtotal * (discount_value / 100)
            else:  # fixed amount
                new_discount = discount_value
            
            # Ensure discount doesn't exceed subtotal
            new_discount = min(new_discount, subtotal)
            
            # Recalculate total
            tax_amount = float(sale[5])
            new_total = subtotal + tax_amount - new_discount
            
            # Update sale
            cursor.execute('''
                UPDATE sales 
                SET discount_amount = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP
                WHERE transaction_id = ?
            ''', (float(new_discount), float(new_total), transaction_id))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'new_discount': float(new_discount),
                'new_total': float(new_total)
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def calculate_tax(self, subtotal: float, tax_rate: float = 0.0875) -> float:
        """Calculate tax amount"""
        return float(Decimal(str(subtotal * tax_rate)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    
    def get_sales_summary(self, start_date: str, end_date: str) -> Dict:
        """Get sales summary for date range"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(total_amount) as total_revenue,
                    AVG(total_amount) as average_transaction,
                    SUM(tax_amount) as total_tax,
                    SUM(discount_amount) as total_discounts
                FROM sales 
                WHERE created_at BETWEEN ? AND ? AND payment_status = 'completed'
            ''', (start_date, end_date))
            
            summary = cursor.fetchone()
            conn.close()
            
            return {
                'success': True,
                'summary': {
                    'total_transactions': summary[0] or 0,
                    'total_revenue': float(summary[1] or 0),
                    'average_transaction': float(summary[2] or 0),
                    'total_tax': float(summary[3] or 0),
                    'total_discounts': float(summary[4] or 0)
                }
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _calculate_subtotal(self, items: List[Dict]) -> float:
        """Calculate subtotal from items"""
        subtotal = 0
        for item in items:
            subtotal += item['price'] * item['quantity']
        return float(Decimal(str(subtotal)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    
    def _calculate_tax(self, subtotal: float, tax_rate: float) -> float:
        """Calculate tax amount"""
        return self.calculate_tax(subtotal, tax_rate)
    
    def _calculate_discount(self, subtotal: float, discount: Optional[Dict]) -> float:
        """Calculate discount amount"""
        if not discount:
            return 0.0
        
        if discount['type'] == 'percentage':
            return float(Decimal(str(subtotal * discount['value'] / 100)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
        else:
            return min(discount['value'], subtotal)
    
    def _generate_transaction_id(self) -> str:
        """Generate unique transaction ID"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        import random
        random_suffix = random.randint(1000, 9999)
        return f"TXN{timestamp}{random_suffix}"
    
    def _generate_receipt_data(self, sale_data: Dict, transaction_id: str, 
                              subtotal: float, tax_amount: float, 
                              discount_amount: float, total_amount: float) -> Dict:
        """Generate receipt data"""
        return {
            'transaction_id': transaction_id,
            'date': datetime.now().isoformat(),
            'items': sale_data['items'],
            'subtotal': subtotal,
            'tax_amount': tax_amount,
            'discount_amount': discount_amount,
            'total_amount': total_amount,
            'payment_method': sale_data['payment_method'],
            'employee_id': sale_data['employee_id'],
            'customer_id': sale_data.get('customer_id')
        }
    
    def _update_inventory_after_sale(self, items: List[Dict]):
        """Update inventory quantities after sale"""
        # This would integrate with inventory model
        # For now, just a placeholder
        pass
    
    def _restore_inventory_after_void(self, items: List[Dict]):
        """Restore inventory quantities after void"""
        # This would integrate with inventory model
        # For now, just a placeholder
        pass