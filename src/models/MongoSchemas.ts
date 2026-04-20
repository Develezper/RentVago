import mongoose, { Schema, model, models } from 'mongoose';

const ScrapedListingSchema = new Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  source: { type: String, required: true },
  url: { type: String, unique: true, required: true },
  location: { type: String },
  description: { type: String },
}, { timestamps: true });

const AILogSchema = new Schema({
  action: { type: String, required: true }, 
  modelUsed: { type: String }, 
  promptTokens: { type: Number },
  completionTokens: { type: Number },
  response: { type: Schema.Types.Mixed }, 
}, { timestamps: true });

const ScrapingJobSchema = new Schema({
  status: { 
    type: String, 
    enum: ['pending', 'running', 'completed', 'failed'], 
    default: 'pending' 
  },
  itemsFound: { type: Number, default: 0 },
  errorLog: { type: String },
}, { timestamps: true });

export const ScrapedListing = models.ScrapedListing || model('ScrapedListing', ScrapedListingSchema);
export const AILog = models.AILog || model('AILog', AILogSchema);
export const ScrapingJob = models.ScrapingJob || model('ScrapingJob', ScrapingJobSchema);