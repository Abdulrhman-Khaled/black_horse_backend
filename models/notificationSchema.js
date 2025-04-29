import  mongoose  from "mongoose";

const notificationSchema = mongoose.Schema({
  title:{
    type: String,
    required:[true, "Notification should have a title"],
  },
  body:{
    type: String,
    required:[true, "Notification should have a body"],
  },
  dateTime:{
    type: Date,
    default: Date.now,
  },
  type:{
    type: String,
    enum: ["addNewOffer", "addNewGroup"]
  },
  customerId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  supplierId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  deliveryBoyId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery Boy',
  }
})

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification