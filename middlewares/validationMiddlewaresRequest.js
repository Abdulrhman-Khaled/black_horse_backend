import { body, check } from "express-validator";
import mongoose from "mongoose";
import Region from "../models/regionSchema.js";
import Period from "../models/store.models/periodSchema.js";
import Supplier from "../models/supplierSchema.js";
import SubRegion from "../models/subRegionSchema.js";
import Customer from "../models/customerSchema.js";
import SupplierProduct from "../models/supplierProductSchema.js";
import Offer from "../models/offerSchema.js";
import Admin from "../models/adminSchema.js";
import Unit from "../models/unitSchema.js";
import SubUnit from "../models/subUnitSchema.js";
import ReasonOfCancelOrReturn from "../models/reasonOfCancelOrReturnSchema.js";
import Car from "../models/carSchema.js";
import Product from "../models/productSchema.js";
import Inventory from "../models/store.models/inventorySchema.js";
import SupplierInventory from "../models/store.models/supplierInventorySchema.js";
import PurchaseItem from "../models/store.models/purchaseItemSchema.js";
import CustomerInventory from "../models/store.models/customerInventorySchema.js";
import SaleItem from "../models/store.models/saleItemSchema.js";

const validDays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const validFileTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
  "image/x-icon",
];

/************************************ Admin Middlewares ************************************/
export const validateCreateAdmin = [
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),

  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be a valid email"),

  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isString()
    .withMessage("Password must be a string"),

  check("type")
    .notEmpty()
    .withMessage("Type is required")
    .isIn(["admin", "subAdmin"])
    .withMessage("Type must be admin or subAdmin"),

  check("period")
    .isArray()
    .withMessage("Period must be an array")
    .custom(async (value) => {
      if (!Array.isArray(value)) {
        throw new Error("Period must be an array");
      }

      for (const id of value) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid period ID: ${id}`);
        }

        const periodExists = await Period.findById(id);
        if (!periodExists) {
          throw new Error(`Period with ID ${id} does not exist`);
        }
      }
      return true;
    }),

  check("roles")
    .optional()
    .isObject()
    .withMessage("Roles must be an object")
    .custom((roles) => {
      if (roles) {
        for (const [key, value] of Object.entries(roles)) {
          if (typeof value !== "boolean") {
            throw new Error(`Role key ${key} must have a boolean value`);
          }
        }
      }
      return true;
    }),
];

export const validateUpdateAdmin = [
  check("id")
    .isMongoId()
    .withMessage("Admin ID must be a valid MongoDB ObjectId")
    .custom(async (id) => {
      const admin = await Admin.findById(id);
      if (!admin) {
        throw new Error("Admin ID does not exist");
      }
      return true;
    }),

  check("name").optional().isString().withMessage("Name must be a string"),

  check("email")
    .optional()
    .isEmail()
    .withMessage("Email must be a valid email"),

  check("password")
    .optional()
    .isString()
    .withMessage("Password must be a string"),

  check("type")
    .optional()
    .isIn(["admin", "subAdmin"])
    .withMessage("Type must be admin or subAdmin"),

  check("period")
    .optional()
    .isArray()
    .withMessage("Period must be an array")
    .custom(async (value) => {
      if (!Array.isArray(value)) {
        throw new Error("Period must be an array");
      }

      for (const id of value) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid period ID: ${id}`);
        }

        const periodExists = await Period.findById(id);
        if (!periodExists) {
          throw new Error(`Period with ID ${id} does not exist`);
        }
      }
      return true;
    }),

  check("roles")
    .optional()
    .isObject()
    .withMessage("Roles must be an object")
    .custom((roles) => {
      if (roles) {
        for (const [key, value] of Object.entries(roles)) {
          if (typeof value !== "boolean") {
            throw new Error(`Role: ${key} must have a boolean value`);
          }
        }
      }
      return true;
    }),
];

