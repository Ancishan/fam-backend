require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
const allowedOrigins = [
  'https://dk-gadget-1.onrender.com', // Allow frontend origin
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true); // Allow the request
    } else {
      callback(new Error('Not allowed by CORS')); // Block the request
    }
  },
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  photo: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  model: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);



const User = mongoose.model('User', userSchema);

// Registration Endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📥 Received data:', req.body);

    const { name, photo, phone, email, password, role } = req.body;

    if (!name || !photo || !phone || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const newUser = new User({
      name,
      photo,
      phone,
      email,
      password, // Note: Use bcrypt to hash this in production
      role: role || 'user'
    });

    await newUser.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        photo: newUser.photo
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Check for required fields
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
  
      // Find user by email
      const user = await User.findOne({ email });
  
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
  
      // NOTE: You should hash passwords — for demo, we compare plain text
      if (user.password !== password) {
        return res.status(401).json({ message: 'Incorrect password' });
      }
  
      // Success
      res.status(200).json({
        message: 'Login successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          photo: user.photo,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error during login' });
    }
  });
  
  
// Add to your server.js
app.get('/api/auth/check', async (req, res) => {
    try {
      // In a real app, you would check the session or JWT token
      // For demo, we'll just return the first user (remove this in production)
      const user = await User.findOne();
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        role: user.role
      });
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.post('/api/auth/logout', (req, res) => {
    // In a real app, you would clear the session or JWT token
    res.json({ message: 'Logged out successfully' });
  });


  app.post("/products", async (req, res) => {
    try {
      const newProduct = new Product(req.body); // Assuming Product model is defined
      await newProduct.save();
      res.status(201).json({ message: "Product saved!", product: newProduct });
    } catch (err) {
      res.status(500).json({ error: "Failed to save product" });
    }
  });
  
  app.get("/products", async (req, res) => {
    console.log("Received request for products");
    try {
      const products = await Product.find(); // Fetch all products from DB
      res.status(200).json(products);
    } catch (err) {
      console.error("Error fetching products:", err);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
  
// Update a product - PUT /api/products/:id
app.put('/api/products/:id', async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.status(200).json({
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete a product - DELETE /api/products/:id
app.delete('/api/products/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.status(200).json({ 
      message: 'Product deleted successfully',
      deletedProduct 
    });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});


app.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid product ID format",
        id: id
      });
    }
    
    // Find product
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found",
        id: id
      });
    }
    
    res.json({
      success: true,
      product: product
    });
    
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error",
      error: err.message
    });
  }
});


// Basic root endpoint
app.get('/', (req, res) => {
  res.send('Auth Server is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
