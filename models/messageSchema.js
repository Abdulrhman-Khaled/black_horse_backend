import mongoose from "mongoose";

const messageSchema = mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
    required: [true, "Message should have a chat"],
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
  },
  deliveryBoy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DeliveryBoy",
  },
  body: {
    type: String,
    required: [true, "Message should have a body"],
  },
  type: {
    type: String,
    required: [true, "Message should have a type"],
    enum: ["text", "image", "audio"],
  },
  sender: {
    type: String,
    required: [true, "Message should have a sender"],
    enum: ["customer", "deliveryBoy", "supplier", "admin"],
  },
  time: {
    type: Date,
    default: Date.now,
  },
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
