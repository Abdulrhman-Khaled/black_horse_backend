import mongoose from "mongoose";

const settlementSchema = mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: [true, "Admin is required"],
  },
  purchaseItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PurchaseItem",
    required: [true, "PurchaseItemId is required"],
  },
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory",
    required: [true, "InventoryId is required"],
  },
  product:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Product",
    required:[true, 'Product is required']
  },
  beforeChanges: {
    type: Number,
    required: [true, "Before changes is required"],
  },
  afterChanges: {
    type: Number,
    required: [true, "After changes is required"],
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const Settlement = mongoose.model("Settlement", settlementSchema);
export default Settlement;
