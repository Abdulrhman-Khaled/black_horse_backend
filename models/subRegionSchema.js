import mongoose from "mongoose";

const subRegionSchema = new mongoose.Schema({
  regionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Region",
    required: [true, "SubRegion should have a regionId"],
  },
  name: {
    type: String,
    required: [true, "SubRegion should have a name"],
  },
});

const SubRegion = mongoose.model("SubRegion", subRegionSchema);
export default SubRegion;
