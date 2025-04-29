import mongoose from 'mongoose';

const inventorySchema = mongoose.Schema({
  name:{
    type:String,
    required:[true,'Name is Required for Inventory'],
    unique:true
  },
  address: {
    type:String,
  },
  phoneNumber: {
    type:String,
  }
})

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory