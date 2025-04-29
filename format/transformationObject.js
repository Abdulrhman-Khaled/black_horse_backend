import Category from "../models/categorySchema.js";
import Offer from "../models/offerSchema.js";
import Product from "../models/productSchema.js";
import SupplierProduct from "../models/supplierProductSchema.js";
import Supplier from "../models/supplierSchema.js";
import SubUnit from "../models/subUnitSchema.js";
import Car from "../models/carSchema.js";
import Unit from "../models/unitSchema.js";
import Region from "../models/regionSchema.js";
import Customer from "../models/customerSchema.js";
import Order from "../models/orderSchema.js";
import Fee from "../models/feesSchema.js";
import SubCategory from "../models/subCategorySchema.js";
import ReasonOfCancelOrReturn from "../models/reasonOfCancelOrReturnSchema.js";
import {egyptHour, ProcessNames} from "../utils/balanceSheet.js";
import Group from "../models/groupSchema.js";
import ReturnPartOrder from "../models/returnPartOrderSchema.js";
import DeliveryBoy from "../models/deliveryBoySchema.js";
import Message from "../models/messageSchema.js";
import Inventory from "../models/store.models/inventorySchema.js";
import SupplierInventory from "../models/store.models/supplierInventorySchema.js";
import PurchaseItem from "../models/store.models/purchaseItemSchema.js";
import CustomerInventory from "../models/store.models/customerInventorySchema.js";
import SaleItem from "../models/store.models/saleItemSchema.js";
import Period from "../models/store.models/periodSchema.js";
import Admin from "../models/adminSchema.js";
import PurchaseReturn from "../models/store.models/purchaseReturnSchema.js";
import SaleReturn from "../models/store.models/saleReturnSchema.js";
import DetailedAccountStatement from "../models/store.models/detailedAccountStatementSchema.js";
import SubSubCategory from "../models/subSubCategorySchema.js";
import SubRegion from "../models/subRegionSchema.js";
import moment from 'moment-timezone';
import Purchase from "../models/store.models/purchaseSchema.js";
import Sale from "../models/store.models/saleSchema.js";
import Payment from "../models/store.models/paymentSchema.js";

