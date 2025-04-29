import mongoose from "mongoose";

const adminSchema =  mongoose.Schema({
  period: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Period",
    required: function() { return this.type === 'subAdmin' },
  }],
  name: {
    type: String,
    required: [true, 'Admin should have a name'],
  },
  email: {
    type: String,
    unique: [true, 'Admin should have a unique email'],
    match: /^\S+@\S+\.\S+$/,
    required: [true, 'Admin should have an email'],
  },
  password: {
    type: String,
    required: [true, 'Admin should have a password'],
  },
  type: {
    type: String,
    enum: ['admin', 'subAdmin'],
    default: 'subAdmin',
  },
  roles: {
    type: Object,
  },
  deletedAt: {
    type: Date,
  }
});

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
