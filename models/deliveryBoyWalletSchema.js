import mongoose from 'mongoose';

const deliveryBoyWalletSchema = mongoose.Schema({
  order:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Order",
  },
  amountOfOrder:{
    type:Number,
    default:0
  },
  deliveryBoy:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"DeliveryBoy"
  },
  createdAt:{
    type:Date,
    default:Date.now()
  }
},{
  timestamps:true
})
const DeliveryBoyWallet = mongoose.model('DeliveryBoyWallet', deliveryBoyWalletSchema);
export default DeliveryBoyWallet;