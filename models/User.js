import { Schema, model, models } from "mongoose";
import bcrypt from 'bcryptjs'

const UserSchema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  role: {
    type: String,
    enum: ['MANAGER', 'EMPLOYEE'],
    required: [true, 'Role is required']
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required']
  },
  profile: {
    phone: String,
    position: String,
    department: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    console.log("UserSchema: Password not modified, skipping hash");
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    console.log("UserSchema: Password hashed:", {
      original: this.password,
      hashed: this.password,
    });
    next();
  } catch (error) {
    console.error("UserSchema: Hashing error:", error);
    next(error);
  }
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  console.log("UserSchema: Compare password:", {
    candidatePassword,
    storedPassword: this.password,
    isMatch,
  });
  return isMatch;
};

UserSchema.methods.toJSON = function() {
  const userObject = this.toObject()
  delete userObject.password
  return userObject
}

export default models?.User || model("User", UserSchema);