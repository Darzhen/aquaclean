// AquaClean Dashboard JavaScript
class AquaCleanDashboard {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            // Check authentication
            if (!api.token) {
                window.location.href = 'login.html';
                return;
            }

            // Get current user
            await this.loadCurrentUser();
            
            // Load dashboard data
            await this.loadDashboardData();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start real-time updates
            this.startRealTimeUpdates();
            
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                api.clearToken();
                window.location.href = 'login.html';
            }
        }
    }

    async loadCurrentUser() {
        try {
            const response = await api.getCurrentUser();
            this.currentUser = response.data;
            this.updateUserInfo();
        } catch (error) {
            api.handleError(error);
        }
    }

    updateUserInfo() {
        const userInfoElements = document.querySelectorAll('.user-info');
        userInfoElements.forEach(element => {
            if (element.dataset.field === 'name') {
                element.textContent = this.currentUser.name || this.currentUser.username;
            } else if (element.dataset.field === 'role') {
                element.textContent = this.currentUser.role;
            } else if (element.dataset.field === 'email') {
                element.textContent = this.currentUser.email;
            }
        });
    }

    async loadDashboardData() {
        try {
            api.showLoading(true);
            
            // Load statistics
            await this.loadStatistics();
            
            // Load recent data
            await this.loadRecentData();
            
            // Load charts
            await this.loadCharts();
            
        } catch (error) {
            api.handleError(error);
        } finally {
            api.showLoading(false);
        }
    }

    async loadStatistics() {
        try {
            // Load employee statistics
            const employeeStats = await api.getEmployeeStatistics();
            this.updateStatistics('employees', employeeStats.data);
            
            // Load inventory statistics
            const inventoryStats = await api.getInventoryStatistics();
            this.updateStatistics('inventory', inventoryStats.data);
            
            // Load sales statistics
            const salesStats = await api.getSalesStatistics();
            this.updateStatistics('sales', salesStats.data);
            
            // Load attendance statistics
            const attendanceStats = await api.getAttendanceStatistics();
            this.updateStatistics('attendance', attendanceStats.data);
            
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    updateStatistics(type, data) {
        const statElements = document.querySelectorAll(`[data-stat="${type}"]`);
        statElements.forEach(element => {
            const field = element.dataset.field;
            if (data[field] !== undefined) {
                element.textContent = this.formatNumber(data[field]);
            }
        });
    }

    async loadRecentData() {
        try {
            // Load recent employees
            const recentEmployees = await api.getEmployees({ limit: 5, sort: '-createdAt' });
            this.updateRecentEmployees(recentEmployees.data);
            
            // Load recent sales
            const recentSales = await api.getSales({ limit: 5, sort: '-createdAt' });
            this.updateRecentSales(recentSales.data);
            
            // Load low stock items
            const lowStockItems = await api.getLowStockItems();
            this.updateLowStockItems(lowStockItems.data);
            
        } catch (error) {
            console.error('Error loading recent data:', error);
        }
    }

    updateRecentEmployees(employees) {
        const container = document.getElementById('recent-employees');
        if (!container) return;
        
        container.innerHTML = employees.map(employee => `
            <div class="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold">
                        ${employee.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div class="font-semibold text-gray-800">${employee.name}</div>
                        <div class="text-sm text-gray-500">${employee.position}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm font-medium text-gray-600">${employee.status}</div>
                    <div class="text-xs text-gray-400">${this.formatDate(employee.createdAt)}</div>
                </div>
            </div>
        `).join('');
    }

    updateRecentSales(sales) {
        const container = document.getElementById('recent-sales');
        if (!container) return;
        
        container.innerHTML = sales.map(sale => `
            <div class="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-semibold">
                        ₱
                    </div>
                    <div>
                        <div class="font-semibold text-gray-800">${sale.customerName || 'Walk-in Customer'}</div>
                        <div class="text-sm text-gray-500">${sale.items.length} items</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm font-medium text-green-600">₱${this.formatNumber(sale.totalAmount)}</div>
                    <div class="text-xs text-gray-400">${this.formatDate(sale.createdAt)}</div>
                </div>
            </div>
        `).join('');
    }

    updateLowStockItems(items) {
        const container = document.getElementById('low-stock-items');
        if (!container) return;
        
        container.innerHTML = items.map(item => `
            <div class="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                        ⚠️
                    </div>
                    <div>
                        <div class="font-semibold text-gray-800">${item.name}</div>
                        <div class="text-sm text-gray-500">${item.category}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm font-medium text-red-600">${item.quantity} left</div>
                    <div class="text-xs text-gray-400">Min: ${item.minStockLevel}</div>
                </div>
            </div>
        `).join('');
    }

    async loadCharts() {
        // This would integrate with a charting library like Chart.js
        // For now, we'll just log that charts would be loaded
        console.log('Charts would be loaded here');
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.logout();
            });
        }

        // Quick action buttons
        this.setupQuickActions();
        
        // Search functionality
        this.setupSearch();
        
        // Navigation
        this.setupNavigation();
    }

    setupQuickActions() {
        const quickActions = {
            'add-employee': () => window.location.href = 'employee-management.html',
            'add-inventory': () => window.location.href = 'laundry-inventory.html',
            'record-sale': () => window.location.href = 'laundry-sales.html',
            'clock-in': () => this.quickClockIn(),
            'view-reports': () => window.location.href = 'system-settings.html'
        };

        Object.entries(quickActions).forEach(([id, action]) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', action);
            }
        });
    }

    async quickClockIn() {
        try {
            const employeeId = prompt('Enter Employee ID:');
            if (!employeeId) return;
            
            const location = prompt('Enter location (optional):');
            const response = await api.clockIn(employeeId, location);
            
            if (response.success) {
                api.showAlert('Clock-in recorded successfully!', 'success');
            } else {
                api.showAlert(response.message || 'Clock-in failed', 'error');
            }
        } catch (error) {
            api.handleError(error);
        }
    }

    setupSearch() {
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (query.length > 2) {
                    this.performSearch(query);
                }
            });
        }
    }

    async performSearch(query) {
        try {
            // This would search across multiple entities
            // For now, we'll just show a placeholder
            console.log('Searching for:', query);
        } catch (error) {
            api.handleError(error);
        }
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('[data-nav]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.dataset.nav;
                window.location.href = `${target}.html`;
            });
        });
    }

    startRealTimeUpdates() {
        // Update dashboard every 30 seconds
        setInterval(async () => {
            try {
                await this.loadStatistics();
            } catch (error) {
                console.error('Real-time update error:', error);
            }
        }, 30000);
    }

    async logout() {
        try {
            await api.logout();
            api.showAlert('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        } catch (error) {
            api.handleError(error);
            // Still redirect even if logout fails
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        }
    }

    // Utility methods
    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return new Intl.NumberFormat('en-PH').format(num);
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Export data methods
    async exportData(type, format = 'csv') {
        try {
            api.showLoading(true);
            
            let data;
            switch (type) {
                case 'employees':
                    data = await api.getEmployees({ limit: 1000 });
                    break;
                case 'inventory':
                    data = await api.getInventory({ limit: 1000 });
                    break;
                case 'sales':
                    data = await api.getSales({ limit: 1000 });
                    break;
                case 'attendance':
                    data = await api.getAttendance({ limit: 1000 });
                    break;
                default:
                    throw new Error('Invalid export type');
            }
            
            this.downloadData(data.data, `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`, format);
            
        } catch (error) {
            api.handleError(error);
        } finally {
            api.showLoading(false);
        }
    }

    downloadData(data, filename, format) {
        let content;
        let mimeType;
        
        if (format === 'csv') {
            content = this.convertToCSV(data);
            mimeType = 'text/csv';
        } else if (format === 'json') {
            content = JSON.stringify(data, null, 2);
            mimeType = 'application/json';
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        api.showAlert(`Data exported successfully as ${filename}`, 'success');
    }

    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            }).join(','))
        ].join('\n');
        
        return csvContent;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new AquaCleanDashboard();
});

// Global utility functions
window.formatCurrency = function(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
};

window.formatDate = function(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH');
};

window.formatDateTime = function(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-PH');
}; 