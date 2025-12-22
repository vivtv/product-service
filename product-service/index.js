const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// In-memory database for products
let products = [
    { 
        id: 1, 
        name: 'Laptop', 
        category: 'Electronics', 
        price: 999.99, 
        stock: 15,
        description: 'High-performance laptop with 16GB RAM',
        createdAt: '2024-01-15T10:30:00.000Z'
    },
    { 
        id: 2, 
        name: 'Smartphone', 
        category: 'Electronics', 
        price: 699.99, 
        stock: 25,
        description: 'Latest smartphone with 128GB storage',
        createdAt: '2024-01-20T14:45:00.000Z'
    },
    { 
        id: 3, 
        name: 'Coffee Maker', 
        category: 'Home Appliances', 
        price: 89.99, 
        stock: 40,
        description: 'Programmable coffee maker with thermal carafe',
        createdAt: '2024-01-25T09:15:00.000Z'
    },
    { 
        id: 4, 
        name: 'Desk Chair', 
        category: 'Furniture', 
        price: 249.99, 
        stock: 8,
        description: 'Ergonomic office chair with lumbar support',
        createdAt: '2024-02-01T11:20:00.000Z'
    }
];
let currentId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;

// Utility function to generate unique ID
const generateId = () => currentId++;

// Validation middleware for product creation
const validateProduct = (req, res, next) => {
    const { name, category, price, stock } = req.body;
    
    const errors = [];
    
    if (!name || name.trim() === '') {
        errors.push('Product name is required');
    }
    
    if (!category || category.trim() === '') {
        errors.push('Category is required');
    }
    
    if (price === undefined || price === null) {
        errors.push('Price is required');
    } else if (isNaN(price) || Number(price) < 0) {
        errors.push('Price must be a positive number');
    }
    
    if (stock === undefined || stock === null) {
        errors.push('Stock quantity is required');
    } else if (isNaN(stock) || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
        errors.push('Stock must be a non-negative integer');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ 
            error: 'Validation failed',
            details: errors 
        });
    }
    
    next();
};

// Validation middleware for partial updates
const validateProductUpdate = (req, res, next) => {
    const { price, stock } = req.body;
    
    const errors = [];
    
    if (price !== undefined && (isNaN(price) || Number(price) < 0)) {
        errors.push('Price must be a positive number');
    }
    
    if (stock !== undefined && (isNaN(stock) || !Number.isInteger(Number(stock)) || Number(stock) < 0)) {
        errors.push('Stock must be a non-negative integer');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ 
            error: 'Validation failed',
            details: errors 
        });
    }
    
    next();
};

// Routes

// Health check endpoints
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/healthy', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Product CRUD API',
        version: '1.0.0',
        totalProducts: products.length
    });
});

