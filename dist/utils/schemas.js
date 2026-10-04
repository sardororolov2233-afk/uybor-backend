"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listingSchema = void 0;
const zod_1 = require("zod");
exports.listingSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required'),
    description: zod_1.z.string().optional(),
    price: zod_1.z.number().min(0, 'Price must be greater than or equal to 0'),
    rooms: zod_1.z.number().int().min(1, 'At least 1 room is required'),
    propertyType: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
});
