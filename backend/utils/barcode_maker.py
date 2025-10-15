"""
Barcode Maker - Generate and print barcodes for products
"""
import qrcode
import barcode
from barcode import Code128, EAN13, Code39
from barcode.writer import ImageWriter
import io
import base64
from PIL import Image, ImageDraw, ImageFont
import os
from typing import Dict, List, Optional, Tuple
import logging

class BarcodeGenerator:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.supported_formats = ['QR', 'Code128', 'EAN13', 'Code39']
        self.default_size = (300, 100)
        self.qr_size = (200, 200)
    
    def generate_barcode(self, data: str, barcode_type: str = 'Code128', 
                        size: Tuple[int, int] = None, include_text: bool = True) -> Dict:
        """Generate barcode image"""
        try:
            if barcode_type not in self.supported_formats:
                return {'success': False, 'error': f'Unsupported barcode type: {barcode_type}'}
            
            if not size:
                size = self.qr_size if barcode_type == 'QR' else self.default_size
            
            if barcode_type == 'QR':
                return self._generate_qr_code(data, size, include_text)
            else:
                return self._generate_linear_barcode(data, barcode_type, size, include_text)
                
        except Exception as e:
            self.logger.error(f"Failed to generate barcode: {e}")
            return {'success': False, 'error': str(e)}
    
    def _generate_qr_code(self, data: str, size: Tuple[int, int], include_text: bool) -> Dict:
        """Generate QR code"""
        try:
            # Create QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(data)
            qr.make(fit=True)
            
            # Create image
            qr_image = qr.make_image(fill_color="black", back_color="white")
            
            # Resize if needed
            if qr_image.size != size:
                qr_image = qr_image.resize(size, Image.Resampling.LANCZOS)
            
            # Add text if requested
            if include_text:
                qr_image = self._add_text_to_image(qr_image, data, 'bottom')
            
            # Convert to base64
            img_str = self._image_to_base64(qr_image)
            
            return {
                'success': True,
                'barcode_data': data,
                'barcode_type': 'QR',
                'barcode_image': img_str,
                'size': size
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _generate_linear_barcode(self, data: str, barcode_type: str, 
                                size: Tuple[int, int], include_text: bool) -> Dict:
        """Generate linear barcode"""
        try:
            # Create barcode
            if barcode_type == 'Code128':
                barcode_class = Code128
            elif barcode_type == 'EAN13':
                barcode_class = EAN13
            elif barcode_type == 'Code39':
                barcode_class = Code39
            else:
                return {'success': False, 'error': f'Unsupported barcode type: {barcode_type}'}
            
            # Generate barcode
            barcode_instance = barcode_class(data, writer=ImageWriter())
            
            # Save to bytes
            buffer = io.BytesIO()
            barcode_instance.write(buffer, options={
                'module_width': 0.4,
                'module_height': 15.0,
                'quiet_zone': 6.5,
                'font_size': 10,
                'text_distance': 5.0,
                'background': 'white',
                'foreground': 'black',
                'write_text': include_text
            })
            buffer.seek(0)
            
            # Open image
            barcode_image = Image.open(buffer)
            
            # Resize if needed
            if barcode_image.size != size:
                barcode_image = barcode_image.resize(size, Image.Resampling.LANCZOS)
            
            # Convert to base64
            img_str = self._image_to_base64(barcode_image)
            
            return {
                'success': True,
                'barcode_data': data,
                'barcode_type': barcode_type,
                'barcode_image': img_str,
                'size': size
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def generate_product_barcode(self, product_data: Dict) -> Dict:
        """Generate barcode for a specific product"""
        try:
            # Extract product information
            product_id = product_data.get('id')
            sku = product_data.get('sku')
            name = product_data.get('name', '')
            price = product_data.get('price', 0)
            
            # Create barcode data
            barcode_data = sku or str(product_id)
            
            # Generate barcode
            result = self.generate_barcode(
                data=barcode_data,
                barcode_type='Code128',
                size=(400, 120),
                include_text=True
            )
            
            if not result['success']:
                return result
            
            # Create enhanced product label
            enhanced_image = self._create_product_label(
                result['barcode_image'],
                product_data,
                barcode_data
            )
            
            return {
                'success': True,
                'barcode_data': barcode_data,
                'barcode_type': 'Code128',
                'barcode_image': enhanced_image,
                'product_info': {
                    'id': product_id,
                    'sku': sku,
                    'name': name,
                    'price': price
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to generate product barcode: {e}")
            return {'success': False, 'error': str(e)}
    
    def generate_batch_barcodes(self, products: List[Dict]) -> Dict:
        """Generate barcodes for multiple products"""
        try:
            results = []
            failed_products = []
            
            for product in products:
                result = self.generate_product_barcode(product)
                if result['success']:
                    results.append(result)
                else:
                    failed_products.append({
                        'product_id': product.get('id'),
                        'error': result['error']
                    })
            
            return {
                'success': True,
                'generated_count': len(results),
                'failed_count': len(failed_products),
                'barcodes': results,
                'failed_products': failed_products
            }
            
        except Exception as e:
            self.logger.error(f"Failed to generate batch barcodes: {e}")
            return {'success': False, 'error': str(e)}
    
    def create_barcode_sheet(self, barcodes: List[Dict], 
                           labels_per_row: int = 3, 
                           labels_per_column: int = 10) -> Dict:
        """Create a printable sheet with multiple barcodes"""
        try:
            # Calculate sheet dimensions
            label_width = 200
            label_height = 100
            sheet_width = labels_per_row * label_width
            sheet_height = labels_per_column * label_height
            
            # Create sheet
            sheet = Image.new('RGB', (sheet_width, sheet_height), 'white')
            
            # Place barcodes on sheet
            for i, barcode_data in enumerate(barcodes):
                if i >= labels_per_row * labels_per_column:
                    break
                
                # Calculate position
                row = i // labels_per_row
                col = i % labels_per_row
                x = col * label_width
                y = row * label_height
                
                # Decode barcode image
                barcode_image = self._base64_to_image(barcode_data['barcode_image'])
                
                # Resize to fit label
                barcode_image = barcode_image.resize((label_width - 10, label_height - 10), 
                                                   Image.Resampling.LANCZOS)
                
                # Paste onto sheet
                sheet.paste(barcode_image, (x + 5, y + 5))
            
            # Convert to base64
            sheet_str = self._image_to_base64(sheet)
            
            return {
                'success': True,
                'sheet_image': sheet_str,
                'labels_count': len(barcodes),
                'sheet_dimensions': (sheet_width, sheet_height)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to create barcode sheet: {e}")
            return {'success': False, 'error': str(e)}
    
    def _create_product_label(self, barcode_image_str: str, product_data: Dict, 
                            barcode_data: str) -> str:
        """Create enhanced product label with barcode"""
        try:
            # Decode barcode image
            barcode_image = self._base64_to_image(barcode_image_str)
            
            # Create label canvas
            label_width = 400
            label_height = 200
            label = Image.new('RGB', (label_width, label_height), 'white')
            draw = ImageDraw.Draw(label)
            
            # Try to load a font
            try:
                font_large = ImageFont.truetype("arial.ttf", 16)
                font_medium = ImageFont.truetype("arial.ttf", 12)
                font_small = ImageFont.truetype("arial.ttf", 10)
            except:
                font_large = ImageFont.load_default()
                font_medium = ImageFont.load_default()
                font_small = ImageFont.load_default()
            
            # Add product name
            product_name = product_data.get('name', 'Product')
            if len(product_name) > 30:
                product_name = product_name[:27] + '...'
            
            draw.text((10, 10), product_name, fill='black', font=font_large)
            
            # Add SKU
            sku = product_data.get('sku', 'N/A')
            draw.text((10, 35), f"SKU: {sku}", fill='gray', font=font_medium)
            
            # Add price
            price = product_data.get('price', 0)
            draw.text((10, 55), f"${price:.2f}", fill='black', font=font_large)
            
            # Add barcode
            barcode_width = 300
            barcode_height = 80
            barcode_resized = barcode_image.resize((barcode_width, barcode_height), 
                                                 Image.Resampling.LANCZOS)
            label.paste(barcode_resized, (50, 100))
            
            # Add barcode data below
            draw.text((50, 185), barcode_data, fill='black', font=font_small)
            
            # Add company info
            draw.text((label_width - 100, label_height - 20), "POS Corp", 
                     fill='gray', font=font_small)
            
            return self._image_to_base64(label)
            
        except Exception as e:
            self.logger.error(f"Failed to create product label: {e}")
            return barcode_image_str  # Return original if enhancement fails
    
    def _add_text_to_image(self, image: Image.Image, text: str, position: str) -> Image.Image:
        """Add text to image"""
        try:
            # Create new image with space for text
            text_height = 30
            new_height = image.height + text_height
            new_image = Image.new('RGB', (image.width, new_height), 'white')
            
            # Paste original image
            if position == 'bottom':
                new_image.paste(image, (0, 0))
                text_y = image.height + 5
            else:  # top
                new_image.paste(image, (0, text_height))
                text_y = 5
            
            # Add text
            draw = ImageDraw.Draw(new_image)
            try:
                font = ImageFont.truetype("arial.ttf", 12)
            except:
                font = ImageFont.load_default()
            
            # Center text
            text_width = draw.textlength(text, font=font)
            text_x = (image.width - text_width) // 2
            
            draw.text((text_x, text_y), text, fill='black', font=font)
            
            return new_image
            
        except Exception as e:
            self.logger.error(f"Failed to add text to image: {e}")
            return image
    
    def _image_to_base64(self, image: Image.Image) -> str:
        """Convert PIL Image to base64 string"""
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return f'data:image/png;base64,{img_str}'
    
    def _base64_to_image(self, base64_str: str) -> Image.Image:
        """Convert base64 string to PIL Image"""
        # Remove data URL prefix if present
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        
        image_data = base64.b64decode(base64_str)
        return Image.open(io.BytesIO(image_data))
    
    def validate_barcode_data(self, data: str, barcode_type: str) -> Dict:
        """Validate barcode data before generation"""
        try:
            if not data or not data.strip():
                return {'valid': False, 'error': 'Barcode data cannot be empty'}
            
            data = data.strip()
            
            if barcode_type == 'EAN13':
                if not data.isdigit():
                    return {'valid': False, 'error': 'EAN13 barcodes must contain only digits'}
                if len(data) != 12 and len(data) != 13:
                    return {'valid': False, 'error': 'EAN13 barcodes must be 12 or 13 digits'}
            
            elif barcode_type == 'Code39':
                if not all(c.isalnum() or c in ' -.$/+%' for c in data):
                    return {'valid': False, 'error': 'Code39 barcodes can only contain alphanumeric characters and -.$/+%'}
                if len(data) > 43:
                    return {'valid': False, 'error': 'Code39 barcodes cannot exceed 43 characters'}
            
            elif barcode_type == 'Code128':
                if len(data) > 80:
                    return {'valid': False, 'error': 'Code128 barcodes cannot exceed 80 characters'}
            
            elif barcode_type == 'QR':
                if len(data) > 2953:
                    return {'valid': False, 'error': 'QR codes cannot exceed 2953 characters'}
            
            return {'valid': True, 'message': 'Barcode data is valid'}
            
        except Exception as e:
            return {'valid': False, 'error': str(e)}
    
    def get_barcode_info(self, barcode_data: str) -> Dict:
        """Get information about a barcode"""
        try:
            # This would typically involve looking up the barcode in a database
            # For now, return basic information
            return {
                'success': True,
                'barcode_data': barcode_data,
                'length': len(barcode_data),
                'type': 'unknown',
                'product_info': None
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def print_barcode(self, barcode_image_str: str, printer_name: str = None) -> Dict:
        """Print barcode (placeholder for printer integration)"""
        try:
            # This would integrate with actual printer drivers
            # For now, just return success
            self.logger.info(f"Barcode would be printed to {printer_name or 'default printer'}")
            
            return {
                'success': True,
                'message': f'Barcode sent to {printer_name or "default printer"}',
                'printer': printer_name or 'default'
            }
            
        except Exception as e:
            self.logger.error(f"Failed to print barcode: {e}")
            return {'success': False, 'error': str(e)}