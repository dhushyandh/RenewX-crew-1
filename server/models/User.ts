import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser {
  id: string;
  email: string;
  password?: string;
  role: 'admin' | 'customer';
  full_name?: string;
  avatar_url?: string;
  notification_preferences?: {
    order_updates: boolean;
    sell_request_updates: boolean;
    marketing: boolean;
  };
  created_at: Date;
  updated_at: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'customer';
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface UpdateUserRoleDTO {
  role: 'admin' | 'customer';
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['admin', 'customer'],
      default: 'customer',
      index: true,
    },
    full_name: {
      type: String,
      default: '',
    },
    avatar_url: {
      type: String,
      default: '',
    },
    notification_preferences: {
      order_updates: { type: Boolean, default: true },
      sell_request_updates: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

// Hash password before save
UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
