require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
const allowedOrigins = [
  // 'https://fam-sports.onrender.com' // Allow frontend origin
  'http://localhost:3000'
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

// In your server.js file, update the product schema:
// Product Schema
// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  model: { type: String, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  image: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: ["sports", "retro", "home-kit", "player-edition"] // Updated category values
  },
  createdAt: { type: Date, default: Date.now }
});


const Product = mongoose.model('Product', productSchema);

// Add Product
app.post('/products', async (req, res) => {
  try {
    const { name, model, price, description, discount, image, category } = req.body;

    if (!name || !model || !price || !description || !image || !category) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const newProduct = new Product({
      name,
      model,
      price: parseFloat(price),
      discount: discount ? parseFloat(discount) : 0,
      description,
      image,
      category,
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Server error while creating product' });
  }
});

// Get all products or filtered by category
app.get("/products", async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    
    if (category) {
      query.category = category;
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Get single product
app.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid product ID format"
      });
    }
    
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found"
      });
    }
    
    res.json({
      success: true,
      product
    });
    
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error"
    });
  }
});


// // Add Product
// app.post('/products', async (req, res) => {
//   try {
//     const { name, model, price, description, image, category } = req.body;

//     if (!name || !model || !price || !description || !image || !category) {
//       return res.status(400).json({ error: 'All fields are required' });
//     }

//     const newProduct = new Product({
//       name,
//       model,
//       price: parseFloat(price),
//       description,
//       image,
//       category,
//     });

//     const savedProduct = await newProduct.save();
//     res.status(201).json(savedProduct);
//   } catch (error) {
//     console.error('Error creating product:', error);
//     res.status(500).json({ error: 'Server error while creating product' });
//   }
// });
  
//   // In your server.js file
// app.get("/products", async (req, res) => {
//   console.log("Received request for products");
//   try {
//     const { category } = req.query;
//     let query = {};
    
//     if (category) {
//       query.category = category;
//     }

//     const products = await Product.find(query); // Fetch filtered products
//     res.status(200).json(products);
//   } catch (err) {
//     console.error("Error fetching products:", err);
//     res.status(500).json({ error: "Failed to fetch products" });
//   }
// });
  



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
