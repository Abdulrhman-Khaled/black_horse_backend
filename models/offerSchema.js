import mongoose from 'mongoose';
import SupplierProduct from './supplierProductSchema.js';

const offerProduct = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupplierProduct',
  },
  quantity: {
    type: Number,
  },
  
})
const offerSchema = new mongoose.Schema({
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  products: [
    {
      type: offerProduct
    }
  ],
  title: {
    type: String,
    required: [true, 'Offer should have a description'],
  },
  price: {
    type: Number,
    required: [true, 'Offer should have a Price'],
  },
  afterSale: {
    type: Number,
  },
  afterSaleExpireDate:{
    type:Date,
  },
  minLimit: {
    type: Number,
  },
  maxLimit: {
    type: Number,
  },
  weight: {
    type: Number,
    // required: [true, 'Offer should have a weight'],
  },
  stock: {
    type: Number,
    required: [true, 'Offer should have a stock'],
  },
  image: {
    type: String,
    // required: [true, 'Offer should have a image'],
  },
  desc:{
    type: String,
    required: [true, 'Offer should have a description'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
},
{
  timestamps: true,
});

offerSchema.pre('save', async function (next) {
  try {
    let offerWeight = 0;
    const SupplierProduct = mongoose.model('SupplierProduct');
    for(const productOffer of this.products){
      const supplierProduct = await SupplierProduct.findById(productOffer.productId);
      if (!supplierProduct) throw new Error('Product not found for supplier');
      offerWeight += supplierProduct.productWeight * productOffer.quantity;
    }
    this.weight = offerWeight;
    next();
  } catch (error) {
    next(error);
  }
});

const Offer = mongoose.model('Offer', offerSchema);
export default Offer;
