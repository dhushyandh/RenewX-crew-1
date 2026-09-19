import mongoose, { Schema } from 'mongoose';

export interface INotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  reference_id?: string;
  reference_type?: string;
  read_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user_id: { type: String, required: true, index: true },
    type: { type: String, required: true, default: 'system' },
    title: { type: String, required: true },
    body: { type: String, required: true },
    reference_id: { type: String, default: null },
    reference_type: { type: String, default: null },
    read_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

NotificationSchema.index({ user_id: 1, created_at: -1 });

export const NotificationModel =
  (mongoose.models.Notification as mongoose.Model<INotification>) ||
  mongoose.model<INotification>('Notification', NotificationSchema);