export const transformationCustomer = async (customer) => {
  return {
    _id: customer._id,
    name: customer.name,
    phoneNumber: customer.phoneNumber,
    image: customer.image ?? null,
    address: customer.address ?? null,
    district: customer.region ? customer.region.name : null,
    averageRating: customer.averageRating ?? 0,
    status: customer.status ?? null,
    wallet: customer.wallet ?? 0,
    isVerify: customer.isVerify ?? false,
    isDeleted: customer.isDeleted ?? false,
    region: customer.region ? customer.region.name : null,
    subRegion: customer.subRegion ? customer.subRegion.name : null
  };
};
export const transformationCategory = async (category) => {
  return {
    _id: category._id,
    name: category.name,
    image: category.image,
  };
};
export const transformationSubCategory = async (subCategory, isSubSubCategory=true) => {
  const subSubCategories = isSubSubCategory ? await SubSubCategory.find({ subCategory: subCategory._id }) : [];
  const transformationSubCategories = await Promise.all(
    subSubCategories.map(async (subSubCategory) => await transformationSubSubCategory(subSubCategory))
  );
  return {
    _id: subCategory._id,
    name: subCategory.name,
    category: subCategory.category,
    subSubCategories: transformationSubCategories,
  };
};
export const transformationSubSubCategory = async (subSubCategory) => {
  return {
    _id: subSubCategory._id,
    name: subSubCategory.name,
    subCategory: subSubCategory.subCategory,
  };
}
export const transformationProduct = async (product, supplierProduct) => {
  const transformedUnits = await Promise.all(
    product.units.map(async (unitId) => {
      const unit = await Unit.findById(unitId);
      return await transformationUnit(unit);
    })
  );
  const subUnit = await SubUnit.findById(product.subUnit);
  const category = await Category.findOne({ _id: product.category });
  const subCategory = await SubCategory.findOne({ _id: product.subCategory });
  const subSubCategory = await SubSubCategory.findOne({ _id: product.subSubCategory });
  return {
    _id: product._id,
    title: product.title,
    desc: product.desc,
    frequency: product.frequency,
    weight: product.weight ?? 0,
    units: transformedUnits,
    subUnit: subUnit ? await transformationSubUnit(subUnit) : null,
    category: await transformationCategory(category),
    subCategory: await transformationSubCategory(subCategory, false),
    subSubCategory: subSubCategory ? await transformationSubSubCategory(subSubCategory) : null,
    barcode: product.barcode ?? null,
    images: (product.images && product.images.length > 0) 
            ? product.images : ["https://cdn.corporatefinanceinstitute.com/assets/products-and-services.jpeg"],
    reminderQuantity: product.reminderQuantity ?? null,
    expireDate: product.expiryDate ?? null,
    retailPrice: product.retailPrice ?? null,
    wholeSalePrice: product.wholesalePrice ?? null,
    halfWholeSalePrice: product.haveWholeSalePrice ?? null,
    costPrice: product.costPrice ?? null,
    appQuantity: supplierProduct ? supplierProduct.stock : 0,
  };
};
export const transformationSupplierProduct = async (supplierProduct, quantity = 1) => {
  const product = await Product.findById(supplierProduct.productId);
  const supplier = await Supplier.findById(supplierProduct.supplierId);
  const category = await Category.findOne({ _id: product.category });
  const subCategory = await SubCategory.findOne({ _id: product.subCategory });
  const subSubCategory = await SubSubCategory.findOne({ _id: product.subSubCategory });
  const subUnit = await SubUnit.findById(supplierProduct.subUnit);
  const unit = supplierProduct.unit ? await Unit.findById(supplierProduct.unit): null;
  const afterSaleExpireDate = supplierProduct.afterSaleExpireDate ? moment(supplierProduct.afterSaleExpireDate).tz('Africa/Cairo').format() : null;

  return {
    _id: supplierProduct._id,
    productAdminId: product._id,
    title: product.title,
    barcode: product.barcode,
    price: supplierProduct.price,
    afterSale: supplierProduct.afterSale ?? null,
    afterSaleExpireDate: afterSaleExpireDate,
    weight: supplierProduct.productWeight,
    images: product.images ?? [],
    minLimit: supplierProduct.minLimit ?? null,
    maxLimit: supplierProduct.maxLimit ?? null,
    supplierId: supplier._id,
    supplierName: supplier.name,
    desc: product.desc,
    unit: unit ? await transformationUnit(unit) : null,
    subUnit: await transformationSubUnit(subUnit),
    category: await transformationCategory(category),
    subCategory: await transformationSubCategory(subCategory, false),
    subSubCategory: subSubCategory ? await transformationSubSubCategory(subSubCategory) : null,
    supplierType: supplier.type,
    supplierImage: supplier.image,
    stock: supplierProduct.stock,
    frequency: supplierProduct.frequency,
    quantity: quantity,
    supplierSubRegion: supplier.subRegion
  };
};
export const transformationRating = (rating) => {
  return {
    _id: rating._id,
    customerId: rating.customerId,
    supplierId: rating.supplierId,
    rate: rating.rate,
  };
};
export const transformationHomeSlideShow = async (homeSlideShow) => {
  return {
    _id: homeSlideShow._id,
    image: homeSlideShow.image,
    createdAt: new Date(new Date(homeSlideShow.createdAt).getTime() + egyptHour * 60 * 60 * 1000),
    updatedAt: new Date(new Date(homeSlideShow.updatedAt).getTime() + egyptHour * 60 * 60 * 1000),
  };
};
export const transformationOffer = async (offer, quantity = 1) => {
  // const transformedProducts = await Promise.all(
  //   offer.products.map(async (productId) => {
  //     const supplierProduct = await SupplierProduct.findById(productId.productId);
  //     return transformationSupplierProduct(supplierProduct);
  //   })
  // );
  return {
    _id: offer._id,
    supplierId: offer.supplierId,
    title: offer.title,
    image: offer.image ?? null,
    price: offer.price,
    afterSale: offer.afterSale,
    minLimit: offer.minLimit ?? null,
    maxLimit: offer.maxLimit ?? null,
    weight: offer.weight,
    unit: offer.unit,
    stock: offer.stock,
    products: offer.products, //transformedProducts,
    quantity: quantity,
    desc: offer.desc,
  };
};
export const transformationOrder = async (order, operationType = null) => {
  const returnProducts = await ReturnPartOrder.find({ orderId: order._id});
  const transformedReturnedProducts = await Promise.all(
    returnProducts.map(async (returnProduct) => {
      return transformationReturnPartOrder(returnProduct, order);
    })
  );

  return {
    _id: order._id,
    operationType,
    orderNumber: order.orderNumber,
    supplierId: order.supplierId,
    supplierName: order.supplierName,
    subTotalPrice: order.subTotalPrice,
    totalPrice: order.totalPrice,
    address: order.address ?? null,
    district: order.district ?? null,
    subRegion: order.subRegion ?? null, 
    type: order.type,
    customerId: order.customerId,
    customerName: order.customerName,
    customerPhoneNumber: order.customerPhoneNumber,
    deliveryFees: order.deliveryFees,
    discount: order.discount,
    products: await Promise.all(
      order.products.map(async (product) => {
        const sp = await SupplierProduct.findById(product.product);
        const prod = await Product.findById(sp ? sp.productId : null);
        return {
          _id: product.product,
          title: product.title,
          price: product.price,
          afterSale: product.afterSale,
          weight: product.weight,
          images: prod && prod.images
            ? prod.images
            : [
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwJAqVU3xxzKtCZhy-xCWSnlPkqlAqDo9AiR7bWiIPrw&s",
              ],
          minLimit: product.minLimit ?? null,
          maxLimit: product.maxLimit ?? null,
          supplierId: product.supplierId,
          desc: product.desc,
          unit: product.unit ? {
            _id: product.unit.unitId,
            name: product.unit.name,
            maxNumber: product.unit.maxNumber,
          } : null,
          subUnit: { _id: product.subUnit.subUnitId, name: product.subUnit.name },
        
          supplierType: product.supplierType,
          stock: product.stock,
          quantity: product.quantity,
          category: product.category,
          subCategory: product.subCategory,
        };
      })
    ),
    orderDate: new Date(new Date(order.orderDate).getTime() + egyptHour * 60 * 60 * 1000),
    deliveryDaysNumber: order.deliveryDaysNumber,
    status: order.status,
    supplierType: order.supplierType,
    orderWeight: order.orderWeight,
    maxOrderWeight: order.maxOrderWeight,
    minOrderPrice: order.minOrderPrice,
    deliveryDate: new Date(new Date(order.deliveryDate).getTime() + egyptHour * 60 * 60 * 1000) ?? null,
    offers: await Promise.all(
      order.offers.map(async (offer) => {
        const offerData = await Offer.findById(offer.offer);
        return {
          _id: offer.offer,
          title: offer.title,
          supplierId: offer.supplierId,
          image: offerData && offerData.image
            ? offerData.image
            : "https://img.freepik.com/free-vector/special-offer-creative-sale-banner-design_1017-16284.jpg",
          price: offer.price,
          afterSale: offer.afterSale ?? null,
          minLimit: offer.minLimit ?? null,
          maxLimit: offer.maxLimit ?? null,
          weight: offer.offerWeight,
          stock: offer.stock,
          products: await Promise.all(
            offer.products.map(async (product) => {
              const sp = await SupplierProduct.findById(product.product);
              const prod = await Product.findById(sp ? sp.productId : null);
              return {
                _id: product.product,
                title: product.title,
                price: product.price,
                afterSale: product.afterSale,
                weight: product.weight,
                images: prod && prod.images
                  ? prod.images
                  : [
                      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwJAqVU3xxzKtCZhy-xCWSnlPkqlAqDo9AiR7bWiIPrw&s",
                    ],
                minLimit: product.minLimit ?? null,
                maxLimit: product.maxLimit ?? null,
                supplierId: product.supplierId,
                desc: product.desc,

                unit: product.unit ? {
                  _id: product.unit.unitId,
                  name: product.unit.name,
                  maxNumber: product.unit.maxNumber,
                } : null,
                subUnit: { _id: product.subUnit.subUnitId, name: product.subUnit.name },
         
                supplierType: product.supplierType,
                stock: product.stock,
                quantity: product.quantity,
                category: product.category,
                subCategory: product.subCategory,
              };
            })
          ),
          quantity: offer.quantity,
          desc: offer.desc,
        };
      })
    ),
    latitude: order.latitude ?? null,
    longitude: order.longitude ?? null,
    promoCode: order.promoCode ?? null,
    discountCoupon: order.discountCoupon ?? 0,
    control: order.control,
    group: order.group ?? null,
    supplierRating: order.supplierRating,
    deliveryBoy: order.deliveryBoy ?? null,
    beforeTrash: order.status === "trash" ? order.beforeTrash : null,
    beforeEdited: order.beforeEdited ?? null,
    beforeEditedProducts: order.beforeEditedProducts ?? [],
    beforeEditedOffers: order.beforeEditedOffers ?? [],
    returns: transformedReturnedProducts,
    reason: order.otherReason
      ? {
          _id: null,
          description: order.otherReason,
          type: null,
        }
      : order.reason
      ? {
          _id: order.reason._id,
          description: order.reason.description,
          type: order.reason.type,
        }
      : null,
    car: {
      _id: order.car._id,
      type: order.car.type,
      maxWeight: order.car.maxWeight,
      image: order.car.image ?? null,
      number: order.car.number,
    },
  };
};

