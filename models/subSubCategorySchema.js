import mongoose from 'mongoose';

const subSubCategorySchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "SubSubCategory should have a name"],
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: [true, "SubSubCategory should be associated with a SubCategory"],
  },
}, {
  timestamps: true,
});

const SubSubCategory = mongoose.model('SubSubCategory', subSubCategorySchema);
export default SubSubCategory;
