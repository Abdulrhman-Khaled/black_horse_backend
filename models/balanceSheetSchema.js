import mongoose from "mongoose";

const balanceSheetSchema =  mongoose.Schema({
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  deliveryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery Boy',
  },
  processName: {
    type: String,
    required: [true, 'BalanceSheet should have a processName'],
  },
  customerAndOrder: {
    type: String,
    // required: [true, 'BalanceSheet should have an customerAndOrder'],
  },
  balance: {
    type: Number,
    required: [true, 'BalanceSheet should have a balance'],
  },
  type: {
    type: String,
    enum: ['Debit', 'Credit'],
    required: [true, 'BalanceSheet should have a type'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const BalanceSheet = mongoose.model('BalanceSheet', balanceSheetSchema);
export default BalanceSheet;
