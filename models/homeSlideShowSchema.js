import mongoose from 'mongoose';

const homeSlideShowSchema = mongoose.Schema({
  image:{
    type:String,
    required:[true, "Slide should have a image"],
  },
  createdAt:{
    type:Date,
    default: Date.now,
  }
},{
  timestamps:true,
})
const HomeSlideShow = mongoose.model('HomeSlideShow',homeSlideShowSchema);
export default HomeSlideShow