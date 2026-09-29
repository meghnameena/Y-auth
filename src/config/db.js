import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";
import config from "./config.js";

async function connectDB() {
    await mongoose.connect(config.MONGO_URI);
    console.log("Connected to db");
}

export default connectDB;