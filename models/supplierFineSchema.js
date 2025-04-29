import mongoose from 'mongoose'

const supplierFineSchema = mongoose.Schema({
  supplierId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Supplier",
    required:[true, "Supplier is required"],
  },
  fine:{
    type:Number,
    default:0
  },
  order:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Order"
  },
  group:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Group"
  },
  reasonOfCancel:{
    type:String,
  },
  typeOfFine:{
    type:String,
    // enum:["fineForCancel, elastic, fineForTrash, deliveryDaysOut, pendingDaysOut"]
  },
  createdAt:{
    type:Date,
    default:Date.now
  }
},{
  timestamps:true
})

const SupplierFine = mongoose.model('SupplierFine', supplierFineSchema)
export default SupplierFine