// GET all products with filtering, sorting, and pagination
app.get('/products', (req, res) => {
    const { 
        category, 
        minPrice, 
        maxPrice, 
        inStock, 
        sortBy = 'id', 
        sortOrder = 'asc',
        page = 1,
        limit = 10,
        search
    } = req.query;

    let filteredProducts = [...products];

    // Filter by category
    if (category) {
        filteredProducts = filteredProducts.filter(product => 
            product.category.toLowerCase() === category.toLowerCase()
        );
    }
    
    // Filter by price range
    if (minPrice) {
        const min = parseFloat(minPrice);
        if (!isNaN(min)) {
            filteredProducts = filteredProducts.filter(product => product.price >= min);
        }
    }
    
    if (maxPrice) {
        const max = parseFloat(maxPrice);
        if (!isNaN(max)) {
            filteredProducts = filteredProducts.filter(product => product.price <= max);
        }
    }
    
    // Filter by stock availability
    if (inStock === 'true') {
        filteredProducts = filteredProducts.filter(product => product.stock > 0);
    } else if (inStock === 'false') {
        filteredProducts = filteredProducts.filter(product => product.stock === 0);
    }
    
    // Search in name and description
    if (search) {
        const searchLower = search.toLowerCase();
        filteredProducts = filteredProducts.filter(product => 
            product.name.toLowerCase().includes(searchLower) ||
            product.description.toLowerCase().includes(searchLower)
        );
    }
    
    // Sorting
    const validSortFields = ['id', 'name', 'price', 'stock', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'id';
    const order = sortOrder.toString().toLowerCase() === 'desc' ? -1 : 1;

    filteredProducts.sort((a, b) => {
        let av = a[sortField];
        let bv = b[sortField];

        // case-insensitive compare for name
        if (sortField === 'name' && typeof av === 'string' && typeof bv === 'string') {
            av = av.toLowerCase();
            bv = bv.toLowerCase();
        }

        if (av < bv) return -1 * order;
        if (av > bv) return 1 * order;
        return 0;
    });

    // Pagination (validate page/limit)
    const pageNum = Number.isInteger(Number(page)) ? parseInt(page, 10) : 1;
    const limitNum = Number.isInteger(Number(limit)) ? parseInt(limit, 10) : 10;
    const safePageNum = pageNum > 0 ? pageNum : 1;
    const safeLimitNum = limitNum > 0 ? limitNum : 10;

    const startIndex = (safePageNum - 1) * safeLimitNum;
    const endIndex = startIndex + safeLimitNum;

    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredProducts.length / safeLimitNum);

    res.json({
        metadata: {
            totalProducts: filteredProducts.length,
            totalPages: totalPages,
            currentPage: safePageNum,
            pageSize: safeLimitNum,
            hasNextPage: endIndex < filteredProducts.length,
            hasPrevPage: startIndex > 0
        },
        filters: {
            category,
            minPrice: minPrice ? parseFloat(minPrice) : null,
            maxPrice: maxPrice ? parseFloat(maxPrice) : null,
            inStock: inStock ? inStock === 'true' : null,
            search,
            sortBy: sortField,
            sortOrder: order === 1 ? 'asc' : 'desc'
        },
        products: paginatedProducts
    });
});

// GET single product by ID
app.get('/products/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid product id' });
    }
    const product = products.find(p => p.id === id);

    if (!product) {
        return res.status(404).json({
            error: 'Product not found'
        });
    }

    res.json(product);
});

// POST create new product
app.post('/products', validateProduct, (req, res) => {
    const { name, category, price, stock, description = '' } = req.body;

    // Case-insensitive name uniqueness
    const nameExists = products.some(product =>
        product.name.toLowerCase() === String(name).toLowerCase()
    );
    if (nameExists) {
        return res.status(409).json({
            error: 'Product with this name already exists'
        });
    }

    const newProduct = {
        id: generateId(),
        name: String(name).trim(),
        category: String(category).trim(),
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        description: String(description),
        createdAt: new Date().toISOString(),
        updatedAt: null
    };

    products.push(newProduct);

    res.status(201).json({
        message: 'Product created successfully',
        product: newProduct
    });
});

// PUT update existing product (full update)
app.put('/products/:id', validateProduct, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid product id' });
    }
    const { name, category, price, stock, description } = req.body;

    const productIndex = products.findIndex(p => p.id === id);

    if (productIndex === -1) {
        return res.status(404).json({
            error: 'Product not found'
        });
    }

    // Case-insensitive name uniqueness check
    const nameExists = products.some(product =>
        product.name.toLowerCase() === String(name).toLowerCase() && product.id !== id
    );
    if (nameExists) {
        return res.status(409).json({
            error: 'Product name already exists for another product'
        });
    }

    // Update product
    const updatedProduct = {
        ...products[productIndex],
        name: String(name).trim(),
        category: String(category).trim(),
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        description: description || products[productIndex].description,
        updatedAt: new Date().toISOString()
    };

    products[productIndex] = updatedProduct;

    res.json({
        message: 'Product updated successfully',
        product: updatedProduct
    });
});

