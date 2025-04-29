import { body, validationResult } from 'express-validator';

export const validateEmail = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validatePhoneNumber = [
  body().custom((req) => {
    const phoneNumber = req.phoneNumber;
    const newPhone = req.newPhone;
    const pattern = /^01[0-2,5]\d{8}$/;
    const regExp = new RegExp(pattern);

    if (!phoneNumber && !newPhone) {
      throw new Error('Please provide either phoneNumber or newPhone');
    }
    if (phoneNumber && !regExp.test(phoneNumber)) {
      throw new Error('Please enter a valid phone number for phoneNumber');
    }
    if (newPhone && !regExp.test(newPhone)) {
      throw new Error('Please enter a valid phone number for newPhone');
    }
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
