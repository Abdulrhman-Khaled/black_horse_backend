import mongoose from 'mongoose';

const chatSchema = mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
  },
  supplier: {
    type:mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
  },
  deliveryBoy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DeliveryBoy",
  },
  lastMessage: {
    type: Date,
    default: Date.now()
  }
});

const Chat = mongoose.model('Chat', chatSchema);
export default Chat