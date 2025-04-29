import mongoose from "mongoose";

const periodSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is Required for Period"],
    unique: true,
  },
  from: {
    type: Object,
    required: [true, "From is Required for Period"],
  },
  to: {
    type: Object,
    required: [true, "To is Required for Period"],
  },
});

const Period = mongoose.model("Period", periodSchema);
export default Period;
