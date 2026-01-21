# API Testing Guide

This guide provides manual testing instructions for the Product Management API endpoints.

## Prerequisites

1. PostgreSQL database running on localhost:5432
2. Database named `product_management` created
3. Environment variables configured in `.env` file
4. Server running on http://localhost:3001

## Starting the Server

```bash
# Install dependencies
npm install

# Run database migrations (when database is available)
npm run migration:run

# Start the development server
npm run start:dev
```

## API Endpoints Testing

### 1. Health Check
The server should start successfully and log:
```
🚀 Server running on http://localhost:3001
📊 Environment: development
```

### 2. GET /products - Get all products
```bash
curl -X GET http://localhost:3001/products
```

Expected Response:
```json
{
  "success": true,
  "data": []
}
```

### 3. POST /products - Create a product
```bash
curl -X POST http://localhost:3001/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Laptop",
    "description": "High-performance laptop for testing",
    "price": 999.99,
    "quantity": 10,
    "category": "Electronics",
    "imageUrl": "https://example.com/laptop.jpg"
  }'
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "Test Laptop",
    "description": "High-performance laptop for testing",
    "price": 999.99,
    "quantity": 10,
    "category": "Electronics",
    "imageUrl": "https://example.com/laptop.jpg",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Product created successfully"
}
```

### 4. GET /products/:id - Get specific product
```bash
curl -X GET http://localhost:3001/products/{product-id}
```

### 5. PUT /products/:id - Update product
```bash
curl -X PUT http://localhost:3001/products/{product-id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Laptop",
    "price": 1199.99
  }'
```

### 6. DELETE /products/:id - Delete product
```bash
curl -X DELETE http://localhost:3001/products/{product-id}
```

Expected Response:
```json
{
  "success": true,
  "data": null,
  "message": "Product deleted successfully"
}
```

## Validation Testing

### Test Invalid Data
```bash
curl -X POST http://localhost:3001/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",
    "price": -10,
    "quantity": "invalid"
  }'
```

Expected: 400 Bad Request with validation errors

### Test Non-existent Product
```bash
curl -X GET http://localhost:3001/products/non-existent-id
```

Expected: 404 Not Found

## CORS Testing

The server should accept requests from http://localhost:3000 (frontend origin).

## Notes

- All endpoints return consistent JSON format with `success`, `data`, and optional `message` fields
- Validation is handled by class-validator decorators
- Database constraints ensure data integrity
- Error responses include appropriate HTTP status codes