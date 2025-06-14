import mongoose from "mongoose";
import { app } from "./app";
import { natsWrapper } from "./nats-wrapper";
import { OrderCreatedListener } from "./events/listener/order-created-listener";
import { OrderCancelledListener } from "./events/listener/order-cancelled-listener";

const start = async () => {
  if (!process.env.JWT_KEY) throw new Error("JWT token not provided");
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI not provided");

  if (!process.env.NATS_CLIENT_ID) throw new Error("NATS_CLIENT_ID not provided");

  if (!process.env.NATS_URL) throw new Error("NATS_URL not provided");

  if (!process.env.NATS_CLUSTER_ID) throw new Error("NATS_CLUSTER_ID not provided");

  try {
    await natsWrapper.connect(
      process.env.NATS_CLUSTER_ID, 
      process.env.NATS_CLIENT_ID, 
      process.env.NATS_URL
    );

    natsWrapper.client.on('close', () => {
      process.exit();
    });

    process.on("SIGINT", () => natsWrapper.client.close());
    process.on("SIGTERM", () => natsWrapper.client.close());

    new OrderCreatedListener(natsWrapper.client).listen();
    new OrderCancelledListener(natsWrapper.client).listen();
    
    await mongoose.connect(process.env.MONGO_URI);
  }
  catch (err) {
    console.error(err);
  }

  app.listen(3000, () => {
    console.log("Listening on port 3000");
  });
}

start();