/************************************ Supplier Middlewares ************************************/
export const validateCreateSupplier = [
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),

  check("phoneNumber")
    .notEmpty()
    .withMessage("PhoneNumber is required")
    .isString()
    .withMessage("PhoneNumber must be a string"),

  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isString()
    .withMessage("Password must be a string"),

  check("minOrderPrice")
    .notEmpty()
    .withMessage("MinOrderPrice is required")
    .isFloat({ min: 0 })
    .withMessage("MinOrderPrice must be a float"),

  check("type")
    .notEmpty()
    .withMessage("Type is required")
    .isIn([
      "gomla",
      "nosGomla",
      "gomlaGomla",
      "company",
      "blackHorse",
      "shopEquipment",
      "restaurantEquipment",
    ])
    .withMessage(
      "Type must be gomla, nosGomla, gomlaGomla, company, blackHorse, shopEquipment or restaurantEquipment"
    ),

  check("deliveryDaysNumber")
    .notEmpty()
    .withMessage("DeliveryDaysNumber is required")
    .isFloat({ min: 0 })
    .withMessage("DeliveryDaysNumber must be a Integer"),

  check("deliveryRegion")
    .notEmpty()
    .withMessage("DeliveryRegion is required")
    .isArray()
    .withMessage("DeliveryRegion must be an array")
    .custom(async (regions) => {
      if (regions.length > 0) {
        const regionIds = regions.map((region) => region._id);
        const validRegions = await Region.find({ _id: { $in: regionIds } });

        if (validRegions.length !== regionIds.length) {
          throw new Error("One or more DeliveryRegion IDs are invalid");
        }

        for (const region of regions) {
          const subRegionIds = region.subRegions.map((subRegion) => subRegion._id);
          const validSubRegions = await SubRegion.find({ _id: { $in: subRegionIds } });

          if (validSubRegions.length !== subRegionIds.length) {
            throw new Error(`One or more SubRegion IDs for region ${region._id} are invalid`);
          }

          region.subRegions.forEach((subRegion) => {
            if (!subRegion.address || typeof subRegion.address !== "string" || subRegion.address.trim() === "") {
              throw new Error(`Address is required for SubRegion ID ${subRegion._id}`);
            }
          });
        }
      }
      return true;
    }),

  check("workingDays")
    .isArray()
    .withMessage("WorkingDays must be an array")
    .custom((days) => {
      for (const day of days) {
        if (!validDays.includes(day)) {
          throw new Error(`Invalid day of the week: ${day}`);
        }
      }
      return true;
    }),

  check("workingHours")
    .isArray()
    .withMessage("WorkingHours must be an array")
    .custom((value) => {
      if (value.length !== 2) {
        throw new Error("WorkingHours must contain exactly 2 elements");
      }
      if (typeof value[0] !== "number" || typeof value[1] !== "number") {
        throw new Error("WorkingHours must contain only numbers");
      }
      return true;
    }),

  check("nationalId")
    .notEmpty()
    .withMessage("NationalId is required")
    .isFloat({ min: 0 })
    .withMessage("NationalId must be a Integer"),

  check("desc").optional().isString().withMessage("Desc must be a string"),
];

export const validateUpdateSupplier = [
  check("id")
    .isMongoId()
    .withMessage("Supplier ID must be a valid MongoDB ObjectId")
    .custom(async (id) => {
      const supplier = await Supplier.findById(id);
      if (!supplier) {
        throw new Error("Supplier ID does not exist");
      }
      return true;
    }),

  check("name").optional().isString().withMessage("Name must be a string"),

  check("phoneNumber")
    .optional()
    .isString()
    .withMessage("PhoneNumber must be a string"),

  check("password")
    .optional()
    .isString()
    .withMessage("Password must be a string"),

  check("minOrderPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("MinOrderPrice must be a float"),

  check("type")
    .optional()
    .isIn([
      "gomla",
      "nosGomla",
      "gomlaGomla",
      "company",
      "blackHorse",
      "shopEquipment",
      "restaurantEquipment",
    ])
    .withMessage(
      "Type must be gomla, nosGomla, gomlaGomla, company, blackHorse, shopEquipment or restaurantEquipment"
    ),

  check("deliveryDaysNumber")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("DeliveryDaysNumber must be a Integer"),

  
    check("deliveryRegion")
    .optional()
    .isArray()
    .withMessage("DeliveryRegion must be an array")
    .custom(async (regions) => {
      if (regions.length > 0) {
        const regionIds = regions.map((region) => region._id);
        const validRegions = await Region.find({ _id: { $in: regionIds } });

        if (validRegions.length !== regionIds.length) {
          throw new Error("One or more DeliveryRegion IDs are invalid");
        }

        for (const region of regions) {
          const subRegionIds = region.subRegions.map((subRegion) => subRegion._id);
          const validSubRegions = await SubRegion.find({ _id: { $in: subRegionIds } });

          if (validSubRegions.length !== subRegionIds.length) {
            throw new Error(`One or more SubRegion IDs for region ${region._id} are invalid`);
          }

          region.subRegions.forEach((subRegion) => {
            if (!subRegion.address || typeof subRegion.address !== "string" || subRegion.address.trim() === "") {
              throw new Error(`Address is required for SubRegion ID ${subRegion._id}`);
            }
          });
        }
      }
      return true;
    }),

  check("workingDays")
    .optional()
    .isArray()
    .withMessage("WorkingDays must be an array")
    .custom((days) => {
      for (const day of days) {
        if (!validDays.includes(day)) {
          throw new Error(`Invalid day of the week: ${day}`);
        }
      }
      return true;
    }),

  check("workingHours")
    .optional()
    .isArray()
    .withMessage("WorkingHours must be an array")
    .custom((value) => {
      if (value.length !== 2) {
        throw new Error("WorkingHours must contain exactly 2 elements");
      }
      if (typeof value[0] !== "number" || typeof value[1] !== "number") {
        throw new Error("WorkingHours must contain only numbers");
      }
      return true;
    }),

  check("nationalId")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("NationalId must be a Integer"),

  check("desc").optional().isString().withMessage("Desc must be a string"),
];

/************************************ Customer Middlewares ************************************/
export const validateCreateCustomer = [
  check("name")
    .notEmpty()
    .withMessage("name is required")
    .isString()
    .withMessage("name must be a string"),

  check("phoneNumber")
    .notEmpty()
    .withMessage("phoneNumber is required")
    .isString()
    .withMessage("phoneNumber must be a string"),

  check("password")
    .notEmpty()
    .withMessage("password is required")
    .isString()
    .withMessage("password must be a string"),

  check("region")
    .notEmpty()
    .withMessage("region is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid region");
      }
      const regionExists = await Region.findById(value);
      if (!regionExists) {
        throw new Error("region does not exist");
      }
    }),

  check("subRegion")
    .notEmpty()
    .withMessage("subRegion is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid subRegion");
      }
      const regionExists = await SubRegion.findById(value);
      if (!regionExists) {
        throw new Error("subRegion does not exist");
      }
    }),
]

