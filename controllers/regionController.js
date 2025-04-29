// import { validationResult } from "express-validator";
// import SubRegion from "../models/subRegionSchema.js";

// export const createSubRegion = async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   }
//   try{
//     const existOldSubRegion = await SubRegion.findOne({ name: req.body.name, regionId: req.body.regionId });
//     if(existOldSubRegion){
//       return res.status(207).json({
//         status: 'fail',
//         message: 'SubRegion already exists',
//       });
//     }
//     const newSubRegion = await SubRegion.create({ name: req.body.name, regionId: req.body.regionId, address: req.body.address });
//     res.status(201).json({
//       status: 'success',
//       data: newSubRegion,
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: 'fail',
//       message: error.message,
//     });
//   }
// }

// export const updateSubRegion = async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   }
//   try{
//     const existOldSubRegion = await SubRegion.findOne({ name: req.body.name, regionId: req.body.regionId });
//     if(existOldSubRegion){
//       return res.status(207).json({
//         status: 'fail',
//         message: 'SubRegion already exists',
//       });
//     }
//     const newSubRegion = await SubRegion.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//       runValidators: true
//     });
//     res.status(201).json({
//       status: 'success',
//       data: newSubRegion,
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: 'fail',
//       message: error.message,
//     });
//   }
// }