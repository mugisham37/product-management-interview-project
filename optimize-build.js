#!/usr/bin/env node

/**
 * Production Build Optimization Script
 * Optimizes both frontend and backend for production deployment
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class BuildOptimizer {
  constructor() {
    this.results = {
      backend: { success: false, size: 0, time: 0 },
      frontend: { success: false, size: 0, time: 0 }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, args, cwd, description) {
    this.log(`${description}...`);
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd,
        stdio: 'inherit',
        shell: true
      });

      process.on('close', (code) => {
        const duration = Date.now() - startTime;
        if (code === 0) {
          this.log(`${description} completed in ${duration}ms`, 'success');
          resolve({ success: true, duration });
        } else {
          this.log(`${description} failed with code ${code}`, 'error');
          reject(new Error(`${description} failed`));
        }
      });
    });
  }

  async getDirectorySize(dirPath) {
    try {
      const stats = await this.getDirectoryStats(dirPath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  async getDirectoryStats(dirPath) {
    let totalSize = 0;
    let fileCount = 0;

    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        const subStats = await this.getDirectoryStats(itemPath);
        totalSize += subStats.size;
        fileCount += subStats.fileCount;
      } else {
        totalSize += stats.size;
        fileCount++;
      }
    }

    return { size: totalSize, fileCount };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async optimizeBackend() {
    this.log('🔧 Optimizing Backend Build');
    
    try {
      // Clean previous build
      const distPath = path.join(__dirname, 'server', 'dist');
      if (fs.existsSync(distPath)) {
        fs.rmSync(distPath, { recursive: true, force: true });
        this.log('Cleaned previous backend build');
      }

      // Install dependencies
      await this.runCommand('npm', ['ci', '--only=production'], 
        path.join(__dirname, 'server'), 'Installing production dependencies');

      // Build TypeScript
      const buildResult = await this.runCommand('npm', ['run', 'build'], 
        path.join(__dirname, 'server'), 'Building TypeScript');

      // Get build size
      const buildSize = await this.getDirectorySize(distPath);
      
      this.results.backend = {
        success: true,
        size: buildSize,
        time: buildResult.duration
      };

      this.log(`Backend build size: ${this.formatBytes(buildSize)}`, 'success');
      
    } catch (error) {
      this.log(`Backend optimization failed: ${error.message}`, 'error');
      this.results.backend.success = false;
    }
  }

  async optimizeFrontend() {
    this.log('🔧 Optimizing Frontend Build');
    
    try {
      // Clean previous build
      const buildPath = path.join(__dirname, 'web', '.next');
      if (fs.existsSync(buildPath)) {
        fs.rmSync(buildPath, { recursive: true, force: true });
        this.log('Cleaned previous frontend build');
      }

      // Install dependencies
      await this.runCommand('npm', ['ci'], 
        path.join(__dirname, 'web'), 'Installing dependencies');

      // Build Next.js application
      const buildResult = await this.runCommand('npm', ['run', 'build'], 
        path.join(__dirname, 'web'), 'Building Next.js application');

      // Get build size
      const buildSize = await this.getDirectorySize(buildPath);
      
      this.results.frontend = {
        success: true,
        size: buildSize,
        time: buildResult.duration
      };

      this.log(`Frontend build size: ${this.formatBytes(buildSize)}`, 'success');
      
    } catch (error) {
      this.log(`Frontend optimization failed: ${error.message}`, 'error');
      this.results.frontend.success = false;
    }
  }

  async createProductionConfig() {
    this.log('📝 Creating production configuration');

    // Create production environment file for backend
    const backendProdEnv = `# Production Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_production_password
DB_DATABASE=product_management_prod

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com
`;

    fs.writeFileSync(path.join(__dirname, 'server', '.env.production'), backendProdEnv);
    this.log('Created backend production environment file');

    // Create production configuration for frontend
    const frontendProdEnv = `NEXT_PUBLIC_API_URL=https://your-api-domain.com
NODE_ENV=production
`;

    fs.writeFileSync(path.join(__dirname, 'web', '.env.production'), frontendProdEnv);
    this.log('Created frontend production environment file');
  }

  async generateDeploymentGuide() {
    const deploymentGuide = `# Production Deployment Guide

## Build Results
- Backend: ${this.results.backend.success ? '✅ Success' : '❌ Failed'} (${this.formatBytes(this.results.backend.size)}, ${this.results.backend.time}ms)
- Frontend: ${this.results.frontend.success ? '✅ Success' : '❌ Failed'} (${this.formatBytes(this.results.frontend.size)}, ${this.results.frontend.time}ms)

## Backend Deployment

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- PM2 (recommended for process management)

### Steps
1. Copy \`server/\` directory to production server
2. Install dependencies: \`npm ci --only=production\`
3. Set up production database
4. Configure environment variables in \`.env.production\`
5. Run migrations: \`npm run migration:run\`
6. Start application: \`npm start\` or \`pm2 start dist/main.js\`

### Environment Variables
\`\`\`
DB_HOST=your_db_host
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=product_management_prod
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
\`\`\`

## Frontend Deployment

### Prerequisites
- Node.js 18+
- Web server (Nginx, Apache, or CDN)

### Steps
1. Copy \`web/\` directory to build server
2. Install dependencies: \`npm ci\`
3. Configure environment variables in \`.env.production\`
4. Build application: \`npm run build\`
5. Deploy \`.next/\` directory to web server
6. Configure web server to serve static files and handle routing

### Environment Variables
\`\`\`
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NODE_ENV=production
\`\`\`

### Nginx Configuration Example
\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
\`\`\`

## Performance Optimizations Applied

### Backend
- TypeScript compilation with optimizations
- Production-only dependencies
- Compressed build output
- Environment-based configuration

### Frontend  
- Next.js production build with optimizations
- Static asset optimization
- Code splitting and tree shaking
- Image optimization
- CSS minification

## Monitoring and Maintenance

### Health Checks
- Backend: \`GET /health\` endpoint
- Frontend: Monitor page load times and Core Web Vitals

### Performance Monitoring
- API response times
- Database query performance
- Frontend bundle size
- Cache hit rates

### Recommended Tools
- PM2 for process management
- Nginx for reverse proxy
- PostgreSQL for database
- Monitoring: New Relic, DataDog, or similar

## Security Considerations
- Use HTTPS in production
- Configure proper CORS origins
- Set secure database passwords
- Regular security updates
- Environment variable security
- Rate limiting (recommended)

Generated on: ${new Date().toISOString()}
`;

    fs.writeFileSync(path.join(__dirname, 'DEPLOYMENT.md'), deploymentGuide);
    this.log('Generated deployment guide: DEPLOYMENT.md', 'success');
  }

  async optimize() {
    this.log('🚀 Starting Production Build Optimization');
    
    try {
      // Run optimizations in parallel for better performance
      await Promise.all([
        this.optimizeBackend(),
        this.optimizeFrontend()
      ]);

      await this.createProductionConfig();
      await this.generateDeploymentGuide();

      // Generate summary
      this.log('\n📊 OPTIMIZATION SUMMARY');
      this.log('========================');
      this.log(`Backend: ${this.results.backend.success ? '✅' : '❌'} ${this.formatBytes(this.results.backend.size)} (${this.results.backend.time}ms)`);
      this.log(`Frontend: ${this.results.frontend.success ? '✅' : '❌'} ${this.formatBytes(this.results.frontend.size)} (${this.results.frontend.time}ms)`);
      
      const totalSize = this.results.backend.size + this.results.frontend.size;
      this.log(`Total build size: ${this.formatBytes(totalSize)}`);
      
      if (this.results.backend.success && this.results.frontend.success) {
        this.log('\n🎉 Production optimization completed successfully!', 'success');
        this.log('📖 Check DEPLOYMENT.md for deployment instructions');
        return true;
      } else {
        this.log('\n⚠️ Some optimizations failed. Check logs above.', 'error');
        return false;
      }
      
    } catch (error) {
      this.log(`Optimization failed: ${error.message}`, 'error');
      return false;
    }
  }
}

// Run optimization if called directly
if (require.main === module) {
  const optimizer = new BuildOptimizer();
  
  optimizer.optimize()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Optimization failed:', error);
      process.exit(1);
    });
}

module.exports = BuildOptimizer;