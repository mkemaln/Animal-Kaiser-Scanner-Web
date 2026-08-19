const http = require('http');

const PORT = 9876;

const server = http.createServer((req, res) => {
  let body = [];

  req.on('data', chunk => {
    body.push(chunk);
  });

  req.on('end', () => {
    const rawBody = Buffer.concat(body).toString();
    console.log('--- INCOMING REQUEST ---');
    console.log(`Timestamp : ${new Date().toISOString()}`);
    console.log(`Method    : ${req.method}`);
    console.log(`URL Path  : ${req.url}`);
    console.log('Headers   :', JSON.stringify(req.headers, null, 2));
    console.log(`Body      : "${rawBody}"`);
    console.log('Hex Body  :', Buffer.concat(body).toString('hex'));
    console.log('------------------------\n');

    // Return 200 OK so the scanner thinks Play! received it
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[*] Mock Play! listening on port ${PORT}...`);
  console.log('[*] Open AK-Card-Scanner and scan/send a card to see the raw request.\n');
});