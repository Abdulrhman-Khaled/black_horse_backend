import mongoose from "mongoose";

const blockedCustomerSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  supplierId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true,
  }
});

const BlockedCustomer = mongoose.model("BlockedCustomer", blockedCustomerSchema);
export default BlockedCustomer