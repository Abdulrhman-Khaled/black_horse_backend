import mongoose from 'mongoose';

const categorySet = mongoose.Schema({
  name: {
    type: String,
  },
  image: {
    type: String,
  },
});

const subCategorySet = mongoose.Schema({
  name: {
    type: String,
  },
  image:{
    type: String,
  },
});

const unitSet = mongoose.Schema({
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  name: {
    type: String,
  },
  maxNumber: {
    type: Number,
  }
});

const subUnitSet = mongoose.Schema({
  subUnitId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  name: {
    type: String,
  },
});

const orderProductSet = mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SupplierProduct"
  },
  productAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
  },
  quantity: {
    type: Number,
    min: 0
  },
  productWeight: {
    type: Number,
  },
  title:{
    type: String,
  },
  price:{
    type: Number,
  },
  afterSale:{
    type: Number,
  },
  images:[{
    type:String,
  }],
  minLimit:{
    type: Number,
  },
  maxLimit:{
    type: Number,
  },
  supplierId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  weight:{
    type: Number,
  },
  desc:{
    type: String,
  },
  unit:{
    type: unitSet,
  },
  subUnit:{
    type: subUnitSet,
  },
  maxNumber:{
    type: Number,
  },
  category:{
    type: categorySet,
  },
  subCategory:{
    type: subCategorySet,
  },
  supplierType:{
    type: String,
  },
  stock:{
    type: Number,
  }
});

const orderOfferSet = mongoose.Schema({
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Offer"
  },
  quantity: {
    type: Number,
    min: 0
  },
  offerWeight: {
    type: Number,
  },
  supplierId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  title:{
    type: String,
  },
  image:{
    type: String,
  },
  price:{
    type: Number,
  },
  afterSale:{
    type: Number,
  },
  minLimit:{
    type: Number,
  },
  maxLimit:{
    type: Number,
  },
  stock:{
    type: Number,
  },
  products:{
    type: [orderProductSet]
  },
  desc:{
    type: String,
  }
});

const carSchema = mongoose.Schema({
  type: {
    type: String,
  },
  maxWeight: {
    type: Number,
  },
  image: {
    type: String,
  },
  number: {
    type: String,
  },
});

const reasonSchema = mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ReasonOfCancelOrReturn"
  },
  description: {
    type: String,
  },
  type: {
    type: String,
  },
});

const orderSchema = mongoose.Schema({
  orderNumber: {
    type: Number,
    unique: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Order should be associated with a supplier']
  },
  customerId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Order should be associated with a customer']
  },
  subTotalPrice: {
    type: Number,
    required: [true, 'Order should have a subTotalPrice']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Order should have a totalPrice']
  },
  address:{
    type: String,
    // required: [true, 'Order should have an address']
  },
  district:{ // region
    type: String,
    // required: [true, 'Order should have a district']
  },
  subRegion:{
    type: String,
    // required: [true, 'Order should have a subRegion']
  },
  customerName:{
    type: String,
    // required: [true, 'Order should have a customerName']
  },
  customerPhoneNumber: {
    type: String,
    required: [true, 'Order should have a customerPhoneNumber']
  },
  deliveryFees: {
    type: Number,
  },
  discount: {
    type: Number,
  },
  type:{
    type: String,
    required: [true, 'Order should have a type'],
    enum: ['onDelivery', 'onSite']
  },
  products: {
    type: [orderProductSet],
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  deliveryDaysNumber: {
    type: Number,
    required: [true, 'Order should have a deliveryDaysNumber']
  },
  status: {
    type: String,
    enum: ['pending', 'inProgress', 'delivery', 'delivered', 'supplierCompleted', 'complete', 'cancelled', 'trash', 'returned', 'edited'],
    default: 'pending'
  },
  orderWeight: {
    type: Number,
    // required: [true, 'Order should have a weight']
  },
  offers: [{type:orderOfferSet}],
  longitude:{
    type:Number,
  },
  latitude:{
    type:Number,
  },
  car:{
    type: carSchema
  },
  supplierRating:{
    type: String,
    enum: ['notRating', 'rating', 'ignore'],
    default: 'notRating'
  },
  deliveryBoy:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"DeliveryBoy",
  },
  supplierName:{
    type: String,
  },
  supplierType:{
    type: String,
  },
  deliveryDate:{ // Estimated Time of Arrival
    type: Date,
  },
  deliveryTimeOfArrival:{ // Actual Time of Arrival
    type: Date,
  },
  beforeTrash: {
    type: String,
  },
  beforeEdited: {
    type: String,
    enum: ['pending', 'inProgress'],
  },
  beforeEditedProducts: [{
    product: mongoose.Schema.Types.ObjectId,
    quantity: Number
  }],
  beforeEditedOffers: [{
    offer: mongoose.Schema.Types.ObjectId,
    quantity: Number
  }],
  reason: {
    type: reasonSchema
  },
  otherReason: {
    type: String
  },
  group:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Group",
  },
  promoCode: {
    type: String,
  },
  discountCoupon:{
    type: Number,
    default: 0,
  },
  control: {
    type: String,
    enum: ['admin', 'supplier', 'customer', 'listener'],
    default: 'supplier'
  }
}, {
  timestamps: true,
});

orderSchema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      let lastOrder = await Order.findOne({}, {}, { sort: { 'orderNumber': -1 } });
      this.orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// orderSchema.pre("save", async function(next) {
//   try {
//     const totalWeight = this.products.reduce((acc, curr) => acc + curr.productWeight, 0);
//     this.orderWeight = totalWeight;
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// orderSchema.pre('save', async function(next) {
//   try {
//     const totalWeight = this.products.reduce((acc, curr) => acc + curr.productWeight, 0);
//     const availableCars = await Car.find({ maxWeight: { $gte: totalWeight } }).sort({ maxWeight: 1 });
//     if (availableCars.length === 0) {
//       throw new Error('No available cars for this weight');
//     }
//     const selectedCar = availableCars[0];
//     this.car = selectedCar._id;
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// const checkMaxWeight = async function (next) {
//   try {
//     const totalWeight = this.products.reduce((acc, curr) => acc + curr.productWeight, 0);
//     const supplier = await Supplier.findById(this.supplierId);
//     if (totalWeight > supplier.maxOrderWeight) {
//       throw new Error('Max Weight Exceeded');
//     }
//     next();
//   } catch (error) {
//     next(error);
//   }
// };

// const checkMinPrice = async function (next) {
//   try {
//     const totalPrice = this.products.reduce((acc, curr) => acc + curr.totalPrice, 0);
//     const supplier = await Supplier.findById(this.supplierId);
//     if (totalPrice < supplier.minOrderPrice) {
//       throw new Error('Min Price Exceeded');
//     }
//     next();
//   } catch (error) {
//     next(error);
//   }
// };

// orderSchema.pre('save', checkMaxWeight);
// orderSchema.pre('save', checkMinPrice);

const Order = mongoose.model('Order', orderSchema);
export default Order;
