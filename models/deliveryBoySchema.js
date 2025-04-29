import mongoose from 'mongoose';

const deliveryBoySchema = mongoose.Schema({
  name:{
    type:String,
    required:[true, "Delivery Boy should have a name"]
  },
  email:{
    type:String,
    required:[true,'Delivery Boy Should have an email'],
    unique:true,
    match: /^\S+@\S+\.\S+$/, 
  },
  nationalId:{
    type:Number,
    required:[true,'Delivery Boy Should have a national Id'],
  },
  password:{
    type:String,
    required:[true,'Delivery Boy Should have a password']
  },
  image:{
    type:String,
    // required:[true,'Delivery Boy Should have an image'],
  },
  phone:{
    type:String,
    required:[true,'Delivery Boy Should have a Phone']
  },
  wallet:{
    type:Number,
    default: 0
  },
  region:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Region",
    required:[true,'Delivery Boy Should have a region']
  },
  car:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Car",
    required:[true,'Delivery Boy Should have a car']
  },
  deviceToken:{
    type:String,
  },
  status:{
    type:String,
    enum: ['active', 'inActive'],
    default: 'active'
  },
  createdAt:{
    type:Date,
    default: Date.now
  }
},{
  timestamps: true
})

const DeliveryBoy = mongoose.model('Delivery Boy', deliveryBoySchema);
export default DeliveryBoy;