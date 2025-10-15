/**
 * LoginScreen.js - Premium authentication interface
 * Secure login with visual feedback and animations
 */

class LoginScreen {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isLoading = false;
        this.loginAttempts = 0;
        this.maxAttempts = 5;
        this.lockoutTime = 15 * 60 * 1000; // 15 minutes
        this.lockedUntil = null;
        
        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
        this.checkLockout();
    }

    render() {
        this.container.innerHTML = `
            <div class="login-container">
                <div class="login-background">
                    <div class="login-particles" id="login-particles"></div>
                    <div class="login-shapes">
                        <div class="shape shape-1"></div>
                        <div class="shape shape-2"></div>
                        <div class="shape shape-3"></div>
                    </div>
                </div>
                
                <div class="login-content">
                    <div class="login-card">
                        <div class="login-header">
                            <div class="logo">
                                <div class="logo-icon">🚀</div>
                                <h1>POS Platform</h1>
                            </div>
                            <p class="login-subtitle">Welcome back to the future of retail</p>
                        </div>
                        
                        <div class="login-form-container">
                            <div class="login-tabs">
                                <button class="tab-btn active" id="username-tab">Username</button>
                                <button class="tab-btn" id="pin-tab">PIN Code</button>
                            </div>
                            
                            <form class="login-form" id="login-form">
                                <div class="form-group">
                                    <label for="username">Username</label>
                                    <div class="input-container">
                                        <input type="text" id="username" name="username" placeholder="Enter your username" autocomplete="username" required>
                                        <div class="input-icon">👤</div>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="password">Password</label>
                                    <div class="input-container">
                                        <input type="password" id="password" name="password" placeholder="Enter your password" autocomplete="current-password" required>
                                        <div class="input-icon">🔒</div>
                                        <button type="button" class="password-toggle" id="password-toggle">👁️</button>
                                    </div>
                                </div>
                                
                                <div class="form-group pin-group" style="display: none;">
                                    <label for="pin-code">PIN Code</label>
                                    <div class="input-container">
                                        <input type="password" id="pin-code" name="pin-code" placeholder="Enter your PIN" maxlength="6" pattern="[0-9]{4,6}">
                                        <div class="input-icon">🔢</div>
                                    </div>
                                </div>
                                
                                <div class="form-options">
                                    <label class="checkbox-container">
                                        <input type="checkbox" id="remember-me">
                                        <span class="checkmark"></span>
                                        Remember me
                                    </label>
                                    <a href="#" class="forgot-password" id="forgot-password">Forgot password?</a>
                                </div>
                                
                                <button type="submit" class="login-btn" id="login-btn">
                                    <span class="btn-text">Sign In</span>
                                    <span class="btn-loading" style="display: none;">
                                        <div class="spinner"></div>
                                        Authenticating...
                                    </span>
                                </button>
                                
                                <div class="login-error" id="login-error" style="display: none;">
                                    <div class="error-icon">⚠️</div>
                                    <div class="error-message" id="error-message"></div>
                                </div>
                                
                                <div class="security-notice" id="security-notice" style="display: none;">
                                    <div class="notice-icon">🔒</div>
                                    <div class="notice-text">
                                        <strong>Account Locked</strong>
                                        <p>Too many failed attempts. Please try again later.</p>
                                        <p class="lockout-timer" id="lockout-timer"></p>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div class="login-footer">
                            <p>Need help? Contact <a href="mailto:support@poscorp.com">support@poscorp.com</a></p>
                            <div class="demo-credentials">
                                <p><strong>Demo Credentials:</strong></p>
                                <p>Username: <code>admin</code> | Password: <code>admin123</code></p>
                                <p>PIN: <code>1234</code></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Form submission
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Tab switching
        document.getElementById('username-tab').addEventListener('click', () => {
            this.switchTab('username');
        });

        document.getElementById('pin-tab').addEventListener('click', () => {
            this.switchTab('pin');
        });

        // Password toggle
        document.getElementById('password-toggle').addEventListener('click', () => {
            this.togglePasswordVisibility();
        });

        // Forgot password
        document.getElementById('forgot-password').addEventListener('click', (e) => {
            e.preventDefault();
            this.showForgotPassword();
        });

        // Input animations
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.classList.add('focused');
            });

            input.addEventListener('blur', () => {
                if (!input.value) {
                    input.parentElement.classList.remove('focused');
                }
            });
        });

        // PIN input formatting
        document.getElementById('pin-code').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        });

        // Enter key handling
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isLoading) {
                this.handleLogin();
            }
        });
    }

    switchTab(tab) {
        const usernameTab = document.getElementById('username-tab');
        const pinTab = document.getElementById('pin-tab');
        const passwordGroup = document.querySelector('.form-group:not(.pin-group)');
        const pinGroup = document.querySelector('.pin-group');

        if (tab === 'username') {
            usernameTab.classList.add('active');
            pinTab.classList.remove('active');
            passwordGroup.style.display = 'block';
            pinGroup.style.display = 'none';
            document.getElementById('username').focus();
        } else {
            pinTab.classList.add('active');
            usernameTab.classList.remove('active');
            passwordGroup.style.display = 'none';
            pinGroup.style.display = 'block';
            document.getElementById('pin-code').focus();
        }

        this.clearError();
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleBtn = document.getElementById('password-toggle');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    }

    async handleLogin() {
        if (this.isLoading || this.isLocked()) return;

        const form = document.getElementById('login-form');
        const formData = new FormData(form);
        
        const username = formData.get('username');
        const password = formData.get('password');
        const pinCode = formData.get('pin-code');
        const rememberMe = document.getElementById('remember-me').checked;

        // Validate input
        if (!username && !pinCode) {
            this.showError('Please enter username or PIN code');
            return;
        }

        if (username && !password) {
            this.showError('Please enter password');
            return;
        }

        this.setLoading(true);
        this.clearError();

        try {
            let response;
            
            if (pinCode) {
                // PIN authentication
                response = await this.authenticatePin(pinCode);
            } else {
                // Username/password authentication
                response = await this.authenticateUser(username, password);
            }

            if (response.success) {
                this.handleSuccessfulLogin(response, rememberMe);
            } else {
                this.handleFailedLogin(response);
            }
        } catch (error) {
            this.handleLoginError(error);
        } finally {
            this.setLoading(false);
        }
    }

    async authenticateUser(username, password) {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                // Demo authentication
                if (username === 'admin' && password === 'admin123') {
                    resolve({
                        success: true,
                        user: {
                            id: 1,
                            username: 'admin',
                            role: 'admin',
                            first_name: 'System',
                            last_name: 'Administrator',
                            permissions: {
                                sales: ['create', 'read', 'update', 'delete', 'void'],
                                inventory: ['create', 'read', 'update', 'delete', 'manage_categories'],
                                customers: ['create', 'read', 'update', 'delete', 'view_history'],
                                employees: ['create', 'read', 'update', 'delete', 'manage_roles'],
                                reports: ['view_all', 'export', 'schedule'],
                                settings: ['system', 'security', 'backup']
                            }
                        },
                        session_token: 'demo_session_token_' + Date.now(),
                        message: 'Access granted',
                        animation: 'vault_open'
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'Invalid credentials',
                        animation: 'shake_form',
                        security_level: 'low'
                    });
                }
            }, 1500); // Simulate network delay
        });
    }

    async authenticatePin(pinCode) {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                // Demo PIN authentication
                if (pinCode === '1234') {
                    resolve({
                        success: true,
                        employee: {
                            id: 1,
                            employee_id: 'EMP001',
                            first_name: 'Demo',
                            last_name: 'Employee',
                            position: 'Cashier',
                            user_id: 1,
                            username: 'demo',
                            role: 'staff',
                            permissions: {
                                sales: ['create', 'read'],
                                inventory: ['read', 'update'],
                                customers: ['create', 'read', 'update']
                            }
                        },
                        session_token: 'demo_pin_session_token_' + Date.now(),
                        message: 'PIN authentication successful',
                        animation: 'vault_open'
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'Invalid PIN',
                        animation: 'shake_form',
                        security_level: 'low'
                    });
                }
            }, 1000);
        });
    }

    handleSuccessfulLogin(response, rememberMe) {
        this.loginAttempts = 0;
        this.lockedUntil = null;
        
        // Store session data
        if (rememberMe) {
            localStorage.setItem('pos_session', JSON.stringify(response));
        } else {
            sessionStorage.setItem('pos_session', JSON.stringify(response));
        }

        // Show success animation
        this.showSuccessAnimation(response.animation);

        // Redirect to dashboard after animation
        setTimeout(() => {
            this.redirectToDashboard();
        }, 2000);
    }

    handleFailedLogin(response) {
        this.loginAttempts++;
        
        // Show error with animation
        this.showError(response.message, response.animation);
        
        // Check if account should be locked
        if (this.loginAttempts >= this.maxAttempts) {
            this.lockAccount();
        }
    }

    handleLoginError(error) {
        console.error('Login error:', error);
        this.showError('Authentication error occurred. Please try again.');
    }

    showSuccessAnimation(animationType) {
        const loginBtn = document.getElementById('login-btn');
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoading = loginBtn.querySelector('.btn-loading');
        
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
        btnLoading.innerHTML = `
            <div class="success-icon">✅</div>
            <span>Access Granted</span>
        `;
        
        loginBtn.classList.add('success');
        
        // Add vault open animation
        if (animationType === 'vault_open') {
            document.body.classList.add('vault-open');
        }
    }

    showError(message, animationType = 'shake_form') {
        const errorDiv = document.getElementById('login-error');
        const errorMessage = document.getElementById('error-message');
        
        errorMessage.textContent = message;
        errorDiv.style.display = 'flex';
        
        // Add shake animation
        if (animationType === 'shake_form') {
            document.getElementById('login-form').classList.add('shake');
            setTimeout(() => {
                document.getElementById('login-form').classList.remove('shake');
            }, 500);
        }
        
        // Pulse animation for security warnings
        if (animationType === 'pulse_denied') {
            document.getElementById('login-form').classList.add('pulse');
            setTimeout(() => {
                document.getElementById('login-form').classList.remove('pulse');
            }, 1000);
        }
    }

    clearError() {
        const errorDiv = document.getElementById('login-error');
        const securityNotice = document.getElementById('security-notice');
        
        errorDiv.style.display = 'none';
        securityNotice.style.display = 'none';
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loginBtn = document.getElementById('login-btn');
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoading = loginBtn.querySelector('.btn-loading');
        
        if (loading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
            loginBtn.disabled = true;
        } else {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            loginBtn.disabled = false;
        }
    }

    lockAccount() {
        this.lockedUntil = Date.now() + this.lockoutTime;
        localStorage.setItem('pos_lockout', this.lockedUntil.toString());
        
        const securityNotice = document.getElementById('security-notice');
        securityNotice.style.display = 'flex';
        
        this.startLockoutTimer();
    }

    checkLockout() {
        const lockoutTime = localStorage.getItem('pos_lockout');
        if (lockoutTime) {
            this.lockedUntil = parseInt(lockoutTime);
            if (this.isLocked()) {
                this.showLockoutNotice();
                this.startLockoutTimer();
            } else {
                localStorage.removeItem('pos_lockout');
            }
        }
    }

    isLocked() {
        return this.lockedUntil && Date.now() < this.lockedUntil;
    }

    showLockoutNotice() {
        const securityNotice = document.getElementById('security-notice');
        securityNotice.style.display = 'flex';
    }

    startLockoutTimer() {
        const timerElement = document.getElementById('lockout-timer');
        
        const updateTimer = () => {
            if (!this.isLocked()) {
                this.clearError();
                localStorage.removeItem('pos_lockout');
                return;
            }
            
            const remaining = Math.ceil((this.lockedUntil - Date.now()) / 1000);
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            
            timerElement.textContent = `Try again in ${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            setTimeout(updateTimer, 1000);
        };
        
        updateTimer();
    }

    showForgotPassword() {
        const email = prompt('Enter your email address to reset your password:');
        if (email) {
            // Simulate password reset request
            alert(`Password reset instructions have been sent to ${email}\n\nIn a real implementation, this would send an email with reset instructions.`);
        }
    }

    redirectToDashboard() {
        // In a real implementation, this would redirect to the actual dashboard
        window.location.href = '#dashboard';
        
        // For demo purposes, show a message
        alert('Login successful! Redirecting to dashboard...\n\nIn a real implementation, this would load the full POS system.');
    }

    // Public method to check if user is logged in
    static isLoggedIn() {
        const session = sessionStorage.getItem('pos_session') || localStorage.getItem('pos_session');
        return session !== null;
    }

    // Public method to get current user
    static getCurrentUser() {
        const session = sessionStorage.getItem('pos_session') || localStorage.getItem('pos_session');
        if (session) {
            try {
                return JSON.parse(session);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    // Public method to logout
    static logout() {
        sessionStorage.removeItem('pos_session');
        localStorage.removeItem('pos_session');
        window.location.reload();
    }
}

// Initialize login screen when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('login-screen')) {
        window.loginScreen = new LoginScreen('login-screen');
    }
});