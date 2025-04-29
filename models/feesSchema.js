import mongoose from "mongoose";

const feeSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    required: true,
    unique: true,
    enum: [
      "fee",
      "fineForTrash",
      "fineForCancel",
      "fineForInProgress",
      "fineForOnDelivery",
      "fineForPending",
      "fineForCompleteGroup",
      "numberOfPendingDays",
      "numberOfOnDeliveryDays",
      "numberOfInProgressDays",
      "numberOfCompleteGroupDays",
      "groupExpireDays"
    ],
  },
});

const Fee = mongoose.model("Fee", feeSchema);
export default Fee;
