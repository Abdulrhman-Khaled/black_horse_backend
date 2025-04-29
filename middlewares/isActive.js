export const checkAllFieldsFilled = (req, res, next) => {
  const supplierData = req.body;
  const hasEmptyFields = Object.values(supplierData).some(value => value === null || value === undefined || value === '');
  if (!hasEmptyFields) {
    req.status = "active";
  }
  next();
};