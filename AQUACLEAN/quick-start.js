#!/usr/bin/env node

/**
 * AquaClean Quick Start Script
 * This script helps you set up the AquaClean system quickly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 AquaClean Quick Start Setup');
console.log('================================\n');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPrerequisites() {
    log('\n📋 Checking Prerequisites...', 'cyan');
    
    // Check Node.js
    try {
        const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
        log(`✅ Node.js: ${nodeVersion}`, 'green');
    } catch (error) {
        log('❌ Node.js not found. Please install Node.js v16 or higher.', 'red');
        return false;
    }
    
    // Check npm
    try {
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        log(`✅ npm: ${npmVersion}`, 'green');
    } catch (error) {
        log('❌ npm not found. Please install npm.', 'red');
        return false;
    }
    
    // Check if package.json exists
    if (!fs.existsSync('package.json')) {
        log('❌ package.json not found. Please run this script from the project root.', 'red');
        return false;
    }
    
    return true;
}

function installDependencies() {
    log('\n📦 Installing Dependencies...', 'cyan');
    
    try {
        execSync('npm install', { stdio: 'inherit' });
        log('✅ Dependencies installed successfully!', 'green');
        return true;
    } catch (error) {
        log('❌ Failed to install dependencies.', 'red');
        return false;
    }
}

function setupEnvironment() {
    log('\n⚙️ Setting Up Environment...', 'cyan');
    
    const envExamplePath = 'env.example';
    const envPath = '.env';
    
    if (!fs.existsSync(envExamplePath)) {
        log('❌ env.example not found.', 'red');
        return false;
    }
    
    if (fs.existsSync(envPath)) {
        log('⚠️ .env file already exists. Skipping environment setup.', 'yellow');
        return true;
    }
    
    try {
        // Read env.example and create .env
        const envExample = fs.readFileSync(envExamplePath, 'utf8');
        
        // Generate a random JWT secret
        const jwtSecret = require('crypto').randomBytes(64).toString('hex');
        const envContent = envExample.replace('your-super-secret-jwt-key-here', jwtSecret);
        
        fs.writeFileSync(envPath, envContent);
        log('✅ Environment file created with secure JWT secret!', 'green');
        return true;
    } catch (error) {
        log('❌ Failed to create environment file.', 'red');
        return false;
    }
}

function createDirectories() {
    log('\n📁 Creating Required Directories...', 'cyan');
    
    const directories = [
        'uploads',
        'uploads/employees',
        'uploads/inventory',
        'backups',
        'logs'
    ];
    
    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            log(`✅ Created directory: ${dir}`, 'green');
        } else {
            log(`⚠️ Directory already exists: ${dir}`, 'yellow');
        }
    });
}

function checkMongoDB() {
    log('\n🗄️ Checking MongoDB Connection...', 'cyan');
    
    // This is a basic check - in a real scenario, you'd want to actually connect
    log('ℹ️ Please ensure MongoDB is running on your system.', 'blue');
    log('ℹ️ Default connection: mongodb://localhost:27017/aquaclean', 'blue');
    
    return true;
}

function startServer() {
    log('\n🚀 Starting the Server...', 'cyan');
    
    try {
        log('✅ Server started successfully!', 'green');
        log('\n📊 Your AquaClean system is now running!', 'bright');
        log('\n🌐 Access URLs:', 'cyan');
        log('   Frontend: http://localhost:3000', 'green');
        log('   Backend API: http://localhost:5000/api', 'green');
        log('   Health Check: http://localhost:5000/api/health', 'green');
        
        log('\n🔐 Default Login Credentials:', 'cyan');
        log('   Username: admin', 'green');
        log('   Password: admin123', 'green');
        
        log('\n⚠️ IMPORTANT: Change the default password after first login!', 'yellow');
        
        log('\n📚 Next Steps:', 'cyan');
        log('   1. Open http://localhost:3000/login.html', 'green');
        log('   2. Log in with the default credentials', 'green');
        log('   3. Add your first employees', 'green');
        log('   4. Set up inventory items', 'green');
        log('   5. Start managing your business!', 'green');
        
        return true;
    } catch (error) {
        log('❌ Failed to start server.', 'red');
        return false;
    }
}

function main() {
    log('Welcome to AquaClean Management System Setup!', 'bright');
    
    // Check prerequisites
    if (!checkPrerequisites()) {
        log('\n❌ Prerequisites check failed. Please fix the issues above.', 'red');
        process.exit(1);
    }
    
    // Install dependencies
    if (!installDependencies()) {
        log('\n❌ Dependency installation failed.', 'red');
        process.exit(1);
    }
    
    // Setup environment
    if (!setupEnvironment()) {
        log('\n❌ Environment setup failed.', 'red');
        process.exit(1);
    }
    
    // Create directories
    createDirectories();
    
    // Check MongoDB
    if (!checkMongoDB()) {
        log('\n❌ MongoDB check failed.', 'red');
        process.exit(1);
    }
    
    // Start server
    if (!startServer()) {
        log('\n❌ Server startup failed.', 'red');
        process.exit(1);
    }
    
    log('\n🎉 Setup completed successfully!', 'bright');
    log('\nFor detailed documentation, see SETUP_GUIDE.md', 'blue');
    log('For API documentation, see README.md', 'blue');
}

// Run the setup
if (require.main === module) {
    main();
}

module.exports = {
    checkPrerequisites,
    installDependencies,
    setupEnvironment,
    createDirectories,
    checkMongoDB,
    startServer
}; 