import mongoose from 'mongoose';
import Fee from './feesSchema.js';

const reasonSchema = mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ReasonOfCancelOrReturn"
  },
  description: {
    type: String,
  },
  type: {
    type: String,
  },
});

const groupSchema = mongoose.Schema({
  groupNumber: {
    type: Number,
    unique: true
  },
  region:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Region",
  },
  subRegion:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"SubRegion",
  },
  supplierId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Supplier",
    required:[true, "Group should have a supplier Id"],
  },
  customer:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Customer",
  }],
  minOrderPrice:{
    type:Number,
    required:true,
  },
  status:{
    type:String,
    enum: ['pending', 'complete', 'inProgress', 'delivery', 'delivered', 'supplierCompleted', 'complete', 'completed', 'cancelled', 'trash', 'returned', 'expired'],
    default:"pending",
  },
  expireDate:{
    type:Date,
  },
  createdAt:{
    type:Date,
    default: Date.now,
  },
  deliveryBoy:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"DeliveryBoy"
  },
  totalPrice:{
    type:Number,
    default:0,
  },
  totalWeight:{
    type:Number,
    default:0,
  },
  deliveryDate:{ // Estimated Time of Arrival
    type: Date,
  },
  deliveryTimeOfArrival:{ // Actual Time of Arrival
    type: Date,
  },
  beforeTrash: {
    type: String,
  },
  reason: {
    type: reasonSchema
  },
  otherReason: {
    type: String
  },
},{
  timestamps:true,
})

groupSchema.pre("save", async function(next) {
  try {
    const expireDateConfig = await Fee.findOne({ type: "groupExpireDays" });
    if (!expireDateConfig) {
      throw new Error("Expiration date configuration not found");
    }
    const daysToAdd = expireDateConfig.amount;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + daysToAdd);
    this.expireDate = expirationDate;
    next(); 
  } catch (error) {
    next(error);
  }
});

groupSchema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      let lastGroup = await Group.findOne({}, {}, { sort: { 'groupNumber': -1 } });
      this.groupNumber = lastGroup ? lastGroup.groupNumber + 1 : 1;
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Group = mongoose.model('Group',groupSchema);
export default Group;