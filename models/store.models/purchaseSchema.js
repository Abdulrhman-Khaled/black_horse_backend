import mongoose from 'mongoose'
import { addCreditOrDebit } from '../../controllers/store.controllers/customerSupplierController.js';

const purchaseSchema = mongoose.Schema({
  admin:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required:true
  },
  supplierInventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupplierInventory',
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
  paymentType:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Payment',
    required:[true, 'Payment type is required']
  }
});

purchaseSchema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      await addCreditOrDebit(this.paidAmount, 0);
      let lastPurchase = await Purchase.findOne({}, {}, { sort: { 'receiptNumber': -1 } });
      this.receiptNumber = lastPurchase ? lastPurchase.receiptNumber + 1 : 1;
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Purchase = mongoose.model('Purchase', purchaseSchema);
export default Purchase