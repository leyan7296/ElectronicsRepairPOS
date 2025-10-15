"""
Email Notifications - Premium email templates and delivery system
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from email.mime.base import MIMEBase
from email import encoders
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging
from jinja2 import Template

class EmailNotificationManager:
    def __init__(self, smtp_server: str = "smtp.gmail.com", smtp_port: int = 587):
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.sender_email = os.getenv("SMTP_EMAIL")
        self.sender_password = os.getenv("SMTP_PASSWORD")
        self.logger = logging.getLogger(__name__)
        self.templates = self._load_email_templates()
    
    def _load_email_templates(self) -> Dict[str, str]:
        """Load email templates"""
        return {
            'password_reset': self._get_password_reset_template(),
            'receipt': self._get_receipt_template(),
            'welcome': self._get_welcome_template(),
            'low_stock_alert': self._get_low_stock_alert_template(),
            'daily_report': self._get_daily_report_template(),
            'backup_complete': self._get_backup_complete_template()
        }
    
    def send_password_reset_email(self, user_email: str, reset_token: str, 
                                first_name: str, last_name: str) -> Dict:
        """Send password reset email with premium design"""
        try:
            reset_link = f"https://platform.poscorp.com/reset-password?token={reset_token}"
            expiration_time = datetime.now() + timedelta(hours=1)
            
            template_data = {
                'user_name': f"{first_name} {last_name}",
                'reset_link': reset_link,
                'expiration_time': expiration_time.strftime("%B %d, %Y at %I:%M %p"),
                'support_contact': 'expert@poscorp.com',
                'company_name': 'POS Corp',
                'current_year': datetime.now().year
            }
            
            subject = "🔐 Password Reset Request - POS Platform"
            html_content = self._render_template('password_reset', template_data)
            text_content = self._get_text_version_password_reset(template_data)
            
            return self._send_email(
                to_email=user_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            self.logger.error(f"Failed to send password reset email: {e}")
            return {'success': False, 'error': str(e)}
    
    def send_receipt_email(self, customer_email: str, receipt_data: Dict) -> Dict:
        """Send digital receipt email"""
        try:
            template_data = {
                'customer_name': receipt_data.get('customer_name', 'Valued Customer'),
                'transaction_id': receipt_data['transaction_id'],
                'date': receipt_data['date'],
                'items': receipt_data['items'],
                'subtotal': receipt_data['subtotal'],
                'tax_amount': receipt_data['tax_amount'],
                'discount_amount': receipt_data.get('discount_amount', 0),
                'total_amount': receipt_data['total_amount'],
                'payment_method': receipt_data['payment_method'],
                'company_name': 'POS Corp',
                'store_address': '123 Business St, City, State 12345',
                'store_phone': '(555) 123-4567',
                'current_year': datetime.now().year
            }
            
            subject = f"📧 Your Receipt - Transaction {receipt_data['transaction_id']}"
            html_content = self._render_template('receipt', template_data)
            text_content = self._get_text_version_receipt(template_data)
            
            return self._send_email(
                to_email=customer_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            self.logger.error(f"Failed to send receipt email: {e}")
            return {'success': False, 'error': str(e)}
    
    def send_welcome_email(self, user_email: str, user_name: str, 
                          login_credentials: Dict) -> Dict:
        """Send welcome email to new users"""
        try:
            template_data = {
                'user_name': user_name,
                'username': login_credentials.get('username'),
                'temporary_password': login_credentials.get('password'),
                'login_url': 'https://platform.poscorp.com/login',
                'company_name': 'POS Corp',
                'support_email': 'support@poscorp.com',
                'current_year': datetime.now().year
            }
            
            subject = "🎉 Welcome to POS Platform - Your Account is Ready!"
            html_content = self._render_template('welcome', template_data)
            text_content = self._get_text_version_welcome(template_data)
            
            return self._send_email(
                to_email=user_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            self.logger.error(f"Failed to send welcome email: {e}")
            return {'success': False, 'error': str(e)}
    
    def send_low_stock_alert(self, manager_email: str, low_stock_items: List[Dict]) -> Dict:
        """Send low stock alert to managers"""
        try:
            template_data = {
                'manager_name': 'Manager',
                'low_stock_items': low_stock_items,
                'total_items': len(low_stock_items),
                'company_name': 'POS Corp',
                'inventory_url': 'https://platform.poscorp.com/inventory',
                'current_year': datetime.now().year
            }
            
            subject = f"⚠️ Low Stock Alert - {len(low_stock_items)} Items Need Attention"
            html_content = self._render_template('low_stock_alert', template_data)
            text_content = self._get_text_version_low_stock_alert(template_data)
            
            return self._send_email(
                to_email=manager_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            self.logger.error(f"Failed to send low stock alert: {e}")
            return {'success': False, 'error': str(e)}
    
    def send_daily_report(self, manager_email: str, report_data: Dict) -> Dict:
        """Send daily sales report"""
        try:
            template_data = {
                'manager_name': 'Manager',
                'report_date': report_data['date'],
                'total_sales': report_data['total_sales'],
                'total_transactions': report_data['total_transactions'],
                'average_transaction': report_data['average_transaction'],
                'top_products': report_data.get('top_products', []),
                'company_name': 'POS Corp',
                'dashboard_url': 'https://platform.poscorp.com/dashboard',
                'current_year': datetime.now().year
            }
            
            subject = f"📊 Daily Report - {report_data['date']} - ${report_data['total_sales']:,.2f} in Sales"
            html_content = self._render_template('daily_report', template_data)
            text_content = self._get_text_version_daily_report(template_data)
            
            return self._send_email(
                to_email=manager_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            self.logger.error(f"Failed to send daily report: {e}")
            return {'success': False, 'error': str(e)}
    
    def _send_email(self, to_email: str, subject: str, html_content: str, 
                   text_content: str) -> Dict:
        """Send email using SMTP"""
        try:
            if not self.sender_email or not self.sender_password:
                return {'success': False, 'error': 'SMTP credentials not configured'}
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"POS Platform <{self.sender_email}>"
            message["To"] = to_email
            
            # Add text and HTML parts
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")
            
            message.attach(text_part)
            message.attach(html_part)
            
            # Create secure connection and send email
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, to_email, message.as_string())
            
            self.logger.info(f"Email sent successfully to {to_email}")
            return {'success': True, 'message': 'Email sent successfully'}
            
        except Exception as e:
            self.logger.error(f"Failed to send email: {e}")
            return {'success': False, 'error': str(e)}
    
    def _render_template(self, template_name: str, data: Dict) -> str:
        """Render email template with data"""
        template = Template(self.templates[template_name])
        return template.render(**data)
    
    def _get_password_reset_template(self) -> str:
        """Password reset email template"""
        return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - POS Platform</title>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #0A0F2D 0%, #1a1f3a 100%); }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
        .header { background: linear-gradient(135deg, #00D4FF 0%, #00FFAB 100%); padding: 40px 30px; text-align: center; }
        .header h1 { color: #0A0F2D; margin: 0; font-size: 28px; font-weight: 700; }
        .content { padding: 40px 30px; }
        .content h2 { color: #0A0F2D; font-size: 24px; margin-bottom: 20px; }
        .content p { color: #666; line-height: 1.6; margin-bottom: 20px; }
        .button { display: inline-block; background: linear-gradient(135deg, #00D4FF 0%, #00FFAB 100%); color: #0A0F2D; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .button:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,212,255,0.3); }
        .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; }
        .security-note { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .security-note p { margin: 0; color: #856404; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset</h1>
        </div>
        <div class="content">
            <h2>Hello {{ user_name }}!</h2>
            <p>We received a request to reset your password for your POS Platform account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="{{ reset_link }}" class="button">Reset My Password</a>
            </div>
            
            <div class="security-note">
                <p><strong>Security Note:</strong> This link will expire on {{ expiration_time }}. If you didn't request this password reset, please ignore this email.</p>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">{{ reset_link }}</p>
            
            <p>Need help? Contact our support team at <a href="mailto:{{ support_contact }}">{{ support_contact }}</a></p>
        </div>
        <div class="footer">
            <p>&copy; {{ current_year }} {{ company_name }}. All rights reserved.</p>
            <p>This email was sent to you because you have an account with us.</p>
        </div>
    </div>
</body>
</html>
        """
    
    def _get_text_version_password_reset(self, data: Dict) -> str:
        """Text version of password reset email"""
        return f"""
Password Reset Request - POS Platform

Hello {data['user_name']}!

We received a request to reset your password for your POS Platform account.

To reset your password, please visit this link:
{data['reset_link']}

This link will expire on {data['expiration_time']}.

If you didn't request this password reset, please ignore this email.

Need help? Contact our support team at {data['support_contact']}

© {data['current_year']} {data['company_name']}. All rights reserved.
        """
    
    def _get_receipt_template(self) -> str:
        """Receipt email template"""
        return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Receipt - POS Platform</title>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #0A0F2D 0%, #1a1f3a 100%); padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .receipt-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .items-table th { background: #f8f9fa; font-weight: 600; }
        .total-section { background: #e8f4fd; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
        .total-row.final { font-weight: 700; font-size: 18px; border-top: 2px solid #00D4FF; padding-top: 10px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 Your Digital Receipt</h1>
        </div>
        <div class="content">
            <div class="receipt-info">
                <h2>Thank you for your purchase, {{ customer_name }}!</h2>
                <p><strong>Transaction ID:</strong> {{ transaction_id }}</p>
                <p><strong>Date:</strong> {{ date }}</p>
                <p><strong>Payment Method:</strong> {{ payment_method }}</p>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {% for item in items %}
                    <tr>
                        <td>{{ item.name }}</td>
                        <td>{{ item.quantity }}</td>
                        <td>${{ "%.2f"|format(item.price) }}</td>
                        <td>${{ "%.2f"|format(item.price * item.quantity) }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
            
            <div class="total-section">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>${{ "%.2f"|format(subtotal) }}</span>
                </div>
                {% if discount_amount > 0 %}
                <div class="total-row">
                    <span>Discount:</span>
                    <span>-${{ "%.2f"|format(discount_amount) }}</span>
                </div>
                {% endif %}
                <div class="total-row">
                    <span>Tax:</span>
                    <span>${{ "%.2f"|format(tax_amount) }}</span>
                </div>
                <div class="total-row final">
                    <span>Total:</span>
                    <span>${{ "%.2f"|format(total_amount) }}</span>
                </div>
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
                <strong>{{ company_name }}</strong><br>
                {{ store_address }}<br>
                {{ store_phone }}
            </p>
        </div>
        <div class="footer">
            <p>&copy; {{ current_year }} {{ company_name }}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        """
    
    def _get_text_version_receipt(self, data: Dict) -> str:
        """Text version of receipt email"""
        items_text = ""
        for item in data['items']:
            items_text += f"{item['name']} x{item['quantity']} @ ${item['price']:.2f} = ${item['price'] * item['quantity']:.2f}\n"
        
        return f"""
Your Digital Receipt - POS Platform

Thank you for your purchase, {data['customer_name']}!

Transaction ID: {data['transaction_id']}
Date: {data['date']}
Payment Method: {data['payment_method']}

Items:
{items_text}

Subtotal: ${data['subtotal']:.2f}
{% if data['discount_amount'] > 0 %}Discount: -${data['discount_amount']:.2f}{% endif %}
Tax: ${data['tax_amount']:.2f}
Total: ${data['total_amount']:.2f}

{data['company_name']}
{data['store_address']}
{data['store_phone']}

© {data['current_year']} {data['company_name']}. All rights reserved.
        """
    
    def _get_welcome_template(self) -> str:
        """Welcome email template"""
        return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to POS Platform</title>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #0A0F2D 0%, #1a1f3a 100%); }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
        .header { background: linear-gradient(135deg, #00D4FF 0%, #00FFAB 100%); padding: 40px 30px; text-align: center; }
        .header h1 { color: #0A0F2D; margin: 0; font-size: 28px; font-weight: 700; }
        .content { padding: 40px 30px; }
        .credentials { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .credentials h3 { color: #0A0F2D; margin-top: 0; }
        .credentials p { margin: 5px 0; font-family: monospace; background: white; padding: 10px; border-radius: 4px; }
        .button { display: inline-block; background: linear-gradient(135deg, #00D4FF 0%, #00FFAB 100%); color: #0A0F2D; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to POS Platform!</h1>
        </div>
        <div class="content">
            <h2>Hello {{ user_name }}!</h2>
            <p>Your POS Platform account has been created successfully. You can now access the powerful features of our point-of-sale system.</p>
            
            <div class="credentials">
                <h3>Your Login Credentials:</h3>
                <p><strong>Username:</strong> {{ username }}</p>
                <p><strong>Temporary Password:</strong> {{ temporary_password }}</p>
            </div>
            
            <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
            
            <div style="text-align: center;">
                <a href="{{ login_url }}" class="button">Access Your Account</a>
            </div>
            
            <h3>What's Next?</h3>
            <ul>
                <li>Log in to your account using the credentials above</li>
                <li>Set up your store information and preferences</li>
                <li>Add your first products to the inventory</li>
                <li>Configure payment methods and tax settings</li>
                <li>Start processing sales!</li>
            </ul>
            
            <p>Need help getting started? Contact our support team at <a href="mailto:{{ support_email }}">{{ support_email }}</a></p>
        </div>
        <div class="footer">
            <p>&copy; {{ current_year }} {{ company_name }}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        """
    
    def _get_text_version_welcome(self, data: Dict) -> str:
        """Text version of welcome email"""
        return f"""
Welcome to POS Platform!

Hello {data['user_name']}!

Your POS Platform account has been created successfully.

Your Login Credentials:
Username: {data['username']}
Temporary Password: {data['temporary_password']}

IMPORTANT: Please change your password after your first login.

Access your account: {data['login_url']}

What's Next?
- Log in to your account using the credentials above
- Set up your store information and preferences
- Add your first products to the inventory
- Configure payment methods and tax settings
- Start processing sales!

Need help? Contact our support team at {data['support_email']}

© {data['current_year']} {data['company_name']}. All rights reserved.
        """
    
    def _get_low_stock_alert_template(self) -> str:
        """Low stock alert template"""
        return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Low Stock Alert - POS Platform</title>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%); padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .alert-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .alert-table th, .alert-table td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .alert-table th { background: #f8f9fa; font-weight: 600; }
        .alert-table .low-stock { color: #dc3545; font-weight: 600; }
        .button { display: inline-block; background: linear-gradient(135deg, #00D4FF 0%, #00FFAB 100%); color: #0A0F2D; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Low Stock Alert</h1>
        </div>
        <div class="content">
            <h2>Hello {{ manager_name }}!</h2>
            <p>We have {{ total_items }} items that are running low on stock and need your attention:</p>
            
            <table class="alert-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Current Stock</th>
                        <th>Min Level</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {% for item in low_stock_items %}
                    <tr>
                        <td>{{ item.name }}</td>
                        <td>{{ item.sku }}</td>
                        <td>{{ item.current_stock }}</td>
                        <td>{{ item.min_stock_level }}</td>
                        <td class="low-stock">LOW STOCK</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
            
            <div style="text-align: center;">
                <a href="{{ inventory_url }}" class="button">Manage Inventory</a>
            </div>
            
            <p>Please review these items and consider placing orders to avoid stockouts.</p>
        </div>
        <div class="footer">
            <p>&copy; {{ current_year }} {{ company_name }}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        """
    
    def _get_text_version_low_stock_alert(self, data: Dict) -> str:
        """Text version of low stock alert"""
        items_text = ""
        for item in data['low_stock_items']:
            items_text += f"{item['name']} (SKU: {item['sku']}) - Current: {item['current_stock']}, Min: {item['min_stock_level']}\n"
        
        return f"""
Low Stock Alert - POS Platform

Hello {data['manager_name']}!

We have {data['total_items']} items that are running low on stock:

{items_text}

Please review these items and consider placing orders to avoid stockouts.

Manage inventory: {data['inventory_url']}

© {data['current_year']} {data['company_name']}. All rights reserved.
        """
    
    def _get_daily_report_template(self) -> str:
        """Daily report template"""
        return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Report - POS Platform</title>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #0A0F2D 0%, #1a1f3a 100%); padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: 700; color: #00D4FF; }
        .stat-label { color: #666; margin-top: 5px; }
        .top-products { margin: 20px 0; }
        .product-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6; }
        .button { display: inline-block; background: linear-gradient(135deg, #00D4FF 0%, #00FFAB 100%); color: #0A0F2D; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Daily Sales Report</h1>
            <p>{{ report_date }}</p>
        </div>
        <div class="content">
            <h2>Hello {{ manager_name }}!</h2>
            <p>Here's your daily sales summary:</p>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${{ "%.2f"|format(total_sales) }}</div>
                    <div class="stat-label">Total Sales</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{{ total_transactions }}</div>
                    <div class="stat-label">Transactions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${{ "%.2f"|format(average_transaction) }}</div>
                    <div class="stat-label">Avg Transaction</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{{ top_products|length }}</div>
                    <div class="stat-label">Top Products</div>
                </div>
            </div>
            
            {% if top_products %}
            <div class="top-products">
                <h3>Top Selling Products</h3>
                {% for product in top_products %}
                <div class="product-item">
                    <span>{{ product.name }}</span>
                    <span>{{ product.quantity_sold }} sold</span>
                </div>
                {% endfor %}
            </div>
            {% endif %}
            
            <div style="text-align: center;">
                <a href="{{ dashboard_url }}" class="button">View Full Dashboard</a>
            </div>
        </div>
        <div class="footer">
            <p>&copy; {{ current_year }} {{ company_name }}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        """
    
    def _get_text_version_daily_report(self, data: Dict) -> str:
        """Text version of daily report"""
        top_products_text = ""
        for product in data.get('top_products', []):
            top_products_text += f"- {product['name']}: {product['quantity_sold']} sold\n"
        
        return f"""
Daily Sales Report - POS Platform

Hello {data['manager_name']}!

Daily Summary for {data['report_date']}:

Total Sales: ${data['total_sales']:.2f}
Total Transactions: {data['total_transactions']}
Average Transaction: ${data['average_transaction']:.2f}

Top Selling Products:
{top_products_text}

View full dashboard: {data['dashboard_url']}

© {data['current_year']} {data['company_name']}. All rights reserved.
        """
    
    def _get_backup_complete_template(self) -> str:
        """Backup complete template"""
        return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Backup Complete - POS Platform</title>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #00FFAB 0%, #00D4FF 100%); padding: 30px; text-align: center; color: #0A0F2D; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .backup-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Backup Complete</h1>
        </div>
        <div class="content">
            <h2>Database Backup Successful</h2>
            <p>Your POS Platform database has been successfully backed up.</p>
            
            <div class="backup-info">
                <p><strong>Backup File:</strong> {{ backup_filename }}</p>
                <p><strong>Backup Size:</strong> {{ backup_size }}</p>
                <p><strong>Backup Time:</strong> {{ backup_time }}</p>
                <p><strong>Location:</strong> {{ backup_location }}</p>
            </div>
            
            <p>Your data is safe and secure. This backup can be used to restore your system if needed.</p>
        </div>
        <div class="footer">
            <p>&copy; {{ current_year }} {{ company_name }}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        """