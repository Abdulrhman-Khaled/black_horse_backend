import express from 'express';
import { adminLogin, customerLogin, deliveryBoyLogin, supplierLogin } from '../auth/login.js';
import { createCustomer } from '../auth/signup.js';
import { customerProfile } from '../auth/userProfile.js';
import { sendResetCodeCustomer, resetPasswordCustomer, resetPasswordSupplier, sendResetCodeSupplier } from '../auth/sendResetCode.js';
import { validateEmail, validatePhoneNumber } from '../middlewares/phoneNumberMiddleware.js';
import { changePhoneNumber, enterVerifyCode, resendVerifyCode, verifyNewPhoneNumber } from '../auth/verfiyAndChangePhone.js';
import { validateCreateCustomer } from '../middlewares/validationMiddlewaresRequest.js';

const Router = express.Router();

Router.post('/supplier', validatePhoneNumber, supplierLogin);
Router.post('/customer', validatePhoneNumber, customerLogin);
Router.post('/deliveryBoy', validateEmail, deliveryBoyLogin);
Router.post('/admin', validateEmail, adminLogin);

Router.post('/customer/resendVerifyCode', validatePhoneNumber, resendVerifyCode);
Router.post('/customer/enterVerifyCode', validatePhoneNumber, enterVerifyCode);

Router.post('/customer/change-phone', validatePhoneNumber, changePhoneNumber);
Router.post('/customer/verify-new-phone', validatePhoneNumber, verifyNewPhoneNumber);

Router.post('/signup/customer', validatePhoneNumber, validateCreateCustomer, createCustomer);
Router.get('/userProfile/customer', customerProfile);
Router.post('/sendResetCode/customer', validatePhoneNumber, sendResetCodeCustomer);
Router.post('/resetPassword/customer', validatePhoneNumber, resetPasswordCustomer);
Router.post('/sendResetCode/supplier', validatePhoneNumber, sendResetCodeSupplier);
Router.post('/resetPassword/supplier', validatePhoneNumber, resetPasswordSupplier);

export default Router;
