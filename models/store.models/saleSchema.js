import mongoose from 'mongoose';
import { addCreditOrDebit } from '../../controllers/store.controllers/customerSupplierController.js';

const saleSchema = mongoose.Schema({
  admin:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required:true
  },
  customerInventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerInventory',
  },
  inventoryId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  receiptNumber: {
    type: Number,
    unique: true
  },
  date:{
    type:Date,
    default:Date.now
  },
  note:{
    type:String
  },
  totalAmount:{
    type:Number,
    required:true
  },
  paidAmount:{
    type:Number,
    required:true
  },
  dueAmount:{
    type:Number,
    required:true
  },
  taxes:{
    type:Number,
    required:true
  },
  totalReturnAmount:{
    type:Number,
    default:0
  },
  discount:{
    type:Number,
    default:0
  },
  paymentType:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Payment',
    required:[true, 'Payment type is required']
  },
});

saleSchema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      await addCreditOrDebit(0, this.paidAmount);
      let lastSale = await Sale.findOne({}, {}, { sort: { 'receiptNumber': -1 } });
      this.receiptNumber = lastSale ? lastSale.receiptNumber + 1 : 1;
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Sale = mongoose.model('Sale',saleSchema);
export default Sale;
