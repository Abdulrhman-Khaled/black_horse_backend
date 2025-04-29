import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Address should have a name"],
    },
    subRegion:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubRegion",
      required: [true, "Address should have a subRegion"],
    }
  },
  { timestamps: true }
);

const Address = mongoose.model("Address", addressSchema);
export default Address