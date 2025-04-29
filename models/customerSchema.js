import mongoose from 'mongoose';

const customerSchema =  mongoose.Schema({
  name:{
    type: String,
    required: [true, 'Customer should have a name']
  },
  phoneNumber:{
    type: String,
    required: [true, 'Customer Should have an phoneNumber'],
    unique: true,
  },
  password:{
    type: String,
    required: [true, 'Customer Should have a password']
  },
  image:{
    type: String,
  },
  region:{
    type:String,
  },
  address:{
    type: String,
  },
  newPhone:{
    type: String,
  },
  verifyCode:{
    type: Number
  },
  changeCode:{
    type: Number
  },
  resetCode:{
    type: Number
  },
  createdAt:{
    type: Date,
    default: Date.now,
  },
  totalRating:{
    type: Number,
  },
  averageRating:{
    type: Number,
  },
  status:{
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  wallet:{
    type: Number,
    default: 0
  },
  isVerify:{
    type: Boolean,
    default: false,
  },
  isDeleted:{
    type: Boolean,
    default: false,
  },
  deviceToken:{
    type: String,
  },
  region:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Region",
  },
  subRegion:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubRegion",
  },
});

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
