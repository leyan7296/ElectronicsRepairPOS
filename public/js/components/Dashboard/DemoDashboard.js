/**
 * DemoDashboard.js - Limited demo dashboard with upgrade prompts
 * Premium teaser experience that showcases capabilities
 */

class DemoDashboard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isDemo = true;
        this.demoLimits = {
            maxTransactions: 25,
            maxProducts: 100,
            maxCustomers: 50,
            storageLimit: 1024, // MB
            currentStorage: 256 // MB
        };
        this.usageStats = {
            transactionsUsed: 0,
            productsUsed: 0,
            customersUsed: 0
        };
        this.currentUser = null;
        
        this.init();
    }

    init() {
        this.loadUserData();
        this.render();
        this.bindEvents();
        this.startRealTimeUpdates();
    }

    loadUserData() {
        // Load user data from session
        const session = sessionStorage.getItem('pos_session') || localStorage.getItem('pos_session');
        if (session) {
            try {
                const userData = JSON.parse(session);
                this.currentUser = userData.user || userData.employee;
            } catch (e) {
                console.error('Error loading user data:', e);
            }
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="demo-dashboard">
                <div class="dashboard-header">
                    <div class="header-left">
                        <h1>Dashboard</h1>
                        <div class="demo-badge">
                            <span class="badge-icon">🌟</span>
                            <span class="badge-text">EXPLORER MODE</span>
                        </div>
                    </div>
                    <div class="header-right">
                        <div class="user-info">
                            <div class="user-avatar">
                                ${this.currentUser ? this.currentUser.first_name[0] + this.currentUser.last_name[0] : 'U'}
                            </div>
                            <div class="user-details">
                                <div class="user-name">${this.currentUser ? this.currentUser.first_name + ' ' + this.currentUser.last_name : 'Demo User'}</div>
                                <div class="user-role">${this.currentUser ? this.currentUser.role : 'Demo'}</div>
                            </div>
                        </div>
                        <button class="upgrade-btn" id="upgrade-btn">
                            <span class="upgrade-icon">🚀</span>
                            Unlock Full Potential
                        </button>
                    </div>
                </div>

                <div class="dashboard-content">
                    <div class="dashboard-sidebar">
                        <nav class="sidebar-nav">
                            <a href="#sales" class="nav-item active" data-section="sales">
                                <span class="nav-icon">🛒</span>
                                <span class="nav-text">Sales</span>
                            </a>
                            <a href="#inventory" class="nav-item" data-section="inventory">
                                <span class="nav-icon">📦</span>
                                <span class="nav-text">Inventory</span>
                            </a>
                            <a href="#customers" class="nav-item" data-section="customers">
                                <span class="nav-icon">👥</span>
                                <span class="nav-text">Customers</span>
                            </a>
                            <a href="#employees" class="nav-item" data-section="employees">
                                <span class="nav-icon">👤</span>
                                <span class="nav-text">Employees</span>
                            </a>
                            <a href="#reports" class="nav-item" data-section="reports">
                                <span class="nav-icon">📊</span>
                                <span class="nav-text">Reports</span>
                            </a>
                            <a href="#settings" class="nav-item" data-section="settings">
                                <span class="nav-icon">⚙️</span>
                                <span class="nav-text">Settings</span>
                            </a>
                        </nav>
                        
                        <div class="sidebar-footer">
                            <div class="demo-limits">
                                <h4>Demo Limits</h4>
                                <div class="limit-item">
                                    <span class="limit-label">Transactions:</span>
                                    <div class="limit-bar">
                                        <div class="limit-fill" style="width: ${(this.usageStats.transactionsUsed / this.demoLimits.maxTransactions) * 100}%"></div>
                                    </div>
                                    <span class="limit-text">${this.usageStats.transactionsUsed}/${this.demoLimits.maxTransactions}</span>
                                </div>
                                <div class="limit-item">
                                    <span class="limit-label">Products:</span>
                                    <div class="limit-bar">
                                        <div class="limit-fill" style="width: ${(this.usageStats.productsUsed / this.demoLimits.maxProducts) * 100}%"></div>
                                    </div>
                                    <span class="limit-text">${this.usageStats.productsUsed}/${this.demoLimits.maxProducts}</span>
                                </div>
                                <div class="limit-item">
                                    <span class="limit-label">Storage:</span>
                                    <div class="limit-bar">
                                        <div class="limit-fill" style="width: ${(this.demoLimits.currentStorage / this.demoLimits.storageLimit) * 100}%"></div>
                                    </div>
                                    <span class="limit-text">${this.demoLimits.currentStorage}MB/${this.demoLimits.storageLimit}MB</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="dashboard-main">
                        <div class="dashboard-section active" id="sales-section">
                            <div class="section-header">
                                <h2>Sales Dashboard</h2>
                                <div class="section-actions">
                                    <button class="btn-primary" id="new-sale-btn">New Sale</button>
                                    <button class="btn-secondary" id="view-reports-btn">View Reports</button>
                                </div>
                            </div>
                            
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-icon">💰</div>
                                    <div class="stat-content">
                                        <div class="stat-value" id="today-sales">$2,847.50</div>
                                        <div class="stat-label">Today's Sales</div>
                                        <div class="stat-change positive">+12.5% from yesterday</div>
                                    </div>
                                </div>
                                
                                <div class="stat-card">
                                    <div class="stat-icon">🛒</div>
                                    <div class="stat-content">
                                        <div class="stat-value" id="today-transactions">47</div>
                                        <div class="stat-label">Transactions</div>
                                        <div class="stat-change positive">+8 from yesterday</div>
                                    </div>
                                </div>
                                
                                <div class="stat-card">
                                    <div class="stat-icon">📈</div>
                                    <div class="stat-content">
                                        <div class="stat-value" id="avg-transaction">$60.59</div>
                                        <div class="stat-label">Avg Transaction</div>
                                        <div class="stat-change positive">+$3.20 from yesterday</div>
                                    </div>
                                </div>
                                
                                <div class="stat-card">
                                    <div class="stat-icon">⏰</div>
                                    <div class="stat-content">
                                        <div class="stat-value" id="peak-hour">2:00 PM</div>
                                        <div class="stat-label">Peak Hour</div>
                                        <div class="stat-change neutral">Most active time</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="dashboard-widgets">
                                <div class="widget">
                                    <div class="widget-header">
                                        <h3>Recent Transactions</h3>
                                        <button class="widget-action" id="view-all-transactions">View All</button>
                                    </div>
                                    <div class="widget-content">
                                        <div class="transaction-list" id="recent-transactions">
                                            <!-- Recent transactions will be loaded here -->
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="widget">
                                    <div class="widget-header">
                                        <h3>Top Products</h3>
                                        <button class="widget-action" id="view-inventory">Manage Inventory</button>
                                    </div>
                                    <div class="widget-content">
                                        <div class="product-list" id="top-products">
                                            <!-- Top products will be loaded here -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="dashboard-section" id="inventory-section">
                            <div class="section-header">
                                <h2>Inventory Management</h2>
                                <div class="section-actions">
                                    <button class="btn-primary" id="add-product-btn">Add Product</button>
                                    <button class="btn-secondary" id="bulk-import-btn">Bulk Import</button>
                                </div>
                            </div>
                            
                            <div class="inventory-overview">
                                <div class="overview-card">
                                    <div class="overview-icon">📦</div>
                                    <div class="overview-content">
                                        <div class="overview-value">247</div>
                                        <div class="overview-label">Total Products</div>
                                    </div>
                                </div>
                                
                                <div class="overview-card warning">
                                    <div class="overview-icon">⚠️</div>
                                    <div class="overview-content">
                                        <div class="overview-value">3</div>
                                        <div class="overview-label">Low Stock Items</div>
                                    </div>
                                </div>
                                
                                <div class="overview-card danger">
                                    <div class="overview-icon">❌</div>
                                    <div class="overview-content">
                                        <div class="overview-value">1</div>
                                        <div class="overview-label">Out of Stock</div>
                                    </div>
                                </div>
                                
                                <div class="overview-card">
                                    <div class="overview-icon">💰</div>
                                    <div class="overview-content">
                                        <div class="overview-value">$12,450</div>
                                        <div class="overview-label">Inventory Value</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="inventory-alerts">
                                <div class="alert-item">
                                    <div class="alert-icon">⚠️</div>
                                    <div class="alert-content">
                                        <div class="alert-title">Low Stock Alert</div>
                                        <div class="alert-message">Wireless Headphones - Only 5 left (Min: 10)</div>
                                    </div>
                                    <button class="alert-action">Restock</button>
                                </div>
                                
                                <div class="alert-item">
                                    <div class="alert-icon">❌</div>
                                    <div class="alert-content">
                                        <div class="alert-title">Out of Stock</div>
                                        <div class="alert-message">T-Shirt - Currently unavailable</div>
                                    </div>
                                    <button class="alert-action">Order Now</button>
                                </div>
                            </div>
                        </div>

                        <div class="dashboard-section" id="customers-section">
                            <div class="section-header">
                                <h2>Customer Management</h2>
                                <div class="section-actions">
                                    <button class="btn-primary" id="add-customer-btn">Add Customer</button>
                                    <button class="btn-secondary" id="import-customers-btn">Import Customers</button>
                                </div>
                            </div>
                            
                            <div class="customer-stats">
                                <div class="stat-card">
                                    <div class="stat-icon">👥</div>
                                    <div class="stat-content">
                                        <div class="stat-value">1,247</div>
                                        <div class="stat-label">Total Customers</div>
                                    </div>
                                </div>
                                
                                <div class="stat-card">
                                    <div class="stat-icon">⭐</div>
                                    <div class="stat-content">
                                        <div class="stat-value">89</div>
                                        <div class="stat-label">VIP Members</div>
                                    </div>
                                </div>
                                
                                <div class="stat-card">
                                    <div class="stat-icon">🆕</div>
                                    <div class="stat-content">
                                        <div class="stat-value">23</div>
                                        <div class="stat-label">New This Month</div>
                                    </div>
                                </div>
                                
                                <div class="stat-card">
                                    <div class="stat-icon">💰</div>
                                    <div class="stat-content">
                                        <div class="stat-value">$234</div>
                                        <div class="stat-label">Avg Lifetime Value</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="customer-segments">
                                <h3>Customer Segments</h3>
                                <div class="segment-grid">
                                    <div class="segment-card vip">
                                        <div class="segment-icon">👑</div>
                                        <div class="segment-content">
                                            <div class="segment-name">VIP Customers</div>
                                            <div class="segment-count">89 customers</div>
                                            <div class="segment-revenue">$45,230 revenue</div>
                                        </div>
                                    </div>
                                    
                                    <div class="segment-card frequent">
                                        <div class="segment-icon">🔄</div>
                                        <div class="segment-content">
                                            <div class="segment-name">Frequent Buyers</div>
                                            <div class="segment-count">156 customers</div>
                                            <div class="segment-revenue">$23,450 revenue</div>
                                        </div>
                                    </div>
                                    
                                    <div class="segment-card new">
                                        <div class="segment-icon">🆕</div>
                                        <div class="segment-content">
                                            <div class="segment-name">New Customers</div>
                                            <div class="segment-count">23 customers</div>
                                            <div class="segment-revenue">$5,670 revenue</div>
                                        </div>
                                    </div>
                                    
                                    <div class="segment-card at-risk">
                                        <div class="segment-icon">⚠️</div>
                                        <div class="segment-content">
                                            <div class="segment-name">At Risk</div>
                                            <div class="segment-count">45 customers</div>
                                            <div class="segment-revenue">$8,900 revenue</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="dashboard-section" id="reports-section">
                            <div class="section-header">
                                <h2>Reports & Analytics</h2>
                                <div class="section-actions">
                                    <button class="btn-primary" id="generate-report-btn">Generate Report</button>
                                    <button class="btn-secondary" id="schedule-report-btn">Schedule Report</button>
                                </div>
                            </div>
                            
                            <div class="reports-grid">
                                <div class="report-card">
                                    <div class="report-icon">📊</div>
                                    <div class="report-content">
                                        <div class="report-title">Sales Report</div>
                                        <div class="report-description">Daily, weekly, and monthly sales analysis</div>
                                        <div class="report-status">Last updated: 2 hours ago</div>
                                    </div>
                                    <button class="report-action">View Report</button>
                                </div>
                                
                                <div class="report-card">
                                    <div class="report-icon">📈</div>
                                    <div class="report-content">
                                        <div class="report-title">Inventory Report</div>
                                        <div class="report-description">Stock levels and movement analysis</div>
                                        <div class="report-status">Last updated: 1 hour ago</div>
                                    </div>
                                    <button class="report-action">View Report</button>
                                </div>
                                
                                <div class="report-card">
                                    <div class="report-icon">👥</div>
                                    <div class="report-content">
                                        <div class="report-title">Customer Report</div>
                                        <div class="report-description">Customer behavior and segmentation</div>
                                        <div class="report-status">Last updated: 3 hours ago</div>
                                    </div>
                                    <button class="report-action">View Report</button>
                                </div>
                                
                                <div class="report-card premium">
                                    <div class="report-icon">🤖</div>
                                    <div class="report-content">
                                        <div class="report-title">AI Insights</div>
                                        <div class="report-description">Predictive analytics and recommendations</div>
                                        <div class="report-status premium">Premium Feature</div>
                                    </div>
                                    <button class="report-action premium">Upgrade to View</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Upgrade Modal -->
                <div class="upgrade-modal" id="upgrade-modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Unlock Full Potential</h3>
                            <button class="close-btn" id="close-upgrade-modal">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="upgrade-features">
                                <div class="feature-item">
                                    <div class="feature-icon">🚀</div>
                                    <div class="feature-content">
                                        <div class="feature-title">Unlimited Transactions</div>
                                        <div class="feature-description">Process unlimited sales without restrictions</div>
                                    </div>
                                </div>
                                
                                <div class="feature-item">
                                    <div class="feature-icon">📊</div>
                                    <div class="feature-content">
                                        <div class="feature-title">Advanced Analytics</div>
                                        <div class="feature-description">AI-powered insights and predictive analytics</div>
                                    </div>
                                </div>
                                
                                <div class="feature-item">
                                    <div class="feature-icon">🔌</div>
                                    <div class="feature-content">
                                        <div class="feature-title">Full Integrations</div>
                                        <div class="feature-description">Connect with 100+ business tools</div>
                                    </div>
                                </div>
                                
                                <div class="feature-item">
                                    <div class="feature-icon">🛡️</div>
                                    <div class="feature-content">
                                        <div class="feature-title">Enterprise Security</div>
                                        <div class="feature-description">Advanced security and compliance features</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="upgrade-pricing">
                                <div class="pricing-card">
                                    <div class="pricing-title">Professional</div>
                                    <div class="pricing-price">$99<span>/month</span></div>
                                    <div class="pricing-features">
                                        <div class="pricing-feature">✓ Unlimited transactions</div>
                                        <div class="pricing-feature">✓ Advanced reporting</div>
                                        <div class="pricing-feature">✓ Full integrations</div>
                                        <div class="pricing-feature">✓ Priority support</div>
                                    </div>
                                    <button class="pricing-btn">Choose Plan</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.loadDashboardData();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSection(item.dataset.section);
            });
        });

        // Upgrade button
        document.getElementById('upgrade-btn').addEventListener('click', () => {
            this.showUpgradeModal();
        });

        // Close upgrade modal
        document.getElementById('close-upgrade-modal').addEventListener('click', () => {
            this.closeUpgradeModal();
        });

        // Section actions
        document.getElementById('new-sale-btn').addEventListener('click', () => {
            this.startNewSale();
        });

        document.getElementById('add-product-btn').addEventListener('click', () => {
            this.addProduct();
        });

        document.getElementById('add-customer-btn').addEventListener('click', () => {
            this.addCustomer();
        });

        // Widget actions
        document.getElementById('view-all-transactions').addEventListener('click', () => {
            this.viewAllTransactions();
        });

        document.getElementById('view-inventory').addEventListener('click', () => {
            this.switchSection('inventory');
        });
    }

    switchSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');
    }

    loadDashboardData() {
        this.loadRecentTransactions();
        this.loadTopProducts();
        this.updateUsageStats();
    }

    loadRecentTransactions() {
        const transactions = [
            { id: 'TXN001', customer: 'John Smith', amount: 89.99, time: '2:30 PM', status: 'completed' },
            { id: 'TXN002', customer: 'Sarah Johnson', amount: 156.50, time: '2:15 PM', status: 'completed' },
            { id: 'TXN003', customer: 'Walk-in', amount: 24.99, time: '2:00 PM', status: 'completed' },
            { id: 'TXN004', customer: 'Mike Wilson', amount: 299.99, time: '1:45 PM', status: 'completed' },
            { id: 'TXN005', customer: 'Emily Davis', amount: 45.75, time: '1:30 PM', status: 'completed' }
        ];

        const container = document.getElementById('recent-transactions');
        container.innerHTML = transactions.map(txn => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-id">${txn.id}</div>
                    <div class="transaction-customer">${txn.customer}</div>
                </div>
                <div class="transaction-amount">$${txn.amount}</div>
                <div class="transaction-time">${txn.time}</div>
            </div>
        `).join('');
    }

    loadTopProducts() {
        const products = [
            { name: 'Wireless Headphones', sales: 12, revenue: 1199.88 },
            { name: 'Smart Watch', sales: 8, revenue: 2399.92 },
            { name: 'Coffee Mug', sales: 15, revenue: 194.85 },
            { name: 'T-Shirt', sales: 6, revenue: 149.94 },
            { name: 'Notebook', sales: 20, revenue: 179.80 }
        ];

        const container = document.getElementById('top-products');
        container.innerHTML = products.map(product => `
            <div class="product-item">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-sales">${product.sales} sold</div>
                </div>
                <div class="product-revenue">$${product.revenue.toFixed(2)}</div>
            </div>
        `).join('');
    }

    updateUsageStats() {
        // Simulate usage stats
        this.usageStats = {
            transactionsUsed: Math.floor(Math.random() * 20) + 5,
            productsUsed: Math.floor(Math.random() * 80) + 20,
            customersUsed: Math.floor(Math.random() * 40) + 10
        };

        // Update limit bars
        document.querySelectorAll('.limit-fill').forEach((fill, index) => {
            const limits = [
                this.usageStats.transactionsUsed / this.demoLimits.maxTransactions,
                this.usageStats.productsUsed / this.demoLimits.maxProducts,
                this.demoLimits.currentStorage / this.demoLimits.storageLimit
            ];
            fill.style.width = `${limits[index] * 100}%`;
        });

        // Update limit text
        document.querySelectorAll('.limit-text').forEach((text, index) => {
            const values = [
                `${this.usageStats.transactionsUsed}/${this.demoLimits.maxTransactions}`,
                `${this.usageStats.productsUsed}/${this.demoLimits.maxProducts}`,
                `${this.demoLimits.currentStorage}MB/${this.demoLimits.storageLimit}MB`
            ];
            text.textContent = values[index];
        });
    }

    startRealTimeUpdates() {
        // Simulate real-time updates
        setInterval(() => {
            this.updateSalesStats();
        }, 5000);

        setInterval(() => {
            this.updateUsageStats();
        }, 10000);
    }

    updateSalesStats() {
        // Simulate real-time sales updates
        const todaySales = document.getElementById('today-sales');
        const todayTransactions = document.getElementById('today-transactions');
        
        if (todaySales && todayTransactions) {
            const currentSales = parseFloat(todaySales.textContent.replace('$', '').replace(',', ''));
            const currentTransactions = parseInt(todayTransactions.textContent);
            
            // Add small random increments
            const newSales = currentSales + (Math.random() * 50);
            const newTransactions = currentTransactions + (Math.random() > 0.7 ? 1 : 0);
            
            todaySales.textContent = `$${newSales.toFixed(2)}`;
            todayTransactions.textContent = newTransactions;
        }
    }

    showUpgradeModal() {
        document.getElementById('upgrade-modal').style.display = 'flex';
    }

    closeUpgradeModal() {
        document.getElementById('upgrade-modal').style.display = 'none';
    }

    startNewSale() {
        if (this.usageStats.transactionsUsed >= this.demoLimits.maxTransactions) {
            this.showUpgradePrompt('You have reached the demo transaction limit. Upgrade to process unlimited transactions.');
            return;
        }
        
        alert('Starting new sale...\n\nIn a real implementation, this would open the checkout screen.');
        this.usageStats.transactionsUsed++;
        this.updateUsageStats();
    }

    addProduct() {
        if (this.usageStats.productsUsed >= this.demoLimits.maxProducts) {
            this.showUpgradePrompt('You have reached the demo product limit. Upgrade to add unlimited products.');
            return;
        }
        
        alert('Adding new product...\n\nIn a real implementation, this would open the product form.');
        this.usageStats.productsUsed++;
        this.updateUsageStats();
    }

    addCustomer() {
        if (this.usageStats.customersUsed >= this.demoLimits.maxCustomers) {
            this.showUpgradePrompt('You have reached the demo customer limit. Upgrade to add unlimited customers.');
            return;
        }
        
        alert('Adding new customer...\n\nIn a real implementation, this would open the customer form.');
        this.usageStats.customersUsed++;
        this.updateUsageStats();
    }

    viewAllTransactions() {
        alert('Viewing all transactions...\n\nIn a real implementation, this would show a detailed transaction list.');
    }

    showUpgradePrompt(message) {
        const confirmed = confirm(`${message}\n\nWould you like to upgrade now?`);
        if (confirmed) {
            this.showUpgradeModal();
        }
    }
}

// Initialize demo dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('demo-dashboard')) {
        window.demoDashboard = new DemoDashboard('demo-dashboard');
    }
});