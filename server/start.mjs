import { createServer } from 'node:http';
import { createExtractionHandler } from './extract.mjs';

const extract = createExtractionHandler();
const port = Number(process.env.EXTRACTION_PORT || 8787);
createServer((request, response) => {
  void extract(request, response, () => { response.writeHead(404); response.end(); });
}).listen(port, '127.0.0.1', () => console.log('Extraction endpoint listening on port ' + port));
