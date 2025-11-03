import express from "express";
import {
  getResources,
  addResource,
  bulkAddResources,
  getResourceById,
  searchResources
} from "../controllers/resource.controller.js";

const router = express.Router();

// Public routes
router.get("/", getResources);
router.get("/search", searchResources);
router.get("/:id", getResourceById);

// Admin routes (you can add authentication later)
router.post("/", addResource);
router.post("/bulk", bulkAddResources);

export default router;
