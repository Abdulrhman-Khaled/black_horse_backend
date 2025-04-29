import mongoose from 'mongoose';

const fixedExpenseSchema = mongoose.Schema({
  title:{
    type:String,
    required:[true, "Expense should have a title"],
    unique:true
  },
})

const FixedExpense = mongoose.model("FixedExpense", fixedExpenseSchema);
export default FixedExpense;