export const transformationOrderProduct = async (order) => {
  return await Promise.all(
    order.products.map(async (product) => {
      const sp = await SupplierProduct.findById(product.product);
      const prod = await Product.findById(sp ? sp.productId : null);
      return {
        _id: product.product,
        title: product.title,
        price: product.price,
        afterSale: product.afterSale,
        weight: product.weight,
        images: prod && prod.images
          ? prod.images
          : [
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwJAqVU3xxzKtCZhy-xCWSnlPkqlAqDo9AiR7bWiIPrw&s",
            ],
        minLimit: product.minLimit ?? null,
        maxLimit: product.maxLimit ?? null,
        supplierId: product.supplierId,
        desc: product.desc,
        unit: product.unit ? {
          _id: product.unit.unitId,
          name: product.unit.name,
          maxNumber: product.unit.maxNumber,
        } : null,
        subUnit: { _id: product.subUnit.subUnitId, name: product.subUnit.name },
        supplierType: product.supplierType,
        stock: product.stock,
        quantity: product.quantity,
        category: product.category,
        subCategory: product.subCategory,
      };
    })
  )
}

export const transformationReturnPartOrder = async (returnPartOrder, order) => {
  return {
    orderId: returnPartOrder.orderId,
    products: await Promise.all(
      returnPartOrder.products.map(async (product) => {
        const productIndex = order.products.findIndex(item => item.product.toString() === product.product.toString());
        return {
          _id: product.product,
          quantity: product.quantity,

          title: order.products[productIndex].title,
          price: order.products[productIndex].price,
          afterSale: order.products[productIndex].afterSale,
          weight: order.products[productIndex].weight,
          images: order.products[productIndex] && order.products[productIndex].images
            ? order.products[productIndex].images
            : [
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwJAqVU3xxzKtCZhy-xCWSnlPkqlAqDo9AiR7bWiIPrw&s",
              ],

          minLimit: order.products[productIndex].minLimit ?? null,
          maxLimit: order.products[productIndex].maxLimit ?? null,
          supplierId: order.products[productIndex].supplierId,
          desc: order.products[productIndex].desc,

          unit: order.products[productIndex].unit ? {
            _id: order.products[productIndex].unit.unitId,
            name: order.products[productIndex].unit.name,
            maxNumber: order.products[productIndex].unit.maxNumber,
          } : null,
          subUnit: { _id: order.products[productIndex].subUnit.subUnitId, name: order.products[productIndex].subUnit.name },

          supplierType: order.products[productIndex].supplierType,
          stock: order.products[productIndex].stock,
          category: order.products[productIndex].category,
          subCategory: order.products[productIndex].subCategory,
        };
      })
    ),
    offers: await Promise.all(
      returnPartOrder.offers.map(async (offer) => {
        const offerIndex = order.offers.findIndex(item => item.offer.toString() === offer.offer.toString());
        const offerData = await Offer.findById(offer.offer);
        return {
          _id: offer.offer,
          quantity: offer.quantity,

          title: order.offers[offerIndex].title,
          supplierId: order.offers[offerIndex].supplierId,
          image: offerData && offerData.image
            ? offerData.image
            : "https://img.freepik.com/free-vector/special-offer-creative-sale-banner-design_1017-16284.jpg",
          price: order.offers[offerIndex].price,
          afterSale: order.offers[offerIndex].afterSale ?? null,
          minLimit: order.offers[offerIndex].minLimit ?? null,
          maxLimit: order.offers[offerIndex].maxLimit ?? null,
          weight: order.offers[offerIndex].offerWeight,
          stock: order.offers[offerIndex].stock,
          products: await Promise.all(
            order.offers[offerIndex].products.map(async (product) => {
              const sp = await SupplierProduct.findById(product.product);
              const prod = await Product.findById(sp ? sp.productId : null);
              return {
                _id: product.product,
                title: product.title,
                price: product.price,
                afterSale: product.afterSale,
                weight: product.weight,
                images: prod && prod.images
                  ? prod.images
                  : [
                      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwJAqVU3xxzKtCZhy-xCWSnlPkqlAqDo9AiR7bWiIPrw&s",
                    ],

                minLimit: product.minLimit ?? null,
                maxLimit: product.maxLimit ?? null,
                supplierId: product.supplierId,
                desc: product.desc,

                unit: product.unit ? {
                  _id: product.unit.unitId,
                  name: product.unit.name,
                  maxNumber: product.unit.maxNumber,
                } : null,
                subUnit: { _id: product.subUnit.subUnitId, name: product.subUnit.name },

                supplierType: product.supplierType,
                stock: product.stock,
                quantity: product.quantity,
                category: product.category,
                subCategory: product.subCategory,
              };
            })
          ),
          desc: order.offers[offerIndex].desc,
        };
      })
    ),
    reason: returnPartOrder.otherReason
    ? {
        _id: null,
        description: returnPartOrder.otherReason,
        type: "returned",
      }
    : returnPartOrder.reason
    ? {
        _id: returnPartOrder.reason._id,
        description: returnPartOrder.reason.description,
        type: returnPartOrder.reason.type,
      }
    : null,
    createdAt: new Date(new Date(returnPartOrder.createdAt).getTime() + egyptHour * 60 * 60 * 1000)
  };
};

