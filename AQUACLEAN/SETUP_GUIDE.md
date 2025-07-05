# 🚀 AquaClean Complete Setup Guide

## 📋 Overview
This guide will help you set up the complete AquaClean Laundry & Water Refilling Station Management System with both backend and frontend components.

## 🛠️ Prerequisites
- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **Git** (for version control)
- **Code Editor** (VS Code recommended)

## 📦 Installation Steps

### 1. **Clone/Download the Project**
```bash
# If using Git
git clone <your-repository-url>
cd AQUACLEAN

# Or download and extract the ZIP file
```

### 2. **Install Backend Dependencies**
```bash
npm install
```

### 3. **Set Up Environment Variables**
```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your configuration
```

**Required Environment Variables:**
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/aquaclean

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=30d

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### 4. **Start MongoDB**
```bash
# On Windows
"C:\Program Files\MongoDB\Server\{version}\bin\mongod.exe"

# On macOS/Linux
mongod

# Or use MongoDB Atlas (cloud service)
```

### 5. **Initialize the Database**
```bash
# Start the server (this will create the default admin account)
npm run dev
```

### 6. **Access the Application**

#### **Frontend URLs:**
- **Home Page**: `http://localhost:3000/index.html`
- **Login Page**: `http://localhost:3000/login.html`
- **Admin Panel**: `http://localhost:3000/admin-panel.html`

#### **Backend API:**
- **API Base URL**: `http://localhost:5000/api`
- **Health Check**: `http://localhost:5000/api/health`

## 🔐 Default Login Credentials

### **Admin Account:**
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@aquaclean.com`
- **Role**: `admin`

⚠️ **IMPORTANT**: Change these credentials immediately after first login!

## 🏗️ Project Structure

```
AQUACLEAN/
├── 📁 Backend/
│   ├── 📄 server.js              # Main server file
│   ├── 📄 package.json           # Dependencies
│   ├── 📄 .env                   # Environment variables
│   ├── 📁 models/                # Database models
│   ├── 📁 routes/                # API routes
│   ├── 📁 middleware/            # Custom middleware
│   └── 📁 utils/                 # Utility functions
├── 📁 Frontend/
│   ├── 📄 index.html             # Home page
│   ├── 📄 login.html             # Login page
│   ├── 📄 admin.html             # Admin login
│   ├── 📄 admin-panel.html       # Main dashboard
│   ├── 📁 js/                    # JavaScript files
│   │   ├── 📄 api.js             # API client
│   │   └── 📄 dashboard.js       # Dashboard functionality
│   └── 📄 [other HTML pages]     # Management pages
└── 📄 README.md                  # Documentation
```

## 🚀 Running the Application

### **Development Mode:**
```bash
# Start backend server
npm run dev

# The frontend can be served using any static file server
# For example, using Python:
python -m http.server 3000

# Or using Node.js serve:
npx serve . -p 3000
```

### **Production Mode:**
```bash
# Build and start production server
npm run build
npm start
```

## 📊 Available Features

### **🔐 Authentication & Authorization**
- JWT-based authentication
- Role-based access control (Admin, Manager, User)
- Secure password hashing
- Session management

### **👥 Employee Management**
- Add, edit, delete employees
- Employee profiles with photos
- Position and department management
- Status tracking (Active, Inactive, On Leave)

### **📦 Inventory Management**
- Product catalog management
- Stock level tracking
- Low stock alerts
- Expiry date monitoring
- Stock movement history

### **💰 Sales Management**
- Sales recording and tracking
- Customer information
- Payment processing
- Sales reports and analytics
- Top-selling items

### **⏰ Attendance Management**
- Clock in/out functionality
- Attendance tracking
- Time sheet management
- Location-based attendance
- Attendance approval workflow

### **💵 Salary Management**
- Salary calculation
- Overtime tracking
- Deductions and bonuses
- Salary reports
- Payroll generation

### **⚙️ System Management**
- System settings
- User management
- Backup and restore
- System logs
- Health monitoring

## 🔧 API Endpoints

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### **Employees**
- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### **Inventory**
- `GET /api/inventory` - Get all inventory items
- `POST /api/inventory` - Create inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item

### **Sales**
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create sale
- `PUT /api/sales/:id` - Update sale
- `DELETE /api/sales/:id` - Delete sale

### **Attendance**
- `GET /api/attendance` - Get all attendance records
- `POST /api/attendance` - Create attendance record
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out

### **System**
- `GET /api/system/settings` - Get system settings
- `PUT /api/system/settings` - Update system settings
- `POST /api/system/backup` - Create backup
- `GET /api/system/health` - System health check

## 🛡️ Security Features

- **JWT Authentication** with secure token management
- **Password Hashing** using bcrypt
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization
- **CORS Protection** for cross-origin requests
- **File Upload Security** with size and type restrictions
- **Error Handling** without exposing sensitive information

## 📈 Monitoring & Logging

- **Request Logging** with timestamps
- **Error Logging** with stack traces
- **Performance Monitoring** with response times
- **Database Query Logging** in development
- **System Health Checks** for monitoring

## 🔄 Database Operations

### **Backup Database:**
```bash
# Create backup
mongodump --db aquaclean --out ./backups

# Restore backup
mongorestore --db aquaclean ./backups/aquaclean
```

### **Reset Database:**
```bash
# Drop and recreate database
mongo aquaclean --eval "db.dropDatabase()"
```

## 🐛 Troubleshooting

### **Common Issues:**

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity

2. **Port Already in Use**
   - Change PORT in `.env`
   - Kill process using the port: `lsof -ti:5000 | xargs kill`

3. **JWT Token Issues**
   - Check JWT_SECRET in `.env`
   - Clear browser localStorage
   - Restart the server

4. **File Upload Errors**
   - Check upload directory permissions
   - Verify MAX_FILE_SIZE setting
   - Ensure upload path exists

### **Debug Mode:**
```bash
# Enable debug logging
DEBUG=* npm run dev
```

## 📞 Support

For technical support or questions:
- Check the console for error messages
- Review the server logs
- Verify all environment variables are set correctly
- Ensure all dependencies are installed

## 🚀 Deployment

### **Local Development:**
```bash
npm run dev
```

### **Production Deployment:**
1. Set `NODE_ENV=production` in `.env`
2. Use a process manager like PM2
3. Set up reverse proxy (Nginx/Apache)
4. Configure SSL certificates
5. Set up monitoring and logging

### **Docker Deployment:**
```dockerfile
# Example Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🎉 Congratulations!

Your AquaClean Management System is now fully set up and ready to use! 

**Next Steps:**
1. Log in with the default admin credentials
2. Change the default password
3. Add your first employees
4. Set up inventory items
5. Start recording sales and attendance

**Happy Managing! 🎊** 