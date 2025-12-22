const express = require('express');
const app = express();
app.use(express.json());

const port = process.env.PORT || 3003;

let products = [
    { id: 1, name: 'SSD', price: 100 },
    { id: 2, name: 'RAM', price: 200 },
    { id: 3, name: 'CPU', price: 300 },
    { id: 4, name: 'GPU', price: 400 },
    { id: 5, name: 'Motherboard', price: 500 },
    { id: 6, name: 'Power Supply', price: 600 },
    { id: 7, name: 'Cooler', price: 700 },
    { id: 8, name: 'Case', price: 800 },
    { id: 9, name: 'Keyboard', price: 900 },
    { id: 10, name: 'Mouse', price: 1000 },
];

app.get('/', (req, res) => {
    res.send('Hello, Rest API');
});

app.get('/api/products', (req, res) => {
    res.json(products);
});

app.get('/api/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid product ID' });
    }
    const product = products.find(p => p.id === id);
    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
});

app.post('/api/products', (req, res) => {
    if (!req.body.name || req.body.price === undefined) {
        return res.status(400).json({ message: 'Name and price are required' });
    }
    const maxId = products.length > 0 ? Math.max(...products.map(p => p.id)) : 0;
    const newProduct = {
        id: maxId + 1,
        name: req.body.name,
        price: req.body.price,
    };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid product ID' });
    }
    const product = products.find(p => p.id === id);
    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }
    if (!req.body.name || req.body.price === undefined) {
        return res.status(400).json({ message: 'Name and price are required' });
    }
    product.name = req.body.name;
    product.price = req.body.price;
    res.json(product);
});

// Handle PUT requests to /api/products/ without ID
app.put('/api/products/', (req, res) => {
    res.status(400).json({ message: 'Product ID is required. Use PUT /api/products/:id' });
});

app.put('/api/products', (req, res) => {
    res.status(400).json({ message: 'Product ID is required. Use PUT /api/products/:id' });
});

app.delete('/api/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid product ID' });
    }
    const product = products.find(p => p.id === id);
    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }
    products = products.filter(p => p.id !== id);
    res.json({ message: 'Product deleted successfully' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});