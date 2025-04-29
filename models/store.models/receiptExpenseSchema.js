import mongoose from 'mongoose';
import { addCreditOrDebit } from '../../controllers/store.controllers/customerSupplierController.js';

const expenseSchema = mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: [true, "Admin is required"],
  },
  title:{
    type:String,
    required:[true, 'Expense should have a title'],
  },
  amount:{
    type:Number,
    required:[true, 'Expense should have a amount'],
  },
  type:{
    type:String,
    enum:['fixed', 'unFixed'],
    required:[true, 'Expense should have a type'],
  },
  receiptNumber: {
    type: Number,
    unique: true
  },
  operationType:{
    type:String,
    enum:['expenses'],
    default:'expenses',
  },
  date:{
    type:Date,
    default:Date.now
  }
});

expenseSchema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      await addCreditOrDebit(this.amount, 0);
      let lastExpense = await Expense.findOne({}, {}, { sort: { 'receiptNumber': -1 } });
      this.receiptNumber = lastExpense ? lastExpense.receiptNumber + 1 : 1;
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;