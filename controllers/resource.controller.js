import prisma from "../db/config.js";

// Get resources by topic/category
export async function getResources(req, res, next) {
  try {
    const { topic, category, difficulty, subtopic } = req.query;

    const where = {};
    if (topic) where.topic = topic;
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (subtopic) where.subtopic = subtopic;

    const resources = await prisma.resource.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      count: resources.length,
      resources
    });
  } catch (error) {
    console.error("Error in getResources:", error);
    next(error);
  }
}

// Add new resource
export async function addResource(req, res, next) {
  try {
    const { category, topic, subtopic, title, url, description, difficulty, tags } = req.body;

    if (!category || !topic || !title || !url) {
      return res.status(400).json({
        success: false,
        error: "Category, topic, title, and URL are required"
      });
    }

    const resource = await prisma.resource.create({
      data: {
        category,
        topic,
        subtopic: subtopic || null,
        title,
        url,
        description: description || null,
        difficulty: difficulty || null,
        tags: tags || []
      }
    });

    res.status(201).json({
      success: true,
      message: "Resource added successfully",
      resource
    });
  } catch (error) {
    console.error("Error in addResource:", error);
    next(error);
  }
}

// Bulk add resources
export async function bulkAddResources(req, res, next) {
  try {
    const { resources } = req.body;

    if (!Array.isArray(resources) || resources.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Resources array is required"
      });
    }

    const createdResources = await prisma.resource.createMany({
      data: resources,
      skipDuplicates: true
    });

    res.status(201).json({
      success: true,
      message: `${createdResources.count} resources added successfully`,
      count: createdResources.count
    });
  } catch (error) {
    console.error("Error in bulkAddResources:", error);
    next(error);
  }
}

// Get resource by ID
export async function getResourceById(req, res, next) {
  try {
    const { id } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        error: "Resource not found"
      });
    }

    res.json({
      success: true,
      resource
    });
  } catch (error) {
    console.error("Error in getResourceById:", error);
    next(error);
  }
}

// Search resources
export async function searchResources(req, res, next) {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Search query is required"
      });
    }

    const resources = await prisma.resource.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { topic: { contains: query, mode: 'insensitive' } },
          { subtopic: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      count: resources.length,
      resources
    });
  } catch (error) {
    console.error("Error in searchResources:", error);
    next(error);
  }
}
