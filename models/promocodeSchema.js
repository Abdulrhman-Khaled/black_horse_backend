import mongoose from "mongoose";

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required:[true, 'promoCode must have Number'],
    unique:true
  },
  discount: {
    type: Number,
    required:[true, 'promoCode must have Number'],
  },
  expiryDate: {
    type: Date,
    required:[true, 'promoCode must have expiryDate']
  },
  numOfUsage: {
    type: Number,
    required:[true, 'promoCode must have numOfUsage']
  },
  customerId:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Customer",
  }]
});

const PromoCode = mongoose.model("PromoCode", promoCodeSchema)
export default PromoCode
