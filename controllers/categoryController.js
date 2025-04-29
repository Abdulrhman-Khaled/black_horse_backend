import Category from '../models/categorySchema.js';
import fs from 'fs';
import Product from '../models/productSchema.js';
import { transformationCategory, transformationSubCategory, transformationSubSubCategory } from '../format/transformationObject.js';
import SubCategory from '../models/subCategorySchema.js';
import SubSubCategory from '../models/subSubCategorySchema.js';
import SupplierProduct from '../models/supplierProductSchema.js';

export const createCategory = async (req, res) => {
  const categoryData = req.body;
  const categoryName = req.body.name;
  try {
    const oldCategory = await Category.find({ name: categoryName });
    if (oldCategory.length > 0) {
      return res.status(207).json({
        status: 'fail',
        message: 'Category already exists',
      });
    }
    const category = new Category({
      name: categoryData.name,
      image:`${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`
    });
    await category.save();
    res.status(201).json({
      status: 'success',
      data: await transformationCategory(category),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const getAllCategory = async (req,res) => {
  try {
    const categories = await Category.find().sort(req.query.category);
    const transformationCategories = await Promise.all(
      categories.map(async (category) => await transformationCategory(category))
    );
    res.status(200).json({
      status:'success',
      data: transformationCategories
    })
  } catch (error) {
    res.status(500).json({
      status:'fail',
      message: error.message
    }); 
  }
}
export const deleteCategory = async (req, res) => {
  const categoryId = req.params.id;
  try {
    const product = await Product.find({ category: categoryId });
    const subCategory = await SubCategory.find({ category: categoryId });
    if(product.length > 0 || subCategory.length > 0){
      return res.status(207).json({
        status: 'fail',
        message: 'Category is used in products or subCategories',
      })
    }

    const category = await Category.findByIdAndDelete(categoryId);
    if(category.image){
      const pathName = category.image.split('/').slice(3).join('/');
      fs.unlink('upload/' + pathName, (err) => {});
    }
    res.status(200).json({
      status: 'success',
      data: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    })
  }
}
export const updateCategory = async (req, res) => {
  const categoryId = req.params.id;
  const categoryData = req.body;
  try {
    const updateCategory = await Category.findByIdAndUpdate(categoryId, categoryData, { new: true });
    res.status(200).json({
      status:'success',
      data: await transformationCategory(updateCategory)
    });
  } catch (error) {
    res.status(500).json({
      status:'fail',
      message:error.message,
    })
  }
}
export const changeImageCategory = async (req, res) => {
  const categoryId = req.params.id;
  try {
    const category = await Category.findById(categoryId);
    if(category.image){
      const pathName = category.image.split('/').slice(3).join('/');
      fs.unlink('upload/' + pathName, (err) => {});
    }
    category.image = `${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`
    await category.save();
    res.status(200).json({
      status:'success',
      data: await transformationCategory(category)
    })
   } catch (error) {
    res.status(500).json({
      status:'fail',
      message:error.message,
    })
  }
}
/*************************************************** Sub Category ****************************************************/
export const createSubCategory = async (req, res) => {
  const { category, name } = req.body;
  try {
    const subCategory = await SubCategory.findOne({ name, category});
    if (subCategory) {
      return res.status(207).json({
        status: 'fail',
        message: 'Subcategory already exists',
      });
    }

    const newSubCategory = new SubCategory({
      name: name,
      category: category,
    });
    await newSubCategory.save();
    return res.status(201).json({
      status: 'success',
      data:  await transformationSubCategory(newSubCategory),
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
export const getSubCategoryByCategory = async (req, res) => {
  const categoryId = req.params.id;
  try {
    const subCategories = await SubCategory.find({ category: categoryId });
    const transformationSubCategories = await Promise.all(
      subCategories.map(async (subCategory) => await transformationSubCategory(subCategory))
    );
    return res.status(200).json({
      status: 'success',
      data: transformationSubCategories
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
export const updateSubCategory = async (req, res) => {
  const subCategory = req.params.id;
  try{
    const updatedSubCategory = await SubCategory.findById(subCategory);
    if (!updatedSubCategory) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subcategory not found',
      });
    }
    updatedSubCategory.name = req.body.name;
    await updatedSubCategory.save();
    return res.status(200).json({
      status:'success',
      data: await transformationSubCategory(updatedSubCategory),
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const deleteSubCategory = async (req, res) => {
  const subCategoryId = req.params.id;
  try {
    const products = await Product.find({ subCategory: subCategoryId });
    const subSubCategories = await SubSubCategory.find({ subCategory: subCategoryId });
    if (products.length > 0 || subSubCategories.length > 0) {
      return res.status(207).json({
        status: 'fail',
        message: 'Cannot delete subCategory as it is referenced by products or subSubCategories.',
      })
    }

    await SubCategory.deleteOne({ _id: subCategoryId });
    return res.status(200).json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
/*************************************************** SubSub Category ****************************************************/
export const getSubSubCategoryBySubCategory = async (req, res) => {
  const subCategoryId = req.params.id;
  try {
    const subSubCategories = await SubSubCategory.find({ subCategory: subCategoryId });
    const transformationSubSubCategories = await Promise.all(
      subSubCategories.map(async (subSubCategory) => await transformationSubSubCategory(subSubCategory))
    );
    return res.status(200).json({
      status: 'success',
      data: transformationSubSubCategories
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
export const createSubSubCategory = async (req, res) => {
  const { subCategory, name } = req.body;
  try {
    const subSubCategory = await SubSubCategory.findOne({ name, subCategory});
    if (subSubCategory) {
      return res.status(207).json({
        status: 'fail',
        message: 'SubSubCategory already exists',
      });
    }
    const newSubSubCategory = new SubSubCategory({
      name: name,
      subCategory: subCategory,
    });
    await newSubSubCategory.save();
    return res.status(201).json({
      status: 'success',
      data: await transformationSubSubCategory(newSubSubCategory)
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
export const updateSubSubCategory = async (req, res) => {
  const subSubCategory = req.params.id;
  try{
    const updatedSubSubCategory = await SubSubCategory.findById(subSubCategory);
    if (!updatedSubSubCategory) {
      return res.status(404).json({
        status: 'fail',
        message: 'SubSubCategory not found',
      });
    }
    updatedSubSubCategory.name = req.body.name;
    await updatedSubSubCategory.save();
    return res.status(200).json({
      status:'success',
      data: await transformationSubSubCategory(updatedSubSubCategory),
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const deleteSubSubCategory = async (req, res) => {
  const subSubCategoryId = req.params.id;
  try {
    const products = await Product.find({ subSubCategory: subSubCategoryId });
    if (products.length > 0) {
      return res.status(207).json({
        status: 'fail',
        message: 'Cannot delete subSubCategory as it is referenced by products.',
      });
    }

    await SubSubCategory.deleteOne({ _id: subSubCategoryId });
    return res.status(200).json({ message: 'SubSubCategory deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAllCategoriesAndSubCategoriesAndSubSubCategoriesBySupplierId = async (req, res) => {
  const supplierId = req.params.id;
  try {
    const supplierProducts = await SupplierProduct.find({ supplierId: supplierId });
    // if (supplierProducts.length === 0) {
    //   return res.status(404).json({
    //     status: 'fail',
    //     message: 'No products found for the supplier ID'
    //   });
    // }

    const productIds = supplierProducts.map(product => product.productId);
    const products = await Product.find({ _id: { $in: productIds } }).populate('category subCategory subSubCategory');

    // if (products.length === 0) {
    //   return res.status(404).json({
    //     status: 'fail',
    //     message: 'No products found for the supplier ID'
    //   });
    // }

    const categories = [];
    products.forEach(product => {
      const category = {
        _id: product.category._id,
        image: product.category.image,
        name: product.category.name,
        subCategories: []
      };

      const subCategory = {
        _id: product.subCategory._id,
        name: product.subCategory.name,
        subSubCategories: [{
          _id: product.subSubCategory._id,
          name: product.subSubCategory.name
        }]
      };

      const existingCategory = categories.find(cat => cat._id.toString() === category._id.toString());
      if (existingCategory) {
        const existingSubCategory = existingCategory.subCategories.find(subCat => subCat._id.toString() === subCategory._id.toString());
        if (existingSubCategory) {
          if(!existingSubCategory.subSubCategories.some(subSubCat => subSubCat._id.toString() === subCategory.subSubCategories[0]._id.toString())){
            existingSubCategory.subSubCategories.push(subCategory.subSubCategories[0]);
          }
        } else {
          existingCategory.subCategories.push(subCategory);
        }
      } else {
        category.subCategories.push(subCategory);
        categories.push(category);
      }
    });

    // if (categories.length === 0) {
    //   return res.status(404).json({
    //     status: 'fail',
    //     message: 'No categories found for the supplier ID'
    //   });
    // }

    res.status(200).json({
      status: 'success',
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
}
