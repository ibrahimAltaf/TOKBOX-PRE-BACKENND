import mongoose from "mongoose";
import { env } from "../config/env";

export async function connectMongo() {
  mongoose.set("strictQuery", true);

  // Helpful logs in dev
  if (env.NODE_ENV !== "production") {
    mongoose.set("debug", false);
  }

  await mongoose.connect(env.MONGO_URI, {
    // defaults are fine; keeping this explicit for clarity
    autoIndex: env.NODE_ENV !== "production",
  });

  console.log("[mongo] connected");
}

export async function disconnectMongo() {
  await mongoose.disconnect();
  console.log("[mongo] disconnected");
}
