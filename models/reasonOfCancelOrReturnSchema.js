import mongoose from "mongoose";

const reasonOfCancelOrReturnSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, "Reason should have a description"],
    unique: true,
  },
  type:{
    type: String,
    required: [true, "Reason should have a type"],
    enum:["cancelled", 'returned'],
  },
  status:{
    type: String,
    enum:["active", 'inactive'],
    default: "active"
  }
});

const ReasonOfCancelOrReturn = mongoose.model("ReasonOfCancelOrReturn", reasonOfCancelOrReturnSchema);
export default ReasonOfCancelOrReturn