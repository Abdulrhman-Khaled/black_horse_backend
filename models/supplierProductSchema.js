import mongoose from 'mongoose';

const supplierProductSchema = mongoose.Schema({
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required:[true, 'Supplier is required'],
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required:[true, 'productId is required'],
  },
  price:{
    type:Number,
    required:[true, 'Product should have a price'],
  },
  stock:{
    type:Number,
    required:[true, 'Product should have a stock'],
  },
  afterSale:{
    type:Number,
  },
  afterSaleExpireDate:{
    type:Date,
  },
  minLimit:{
    type:Number,
  },
  maxLimit:{
    type:Number,
  },
  unit:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Unit",
  },
  subUnit:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"SubUnit",
    required:[true, 'Product should have a subUnit'],
  },
  productWeight:{
    type:Number,
    required:[true, 'Product should have a weight'],
  },
  createdAt:{
    type:Date,
    default:Date.now
  },
  frequency:{
    type:Number,
    default: 0
  },
  status:{
    type:String,
    enum:["active",'inactive'],
    default:"active"
  },
  expiryDate:{
    type:Date,
  }
},{
  timestamps: true,
})

const SupplierProduct = mongoose.model('SupplierProduct', supplierProductSchema);
export default SupplierProduct;