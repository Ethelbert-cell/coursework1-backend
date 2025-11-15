require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const path = require('path');

const app = express();
const port = process.env.PORT || 3000;