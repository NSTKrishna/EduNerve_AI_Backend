export const validateInterviewRequest = (req, res, next) => {
  const { role, interviewType, technologies } = req.body;

  if (!role || typeof role !== "string" || role.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "Role is required and must be a non-empty string",
    });
  }

  if (!interviewType || !["technical", "behavioral", "mixed"].includes(interviewType)) {
    return res.status(400).json({
      success: false,
      error: "Interview type must be 'technical', 'behavioral', or 'mixed'",
    });
  }

  if (!technologies || !Array.isArray(technologies) || technologies.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Technologies must be a non-empty array",
    });
  }

  next();
};

export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
  });
};
