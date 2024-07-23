// server.js
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'stock_management_system' 
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to database.');
});

const SECRET_KEY = 'your_secret_key';

// Fetch item data
app.get('/api/stock/item-data', (req, res) => {
    const query = 'SELECT item_type, SUM(quantity) AS total_quantity FROM stock GROUP BY item_type';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        const dataPoints = results.map(row => ({
            name: row.item_type,
            y: row.total_quantity,
        }));
        res.json(dataPoints);
    });
});

// Fetch low stock items
app.get('/api/stock/low-stock-items', (req, res) => {
    const query = 'SELECT item_type, SUM(quantity) AS total_quantity FROM stock GROUP BY item_type HAVING SUM(quantity) < 5';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        res.json(results);
    });
});

// Fetch total items in stock
app.get('/api/stock/total-items-in-stock', (req, res) => {
    const query = 'SELECT SUM(quantity) AS total_items_in_stock FROM stock';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        res.json(results[0]);
    });
});

// Fetch total items requested
app.get('/api/stock/total-items-requested', (req, res) => {
    const query = 'SELECT COUNT(*) AS total_items_requested FROM requests';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        res.json(results[0]);
    });
});

// Fetch total items out of stock
app.get('/api/stock/total-items-out-of-stock', (req, res) => {
    const query = 'SELECT COUNT(*) AS total_items_out_of_stock FROM out_in_stock';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        res.json(results[0]);
    });
});

// Fetch total repaired items from returned_items where is_working = 1
app.get('/api/stock/total-repaired-items', (req, res) => {
    const query = 'SELECT COUNT(*) AS total_repaired_items FROM returned_items WHERE is_working = 1';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        res.json(results[0]);
    });
});

// Fetch all items from stock
app.get('/api/stock/view-all-items', (req, res) => {
    const query = 'SELECT * FROM stock';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        res.json(results);
    });
});

// Register endpoint
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const saltRounds = 10;

    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
            console.error('Hashing error:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }

        const query = 'INSERT INTO app_users (username, password_hash) VALUES (?, ?)';
        db.query(query, [username, hashedPassword], (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).json({ message: 'Error inserting user', error: err.message });
            }
            res.status(201).json({ message: 'User registered successfully' });
        });
    });
});

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT id, username, password_hash FROM app_users WHERE username = ?';
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = results[0];

        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
            if (err) {
                console.error('Comparison error:', err);
                return res.status(500).json({ message: 'Server error', error: err.message });
            }

            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid username or password' });
            }

            // Authentication successful, generate token
            const token = jwt.sign({ userId: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });

            res.status(200).json({ message: 'Login successful', token });
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