export const validateUpdateCustomer = [
  check("name")
    .optional()
    .isString()
    .withMessage("name must be a string"),

  check("phoneNumber")
    .optional()
    .isString()
    .withMessage("phoneNumber must be a string"),

  check("password")
    .optional()
    .isString()
    .withMessage("password must be a string"),

  check("region")
    .optional()
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid region");
      }
      const regionExists = await Region.findById(value);
      if (!regionExists) {
        throw new Error("region does not exist");
      }
    }),

  check("subRegion")
    .optional()
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid subRegion");
      }
      const regionExists = await SubRegion.findById(value);
      if (!regionExists) {
        throw new Error("subRegion does not exist");
      }
    }),
]

/************************************ Car Middlewares ************************************/
export const validateCreateCar = [
  check("type")
    .notEmpty()
    .withMessage("Type is required")
    .isString()
    .withMessage("Type must be a string"),

  check("maxWeight")
    .notEmpty()
    .withMessage("MaxWeight is required")
    .isFloat({ min: 0 })
    .withMessage("MaxWeight must be a float"),

  check("image").custom((value, { req }) => {
    if (!req.file) {
      throw new Error("Image is required");
    }
    if (!validFileTypes.includes(req.file.mimetype)) {
      throw new Error("Invalid file type");
    }
    return true;
  }),

  check("number")
    .notEmpty()
    .withMessage("Number is required")
    .isString()
    .withMessage("Number must be a string"),
];

export const validateUpdateCar = [
  check("id")
    .isMongoId()
    .withMessage("Car ID must be a valid MongoDB ObjectId")
    .custom(async (id) => {
      const car = await Car.findById(id);
      if (!car) {
        throw new Error("Car ID does not exist");
      }
      return true;
    }),

  check("type").optional().isString().withMessage("Type must be a string"),

  check("maxWeight")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("MaxWeight must be a float"),

  check("number").optional().isString().withMessage("Number must be a string"),
];

/************************************ Offer Middlewares ************************************/
export const validateCreateOffer = [
  check("supplierId")
  .notEmpty()
  .withMessage("SupplierId is required")
  .custom(async (value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error("Invalid SupplierID");
    }
    const supplierExists = await Supplier.findById(value);
    if (!supplierExists) {
      throw new Error("supplier does not exist");
    }
  }),

  check("title")
    .notEmpty()
    .withMessage("title is required")
    .isString()
    .withMessage("title must be a string"),

    check("desc")
    .notEmpty()
    .withMessage("desc is required")
    .isString()
    .withMessage("desc must be a string"),

  check("price")
    .notEmpty()
    .withMessage("price is required")
    .isFloat()
    .withMessage("price must be a float"),

  check("stock")
    .notEmpty()
    .withMessage("stock is required")
    .isInt()
    .withMessage("stock must be a int"),

  check("afterSale")
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && typeof value !== 'number') {
        throw new Error("afterSale must be a float or null");
      }
      return true;
    }),

  check("afterSaleExpireDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("afterSaleExpireDate must be a valid ISO 8601 date"),

    check("minLimit")
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && typeof value !== 'number') {
        throw new Error("minLimit must be a float or null");
      }
      return true;
    }),

  check("maxLimit")
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && typeof value !== 'number') {
        throw new Error("maxLimit must be a float or null");
      }
      return true;
    }),

    /** products */
    check("products")
      .notEmpty()
      .withMessage("Products is required")
      .isArray()
      .withMessage("Products must be an array"),

    body("products.*.productId")
      .notEmpty()
      .withMessage("Product ID is required")
      .isMongoId()
      .withMessage("Product ID must be a valid MongoDB ID")
      .custom(async (productId) => {
        const productExists = await SupplierProduct.findById(productId);
        if (!productExists) {
          throw new Error("Product not found in SupplierProduct collection");
        }
        return true;
      }),

    body("products.*.quantity")
      .notEmpty()
      .withMessage("Quantity is required")
      .isInt({ min: 0 })
      .withMessage("Quantity must be a Integer"),
]

