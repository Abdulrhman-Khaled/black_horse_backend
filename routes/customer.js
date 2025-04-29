import express from 'express';
import multer from 'multer';
import {
  updateCustomer,
  uploadPhoto,
  getCustomerById,
  getAllCustomer,
  deleteCustomer,
} from '../controllers/customerController.js';
import {
  getAllProductAssignedToSupplier,
  getBestProduct,
  getProductByCategory,
} from '../controllers/productsController.js';
import { getAllHomeSlideShow } from '../controllers/adminController.js';
import {
  confirmChangeOrderByCustomer,
  createOrder,
  getAllOrderByCustomerId,
  getBestSeller,
  getOrdersAndGroupByDeliveryId,
  updateOrder,
} from '../controllers/orderController.js';
import { applyPromoCode } from '../controllers/promoCodeController.js';
import { createRating } from '../controllers/ratingController.js';
import { authenticate } from '../middlewares/authorizationMiddleware.js';
import { getAllSupplier, getAllSupplierForCustomer } from '../controllers/supplierController.js';
import { createGroup, getAllGroupPending, joinGroup, } from '../controllers/groupController.js';
import { storage } from '../controllers/sharedFunction.js';
import { getOfferByOrderId } from '../controllers/offerController.js';
import { deleteNotification, getNotificationsByCustomerId, getNotificationsByDeliveryId, getNotificationsBySupplierId, } from '../controllers/notificationController.js';
import { getAllCategory } from '../controllers/categoryController.js';
import { getAllChat, getMessagesByChatId, getMessagesByUserId, uploadMessageFile, } from '../controllers/chatController.js';
import { validateCreateGroup, validateCreateOrder, validateUpdateCustomer } from '../middlewares/validationMiddlewaresRequest.js';

const uploadCustomer = multer({ storage: storage('customer') });
const uploadMessage = multer({ storage: storage('message') });

const Router = express.Router();

Router.get('/category', getAllCategory);
Router.get('/product/category/:id/customer/:customerId', getProductByCategory);
Router.get('/product/customer/:customerId', getAllProductAssignedToSupplier);
Router.get('/product/bestSeller/customer/:customerId', getBestProduct); // used by customer
Router.patch('/:id', validateUpdateCustomer, updateCustomer);
Router.delete('/:id', deleteCustomer);
Router.get('/', getAllCustomer);
Router.get('/customerData/:id', getCustomerById);
Router.patch('/uploadPhoto/:id', uploadCustomer.single('image'), uploadPhoto);

Router.post('/order', validateCreateOrder, createOrder);
Router.patch('/order/:id', updateOrder);
Router.get('/order/bestSeller', getBestSeller); // used by admin
Router.get('/order/:id', getAllOrderByCustomerId);
Router.get('/order/group/:deliveryId', getOrdersAndGroupByDeliveryId);
Router.get('/offer/order/:id', getOfferByOrderId);
Router.patch('/confirmChangeOrder/:id', confirmChangeOrderByCustomer);

Router.get('/homeSlideShow', getAllHomeSlideShow);
Router.post('/promoCode', applyPromoCode);
Router.post('/createRating', createRating); // used by customer&supplier

Router.get('/group', getAllGroupPending);
Router.post('/group', validateCreateGroup, createGroup);
Router.patch('/group/:id', joinGroup);

Router.get('/getNotificationsByCustomerId/:id', getNotificationsByCustomerId);
Router.get('/getNotificationsBySupplierId/:id', getNotificationsBySupplierId);
Router.get('/getNotificationsByDeliveryId/:id', getNotificationsByDeliveryId);
Router.delete('/deleteNotification/:id', deleteNotification);

Router.get('/chats', getAllChat);
Router.get('/messages/:userId', getMessagesByUserId);
Router.get('/chat/messages/:chatId', getMessagesByChatId);
Router.post('/chat/message/uploadFile', uploadMessage.single('file'), uploadMessageFile);

Router.get('/supplier/:id', getAllSupplierForCustomer);

export default Router;
