import prisma from "../db/config.js";

let T = 300; // Hardcoded global token value for testing
const TOKEN_COST = 10;

export const Token = async (req, res, next) => {
  try {
    const email = req.user?.email || req.user?.id; // Try email or id depending on jwt payload
    if (!email) {
      return res
        .status(401)
        .json({ success: false, error: "User identity not found in request" });
    }

    // We verify the user exists
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: typeof email === "string" ? email : undefined },
          { id: typeof email === "string" ? email : undefined },
        ],
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    console.log("Current tokens (T):", T);

    if (T < TOKEN_COST) {
      console.log("Token expired");
      return res.status(400).json({
        success: false,
        error: "Token expired. Please purchase more tokens.",
      });
    }

    // Deduct tokens before proceeding
    T = T - TOKEN_COST;
    // console.log("Tokens after deduction:", T);

    // Attach to request if downstream controllers need it
    req.tokensRemaining = T;

    // Tokens are valid, proceed to the requested route
    next();
  } catch (error) {
    console.error("Token middleware error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error during token check",
    });
  }
};

// New endpoint for frontend to fetch the current token balance
export const getTokenBalance = async (req, res) => {
  return res.status(200).json({
    success: true,
    tokensRemaining: T,
  });
};