export const transformationDeliveryBoy = async (deliverBoy) => {
  const car = await Car.findById(deliverBoy.car);
  const region = await Region.findById(deliverBoy.region);
  return {
    _id: deliverBoy._id,
    name: deliverBoy.name,
    email: deliverBoy.email,
    nationalId: deliverBoy.nationalId,
    image: deliverBoy.image ?? null,
    phone: deliverBoy.phone,
    region: region.name ?? "",
    access_token: deliverBoy.access_token,
    wallet: deliverBoy.wallet,
    car: (await transformationCar(car)) ?? {},
  };
};
export const transformationSupplier = async (supplier, isAdmin) => {
  let deliveryRegionName = [];
  if (supplier.deliveryRegion) {
    deliveryRegionName = await Supplier.findById(supplier._id)
      .populate({
        path: 'deliveryRegion._id',
        model: 'Region',
        select: 'name',
      })
      .populate({
        path: 'deliveryRegion.subRegions._id',
        model: 'SubRegion',
        select: 'name',
      }).lean();

    deliveryRegionName = deliveryRegionName.deliveryRegion.map(region => ({
      _id: region._id._id,
      name: region._id.name,
      subRegions: region.subRegions.map(subRegion => ({
        _id: subRegion._id._id,
        name: subRegion._id.name,
        address: subRegion.address,
      })),
    }));
  }
  let restAdminDate = {};
  if (isAdmin) {
    const orders = await Order.find({ supplierId: supplier._id });
    const totalSales = orders.reduce((acc, order) => acc + order.totalPrice, 0);
    let fee = 0 ; 
    const blackHorsePercentageProfit = await Fee.findOne({ type: "fee" });
    supplier.blackHorseFees ? fee = supplier.blackHorseFees : fee = blackHorsePercentageProfit.amount;
    const blackHorseProfit = totalSales * (fee / 100);
    restAdminDate = {
      numberOfOrders: await Order.countDocuments({status: "complete", supplierId: supplier._id}),
      numberOfOffers: await Offer.countDocuments({status: "active", supplierId: supplier._id}),
      numberOfProducts: await SupplierProduct.countDocuments({supplierId: supplier._id}),
      totalSales,
      orderFees: Number(fee.toString()),
      blackHorseProfit,
    };
  }
  return {
    _id: supplier._id,
    name: supplier.name,
    phoneNumber: supplier.phoneNumber,
    wallet: supplier.wallet,
    nationalId: supplier.nationalId,
    minOrderPrice: supplier.minOrderPrice,
    deliveryRegion: deliveryRegionName ?? [],
    workingDays: supplier.workingDays ?? [],
    workingHours: supplier.workingHours ?? [],
    deliveryDaysNumber: supplier.deliveryDaysNumber ?? 0,
    type: supplier.type,
    image: supplier.image === null || supplier.image  === "" ? "https://www.gep.com/prod/s3fs-public/styles/blog_hero_banner/public/blog-images/5-strategies-to-tackle-poor-supplier-performance-1920x1274.jpg.webp?itok=_FHC-QUE" : supplier.image,
    status: supplier.status,
    placeImage: supplier.placeImage ?? [],
    rating: supplier.averageRating ?? 0,
    desc: supplier.desc ?? null,
    isDeleted: supplier.isDeleted ?? false,
    completedOrdersPercentage: Math.round(supplier.completedOrdersPercentage * 10) / 10 ,
    ...restAdminDate,
  };
};
export const transformationCar = async (car) => {
  return {
    _id: car._id,
    image: car.image ?? "",
    type: car.type,
    number: car.number ?? "",
    maxWeight: car.maxWeight,
  };
};
export const transformationUnit = async (unit) => {
  return {
    _id: unit._id,
    name: unit.name,
    maxNumber: unit.maxNumber,
  };
};
export const transformationSubUnit = async (subUnit) => {
  return {
    _id: subUnit._id,
    name: subUnit.name,
  };
};
export const transformationPromoCode = async (promoCode) => {
  return {
    _id: promoCode._id,
    code: promoCode.code,
    discount: promoCode.discount,
    expiryDate: promoCode.expiryDate,
    numOfUsage: promoCode.numOfUsage,
  };
};
export const transformationRegion = async (region) => {
  const subRegions = await SubRegion.find({ regionId: region._id });
  const transformSubRegion = await Promise.all(
    subRegions.map(async (subRegion) => await transformationSubRegion(subRegion))
  );
  return {
    _id: region._id,
    name: region.name,
    subRegions: transformSubRegion
  };
};
export const transformationSubRegion = async (subRegion) => {
  return {
    _id: subRegion._id,
    regionId: subRegion.regionId,
    name: subRegion.name,
  };
};
export const transformationGroup = async (group) => {
  const supplierData = await Supplier.findById(group.supplierId);
  const regionData = await Region.findById(group.region);
  const subRegionData = await SubRegion.findById(group.subRegion);
  const orders = await Order.find({ group: group._id });
  const transformationOrderData = await Promise.all(
    orders.map(async (order) => await transformationOrder(order))
  );
  
  return {
    _id: group._id,
    name: regionData ? regionData.name : null,
    supplierName: supplierData.name,
    totalGroupPrice: group.totalPrice,
    minOrderPrice: group.minOrderPrice,
    district: regionData ? regionData.name : null,
    subRegion: subRegionData ? subRegionData.name : null,
    joinedCustomersNumber: group.customer.length,
    createdAt: new Date(new Date(group.createdAt).getTime() + egyptHour * 60 * 60 * 1000),
    endedAt: new Date(new Date(group.expireDate).getTime() + egyptHour * 60 * 60 * 1000),
    status: group.status,
    groupNumber: group.groupNumber,
    deliveryDate: new Date(new Date(group.deliveryDate).getTime() + egyptHour * 60 * 60 * 1000) ?? null,
    order: transformationOrderData,
    beforeTrash: group.status === "trash" ? group.beforeTrash : null,
    reason: group.otherReason
      ? {
          _id: null,
          description: group.otherReason,
          type: null,
        }
      : group.reason
      ? {
          _id: group.reason._id,
          description: group.reason.description,
          type: group.reason.type,
        }
      : null,
  };
};

