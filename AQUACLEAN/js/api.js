// AquaClean API Client
class AquaCleanAPI {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.token = localStorage.getItem('authToken');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    // Clear authentication token
    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }

    // Get headers for API requests
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const config = {
                headers: this.getHeaders(),
                ...options
            };

            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication Methods
    async login(username, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (response.success && response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } finally {
            this.clearToken();
        }
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    // Employee Methods
    async getEmployees(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/employees?${queryString}`);
    }

    async getEmployee(id) {
        return await this.request(`/employees/${id}`);
    }

    async createEmployee(employeeData) {
        return await this.request('/employees', {
            method: 'POST',
            body: JSON.stringify(employeeData)
        });
    }

    async updateEmployee(id, employeeData) {
        return await this.request(`/employees/${id}`, {
            method: 'PUT',
            body: JSON.stringify(employeeData)
        });
    }

    async deleteEmployee(id) {
        return await this.request(`/employees/${id}`, {
            method: 'DELETE'
        });
    }

    async getEmployeeStatistics() {
        return await this.request('/employees/statistics/overview');
    }

    // Inventory Methods
    async getInventory(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/inventory?${queryString}`);
    }

    async getInventoryItem(id) {
        return await this.request(`/inventory/${id}`);
    }

    async createInventoryItem(itemData) {
        return await this.request('/inventory', {
            method: 'POST',
            body: JSON.stringify(itemData)
        });
    }

    async updateInventoryItem(id, itemData) {
        return await this.request(`/inventory/${id}`, {
            method: 'PUT',
            body: JSON.stringify(itemData)
        });
    }

    async deleteInventoryItem(id) {
        return await this.request(`/inventory/${id}`, {
            method: 'DELETE'
        });
    }

    async getInventoryStatistics() {
        return await this.request('/inventory/statistics/overview');
    }

    async getLowStockItems() {
        return await this.request('/inventory/low-stock/items');
    }

    async getExpiringItems(days = 30) {
        return await this.request(`/inventory/expiring/items?days=${days}`);
    }

    async updateStock(id, quantity, type, notes) {
        return await this.request(`/inventory/${id}/stock`, {
            method: 'PUT',
            body: JSON.stringify({ quantity, type, notes })
        });
    }

    // Sales Methods
    async getSales(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/sales?${queryString}`);
    }

    async getSale(id) {
        return await this.request(`/sales/${id}`);
    }

    async createSale(saleData) {
        return await this.request('/sales', {
            method: 'POST',
            body: JSON.stringify(saleData)
        });
    }

    async updateSale(id, saleData) {
        return await this.request(`/sales/${id}`, {
            method: 'PUT',
            body: JSON.stringify(saleData)
        });
    }

    async deleteSale(id) {
        return await this.request(`/sales/${id}`, {
            method: 'DELETE'
        });
    }

    async getSalesStatistics(startDate, endDate) {
        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/sales/statistics/overview?${queryString}`);
    }

    async getTopSellingItems(limit = 10, startDate, endDate) {
        const params = { limit };
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/sales/top-items/list?${queryString}`);
    }

    // Attendance Methods
    async getAttendance(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/attendance?${queryString}`);
    }

    async getAttendanceRecord(id) {
        return await this.request(`/attendance/${id}`);
    }

    async createAttendanceRecord(attendanceData) {
        return await this.request('/attendance', {
            method: 'POST',
            body: JSON.stringify(attendanceData)
        });
    }

    async updateAttendanceRecord(id, attendanceData) {
        return await this.request(`/attendance/${id}`, {
            method: 'PUT',
            body: JSON.stringify(attendanceData)
        });
    }

    async deleteAttendanceRecord(id) {
        return await this.request(`/attendance/${id}`, {
            method: 'DELETE'
        });
    }

    async clockIn(employeeId, location) {
        return await this.request('/attendance/clock-in', {
            method: 'POST',
            body: JSON.stringify({ employeeId, location })
        });
    }

    async clockOut(employeeId) {
        return await this.request('/attendance/clock-out', {
            method: 'POST',
            body: JSON.stringify({ employeeId })
        });
    }

    async getAttendanceStatistics(startDate, endDate, employeeId) {
        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (employeeId) params.employeeId = employeeId;
        
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/attendance/statistics/overview?${queryString}`);
    }

    async getEmployeeAttendance(employeeId, startDate, endDate) {
        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/attendance/employee/${employeeId}?${queryString}`);
    }

    async approveAttendance(id) {
        return await this.request(`/attendance/${id}/approve`, {
            method: 'PUT'
        });
    }

    // Salary Methods
    async getSalaryData(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/salary?${queryString}`);
    }

    async getEmployeeSalary(employeeId) {
        return await this.request(`/salary/${employeeId}`);
    }

    async calculateSalary(employeeId, startDate, endDate) {
        return await this.request('/salary/calculate', {
            method: 'POST',
            body: JSON.stringify({ employeeId, startDate, endDate })
        });
    }

    async getSalaryStatistics() {
        return await this.request('/salary/statistics/overview');
    }

    // System Methods
    async getSystemSettings() {
        return await this.request('/system/settings');
    }

    async updateSystemSettings(settings) {
        return await this.request('/system/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    async createBackup() {
        return await this.request('/system/backup', {
            method: 'POST'
        });
    }

    async getBackups() {
        return await this.request('/system/backups');
    }

    async restoreBackup(fileName) {
        return await this.request('/system/restore', {
            method: 'POST',
            body: JSON.stringify({ fileName })
        });
    }

    async getSystemLogs(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/system/logs?${queryString}`);
    }

    async getSystemHealth() {
        return await this.request('/system/health');
    }

    async clearCache() {
        return await this.request('/system/clear-cache', {
            method: 'POST'
        });
    }

    // Utility Methods
    async checkHealth() {
        return await this.request('/health');
    }

    // Error handling utility
    handleError(error, showAlert = true) {
        console.error('API Error:', error);
        
        if (showAlert) {
            const message = error.message || 'An error occurred';
            this.showAlert(message, 'error');
        }
        
        return error;
    }

    // Alert utility
    showAlert(message, type = 'info') {
        // Create a beautiful alert popup
        const alertDiv = document.createElement('div');
        alertDiv.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;
        
        const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        
        alertDiv.className += ` ${colors[type] || colors.info}`;
        
        alertDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <span class="mr-2">
                        ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    <span class="font-medium">${message}</span>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                    ✕
                </button>
            </div>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Animate in
        setTimeout(() => {
            alertDiv.classList.remove('translate-x-full');
        }, 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            alertDiv.classList.add('translate-x-full');
            setTimeout(() => alertDiv.remove(), 300);
        }, 5000);
    }

    // Loading utility
    showLoading(show = true) {
        const existingLoader = document.getElementById('api-loader');
        
        if (show && !existingLoader) {
            const loader = document.createElement('div');
            loader.id = 'api-loader';
            loader.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            loader.innerHTML = `
                <div class="bg-white rounded-lg p-6 flex items-center space-x-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span class="text-gray-700">Loading...</span>
                </div>
            `;
            document.body.appendChild(loader);
        } else if (!show && existingLoader) {
            existingLoader.remove();
        }
    }
}

// Create global API instance
const api = new AquaCleanAPI();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AquaCleanAPI;
} 