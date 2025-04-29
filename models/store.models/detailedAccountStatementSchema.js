import mongoose from 'mongoose';
import { addCreditOrDebit } from '../../controllers/store.controllers/customerSupplierController.js';

const detailedAccountStatementSchema = mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: [true, "Admin is required"],
  },
  purchaseId:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'Purchase'
  },
  saleId:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'Sale'
  },
  supplierInventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupplierInventory',
  },
  customerInventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerInventory',
  },
  debit:{
    type:Number,
    required:true
  },
  credit:{
    type:Number,
    required:true
  },
  balance:{
    type:Number,
    required:true
  },
  date:{
    type:Date,
    default: Date.now
  },
  status:{
    type:String,
    enum: ['purchase', 'sale', 'depositeToSupplier', 'depositeFromCustomer', 'supplierStartingBalance', 'customerStartingBalance', 'returnSale', 'returnPurchase', 'returnCashSale', 'returnCashPurchase'],
    required:true
  },
  operationType:{
    type:String,
    enum:['customerSupplierDeposite'],
    default:'customerSupplierDeposite',
  },
  returnProductIDs: {
    type:[mongoose.Schema.Types.ObjectId]
  },
});

detailedAccountStatementSchema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      if(this.supplierInventoryId && this.status === 'supplierStartingBalance'){
        await addCreditOrDebit(this.credit, 0);
      }else if(this.supplierInventoryId && this.status === 'depositeToSupplier'){
        await addCreditOrDebit(this.debit, 0);
      }else if(this.customerInventoryId && this.status === 'customerStartingBalance'){
        await addCreditOrDebit(0, this.debit);
      }else if(this.customerInventoryId && this.status === 'depositeFromCustomer'){
        await addCreditOrDebit(0, this.credit);
      }else if(this.supplierInventoryId && this.status === 'returnCashPurchase'){
        await addCreditOrDebit(0, this.debit);
      }else if(this.customerInventoryId && this.status === 'returnCashSale'){
        await addCreditOrDebit(this.credit, 0);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

const DetailedAccountStatement = mongoose.model('DetailedAccountStatement', detailedAccountStatementSchema);
export default DetailedAccountStatement;