export const transformationAdmin = async (admin) => {
  const adminPeriods = admin.period ?? [];
  const transformPeriods = await Promise.all(
    adminPeriods.map(async (periodId) => {
      const periodData = await Period.findById(periodId);
      return await transformationPeriod(periodData);
    })
  );
  return {
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    type: admin.type,
    period: transformPeriods,
    roles: admin.roles ?? {},
    access_token: admin.access_token,
  };
};

export const transformationPartAdmin = async (adminId) => {
  const adminData = await Admin.findById(adminId);
  return {
    _id: adminId,
    name: adminData.name,
  };
}

export const transformationFineOrder = async (supplierFine) => {
  let order;
  let group;
  if (supplierFine.order) {
    order = await Order.findById(supplierFine.order);
    if (!order) {
      throw new Error("Order not found");
    }
  }
  if (supplierFine.group) {
    group = await Group.findById(supplierFine.group);
    if (!group) {
      throw new Error("Group not found");
    }
  }
  const reasonOfCancel = await ReasonOfCancelOrReturn.findOne({ description: supplierFine.reasonOfCancel });
  return {
    _id: order ? order._id : group._id,
    orderNumber: order ? order.orderNumber : group.groupNumber,
    orderStatus: order ? order.status : group.status,
    reasonOfCancel: reasonOfCancel
      ? reasonOfCancel.description
      : ProcessNames.fineForTrash,
    type: supplierFine.typeOfFine,
    fine: supplierFine.fine,
    createdAt: new Date(new Date(supplierFine.createdAt).getTime() + egyptHour * 60 * 60 * 1000),
  };
};

