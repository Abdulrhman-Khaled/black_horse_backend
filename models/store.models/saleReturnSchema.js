import mongoose from "mongoose";

const saleReturnSchema = mongoose.Schema({
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sale",
    required: [true, "saleId is required"],
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
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Unit",
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
  },
  salePrice:{
    type:Number,
    required:true
  },
  expiryDate:{
    type:Date,
    required:true
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const SaleReturn = mongoose.model("SaleReturn", saleReturnSchema);
export default SaleReturn;
