/**
 * CheckoutScreen.js - Main transaction interface
 * Premium POS checkout experience with advanced features
 */

class CheckoutScreen {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.cart = [];
        this.customer = null;
        this.paymentMethod = 'cash';
        this.discount = null;
        this.taxRate = 0.0875;
        this.isDemo = true;
        this.transactionCount = 0;
        this.maxDemoTransactions = 25;
        
        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
        this.loadDemoData();
    }

    render() {
        this.container.innerHTML = `
            <div class="checkout-container">
                <div class="checkout-header">
                    <h2>Checkout</h2>
                    <div class="checkout-actions">
                        <button class="btn-secondary" id="new-transaction">New Transaction</button>
                        <button class="btn-primary" id="process-payment" ${this.isDemo && this.transactionCount >= this.maxDemoTransactions ? 'disabled' : ''}>
                            Process Payment
                        </button>
                    </div>
                </div>

                <div class="checkout-content">
                    <div class="checkout-left">
                        <!-- Product Search -->
                        <div class="product-search">
                            <div class="search-input-container">
                                <input type="text" id="product-search" placeholder="Search products or scan barcode..." autocomplete="off">
                                <button class="search-btn" id="search-btn">🔍</button>
                                <button class="barcode-btn" id="barcode-btn">📷</button>
                            </div>
                            <div class="search-results" id="search-results"></div>
                        </div>

                        <!-- Cart Items -->
                        <div class="cart-section">
                            <h3>Cart Items</h3>
                            <div class="cart-items" id="cart-items">
                                <div class="empty-cart">
                                    <div class="empty-icon">🛒</div>
                                    <p>No items in cart</p>
                                    <p class="empty-subtitle">Search and add products to get started</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="checkout-right">
                        <!-- Customer Info -->
                        <div class="customer-section">
                            <h3>Customer</h3>
                            <div class="customer-info">
                                <div class="customer-search">
                                    <input type="text" id="customer-search" placeholder="Search customer..." autocomplete="off">
                                    <button class="customer-search-btn" id="customer-search-btn">🔍</button>
                                </div>
                                <div class="customer-details" id="customer-details">
                                    <div class="no-customer">
                                        <span>Walk-in Customer</span>
                                        <button class="btn-small" id="add-customer">Add Customer</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Payment Summary -->
                        <div class="payment-summary">
                            <h3>Payment Summary</h3>
                            <div class="summary-details">
                                <div class="summary-row">
                                    <span>Subtotal:</span>
                                    <span id="subtotal">$0.00</span>
                                </div>
                                <div class="summary-row">
                                    <span>Tax (${(this.taxRate * 100).toFixed(2)}%):</span>
                                    <span id="tax-amount">$0.00</span>
                                </div>
                                <div class="summary-row discount-row" style="display: none;">
                                    <span>Discount:</span>
                                    <span id="discount-amount">-$0.00</span>
                                </div>
                                <div class="summary-row total-row">
                                    <span>Total:</span>
                                    <span id="total-amount">$0.00</span>
                                </div>
                            </div>

                            <!-- Discount Section -->
                            <div class="discount-section">
                                <button class="btn-small" id="apply-discount">Apply Discount</button>
                                <div class="discount-form" id="discount-form" style="display: none;">
                                    <select id="discount-type">
                                        <option value="percentage">Percentage</option>
                                        <option value="fixed">Fixed Amount</option>
                                    </select>
                                    <input type="number" id="discount-value" placeholder="Discount value" step="0.01" min="0">
                                    <button class="btn-small" id="apply-discount-btn">Apply</button>
                                    <button class="btn-small btn-cancel" id="cancel-discount">Cancel</button>
                                </div>
                            </div>

                            <!-- Payment Methods -->
                            <div class="payment-methods">
                                <h4>Payment Method</h4>
                                <div class="payment-options">
                                    <label class="payment-option">
                                        <input type="radio" name="payment" value="cash" checked>
                                        <span class="payment-label">💵 Cash</span>
                                    </label>
                                    <label class="payment-option">
                                        <input type="radio" name="payment" value="card">
                                        <span class="payment-label">💳 Card</span>
                                    </label>
                                    <label class="payment-option">
                                        <input type="radio" name="payment" value="mobile">
                                        <span class="payment-label">📱 Mobile Pay</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Demo Limitation Notice -->
                            ${this.isDemo ? `
                                <div class="demo-notice">
                                    <div class="demo-icon">⚠️</div>
                                    <div class="demo-text">
                                        <strong>Demo Mode</strong><br>
                                        ${this.maxDemoTransactions - this.transactionCount} transactions remaining
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Receipt Modal -->
                <div class="receipt-modal" id="receipt-modal" style="display: none;">
                    <div class="receipt-content">
                        <div class="receipt-header">
                            <h3>Transaction Complete</h3>
                            <button class="close-btn" id="close-receipt">×</button>
                        </div>
                        <div class="receipt-body" id="receipt-body"></div>
                        <div class="receipt-actions">
                            <button class="btn-secondary" id="print-receipt">Print Receipt</button>
                            <button class="btn-secondary" id="email-receipt">Email Receipt</button>
                            <button class="btn-primary" id="new-sale">New Sale</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Product search
        document.getElementById('product-search').addEventListener('input', (e) => {
            this.searchProducts(e.target.value);
        });

        document.getElementById('search-btn').addEventListener('click', () => {
            const query = document.getElementById('product-search').value;
            this.searchProducts(query);
        });

        document.getElementById('barcode-btn').addEventListener('click', () => {
            this.scanBarcode();
        });

        // Customer search
        document.getElementById('customer-search').addEventListener('input', (e) => {
            this.searchCustomers(e.target.value);
        });

        document.getElementById('add-customer').addEventListener('click', () => {
            this.showAddCustomerModal();
        });

        // Payment methods
        document.querySelectorAll('input[name="payment"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.paymentMethod = e.target.value;
            });
        });

        // Discount
        document.getElementById('apply-discount').addEventListener('click', () => {
            this.toggleDiscountForm();
        });

        document.getElementById('apply-discount-btn').addEventListener('click', () => {
            this.applyDiscount();
        });

        document.getElementById('cancel-discount').addEventListener('click', () => {
            this.toggleDiscountForm();
        });

        // Process payment
        document.getElementById('process-payment').addEventListener('click', () => {
            this.processPayment();
        });

        // New transaction
        document.getElementById('new-transaction').addEventListener('click', () => {
            this.newTransaction();
        });

        // Receipt modal
        document.getElementById('close-receipt').addEventListener('click', () => {
            this.closeReceipt();
        });

        document.getElementById('print-receipt').addEventListener('click', () => {
            this.printReceipt();
        });

        document.getElementById('email-receipt').addEventListener('click', () => {
            this.emailReceipt();
        });

        document.getElementById('new-sale').addEventListener('click', () => {
            this.newTransaction();
            this.closeReceipt();
        });
    }

    loadDemoData() {
        // Load demo products
        this.demoProducts = [
            { id: 1, name: 'Wireless Headphones', price: 99.99, sku: 'WH001', category: 'Electronics' },
            { id: 2, name: 'Coffee Mug', price: 12.99, sku: 'CM001', category: 'Accessories' },
            { id: 3, name: 'T-Shirt', price: 24.99, sku: 'TS001', category: 'Clothing' },
            { id: 4, name: 'Smart Watch', price: 299.99, sku: 'SW001', category: 'Electronics' },
            { id: 5, name: 'Notebook', price: 8.99, sku: 'NB001', category: 'Office' },
            { id: 6, name: 'Water Bottle', price: 19.99, sku: 'WB001', category: 'Accessories' }
        ];

        // Load demo customers
        this.demoCustomers = [
            { id: 1, name: 'John Smith', email: 'john@example.com', phone: '(555) 123-4567', loyalty_points: 150 },
            { id: 2, name: 'Sarah Johnson', email: 'sarah@example.com', phone: '(555) 234-5678', loyalty_points: 320 },
            { id: 3, name: 'Mike Wilson', email: 'mike@example.com', phone: '(555) 345-6789', loyalty_points: 75 }
        ];
    }

    searchProducts(query) {
        if (!query.trim()) {
            document.getElementById('search-results').innerHTML = '';
            return;
        }

        const results = this.demoProducts.filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.sku.toLowerCase().includes(query.toLowerCase())
        );

        this.displaySearchResults(results);
    }

    displaySearchResults(products) {
        const resultsContainer = document.getElementById('search-results');
        
        if (products.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No products found</div>';
            return;
        }

        resultsContainer.innerHTML = products.map(product => `
            <div class="product-result" data-product-id="${product.id}">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-details">
                        <span class="product-sku">SKU: ${product.sku}</span>
                        <span class="product-category">${product.category}</span>
                    </div>
                </div>
                <div class="product-price">$${product.price.toFixed(2)}</div>
                <button class="btn-add" onclick="checkoutScreen.addToCart(${product.id})">Add</button>
            </div>
        `).join('');
    }

    addToCart(productId) {
        const product = this.demoProducts.find(p => p.id === productId);
        if (!product) return;

        const existingItem = this.cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                ...product,
                quantity: 1
            });
        }

        this.updateCartDisplay();
        this.updatePaymentSummary();
        this.clearSearch();
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.updateCartDisplay();
        this.updatePaymentSummary();
    }

    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                item.quantity = quantity;
                this.updateCartDisplay();
                this.updatePaymentSummary();
            }
        }
    }

    updateCartDisplay() {
        const cartContainer = document.getElementById('cart-items');
        
        if (this.cart.length === 0) {
            cartContainer.innerHTML = `
                <div class="empty-cart">
                    <div class="empty-icon">🛒</div>
                    <p>No items in cart</p>
                    <p class="empty-subtitle">Search and add products to get started</p>
                </div>
            `;
            return;
        }

        cartContainer.innerHTML = this.cart.map(item => `
            <div class="cart-item">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-sku">SKU: ${item.sku}</div>
                </div>
                <div class="item-controls">
                    <button class="qty-btn" onclick="checkoutScreen.updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="qty-btn" onclick="checkoutScreen.updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                </div>
                <div class="item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                <button class="remove-btn" onclick="checkoutScreen.removeFromCart(${item.id})">×</button>
            </div>
        `).join('');
    }

    updatePaymentSummary() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxAmount = subtotal * this.taxRate;
        const discountAmount = this.discount ? this.calculateDiscount(subtotal) : 0;
        const total = subtotal + taxAmount - discountAmount;

        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('tax-amount').textContent = `$${taxAmount.toFixed(2)}`;
        document.getElementById('total-amount').textContent = `$${total.toFixed(2)}`;

        if (this.discount) {
            document.querySelector('.discount-row').style.display = 'flex';
            document.getElementById('discount-amount').textContent = `-$${discountAmount.toFixed(2)}`;
        } else {
            document.querySelector('.discount-row').style.display = 'none';
        }
    }

    calculateDiscount(subtotal) {
        if (!this.discount) return 0;
        
        if (this.discount.type === 'percentage') {
            return subtotal * (this.discount.value / 100);
        } else {
            return Math.min(this.discount.value, subtotal);
        }
    }

    searchCustomers(query) {
        if (!query.trim()) {
            document.getElementById('customer-details').innerHTML = `
                <div class="no-customer">
                    <span>Walk-in Customer</span>
                    <button class="btn-small" id="add-customer">Add Customer</button>
                </div>
            `;
            return;
        }

        const results = this.demoCustomers.filter(customer => 
            customer.name.toLowerCase().includes(query.toLowerCase()) ||
            customer.email.toLowerCase().includes(query.toLowerCase()) ||
            customer.phone.includes(query)
        );

        if (results.length > 0) {
            const customer = results[0];
            document.getElementById('customer-details').innerHTML = `
                <div class="customer-selected">
                    <div class="customer-name">${customer.name}</div>
                    <div class="customer-contact">${customer.email} • ${customer.phone}</div>
                    <div class="customer-loyalty">Loyalty Points: ${customer.loyalty_points}</div>
                    <button class="btn-small btn-clear" onclick="checkoutScreen.clearCustomer()">Clear</button>
                </div>
            `;
            this.customer = customer;
        }
    }

    clearCustomer() {
        this.customer = null;
        document.getElementById('customer-search').value = '';
        document.getElementById('customer-details').innerHTML = `
            <div class="no-customer">
                <span>Walk-in Customer</span>
                <button class="btn-small" id="add-customer">Add Customer</button>
            </div>
        `;
    }

    toggleDiscountForm() {
        const form = document.getElementById('discount-form');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    }

    applyDiscount() {
        const type = document.getElementById('discount-type').value;
        const value = parseFloat(document.getElementById('discount-value').value);

        if (!value || value <= 0) {
            alert('Please enter a valid discount value');
            return;
        }

        this.discount = { type, value };
        this.updatePaymentSummary();
        this.toggleDiscountForm();
        
        // Clear form
        document.getElementById('discount-value').value = '';
    }

    processPayment() {
        if (this.cart.length === 0) {
            alert('Please add items to cart before processing payment');
            return;
        }

        if (this.isDemo && this.transactionCount >= this.maxDemoTransactions) {
            this.showUpgradePrompt();
            return;
        }

        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxAmount = subtotal * this.taxRate;
        const discountAmount = this.discount ? this.calculateDiscount(subtotal) : 0;
        const total = subtotal + taxAmount - discountAmount;

        // Generate transaction ID
        const transactionId = `TXN${Date.now()}`;

        // Process payment (simulate)
        this.showProcessingAnimation();

        setTimeout(() => {
            this.transactionCount++;
            this.showReceipt({
                transactionId,
                items: this.cart,
                subtotal,
                taxAmount,
                discountAmount,
                total,
                paymentMethod: this.paymentMethod,
                customer: this.customer
            });
        }, 2000);
    }

    showProcessingAnimation() {
        const button = document.getElementById('process-payment');
        const originalText = button.textContent;
        
        button.disabled = true;
        button.textContent = 'Processing...';
        button.classList.add('loading');

        setTimeout(() => {
            button.disabled = false;
            button.textContent = originalText;
            button.classList.remove('loading');
        }, 2000);
    }

    showReceipt(transactionData) {
        const receiptBody = document.getElementById('receipt-body');
        
        receiptBody.innerHTML = `
            <div class="receipt">
                <div class="receipt-header">
                    <h3>POS Platform</h3>
                    <p>Transaction #${transactionData.transactionId}</p>
                    <p>${new Date().toLocaleString()}</p>
                </div>
                
                <div class="receipt-items">
                    ${transactionData.items.map(item => `
                        <div class="receipt-item">
                            <span>${item.name} x${item.quantity}</span>
                            <span>$${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="receipt-totals">
                    <div class="receipt-row">
                        <span>Subtotal:</span>
                        <span>$${transactionData.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="receipt-row">
                        <span>Tax:</span>
                        <span>$${transactionData.taxAmount.toFixed(2)}</span>
                    </div>
                    ${transactionData.discountAmount > 0 ? `
                        <div class="receipt-row">
                            <span>Discount:</span>
                            <span>-$${transactionData.discountAmount.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="receipt-row total">
                        <span>Total:</span>
                        <span>$${transactionData.total.toFixed(2)}</span>
                    </div>
                </div>
                
                <div class="receipt-payment">
                    <p>Payment Method: ${transactionData.paymentMethod.toUpperCase()}</p>
                    ${transactionData.customer ? `
                        <p>Customer: ${transactionData.customer.name}</p>
                        <p>Loyalty Points Earned: ${Math.floor(transactionData.total)}</p>
                    ` : ''}
                </div>
                
                <div class="receipt-footer">
                    <p>Thank you for your business!</p>
                </div>
            </div>
        `;

        document.getElementById('receipt-modal').style.display = 'flex';
    }

    closeReceipt() {
        document.getElementById('receipt-modal').style.display = 'none';
    }

    newTransaction() {
        this.cart = [];
        this.customer = null;
        this.discount = null;
        this.paymentMethod = 'cash';
        
        document.getElementById('product-search').value = '';
        document.getElementById('customer-search').value = '';
        document.getElementById('discount-form').style.display = 'none';
        
        this.updateCartDisplay();
        this.updatePaymentSummary();
    }

    scanBarcode() {
        // Simulate barcode scanning
        alert('Barcode scanner would open here. In a real implementation, this would access the device camera.');
    }

    showAddCustomerModal() {
        alert('Add Customer modal would open here. In a real implementation, this would show a customer form.');
    }

    showUpgradePrompt() {
        alert('Demo limit reached! Please contact sales to upgrade to the full version.');
    }

    printReceipt() {
        alert('Receipt would be sent to printer. In a real implementation, this would integrate with printer drivers.');
    }

    emailReceipt() {
        if (!this.customer || !this.customer.email) {
            const email = prompt('Enter customer email address:');
            if (!email) return;
        }
        
        alert('Receipt would be emailed. In a real implementation, this would send an email with the receipt.');
    }

    clearSearch() {
        document.getElementById('product-search').value = '';
        document.getElementById('search-results').innerHTML = '';
    }
}

// Initialize checkout screen when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('checkout-screen')) {
        window.checkoutScreen = new CheckoutScreen('checkout-screen');
    }
});