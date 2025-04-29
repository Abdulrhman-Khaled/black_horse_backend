import mongoose from "mongoose";

const saleItemDetailSchema = mongoose.Schema({
  expiryDate:{
    type:Date,
  },
  quantity: {
    type:Number,
  },
});

const saleItemSchema = mongoose.Schema({
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
  },
  subUnit:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"SubUnit",
    required:[true, 'SubUnit is required']
  },
  salePrice:{
    type:Number,
    required:true
  },
  originalPrice:{
    type:Number,
  },
  saleId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Sale",
    required:[true, 'saleId is required']
  },
  inventoryId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Inventory",
    required:true
  },
  type:{
    type:String,
    enum:['gomla', 'nosGomla', 'retail'],
    required:true
  },
  date:{
    type:Date,
    default:Date.now
  },
  saleItemDetails:{
    type:[saleItemDetailSchema],
  },
});

const SaleItem = mongoose.model('SaleItem', saleItemSchema);
export default SaleItem;
