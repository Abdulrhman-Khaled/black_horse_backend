import mongoose from "mongoose";

const paymentSchema = mongoose.Schema({
  title:{
    type: String,
    required: [true,'the Payment should have a title'],
  },

},{
  timestamps: true,
})

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment