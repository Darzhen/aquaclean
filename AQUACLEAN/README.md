# AquaClean Backend API

A comprehensive Node.js/Express backend for the AquaClean Laundry & Water Refilling Station Management System.

## Features

- 🔐 **Authentication & Authorization** - JWT-based authentication with role-based access control
- 👥 **Employee Management** - Complete employee lifecycle management
- 📦 **Inventory Management** - Track laundry and water refilling supplies
- 💰 **Sales Management** - Process and track sales transactions
- ⏰ **Attendance Tracking** - Monitor employee attendance and time records
- 💵 **Salary Management** - Calculate and manage employee salaries
- 🔧 **System Administration** - User management and system settings
- 📊 **Reporting & Analytics** - Comprehensive reporting and statistics
- 🛡️ **Security** - Rate limiting, input validation, and security headers
- 📁 **File Upload** - Image upload for profiles and inventory items

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: helmet, cors, rate limiting
- **File Upload**: multer
- **Email**: nodemailer (for notifications)

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aquaclean-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit the .env file with your configuration
   nano .env
   ```

4. **Configure Environment Variables**
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/aquaclean
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   
   # Admin Default Credentials
   DEFAULT_ADMIN_USERNAME=admin
   DEFAULT_ADMIN_PASSWORD=admin123
   DEFAULT_ADMIN_EMAIL=admin@aquaclean.com
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password
- `POST /api/auth/forgotpassword` - Forgot password
- `PUT /api/auth/resetpassword/:token` - Reset password

### Employee Management
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get single employee
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `GET /api/employees/statistics` - Get employee statistics

### Inventory Management
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/:id` - Get single inventory item
- `POST /api/inventory` - Create inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item
- `GET /api/inventory/statistics` - Get inventory statistics
- `GET /api/inventory/low-stock` - Get low stock items
- `GET /api/inventory/expiring` - Get expiring items

### Sales Management
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get single sale
- `POST /api/sales` - Create sale
- `PUT /api/sales/:id` - Update sale
- `DELETE /api/sales/:id` - Delete sale
- `GET /api/sales/statistics` - Get sales statistics
- `GET /api/sales/top-items` - Get top selling items

### Attendance Management
- `GET /api/attendance` - Get all attendance records
- `GET /api/attendance/:id` - Get single attendance record
- `POST /api/attendance` - Create attendance record
- `PUT /api/attendance/:id` - Update attendance record
- `DELETE /api/attendance/:id` - Delete attendance record
- `GET /api/attendance/statistics` - Get attendance statistics
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out

### Salary Management
- `GET /api/salary` - Get all salary records
- `GET /api/salary/:id` - Get single salary record
- `POST /api/salary` - Create salary record
- `PUT /api/salary/:id` - Update salary record
- `DELETE /api/salary/:id` - Delete salary record
- `GET /api/salary/statistics` - Get salary statistics
- `POST /api/salary/calculate` - Calculate salary

### System Management
- `GET /api/system/backup` - Create system backup
- `POST /api/system/restore` - Restore system backup
- `GET /api/system/settings` - Get system settings
- `PUT /api/system/settings` - Update system settings
- `GET /api/system/logs` - Get system logs

## Database Models

### User
- Authentication and user management
- Role-based access control
- Profile information

### Employee
- Employee information and records
- Position and department management
- Salary and employment details

### Inventory
- Item management for laundry and water refilling
- Stock tracking and alerts
- Supplier information

### Sales
- Transaction processing
- Customer information
- Payment tracking

### Attendance
- Time tracking and attendance records
- Break management
- Overtime calculation

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcryptjs for password security
- **Input Validation** - express-validator for data validation
- **Rate Limiting** - Prevent abuse and DDoS attacks
- **Security Headers** - Helmet.js for security headers
- **CORS Protection** - Cross-origin resource sharing protection
- **XSS Protection** - Cross-site scripting protection
- **SQL Injection Protection** - MongoDB sanitization

## Error Handling

The API includes comprehensive error handling:
- Validation errors
- Authentication errors
- Database errors
- File upload errors
- Rate limiting errors

## File Upload

The system supports file uploads for:
- User profile images
- Inventory item images
- Employee documents

Files are stored in the `uploads/` directory and served statically.

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Code Structure
```
├── models/          # Database models
├── routes/          # API routes
├── middleware/      # Custom middleware
├── utils/           # Utility functions
├── uploads/         # File uploads
├── server.js        # Main server file
└── package.json     # Dependencies
```

## Production Deployment

1. **Set environment variables for production**
   ```env
   NODE_ENV=production
   MONGODB_URI_PROD=your-production-mongodb-uri
   JWT_SECRET=your-production-jwt-secret
   ```

2. **Install production dependencies**
   ```bash
   npm install --production
   ```

3. **Start the server**
   ```bash
   npm start
   ```

## API Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "count": 1,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

## Default Admin Account

The system creates a default admin account on first run:
- **Username**: admin
- **Password**: admin123
- **Email**: admin@aquaclean.com

**Important**: Change these credentials immediately after first login!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository. 