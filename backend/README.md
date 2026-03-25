# FitSphere Backend

FitSphere is a comprehensive fitness management system with authentication, role-based access control (Admin, Trainer, Client), and MySQL database integration.

## Prerequisites

- **Java JDK 21** or above
- **Maven 3.9.13** or above
- **MySQL 8.0** or above
- **Postman** (for API testing)
- **VS Code** with extensions:
  - Extension Pack for Java
  - Spring Boot Extension Pack
  - Lombok Support

## Setup Instructions

### 1. Database Setup

```sql
CREATE DATABASE fitsphere;
USE fitsphere;
```

### 2. Configure Database Connection

Edit `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/fitsphere
spring.datasource.username=root
spring.datasource.password=your_password
```

### 3. Project Structure

```
src/main/java/com/fitsphere/
├── controller/     # REST API Controllers
├── model/          # Entity Models
├── repository/     # Data Access Layer
├── service/        # Business Logic Layer
└── security/       # Security Configuration & JWT
```

### 4. Build the Project

```bash
mvn clean install
```

### 5. Run the Application

**Option A: Using Maven**
```bash
mvn spring-boot:run
```

**Option B: Using IDE**
- Right-click on `FitSphereApplication.java`
- Select "Run" or "Debug"

The server will start on `http://localhost:8080`

### 6. Test the API

Test the health endpoint:
```bash
GET http://localhost:8080/api/health
```

## API Endpoints

Once implemented, you'll have endpoints for:
- **Authentication**: Sign up, Login, Logout
- **Plan Management**: Create, View, Book Plans
- **Trainer Assignment**: Assign/View Trainers
- **Diet Management**: Create, Update, View Diet Plans
- **User Roles**: Admin, Trainer, Client
- **ERP Operations**: Supplier management, purchase orders, low-stock visibility, and admin dashboard summaries

## ERP Module

FitSphere now includes a lightweight ERP layer for gym operations. It connects the existing equipment and finance flows with:

- **Supplier management** for vendor records
- **Purchase orders** for equipment procurement and stock receiving
- **Inventory planning** with reorder levels, storage location, notes, and unit cost on gym equipment
- **ERP dashboard** for membership revenue, procurement spend, outstanding procurement cost, inventory value, and low-stock items

### ERP Endpoints

All ERP endpoints are available under the application context path `/api` and require an `Authorization: Bearer <token>` header from an ADMIN user.

- `GET /api/admin/erp/dashboard`
- `GET /api/admin/erp/inventory/low-stock`
- `GET /api/admin/erp/suppliers`
- `GET /api/admin/erp/suppliers/{supplierId}`
- `POST /api/admin/erp/suppliers`
- `PUT /api/admin/erp/suppliers/{supplierId}`
- `DELETE /api/admin/erp/suppliers/{supplierId}`
- `GET /api/admin/erp/purchase-orders`
- `GET /api/admin/erp/purchase-orders/{purchaseOrderId}`
- `POST /api/admin/erp/purchase-orders`
- `PUT /api/admin/erp/purchase-orders/{purchaseOrderId}`
- `POST /api/admin/erp/purchase-orders/{purchaseOrderId}/receive`
- `DELETE /api/admin/erp/purchase-orders/{purchaseOrderId}`

## Technologies Used

- **Spring Boot 3.2.2**
- **Spring Security** (JWT-based)
- **Spring Data JPA**
- **MySQL**
- **Lombok**
- **JWT** (JSON Web Tokens)

## Next Steps

1. Implement User and Role entities in `model/`
2. Create repository interfaces in `repository/`
3. Build service classes in `service/`
4. Develop REST controllers in `controller/`
5. Configure security in `security/`

## Notes

- Hot reload is enabled with DevTools
- Database schema is auto-generated (update mode)
- CORS is configured for local development

## Support

For issues or questions, refer to the Spring Boot documentation or consult the project team.
