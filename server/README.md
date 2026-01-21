# Product Management Backend Server

A NestJS backend server with Fastify adapter for the Product Management Application.

## Features

- **NestJS Framework**: Modern Node.js framework with TypeScript support
- **Fastify Adapter**: High-performance HTTP server
- **TypeORM**: Database ORM with PostgreSQL support
- **Validation**: Input validation with class-validator and class-transformer
- **CORS**: Cross-origin resource sharing configuration
- **Environment Configuration**: Flexible environment variable management

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Set up PostgreSQL database:
- Create a database named `product_management`
- Update database credentials in `.env`

## Development

```bash
# Start development server
npm run start:dev

# Build the application
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_USERNAME` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `password` |
| `DB_DATABASE` | Database name | `product_management` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGIN` | CORS origin | `http://localhost:3000` |

## API Endpoints

The server provides RESTful API endpoints for product management:

- `GET /products` - Get all products
- `GET /products/:id` - Get product by ID
- `POST /products` - Create new product
- `PATCH /products/:id` - Update product
- `DELETE /products/:id` - Delete product

## Project Structure

```
src/
├── products/           # Product module
│   ├── dto/           # Data transfer objects
│   ├── entities/      # TypeORM entities
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── products.module.ts
├── database/          # Database configuration
├── app.module.ts      # Root application module
└── main.ts           # Application entry point
```

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

Make sure to set appropriate environment variables for production, including secure database credentials and CORS origins.