export const transformationReason = async (reason) => {
  return {
    _id: reason._id,
    description: reason.description,
    type: reason.type,
    status: reason.status,
  };
};

export const transformationNotification = async (notification) => {
  return {
    _id: notification._id,
    title: notification.title,
    body: notification.body,
    userId: notification.customerId ?? notification.supplierId ?? notification.deliveryBoyId,
    dateTime: new Date(new Date(notification.dateTime).getTime() + egyptHour * 60 * 60 * 1000),
  };
};

export const transformationBalanceSheet = async (balanceSheet) => {
  return {
    _id: balanceSheet._id,
    processName: balanceSheet.processName,
    customerAndOrder: balanceSheet.customerAndOrder ?? null,
    balance: balanceSheet.balance,
    type: balanceSheet.type,
    createdAt: new Date(new Date(balanceSheet.createdAt).getTime() + egyptHour * 60 * 60 * 1000),
  };
};

export const transformationChat = async (chat) => {
  let userType = null, user = null;
  if (chat.customer) {
    userType = "customer";
    user = await Customer.findById(chat.customer);
  } else if (chat.supplier) {
    userType = "supplier";
    user = await Supplier.findById(chat.supplier);
  } else if (chat.deliveryBoy) {
    userType = "deliveryBoy";
    user = await DeliveryBoy.findById(chat.deliveryBoy);
  }

  const lastMessage = await Message.findOne({ chat: chat._id, type: "text" }).sort({ time: -1 });
  return {
    _id: chat._id,
    userId: user._id,
    image: user.image ?? "",
    name: user.name ?? "",
    lastMessage: lastMessage ? lastMessage.body : "",
    userType: userType ?? "",
  };
};

export const transformationMessage = async (message) => {
  return {
    _id: message._id,
    chat: message.chat,
    customer: message.customer ?? null,
    supplier: message.supplier ?? null,
    deliveryBoy: message.deliveryBoy ?? null,
    body: message.body,
    type: message.type,
    sender: message.sender,
    time: new Date(new Date(message.time).getTime() + egyptHour * 60 * 60 * 1000),
  };
};

export const transformationInventory = async (inventory) => {
  return {
    _id: inventory._id,
    name: inventory.name,
    phoneNumber: inventory.phoneNumber,
    address: inventory.address
  };
};

export const transformationSupplierInventory = async (supplierInventory) => {
  return {
    _id: supplierInventory._id,
    name: supplierInventory.name,
    phoneNumber: supplierInventory.phoneNumber,
    address: supplierInventory.address ?? "",
    debit: supplierInventory.debit,
    credit: supplierInventory.credit,
    balance: supplierInventory.credit - supplierInventory.debit,
    admin: await transformationPartAdmin(supplierInventory.admin),
  };
};

