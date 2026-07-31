import dotenv from 'dotenv';
import path from 'path';

// Configure environment loading from root env or local env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[Server] BrowserEye backend running on http://localhost:${PORT}`);
});
