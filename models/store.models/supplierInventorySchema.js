import mongoose from "mongoose";

const supplierInventorySchema = mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: [true, "Admin is required"],
  },
  name: {
    type: String,
    required: [true, "Name is Required for SupplierInventory"],
    unique: true,
  },
  phoneNumber: {
    type: String,
    required: [true, "phoneNumber is Required for SupplierInventory"],
  },
  address: {
    type: String,
  },
  debit: {
    type: Number,
    required: [true, "debit is Required for SupplierInventory"],
  },
  credit: {
    type: Number,
    required: [true, "credit is Required for SupplierInventory"],
  },
});

const SupplierInventory = mongoose.model("SupplierInventory", supplierInventorySchema);
export default SupplierInventory;
