import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import authRoute from './routes/auth.js';
import supplierRoute from './routes/supplier.js';
import customerRoute from './routes/customer.js';
import productRoute from './routes/product.js';
import adminRoute from './routes/admin.js';
import { getOrderByDelivery } from './controllers/orderController.js';
import Order from './models/orderSchema.js';
import { pushNotification } from './utils/pushNotificationAndSendSMS.js';
import { checkExpireGroup, checkExpireProducts } from './utils/checkExpireGroupsAndProducts.js';
import { CronJob } from 'cron';
import DeliveryBoy from './models/deliveryBoySchema.js';
import Supplier from './models/supplierSchema.js';
import Customer from './models/customerSchema.js';
import Group from './models/groupSchema.js';
import { getGroupByDelivery } from './controllers/groupController.js';
import { updateOrderForGroup } from './utils/updateOrderForGroup.js';
import Notification from './models/notificationSchema.js';
import { checkCompleteGroup, /*checkEditedOrders,*/ checkInProgressGroup, checkInProgressOrder, checkOnDeliveryGroup, checkOnDeliveryOrder, checkPendingOrder } from './utils/checkPendingInProgressOrder.js';
import Message from './models/messageSchema.js';
import Chat from './models/chatSchema.js';
import { transformationChat, transformationMessage } from './format/transformationObject.js';
import { authenticate, userType } from './middlewares/authorizationMiddleware.js';
import { checkOffersAfterSaleExpireDate, checkProductsAfterSaleExpireDate } from './utils/cronJobs.js';

dotenv.config();
const port = process.env.PORT || 4000;
const app = express();
const server = http.createServer(app);
const IO = new Server(server, { cors: { origin: '*' } });
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const corsOption = { origin: true };

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL_DEV);
    console.log('Mongoose connection successfully established');
  } catch (error) {
    console.error('Mongoose connection error:' + error);
  }
};

const cronJob1 = new CronJob('0 0 * * *', checkExpireGroup);
const cronJob2 = new CronJob('0 0 * * *', checkPendingOrder);
const cronJob3 = new CronJob('0 0 * * *', checkInProgressOrder);
const cronJob4 = new CronJob('0 0 * * *', checkOnDeliveryOrder);
const cronJob5 = new CronJob('0 0 * * *', checkCompleteGroup);
const cronJob6 = new CronJob('0 0 * * *', checkInProgressGroup);
const cronJob7 = new CronJob('0 0 * * *', checkOnDeliveryGroup);
// const cronJob8 = new CronJob('0 0 * * *', checkEditedOrders);
const cronJob9 = new CronJob('0 0 * * *', checkExpireProducts);
// cron job for supplier product to check the products after expire date
const cronJob10 = new CronJob('0 0 * * *', checkProductsAfterSaleExpireDate);
const cronJob11 = new CronJob('0 0 * * *', checkOffersAfterSaleExpireDate);
cronJob1.start();
cronJob2.start();
cronJob3.start();
cronJob4.start();
cronJob5.start();
cronJob6.start();
cronJob7.start();
// cronJob8.start();
cronJob9.start();
cronJob10.start();

app.use(express.json());
app.use(cors(corsOption));
app.use(express.static(path.join(__dirname, 'upload')));
app.get('/', async (req, res) => {
  res.send('<center><h1>Welcome to BlackHorse Company</h1></center>');
});

app.use(userType);
app.use('/api/v1/auth', authRoute);

// app.use(authenticate);
app.use('/api/v1/supplier', supplierRoute);
app.use('/api/v1/customer', customerRoute);
app.use('/api/v1/product', productRoute);
app.use('/api/v1/admin', adminRoute);

const userSocketIdMap = [], adminSocket = [];
IO.use((socket, next) => {
  if (socket.handshake.query) {
    let socketId = socket.handshake.query.socketId; // socketId
    socket.socketUser = socketId;
    userSocketIdMap[socket.socketUser] = socket.id;
    Object.entries(userSocketIdMap).forEach(([key, value]) => {
      if (key.startsWith('admin')) {
        adminSocket[key] = value;
      }
    });
    next();
  }
});

