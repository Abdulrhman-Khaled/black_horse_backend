import mongoose from "mongoose";

const orderProductSet = mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SupplierProduct",
  },
  quantity: {
    type: Number,
    min: 1,
  },
});

const orderOfferSet = mongoose.Schema({
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Offer",
  },
  quantity: {
    type: Number,
    min: 1,
  },
});

const reasonSchema = mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ReasonOfCancelOrReturn",
  },
  description: {
    type: String,
  },
  type: {
    type: String,
  },
});

const returnPartOrder = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  products: {
    type: [orderProductSet],
  },
  offers: {
    type: [orderOfferSet],
  },
  reason: {
    type: reasonSchema,
  },
  otherReason: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ReturnPartOrder = mongoose.model("ReturnPartOrder", returnPartOrder);
export default ReturnPartOrder;