export const transformationCustomerInventory = async (customerInventory) => {
  return {
    _id: customerInventory._id,
    name: customerInventory.name,
    phoneNumber: customerInventory.phoneNumber,
    address: customerInventory.address ?? "",
    debit: customerInventory.debit,
    credit: customerInventory.credit,
    balance: customerInventory.debit - customerInventory.credit,
    admin: await transformationPartAdmin(customerInventory.admin),
  };
};

export const transformationPurchase = async (purchase) => {
  const inventory = await Inventory.findById(purchase.inventoryId);
  const supplierInventory = await SupplierInventory.findById(purchase.supplierInventoryId);
  const purchaseItems = await PurchaseItem.find({ purchaseId: purchase._id });
  const paymentType = await Payment.findById(purchase.paymentType);
  return {
    _id: purchase._id,
    receiptNumber: purchase.receiptNumber.toString(),
    inventory: await transformationInventory(inventory),
    customerSupplierInventory: await transformationSupplierInventory(supplierInventory),
    products: await Promise.all(
      purchaseItems.map(async (purchaseItem) => await transformationInventoryProduct(purchaseItem))
    ),
    numberOfReturns: await DetailedAccountStatement.countDocuments({ purchaseId: purchase._id, status: { $in: ['returnPurchase', 'returnCashPurchase'] } }),
    totalReturnAmount: purchase.totalReturnAmount,
    admin: await transformationPartAdmin(purchase.admin),
    note: purchase.note ?? null,
    date: new Date(new Date(purchase.date).getTime() + egyptHour * 60 * 60 * 1000),
    totalAmount: purchase.totalAmount,
    paidAmount: purchase.paidAmount,
    dueAmount: purchase.dueAmount,
    taxes: purchase.taxes ?? 0,
    paymentType: paymentType ? paymentType : null,
  };
}

export const transformationReturnPurchase = async (returnPurchase) => { // اظهار تفاصيل مرتجع المشتريات
  const detailReturns = await DetailedAccountStatement.find({ purchaseId: returnPurchase._id, status: { $in: ['returnPurchase', 'returnCashPurchase'] } }).sort({ date: -1 });
  return await Promise.all(
    detailReturns.map(async (detailReturn) => {
      return {
        ...(await transformationDetailedAccount(detailReturn)),
        returnProducts: await Promise.all(
          detailReturn.returnProductIDs.map(async (returnProductID) => {
            const PurchaseReturnData = await PurchaseReturn.findById(returnProductID);
            return await transformationInventoryProduct(PurchaseReturnData);
          })
        )
      }
    })
  );
}

export const transformationSale = async (sale) => {
  const inventory = await Inventory.findById(sale.inventoryId);
  const customerInventory = await CustomerInventory.findById(sale.customerInventoryId);
  const saleItems = await SaleItem.find({ saleId: sale._id });
  const paymentType = await Payment.findById(sale.paymentType);
  return {
    _id: sale._id,
    receiptNumber: sale.receiptNumber.toString(),
    inventory: await transformationInventory(inventory),
    customerSupplierInventory: customerInventory ? await transformationCustomerInventory(customerInventory) : null,
    numberOfReturns: await DetailedAccountStatement.countDocuments({
      saleId: sale._id,
      status: {$in: ['returnSale', 'returnCashSale']}
    }),
    products: await Promise.all(
      saleItems.map(async (saleItem) => {
        return {
          ...(await transformationInventoryProduct(saleItem)),
          type: saleItem.type,
          saleItemDetails: saleItem.saleItemDetails ?? []
        };
      })
    ),
    totalReturnAmount: sale.totalReturnAmount,
    admin: await transformationPartAdmin(sale.admin),
    note: sale.note ?? null,
    date: new Date(new Date(sale.date).getTime() + egyptHour * 60 * 60 * 1000),
    totalAmount: sale.totalAmount,
    paidAmount: sale.paidAmount,
    dueAmount: sale.dueAmount,
    taxes: sale.taxes ?? 0,
    paymentType: paymentType ? paymentType : null,
    discount: sale.discount
  };
}

export const transformationReturnSale = async (returnSale) => { // اظهار تفاصيل مرتجع المبيعات
  const detailReturns = await DetailedAccountStatement.find({ saleId: returnSale._id, status: { $in: ['returnSale', 'returnCashSale'] } }).sort({ date: -1 });
  return await Promise.all(
    detailReturns.map(async (detailReturn) => {
      return {
        ...(await transformationDetailedAccount(detailReturn)),
        returnProducts: await Promise.all(
          detailReturn.returnProductIDs.map(async (returnProductID) => {
            const saleReturnData = await SaleReturn.findById(returnProductID);
            return await transformationInventoryProduct(saleReturnData);
          })
        )
      }
    })
  );
}

