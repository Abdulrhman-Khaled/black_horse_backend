import mongoose from "mongoose";

const purchaseReturnSchema = mongoose.Schema({
  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Purchase",
    required: [true, "PurchaseId is required"],
  },
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory",
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: [true, "Product is required"],
  },
  unit:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Unit",
    required:[true, 'Unit is required']
  },
  costPrice:{
    type:Number,
    required:true
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const PurchaseReturn = mongoose.model("PurchaseReturn", purchaseReturnSchema);
export default PurchaseReturn;