export const validateUpdateOffer = [
  check("supplierId")
  .optional()
  .custom(async (value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error("Invalid SupplierID");
    }
    const supplierExists = await Supplier.findById(value);
    if (!supplierExists) {
      throw new Error("supplier does not exist");
    }
  }),

  check("title")
    .optional()
    .isString()
    .withMessage("title must be a string"),

  check("desc")
    .optional()
    .isString()
    .withMessage("desc must be a string"),

  check("price")
    .optional()
    .isFloat()
    .withMessage("price must be a float"),

  check("stock")
    .optional()
    .isInt()
    .withMessage("stock must be a int"),

  check("afterSale")
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && typeof value !== 'number') {
        throw new Error("afterSale must be a float or null");
      }
      return true;
    }),

  check("afterSaleExpireDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("afterSaleExpireDate must be a valid ISO 8601 date"),

    check("minLimit")
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && typeof value !== 'number') {
        throw new Error("minLimit must be a float or null");
      }
      return true;
    }),

  check("maxLimit")
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && typeof value !== 'number') {
        throw new Error("maxLimit must be a float or null");
      }
      return true;
    }),

  /** products */
  check("products")
    .optional()
    .isArray()
    .withMessage("Products must be an array"),

  body("products.*.productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Product ID must be a valid MongoDB ID")
    .custom(async (productId) => {
      const productExists = await SupplierProduct.findById(productId);
      if (!productExists) {
        throw new Error("Product not found in SupplierProduct collection");
      }
      return true;
    }),

  body("products.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a Integer"),
]

/************************************ Unit Middlewares ************************************/
export const validateCreateUnit = [
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),

  check("maxNumber")
    .notEmpty()
    .withMessage("MaxNumber is required")
    .isFloat({ min: 0 })
    .withMessage("MaxNumber must be a positive integer"),
];

export const validateUpdateUnit = [
  check("id")
    .isMongoId()
    .withMessage("Unit ID must be a valid MongoDB ObjectId")
    .custom(async (id) => {
      const unit = await Unit.findById(id);
      if (!unit) {
        throw new Error("Unit ID does not exist");
      }
      return true;
    }),

  check("name").optional().isString().withMessage("Name must be a string"),

  check("maxNumber")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("MaxNumber must be a positive integer"),
];

/************************************ SubUnit Middlewares ************************************/
export const validateCreateSubUnit = [
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),
];

export const validateUpdateSubUnit = [
  check("id")
    .isMongoId()
    .withMessage("SubUnit ID must be a valid MongoDB ObjectId")
    .custom(async (id) => {
      const subUnit = await SubUnit.findById(id);
      if (!subUnit) {
        throw new Error("SubUnit ID does not exist");
      }
      return true;
    }),

  check("name").optional().isString().withMessage("Name must be a string"),
];

/************************************ Reason Middlewares ************************************/
export const validateCreateReason = [
  check("description")
    .notEmpty()
    .withMessage("description is required")
    .isString()
    .withMessage("description must be a string"),

  check("type")
    .notEmpty()
    .withMessage("Type is required")
    .isIn(["cancelled", "returned"])
    .withMessage("Type must be cancelled or returned"),
];

export const validateUpdateReason = [
  check("id")
    .isMongoId()
    .withMessage("Reason ID must be a valid MongoDB ObjectId")
    .custom(async (id) => {
      const reason = await ReasonOfCancelOrReturn.findById(id);
      if (!reason) {
        throw new Error("Reason ID does not exist");
      }
      return true;
    }),

  check("description")
    .optional()
    .isString()
    .withMessage("description must be a string"),

  check("type")
    .optional()
    .isIn(["cancelled", "returned"])
    .withMessage("Type must be cancelled or returned"),
];

/************************************ Region Middlewares ************************************/
export const validateCreateRegion = [
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),
];

export const validateUpdateRegion = [
  check("id")
    .isMongoId()
    .withMessage("Region ID must be a valid MongoDB ObjectId")
    .custom(async (id) => {
      const region = await Region.findById(id);
      if (!region) {
        throw new Error("Region ID does not exist");
      }
      return true;
    }),

  check("name").optional().isString().withMessage("Name must be a string"),
];

/************************************ SubRegion Middlewares ************************************/
export const validateCreateSubRegion = [
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),

  check("regionId")
    .notEmpty()
    .withMessage("RegionId is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid RegionId");
      }
      const regionExists = await Region.findById(value);
      if (!regionExists) {
        throw new Error("RegionId does not exist");
      }
    }),
];

export const validateUpdateSubRegion = [
  check("id")
    .isMongoId()
    .withMessage("SubRegion ID must be a valid MongoDB ObjectId")
    .custom(async (id) => {
      const subRegion = await SubRegion.findById(id);
      if (!subRegion) {
        throw new Error("SubRegion ID does not exist");
      }
      return true;
    }),

  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),
];

