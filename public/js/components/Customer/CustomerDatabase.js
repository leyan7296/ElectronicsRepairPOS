/**
 * CustomerDatabase.js - Customer management interface
 * Premium customer relationship management
 */

class CustomerDatabase {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.customers = [];
        this.filteredCustomers = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.sortBy = 'name';
        this.sortOrder = 'asc';
        this.searchQuery = '';
        this.selectedSegment = 'all';
        this.selectedCustomers = new Set();
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
            <div class="customer-database-container">
                <div class="customer-database-header">
                    <h2>Customer Database</h2>
                    <div class="header-actions">
                        <button class="btn-primary" id="add-customer">Add Customer</button>
                        <button class="btn-secondary" id="bulk-actions" ${this.selectedCustomers.size === 0 ? 'disabled' : ''}>
                            Bulk Actions (${this.selectedCustomers.size})
                        </button>
                        <button class="btn-secondary" id="export-customers">Export</button>
                        <button class="btn-secondary" id="import-customers">Import</button>
                    </div>
                </div>

                <div class="customer-database-filters">
                    <div class="search-section">
                        <div class="search-input-container">
                            <input type="text" id="customer-search" placeholder="Search customers..." value="${this.searchQuery}">
                            <button class="search-btn" id="search-btn">🔍</button>
                        </div>
                    </div>
                    
                    <div class="filter-section">
                        <select id="segment-filter">
                            <option value="all">All Segments</option>
                            <option value="VIP Customers">VIP Customers</option>
                            <option value="Frequent Buyers">Frequent Buyers</option>
                            <option value="New Customers">New Customers</option>
                            <option value="At Risk">At Risk</option>
                        </select>
                        
                        <select id="sort-by">
                            <option value="name">Sort by Name</option>
                            <option value="total_spent">Sort by Total Spent</option>
                            <option value="loyalty_points">Sort by Loyalty Points</option>
                            <option value="last_purchase">Sort by Last Purchase</option>
                        </select>
                        
                        <select id="sort-order">
                            <option value="asc">Ascending</option>
                            <option value="desc">Descending</option>
                        </select>
                        
                        <button class="btn-small" id="clear-filters">Clear Filters</button>
                    </div>
                </div>

                <div class="customer-database-stats">
                    <div class="stats-item">
                        <span class="stats-label">Total Customers:</span>
                        <span class="stats-value" id="total-customers">${this.customers.length}</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">VIP Customers:</span>
                        <span class="stats-value vip" id="vip-customers">0</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">New This Month:</span>
                        <span class="stats-value" id="new-customers">0</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">Total Revenue:</span>
                        <span class="stats-value" id="total-revenue">$0.00</span>
                    </div>
                </div>

                <div class="customer-database-content">
                    <div class="customer-list" id="customer-list">
                        <!-- Customers will be rendered here -->
                    </div>
                    
                    <div class="pagination" id="pagination">
                        <!-- Pagination will be rendered here -->
                    </div>
                </div>

                <!-- Customer Modal -->
                <div class="customer-modal" id="customer-modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="modal-title">Customer Details</h3>
                            <button class="close-btn" id="close-modal">×</button>
                        </div>
                        <div class="modal-body" id="modal-body">
                            <!-- Customer form will be rendered here -->
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" id="cancel-customer">Cancel</button>
                            <button class="btn-primary" id="save-customer">Save Customer</button>
                        </div>
                    </div>
                </div>

