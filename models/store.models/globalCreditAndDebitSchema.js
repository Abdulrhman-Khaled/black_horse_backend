import mongoose from "mongoose";

const globalCreditAndDebitSchema = mongoose.Schema({
  globalCredit: {
    type: Number,
    required: [true, "GlobalCreditAndDebit should have a credit"],
  },
  globalDebit: {
    type: Number,
    required: [true, "GlobalCreditAndDebit should have a debit"],
  },
});

const GlobalCreditAndDebit = mongoose.model("GlobalCreditAndDebit", globalCreditAndDebitSchema);
export default GlobalCreditAndDebit;
