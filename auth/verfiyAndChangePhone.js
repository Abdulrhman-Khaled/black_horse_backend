import Customer from '../models/customerSchema.js';
import { return5RandomNumber, sendSMS } from '../utils/pushNotificationAndSendSMS.js';

/************************************ VerifyPhone Customer ************************************/
export const resendVerifyCode = async (req, res) => {
    const customerPhoneNumber = req.body.phoneNumber;
  try {
    const oldCustomer = await Customer.findOne({ phoneNumber: customerPhoneNumber });
    if (!oldCustomer) {
      return res.status(219).json({
        status: 'fail',
        message: req.headers['language'] === 'en' ? 'phoneNumber not found' : 'رقم الهاتف غير موجود',
      });
    }
    if (oldCustomer.isVerify === true) {
      return res.status(219).json({
        status: 'fail',
        message: req.headers['language'] === 'en' ? 'phoneNumber already verified' : 'رقم الهاتف تم التحقق منه بالفعل',
      });
    }

    const customerVerifyCode = return5RandomNumber();
    oldCustomer.verifyCode = customerVerifyCode;
    await oldCustomer.save();

    sendSMS(customerPhoneNumber, customerVerifyCode, 'verify');
    res.status(200).json({
      status: 'success',
      message: 'verify code sent successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

export const enterVerifyCode = async (req, res) => {
  try{
    const oldCustomer = await Customer.findOne({ phoneNumber: req.body.phoneNumber });
    if (!oldCustomer) {
      return res.status(219).json({
        status: 'fail',
        message: req.headers['language'] === 'en' ? 'phoneNumber not found' : 'رقم الهاتف غير موجود',
      });
    }
    // if (oldCustomer.isDeleted === true) {
    //     return res.status(219).json({
    //         status: 'fail',
    //         message: req.headers['language'] === 'en' ? 'phoneNumber already deleted' : 'تم حذف رقم الهاتف',
    //     });
    // }

    // if (oldCustomer.isVerify === true) {
    //     return res.status(219).json({
    //       status: 'fail',
    //       message: 'phoneNumber already verified',
    //     });
    // }
    if (oldCustomer.verifyCode !== req.body.verifyCode) {
        return res.status(219).json({
          status: 'fail',
          message: 'The code is incorrect'
        });
    }

    oldCustomer.isVerify = true;
    oldCustomer.verifyCode = null;
    await oldCustomer.save();
    res.status(200).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    res.status(500).json({
        status: 'fail',
        message: error.message,
    });
  }
};

/************************************ ChangePhone Customer ************************************/
export const changePhoneNumber = async (req, res) => {
  try{
    const { phoneNumber, newPhone } = req.body;

    let customer = await Customer.findOne({ phoneNumber: phoneNumber });
    if (!customer) {
      return res.status(207).json({
        status: 'fail',
        message: 'Current phone number not found.'
      });
    }
    if(customer.isVerify === false){
      return res.status(208).json({
        status: 'fail',
        message: 'Current phone number not verified.'
      });
    }

    let existingCustomer = await Customer.findOne({ phoneNumber: newPhone, isVerify: true });
    if (existingCustomer) {
      return res.status(209).json({
        status: 'fail',
        message: 'New phone number already in use.'
      });
    }

    const changeCode = return5RandomNumber();
    customer.newPhone = newPhone;
    customer.changeCode = changeCode;
    await customer.save();
    sendSMS(newPhone, changeCode, 'changePhone');

    res.status(200).json({
      status: 'success',
      data: 'change code sent to new phone number.'
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

export const verifyNewPhoneNumber = async (req, res) => {
  try{
    const { phoneNumber, newPhone, changeCode } = req.body;

    let customer = await Customer.findOne({
      phoneNumber: phoneNumber,
      newPhone: newPhone,
      changeCode: changeCode,
      isVerify: true
    });
    if (!customer) {
      return res.status(207).json({
        status: 'fail',
        message: 'Invalid verification code.'
      });
    }

    await Customer.deleteMany({ phoneNumber: newPhone, isVerify: false });
    customer.phoneNumber = newPhone;
    customer.newPhone = null;
    customer.changeCode = null;
    await customer.save();

    res.status(200).json({
      status: 'success',
      data: 'Phone number updated successfully.'
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