                <!-- Customer Details Modal -->
                <div class="customer-details-modal" id="customer-details-modal" style="display: none;">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h3 id="details-title">Customer Profile</h3>
                            <button class="close-btn" id="close-details-modal">×</button>
                        </div>
                        <div class="modal-body" id="details-body">
                            <!-- Customer details will be rendered here -->
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
                            <p>${this.selectedCustomers.size} customers selected</p>
                            <div class="bulk-actions-list">
                                <button class="btn-secondary" id="bulk-edit">Edit Selected</button>
                                <button class="btn-secondary" id="bulk-export">Export Selected</button>
                                <button class="btn-secondary" id="bulk-segment">Change Segment</button>
                                <button class="btn-secondary" id="bulk-email">Send Email</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Segment Analysis -->
                <div class="segment-analysis" id="segment-analysis" style="display: none;">
                    <div class="analysis-content">
                        <div class="analysis-header">
                            <h3>Customer Segment Analysis</h3>
                            <button class="close-btn" id="close-analysis">×</button>
                        </div>
                        <div class="analysis-body" id="analysis-body">
                            <!-- Analysis will be rendered here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.renderCustomers();
        this.updateStats();
    }

    bindEvents() {
        // Search
        document.getElementById('customer-search').addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.filterCustomers();
        });

        document.getElementById('search-btn').addEventListener('click', () => {
            this.filterCustomers();
        });

        // Filters
        document.getElementById('segment-filter').addEventListener('change', (e) => {
            this.selectedSegment = e.target.value;
            this.filterCustomers();
        });

        document.getElementById('sort-by').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.sortCustomers();
        });

        document.getElementById('sort-order').addEventListener('change', (e) => {
            this.sortOrder = e.target.value;
            this.sortCustomers();
        });

        document.getElementById('clear-filters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Actions
        document.getElementById('add-customer').addEventListener('click', () => {
            this.showCustomerModal();
        });

        document.getElementById('bulk-actions').addEventListener('click', () => {
            this.showBulkActionsModal();
        });

        document.getElementById('export-customers').addEventListener('click', () => {
            this.exportCustomers();
        });

        document.getElementById('import-customers').addEventListener('click', () => {
            this.importCustomers();
        });

        // Modal events
        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeCustomerModal();
        });

        document.getElementById('cancel-customer').addEventListener('click', () => {
            this.closeCustomerModal();
        });

        document.getElementById('save-customer').addEventListener('click', () => {
            this.saveCustomer();
        });

        document.getElementById('close-details-modal').addEventListener('click', () => {
            this.closeDetailsModal();
        });

        document.getElementById('close-bulk-modal').addEventListener('click', () => {
            this.closeBulkActionsModal();
        });

        document.getElementById('close-analysis').addEventListener('click', () => {
            this.closeSegmentAnalysis();
        });

        // Bulk actions
        document.getElementById('bulk-edit').addEventListener('click', () => {
            this.bulkEdit();
        });

        document.getElementById('bulk-export').addEventListener('click', () => {
            this.bulkExport();
        });

        document.getElementById('bulk-segment').addEventListener('click', () => {
            this.bulkChangeSegment();
        });

        document.getElementById('bulk-email').addEventListener('click', () => {
            this.bulkSendEmail();
        });
    }

    loadDemoData() {
        this.customers = [
            {
                id: 1,
                first_name: 'John',
                last_name: 'Smith',
                email: 'john.smith@email.com',
                phone: '(555) 123-4567',
                company_name: 'Smith Enterprises',
                customer_type: 'business',
                total_spent: 2450.75,
                loyalty_points: 2450,
                last_purchase_date: '2024-01-20',
                created_at: '2023-06-15',
                segment: 'VIP Customers',
                address: {
                    line1: '123 Business St',
                    city: 'New York',
                    state: 'NY',
                    postal_code: '10001'
                }
            },
            {
                id: 2,
                first_name: 'Sarah',
                last_name: 'Johnson',
                email: 'sarah.j@email.com',
                phone: '(555) 234-5678',
                company_name: '',
                customer_type: 'individual',
                total_spent: 1250.30,
                loyalty_points: 1250,
                last_purchase_date: '2024-01-18',
                created_at: '2023-08-22',
                segment: 'Frequent Buyers',
                address: {
                    line1: '456 Main Ave',
                    city: 'Los Angeles',
                    state: 'CA',
                    postal_code: '90210'
                }
            },
            {
                id: 3,
                first_name: 'Mike',
                last_name: 'Wilson',
                email: 'mike.wilson@email.com',
                phone: '(555) 345-6789',
                company_name: 'Wilson Corp',
                customer_type: 'business',
                total_spent: 850.00,
                loyalty_points: 850,
                last_purchase_date: '2024-01-15',
                created_at: '2023-12-01',
                segment: 'Frequent Buyers',
                address: {
                    line1: '789 Corporate Blvd',
                    city: 'Chicago',
                    state: 'IL',
                    postal_code: '60601'
                }
            },
            {
                id: 4,
                first_name: 'Emily',
                last_name: 'Davis',
                email: 'emily.davis@email.com',
                phone: '(555) 456-7890',
                company_name: '',
                customer_type: 'individual',
                total_spent: 320.50,
                loyalty_points: 320,
                last_purchase_date: '2024-01-10',
                created_at: '2024-01-05',
                segment: 'New Customers',
                address: {
                    line1: '321 Oak Street',
                    city: 'Miami',
                    state: 'FL',
                    postal_code: '33101'
                }
            },
            {
                id: 5,
                first_name: 'Robert',
                last_name: 'Brown',
                email: 'robert.brown@email.com',
                phone: '(555) 567-8901',
                company_name: 'Brown Industries',
                customer_type: 'business',
                total_spent: 5200.00,
                loyalty_points: 5200,
                last_purchase_date: '2024-01-22',
                created_at: '2023-03-10',
                segment: 'VIP Customers',
                address: {
                    line1: '654 Industrial Way',
                    city: 'Houston',
                    state: 'TX',
                    postal_code: '77001'
                }
            },
            {
                id: 6,
                first_name: 'Lisa',
                last_name: 'Garcia',
                email: 'lisa.garcia@email.com',
                phone: '(555) 678-9012',
                company_name: '',
                customer_type: 'individual',
                total_spent: 150.25,
                loyalty_points: 150,
                last_purchase_date: '2023-11-15',
                created_at: '2023-09-15',
                segment: 'At Risk',
                address: {
                    line1: '987 Pine Street',
                    city: 'Seattle',
                    state: 'WA',
                    postal_code: '98101'
                }
            }
        ];

        this.filteredCustomers = [...this.customers];
    }

    filterCustomers() {
        this.filteredCustomers = this.customers.filter(customer => {
            const matchesSearch = !this.searchQuery || 
                `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                customer.email.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                customer.phone.includes(this.searchQuery) ||
                (customer.company_name && customer.company_name.toLowerCase().includes(this.searchQuery.toLowerCase()));
            
            const matchesSegment = this.selectedSegment === 'all' || 
                customer.segment === this.selectedSegment;
            
            return matchesSearch && matchesSegment;
        });

        this.sortCustomers();
        this.renderCustomers();
        this.updateStats();
    }

    sortCustomers() {
        this.filteredCustomers.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.sortBy) {
                case 'name':
                    aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
                    bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
                    break;
                case 'total_spent':
                    aValue = a.total_spent;
                    bValue = b.total_spent;
                    break;
                case 'loyalty_points':
                    aValue = a.loyalty_points;
                    bValue = b.loyalty_points;
                    break;
                case 'last_purchase':
                    aValue = new Date(a.last_purchase_date);
                    bValue = new Date(b.last_purchase_date);
                    break;
                default:
                    aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
                    bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
            }
            
            if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    renderCustomers() {
        const list = document.getElementById('customer-list');
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageCustomers = this.filteredCustomers.slice(startIndex, endIndex);

        if (pageCustomers.length === 0) {
            list.innerHTML = `
                <div class="no-customers">
                    <div class="no-customers-icon">👥</div>
                    <h3>No customers found</h3>
                    <p>Try adjusting your search or filters</p>
                    <button class="btn-primary" onclick="customerDatabase.clearFilters()">Clear Filters</button>
                </div>
            `;
            return;
        }

        list.innerHTML = pageCustomers.map(customer => `
            <div class="customer-card ${this.selectedCustomers.has(customer.id) ? 'selected' : ''}" data-customer-id="${customer.id}">
                <div class="customer-card-header">
                    <div class="customer-checkbox">
                        <input type="checkbox" ${this.selectedCustomers.has(customer.id) ? 'checked' : ''} 
                               onchange="customerDatabase.toggleCustomerSelection(${customer.id})">
                    </div>
                    <div class="customer-actions">
                        <button class="action-btn" onclick="customerDatabase.editCustomer(${customer.id})" title="Edit">✏️</button>
                        <button class="action-btn" onclick="customerDatabase.viewCustomerDetails(${customer.id})" title="View Details">👁️</button>
                        <button class="action-btn" onclick="customerDatabase.deleteCustomer(${customer.id})" title="Delete">🗑️</button>
                    </div>
                </div>
                
                <div class="customer-info">
                    <div class="customer-avatar">
                        <div class="avatar-placeholder">${customer.first_name[0]}${customer.last_name[0]}</div>
                        <div class="segment-badge ${customer.segment.toLowerCase().replace(' ', '-')}">${customer.segment}</div>
                    </div>
                    
                    <div class="customer-details">
                        <h3 class="customer-name">${customer.first_name} ${customer.last_name}</h3>
                        <p class="customer-company">${customer.company_name || 'Individual Customer'}</p>
                        <p class="customer-contact">${customer.email} • ${customer.phone}</p>
                        
                        <div class="customer-stats">
                            <div class="stat-item">
                                <span class="stat-label">Total Spent:</span>
                                <span class="stat-value">$${customer.total_spent.toFixed(2)}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Loyalty Points:</span>
                                <span class="stat-value">${customer.loyalty_points.toLocaleString()}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Last Purchase:</span>
                                <span class="stat-value">${new Date(customer.last_purchase_date).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="customer-card-footer">
                    <button class="btn-small" onclick="customerDatabase.viewPurchaseHistory(${customer.id})">Purchase History</button>
                    <button class="btn-small" onclick="customerDatabase.updateLoyaltyPoints(${customer.id})">Update Points</button>
                </div>
            </div>
        `).join('');

        this.renderPagination();
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredCustomers.length / this.itemsPerPage);
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination-controls">';
        
        // Previous button
        paginationHTML += `
            <button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                    onclick="customerDatabase.goToPage(${this.currentPage - 1})" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                ← Previous
            </button>
        `;
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="customerDatabase.goToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="customerDatabase.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" onclick="customerDatabase.goToPage(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        paginationHTML += `
            <button class="pagination-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="customerDatabase.goToPage(${this.currentPage + 1})" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                Next →
            </button>
        `;
        
        paginationHTML += '</div>';
        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredCustomers.length / this.itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderCustomers();
        }
    }

    toggleCustomerSelection(customerId) {
        if (this.selectedCustomers.has(customerId)) {
            this.selectedCustomers.delete(customerId);
        } else {
            this.selectedCustomers.add(customerId);
        }
        
        this.updateBulkActionsButton();
        this.renderCustomers();
    }

    updateBulkActionsButton() {
        const button = document.getElementById('bulk-actions');
        button.disabled = this.selectedCustomers.size === 0;
        button.textContent = `Bulk Actions (${this.selectedCustomers.size})`;
    }

    updateStats() {
        const totalCustomers = this.customers.length;
        const vipCustomers = this.customers.filter(c => c.segment === 'VIP Customers').length;
        const newCustomers = this.customers.filter(c => {
            const createdDate = new Date(c.created_at);
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            return createdDate >= oneMonthAgo;
        }).length;
        const totalRevenue = this.customers.reduce((sum, c) => sum + c.total_spent, 0);

        document.getElementById('total-customers').textContent = totalCustomers;
        document.getElementById('vip-customers').textContent = vipCustomers;
        document.getElementById('new-customers').textContent = newCustomers;
        document.getElementById('total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
    }

    clearFilters() {
        this.searchQuery = '';
        this.selectedSegment = 'all';
        this.sortBy = 'name';
        this.sortOrder = 'asc';
        
        document.getElementById('customer-search').value = '';
        document.getElementById('segment-filter').value = 'all';
        document.getElementById('sort-by').value = 'name';
        document.getElementById('sort-order').value = 'asc';
        
        this.filterCustomers();
    }

    showCustomerModal(customerId = null) {
        const modal = document.getElementById('customer-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');
        
        if (customerId) {
            const customer = this.customers.find(c => c.id === customerId);
            title.textContent = 'Edit Customer';
            body.innerHTML = this.renderCustomerForm(customer);
        } else {
            title.textContent = 'Add New Customer';
            body.innerHTML = this.renderCustomerForm();
        }
        
        modal.style.display = 'flex';
    }

    renderCustomerForm(customer = null) {
        return `
            <form class="customer-form" id="customer-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="customer-first-name">First Name *</label>
                        <input type="text" id="customer-first-name" value="${customer ? customer.first_name : ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="customer-last-name">Last Name *</label>
                        <input type="text" id="customer-last-name" value="${customer ? customer.last_name : ''}" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="customer-email">Email</label>
                        <input type="email" id="customer-email" value="${customer ? customer.email : ''}">
                    </div>
                    <div class="form-group">
                        <label for="customer-phone">Phone</label>
                        <input type="tel" id="customer-phone" value="${customer ? customer.phone : ''}">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="customer-type">Customer Type</label>
                        <select id="customer-type">
                            <option value="individual" ${customer && customer.customer_type === 'individual' ? 'selected' : ''}>Individual</option>
                            <option value="business" ${customer && customer.customer_type === 'business' ? 'selected' : ''}>Business</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="customer-company">Company Name</label>
                        <input type="text" id="customer-company" value="${customer ? customer.company_name : ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="customer-address">Address</label>
                    <input type="text" id="customer-address" placeholder="Street Address" value="${customer && customer.address ? customer.address.line1 : ''}">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="customer-city">City</label>
                        <input type="text" id="customer-city" value="${customer && customer.address ? customer.address.city : ''}">
                    </div>
                    <div class="form-group">
                        <label for="customer-state">State</label>
                        <input type="text" id="customer-state" value="${customer && customer.address ? customer.address.state : ''}">
                    </div>
                    <div class="form-group">
                        <label for="customer-zip">ZIP Code</label>
                        <input type="text" id="customer-zip" value="${customer && customer.address ? customer.address.postal_code : ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="customer-notes">Notes</label>
                    <textarea id="customer-notes" rows="3" placeholder="Additional notes about the customer">${customer ? customer.notes || '' : ''}</textarea>
                </div>
            </form>
        `;
    }

    saveCustomer() {
        const form = document.getElementById('customer-form');
        
        const customerData = {
            first_name: document.getElementById('customer-first-name').value,
            last_name: document.getElementById('customer-last-name').value,
            email: document.getElementById('customer-email').value,
            phone: document.getElementById('customer-phone').value,
            customer_type: document.getElementById('customer-type').value,
            company_name: document.getElementById('customer-company').value,
            address: {
                line1: document.getElementById('customer-address').value,
                city: document.getElementById('customer-city').value,
                state: document.getElementById('customer-state').value,
                postal_code: document.getElementById('customer-zip').value
            },
            notes: document.getElementById('customer-notes').value
        };

        if (!customerData.first_name || !customerData.last_name) {
            alert('Please fill in all required fields');
            return;
        }

        // In a real implementation, this would make an API call
        if (this.isDemo) {
            alert('Demo mode: Customer would be saved to database');
        }

        this.closeCustomerModal();
        this.loadDemoData(); // Reload data
        this.filterCustomers();
    }

    closeCustomerModal() {
        document.getElementById('customer-modal').style.display = 'none';
    }

    editCustomer(customerId) {
        this.showCustomerModal(customerId);
    }

    deleteCustomer(customerId) {
        if (confirm('Are you sure you want to delete this customer?')) {
            this.customers = this.customers.filter(c => c.id !== customerId);
            this.filterCustomers();
            alert('Customer deleted successfully');
        }
    }

    viewCustomerDetails(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        const modal = document.getElementById('customer-details-modal');
        const title = document.getElementById('details-title');
        const body = document.getElementById('details-body');
        
        title.textContent = `${customer.first_name} ${customer.last_name} - Customer Profile`;
        
        body.innerHTML = `
            <div class="customer-profile">
                <div class="profile-header">
                    <div class="profile-avatar">
                        <div class="avatar-large">${customer.first_name[0]}${customer.last_name[0]}</div>
                    </div>
                    <div class="profile-info">
                        <h2>${customer.first_name} ${customer.last_name}</h2>
                        <p class="profile-company">${customer.company_name || 'Individual Customer'}</p>
                        <div class="profile-contact">
                            <span>📧 ${customer.email}</span>
                            <span>📞 ${customer.phone}</span>
                        </div>
                        <div class="profile-segment">
                            <span class="segment-badge ${customer.segment.toLowerCase().replace(' ', '-')}">${customer.segment}</span>
                        </div>
                    </div>
                </div>
                
                <div class="profile-stats">
                    <div class="stat-card">
                        <div class="stat-value">$${customer.total_spent.toFixed(2)}</div>
                        <div class="stat-label">Total Spent</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${customer.loyalty_points.toLocaleString()}</div>
                        <div class="stat-label">Loyalty Points</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${new Date(customer.last_purchase_date).toLocaleDateString()}</div>
                        <div class="stat-label">Last Purchase</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${new Date(customer.created_at).toLocaleDateString()}</div>
                        <div class="stat-label">Customer Since</div>
                    </div>
                </div>
                
                <div class="profile-actions">
                    <button class="btn-primary" onclick="customerDatabase.viewPurchaseHistory(${customer.id})">View Purchase History</button>
                    <button class="btn-secondary" onclick="customerDatabase.updateLoyaltyPoints(${customer.id})">Update Loyalty Points</button>
                    <button class="btn-secondary" onclick="customerDatabase.sendEmail(${customer.id})">Send Email</button>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    }

    closeDetailsModal() {
        document.getElementById('customer-details-modal').style.display = 'none';
    }

    viewPurchaseHistory(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (customer) {
            alert(`Purchase History for ${customer.first_name} ${customer.last_name}:\n\nThis would show detailed purchase history in a real implementation.`);
        }
    }

    updateLoyaltyPoints(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (customer) {
            const points = prompt(`Update loyalty points for ${customer.first_name} ${customer.last_name} (Current: ${customer.loyalty_points}):`, customer.loyalty_points);
            if (points !== null && !isNaN(points)) {
                customer.loyalty_points = parseInt(points);
                this.updateStats();
                this.renderCustomers();
                alert('Loyalty points updated successfully');
            }
        }
    }

    sendEmail(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (customer) {
            alert(`Email would be sent to ${customer.email} for ${customer.first_name} ${customer.last_name}`);
        }
    }

    showBulkActionsModal() {
        document.getElementById('bulk-actions-modal').style.display = 'flex';
    }

    closeBulkActionsModal() {
        document.getElementById('bulk-actions-modal').style.display = 'none';
    }

    bulkEdit() {
        alert(`Bulk edit for ${this.selectedCustomers.size} customers would open here.`);
        this.closeBulkActionsModal();
    }

    bulkExport() {
        alert(`Export ${this.selectedCustomers.size} customers would start here.`);
        this.closeBulkActionsModal();
    }

    bulkChangeSegment() {
        const newSegment = prompt('Enter new segment for selected customers:');
        if (newSegment) {
            this.selectedCustomers.forEach(customerId => {
                const customer = this.customers.find(c => c.id === customerId);
                if (customer) {
                    customer.segment = newSegment;
                }
            });
            this.renderCustomers();
            alert('Customer segments updated successfully');
        }
        this.closeBulkActionsModal();
    }

    bulkSendEmail() {
        alert(`Send email to ${this.selectedCustomers.size} customers would start here.`);
        this.closeBulkActionsModal();
    }

    exportCustomers() {
        alert('Export all customers would start here. In a real implementation, this would generate a CSV file.');
    }

    importCustomers() {
        alert('Import customers would open here. In a real implementation, this would allow CSV file upload.');
    }
}

// Initialize customer database when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('customer-database')) {
        window.customerDatabase = new CustomerDatabase('customer-database');
    }
});