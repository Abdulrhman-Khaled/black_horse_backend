import mongoose from 'mongoose';

const advertisementSchema = new mongoose.Schema({
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  product:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "SupplierProduct",
  },
  subRegion:[{
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubRegion",
  }]
},{
  timestamps: true
});

const Advertisement = mongoose.model('Advertisement', advertisementSchema);
export default Advertisement