/************************************ Group Middlewares ************************************/
export const validateCreateGroup = [
  check("region").custom(async (region) => {
    if (region === null || typeof region === "string") {
      if (region !== null) {
        const regionData = await Region.findOne({ name: region });
        if (!regionData) {
          throw new Error("Region Not Found");
        }
      }
      return true;
    } else {
      throw new Error("Region must be a string or null");
    }
  }),

  check("subRegion").custom(async (subRegion) => {
    if (subRegion === null || typeof subRegion === "string") {
      if (subRegion !== null) {
        const regionData = await SubRegion.findOne({ name: subRegion });
        if (!regionData) {
          throw new Error("SubRegion Not Found");
        }
      }
      return true;
    } else {
      throw new Error("SubRegion must be a string or null");
    }
  }),

  check("supplierId")
    .notEmpty()
    .withMessage("SupplierId is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid SupplierId");
      }
      const supplierExists = await Supplier.findById(value);
      if (!supplierExists) {
        throw new Error("SupplierId does not exist");
      }
    }),
];

/************************************ Order Middlewares ************************************/
export const validateCreateOrder = [
  check("supplierId")
    .notEmpty()
    .withMessage("SupplierId is required")
    .isMongoId()
    .withMessage("Invalid SupplierId"),

  check("promoCode").custom(async (promoCode) => {
    if (promoCode === null || typeof promoCode === "string") {
      return true;
    } else {
      throw new Error("PromoCode must be a string or null");
    }
  }),

  check("customerId")
    .notEmpty()
    .withMessage("CustomerId is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid CustomerId");
      }
      const customerExists = await Customer.findById(value);
      if (!customerExists) {
        throw new Error("CustomerId does not exist");
      }
    }),

  check("customerName")
    .notEmpty()
    .withMessage("CustomerName is required")
    .isString()
    .withMessage("CustomerName must be a string"),

  check("customerPhoneNumber")
    .notEmpty()
    .withMessage("CustomerPhoneNumber is required")
    .isString()
    .withMessage("CustomerPhoneNumber must be a string"),

  check("totalPrice")
    .notEmpty()
    .withMessage("TotalPrice is required")
    .isFloat()
    .withMessage("TotalPrice must be a float"),

  check("subTotalPrice")
    .notEmpty()
    .withMessage("SubTotalPrice is required")
    .isFloat()
    .withMessage("SubTotalPrice must be a float"),

  check("deliveryFees")
    .notEmpty()
    .withMessage("DeliveryFees is required")
    .isFloat()
    .withMessage("DeliveryFees must be a float"),

  check("discount")
    .notEmpty()
    .withMessage("Discount is required")
    .isFloat()
    .withMessage("Discount must be a float"),

  check("type")
    .notEmpty()
    .withMessage("Type is required")
    .isIn(["onDelivery", "onSite"])
    .withMessage("Type must be a onDelivery or onSite"),

  check("address").custom(async (address) => {
    if (address === null || typeof address === "string") {
      return true;
    } else {
      throw new Error("Address must be a string or null");
    }
  }),

  check("district").custom(async (district) => {
    if (district === null || typeof district === "string") {
      return true;
    } else {
      throw new Error("District must be a string or null");
    }
  }),

  check("subRegion").custom(async (subRegion) => {
    if (subRegion === null || typeof subRegion === "string") {
      return true;
    } else {
      throw new Error("SubRegion must be a string or null");
    }
  }),

  check("deliveryDaysNumber").custom(async (deliveryDaysNumber) => {
    if (deliveryDaysNumber === null || typeof deliveryDaysNumber === "number") {
      return true;
    } else {
      throw new Error("DeliveryDaysNumber must be a number or null");
    }
  }),

  check("orderWeight")
    .notEmpty()
    .withMessage("OrderWeight is required")
    .isFloat()
    .withMessage("OrderWeight must be a float"),

  check("latitude").custom(async (latitude) => {
    if (latitude === null || typeof latitude === "number") {
      return true;
    } else {
      throw new Error("Latitude must be a number or null");
    }
  }),

  check("longitude").custom(async (longitude) => {
    if (longitude === null || typeof longitude === "number") {
      return true;
    } else {
      throw new Error("Longitude must be a number or null");
    }
  }),

  check("car")
    .notEmpty()
    .withMessage("Car is required")
    .isMongoId()
    .withMessage("Car must be a valid MongoDB ID"),

  check("isGroup").custom(async (isGroup) => {
    if (isGroup === null || typeof isGroup === "boolean") {
      return true;
    } else {
      throw new Error("IsGroup must be a boolean or null");
    }
  }),

  /** products */
  check("products")
    .notEmpty()
    .withMessage("Products is required")
    .isArray()
    .withMessage("Products must be an array"),

  body("products.*.product")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Product ID must be a valid MongoDB ID")
    .custom(async (productId) => {
      const productExists = await SupplierProduct.findById(productId);
      if (!productExists) {
        throw new Error("Product not found in SupplierProduct collection");
      }
      return true;
    }),

  body("products.*.productWeight")
    .notEmpty()
    .withMessage("Product weight is required")
    .isFloat({ min: 0 })
    .withMessage("Product weight must be a float"),

  body("products.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a Integer"),

  /** offers */
  check("offers")
    .notEmpty()
    .withMessage("Offers is required")
    .isArray()
    .withMessage("Offers must be an array"),

  body("offers.*.offer")
    .notEmpty()
    .withMessage("Offer ID is required")
    .isMongoId()
    .withMessage("Offer must be a valid MongoDB ID")
    .custom(async (offerId) => {
      const offerExists = await Offer.findById(offerId);
      if (!offerExists) {
        throw new Error("Offer not found in Offer collection");
      }
      return true;
    }),

  body("offers.*.offerWeight")
    .notEmpty()
    .withMessage("Offer weight is required")
    .isFloat({ min: 0 })
    .withMessage("Offer weight must be a float"),

  body("offers.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a Integer"),
];

