"""
Employee Model - User management and role-based access control
"""
import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import hashlib
import secrets

class EmployeeModel:
    def __init__(self, db_path: str = "pos_database.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize employee tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Employees table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT UNIQUE NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
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
        
        # User accounts table
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
        
        # Login sessions table
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
        
        # Role permissions table
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
        
        # Create default admin user
        self._create_default_admin(cursor)
        
        conn.commit()
        conn.close()
    
    def _create_default_admin(self, cursor):
        """Create default admin user"""
        try:
            # Check if admin already exists
            cursor.execute('SELECT id FROM user_accounts WHERE username = ?', ('admin',))
            if cursor.fetchone():
                return
            
            # Create admin employee
            cursor.execute('''
                INSERT OR IGNORE INTO employees (
                    employee_id, first_name, last_name, email, position, hire_date
                ) VALUES (?, ?, ?, ?, ?, ?)
            ''', ('EMP001', 'System', 'Administrator', 'admin@poscorp.com', 'System Admin', datetime.now().date()))
            
            employee_id = cursor.lastrowid
            
            # Create admin user account
            password = 'admin123'  # Should be changed on first login
            salt = secrets.token_hex(16)
            password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
            
            cursor.execute('''
                INSERT INTO user_accounts (
                    employee_id, username, password_hash, salt, role, permissions
                ) VALUES (?, ?, ?, ?, ?, ?)
            ''', (employee_id, 'admin', password_hash, salt, 'admin', json.dumps({
                'sales': ['create', 'read', 'update', 'delete', 'void'],
                'inventory': ['create', 'read', 'update', 'delete', 'manage_categories'],
                'customers': ['create', 'read', 'update', 'delete', 'view_history'],
                'employees': ['create', 'read', 'update', 'delete', 'manage_roles'],
                'reports': ['view_all', 'export', 'schedule'],
                'settings': ['system', 'security', 'backup']
            })))
            
        except Exception as e:
            print(f"Error creating default admin: {e}")
    
    def create_employee(self, employee_data: Dict) -> Dict:
        """Create new employee and user account"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Generate employee ID
            employee_id = self._generate_employee_id()
            
            # Create employee record
            cursor.execute('''
                INSERT INTO employees (
                    employee_id, first_name, last_name, email, phone, position,
                    department, hire_date, salary, hourly_rate, pin_code,
                    emergency_contact_name, emergency_contact_phone,
                    address_line1, address_line2, city, state, postal_code,
                    country, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                employee_id,
                employee_data['first_name'],
                employee_data['last_name'],
                employee_data['email'],
                employee_data.get('phone'),
                employee_data['position'],
                employee_data.get('department'),
                employee_data['hire_date'],
                employee_data.get('salary'),
                employee_data.get('hourly_rate'),
                employee_data.get('pin_code'),
                employee_data.get('emergency_contact_name'),
                employee_data.get('emergency_contact_phone'),
                employee_data.get('address_line1'),
                employee_data.get('address_line2'),
                employee_data.get('city'),
                employee_data.get('state'),
                employee_data.get('postal_code'),
                employee_data.get('country', 'US'),
                employee_data.get('notes')
            ))
            
            emp_id = cursor.lastrowid
            
            # Create user account if credentials provided
            if 'username' in employee_data and 'password' in employee_data:
                username = employee_data['username']
                password = employee_data['password']
                role = employee_data.get('role', 'staff')
                
                # Hash password
                salt = secrets.token_hex(16)
                password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
                
                # Get role permissions
                cursor.execute('SELECT permissions FROM role_permissions WHERE role_name = ?', (role,))
                role_data = cursor.fetchone()
                permissions = json.loads(role_data[0]) if role_data else {}
                
                cursor.execute('''
                    INSERT INTO user_accounts (
                        employee_id, username, password_hash, salt, role, permissions
                    ) VALUES (?, ?, ?, ?, ?, ?)
                ''', (emp_id, username, password_hash, salt, role, json.dumps(permissions)))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'employee_id': emp_id,
                'employee_number': employee_id,
                'message': 'Employee created successfully'
            }
            
        except sqlite3.IntegrityError as e:
            if 'UNIQUE constraint failed: employees.email' in str(e):
                return {'success': False, 'error': 'Email already exists'}
            elif 'UNIQUE constraint failed: user_accounts.username' in str(e):
                return {'success': False, 'error': 'Username already exists'}
            return {'success': False, 'error': str(e)}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def authenticate_user(self, username: str, password: str, ip_address: str = None) -> Dict:
        """Authenticate user login"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get user account
            cursor.execute('''
                SELECT ua.*, e.first_name, e.last_name, e.is_active as emp_active
                FROM user_accounts ua
                JOIN employees e ON ua.employee_id = e.id
                WHERE ua.username = ?
            ''', (username,))
            
            user = cursor.fetchone()
            
            if not user:
                return {
                    'success': False,
                    'message': 'Invalid credentials',
                    'animation': 'shake_form',
                    'security_level': 'low'
                }
            
            # Check if account is locked
            if user[9] and datetime.fromisoformat(user[9]) > datetime.now():
                return {
                    'success': False,
                    'message': 'Account temporarily locked',
                    'animation': 'pulse_denied',
                    'security_level': 'high'
                }
            
            # Check if employee is active
            if not user[15]:  # emp_active
                return {
                    'success': False,
                    'message': 'Employee account is inactive',
                    'animation': 'pulse_denied',
                    'security_level': 'medium'
                }
            
            # Verify password
            stored_hash = user[2]
            salt = user[3]
            password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
            
            if password_hash != stored_hash:
                # Increment login attempts
                cursor.execute('''
                    UPDATE user_accounts 
                    SET login_attempts = login_attempts + 1,
                        locked_until = CASE 
                            WHEN login_attempts >= 4 THEN datetime('now', '+15 minutes')
                            ELSE locked_until
                        END
                    WHERE id = ?
                ''', (user[0],))
                
                conn.commit()
                conn.close()
                
                return {
                    'success': False,
                    'message': 'Invalid credentials',
                    'animation': 'pulse_denied',
                    'security_level': 'medium'
                }
            
            # Reset login attempts on successful login
            cursor.execute('''
                UPDATE user_accounts 
                SET login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (user[0],))
            
            # Create session
            session_token = secrets.token_urlsafe(32)
            expires_at = datetime.now() + timedelta(hours=8)
            
            cursor.execute('''
                INSERT INTO login_sessions (
                    user_id, session_token, ip_address, expires_at
                ) VALUES (?, ?, ?, ?)
            ''', (user[0], session_token, ip_address, expires_at))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'message': 'Access granted',
                'animation': 'vault_open',
                'user': {
                    'id': user[0],
                    'employee_id': user[1],
                    'username': user[2],
                    'role': user[5],
                    'permissions': json.loads(user[6]) if user[6] else {},
                    'first_name': user[12],
                    'last_name': user[13]
                },
                'session_token': session_token
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def authenticate_pin(self, pin_code: str) -> Dict:
        """Authenticate using PIN code"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT e.*, ua.id as user_id, ua.username, ua.role, ua.permissions
                FROM employees e
                LEFT JOIN user_accounts ua ON e.id = ua.employee_id
                WHERE e.pin_code = ? AND e.is_active = 1
            ''', (pin_code,))
            
            employee = cursor.fetchone()
            
            if not employee:
                return {
                    'success': False,
                    'message': 'Invalid PIN',
                    'animation': 'shake_form',
                    'security_level': 'low'
                }
            
            # Create session if user account exists
            session_token = None
            if employee[24]:  # user_id
                session_token = secrets.token_urlsafe(32)
                expires_at = datetime.now() + timedelta(hours=8)
                
                cursor.execute('''
                    INSERT INTO login_sessions (
                        user_id, session_token, expires_at
                    ) VALUES (?, ?, ?)
                ''', (employee[24], session_token, expires_at))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'message': 'PIN authentication successful',
                'animation': 'vault_open',
                'employee': {
                    'id': employee[0],
                    'employee_id': employee[1],
                    'first_name': employee[2],
                    'last_name': employee[3],
                    'position': employee[6],
                    'user_id': employee[24],
                    'username': employee[25],
                    'role': employee[26],
                    'permissions': json.loads(employee[27]) if employee[27] else {}
                },
                'session_token': session_token
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_employees(self, active_only: bool = True) -> Dict:
        """Get all employees"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = '''
                SELECT e.*, ua.username, ua.role, ua.last_login
                FROM employees e
                LEFT JOIN user_accounts ua ON e.id = ua.employee_id
            '''
            
            if active_only:
                query += ' WHERE e.is_active = 1'
            
            query += ' ORDER BY e.last_name, e.first_name'
            
            cursor.execute(query)
            employees = cursor.fetchall()
            
            # Convert to list of dictionaries
            employee_list = []
            for emp in employees:
                employee_list.append({
                    'id': emp[0],
                    'employee_id': emp[1],
                    'first_name': emp[2],
                    'last_name': emp[3],
                    'email': emp[4],
                    'phone': emp[5],
                    'position': emp[6],
                    'department': emp[7],
                    'hire_date': emp[8],
                    'salary': float(emp[9]) if emp[9] else None,
                    'hourly_rate': float(emp[10]) if emp[10] else None,
                    'is_active': bool(emp[11]),
                    'username': emp[24],
                    'role': emp[25],
                    'last_login': emp[26],
                    'created_at': emp[22],
                    'updated_at': emp[23]
                })
            
            conn.close()
            
            return {'success': True, 'employees': employee_list}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def update_employee(self, employee_id: int, employee_data: Dict) -> Dict:
        """Update employee information"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Build dynamic update query
            update_fields = []
            values = []
            
            updatable_fields = [
                'first_name', 'last_name', 'email', 'phone', 'position', 'department',
                'salary', 'hourly_rate', 'pin_code', 'emergency_contact_name',
                'emergency_contact_phone', 'address_line1', 'address_line2',
                'city', 'state', 'postal_code', 'country', 'notes'
            ]
            
            for field in updatable_fields:
                if field in employee_data:
                    update_fields.append(f"{field} = ?")
                    values.append(employee_data[field])
            
            if update_fields:
                values.append(employee_id)
                cursor.execute(f'''
                    UPDATE employees 
                    SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', values)
                
                if cursor.rowcount == 0:
                    return {'success': False, 'error': 'Employee not found'}
            
            conn.commit()
            conn.close()
            
            return {'success': True, 'message': 'Employee updated successfully'}
            
        except sqlite3.IntegrityError as e:
            if 'UNIQUE constraint failed: employees.email' in str(e):
                return {'success': False, 'error': 'Email already exists'}
            return {'success': False, 'error': str(e)}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def update_permissions(self, user_id: int, permissions: Dict) -> Dict:
        """Update user permissions"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE user_accounts 
                SET permissions = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (json.dumps(permissions), user_id))
            
            if cursor.rowcount == 0:
                return {'success': False, 'error': 'User not found'}
            
            conn.commit()
            conn.close()
            
            return {'success': True, 'message': 'Permissions updated successfully'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def logout_user(self, session_token: str) -> Dict:
        """Logout user and invalidate session"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE login_sessions 
                SET is_active = 0
                WHERE session_token = ?
            ''', (session_token,))
            
            conn.commit()
            conn.close()
            
            return {'success': True, 'message': 'Logged out successfully'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_active_sessions(self) -> Dict:
        """Get all active login sessions"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT ls.*, ua.username, e.first_name, e.last_name
                FROM login_sessions ls
                JOIN user_accounts ua ON ls.user_id = ua.id
                JOIN employees e ON ua.employee_id = e.id
                WHERE ls.is_active = 1 AND ls.expires_at > CURRENT_TIMESTAMP
                ORDER BY ls.last_activity DESC
            ''')
            
            sessions = cursor.fetchall()
            
            # Convert to list of dictionaries
            session_list = []
            for session in sessions:
                session_list.append({
                    'id': session[0],
                    'user_id': session[1],
                    'session_token': session[2],
                    'ip_address': session[3],
                    'user_agent': session[4],
                    'login_time': session[5],
                    'last_activity': session[6],
                    'expires_at': session[7],
                    'username': session[8],
                    'first_name': session[9],
                    'last_name': session[10]
                })
            
            conn.close()
            
            return {'success': True, 'sessions': session_list}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _generate_employee_id(self) -> str:
        """Generate unique employee ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM employees')
        count = cursor.fetchone()[0]
        
        conn.close()
        
        return f"EMP{str(count + 1).zfill(3)}"