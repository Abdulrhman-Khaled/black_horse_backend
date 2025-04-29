import Fee from "../models/feesSchema.js";

export const createExpireDayGroup = async (req, res) => {
  try {
    const expireDayGroup = req.body;
    await Fee.deleteMany({ type: "groupExpireDays" });
    const newFine = new Fee({
      amount: expireDayGroup.date,
      type: "groupExpireDays"
    });
    await newFine.save();
    res.status(201).json({
      status: "success",
      data: { date: newFine.amount }
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    });
  }
}
export const getExpireDayGroup = async (req, res) => {
  try {
    const expireDayGroup = await Fee.find({ type: "groupExpireDays" });
    res.status(200).json({
      status: "success",
      data: { date: expireDayGroup[0].amount }
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    });
  }
}
export const getFee = async (req, res) => {
  try {
    const fee = await Fee.find({ type: "fee" });
    res.status(200).json({
      status: "success",
      data:  { amount: fee[0].amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}
export const createFee = async (req, res) => {
  try {
    const amount = req.body.amount;
    if(amount > 100){
      return res.status(207).json({
        status: "fail",
        message: "Amount should be less than 100%"
      })
    }
    await Fee.deleteMany({ type: "fee" });
    const newFee = new Fee({
      amount: req.body.amount,
      type: "fee"
    });
    await newFee.save();
    res.status(201).json({
      status: "success",
      data: { amount: newFee.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}
export const createNumberOfPendingDays = async (req, res) => {
  try {
    const fine = req.body;
    await Fee.deleteMany({ type: "numberOfPendingDays" });
    const newFine = new Fee({
      amount: fine.amount,
      type: "numberOfPendingDays"
    });
    await newFine.save();
    res.status(201).json({
      status: "success",
      data: {amount: newFine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const getNumberOfPendingDays = async (req, res) => {
  try {
    const fine = await Fee.find({ type: "numberOfPendingDays" });
    res.status(200).json({
      status: "success",
      data:  { amount: fine[0].amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const createNumberOfOnDeliveryDays = async (req, res) => {
  try {
    const fine = req.body;
    await Fee.deleteMany({ type: "numberOfOnDeliveryDays" });
    const newFine = new Fee({
      amount: fine.amount,
      type: "numberOfOnDeliveryDays"
    });
    await newFine.save();
    res.status(201).json({
      status: "success",
      data: {amount: newFine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const getNumberOfOnDeliveryDays = async (req, res) => {
  try {
    const fine = await Fee.find({ type: "numberOfOnDeliveryDays" });
    res.status(200).json({
      status: "success",
      data:  { amount: fine[0].amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const createNumberOfInProgressDays = async (req, res) => {
  try {
    const fine = req.body;
    await Fee.deleteMany({ type: "numberOfInProgressDays" });
    const newFine = new Fee({
      amount: fine.amount,
      type: "numberOfInProgressDays"
    });
    await newFine.save();
    res.status(201).json({
      status: "success",
      data: {amount: newFine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const createNumberOfCompleteGroupDays = async (req, res) => {
  try {
    const fine = req.body;
    await Fee.deleteMany({ type: "numberOfCompleteGroupDays" });
    const newFine = new Fee({
      amount: fine.amount,
      type: "numberOfCompleteGroupDays"
    });
    await newFine.save();
    res.status(201).json({
      status: "success",
      data: {amount: newFine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const getNumberOfCompleteGroupDays = async (req, res) => {
  try {
    const fine = await Fee.findOne({ type: "numberOfCompleteGroupDays" });
    res.status(200).json({
      status: "success",
      data:  { amount: fine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const getNumberOfInProgressDays = async (req, res) => {
  try {
    const fine = await Fee.find({ type: "numberOfInProgressDays" });
    res.status(200).json({
      status: "success",
      data:  { amount: fine[0].amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const createFineForCancel = async (req, res) => {
  try {
    const fine = req.body;
    await Fee.deleteMany({ type: "fineForCancel"});
    const newFine = new Fee({
      amount: fine.amount,
      type: "fineForCancel"
    });
    await newFine.save();
    res.status(201).json({
      status: "success",
      data: {amount: newFine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const getFineForCancel = async (req, res) => {
  try {
    const fine = await Fee.find({ type: "fineForCancel" });
    res.status(200).json({
      status: "success",
      data:  { amount: fine[0]?.amount ?? 0 }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const deleteFineForCancel = async (req, res) => {
  try {
    await Fee.deleteMany({ type: "fineForCancel" });
    res.status(204).json({
      status: "success",
      data: null
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const createFineForTrash = async (req, res) => {
  try {
    const fine = req.body;
    await Fee.deleteMany({ type: "fineForTrash" });
    const newFine = new Fee({
      amount: fine.amount,
      type: "fineForTrash"
    });
    await newFine.save();
    res.status(201).json({
      status: "success",
      data:  { amount: newFine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const getFineForTrash = async (req, res) => {
  try {
    const fine = await Fee.find({ type: "fineForTrash" });
    res.status(200).json({
      status: "success",
      data:  { amount: fine[0].amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
};
export const deleteFineForTrash = async (req, res) => {
  try {
    await Fee.deleteMany({ type: "fineForTrash" });
    res.status(204).json({
      status: "success",
      data: null
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const createFineForPending = async (req, res) => {
  try {
    const fine = req.body;
    await Fee.deleteMany({ type: "fineForPending" });
    const newFine = new Fee({
      amount: fine.amount,
      type: "fineForPending"
    });
    await newFine.save();
    res.status(201).json({
      status: "success",
      data:  { amount: newFine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const getFineForPending = async (req, res) => {
  try {
    const fine = await Fee.findOne({ type: "fineForPending" });
    res.status(200).json({
      status: "success",
      data:  { amount: fine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const deleteFineForPending = async (req, res) => {
  try {
    await Fee.deleteMany({ type: "fineForPending" });
    res.status(204).json({
      status: "success",
      data: null
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const createFineForOnDelivery = async (req, res) => {
  try {
    const fine = req.body;
    await Fee.deleteMany({ type: "fineForOnDelivery" });
    const newFine = new Fee({
      amount: fine.amount,
      type: "fineForOnDelivery"
    });
    await newFine.save();
    res.status(201).json({
      status: "success",
      data:  { amount: newFine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const getFineForOnDelivery = async (req, res) => {
  try {
    const fine = await Fee.findOne({ type: "fineForOnDelivery" });
    res.status(200).json({
      status: "success",
      data:  { amount: fine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const deleteFineForOnDelivery = async (req, res) => {
  try {
    await Fee.deleteMany({ type: "fineForOnDelivery" });
    res.status(204).json({
      status: "success",
      data: null
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const createInProgressFine = async (req, res) => {
  try {
    const fine = req.body;
    await Fee.deleteMany({ type: "fineForInProgress" });
    const newFine = new Fee({
      amount: fine.amount,
      type: "fineForInProgress"
    });
    await newFine.save();
    res.status(201).json({
      status: "success",
      data:  { amount: newFine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const getInProgressFine = async (req, res) => {
  try {
    const fine = await Fee.findOne({ type: "fineForInProgress" });
    res.status(200).json({
      status: "success",
      data: { amount: fine?.amount ?? 0 }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const deleteInProgressFine = async (req, res) => {
  try {
    await Fee.deleteMany({ type: "onProgressFine" });
    res.status(204).json({
      status: "success",
      data: null
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const createFineForCompleteGroup = async (req, res) => {
  try {
    const fine = req.body;
    await Fee.deleteMany({ type: "fineForCompleteGroup" });
    const newFine = new Fee({
      amount: fine.amount,
      type: "fineForCompleteGroup"
    });
    await newFine.save();
    res.status(201).json({
      status: "success",
      data:  { amount: newFine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const getFineForCompleteGroup = async (req, res) => {
  try {
    const fine = await Fee.findOne({ type: "fineForCompleteGroup" });
    res.status(200).json({
      status: "success",
      data:  { amount: fine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
} 