/************************************ ProductSupplier Middlewares ************************************/
export const validateCreateSupplierProduct = [
  check("supplierId")
    .notEmpty()
    .withMessage("SupplierId is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid SupplierId");
      }
      const supplierExists = await Supplier.findById(value);
      if (!supplierExists) {
        throw new Error("SupplierId does not exist");
      }
      if (supplierExists.status === "inactive") {
        throw new Error("Supplier is inactive");
      }
    }),

  check("productId")
    .notEmpty()
    .withMessage("ProductId is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid ProductId");
      }
      const productExists = await Product.findById(value);
      if (!productExists) {
        throw new Error("ProductId does not exist");
      }
    }),

  check("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat()
    .withMessage("Price must be a float"),

  check("stock")
    .notEmpty()
    .withMessage("Stock is required")
    .isInt({ min: 0 })
    .withMessage("Stock must be a Integer"),

  // check("minLimit")
  //   .optional({ nullable: true })
  //   .isInt({ min: 0 })
  //   .withMessage("MinLimit must be a Integer"),

  // check("maxLimit")
  //   .optional({ nullable: true })
  //   .isInt({ min: 0 })
  //   .withMessage("MaxLimit must be a Integer"),

  // check("afterSale")
  //   .optional({ nullable: true })
  //   .isFloat()
  //   .withMessage("AfterSale must be a float"),

  check("unit")
    .optional({ nullable: true })
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid unit");
      }
      const unitExists = await Unit.findById(value);
      if (!unitExists) {
        throw new Error("Unit does not exist");
      }
    }),
];

/************************************ Inventory Middlewares ************************************/
export const validateCreateInventory = [
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),
];

/************************************ Purchase Middlewares ************************************/
export const validateCreatePurchase = [
  check("admin")
    .notEmpty()
    .withMessage("Admin is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid Admin");
      }
      const adminExists = await Admin.findById(value);
      if (!adminExists) {
        throw new Error("Admin does not exist");
      }
    }),

  check("inventory._id")
    .notEmpty()
    .withMessage("Inventory is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid Inventory");
      }
      const inventoryExists = await Inventory.findById(value);
      if (!inventoryExists) {
        throw new Error("Inventory does not exist");
      }
    }),

  check("customerSupplierInventory._id")
    .notEmpty()
    .withMessage("customerSupplierInventory is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid SupplierInventory");
      }
      const supplierInventoryExists = await SupplierInventory.findById(value);
      if (!supplierInventoryExists) {
        throw new Error("SupplierInventory does not exist");
      }
    }),

  check("note").custom(async (note) => {
    if (note === null || typeof note === "string") {
      return true;
    } else {
      throw new Error("Note must be a string or null");
    }
  }),

  check("totalAmount")
    .notEmpty()
    .withMessage("TotalAmount is required")
    .isFloat()
    .withMessage("TotalAmount must be a float"),

  check("paidAmount")
    .notEmpty()
    .withMessage("PaidAmount is required")
    .isFloat()
    .withMessage("PaidAmount must be a float"),

  check("dueAmount")
    .notEmpty()
    .withMessage("DueAmount is required")
    .isFloat()
    .withMessage("DueAmount must be a float"),

  check("taxes")
    .notEmpty()
    .withMessage("Taxes is required")
    .isFloat({ min: 0 })
    .withMessage("Taxes must be a float, min: 0"),

  /** products */
  check("products")
    .notEmpty()
    .withMessage("Products is required")
    .isArray()
    .withMessage("Products must be an array"),

  body("products.*._id")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Product ID must be a valid MongoDB ID")
    .custom(async (productId) => {
      const productExists = await Product.findById(productId);
      if (!productExists) {
        throw new Error("Product not found in Product collection");
      }
      return true;
    }),

  body("products.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a Integer"),

  body("products.*.costPrice")
    .notEmpty()
    .withMessage("CostPrice is required")
    .isFloat()
    .withMessage("CostPrice must be a float"),

  body("products.*.retailPrice")
    .notEmpty()
    .withMessage("RetailPrice is required")
    .isFloat()
    .withMessage("RetailPrice must be a float"),

  body("products.*.wholesalePrice")
    .notEmpty()
    .withMessage("WholesalePrice is required")
    .isFloat()
    .withMessage("WholesalePrice must be a float"),

  body("products.*.haveWholeSalePrice")
    .notEmpty()
    .withMessage("HaveWholeSalePrice is required")
    .isFloat()
    .withMessage("HaveWholeSalePrice must be a float"),

  // body("products.*.productionDate")
  //   .notEmpty()
  //   .withMessage("ProductionDate weight is required")
  //   .isISO8601()
  //   .withMessage("ProductionDate weight must be a date"),

  body("products.*.expiryDate")
    .custom((value) => {
      if (value === null) {    // Allow null value
        return true;
      }
      
      // Check if it's a valid ISO8601 date
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
        throw new Error("ExpiryDate must be a valid ISO8601 date");
      }

      const expiryDate = new Date(value);
      const maxDate = new Date("2500-01-01T00:00:00.000Z");

      if (expiryDate >= maxDate) { // Check if the date is less than 2500-01-01T00:00:00.000Z
        throw new Error("ExpiryDate must be before 2500-01-01T00:00:00.000Z");
      }

      return true;
    }),

  body("products.*.unit._id")
    .notEmpty()
    .withMessage("Product UnitId is required")
    .isMongoId()
    .withMessage("Product UnitId must be a valid MongoDB ID")
    .custom(async (unitId) => {
      const unitExists = await Unit.findById(unitId);
      if (!unitExists) {
        throw new Error("UnitId not found in Unit collection");
      }
      return true;
    }),
];

