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

// B. POST route /orders - saves a new order and updates lesson spaces
app.post('/orders', async (req, res) => {
    const { name, phone, cart } = req.body;

    if (!name || !phone || !cart || cart.length === 0) {
        return res.status(400).json({ message: "Missing order details: name, phone, or cart items." });
    }

    const lessonIDs = cart.map(item => new ObjectId(item._id)); // Assuming _id from frontend is a string
    const orderDetails = cart.map(item => ({
        lessonId: new ObjectId(item._id),
        subject: item.subject,
        quantity: 1 // Assuming one item per cart entry for simplicity, adjust if cart stores quantity
    }));

    const newOrder = {
        name,
        phone,
        lessonIDs: lessonIDs, // Store ObjectIds
        orderDetails, // Store detailed order items
        totalSpaces: cart.length, // Total number of items in the order
        orderDate: new Date()
    };

    const session = client.startSession();
    session.startTransaction();

    try {
        // 1. Save the new order
        const orderResult = await ordersCollection.insertOne(newOrder, { session });

        // 2. Update available spaces for each lesson in the order
        for (const item of cart) {
            const lessonId = new ObjectId(item._id);
            const updateResult = await lessonsCollection.updateOne(
                { _id: lessonId, spaces: { $gt: 0 } },
                { $inc: { spaces: -1 } },
                { session }
            );

            if (updateResult.matchedCount === 0) {
                await session.abortTransaction();
                return res.status(400).json({ message: `Lesson ${item.subject} is out of spaces or does not exist.` });
            }
        }

        await session.commitTransaction();
        res.status(201).json({ message: "Order placed successfully!", orderId: orderResult.insertedId });
    } catch (error) {
        await session.abortTransaction();
        console.error("Error processing order:", error);
        res.status(500).json({ message: "Error processing order", error: error.message });
    } finally {
        await session.endSession();
    }
});



// C. PUT route /lessons/:id - updates any attribute in a lesson (specifically spaces)
app.put('/lessons/:id', async (req, res) => {
    const lessonId = req.params.id;
    const updates = req.body; // e.g., { spaces: 4 }

    if (!ObjectId.isValid(lessonId)) {
        return res.status(400).json({ message: "Invalid Lesson ID format." });
    }

    try {
        const result = await lessonsCollection.updateOne(
            { _id: new ObjectId(lessonId) },
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Lesson not found." });
        }
        res.json({ message: "Lesson updated successfully!", modifiedCount: result.modifiedCount });
    } catch (error) {
        console.error("Error updating lesson:", error);
        res.status(500).json({ message: "Error updating lesson", error: error.message });
    }
});