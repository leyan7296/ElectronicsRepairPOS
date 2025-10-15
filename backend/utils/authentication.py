"""
Authentication Utilities - Enhanced security with visual feedback
"""
import hashlib
import secrets
import jwt
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
import sqlite3
import json

class AuthenticationManager:
    def __init__(self, db_path: str = "pos_database.db", secret_key: str = None):
        self.db_path = db_path
        self.secret_key = secret_key or secrets.token_urlsafe(32)
        self.algorithm = "HS256"
        self.token_expiry = timedelta(hours=8)
        self.max_login_attempts = 5
        self.lockout_duration = timedelta(minutes=15)
    
    def hash_password(self, password: str, salt: str = None) -> Tuple[str, str]:
        """Hash password with salt using PBKDF2"""
        if salt is None:
            salt = secrets.token_hex(16)
        
        password_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000  # iterations
        ).hex()
        
        return password_hash, salt
    
    def verify_password(self, password: str, stored_hash: str, salt: str) -> bool:
        """Verify password against stored hash"""
        password_hash, _ = self.hash_password(password, salt)
        return password_hash == stored_hash
    
    def generate_token(self, user_data: Dict) -> str:
        """Generate JWT token for user session"""
        payload = {
            'user_id': user_data['id'],
            'username': user_data['username'],
            'role': user_data['role'],
            'permissions': user_data.get('permissions', {}),
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + self.token_expiry
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def authenticate_with_visual_feedback(self, username: str, password: str, 
                                        ip_address: str = None) -> Dict:
        """Enhanced authentication with visual feedback for frontend"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get user account with security info
            cursor.execute('''
                SELECT ua.*, e.first_name, e.last_name, e.is_active as emp_active,
                       e.employee_id, e.position
                FROM user_accounts ua
                JOIN employees e ON ua.employee_id = e.id
                WHERE ua.username = ?
            ''', (username,))
            
            user = cursor.fetchone()
            
            if not user:
                # Log failed attempt
                self._log_security_event('failed_login', username, ip_address, 'User not found')
                return {
                    "success": False,
                    "message": "Invalid credentials",
                    "animation": "shake_form",
                    "security_level": "low",
                    "timestamp": datetime.now().isoformat()
                }
            
            # Check if account is locked
            if user[9] and datetime.fromisoformat(user[9]) > datetime.now():
                self._log_security_event('locked_account_attempt', username, ip_address, 'Account locked')
                return {
                    "success": False,
                    "message": "Account temporarily locked due to multiple failed attempts",
                    "animation": "pulse_denied",
                    "security_level": "high",
                    "unlock_time": user[9],
                    "timestamp": datetime.now().isoformat()
                }
            
            # Check if employee is active
            if not user[16]:  # emp_active
                self._log_security_event('inactive_employee_login', username, ip_address, 'Employee inactive')
                return {
                    "success": False,
                    "message": "Employee account is inactive",
                    "animation": "pulse_denied",
                    "security_level": "medium",
                    "timestamp": datetime.now().isoformat()
                }
            
            # Verify password
            stored_hash = user[2]
            salt = user[3]
            
            if not self.verify_password(password, stored_hash, salt):
                # Increment login attempts
                new_attempts = user[8] + 1
                locked_until = None
                
                if new_attempts >= self.max_login_attempts:
                    locked_until = datetime.now() + self.lockout_duration
                
                cursor.execute('''
                    UPDATE user_accounts 
                    SET login_attempts = ?, locked_until = ?
                    WHERE id = ?
                ''', (new_attempts, locked_until, user[0]))
                
                conn.commit()
                conn.close()
                
                self._log_security_event('failed_password', username, ip_address, f'Attempt {new_attempts}')
                
                return {
                    "success": False,
                    "message": "Invalid credentials",
                    "animation": "pulse_denied",
                    "security_level": "medium" if new_attempts < self.max_login_attempts else "high",
                    "attempts_remaining": max(0, self.max_login_attempts - new_attempts),
                    "timestamp": datetime.now().isoformat()
                }
            
            # Successful authentication
            # Reset login attempts
            cursor.execute('''
                UPDATE user_accounts 
                SET login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (user[0],))
            
            # Generate session token
            session_token = secrets.token_urlsafe(32)
            expires_at = datetime.now() + self.token_expiry
            
            cursor.execute('''
                INSERT INTO login_sessions (
                    user_id, session_token, ip_address, expires_at
                ) VALUES (?, ?, ?, ?)
            ''', (user[0], session_token, ip_address, expires_at))
            
            # Generate JWT token
            jwt_token = self.generate_token({
                'id': user[0],
                'username': user[1],
                'role': user[5],
                'permissions': json.loads(user[6]) if user[6] else {}
            })
            
            conn.commit()
            conn.close()
            
            # Log successful login
            self._log_security_event('successful_login', username, ip_address, 'Authentication successful')
            
            return {
                "success": True,
                "message": "Access granted",
                "animation": "vault_open",
                "user": {
                    "id": user[0],
                    "username": user[1],
                    "role": user[5],
                    "permissions": json.loads(user[6]) if user[6] else {},
                    "first_name": user[12],
                    "last_name": user[13],
                    "employee_id": user[15],
                    "position": user[17]
                },
                "session_token": session_token,
                "jwt_token": jwt_token,
                "expires_at": expires_at.isoformat(),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self._log_security_event('auth_error', username, ip_address, str(e))
            return {
                "success": False,
                "message": "Authentication error occurred",
                "animation": "shake_form",
                "security_level": "low",
                "timestamp": datetime.now().isoformat()
            }
    
    def authenticate_pin_with_feedback(self, pin_code: str, ip_address: str = None) -> Dict:
        """PIN authentication with visual feedback"""
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
                self._log_security_event('failed_pin', pin_code, ip_address, 'Invalid PIN')
                return {
                    "success": False,
                    "message": "Invalid PIN",
                    "animation": "shake_form",
                    "security_level": "low",
                    "timestamp": datetime.now().isoformat()
                }
            
            # Create session if user account exists
            session_token = None
            jwt_token = None
            
            if employee[24]:  # user_id
                session_token = secrets.token_urlsafe(32)
                expires_at = datetime.now() + self.token_expiry
                
                cursor.execute('''
                    INSERT INTO login_sessions (
                        user_id, session_token, ip_address, expires_at
                    ) VALUES (?, ?, ?, ?)
                ''', (employee[24], session_token, ip_address, expires_at))
                
                # Generate JWT token
                jwt_token = self.generate_token({
                    'id': employee[24],
                    'username': employee[25],
                    'role': employee[26],
                    'permissions': json.loads(employee[27]) if employee[27] else {}
                })
            
            conn.commit()
            conn.close()
            
            self._log_security_event('successful_pin', pin_code, ip_address, 'PIN authentication successful')
            
            return {
                "success": True,
                "message": "PIN authentication successful",
                "animation": "vault_open",
                "employee": {
                    "id": employee[0],
                    "employee_id": employee[1],
                    "first_name": employee[2],
                    "last_name": employee[3],
                    "position": employee[6],
                    "user_id": employee[24],
                    "username": employee[25],
                    "role": employee[26],
                    "permissions": json.loads(employee[27]) if employee[27] else {}
                },
                "session_token": session_token,
                "jwt_token": jwt_token,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self._log_security_event('pin_auth_error', pin_code, ip_address, str(e))
            return {
                "success": False,
                "message": "PIN authentication error",
                "animation": "shake_form",
                "security_level": "low",
                "timestamp": datetime.now().isoformat()
            }
    
    def validate_session(self, session_token: str) -> Optional[Dict]:
        """Validate active session"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT ls.*, ua.username, ua.role, ua.permissions, e.first_name, e.last_name
                FROM login_sessions ls
                JOIN user_accounts ua ON ls.user_id = ua.id
                JOIN employees e ON ua.employee_id = e.id
                WHERE ls.session_token = ? AND ls.is_active = 1 AND ls.expires_at > CURRENT_TIMESTAMP
            ''', (session_token,))
            
            session = cursor.fetchone()
            
            if not session:
                conn.close()
                return None
            
            # Update last activity
            cursor.execute('''
                UPDATE login_sessions 
                SET last_activity = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (session[0],))
            
            conn.commit()
            conn.close()
            
            return {
                'user_id': session[1],
                'username': session[8],
                'role': session[9],
                'permissions': json.loads(session[10]) if session[10] else {},
                'first_name': session[11],
                'last_name': session[12],
                'login_time': session[5],
                'last_activity': session[6]
            }
            
        except Exception as e:
            return None
    
    def logout_session(self, session_token: str) -> bool:
        """Logout and invalidate session"""
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
            
            return True
            
        except Exception as e:
            return False
    
    def change_password(self, user_id: int, current_password: str, new_password: str) -> Dict:
        """Change user password with security validation"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get current password hash
            cursor.execute('SELECT password_hash, salt FROM user_accounts WHERE id = ?', (user_id,))
            user = cursor.fetchone()
            
            if not user:
                return {'success': False, 'error': 'User not found'}
            
            # Verify current password
            if not self.verify_password(current_password, user[0], user[1]):
                return {'success': False, 'error': 'Current password is incorrect'}
            
            # Validate new password strength
            password_validation = self._validate_password_strength(new_password)
            if not password_validation['valid']:
                return {'success': False, 'error': password_validation['message']}
            
            # Hash new password
            new_hash, new_salt = self.hash_password(new_password)
            
            # Update password
            cursor.execute('''
                UPDATE user_accounts 
                SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (new_hash, new_salt, user_id))
            
            conn.commit()
            conn.close()
            
            return {'success': True, 'message': 'Password changed successfully'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def request_password_reset(self, email: str) -> Dict:
        """Request password reset with token generation"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Find user by email
            cursor.execute('''
                SELECT ua.id, e.first_name, e.last_name
                FROM user_accounts ua
                JOIN employees e ON ua.employee_id = e.id
                WHERE e.email = ?
            ''', (email,))
            
            user = cursor.fetchone()
            
            if not user:
                # Don't reveal if email exists for security
                return {
                    'success': True,
                    'message': 'If this email exists, password reset instructions have been sent'
                }
            
            # Generate reset token
            reset_token = secrets.token_urlsafe(32)
            expires_at = datetime.now() + timedelta(hours=1)
            
            # Store reset token
            cursor.execute('''
                UPDATE user_accounts 
                SET password_reset_token = ?, password_reset_expires = ?
                WHERE id = ?
            ''', (reset_token, expires_at, user[0]))
            
            conn.commit()
            conn.close()
            
            # Send reset email (would integrate with email service)
            self._send_password_reset_email(email, reset_token, user[1], user[2])
            
            return {
                'success': True,
                'message': 'Password reset instructions have been sent to your email',
                'reset_token': reset_token  # Only for development/testing
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def reset_password(self, reset_token: str, new_password: str) -> Dict:
        """Reset password using token"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Find user with valid reset token
            cursor.execute('''
                SELECT id FROM user_accounts 
                WHERE password_reset_token = ? AND password_reset_expires > CURRENT_TIMESTAMP
            ''', (reset_token,))
            
            user = cursor.fetchone()
            
            if not user:
                return {'success': False, 'error': 'Invalid or expired reset token'}
            
            # Validate new password
            password_validation = self._validate_password_strength(new_password)
            if not password_validation['valid']:
                return {'success': False, 'error': password_validation['message']}
            
            # Hash new password
            new_hash, new_salt = self.hash_password(new_password)
            
            # Update password and clear reset token
            cursor.execute('''
                UPDATE user_accounts 
                SET password_hash = ?, salt = ?, password_reset_token = NULL, 
                    password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (new_hash, new_salt, user[0]))
            
            conn.commit()
            conn.close()
            
            return {'success': True, 'message': 'Password reset successfully'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _validate_password_strength(self, password: str) -> Dict:
        """Validate password strength"""
        if len(password) < 8:
            return {'valid': False, 'message': 'Password must be at least 8 characters long'}
        
        if not any(c.isupper() for c in password):
            return {'valid': False, 'message': 'Password must contain at least one uppercase letter'}
        
        if not any(c.islower() for c in password):
            return {'valid': False, 'message': 'Password must contain at least one lowercase letter'}
        
        if not any(c.isdigit() for c in password):
            return {'valid': False, 'message': 'Password must contain at least one number'}
        
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            return {'valid': False, 'message': 'Password must contain at least one special character'}
        
        return {'valid': True, 'message': 'Password is strong'}
    
    def _log_security_event(self, event_type: str, identifier: str, ip_address: str, details: str):
        """Log security events for monitoring"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create security events table if it doesn't exist
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
            
            cursor.execute('''
                INSERT INTO security_events (event_type, identifier, ip_address, details)
                VALUES (?, ?, ?, ?)
            ''', (event_type, identifier, ip_address, details))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Error logging security event: {e}")
    
    def _send_password_reset_email(self, email: str, reset_token: str, first_name: str, last_name: str):
        """Send password reset email (placeholder for email service integration)"""
        # This would integrate with the email notification service
        reset_link = f"https://platform.poscorp.com/reset-password?token={reset_token}"
        print(f"Password reset email would be sent to {email}")
        print(f"Reset link: {reset_link}")
        print(f"Recipient: {first_name} {last_name}")