export const validateReturnPurchase = [
  check("cash")
    .notEmpty()
    .withMessage("Cash is required")
    .isBoolean()
    .withMessage("Cash must be a boolean"),

  check("admin")
    .notEmpty()
    .withMessage("Admin is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid Admin");
      }
      const adminExists = await Admin.findById(value);
      if (!adminExists) {
        throw new Error("Admin does not exist");
      }
    }),


  /** products */
  check("products")
    .notEmpty()
    .withMessage("Products is required")
    .isArray()
    .withMessage("Products must be an array"),

  body("products.*.productItemId")
    .notEmpty()
    .withMessage("ProductItemId is required")
    .isMongoId()
    .withMessage("ProductItemId must be a valid MongoDB ID")
    .custom(async (productItemId) => {
      const productItemExists = await PurchaseItem.findById(productItemId);
      if (!productItemExists) {
        throw new Error("Product not found in PurchaseItem collection");
      }
      return true;
    }),

  body("products.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a Integer"),
];

/************************************ Sale Middlewares ************************************/
export const validateCreateSale = [
  check("admin")
    .notEmpty()
    .withMessage("Admin is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid Admin");
      }
      const adminExists = await Admin.findById(value);
      if (!adminExists) {
        throw new Error("Admin does not exist");
      }
    }),

  check("inventory._id")
    .notEmpty()
    .withMessage("Inventory is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid Inventory");
      }
      const inventoryExists = await Inventory.findById(value);
      if (!inventoryExists) {
        throw new Error("Inventory does not exist");
      }
    }),

  check("customerSupplierInventory._id")
    .optional()
    .custom(async (value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid SupplierInventory");
      }
      if (value) {
        const customerInventoryExists = await CustomerInventory.findById(value);
        if (!customerInventoryExists) {
          throw new Error("CustomerInventory does not exist");
        }
      }
    })
    .withMessage("customerSupplierInventory is required when present"),


  check("note").custom(async (note) => {
    if (note === null || typeof note === "string") {
      return true;
    } else {
      throw new Error("Note must be a string or null");
    }
  }),

  check("totalAmount")
    .notEmpty()
    .withMessage("TotalAmount is required")
    .isFloat()
    .withMessage("TotalAmount must be a float"),

  check("paidAmount")
    .notEmpty()
    .withMessage("PaidAmount is required")
    .isFloat()
    .withMessage("PaidAmount must be a float"),

  check("dueAmount")
    .notEmpty()
    .withMessage("DueAmount is required")
    .isFloat()
    .withMessage("DueAmount must be a float"),

  check("taxes")
    .notEmpty()
    .withMessage("Taxes is required")
    .isFloat({ min: 0 })
    .withMessage("Taxes must be a float, min: 0"),

  /** products */
  check("products")
    .notEmpty()
    .withMessage("Products is required")
    .isArray()
    .withMessage("Products must be an array"),

  body("products.*._id")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Product ID must be a valid MongoDB ID")
    .custom(async (productId) => {
      const productExists = await Product.findById(productId);
      if (!productExists) {
        throw new Error("Product not found in Product collection");
      }
      return true;
    }),

  body("products.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a Integer"),

  body("products.*.salePrice")
    .notEmpty()
    .withMessage("SalePrice is required")
    .isFloat()
    .withMessage("SalePrice must be a float"),

  body("products.*.type")
    .notEmpty()
    .withMessage("Type is required")
    .isString()
    .withMessage("Type must be a string")
    .custom((value) => {
      const allowedTypes = ['gomla', 'nosGomla', 'retail'];
      if (!allowedTypes.includes(value)) {
        throw new Error("Type must be one of 'gomla', 'nosGomla' or 'retail'");
      }
      return true;
    }),

  body("products.*.unit._id")
    .custom((value, { req, path }) => {
      // Extract the index of the product from the path
      const productIndex = parseInt(path.match(/\d+/)[0]);
      const product = req.body.products[productIndex];
  
      if (product.type !== 'retail') {
        // If type is not 'retail', unit._id is required
        if (!value) {
          throw new Error("Product UnitId is required when type is not 'retail'");
        }
        // Check if the value is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error("Product UnitId must be a valid MongoDB ID");
        }
      }
      return true;
    })
    .custom(async (unitId, { req, path }) => {
      const productIndex = parseInt(path.match(/\d+/)[0]);
      const product = req.body.products[productIndex];
  
      if (product.type !== 'retail') {
        const unitExists = await Unit.findById(unitId);
        if (!unitExists) {
          throw new Error("UnitId not found in Unit collection");
        }
      }
      return true;
    }),

  body("products.*.subUnit._id")
    .notEmpty()
    .withMessage("Product SubUnitId is required")
    .isMongoId()
    .withMessage("Product SubUnitId must be a valid MongoDB ID")
    .custom(async (subUnitId) => {
      const subUnitExists = await SubUnit.findById(subUnitId);
      if (!subUnitExists) {
        throw new Error("SubUnitId not found in SubUnit collection");
      }
      return true;
    }),
];

