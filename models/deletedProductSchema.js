import mongoose from 'mongoose';

const deletedProductSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  deletedAt: {
    type: Date,
    default: Date.now,
  }
},{
  timestamps: true
});

const DeletedProduct = mongoose.model('DeletedProduct', deletedProductSchema);
export default DeletedProduct