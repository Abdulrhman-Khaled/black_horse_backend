import mongoose from "mongoose";

const customerInventorySchema = mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: [true, "Admin is required"],
  },
  name: {
    type: String,
    required: [true, "Name is Required for CustomerInventory"],
    unique: true,
  },
  phoneNumber: {
    type: String,
    required: [true, "phoneNumber is Required for CustomerInventory"],
  },
  address: {
    type: String,
  },
  debit: {
    type: Number,
    required: [true, "debit is Required for CustomerInventory"],
  },
  credit: {
    type: Number,
    required: [true, "credit is Required for CustomerInventory"],
  },
});

const CustomerInventory = mongoose.model(
  "CustomerInventory",
  customerInventorySchema
);
export default CustomerInventory;
