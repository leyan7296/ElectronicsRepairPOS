/**
 * ProductList.js - Product catalog with advanced features
 * Premium inventory management interface
 */

class ProductList {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.products = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.sortBy = 'name';
        this.sortOrder = 'asc';
        this.searchQuery = '';
        this.selectedCategory = 'all';
        this.selectedProducts = new Set();
        this.isDemo = true;
        
        this.init();
    }

    init() {
        this.loadDemoData();
        this.render();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="product-list-container">
                <div class="product-list-header">
                    <h2>Product Catalog</h2>
                    <div class="header-actions">
                        <button class="btn-primary" id="add-product">Add Product</button>
                        <button class="btn-secondary" id="bulk-actions" ${this.selectedProducts.size === 0 ? 'disabled' : ''}>
                            Bulk Actions (${this.selectedProducts.size})
                        </button>
                        <button class="btn-secondary" id="export-products">Export</button>
                    </div>
                </div>

                <div class="product-list-filters">
                    <div class="search-section">
                        <div class="search-input-container">
                            <input type="text" id="product-search" placeholder="Search products..." value="${this.searchQuery}">
                            <button class="search-btn" id="search-btn">🔍</button>
                            <button class="barcode-btn" id="barcode-btn">📷</button>
                        </div>
                    </div>
                    
                    <div class="filter-section">
                        <select id="category-filter">
                            <option value="all">All Categories</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Clothing">Clothing</option>
                            <option value="Food & Beverage">Food & Beverage</option>
                            <option value="Accessories">Accessories</option>
                        </select>
                        
                        <select id="sort-by">
                            <option value="name">Sort by Name</option>
                            <option value="price">Sort by Price</option>
                            <option value="stock">Sort by Stock</option>
                            <option value="created">Sort by Date Added</option>
                        </select>
                        
                        <select id="sort-order">
                            <option value="asc">Ascending</option>
                            <option value="desc">Descending</option>
                        </select>
                        
                        <button class="btn-small" id="clear-filters">Clear Filters</button>
                    </div>
                </div>

                <div class="product-list-stats">
                    <div class="stats-item">
                        <span class="stats-label">Total Products:</span>
                        <span class="stats-value" id="total-products">${this.products.length}</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">Low Stock:</span>
                        <span class="stats-value low-stock" id="low-stock-count">0</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">Out of Stock:</span>
                        <span class="stats-value out-of-stock" id="out-of-stock-count">0</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">Total Value:</span>
                        <span class="stats-value" id="total-value">$0.00</span>
                    </div>
                </div>

                <div class="product-list-content">
                    <div class="product-grid" id="product-grid">
                        <!-- Products will be rendered here -->
                    </div>
                    
                    <div class="pagination" id="pagination">
                        <!-- Pagination will be rendered here -->
                    </div>
                </div>

                <!-- Product Modal -->
                <div class="product-modal" id="product-modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="modal-title">Product Details</h3>
                            <button class="close-btn" id="close-modal">×</button>
                        </div>
                        <div class="modal-body" id="modal-body">
                            <!-- Product form will be rendered here -->
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" id="cancel-product">Cancel</button>
                            <button class="btn-primary" id="save-product">Save Product</button>
                        </div>
                    </div>
                </div>

                <!-- Bulk Actions Modal -->
                <div class="bulk-actions-modal" id="bulk-actions-modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Bulk Actions</h3>
                            <button class="close-btn" id="close-bulk-modal">×</button>
                        </div>
                        <div class="modal-body">
                            <p>${this.selectedProducts.size} products selected</p>
                            <div class="bulk-actions-list">
                                <button class="btn-secondary" id="bulk-edit">Edit Selected</button>
                                <button class="btn-secondary" id="bulk-delete">Delete Selected</button>
                                <button class="btn-secondary" id="bulk-export">Export Selected</button>
                                <button class="btn-secondary" id="bulk-generate-barcodes">Generate Barcodes</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Low Stock Alert -->
                <div class="low-stock-alert" id="low-stock-alert" style="display: none;">
                    <div class="alert-content">
                        <div class="alert-icon">⚠️</div>
                        <div class="alert-text">
                            <strong>Low Stock Alert</strong>
                            <p>Some products are running low on stock. Click to view details.</p>
                        </div>
                        <button class="btn-small" id="view-low-stock">View Details</button>
                    </div>
                </div>
            </div>
        `;
        
        this.renderProducts();
        this.updateStats();
    }

    bindEvents() {
        // Search
        document.getElementById('product-search').addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.filterProducts();
        });

        document.getElementById('search-btn').addEventListener('click', () => {
            this.filterProducts();
        });

        document.getElementById('barcode-btn').addEventListener('click', () => {
            this.scanBarcode();
        });

        // Filters
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.selectedCategory = e.target.value;
            this.filterProducts();
        });

        document.getElementById('sort-by').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.sortProducts();
        });

        document.getElementById('sort-order').addEventListener('change', (e) => {
            this.sortOrder = e.target.value;
            this.sortProducts();
        });

        document.getElementById('clear-filters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Actions
        document.getElementById('add-product').addEventListener('click', () => {
            this.showProductModal();
        });

        document.getElementById('bulk-actions').addEventListener('click', () => {
            this.showBulkActionsModal();
        });

        document.getElementById('export-products').addEventListener('click', () => {
            this.exportProducts();
        });

        // Modal events
        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeProductModal();
        });

        document.getElementById('cancel-product').addEventListener('click', () => {
            this.closeProductModal();
        });

        document.getElementById('save-product').addEventListener('click', () => {
            this.saveProduct();
        });

        document.getElementById('close-bulk-modal').addEventListener('click', () => {
            this.closeBulkActionsModal();
        });

        // Bulk actions
        document.getElementById('bulk-edit').addEventListener('click', () => {
            this.bulkEdit();
        });

        document.getElementById('bulk-delete').addEventListener('click', () => {
            this.bulkDelete();
        });

        document.getElementById('bulk-export').addEventListener('click', () => {
            this.bulkExport();
        });

        document.getElementById('bulk-generate-barcodes').addEventListener('click', () => {
            this.bulkGenerateBarcodes();
        });

        // Low stock alert
        document.getElementById('view-low-stock').addEventListener('click', () => {
            this.viewLowStock();
        });
    }

    loadDemoData() {
        this.products = [
            {
                id: 1,
                name: 'Wireless Headphones',
                sku: 'WH001',
                barcode: '123456789012',
                category: 'Electronics',
                price: 99.99,
                cost: 60.00,
                stock_quantity: 25,
                min_stock_level: 10,
                max_stock_level: 100,
                unit: 'each',
                weight: 0.3,
                supplier: 'Tech Supplies Inc',
                is_active: true,
                created_at: '2024-01-15',
                updated_at: '2024-01-15'
            },
            {
                id: 2,
                name: 'Coffee Mug',
                sku: 'CM001',
                barcode: '123456789013',
                category: 'Accessories',
                price: 12.99,
                cost: 6.50,
                stock_quantity: 5,
                min_stock_level: 10,
                max_stock_level: 50,
                unit: 'each',
                weight: 0.2,
                supplier: 'Home Goods Co',
                is_active: true,
                created_at: '2024-01-10',
                updated_at: '2024-01-10'
            },
            {
                id: 3,
                name: 'T-Shirt',
                sku: 'TS001',
                barcode: '123456789014',
                category: 'Clothing',
                price: 24.99,
                cost: 12.00,
                stock_quantity: 0,
                min_stock_level: 5,
                max_stock_level: 50,
                unit: 'each',
                weight: 0.1,
                supplier: 'Fashion Forward',
                is_active: true,
                created_at: '2024-01-08',
                updated_at: '2024-01-08'
            },
            {
                id: 4,
                name: 'Smart Watch',
                sku: 'SW001',
                barcode: '123456789015',
                category: 'Electronics',
                price: 299.99,
                cost: 180.00,
                stock_quantity: 8,
                min_stock_level: 5,
                max_stock_level: 30,
                unit: 'each',
                weight: 0.05,
                supplier: 'Tech Supplies Inc',
                is_active: true,
                created_at: '2024-01-20',
                updated_at: '2024-01-20'
            },
            {
                id: 5,
                name: 'Notebook',
                sku: 'NB001',
                barcode: '123456789016',
                category: 'Office',
                price: 8.99,
                cost: 3.50,
                stock_quantity: 50,
                min_stock_level: 20,
                max_stock_level: 200,
                unit: 'each',
                weight: 0.1,
                supplier: 'Office Depot',
                is_active: true,
                created_at: '2024-01-05',
                updated_at: '2024-01-05'
            },
            {
                id: 6,
                name: 'Water Bottle',
                sku: 'WB001',
                barcode: '123456789017',
                category: 'Accessories',
                price: 19.99,
                cost: 10.00,
                stock_quantity: 15,
                min_stock_level: 10,
                max_stock_level: 100,
                unit: 'each',
                weight: 0.3,
                supplier: 'Home Goods Co',
                is_active: true,
                created_at: '2024-01-12',
                updated_at: '2024-01-12'
            }
        ];

        this.filteredProducts = [...this.products];
    }

    filterProducts() {
        this.filteredProducts = this.products.filter(product => {
            const matchesSearch = !this.searchQuery || 
                product.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                product.sku.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                product.barcode.includes(this.searchQuery);
            
            const matchesCategory = this.selectedCategory === 'all' || 
                product.category === this.selectedCategory;
            
            return matchesSearch && matchesCategory;
        });

        this.sortProducts();
        this.renderProducts();
        this.updateStats();
    }

    sortProducts() {
        this.filteredProducts.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'price':
                    aValue = a.price;
                    bValue = b.price;
                    break;
                case 'stock':
                    aValue = a.stock_quantity;
                    bValue = b.stock_quantity;
                    break;
                case 'created':
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
                    break;
                default:
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
            }
            
            if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    renderProducts() {
        const grid = document.getElementById('product-grid');
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageProducts = this.filteredProducts.slice(startIndex, endIndex);

        if (pageProducts.length === 0) {
            grid.innerHTML = `
                <div class="no-products">
                    <div class="no-products-icon">📦</div>
                    <h3>No products found</h3>
                    <p>Try adjusting your search or filters</p>
                    <button class="btn-primary" onclick="productList.clearFilters()">Clear Filters</button>
                </div>
            `;
            return;
        }

        grid.innerHTML = pageProducts.map(product => `
            <div class="product-card ${this.selectedProducts.has(product.id) ? 'selected' : ''}" data-product-id="${product.id}">
                <div class="product-card-header">
                    <div class="product-checkbox">
                        <input type="checkbox" ${this.selectedProducts.has(product.id) ? 'checked' : ''} 
                               onchange="productList.toggleProductSelection(${product.id})">
                    </div>
                    <div class="product-actions">
                        <button class="action-btn" onclick="productList.editProduct(${product.id})" title="Edit">✏️</button>
                        <button class="action-btn" onclick="productList.generateBarcode(${product.id})" title="Barcode">📷</button>
                        <button class="action-btn" onclick="productList.deleteProduct(${product.id})" title="Delete">🗑️</button>
                    </div>
                </div>
                
                <div class="product-image">
                    <div class="product-placeholder">📦</div>
                    ${product.stock_quantity <= product.min_stock_level ? '<div class="low-stock-badge">Low Stock</div>' : ''}
                    ${product.stock_quantity === 0 ? '<div class="out-of-stock-badge">Out of Stock</div>' : ''}
                </div>
                
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-sku">SKU: ${product.sku}</p>
                    <p class="product-category">${product.category}</p>
                    
                    <div class="product-pricing">
                        <span class="product-price">$${product.price.toFixed(2)}</span>
                        <span class="product-cost">Cost: $${product.cost.toFixed(2)}</span>
                    </div>
                    
                    <div class="product-stock">
                        <span class="stock-quantity ${product.stock_quantity <= product.min_stock_level ? 'low-stock' : ''}">
                            Stock: ${product.stock_quantity}
                        </span>
                        <span class="min-stock">Min: ${product.min_stock_level}</span>
                    </div>
                    
                    <div class="product-supplier">
                        <span>Supplier: ${product.supplier}</span>
                    </div>
                </div>
                
                <div class="product-card-footer">
                    <button class="btn-small" onclick="productList.updateStock(${product.id})">Update Stock</button>
                    <button class="btn-small" onclick="productList.viewProduct(${product.id})">View Details</button>
                </div>
            </div>
        `).join('');

        this.renderPagination();
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination-controls">';
        
        // Previous button
        paginationHTML += `
            <button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                    onclick="productList.goToPage(${this.currentPage - 1})" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                ← Previous
            </button>
        `;
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="productList.goToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="productList.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" onclick="productList.goToPage(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        paginationHTML += `
            <button class="pagination-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="productList.goToPage(${this.currentPage + 1})" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                Next →
            </button>
        `;
        
        paginationHTML += '</div>';
        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderProducts();
        }
    }

    toggleProductSelection(productId) {
        if (this.selectedProducts.has(productId)) {
            this.selectedProducts.delete(productId);
        } else {
            this.selectedProducts.add(productId);
        }
        
        this.updateBulkActionsButton();
        this.renderProducts();
    }

    updateBulkActionsButton() {
        const button = document.getElementById('bulk-actions');
        button.disabled = this.selectedProducts.size === 0;
        button.textContent = `Bulk Actions (${this.selectedProducts.size})`;
    }

    updateStats() {
        const totalProducts = this.products.length;
        const lowStockCount = this.products.filter(p => p.stock_quantity <= p.min_stock_level && p.stock_quantity > 0).length;
        const outOfStockCount = this.products.filter(p => p.stock_quantity === 0).length;
        const totalValue = this.products.reduce((sum, p) => sum + (p.stock_quantity * p.cost), 0);

        document.getElementById('total-products').textContent = totalProducts;
        document.getElementById('low-stock-count').textContent = lowStockCount;
        document.getElementById('out-of-stock-count').textContent = outOfStockCount;
        document.getElementById('total-value').textContent = `$${totalValue.toFixed(2)}`;

        // Show low stock alert if needed
        if (lowStockCount > 0) {
            document.getElementById('low-stock-alert').style.display = 'block';
        } else {
            document.getElementById('low-stock-alert').style.display = 'none';
        }
    }

    clearFilters() {
        this.searchQuery = '';
        this.selectedCategory = 'all';
        this.sortBy = 'name';
        this.sortOrder = 'asc';
        
        document.getElementById('product-search').value = '';
        document.getElementById('category-filter').value = 'all';
        document.getElementById('sort-by').value = 'name';
        document.getElementById('sort-order').value = 'asc';
        
        this.filterProducts();
    }

    showProductModal(productId = null) {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');
        
        if (productId) {
            const product = this.products.find(p => p.id === productId);
            title.textContent = 'Edit Product';
            body.innerHTML = this.renderProductForm(product);
        } else {
            title.textContent = 'Add New Product';
            body.innerHTML = this.renderProductForm();
        }
        
        modal.style.display = 'flex';
    }

    renderProductForm(product = null) {
        return `
            <form class="product-form" id="product-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="product-name">Product Name *</label>
                        <input type="text" id="product-name" value="${product ? product.name : ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="product-sku">SKU *</label>
                        <input type="text" id="product-sku" value="${product ? product.sku : ''}" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="product-category">Category</label>
                        <select id="product-category">
                            <option value="Electronics" ${product && product.category === 'Electronics' ? 'selected' : ''}>Electronics</option>
                            <option value="Clothing" ${product && product.category === 'Clothing' ? 'selected' : ''}>Clothing</option>
                            <option value="Food & Beverage" ${product && product.category === 'Food & Beverage' ? 'selected' : ''}>Food & Beverage</option>
                            <option value="Accessories" ${product && product.category === 'Accessories' ? 'selected' : ''}>Accessories</option>
                            <option value="Office" ${product && product.category === 'Office' ? 'selected' : ''}>Office</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="product-barcode">Barcode</label>
                        <input type="text" id="product-barcode" value="${product ? product.barcode : ''}">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="product-price">Price *</label>
                        <input type="number" id="product-price" step="0.01" min="0" value="${product ? product.price : ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="product-cost">Cost</label>
                        <input type="number" id="product-cost" step="0.01" min="0" value="${product ? product.cost : ''}">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="product-stock">Stock Quantity</label>
                        <input type="number" id="product-stock" min="0" value="${product ? product.stock_quantity : 0}">
                    </div>
                    <div class="form-group">
                        <label for="product-min-stock">Min Stock Level</label>
                        <input type="number" id="product-min-stock" min="0" value="${product ? product.min_stock_level : 5}">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="product-supplier">Supplier</label>
                        <input type="text" id="product-supplier" value="${product ? product.supplier : ''}">
                    </div>
                    <div class="form-group">
                        <label for="product-unit">Unit</label>
                        <input type="text" id="product-unit" value="${product ? product.unit : 'each'}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="product-description">Description</label>
                    <textarea id="product-description" rows="3">${product ? product.description || '' : ''}</textarea>
                </div>
            </form>
        `;
    }

    saveProduct() {
        const form = document.getElementById('product-form');
        const formData = new FormData(form);
        
        const productData = {
            name: document.getElementById('product-name').value,
            sku: document.getElementById('product-sku').value,
            category: document.getElementById('product-category').value,
            barcode: document.getElementById('product-barcode').value,
            price: parseFloat(document.getElementById('product-price').value),
            cost: parseFloat(document.getElementById('product-cost').value) || 0,
            stock_quantity: parseInt(document.getElementById('product-stock').value) || 0,
            min_stock_level: parseInt(document.getElementById('product-min-stock').value) || 5,
            supplier: document.getElementById('product-supplier').value,
            unit: document.getElementById('product-unit').value,
            description: document.getElementById('product-description').value
        };

        if (!productData.name || !productData.sku || !productData.price) {
            alert('Please fill in all required fields');
            return;
        }

        // In a real implementation, this would make an API call
        if (this.isDemo) {
            alert('Demo mode: Product would be saved to database');
        }

        this.closeProductModal();
        this.loadDemoData(); // Reload data
        this.filterProducts();
    }

    closeProductModal() {
        document.getElementById('product-modal').style.display = 'none';
    }

    editProduct(productId) {
        this.showProductModal(productId);
    }

    deleteProduct(productId) {
        if (confirm('Are you sure you want to delete this product?')) {
            this.products = this.products.filter(p => p.id !== productId);
            this.filterProducts();
            alert('Product deleted successfully');
        }
    }

    viewProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            alert(`Product Details:\n\nName: ${product.name}\nSKU: ${product.sku}\nPrice: $${product.price}\nStock: ${product.stock_quantity}\nCategory: ${product.category}`);
        }
    }

    updateStock(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            const newStock = prompt(`Update stock for ${product.name} (Current: ${product.stock_quantity}):`, product.stock_quantity);
            if (newStock !== null && !isNaN(newStock)) {
                product.stock_quantity = parseInt(newStock);
                this.updateStats();
                this.renderProducts();
                alert('Stock updated successfully');
            }
        }
    }

    generateBarcode(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            alert(`Barcode generated for ${product.name}\nBarcode: ${product.barcode}\n\nIn a real implementation, this would generate a printable barcode.`);
        }
    }

    scanBarcode() {
        alert('Barcode scanner would open here. In a real implementation, this would access the device camera.');
    }

    showBulkActionsModal() {
        document.getElementById('bulk-actions-modal').style.display = 'flex';
    }

    closeBulkActionsModal() {
        document.getElementById('bulk-actions-modal').style.display = 'none';
    }

    bulkEdit() {
        alert(`Bulk edit for ${this.selectedProducts.size} products would open here.`);
        this.closeBulkActionsModal();
    }

    bulkDelete() {
        if (confirm(`Are you sure you want to delete ${this.selectedProducts.size} products?`)) {
            this.products = this.products.filter(p => !this.selectedProducts.has(p.id));
            this.selectedProducts.clear();
            this.updateBulkActionsButton();
            this.filterProducts();
            alert('Products deleted successfully');
        }
        this.closeBulkActionsModal();
    }

    bulkExport() {
        alert(`Export ${this.selectedProducts.size} products would start here.`);
        this.closeBulkActionsModal();
    }

    bulkGenerateBarcodes() {
        alert(`Generate barcodes for ${this.selectedProducts.size} products would start here.`);
        this.closeBulkActionsModal();
    }

    exportProducts() {
        alert('Export all products would start here. In a real implementation, this would generate a CSV file.');
    }

    viewLowStock() {
        const lowStockProducts = this.products.filter(p => p.stock_quantity <= p.min_stock_level);
        alert(`Low Stock Products:\n\n${lowStockProducts.map(p => `${p.name} - Stock: ${p.stock_quantity}, Min: ${p.min_stock_level}`).join('\n')}`);
    }
}

// Initialize product list when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('product-list')) {
        window.productList = new ProductList('product-list');
    }
});