require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// MongoDB Connection URI from environment variables
const uri = process.env.MONGO_URI;

if (!uri) {
    console.error("MONGO_URI is not defined in the .env file. Please set it.");
    process.exit(1);
}

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db;
let lessonsCollection;
let ordersCollection;

async function connectToMongoDB() {
    try {
        await client.connect();
        db = client.db("classbookingDB"); // Your database name
        lessonsCollection = db.collection("lessons");
        ordersCollection = db.collection("orders");
        console.log("Connected successfully to MongoDB Atlas!");
    } catch (error) {
        console.error("Failed to connect to MongoDB Atlas:", error);
        process.exit(1); // Exit if database connection fails
    }
}


// Connect to MongoDB when the server starts
connectToMongoDB();

// --- Middleware Functions ---

// A. Logger middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// B. Static file middleware for lesson images
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// CORS middleware to allow requests from your Vue.js app
app.use(cors());

// Body parser middleware for JSON requests
app.use(express.json());


// --- REST API Routes ---

// A. GET route /lessons - returns all lessons as JSON
app.get('/lessons', async (req, res) => {
    try {
        const lessons = await lessonsCollection.find({}).toArray();
        res.json(lessons);
    } catch (error) {
        console.error("Error fetching lessons:", error);
        res.status(500).json({ message: "Error fetching lessons", error: error.message });
    }
});