export const validateReturnSale = [
  check("cash")
    .notEmpty()
    .withMessage("Cash is required")
    .isBoolean()
    .withMessage("Cash must be a boolean"),

  check("admin")
    .notEmpty()
    .withMessage("Admin is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid Admin");
      }
      const adminExists = await Admin.findById(value);
      if (!adminExists) {
        throw new Error("Admin does not exist");
      }
    }),

  /** products */
  check("products")
    .notEmpty()
    .withMessage("Products is required")
    .isArray()
    .withMessage("Products must be an array"),

  body("products.*.productItemId")
    .notEmpty()
    .withMessage("ProductItemId is required")
    .isMongoId()
    .withMessage("ProductItemId must be a valid MongoDB ID")
    .custom(async (productItemId) => {
      const saleItemExists = await SaleItem.findById(productItemId);
      if (!saleItemExists) {
        throw new Error("Product not found in SaleItem collection");
      }
      return true;
    }),

  body("products.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a Integer"),

  body("products.*.expiryDate")
    .notEmpty()
    .withMessage("ExpiryDate is required")
    .isISO8601()
    .withMessage("ExpiryDate weight must be a date"),
];

/************************************ Settlement Middlewares ************************************/
export const validatePostSettlement = [
  check("inventoryId")
    .notEmpty()
    .withMessage("Inventory is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid Inventory");
      }
      const inventoryExists = await Inventory.findById(value);
      if (!inventoryExists) {
        throw new Error("Inventory does not exist");
      }
    }),

  /** products */
  check("products")
    .notEmpty()
    .withMessage("Products is required")
    .isArray()
    .withMessage("Products must be an array"),

  body("products.*._id")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Product ID must be a valid MongoDB ID")
    .custom(async (productId) => {
      const productExists = await Product.findById(productId);
      if (!productExists) {
        throw new Error("Product not found in Product collection");
      }
      return true;
    }),

  body("products.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a Integer"),
];

export const validatePatchSettlement = [
  check("admin")
    .notEmpty()
    .withMessage("Admin is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid Admin");
      }
      const adminExists = await Admin.findById(value);
      if (!adminExists) {
        throw new Error("Admin does not exist");
      }
    }),

  check("inventoryId")
    .notEmpty()
    .withMessage("Inventory is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid Inventory");
      }
      const inventoryExists = await Inventory.findById(value);
      if (!inventoryExists) {
        throw new Error("Inventory does not exist");
      }
    }),

  /** products */
  check("products")
    .notEmpty()
    .withMessage("Products is required")
    .isArray()
    .withMessage("Products must be an array"),

  body("products.*.productItemId")
    .notEmpty()
    .withMessage("productItemId is required")
    .isMongoId()
    .withMessage("productItemId must be a valid MongoDB ID")
    .custom(async (productId) => {
      const purchaseItemExists = await PurchaseItem.findById(productId);
      if (!purchaseItemExists) {
        throw new Error("PurchaseItem not found in PurchaseItem collection");
      }
      return true;
    }),

  body("products.*.reminderQuantity")
    .notEmpty()
    .withMessage("ReminderQuantity is required")
    .isInt({ min: 0 })
    .withMessage("ReminderQuantity must be a Integer"),
];

/************************************ DetailedAccount Middlewares ************************************/
export const validateCreateDetailedAccount = [
  check("admin")
    .notEmpty()
    .withMessage("Admin is required")
    .custom(async (value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid Admin");
      }
      const adminExists = await Admin.findById(value);
      if (!adminExists) {
        throw new Error("Admin does not exist");
      }
    }),

  body("deposit")
    .notEmpty()
    .withMessage("Deposit is required")
    .isFloat()
    .withMessage("Deposit must be a float"),
];
