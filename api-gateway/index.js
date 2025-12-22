const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Service URLs
const userService = 'http://localhost:3001';
const productService = 'http://localhost:3002';

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    service: 'API Gateway',
    status: 'API Gateway is running',
    routes: {
      '/api/users': 'User Service',
      '/api/products': 'Product Service',
      '/health': 'Health Check'
    },
    timestamp: new Date().toISOString()
  });
});

// Proxy routes
app.use('/api/users', createProxyMiddleware({
  target: userService,
  changeOrigin: true,
  pathRewrite: {
    '^': '/users',
  },
  onError: (err, req, res) => {
    console.error('User Service Proxy Error:', err);
    res.status(502).json({ 
      error: 'User Service is unavailable',
      message: 'Please try again later'
    });
  }
}));

app.use('/api/products', createProxyMiddleware({
  target: productService,
  changeOrigin: true,
  pathRewrite: {
    '^': '/products',
  },
  onError: (err, req, res) => {
    console.error('Product Service Proxy Error:', err);
    res.status(502).json({ 
      error: 'Product Service is unavailable',
      message: 'Please try again later'
    });
  }
}));

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route Not Found',
    availableRoutes: ['/api/users', '/api/products', '/health'],
    method: req.method,
    requestedPath: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: 'Something went wrong on our end'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`API Gateway is running on http://localhost:${PORT}`);
  console.log(`User Service Proxy: ${userService}`);
  console.log(`Product Service Proxy: ${productService}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
});