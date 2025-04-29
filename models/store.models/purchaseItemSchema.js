import mongoose, { Schema } from "mongoose";

const purchaseItemSchema =  mongoose.Schema({
  product:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Product",
    required:[true, 'Product is required']
  },
  quantity:{
    type:Number,
    required:[true, 'Quantity is required']
  },
  totalSubQuantity:{
    type:Number,
    required:[true, 'TotalSubQuantity is required']
  },
  unit:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Unit",
    required:[true, 'Unit is required']
  },
  reminderQuantity:{
    type:Number,
    required:true
  },
  productionDate:{
    type:Date,
    default:Date.now //required:true
  },
  expiryDate:{
    type:Date,
    required:true
  },
  costPrice:{
    type:Number,
    required:true
  },
  retailPrice:{
    type:Number,
    required:true
  },
  wholesalePrice:{
    type:Number,
    required:true
  },
  haveWholeSalePrice:{
    type:Number,
    required:true
  },
  purchaseId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Purchase",
    required:[true, 'PurchaseId is required']
  },
  inventoryId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Inventory",
    required:true
  },
  date:{
    type:Date,
    default:Date.now
  },
});

const PurchaseItem = mongoose.model('PurchaseItem', purchaseItemSchema);
export default PurchaseItem