import mongoose from 'mongoose';

const defectiveInventoryProductSchema = mongoose.Schema({
  admin:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    // required:true
  },
  productId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Product",
    required:true
  },
  productItemId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"PurchaseItem",
    required:true
  },
  inventoryId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Inventory",
    required:true
  },
  quantity:{
    type:Number,
    required:true
  },
  costPrice:{
    type:Number,
    required:true
  },
  reason:{
    type:String,
    required:true
  },
  date:{
    type:Date,
    default:Date.now
  }
});

const DefectiveInventoryProduct = mongoose.model('DefectiveInventoryProduct', defectiveInventoryProductSchema);
export default DefectiveInventoryProduct;