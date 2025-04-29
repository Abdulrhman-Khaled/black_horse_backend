import mongoose from 'mongoose';

const subCategorySchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Subcategory should have a name"],
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  image:{
    type: String,
    //required: [true, "Subcategory should have an image"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

const SubCategory = mongoose.model('SubCategory', subCategorySchema);
export default SubCategory;
