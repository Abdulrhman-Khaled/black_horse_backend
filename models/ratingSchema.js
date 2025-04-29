import mongoose from "mongoose";

const ratingSchema = mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true,
  },
  userType: {
    type: String,
    enum: ["customer", "supplier"],
    required: true,
  },
  rate: {
    type: Number,
    required: true,
  },
});

const Rating = mongoose.model("Rating", ratingSchema);

export default Rating;
