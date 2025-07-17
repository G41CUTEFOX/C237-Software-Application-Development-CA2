const express = require('express');
const mysql = require('mysql2');
 
//******** TODO: Insert code to import 'express-session' *********//
const session = require('express-session');
 
const flash = require('connect-flash');
 
const app = express();
 
// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Republic_C207',
    database: 'C237_usersdb'
});
 
 
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});
 
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
 
//******** TODO: Insert code for Session Middleware below ********//
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  // Session expires after 1 week of inactivity
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));
 
 
app.use(flash());
 
// Setting up EJS
app.set('view engine', 'ejs');



// Starting the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
