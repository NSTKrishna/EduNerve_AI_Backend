import prisma from "../db/config.js";

const sampleResources = [
  // React Resources
  {
    category: "documentation",
    topic: "React",
    subtopic: "Hooks",
    title: "React Official Documentation - Hooks",
    url: "https://react.dev/reference/react/hooks",
    description: "Complete guide to React Hooks including useState, useEffect, useContext, and custom hooks",
    difficulty: "intermediate",
    tags: ["react", "hooks", "frontend"]
  },
  {
    category: "video",
    topic: "React",
    subtopic: "Advanced Patterns",
    title: "React Advanced Patterns - Fireship",
    url: "https://www.youtube.com/watch?v=JMS1I6708D8",
    description: "Learn advanced React patterns in 10 minutes",
    difficulty: "advanced",
    tags: ["react", "patterns", "advanced"]
  },
  
  // Node.js Resources
  {
    category: "documentation",
    topic: "Node.js",
    subtopic: "Express",
    title: "Express.js Official Documentation",
    url: "https://expressjs.com/",
    description: "Fast, unopinionated, minimalist web framework for Node.js",
    difficulty: "beginner",
    tags: ["nodejs", "express", "backend"]
  },
  {
    category: "article",
    topic: "Node.js",
    subtopic: "Best Practices",
    title: "Node.js Best Practices",
    url: "https://github.com/goldbergyoni/nodebestpractices",
    description: "The Node.js best practices list (December 2023)",
    difficulty: "intermediate",
    tags: ["nodejs", "best-practices", "backend"]
  },

  // System Design
  {
    category: "video",
    topic: "System Design",
    subtopic: "Fundamentals",
    title: "System Design Course - freeCodeCamp",
    url: "https://www.youtube.com/watch?v=F2FmTdLtb_4",
    description: "Complete system design course for beginners",
    difficulty: "intermediate",
    tags: ["system-design", "architecture", "scalability"]
  },
  {
    category: "article",
    topic: "System Design",
    subtopic: "Microservices",
    title: "Microservices Architecture Pattern",
    url: "https://microservices.io/patterns/microservices.html",
    description: "Comprehensive guide to microservices architecture patterns",
    difficulty: "advanced",
    tags: ["microservices", "architecture", "distributed-systems"]
  },

  // Database
  {
    category: "documentation",
    topic: "SQL",
    subtopic: "Optimization",
    title: "PostgreSQL Query Optimization",
    url: "https://www.postgresql.org/docs/current/performance-tips.html",
    description: "Official PostgreSQL performance optimization guide",
    difficulty: "advanced",
    tags: ["sql", "postgresql", "optimization"]
  },
  {
    category: "video",
    topic: "SQL",
    subtopic: "Joins",
    title: "SQL Joins Explained",
    url: "https://www.youtube.com/watch?v=9yeOJ0ZMUYw",
    description: "Visual guide to SQL joins",
    difficulty: "beginner",
    tags: ["sql", "joins", "database"]
  },

  // DSA
  {
    category: "video",
    topic: "Data Structures",
    subtopic: "Trees",
    title: "Tree Data Structure - freeCodeCamp",
    url: "https://www.youtube.com/watch?v=oSWTXtMglKE",
    description: "Complete guide to tree data structures",
    difficulty: "intermediate",
    tags: ["dsa", "trees", "algorithms"]
  },
  {
    category: "article",
    topic: "Algorithms",
    subtopic: "Dynamic Programming",
    title: "Dynamic Programming Patterns",
    url: "https://leetcode.com/discuss/general-discussion/458695/dynamic-programming-patterns",
    description: "Common patterns for solving dynamic programming problems",
    difficulty: "advanced",
    tags: ["algorithms", "dynamic-programming", "dsa"]
  },

  // JavaScript
  {
    category: "documentation",
    topic: "JavaScript",
    subtopic: "Async/Await",
    title: "MDN - Async/Await",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function",
    description: "Complete guide to async functions and await expressions",
    difficulty: "intermediate",
    tags: ["javascript", "async", "promises"]
  },
  {
    category: "video",
    topic: "JavaScript",
    subtopic: "ES6+ Features",
    title: "Modern JavaScript - Traversy Media",
    url: "https://www.youtube.com/watch?v=NCwa_xi0Uuc",
    description: "ES6+ features every JavaScript developer should know",
    difficulty: "beginner",
    tags: ["javascript", "es6", "modern-js"]
  },

  // Docker
  {
    category: "documentation",
    topic: "Docker",
    subtopic: "Getting Started",
    title: "Docker Official Documentation",
    url: "https://docs.docker.com/get-started/",
    description: "Get started with Docker - official guide",
    difficulty: "beginner",
    tags: ["docker", "containers", "devops"]
  },
  {
    category: "video",
    topic: "Docker",
    subtopic: "Best Practices",
    title: "Docker Best Practices - TechWorld with Nana",
    url: "https://www.youtube.com/watch?v=8vXoMqWgbQQ",
    description: "Docker best practices for production",
    difficulty: "intermediate",
    tags: ["docker", "devops", "best-practices"]
  },

  // MongoDB
  {
    category: "documentation",
    topic: "MongoDB",
    subtopic: "Aggregation",
    title: "MongoDB Aggregation Pipeline",
    url: "https://www.mongodb.com/docs/manual/aggregation/",
    description: "Complete guide to MongoDB aggregation framework",
    difficulty: "intermediate",
    tags: ["mongodb", "aggregation", "database"]
  },

  // Git
  {
    category: "article",
    topic: "Git",
    subtopic: "Workflow",
    title: "Git Branching Strategy",
    url: "https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow",
    description: "Gitflow workflow guide",
    difficulty: "intermediate",
    tags: ["git", "workflow", "version-control"]
  }
];

async function seedResources() {
  try {
    console.log("🌱 Seeding resources...");

    const result = await prisma.resource.createMany({
      data: sampleResources,
      skipDuplicates: true
    });

    console.log(`✅ Successfully seeded ${result.count} resources`);
  } catch (error) {
    console.error("❌ Error seeding resources:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedResources();
