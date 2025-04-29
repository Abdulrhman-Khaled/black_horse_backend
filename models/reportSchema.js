import mongoose from "mongoose";
import {ObjectId} from "mongodb";

const reportSchema = new mongoose.Schema({
	table: {
		type: String,
	},
	foreignKey: {
		type: ObjectId,
	},
	data: {
		type: Object
	}
});

const Report = mongoose.model("Report", reportSchema);
export default Report;
