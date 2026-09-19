import mongoose, { Schema } from 'mongoose';

export interface TradeInValuationRequest {
  category: string;
  brand: string;
  model: string;
  storage: string;
  screenCondition: 'flawless' | 'good' | 'cracked';
  bodyCondition: 'likenew' | 'fair' | 'dented';
  functionalChecks: {
    switchesOn: boolean;
    touchWorking: boolean;
    cameraClear: boolean;
    batteryHealthy: boolean;
  };
  accessories: {
    hasBox: boolean;
    hasCharger: boolean;
    hasBill: boolean;
  };
}

export interface TradeInPickupRequest {
  id?: string;
  userId?: string;
  category: string;
  brand: string;
  model: string;
  storage: string;
  valuationAmount: number;
  customerName: string;
  customerPhone: string;
  pincode: string;
  address: string;
  status?: string;
}

export interface ITradeInRequest {
  id: string;
  user_id?: string;
  category: string;
  brand: string;
  model: string;
  storage: string;
  valuation_amount: number;
  customer_name: string;
  customer_phone: string;
  pincode: string;
  address: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export function calculateInstantQuote(req: TradeInValuationRequest): {
  valuation: number;
  currency: string;
  validDays: number;
  breakdown: Record<string, number>;
} {
  let base = 52000;
  const cat = req.category.toLowerCase();
  if (cat.includes('macbook')) base = 85000;
  else if (cat.includes('laptop')) base = 42000;
  else if (cat.includes('tablet')) base = 31000;
  else if (cat.includes('watch') || cat.includes('audio')) base = 16000;

  // Storage bonus/reduction
  let storageMod = 0;
  if (req.storage.includes('1 TB')) storageMod = 9000;
  else if (req.storage.includes('512 GB')) storageMod = 5000;
  else if (req.storage.includes('64 GB')) storageMod = -4000;

  // Screen deduction
  let screenMod = 0;
  if (req.screenCondition === 'good') screenMod = -4500;
  if (req.screenCondition === 'cracked') screenMod = -11000;

  // Body deduction
  let bodyMod = 0;
  if (req.bodyCondition === 'fair') bodyMod = -2500;
  if (req.bodyCondition === 'dented') bodyMod = -6000;

  // Accessories bonus
  let accessoriesMod = 0;
  if (req.accessories?.hasBox) accessoriesMod += 800;
  if (req.accessories?.hasCharger) accessoriesMod += 1000;
  if (req.accessories?.hasBill) accessoriesMod += 500;

  let total = base + storageMod + screenMod + bodyMod + accessoriesMod;

  if (req.functionalChecks && !req.functionalChecks.switchesOn) {
    total = Math.round(total * 0.35);
  }
  if (req.functionalChecks && !req.functionalChecks.touchWorking) {
    total -= 4000;
  }

  const finalValuation = Math.max(total, 2500);

  return {
    valuation: finalValuation,
    currency: 'INR',
    validDays: 7,
    breakdown: {
      baseEstimate: base,
      storageAdjustment: storageMod,
      screenAdjustment: screenMod,
      bodyAdjustment: bodyMod,
      accessoriesBonus: accessoriesMod,
    },
  };
}

const TradeInRequestSchema = new Schema<ITradeInRequest>(
  {
    user_id: { type: String, default: null, index: true },
    category: { type: String, required: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    storage: { type: String, required: true },
    valuation_amount: { type: Number, required: true },
    customer_name: { type: String, required: true },
    customer_phone: { type: String, required: true },
    pincode: { type: String, required: true },
    address: { type: String, required: true },
    status: { type: String, default: 'scheduled', index: true },
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

export const TradeInModel =
  (mongoose.models.TradeInRequest as mongoose.Model<ITradeInRequest>) || mongoose.model<ITradeInRequest>('TradeInRequest', TradeInRequestSchema);
