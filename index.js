// --- server.js (or app.js) ---
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  // 'https://dk-gadget-hub.vercel.app'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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
    enum: ["sports", "retro", "home-kit", "player-edition","football-boots","none"]
  },
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// Order Schema
// models/order.model.js
const orderSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productName: String,
    quantity: Number,
    totalPrice: Number,
    buyerName: String,
    buyerEmail: String,
    phone: String,
    address: String,
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    transactionId: { type: String, default: null },
      orderedBy: {
      type: String,
      enum: ["website", "bkash"],
      default: "website",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);


const comboProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  description: {
    type: String,
    required: true,
  },
  images: {
    type: [String], // Array of image URLs
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ComboProduct = mongoose.model('ComboProduct', comboProductSchema);

const bannerSchema = new mongoose.Schema({
  image: { type: String, required: true }, // Store image URL
  caption: { type: String, required: true }, // Store caption
});

const Banner = mongoose.model("Banner", bannerSchema);

// Admin Login (returns a token or just success)
app.post("/admin", (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    // optionally you can return a token
    res.json({ success: true });
  } else {
    res.status(401).json({ message: "invalid credential" });
  }
});

// Create a Product
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

// Get all products (with optional category filter)
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

// Get single product by ID
app.get("/products/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
        id
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        id
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
      message: "Server error",
      error: err.message
    });
  }
});

// Update a product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, model, price, discount, description, image, category } = req.body;

    const updatedFields = {
      name,
      model,
      price: parseFloat(price),
      discount: discount ? parseFloat(discount) : 0,
      description,
      image,
      category
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updatedFields,
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

// Delete a product
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


// Combo product
app.post("/combo", async (req, res) => {
  try {
    const { name, model, price, discount, description, images } = req.body;

    // Basic validation
    if (!name || !model || !price || !description || !images || images.length === 0) {
      return res.status(400).json({ error: "All required fields must be filled." });
    }

    const newProduct = new ComboProduct({
      name,
      model,
      price,
      discount,
      description,
      images,
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Error saving combo product:", error);
    res.status(500).json({ error: "Server error. Could not save product." });
  }
});

// Get all combo products
app.get('/combo', async (req, res) => {
  try {
    const comboProducts = await ComboProduct.find(); // Populate actual product details
    res.status(200).json(comboProducts);
  } catch (error) {
    console.error('Error fetching combo products:', error);
    res.status(500).json({ message: 'Failed to fetch combo products' });
  }
});

// Get single Combo product by ID
app.get("/combos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
        id
      });
    }

    const comboProduct = await ComboProduct.findById(id); // Renamed to avoid conflict

    if (!comboProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        id
      });
    }

    res.json({
      success: true,
      comboProduct // Renamed to match the variable name
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

// GET all combo products
app.get("/combo", async (req, res) => {
  const products = await Combo.find();
  res.json(products);
});

// get single Combo PRoduct
app.get("/combo/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const product = await ComboProduct.findById(id);
    if (!product) {
      return res.status(404).send("Combo product not found");
    }
    res.json(product);
  } catch (error) {
    res.status(500).send("Server error");
  }
});

// delete Combo PRoduct
app.delete("/combo/:id", async (req, res) => {
  const { id } = req.params;
  console.log("Deleting combo product with ID:", id); // Add this line to log the ID

  try {
    const product = await ComboProduct.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }
    res.send({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).send({ message: "Error deleting product" });
  }
});


// Update a combo product by ID
app.put("/combo/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  try {
    const updatedProduct = await ComboProduct.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(updatedProduct);
  } catch (err) {
    console.error("Update failed:", err);
    res.status(500).json({ message: "Failed to update product" });
  }
});


// Banner Part
app.post("/banner", async (req, res) => {
  const { image, caption } = req.body;

  try {
    const newBanner = new Banner({
      image,
      caption,
    });

    await newBanner.save();
    res.status(201).send({ message: "Banner added successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to add banner" });
  }
});

// get all banner.js (add this part)
app.get("/banner", async (req, res) => {
  try {
    const banners = await Banner.find();
    res.status(200).json(banners);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch banners" });
  }
});

// Fetch a single banner by ID
app.get("/banner/:id", async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }
    res.json(banner);
  } catch (err) {
    console.error("Error fetching banner:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE banner
app.delete("/banner/:id", async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ message: "Banner deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Deletion failed" });
  }
});


app.put("/banner/:id", async (req, res) => {
  const { image, caption } = req.body;
  try {
    const updated = await Banner.findByIdAndUpdate(
      req.params.id,
      { image, caption },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});



app.post("/order", async (req, res) => {
  try {
    const {
      productId,
      productName,
      quantity,
      totalPrice,
      buyerName,
      buyerEmail,   // ডিবাগের জন্য লগ করবো
      phone,
      orderedBy,
      address,
    } = req.body;

    console.log("Received order data:", req.body);   // <=== এইটা লগ করে দেখবে কি আসছে

    if (
      !productId ||
      !productName ||
      !quantity ||
      !totalPrice ||
      !buyerName ||
      !buyerEmail ||   // buyerEmail চেক করো
      !phone ||
      !address
    ) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // নতুন order obj তৈরি
    const newOrder = new Order({
      productId,
      productName,
      quantity,
      totalPrice,
      buyerName,
      buyerEmail,    // এটা একদম ঠিক মতো লাগবে
      phone,
      orderedBy,
      address,
    });

    const savedOrder = await newOrder.save();

    console.log("Order saved:", savedOrder);   // <=== সেভ হওয়ার পরে লগ করো

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: savedOrder,
    });
  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({
      success: false,
      message: "Server error while placing order",
      error: error.message,
    });
  }
});



// Admin: Get all orders (for dashboard)
app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    console.error("❌ Failed to fetch orders:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

// PATCH /orders/:id

app.patch("/orders/:id", async (req, res) => {
  const { id } = req.params;
  const { status, transactionId } = req.body;

  const updateFields = {};
  if (status) updateFields.status = status;
  if (transactionId) updateFields.transactionId = transactionId;

  try {
    const result = await Order.findByIdAndUpdate(id, updateFields, { new: true });
    res.send({ success: true, order: result });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Failed to update order" });
  }
});



// ✅ Get orders by user email (for "My Orders" page)
app.get("/my-orders", async (req, res) => {
  const { email } = req.query;

  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const orders = await Order.find({ buyerEmail: email }).sort({ createdAt: -1 });

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "No orders found for this user",
      });
    }

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("❌ Error fetching my-orders:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching orders",
    });
  }
});

// 🔍 Search products by name
// GET /search?q=searchTerm
app.get('/search', async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === '') {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    // Escape special characters to prevent regex issues
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i'); // 'i' = case-insensitive

    // Find products matching the regex on either 'name' or 'model' fields
    const products = await Product.find({
      $or: [{ name: regex }, { model: regex }],
    }).sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error during search' });
  }
});





// Basic test endpoint
app.get('/', (req, res) => {
  res.send('Auth Server is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});