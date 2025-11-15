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