#!/usr/bin/env node

/**
 * End-to-End Integration Test Script
 * Tests complete user workflows and communication between frontend and backend
 */

const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds

class IntegrationTester {
  constructor() {
    this.backendProcess = null;
    this.frontendProcess = null;
    this.testResults = {
      backendStartup: false,
      frontendStartup: false,
      apiCommunication: false,
      crudOperations: false,
      corsConfiguration: false,
      errorHandling: false,
      dataConsistency: false
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        },
        timeout: options.timeout || 5000
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = {
              status: res.statusCode,
              headers: res.headers,
              data: data ? JSON.parse(data) : null
            };
            resolve(response);
          } catch (error) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: data
            });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));

      if (options.data) {
        req.write(JSON.stringify(options.data));
      }

      req.end();
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async waitForServer(url, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await this.makeRequest(url, { timeout: 2000 });
        return true;
      } catch (error) {
        await this.sleep(1000);
      }
    }
    return false;
  }

  async startBackend() {
    this.log('Starting backend server...');
    
    // Check if .env file exists
    const envPath = path.join(__dirname, 'server', '.env');
    if (!fs.existsSync(envPath)) {
      this.log('Backend .env file not found. Creating from example...', 'error');
      const examplePath = path.join(__dirname, 'server', '.env.example');
      if (fs.existsSync(examplePath)) {
        fs.copyFileSync(examplePath, envPath);
        this.log('Created .env file from example');
      } else {
        throw new Error('No .env.example file found');
      }
    }

    return new Promise((resolve, reject) => {
      this.backendProcess = spawn('npm', ['run', 'start:dev'], {
        cwd: path.join(__dirname, 'server'),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let output = '';
      this.backendProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Application is running on')) {
          this.log('Backend server started successfully', 'success');
          this.testResults.backendStartup = true;
          resolve();
        }
      });

      this.backendProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (error.includes('EADDRINUSE')) {
          this.log('Backend port already in use - assuming server is running', 'success');
          this.testResults.backendStartup = true;
          resolve();
        } else if (error.includes('Error')) {
          this.log(`Backend error: ${error}`, 'error');
        }
      });

      setTimeout(() => {
        if (!this.testResults.backendStartup) {
          reject(new Error('Backend startup timeout'));
        }
      }, TEST_TIMEOUT);
    });
  }

  async startFrontend() {
    this.log('Starting frontend application...');
    
    return new Promise((resolve, reject) => {
      this.frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, 'web'),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let output = '';
      this.frontendProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Ready') || output.includes('started server on')) {
          this.log('Frontend application started successfully', 'success');
          this.testResults.frontendStartup = true;
          resolve();
        }
      });

      this.frontendProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (error.includes('EADDRINUSE')) {
          this.log('Frontend port already in use - assuming server is running', 'success');
          this.testResults.frontendStartup = true;
          resolve();
        } else if (error.includes('Error')) {
          this.log(`Frontend error: ${error}`, 'error');
        }
      });

      setTimeout(() => {
        if (!this.testResults.frontendStartup) {
          reject(new Error('Frontend startup timeout'));
        }
      }, TEST_TIMEOUT);
    });
  }

  async testApiCommunication() {
    this.log('Testing API communication...');
    
    try {
      // Test basic API connectivity
      const response = await this.makeRequest(`${BACKEND_URL}/products`, {
        headers: {
          'Origin': FRONTEND_URL
        }
      });
      
      if (response.status === 200 && response.data && response.data.success !== undefined) {
        this.log('API communication successful', 'success');
        this.testResults.apiCommunication = true;
        return true;
      }
    } catch (error) {
      this.log(`API communication failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testCorsConfiguration() {
    this.log('Testing CORS configuration...');
    
    try {
      // Test preflight request
      const response = await this.makeRequest(`${BACKEND_URL}/products`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      const corsHeaders = response.headers['access-control-allow-origin'];
      if (corsHeaders && (corsHeaders === FRONTEND_URL || corsHeaders === '*')) {
        this.log('CORS configuration is correct', 'success');
        this.testResults.corsConfiguration = true;
        return true;
      } else {
        this.log('CORS configuration issue detected', 'error');
        return false;
      }
    } catch (error) {
      this.log(`CORS test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testCrudOperations() {
    this.log('Testing CRUD operations...');
    
    try {
      const testProduct = {
        name: 'Integration Test Product',
        description: 'A product created during integration testing',
        price: 99.99,
        quantity: 10,
        category: 'Test Category',
        imageUrl: 'https://example.com/test-image.jpg'
      };

      // CREATE
      this.log('Testing product creation...');
      const createResponse = await this.makeRequest(`${BACKEND_URL}/products`, {
        method: 'POST',
        data: testProduct,
        headers: { 'Origin': FRONTEND_URL }
      });
      
      if (createResponse.status !== 201 && createResponse.status !== 200) {
        throw new Error('Product creation failed');
      }
      
      const createdProduct = createResponse.data.data;
      this.log(`Product created with ID: ${createdProduct.id}`, 'success');

      // READ
      this.log('Testing product retrieval...');
      const readResponse = await this.makeRequest(`${BACKEND_URL}/products/${createdProduct.id}`, {
        headers: { 'Origin': FRONTEND_URL }
      });
      
      if (readResponse.status !== 200) {
        throw new Error('Product retrieval failed');
      }
      
      this.log('Product retrieved successfully', 'success');

      // UPDATE
      this.log('Testing product update...');
      const updateData = { ...testProduct, name: 'Updated Integration Test Product' };
      const updateResponse = await this.makeRequest(`${BACKEND_URL}/products/${createdProduct.id}`, {
        method: 'PUT',
        data: updateData,
        headers: { 'Origin': FRONTEND_URL }
      });
      
      if (updateResponse.status !== 200) {
        throw new Error('Product update failed');
      }
      
      this.log('Product updated successfully', 'success');

      // DELETE
      this.log('Testing product deletion...');
      const deleteResponse = await this.makeRequest(`${BACKEND_URL}/products/${createdProduct.id}`, {
        method: 'DELETE',
        headers: { 'Origin': FRONTEND_URL }
      });
      
      if (deleteResponse.status !== 200) {
        throw new Error('Product deletion failed');
      }
      
      this.log('Product deleted successfully', 'success');
      this.testResults.crudOperations = true;
      return true;

    } catch (error) {
      this.log(`CRUD operations test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testErrorHandling() {
    this.log('Testing error handling...');
    
    try {
      // Test 404 error
      try {
        await this.makeRequest(`${BACKEND_URL}/products/non-existent-id`, {
          headers: { 'Origin': FRONTEND_URL }
        });
        throw new Error('Expected 404 error not received');
      } catch (error) {
        if (error.response && error.response.status === 404) {
          this.log('404 error handling works correctly', 'success');
        } else {
          throw error;
        }
      }

      // Test validation error
      try {
        await this.makeRequest(`${BACKEND_URL}/products`, {
          method: 'POST',
          data: {
            name: '', // Invalid empty name
            description: 'Test',
            price: -1, // Invalid negative price
            quantity: 'invalid', // Invalid quantity type
            category: 'Test'
          },
          headers: { 'Origin': FRONTEND_URL }
        });
        throw new Error('Expected validation error not received');
      } catch (error) {
        if (error.response && error.response.status === 400) {
          this.log('Validation error handling works correctly', 'success');
        } else {
          throw error;
        }
      }

      this.testResults.errorHandling = true;
      return true;

    } catch (error) {
      this.log(`Error handling test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testDataConsistency() {
    this.log('Testing data consistency...');
    
    try {
      // Get initial product count
      const initialResponse = await this.makeRequest(`${BACKEND_URL}/products`, {
        headers: { 'Origin': FRONTEND_URL }
      });
      const initialCount = initialResponse.data.data.length;

      // Create a product
      const testProduct = {
        name: 'Consistency Test Product',
        description: 'Testing data consistency',
        price: 50.00,
        quantity: 5,
        category: 'Test'
      };

      const createResponse = await this.makeRequest(`${BACKEND_URL}/products`, {
        method: 'POST',
        data: testProduct,
        headers: { 'Origin': FRONTEND_URL }
      });
      const createdProduct = createResponse.data.data;

      // Verify count increased
      const afterCreateResponse = await this.makeRequest(`${BACKEND_URL}/products`, {
        headers: { 'Origin': FRONTEND_URL }
      });
      const afterCreateCount = afterCreateResponse.data.data.length;

      if (afterCreateCount !== initialCount + 1) {
        throw new Error('Product count inconsistency after creation');
      }

      // Delete the product
      await this.makeRequest(`${BACKEND_URL}/products/${createdProduct.id}`, {
        method: 'DELETE',
        headers: { 'Origin': FRONTEND_URL }
      });

      // Verify count returned to original
      const afterDeleteResponse = await this.makeRequest(`${BACKEND_URL}/products`, {
        headers: { 'Origin': FRONTEND_URL }
      });
      const afterDeleteCount = afterDeleteResponse.data.data.length;

      if (afterDeleteCount !== initialCount) {
        throw new Error('Product count inconsistency after deletion');
      }

      this.log('Data consistency verified', 'success');
      this.testResults.dataConsistency = true;
      return true;

    } catch (error) {
      this.log(`Data consistency test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testFrontendAccess() {
    this.log('Testing frontend accessibility...');
    
    try {
      const response = await this.makeRequest(FRONTEND_URL, { timeout: 10000 });
      if (response.status === 200) {
        this.log('Frontend is accessible', 'success');
        return true;
      }
    } catch (error) {
      this.log(`Frontend access failed: ${error.message}`, 'error');
      return false;
    }
  }

  async cleanup() {
    this.log('Cleaning up processes...');
    
    if (this.backendProcess) {
      this.backendProcess.kill('SIGTERM');
      this.log('Backend process terminated');
    }
    
    if (this.frontendProcess) {
      this.frontendProcess.kill('SIGTERM');
      this.log('Frontend process terminated');
    }
  }

  generateReport() {
    this.log('\n=== INTEGRATION TEST REPORT ===');
    
    const tests = [
      { name: 'Backend Startup', result: this.testResults.backendStartup },
      { name: 'Frontend Startup', result: this.testResults.frontendStartup },
      { name: 'API Communication', result: this.testResults.apiCommunication },
      { name: 'CORS Configuration', result: this.testResults.corsConfiguration },
      { name: 'CRUD Operations', result: this.testResults.crudOperations },
      { name: 'Error Handling', result: this.testResults.errorHandling },
      { name: 'Data Consistency', result: this.testResults.dataConsistency }
    ];

    let passedTests = 0;
    tests.forEach(test => {
      const status = test.result ? '✅ PASS' : '❌ FAIL';
      this.log(`${test.name}: ${status}`);
      if (test.result) passedTests++;
    });

    const overallResult = passedTests === tests.length ? 'SUCCESS' : 'PARTIAL';
    this.log(`\nOverall Result: ${overallResult} (${passedTests}/${tests.length} tests passed)`);
    
    return overallResult === 'SUCCESS';
  }

  async runTests() {
    try {
      this.log('Starting integration tests...');
      
      // Check if servers are already running
      const backendRunning = await this.waitForServer(BACKEND_URL, 1);
      const frontendRunning = await this.waitForServer(FRONTEND_URL, 1);
      
      if (!backendRunning) {
        await this.startBackend();
        await this.sleep(5000); // Give backend time to fully start
      } else {
        this.log('Backend already running', 'success');
        this.testResults.backendStartup = true;
      }
      
      if (!frontendRunning) {
        await this.startFrontend();
        await this.sleep(5000); // Give frontend time to fully start
      } else {
        this.log('Frontend already running', 'success');
        this.testResults.frontendStartup = true;
      }

      // Wait for both servers to be ready
      if (!await this.waitForServer(BACKEND_URL)) {
        throw new Error('Backend server not responding');
      }
      
      if (!await this.waitForServer(FRONTEND_URL)) {
        throw new Error('Frontend server not responding');
      }

      // Run all tests
      await this.testApiCommunication();
      await this.testCorsConfiguration();
      await this.testCrudOperations();
      await this.testErrorHandling();
      await this.testDataConsistency();
      await this.testFrontendAccess();

      return this.generateReport();

    } catch (error) {
      this.log(`Integration test failed: ${error.message}`, 'error');
      return false;
    } finally {
      // Only cleanup if we started the processes
      if (!await this.waitForServer(BACKEND_URL, 1) || !await this.waitForServer(FRONTEND_URL, 1)) {
        await this.cleanup();
      }
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new IntegrationTester();
  
  tester.runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = IntegrationTester;