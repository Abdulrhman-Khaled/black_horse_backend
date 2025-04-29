import fs from 'fs';
import { transformationOffer } from '../format/transformationObject.js';
import Offer from '../models/offerSchema.js'
import Order from '../models/orderSchema.js';
import SupplierProduct from '../models/supplierProductSchema.js';
import Supplier from '../models/supplierSchema.js';
import { validationResult } from 'express-validator';

export const getAllOffer = async (req, res) => {
  let query = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    if (req.query.search) {
      query.title = new RegExp(req.query.search, 'i');
    }
    const offers = await Offer.aggregate([
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplierId',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      },
      { $unwind: '$supplierInfo' },
      { $match: { ...query, 'supplierInfo.isDeleted': false } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          price: 1,
          createdAt: 1,
          supplierId: 1,
          supplierName: '$supplierInfo.name'
        }
      }
    ]);

    const transformedOffers = await Promise.all(
      offers.map(async (offer) =>  {
        const offerData = await Offer.findById(offer._id);
        return await transformationOffer(offerData)
      })
    );
    res.status(200).json({
      status: 'success',
      page: page,
      data: transformedOffers,
    })
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};
export const getOffer = async (req, res) => {
  const offerId = req.params.id;
  try {
    const offer = await Offer.findById(offerId);
    res.status(200).json({
      status: 'success',
      data: await transformationOffer(offer)
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};
export const updateOffer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const offerId = req.params.id;
  const products = req.body.products ?? [];
  try {
    await Promise.all(products.map(async (product) => {
      const supplierProduct = await SupplierProduct.findById(product.productId);
      if(!supplierProduct){
        return res.status(404).json({
          status:'fail',
          message:`Product ${product.productId} Not Found`
        })
      }}))
 
    const offer = await Offer.findById(offerId);
    if(products){
      const ordersPending = await Order.find({ supplierId: offer.supplierId, status: { $in: ['pending', 'inProgress', 'delivery', 'delivered', 'supplierCompleted', 'trash', 'edited'] } }).sort({ createdAt: -1 });
      const offerIncluded = ordersPending.some(order => {
        return order.offers.some(orderOffer => orderOffer.offer.equals(offerId));
      });
      if (offerIncluded) {
        return res.status(207).json({
          status: 'fail',
          message: 'This offer is already included in order',
        });
      }  
    }

    let offerWeight = 0;
    const offerUpdated = await Offer.findByIdAndUpdate(offerId, req.body, { new: true });
    for(const productOffer of offerUpdated.products) {
      const supplierProduct = await SupplierProduct.findById(productOffer.productId);
      offerWeight += supplierProduct.productWeight * productOffer.quantity;
    }
    offer.weight = offerWeight;
    await offer.save();

    res.status(200).json({
      status: 'success',
      data: await transformationOffer(offerUpdated),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const deleteOffer = async (req, res) => {
  const offerId = req.params.id;
  try {
    const offer = await Offer.findById(offerId);
    const ordersPending = await Order.find({ supplierId: offer.supplierId, 
      status: { $in: ['pending', 'inProgress', 'delivery', 'delivered', 'supplierCompleted', 'trash', 'edited'] } 
    }).sort({ createdAt: -1 });

    const offerIncluded = ordersPending.some(order => {
      return order.offers.some(orderOffer => orderOffer.offer.equals(offerId));
    });
    if (offerIncluded) {
      return res.status(240).json({
        status: 'fail',
        message: 'This offer is already included in order',
      });
    }

    if (offer.image) {
      const pathName = offer.image.split('/').slice(3).join('/');
      fs.unlink('upload/' + pathName, (err) => {});
    }
    await Offer.findByIdAndDelete(offerId);
    res.status(200).json({
      status:'success',
      data:null
    })
  } catch (error) {
    res.status(500).json({
      status:'fail',
      message:error.message,
    })
  }
}
export const createOffer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const offerData = req.body;
  const supplierId = req.body.supplierId;
  const productIds = req.body.products; // Array of product IDs
  const offerTitle = req.body.title
  try {
    const offer = await Offer.findOne({title:offerTitle});
    if(offer){
      return res.status(400).json({
        status:'fail',
        message:'offer already exist'
      })
    }
    const supplier = await Supplier.findById(supplierId);
    if(!supplier){
      return res.status(404).json({
        status: 'fail',
        message: 'Supplier not found',
      })
    }
    if (!offerData) {
      throw new Error(`Offer data is required`);
    }
    if (!supplierId) {
      throw new Error(`Supplier ID is required`);
    }
    if (!productIds || productIds.length === 0) {
      throw new Error(`Product IDs are required`);
    }
    const existingOffer = await Offer.findOne({ supplierId, productId: { $all: productIds } });
    if (existingOffer) {
      return res.status(400).json({
        status: 'fail',
        message: 'An offer for the same products by the same supplier already exists',
      });
    }
  
    const newOffer = new Offer(offerData);
    await newOffer.save();
    // const customersDeviceToken = await Customer.find({}, 'deviceToken');
    // const deviceTokens = customersDeviceToken.map(customer => customer.deviceToken);
    // await Notification.deleteMany({ type: 'addNewOffer' });
    // await pushNotification('عرض جديد متاح!', 'استكشف أحدث عروضنا التي تمت إضافتها للتو. لا تفوت هذا العرض الخاص.', 'addNewOffer', null, null, null, deviceTokens.filter(devToken => devToken !== undefined));
    res.status(201).json({
      status: 'success',
      data: await transformationOffer(newOffer),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const changeImageOffer = async (req, res) => {
  const offerId = req.params.id;
  try{
    const offer = await Offer.findById(offerId);
    if (offer.image) {
      const pathName = offer.image.split('/').slice(3).join('/');
      fs.unlink('upload/' + pathName, (err) => {});
    }
    offer.image = `${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`;
    await offer.save();
    res.status(201).json({
      status: 'success',
      data: await transformationOffer(offer),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
}
export const getOfferBySupplierId = async (req, res) => {
  let query = { supplierId: req.params.id };
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    if (req.query.search) {
      query.title = new RegExp(`^${req.query.search}`, 'i');
    }
    const offers = await Offer.find(query).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit).exec();
    const transformedOffers = await Promise.all(
      offers.map(async (offer) =>  await transformationOffer(offer))
    );
    res.status(200).json({
      status: 'success',
      page: page,
      totalPages: Math.ceil(await Offer.countDocuments(query) / limit),
      data: transformedOffers
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};
export const getOfferByOrderId = async (req, res) => {
  const orderId = req.params.id;
  try {
    const orders = await Order.findOne({ _id: orderId });
    if (orders && orders.offers && orders.offers.length > 0) { // Check if offers array is not empty
      const transformedOffers = await Promise.all(orders.offers.map(async (offerId) => {
        const offer = await Offer.findById(offerId.offer);
        return await transformationOffer(offer);
      }));
      res.status(200).json({
        status: 'success',
        data: transformedOffers
      });
    } else {
      return res.status(404).json({
        status: 'fail',
        data:[],
        message: 'No offers found'
      })
    }
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};
