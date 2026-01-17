import mongoose from "mongoose";
import { env } from "../config/env";

export async function connectMongo() {
  if (!env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in environment variables.");
  }

  mongoose.set("strictQuery", true);

  if (env.NODE_ENV !== "production") {
    mongoose.set("debug", false);
  }

  await mongoose.connect(env.MONGO_URI, {
    autoIndex: env.NODE_ENV !== "production",
  });

  console.log("[mongo] connected");
}

export async function disconnectMongo() {
  await mongoose.disconnect();
  console.log("[mongo] disconnected");
}
