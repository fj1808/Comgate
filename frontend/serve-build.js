const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

const buildPath = path.join(__dirname, 'build');

// Serve static files from the build directory
app.use(express.static(buildPath));

// Handle React Router - send all non-API requests to index.html
app.use((req, res, next) => {
  // If it's an API request, skip (shouldn't reach here but just in case)
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ComGate frontend serving on port ${PORT}`);
});
