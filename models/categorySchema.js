import mongoose from 'mongoose';

const categorySchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Category should have a name"],
  },
  image: {
    type: String,
    required: [true, "Category should have an image"],
  }
}, {
  timestamps: true,
});

const Category = mongoose.model('Category', categorySchema);
export default Category;
