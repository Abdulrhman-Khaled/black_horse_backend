import mongoose from "mongoose";
import { addCreditOrDebit } from "../../controllers/store.controllers/customerSupplierController.js";

const treasurySchema = mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: [true, "Admin is required"],
  },
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
  },
  type: {
    type: String,
    enum: ["deposit", "withdraw"],
    required: true,
  },
  operationType:{
    type:String,
    enum:['treasuryOperation'],
    default:'treasuryOperation',
  },
  date: {
    type: Date,
  },
});

treasurySchema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      if(this.type === 'deposit'){
        await addCreditOrDebit(0, this.amount);
      }else if(this.type === 'withdraw'){
        await addCreditOrDebit(this.amount, 0);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Treasury = mongoose.model("Treasury", treasurySchema);
export default Treasury;