export const transformationInventoryProduct = async (productItem) => {
  const productData = await Product.findById(productItem.product);
  const unitData = await Unit.findById(productItem.unit);
  // const subUnitData = await SubUnit.findById(productItem.subUnit);
  return {
    _id: productData._id,
    ...(await transformationProduct(productData)),
    productItemId: productItem._id,
    quantity: productItem.quantity,
    reminderQuantity: productItem.reminderQuantity,
    productionDate: productItem.productionDate ?? "2024-08-01T00:00:00.000Z",
    expiryDate: productItem.expiryDate,
    costPrice: productItem.costPrice,
    retailPrice: productItem.retailPrice,
    wholesalePrice: productItem.wholesalePrice,
    haveWholeSalePrice: productItem.haveWholeSalePrice,
    salePrice: productItem.salePrice,
    unit: unitData ? await transformationUnit(unitData) : null,
    // subUnit: subUnitData ? await transformationSubUnit(subUnitData) : null,
  };
}

export const transformationDetailedAccount = async (detailedAccount) => {
  let receiptNumber = "لا يوجد";
  if(detailedAccount.purchaseId){
    const purchaseData = await Purchase.findById(detailedAccount.purchaseId);
    receiptNumber = purchaseData?.receiptNumber;
  } else if(detailedAccount.saleId){
    const saleData = await Sale.findById(detailedAccount.saleId);
    receiptNumber = saleData?.receiptNumber;
  }

  return {
    _id: detailedAccount._id,
    receiptId: detailedAccount.purchaseId ?? detailedAccount.saleId ?? null,
    receiptNumber: receiptNumber ? String(receiptNumber) : null,
    supplierInventoryId: detailedAccount.supplierInventoryId ?? null,
    customerInventoryId: detailedAccount.customerInventoryId ?? null,
    credit: detailedAccount.credit,
    debit: detailedAccount.debit,
    balance: detailedAccount.balance,
    date: new Date(new Date(detailedAccount.date).getTime() + egyptHour * 60 * 60 * 1000),
    operationType: detailedAccount.operationType,
    admin: await transformationPartAdmin(detailedAccount.admin),
    status: detailedAccount.status
  }
}

export const transformationDefectiveProduct = async (defectiveProduct) => {
  const productData = await Product.findById(defectiveProduct.productId);
  return {
    _id: defectiveProduct._id,
    productId: defectiveProduct.productId,
    productItemId: defectiveProduct.productItemId,
    inventoryId: defectiveProduct.inventoryId,
    quantity: defectiveProduct.quantity,
    reason: defectiveProduct.reason,
    date: new Date(new Date(defectiveProduct.date).getTime() + egyptHour * 60 * 60 * 1000),
    // admin: await transformationPartAdmin(defectiveProduct.admin),
    ...(await transformationProduct(productData)),
  }
}

export const transformationSettlement = async (settlement) => {
  const productData = await Product.findById(settlement.product);
  return {
    _id: settlement._id,
    purchaseItemId: settlement.purchaseItemId,
    inventoryId: settlement.inventoryId,
    product: settlement.product,
    beforeChanges: settlement.beforeChanges,
    afterChanges: settlement.afterChanges,
    admin: await transformationPartAdmin(settlement.admin),
    date: new Date(new Date(settlement.date).getTime() + egyptHour * 60 * 60 * 1000),
    ...(await transformationProduct(productData)),
  }
}

export const transformationFixedExpense = async (fixedExpense) => {
  return {
    _id: fixedExpense._id,
    title: fixedExpense.title,
  }
}

export const transformationExpense = async (expense) => {
  return {
    _id: expense._id,
    title: expense.title,
    amount: expense.amount,
    receiptNumber: expense.receiptNumber,
    type: expense.type,
    date: new Date(new Date(expense.date).getTime() + egyptHour * 60 * 60 * 1000),
    operationType: expense.operationType,
    admin: await transformationPartAdmin(expense.admin),
  }
}

export const transformationPeriod = async (period) => {
  return {
    _id: period._id,
    name: period.name,
    from: period.from,
    to: period.to
  }
}

export const transformationTreasury = async (treasury) => {
  return {
    _id: treasury._id,
    amount: treasury.amount,
    description: treasury.description ?? null,
    type: treasury.type,
    date: treasury.date,
    operationType: treasury.operationType,
    admin: await transformationPartAdmin(treasury.admin),
  }
}

// transformation for advertisement;
export const transformationAdvertisement = async (advertisement) => {
  return {
     ... (await transformationSupplierProduct(advertisement.product, advertisement.quantity)),
    advertisementId: advertisement._id,
    createdAt: advertisement.createdAt
  }
}


export const transformationSaleReport = async ({receipt, product}) => {
  return {
    receipt,
    product: {
      ...(await transformationInventoryProduct(product)),
      type: product.type,
      saleItemDetails: product.saleItemDetails ?? []
    }
  };
}