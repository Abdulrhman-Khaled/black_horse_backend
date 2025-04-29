import  mongoose  from "mongoose";

const subUnitSchema = mongoose.Schema({
  name:{
    type:String,
    required:[true, "Unit should have a name"],
    unique:true
  },
})

const SubUnit = mongoose.model('SubUnit', subUnitSchema);
export default SubUnit