// PATCH partial update
app.patch('/products/:id', validateProductUpdate, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid product id' });
    }
    const updates = req.body;

    const productIndex = products.findIndex(p => p.id === id);

    if (productIndex === -1) {
        return res.status(404).json({
            error: 'Product not found'
        });
    }

    // Check if name already exists for other products (case-insensitive)
    if (updates.name) {
        const nameExists = products.some(product =>
            product.name.toLowerCase() === String(updates.name).toLowerCase() && product.id !== id
        );
        if (nameExists) {
            return res.status(409).json({
                error: 'Product name already exists for another product'
            });
        }
    }

    // Convert numeric fields if provided
    const processedUpdates = { ...updates };
    if (updates.price !== undefined) {
        processedUpdates.price = parseFloat(updates.price);
    }
    if (updates.stock !== undefined) {
        processedUpdates.stock = parseInt(updates.stock, 10);
    }
    if (updates.name !== undefined) {
        processedUpdates.name = String(updates.name).trim();
    }
    if (updates.category !== undefined) {
        processedUpdates.category = String(updates.category).trim();
    }

    // Update product with new data
    const updatedProduct = {
        ...products[productIndex],
        ...processedUpdates,
        updatedAt: new Date().toISOString()
    };

    products[productIndex] = updatedProduct;

    res.json({
        message: 'Product partially updated successfully',
        product: updatedProduct
    });
});

// DELETE product
app.delete('/products/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid product id' });
    }
    const productIndex = products.findIndex(p => p.id === id);

    if (productIndex === -1) {
        return res.status(404).json({
            error: 'Product not found'
        });
    }

    // Remove product
    const deletedProduct = products.splice(productIndex, 1)[0];

    res.json({
        message: 'Product deleted successfully',
        product: deletedProduct
    });
});

// Special endpoint: Update stock (for inventory management)
app.post('/products/:id/stock', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid product id' });
    }
    const { operation, quantity } = req.body;

    if (!operation || quantity === undefined || quantity === null) {
        return res.status(400).json({
            error: 'Operation and quantity are required'
        });
    }

    const qtyNum = parseInt(quantity, 10);
    if (Number.isNaN(qtyNum) || qtyNum <= 0) {
        return res.status(400).json({
            error: 'Quantity must be a positive integer'
        });
    }

    const productIndex = products.findIndex(p => p.id === id);

    if (productIndex === -1) {
        return res.status(404).json({
            error: 'Product not found'
        });
    }

    const product = products[productIndex];
    const qty = qtyNum;

    if (operation.toLowerCase() === 'add') {
        product.stock += qty;
        product.updatedAt = new Date().toISOString();

        res.json({
            message: `Added ${qty} units to stock`,
            product: product
        });
    } else if (operation.toLowerCase() === 'subtract') {
        if (product.stock < qty) {
            return res.status(400).json({
                error: `Insufficient stock. Available: ${product.stock}, Requested: ${qty}`
            });
        }

        product.stock -= qty;
        product.updatedAt = new Date().toISOString();

        res.json({
            message: `Subtracted ${qty} units from stock`,
            product: product
        });
    } else {
        return res.status(400).json({
            error: 'Invalid operation. Use "add" or "subtract"'
        });
    }
});

// Get product categories
app.get('/categories', (req, res) => {
    const categories = [...new Set(products.map(product => product.category))];
    
    res.json({
        totalCategories: categories.length,
        categories: categories.sort()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        availableEndpoints: [
            'GET    /health',
            'GET    /healthy',
            'GET    /products',
            'GET    /products/:id',
            'POST   /products',
            'PUT    /products/:id',
            'PATCH  /products/:id',
            'DELETE /products/:id',
            'POST   /products/:id/stock',
            'GET    /categories'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Product Service is running on http://localhost:${PORT}`);
    console.log('📋 Available endpoints:');
    console.log('  GET    /health');
    console.log('  GET    /healthy');
    console.log('  GET    /products');
    console.log('  GET    /products/:id');
    console.log('  POST   /products');
    console.log('  PUT    /products/:id');
    console.log('  PATCH  /products/:id');
    console.log('  DELETE /products/:id');
    console.log('  POST   /products/:id/stock');
    console.log('  GET    /categories');
    console.log(`📦 Total products in memory: ${products.length}`);
});