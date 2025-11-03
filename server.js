import dotenv from "dotenv";
import app from "./app.js";
import config from "./config/config.js";


dotenv.config();

const port = config.port;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  process.exit(0);
});

