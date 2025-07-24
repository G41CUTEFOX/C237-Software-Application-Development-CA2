const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });

const connection = mysql.createConnection({
    host: 'mfk1th.h.filess.io',
    user: 'C237Team39_identitydo',
    password: 'bad27c54c3cf6aa4677445bd8ce2f7effe5ed2d1',
    database: 'C237Team39_identitydo',
    port: '61002'
});


connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');
//  enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded({
    extended: false
}));

//TO DO: Insert code for Session Middleware below 
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    // Session expires after 1 week of inactivity
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } 
}));

app.use(flash());

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/shopping');
    }
};

// Middleware for form validation
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role } = req.body;

    if (!username || !email || !password || !address || !contact || !role) {
        return res.status(400).send('All fields are required.');
    }
    
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

// Define routes
app.get('/',  (req, res) => {
    res.render('index', {user: req.session.user} );
});

app.get('/inventory', checkAuthenticated, checkAdmin, (req, res) => {
    // Fetch data from MySQL
    connection.query('SELECT * FROM fragrances', (error, results) => {
      if (error) throw error;
      res.render('inventory', { fragrances: results, user: req.session.user });
    });
});

app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});

app.post('/register', validateRegistration, (req, res) => {

    const { username, email, password, address, contact, role } = req.body;

    const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
    connection.query(sql, [username, email, password, address, contact, role], (err, result) => {
        if (err) {
            throw err;
        }
        console.log(result);
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

app.get('/login', (req, res) => {
    res.render('login', { messages: req.flash('success'), errors: req.flash('error') });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    connection.query(sql, [email, password], (err, results) => {
        if (err) {
            throw err;
        }

        if (results.length > 0) {
            // Successful login
            req.session.user = results[0]; 
            req.flash('success', 'Login successful!');
            if(req.session.user.role == 'user')
                res.redirect('/shopping');
            else
                res.redirect('/inventory');
        } else {
            // Invalid credentials
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});

app.get('/shopping', checkAuthenticated, (req, res) => {
    // Fetch data from MySQL
    connection.query('SELECT * FROM fragrances', (error, results) => {
        if (error) throw error;
        res.render('shopping', { user: req.session.user, fragrances: results });
      });
});

app.post('/add-to-cart/:id', checkAuthenticated, (req, res) => {
    const fragranceId = parseInt(req.params.id);
    const quantity = parseInt(req.body.quantity) || 1;

    connection.query('SELECT * FROM fragrances WHERE fragranceId = ?', [fragranceId], (error, results) => {
        if (error) throw error;

        if (results.length > 0) {
            const fragrance = results[0];

            // Initialize cart in session if not exists
            if (!req.session.cart) {
                req.session.cart = [];
            }

            // Check if fragrance already in cart
            const existingItem = req.session.cart.find(item => item.fragranceId === fragranceId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                req.session.cart.push({
                    fragranceId: fragrance.fragranceId,
                    fragranceName: fragrance.fragranceName,
                    price: fragrance.price,
                    quantity: fragrance.quantity,
                    description: fragrance.description,
                    image: fragrance.image
                });
            }

            res.redirect('/cart');
        } else {
            res.status(404).send("Fragrance not found");
        }
    });
});

app.get('/cart', checkAuthenticated, (req, res) => {
    const cart = req.session.cart || [];
    res.render('cart', { cart, user: req.session.user });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/fragrance/:id', checkAuthenticated, (req, res) => {
  // Extract the fragrance ID from the request parameters
  const fragranceId = req.params.id;

  // Fetch data from MySQL based on the fragrance ID
  connection.query('SELECT * FROM fragrances WHERE fragranceId = ?', [fragranceId], (error, results) => {
      if (error) throw error;

      // Check if any fragrance with the given ID was found
      if (results.length > 0) {
          // Render HTML page with the fragrance data
          res.render('fragrance', { fragrance: results[0], user: req.session.user  });
      } else {
          // If no fragrance with the given ID was found, render a 404 page or handle it accordingly
          res.status(404).send('Fragrance not found');
      }
  });
});

app.get('/addFragrance', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addFrangarce', {user: req.session.user } ); 
});

app.post('/addfragrance', upload.single('image'),  (req, res) => {
    // Extract fragrance data from the request body
    const { name, quantity, price} = req.body;
    let image;
    if (req.file) {
        image = req.file.filename; // Save only the filename
    } else {
        image = null;
    }

    const sql = 'INSERT INTO fragrances (fragranceName, quantity, price, description, image) VALUES (?, ?, ?, ?, ?)';
    // Insert the new fragrance into the database
    connection.query(sql , [name, quantity, price, description, image], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error adding fragrance:", error);
            res.status(500).send('Error adding fragrance');
        } else {
            // Send a success response
            res.redirect('/inventory');
        }
    });
});

app.get('/updateFragrance/:id',checkAuthenticated, checkAdmin, (req,res) => {
    const productId = req.params.id;
    const sql = 'SELECT * FROM fragrances WHERE fragranceId = ?';

    // Fetch data from MySQL based on the fragrance ID
    connection.query(sql , [fragranceId], (error, results) => {
        if (error) throw error;

        // Check if any fragrance with the given ID was found
        if (results.length > 0) {
            // Render HTML page with the product data
            res.render('updateFragrance', { fragrance: results[0] });
        } else {
            // If no fragrance with the given ID was found, render a 404 page or handle it accordingly
            res.status(404).send('Fragrance not found');
        }
    });
});

app.post('/updateFragrance/:id', upload.single('image'), (req, res) => {
    const fragranceId = req.params.id;
    // Extract fragrance data from the request body
    const { name, quantity, price, description } = req.body;
    let image  = req.body.currentImage; //retrieve current image filename
    if (req.file) { //if new image is uploaded
        image = req.file.filename; // set image to be new image filename
    } 

    const sql = 'UPDATE products SET fragranceName = ? , quantity = ?, price = ?, image = ?, description = ? WHERE productId = ?';
    // Insert the new product into the database
    connection.query(sql, [name, quantity, price, image, description, fragranceId], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error updating fragrance:", error);
            res.status(500).send('Error updating fragrance');
        } else {
            // Send a success response
            res.redirect('/inventory');
        }
    });
});

app.post('/deleteFragrance/:id', checkAuthenticated, checkAdmin, (req, res) => {
  const fragranceId = req.params.id;
  connection.query('DELETE FROM fragrances WHERE fragranceId = ?', [fragranceId], (error, results) => {
    if (error) {
      console.error("Error deleting fragrance:", error);
      res.status(500).send('Error deleting fragrance');
    } else {
      res.redirect('/inventory');
    }
  });
});

app.get('/dashboard', checkAuthenticated, (req, res) => {
    const search = req.query.search || '';
    const query = 'SELECT * FROM fragrances WHERE fragranceName LIKE ?';
    const searchTerm = '%' + search + '%';

    connection.query(query, [searchTerm], (error, results) => {
        if (error) throw error;
        res.render('dashboard', { user: req.session.user, fragrances: results, search });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
