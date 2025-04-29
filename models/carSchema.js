import mongoose from 'mongoose';
const carSchema = mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Car should have a type'],
  },
  maxWeight: {
    type: Number,
    required: [true, 'Car should have a maxWeight'],
  },
  image: {
    type: String,
    required: [true, 'Car should have an image'],
  },
  number: {
    type: String,
    required: [true, 'Car should have a number'],
    // index: { unique: true, collation: { locale: 'en', strength: 2 } },
  },
});

const Car = mongoose.model('Car', carSchema);
export default Car