IO.on('connection', (socket) => {
  console.log(userSocketIdMap);
  console.log('admin:', adminSocket);
  socket.join(socket.socketUser);

  socket.on('disconnect', () => {
    delete userSocketIdMap[socket.socketUser];
    delete adminSocket[socket.socketUser];
    console.log('deleted:', userSocketIdMap);
    console.log('deleted admin:', adminSocket);
  });

  socket.on('order', async (data) => {
    let orderId = data.orderId, status = data.status, deliveryId = data.deliveryId, userType = data.userType;
    if(deliveryId && orderId && status){
      const delivery = await DeliveryBoy.findById(deliveryId);
      const order = await Order.findById(orderId);
      order.status = status;
      order.deliveryBoy = deliveryId;
      await order.save();
      if(order.status === 'delivery'){
        const customer = await Customer.findById(order.customerId);
        await pushNotification('لديك طلب جديد', `لديك اوردر جديد بوزن ${order.orderWeight/1000} كيلو ينتظر موافقتك`, null, null, null, deliveryId, delivery.deviceToken);
        await pushNotification('تم الموافقة ع الطلب', `تم اسناد الاوردر الخاص بك برقم ${order.orderNumber} الي عامل التوصيل`, null, order.customerId, null, null, customer.deviceToken);
      }
      IO.to(userSocketIdMap[deliveryId]).emit('order', await getOrderByDelivery(deliveryId));
    }
    else if(orderId && status){
      const order = await Order.findById(orderId);
      order.status = status;
      await order.save();

      if(order.status === 'delivered'){
        order.deliveryTimeOfArrival = new Date();
        await order.save();
        const customer = await Customer.findById(order.customerId);
        await pushNotification('تم شحن الاوردر!', `قام عامل التوصيل بشحن الاوردر الخاص بك رقم ${order.orderNumber}`, null, order.customerId, null, null, customer.deviceToken);
        if(userType !== 'supplier') {
          await DeliveryBoy.findByIdAndUpdate(order.deliveryBoy, { $inc: { wallet: order.totalPrice } });
          const supplier = await Supplier.findById(order.supplierId);
          await pushNotification('تم شحن الاوردر!', `قام عامل التوصيل بشحن الاوردر رقم ${order.orderNumber}`, null, null, order.supplierId, null, supplier.deviceToken);
        }
      }
    }
    else if(deliveryId){
      IO.to(userSocketIdMap[deliveryId]).emit('order', await getOrderByDelivery(deliveryId));
    }
  });

  socket.on('group', async (data) => {
    let groupId = data.groupId, status = data.status, deliveryId = data.deliveryId;
    if(deliveryId && groupId && status){
      const delivery = await DeliveryBoy.findById(deliveryId);
      const group = await Group.findById(groupId);
      group.status = status;
      group.deliveryBoy = deliveryId;
      await group.save();
      if(group.status === 'delivery'){
        await pushNotification('لديك طلب جديد', `لديك اوردرات جروب جديد بوزن ${group.totalWeight/1000} كيلو ينتظر موافقتك`, null, null, null, deliveryId, delivery.deviceToken);
      }
      const orders = await Order.find({ group: groupId, control: 'supplier' });
      for(const order of orders){
        await updateOrderForGroup(order._id, status);
      }
      IO.to(userSocketIdMap[deliveryId]).emit('group', await getGroupByDelivery(deliveryId));
    }
    else if(groupId && status){
      const group = await Group.findById(groupId);
      group.status = status;
      await group.save();
      const orders = await Order.find({ group: groupId, control: 'supplier' });
      for(const order of orders){
        await updateOrderForGroup(order._id, status);
        if(group.status === 'delivered'){
          await DeliveryBoy.findByIdAndUpdate(group.deliveryBoy, { $inc: { wallet: order.totalPrice } });
        }
      }
      if (group.status === 'delivered'){
        group.deliveryTimeOfArrival = new Date();
        await group.save();
        const supplier = await Supplier.findById(group.supplierId);
        await pushNotification('تم شحن اوردرات جروب', `قام عامل التوصيل بشحن الاوردرات الموجودة داخل جروب رقم ${group.groupNumber}`, null, null, group.supplierId, null, supplier.deviceToken);
      }
    }
    else if(deliveryId){
      IO.to(userSocketIdMap[deliveryId]).emit('group', await getGroupByDelivery(deliveryId));
    }
  });

  socket.on('message', async (data) => {
    // data = {
    //   customer: '66321516fc405fceba045cb8',
    //   supplier: null,
    //   deliveryBoy: null,
    //   body: 'رسالة من عمك',
    //   type: 'text',
    //   sender: 'admin',
    // }
    let userId, userType, newMessage;
    if (data.customer) {
      userId = data.customer;
      userType = 'customer';
    } else if (data.supplier) {
      userId = data.supplier;
      userType = 'supplier';
    } else if (data.deliveryBoy) {
      userId = data.deliveryBoy;
      userType = 'deliveryBoy';
    }

    const chat = await Chat.findOne({ [userType]: userId });
    if (chat) {
      newMessage = new Message({
        chat: chat._id,
        customer: data.customer ?? null,
        supplier: data.supplier ?? null,
        deliveryBoy: data.deliveryBoy ?? null,
        body: data.body,
        type: data.type,
        sender: data.sender,
      });
      chat.lastMessage = Date.now();
      await chat.save();
    } else {
      const newChat = new Chat({ [userType]: userId });
      await newChat.save();
      newMessage = new Message({
        chat: newChat._id,
        customer: data.customer ?? null,
        supplier: data.supplier ?? null,
        deliveryBoy: data.deliveryBoy ?? null,
        body: data.body,
        type: data.type,
        sender: data.sender,
      });
    }
    await newMessage.save();
    if(data.sender === 'admin'){
      if(data.customer && !userSocketIdMap.hasOwnProperty(data.customer)){
        const customerData = await Customer.findById(data.customer);
        await Notification.deleteMany({customerId: data.customer, title: 'رسالة من الدعم'});
        await pushNotification('رسالة من الدعم', data.type=='text' ? data.body : 'تم ارسال رسالة من قبل الدعم', null, data.customer, null, null, customerData.deviceToken);
      } else if(data.supplier && !userSocketIdMap.hasOwnProperty(data.supplier)){
        const supplierData = await Supplier.findById(data.supplier);
        await Notification.deleteMany({supplierId: data.supplier, title: 'رسالة من الدعم'});
        await pushNotification('رسالة من الدعم', data.type=='text' ? data.body : 'تم ارسال رسالة من قبل الدعم', null, null, data.supplier, null, supplierData.deviceToken);
      } else if(data.deliveryBoy && !userSocketIdMap.hasOwnProperty(data.deliveryBoy)){
        const deliveryData = await DeliveryBoy.findById(data.deliveryBoy);
        await Notification.deleteMany({deliveryBoyId: data.deliveryBoy, title: 'رسالة من الدعم'});
        await pushNotification('رسالة من الدعم', data.type=='text' ? data.body : 'تم ارسال رسالة من قبل الدعم', null, null, null, data.deliveryBoy, deliveryData.deviceToken);
      }
      IO.to(userSocketIdMap[data.customer ?? data.supplier ?? data.deliveryBoy]).emit('message', await transformationMessage(newMessage));
    } else {
      for(const admin of Object.keys(adminSocket)){
        const chatData = await Chat.findById(newMessage.chat);
        IO.to(adminSocket[admin]).emit('message', {'chat': await transformationChat(chatData), 'message': await transformationMessage(newMessage)});
      }
    }
  });
});

server.listen(port, async () => {
  await connectDB();
  //console.log(`listening on http://localhost:${port}`);
});
